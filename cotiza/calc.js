// Cálculos puros: corridas y avance de préstamos.
const hoyLocal = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
export const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };
export const mxn = (n) => "$" + Math.round(n || 0).toLocaleString("es-MX");
export const mxn2 = (n) => "$" + (n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (n) => Math.round(n * 100) / 100;

export const GARANTIAS = { auto: "Auto", reloj: "Reloj", oro: "Oro", monedas: "Monedas", otro: "Otra prenda", ff: "Friends & family" };
export const GN = { auto: "tu auto", reloj: "tu reloj", oro: "tu oro", monedas: "tus monedas", otro: "tu prenda", ff: "lo acordado" };

// Pagos mensuales fijos, interés sobre saldo.
export function corridaMensual(monto, tasaMensualPct, meses, pagoFijo) {
  const r = tasaMensualPct / 100;
  let pago = pagoFijo || (r ? (monto * r) / (1 - Math.pow(1 + r, -meses)) : monto / meses);
  pago = Math.ceil(pago * 100) / 100;
  let saldo = monto, intereses = 0;
  const filas = [];
  for (let i = 1; i <= meses; i++) {
    const int = r2(saldo * r);
    const p = i === meses ? r2(saldo + int) : pago;
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
  if (tipo === "semanal") d.setDate(d.getDate() + (n - 1) * 7);
  else d.setMonth(d.getMonth() + (n - 1));
  return d;
}
export const fcorta = (d) => (d ? d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }) : "");

// Avance de un préstamo según los pagos registrados.
export function avance(p) {
  if (p.tipo === "interes") return avanceInteres(p);
  const c = p.tipo === "semanal" ? corridaSemanal(p.monto, p.plazo, p.tasa, p.pagoFijo) : p.tipo === "capfijo" ? corridaCapFijo(p.monto, p.tasa, p.abono) : corridaMensual(p.monto, p.tasa, p.plazo, p.pagoFijo);
  const pagado = (p.pagos || []).reduce((s, x) => s + (x.monto || 0), 0);
  let cubiertos = 0, acum = 0;
  for (const f of c.filas) { if (acum + f.pago <= pagado + 0.5) { acum += f.pago; cubiertos++; } else break; }
  const restante = Math.max(0, r2(c.total - pagado));
  const sig = cubiertos < c.filas.length ? c.filas[cubiertos] : null;
  return {
    corrida: c, pagado: r2(pagado), restante, cubiertos, total: c.filas.length,
    siguiente: sig ? { n: sig.n, monto: r2(acum + sig.pago - pagado), fecha: fechaPago(p.inicio, sig.n, p.tipo) } : null,
    liquidado: restante <= 0.5,
    capital: cubiertos ? c.filas[cubiertos - 1].saldo : p.monto,
  };
}

// Préstamo de solo interés: cada mes se paga el interés sobre el capital que se debe;
// el capital se abona cuando el cliente quiera. Sin fecha fija de liquidación.
export function avanceInteres(p, hoyISO) {
  const r = (p.tasa || 0) / 100;
  const pagos = p.pagos || [];
  const caps = pagos.filter((x) => x.tipo === "capital").sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const intPagado = r2(pagos.filter((x) => x.tipo !== "capital").reduce((s, x) => s + (x.monto || 0), 0));
  const capPagado = r2(caps.reduce((s, x) => s + (x.monto || 0), 0));
  const capital = Math.max(0, r2(p.monto - capPagado));
  const hoy = hoyISO || hoyLocal();
  const lim = new Date(hoy + "T12:00:00"); lim.setDate(lim.getDate() + 35);
  const filas = [];
  for (let n = 1; n <= 600 && p.inicio; n++) {
    const f = fechaPago(p.inicio, n, "mensual"); const fi = f.toISOString().slice(0, 10);
    const capN = Math.max(0, r2(p.monto - caps.filter((x) => x.fecha < fi).reduce((s, x) => s + x.monto, 0)));
    if (capN <= 0.5) break;
    if (f > lim && filas.length) break;
    filas.push({ n, pago: r2(capN * r), capital: capN, fecha: f });
  }
  let cubiertos = 0, acum = 0;
  for (const f of filas) { if (acum + f.pago <= intPagado + 0.5) { acum += f.pago; cubiertos++; } else break; }
  const vencido = filas.filter((f) => f.fecha.toISOString().slice(0, 10) <= hoy).reduce((s, f) => s + f.pago, 0);
  const sig = cubiertos < filas.length ? filas[cubiertos] : null;
  return {
    tipo: "interes", corrida: { pago: r2(capital * r), filas, total: null }, pagado: intPagado, capPagado, capital,
    interesAdeudado: Math.max(0, r2(vencido - intPagado)), restante: capital, cubiertos, total: null,
    siguiente: capital > 0.5 && sig ? { n: sig.n, monto: r2(acum + sig.pago - intPagado), fecha: sig.fecha } : null,
    liquidado: capital <= 0.5,
  };
}

