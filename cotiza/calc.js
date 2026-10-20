// Cálculos puros: corridas y avance de préstamos.
export const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : 0; };
export const mxn = (n) => "$" + Math.round(n || 0).toLocaleString("es-MX");
export const mxn2 = (n) => "$" + (n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const r2 = (n) => Math.round(n * 100) / 100;

export const GARANTIAS = { auto: "Auto", reloj: "Reloj", oro: "Oro", monedas: "Monedas", otro: "Otra prenda" };
export const GN = { auto: "tu auto", reloj: "tu reloj", oro: "tu oro", monedas: "tus monedas", otro: "tu prenda" };

// Pagos mensuales fijos, interés sobre saldo.
export function corridaMensual(monto, tasaMensualPct, meses) {
  const r = tasaMensualPct / 100;
  let pago = r ? (monto * r) / (1 - Math.pow(1 + r, -meses)) : monto / meses;
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
export function corridaSemanal(monto, semanas, porMil) {
  const pago = r2((monto / 1000) * porMil);
  const total = r2(pago * semanas);
  const filas = [];
  for (let i = 1; i <= semanas; i++) filas.push({ n: i, pago, saldo: r2(total - pago * i) });
  return { pago, filas, intereses: r2(total - monto), total };
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
  const c = p.tipo === "semanal" ? corridaSemanal(p.monto, p.plazo, p.tasa) : corridaMensual(p.monto, p.tasa, p.plazo);
  const pagado = (p.pagos || []).reduce((s, x) => s + (x.monto || 0), 0);
  let cubiertos = 0, acum = 0;
  for (const f of c.filas) { if (acum + f.pago <= pagado + 0.5) { acum += f.pago; cubiertos++; } else break; }
  const restante = Math.max(0, r2(c.total - pagado));
  const sig = cubiertos < c.filas.length ? c.filas[cubiertos] : null;
  return {
    corrida: c, pagado: r2(pagado), restante, cubiertos, total: c.filas.length,
    siguiente: sig ? { n: sig.n, monto: r2(acum + sig.pago - pagado), fecha: fechaPago(p.inicio, sig.n, p.tipo) } : null,
    liquidado: restante <= 0.5,
  };
}
