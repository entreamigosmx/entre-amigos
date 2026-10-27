// Cálculos puros: corridas y avance de préstamos.
const hoyLocal = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
export const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };
export const mxn = (n) => "$" + Math.round(n || 0).toLocaleString("es-MX");
export const mxn2 = (n) => "$" + (n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (n) => Math.round(n * 100) / 100;

export const GARANTIAS = { auto: "Auto", reloj: "Reloj", oro: "Oro", monedas: "Monedas", otro: "Otra prenda", ff: "Friends & family", sin: "Sin garantía" };
export const GN = { auto: "tu auto", reloj: "tu reloj", oro: "tu oro", monedas: "tus monedas", otro: "tu prenda", ff: "lo acordado", sin: "sin garantía" };

// Pagos mensuales fijos, interés sobre saldo.
export function corridaMensual(monto, tasaMensualPct, meses, pagoFijo) {
  const r = tasaMensualPct / 100;
  let pago = pagoFijo || (r ? (monto * r) / (1 - Math.pow(1 + r, -meses)) : monto / meses);
  pago = Math.ceil(pago * 100) / 100;
  let saldo = monto, intereses = 0;
  const filas = [];
  for (let i = 1; i <= meses; i++) {
    const int = r2(saldo * r);
    // Nunca se cobra más de lo que se debe (si el pago acordado salda antes, las cuotas siguientes quedan en 0).
    const p = i === meses ? r2(saldo + int) : Math.min(pago, r2(saldo + int));
    const cap = r2(p - int);
    saldo = Math.max(0, r2(saldo - cap));
    intereses += int;
    filas.push({ n: i, pago: p, interes: int, capital: cap, saldo });
  }
  return { pago, filas, intereses: r2(intereses), total: r2(monto + intereses) };
}

// Pagos semanales fijos: pago por cada $1,000.
export function corridaSemanal(monto, semanas, porMil, pagoFijo) {
  const pago = r2(pagoFijo || (monto / 1000) * porMil);
  const total = r2(pago * semanas);
  const filas = [];
  for (let i = 1; i <= semanas; i++) filas.push({ n: i, pago, saldo: r2(total - pago * i) });
  return { pago, filas, intereses: r2(total - monto), total };
}

// Interés mensual sobre saldo + abono fijo a capital cada mes (el pago baja cada mes).
export function corridaCapFijo(monto, tasaMensualPct, abono) {
  const r = tasaMensualPct / 100, filas = [];
  let saldo = monto, intereses = 0;
  for (let n = 1; saldo > 0.5 && n <= 600 && abono > 0; n++) {
    const int = r2(saldo * r), cap = r2(Math.min(abono, saldo));
    saldo = r2(saldo - cap); intereses += int;
    filas.push({ n, pago: r2(int + cap), interes: int, capital: cap, saldo });
  }
  return { pago: filas[0]?.pago || 0, filas, intereses: r2(intereses), total: r2(monto + intereses) };
}

export function factorGarantia(meses) { return meses > 12 ? 3 : 2; }

// Fecha del pago n (1-based) a partir de la fecha del primer pago.
export function fechaPago(inicioISO, n, tipo) {
  if (!inicioISO) return null;
  const d = new Date(inicioISO + "T12:00:00");
  if (tipo === "semanal") { d.setDate(d.getDate() + (n - 1) * 7); return d; }
  // Mismo día cada mes; si el mes es más corto (p. ej. día 31 en febrero), el último día de ese mes.
  const dia = d.getDate(), m = d.getMonth() + (n - 1), y = d.getFullYear() + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
  const ult = new Date(y, mm + 1, 0).getDate();
  return new Date(y, mm, Math.min(dia, ult), 12);
}
// Con "último mes pagado" (corte), los pagos con fecha hasta el corte ya están dentro de lo saldado: no se vuelven a contar.
// Préstamo pausado con interés congelado: para cobrar, el tiempo se detiene en la fecha de la pausa.
export const hoyDe = (p, hoyISO) => { const h = hoyISO || hoyLocal(); return p && p.pausa && p.pausa.congelar && p.pausa.desde && p.pausa.desde < h ? p.pausa.desde : h; };
export const cuentaPago = (p, x) => !p.corte || (x.fecha || "") > p.corte;
const isoD = (d) => (d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") : "");
export const fcorta = (d) => (d ? d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "");

// Avance de un préstamo según los pagos registrados.
export function avance(p) {
  if (p.tipo === "interes") return avanceInteres(p);
  const c = p.tipo === "semanal" ? corridaSemanal(p.monto, p.plazo, p.tasa, p.pagoFijo) : p.tipo === "capfijo" ? corridaCapFijo(p.monto, p.tasa, p.abono) : corridaMensual(p.monto, p.tasa, p.plazo, p.pagoFijo);
  const pagado = (p.pagos || []).filter((x) => cuentaPago(p, x)).reduce((s, x) => s + (x.monto || 0), 0);
  // "Último mes pagado completo": las cuotas hasta esa fecha cuentan como pagadas sin capturar pagos viejos.
  const credito = p.corte ? r2(c.filas.filter((f) => isoD(fechaPago(p.inicio, f.n, p.tipo)) <= p.corte).reduce((s, f) => s + f.pago, 0)) : 0;
  const ef = pagado + credito;
  let cubiertos = 0, acum = 0;
  for (const f of c.filas) { if (acum + f.pago <= ef + 0.5) { acum += f.pago; cubiertos++; } else break; }
  // Un pago marcado como liquidación cierra el préstamo aunque no se hayan cobrado los intereses futuros.
  const liq = (p.pagos || []).some((x) => x.liq);
  const restante = liq ? 0 : Math.max(0, r2(c.total - ef));
  const sig = !liq && cubiertos < c.filas.length ? c.filas[cubiertos] : null;
  return {
    corrida: c, pagado: r2(pagado), credito, restante, cubiertos, total: c.filas.length,
    siguiente: sig ? { n: sig.n, monto: r2(acum + sig.pago - ef), fecha: fechaPago(p.inicio, sig.n, p.tipo) } : null,
    liquidado: restante <= 0.5,
    capital: cubiertos ? c.filas[cubiertos - 1].saldo : p.monto,
  };
}

// Préstamo de solo interés: cada mes se paga el interés sobre el capital que se debe;
// el capital se abona cuando el cliente quiera. Sin fecha fija de liquidación.
export function avanceInteres(p, hoyISO) {
  hoyISO = hoyDe(p, hoyISO);
  const r = (p.tasa || 0) / 100;
  const pagos = p.pagos || [];
  const caps = pagos.filter((x) => x.tipo === "capital").sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const intPagado = r2(pagos.filter((x) => x.tipo !== "capital" && cuentaPago(p, x)).reduce((s, x) => s + (x.monto || 0), 0));
  const capPagado = r2(caps.reduce((s, x) => s + (x.monto || 0), 0));
  const capital = Math.max(0, r2(p.monto - capPagado));
  const hoy = hoyISO || hoyLocal();
  const lim = new Date(hoy + "T12:00:00"); lim.setDate(lim.getDate() + 35);
  // Reglas del dueño:
  // - Un abono a capital a mitad de mes NO baja el interés del siguiente vencimiento: cuenta a partir del vencimiento
  //   que sigue al primer día de pago en o después del abono. Si se abona justo el día de pago, baja el siguiente mes.
  // - Si se paga TODO el capital (liquidación), el interés del periodo en curso se cobra solo por los días reales
  //   transcurridos desde el último vencimiento hasta el día en que pagó.
  const tasaMes = (base) => (p.pagoFijo ? (p.pagoFijo * base) / p.monto : base * r);
  let acumCap = 0, fLiq = null;
  for (const x of caps) { acumCap += x.monto || 0; if (acumCap >= p.monto - 0.5) { fLiq = x.fecha; break; } }
  const filas = [];
  for (let n = 1; n <= 600 && p.inicio; n++) {
    const f = fechaPago(p.inicio, n, "mensual"), fi = isoD(f), ant = isoD(fechaPago(p.inicio, n - 1, "mensual"));
    const capN = n === 1 ? p.monto : Math.max(0, r2(p.monto - caps.filter((x) => x.fecha <= ant).reduce((s, x) => s + x.monto, 0)));
    if (capN <= 0.5) break;
    if (f > lim && filas.length && !(fLiq && fLiq > ant)) break;
    if (fLiq && fLiq > ant && fLiq < fi) {
      // Liquidó a mitad del periodo: interés por días reales hasta el día que pagó.
      const dias = Math.round((new Date(fLiq + "T12:00:00") - new Date(ant + "T12:00:00")) / 864e5), diasMes = Math.round((f - new Date(ant + "T12:00:00")) / 864e5);
      filas.push({ n, pago: r2((tasaMes(capN) * dias) / diasMes), capital: capN, fecha: new Date(fLiq + "T12:00:00"), dias, diasMes, prorrateo: true });
      break;
    }
    filas.push({ n, pago: r2(tasaMes(capN)), capital: capN, fecha: f });
  }
  const credito = p.corte ? r2(filas.filter((f) => isoD(f.fecha) <= p.corte).reduce((s, f) => s + f.pago, 0)) : 0;
  const ef = intPagado + credito;
  let cubiertos = 0, acum = 0;
  for (const f of filas) { if (acum + f.pago <= ef + 0.5) { acum += f.pago; cubiertos++; } else break; }
  const vencido = filas.filter((f) => isoD(f.fecha) <= hoy).reduce((s, f) => s + f.pago, 0);
  const sig = cubiertos < filas.length ? filas[cubiertos] : null;
  return {
    tipo: "interes", corrida: { pago: (filas.find((f) => isoD(f.fecha) > hoy) || {}).pago ?? r2(tasaMes(capital)), filas, total: null }, pagado: intPagado, credito, capPagado, capital,
    interesAdeudado: Math.max(0, r2(vencido - ef)), restante: capital, cubiertos, total: null,
    siguiente: capital > 0.5 && sig ? { n: sig.n, monto: r2(acum + sig.pago - ef), fecha: sig.fecha } : null,
    liquidado: capital <= 0.5 && vencido - ef <= 0.5,
  };
}

// Lo que el cliente tiene vencido hoy (pagos con fecha pasada que no ha cubierto).
export function vencido(p, a, hoyISO) {
  const hoy = hoyDe(p, hoyISO);
  if (a.liquidado || !p.inicio) return 0;
  if (p.tipo === "interes") return a.interesAdeudado || 0;
  const debido = a.corrida.filas.filter((f) => isoD(fechaPago(p.inicio, f.n, p.tipo)) <= hoy).reduce((s, f) => s + f.pago, 0);
  return Math.max(0, r2(debido - a.pagado - (a.credito || 0)));
}

// Desglose de cada pago registrado: qué cuota cubrió (fecha en que debía pagarse),
// cuánto fue capital y cuánto interés. Sirve para el historial y el reparto.
export function desglosePagos(p) {
  const pagos = (p.pagos || []).map((x, i) => ({ ...x, i })).sort((a, b) => (a.fecha === b.fecha ? ((a.reg || "") < (b.reg || "") ? -1 : 1) : a.fecha < b.fecha ? -1 : 1));
  const iso = (d) => (d ? isoD(d) : null);
  let filas;
  if (p.tipo === "interes") {
    const a = avanceInteres(p);
    filas = a.corrida.filas.map((f) => ({ n: f.n, pago: f.pago, interes: f.pago, fecha: iso(f.fecha) }));
  } else {
    const c = p.tipo === "semanal" ? corridaSemanal(p.monto, p.plazo, p.tasa, p.pagoFijo) : p.tipo === "capfijo" ? corridaCapFijo(p.monto, p.tasa, p.abono) : corridaMensual(p.monto, p.tasa, p.plazo, p.pagoFijo);
    const fr = c.total ? c.intereses / c.total : 0;
    filas = c.filas.map((f) => ({ n: f.n, pago: f.pago, interes: f.interes ?? r2(f.pago * fr), fecha: iso(fechaPago(p.inicio, f.n, p.tipo)) }));
  }
  const rest = filas.map((f) => (p.corte && f.fecha && f.fecha <= p.corte ? 0 : f.pago));
  // Si se liquidó, ninguna cuota posterior a la liquidación se cobró: lo pagado de más antes de esa fecha es capital.
  const liqF = (p.pagos || []).filter((x) => x.liq).map((x) => x.fecha).sort().at(-1) || "";
  return pagos.map((x) => {
    const out = { ...x, capital: 0, interes: 0, debia: null, n: null };
    if (p.tipo === "interes" && x.tipo === "capital") { out.capital = x.monto; return out; }
    if (!cuentaPago(p, x)) { out.antes = true; return out; }
    let m = x.monto || 0;
    for (let k = 0; k < filas.length && m > 0.005; k++) {
      if (liqF && filas[k].fecha > liqF) break; // al liquidar, lo que sobra de las cuotas vencidas es capital
      if (rest[k] <= 0.005) continue;
      if (out.n === null) { out.n = filas[k].n; out.debia = filas[k].fecha; }
      const take = Math.min(m, rest[k]);
      const int = filas[k].pago ? take * (filas[k].interes / filas[k].pago) : 0;
      out.interes += int; out.capital += take - int; rest[k] -= take; m -= take;
    }
    if (m > 0.005 && x.liq && x.intLiq) { const il = Math.min(m, x.intLiq); out.interes += il; m -= il; } // interés por días al liquidar
    if (m > 0.005) { if (p.tipo === "interes") out.interes += m; else out.capital += m; }
    out.capital = r2(out.capital); out.interes = r2(out.interes);
    return out;
  });
}

// Estado de cuenta por mes (o semana): cuánto debía, cuánto abonó y cuánto falta de cada cuota,
// y a qué cuotas se aplicó cada pago. Los pagos se aplican a la cuota más antigua pendiente.
export function estadoCuenta(p, hoyISO) {
  const hoy = hoyDe(p, hoyISO);
  let filas;
  if (p.tipo === "interes") filas = avanceInteres(p, hoy).corrida.filas.map((f) => ({ n: f.n, pago: f.pago, fecha: isoD(f.fecha) }));
  else {
    const c = p.tipo === "semanal" ? corridaSemanal(p.monto, p.plazo, p.tasa, p.pagoFijo) : p.tipo === "capfijo" ? corridaCapFijo(p.monto, p.tasa, p.abono) : corridaMensual(p.monto, p.tasa, p.plazo, p.pagoFijo);
    filas = c.filas.map((f) => ({ n: f.n, pago: f.pago, fecha: isoD(fechaPago(p.inicio, f.n, p.tipo)) }));
  }
  const meses = filas.map((f) => ({ ...f, corte: !!(p.corte && f.fecha <= p.corte), abono: 0 }));
  const liqF = (p.pagos || []).filter((x) => x.liq).map((x) => x.fecha).sort().at(-1) || "";
  const pagos = (p.pagos || []).map((x, i) => ({ ...x, i })).sort((a, b) => (a.fecha === b.fecha ? ((a.reg || "") < (b.reg || "") ? -1 : 1) : a.fecha < b.fecha ? -1 : 1));
  const out = pagos.map((x) => {
    const r = { ...x, aplica: [] };
    if (p.tipo === "interes" && x.tipo === "capital") return r;
    if (!cuentaPago(p, x)) { r.antes = true; return r; }
    let m = x.monto || 0;
    for (const f of meses) {
      if (m <= 0.005) break;
      if (liqF && f.fecha > liqF) break;
      if (f.corte) continue;
      const falta = r2(f.pago - f.abono); if (falta <= 0.005) continue;
      const t = Math.min(m, falta); f.abono = r2(f.abono + t); m -= t; r.aplica.push(f.n);
    }
    if (m > 0.005) r.sobra = r2(m);
    return r;
  });
  const cong = p.pausa && p.pausa.congelar && p.pausa.desde ? p.pausa.desde : "";
  meses.forEach((f) => {
    if (liqF && f.fecha > liqF && f.abono < 0.005) { f.falta = 0; f.estado = "liq"; return; }
    if (cong && f.fecha > cong && f.abono < 0.005) { f.falta = 0; f.estado = "congelado"; return; } // interés congelado por la pausa
    f.falta = f.corte ? 0 : Math.max(0, r2(f.pago - f.abono));
    f.estado = f.corte ? "corte" : f.falta <= 0.005 ? "pagado" : f.fecha <= hoy ? (f.abono > 0 ? "parcial" : "vencido") : f.abono > 0 ? "parcial" : "proximo";
  });
  // Se muestran las cuotas desde el corte hasta la siguiente que vence (más las ya pagadas por adelantado).
  const vis = meses.filter((f) => !f.corte && f.estado !== "liq" && f.estado !== "congelado");
  const idxNext = vis.findIndex((f) => f.fecha > hoy);
  const hasta = idxNext < 0 ? vis.length : Math.max(idxNext + 1, vis.filter((f) => f.abono > 0).length);
  const ultCorte = meses.filter((f) => f.corte).at(-1) || null;
  const pagadoHasta = [...meses].reverse().find((f, k, arr) => (f.corte || f.estado === "pagado") && meses.slice(0, meses.indexOf(f) + 1).every((g) => g.corte || g.estado === "pagado")) || null;
  return { meses: vis.slice(0, hasta), todos: meses, pagos: out.reverse(), ultCorte, pagadoHasta, debeHoy: r2(vis.filter((f) => f.fecha <= hoy).reduce((s, f) => s + f.falta, 0)) };
}

// Cuánto se necesita para liquidar hoy: lo vencido sin pagar (con su interés) + el capital que aún no vence.
// No incluye intereses de cuotas futuras. En semanal se cobra lo que resta (pago fijo acordado).
export function liquidacion(p, hoyISO) {
  const hoy = hoyISO || hoyLocal(), a = avance(p);
  if (a.liquidado) return { total: 0, capital: 0, interes: 0 };
  if (p.tipo === "interes") {
    // Se simula el pago de todo el capital hoy: el interés incluye lo vencido + los días reales del periodo en curso.
    const q = { ...p, pagos: [...(p.pagos || []), { fecha: hoy, monto: a.capital, tipo: "capital" }] };
    const b = avanceInteres(q, hoy), int = Math.max(0, b.interesAdeudado || 0);
    const ult = b.corrida.filas.at(-1);
    return { total: r2(a.capital + int), capital: a.capital, interes: r2(int), dias: ult && ult.prorrateo ? ult.dias : 0, diasMes: ult && ult.prorrateo ? ult.diasMes : 0 };
  }
  if (p.tipo === "semanal") return { total: a.restante, capital: a.restante, interes: 0, semanal: true };
  const c = a.corrida, ef = a.pagado + (a.credito || 0), r = (p.tasa || 0) / 100;
  const due = c.filas.filter((f) => isoD(fechaPago(p.inicio, f.n, p.tipo)) <= hoy);
  const sumDue = due.reduce((s, f) => s + f.pago, 0);
  const saldo = due.length ? due.at(-1).saldo : p.monto;
  const pendDue = Math.max(0, sumDue - ef), adelanto = Math.max(0, ef - sumDue);
  // De lo vencido sin pagar, la parte de interés es la de las cuotas más recientes (los pagos cubren primero las antiguas).
  let porCubrir = pendDue, intPend = 0;
  for (let k = due.length - 1; k >= 0 && porCubrir > 0.005; k--) { const t = Math.min(porCubrir, due[k].pago); intPend += t * ((due[k].interes || 0) / due[k].pago); porCubrir -= t; }
  const capital = Math.max(0, r2(saldo - adelanto));
  // Interés por días reales desde el último vencimiento hasta hoy, sobre el capital que debe.
  let dias = 0, diasMes = 0, intDias = 0;
  if (due.length < c.filas.length && capital > 0.5) {
    const ant = fechaPago(p.inicio, due.length, p.tipo), sig = fechaPago(p.inicio, due.length + 1, p.tipo), h = new Date(hoy + "T12:00:00");
    dias = Math.max(0, Math.round((h - ant) / 864e5)); diasMes = Math.round((sig - ant) / 864e5);
    intDias = r2((capital * r * dias) / diasMes);
  }
  const interes = r2(intPend + intDias);
  return { total: r2(capital + pendDue + intDias), capital: r2(capital + pendDue - intPend), interes, intDias, dias, diasMes };
}

// Inversión de un inversionista (contrato): te prestó `monto` el día `fecha` a `tasa`% mensual.
// Se le paga cada mes el mismo día, empezando el mes siguiente, mientras tengas su dinero (haya o no cliente).
// Si le regresas capital, ese mes se le paga el interés de lo regresado solo por los días que lo tuviste (días reales);
// desde ahí el interés baja en proporción. Si le regresas todo, el último interés se le paga el día que le regresas.
export function pagosInversion(inv, retiros, hastaISO) {
  const r = (inv.tasa || 0) / 100, out = [], R = (retiros || []).filter((x) => x.monto > 0).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  if (!inv.fecha || !inv.monto || !r) return out;
  const t = (s) => new Date(s + "T12:00:00");
  for (let k = 1; k <= 600; k++) {
    const s = isoD(fechaPago(inv.fecha, k, "mensual")), e = isoD(fechaPago(inv.fecha, k + 1, "mensual"));
    const P = r2(inv.monto - R.filter((x) => x.fecha <= s).reduce((a, x) => a + x.monto, 0));
    if (P <= 0.5) break;
    const D = Math.round((t(e) - t(s)) / 864e5), dentro = R.filter((x) => x.fecha > s && x.fecha <= e);
    const base = P - dentro.reduce((a, x) => a + (x.monto * Math.round((t(e) - t(x.fecha)) / 864e5)) / D, 0);
    const fin = r2(P - dentro.reduce((a, x) => a + x.monto, 0)) <= 0.5;
    const fecha = fin ? dentro.at(-1).fecha : e;
    if (hastaISO && fecha > hastaISO) break;
    out.push({ n: k, fecha, monto: r2(base * r), capital: P, parcial: dentro.length > 0, final: fin });
    if (fin) break;
  }
  return out;
}