// Lo que el cliente tiene vencido hoy (pagos con fecha pasada que no ha cubierto).
export function vencido(p, a, hoyISO) {
  const hoy = hoyISO || hoyLocal();
  if (a.liquidado || !p.inicio) return 0;
  if (p.tipo === "interes") return a.interesAdeudado || 0;
  const debido = a.corrida.filas.filter((f) => fechaPago(p.inicio, f.n, p.tipo).toISOString().slice(0, 10) < hoy).reduce((s, f) => s + f.pago, 0);
  return Math.max(0, r2(debido - a.pagado));
}

// Desglose de cada pago registrado: qué cuota cubrió (fecha en que debía pagarse),
// cuánto fue capital y cuánto interés. Sirve para el historial y el reparto.
export function desglosePagos(p) {
  const pagos = (p.pagos || []).map((x, i) => ({ ...x, i })).sort((a, b) => (a.fecha === b.fecha ? ((a.reg || "") < (b.reg || "") ? -1 : 1) : a.fecha < b.fecha ? -1 : 1));
  const iso = (d) => (d ? d.toISOString().slice(0, 10) : null);
  let filas;
  if (p.tipo === "interes") {
    const a = avanceInteres(p);
    filas = a.corrida.filas.map((f) => ({ n: f.n, pago: f.pago, interes: f.pago, fecha: iso(f.fecha) }));
  } else {
    const c = p.tipo === "semanal" ? corridaSemanal(p.monto, p.plazo, p.tasa, p.pagoFijo) : p.tipo === "capfijo" ? corridaCapFijo(p.monto, p.tasa, p.abono) : corridaMensual(p.monto, p.tasa, p.plazo, p.pagoFijo);
    const fr = c.total ? c.intereses / c.total : 0;
    filas = c.filas.map((f) => ({ n: f.n, pago: f.pago, interes: f.interes ?? r2(f.pago * fr), fecha: iso(fechaPago(p.inicio, f.n, p.tipo)) }));
  }
  const rest = filas.map((f) => f.pago);
  return pagos.map((x) => {
    const out = { ...x, capital: 0, interes: 0, debia: null, n: null };
    if (p.tipo === "interes" && x.tipo === "capital") { out.capital = x.monto; return out; }
    let m = x.monto || 0;
    for (let k = 0; k < filas.length && m > 0.005; k++) {
      if (rest[k] <= 0.005) continue;
      if (out.n === null) { out.n = filas[k].n; out.debia = filas[k].fecha; }
      const take = Math.min(m, rest[k]);
      const int = filas[k].pago ? take * (filas[k].interes / filas[k].pago) : 0;
      out.interes += int; out.capital += take - int; rest[k] -= take; m -= take;
    }
    if (m > 0.005) { if (p.tipo === "interes") out.interes += m; else out.capital += m; }
    out.capital = r2(out.capital); out.interes = r2(out.interes);
    return out;
  });
}
