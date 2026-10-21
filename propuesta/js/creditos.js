import { autos, mxn, esc, wa, BASE, WA_ICON } from "./comun.js?v=p1";

const $ = (id) => document.getElementById(id);
$("fixwa") && ($("fixwa").innerHTML = WA_ICON);
$("r-wa").insertAdjacentHTML("afterbegin", WA_ICON);
const num = (v) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const fmt = (n) => (n ? Math.round(n).toLocaleString("es-MX") : "");
const mxn2 = (n) => "$" + (n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let CFG = { tasaAnual: null, ivaSobreIntereses: true, engancheMin: 20, engancheSugerido: 35, plazos: [12, 24, 36, 48, 60], plazoInicial: 48, precioMin: 50000, precioMax: 5000000 };
let LIST = [], PLAZO = 48, ENGP = 35;

// Mensualidad con interés sobre saldo (sistema francés). La tasa mensual incluye IVA si así se configura.
function mensualidad(monto, tasaAnual, meses) {
  const r = (tasaAnual / 100 / 12) * (CFG.ivaSobreIntereses ? 1.16 : 1);
  if (!monto || !meses) return 0;
  return r ? (monto * r) / (1 - Math.pow(1 + r, -meses)) : monto / meses;
}

function precio() { return num($("c-precio").value); }
function setPrecio(p, from) {
  p = Math.max(0, Math.round(p));
  if (from !== "txt") $("c-precio").value = fmt(p);
  if (from !== "range") $("c-precio-r").value = Math.min(CFG.precioMax, Math.max(CFG.precioMin, p));
  setEngP(ENGP, "precio");
}
function setEngP(pct, from) {
  ENGP = Math.min(90, Math.max(0, pct));
  const e = (precio() * ENGP) / 100;
  if (from !== "txt$") $("c-eng").value = fmt(e);
  if (from !== "txt%") $("c-engp").value = (Math.round(ENGP * 10) / 10) + "%";
  if (from !== "range") $("c-eng-r").value = Math.round(ENGP);
  calc();
}
function calc() {
  const p = precio(), e = Math.min(num($("c-eng").value), p), f = Math.max(0, p - e), t = num($("c-tasa").value);
  const m = mensualidad(f, t, PLAZO);
  $("c-precio-t").textContent = p ? mxn(p) : "";
  $("c-eng-t").textContent = p ? `${mxn(e)} (${Math.round(ENGP)}%)` : "";
  $("c-plazo-t").textContent = PLAZO + " meses";
  $("c-eng-n").textContent = ENGP < CFG.engancheSugerido ? `Sugerimos desde ${CFG.engancheSugerido}%. Con buen historial crediticio puede aceptarse un enganche menor; lo decide la financiera.` : `Enganche sugerido: desde ${CFG.engancheSugerido}%.`;
  $("r-men").textContent = f && t ? mxn2(m) : f ? (CFG.tasaAnual ? "Escribe la tasa" : "Te la cotizamos") : "$0";
  $("r-precio").textContent = mxn(p); $("r-eng").textContent = mxn(e); $("r-fin").textContent = mxn(f);
  $("r-plazo").textContent = PLAZO + " meses"; $("r-total").textContent = f && t ? mxn(Math.round(e + m * PLAZO)) : "Pendiente";
  $("mb-men").textContent = $("r-men").textContent; $("mb-wa").href = $("r-wa").href;
  const a = LIST.find((x) => x.slug === $("c-auto").value);
  const nom = $("c-nom").value.trim();
  const L = [`Hola${nom ? ", soy " + nom : ""}. Quiero cotizar un crédito${a ? " para el " + a.title : ""}.`, "", "Precio: " + mxn(p), `Enganche: ${mxn(e)} (${Math.round(ENGP)}%)`, "Monto a financiar: " + mxn(f), "Plazo: " + PLAZO + " meses"];
  if (f && t) L.push("Mensualidad estimada: " + mxn2(m) + " (tasa de referencia " + t + "% anual)");
  L.push("", "¿Me ayudan con una cotización formal?");
  $("r-wa").href = wa(L.join("\n"));
  const u = new URL(location); a ? u.searchParams.set("a", a.slug) : u.searchParams.delete("a"); history.replaceState(null, "", u);
}
function plazos() {
  $("c-plazos").innerHTML = CFG.plazos.map((n) => `<button type="button" data-n="${n}" aria-pressed="${n === PLAZO}">${n}</button>`).join("");
  $("c-plazos").querySelectorAll("button").forEach((b) => (b.onclick = () => { PLAZO = Number(b.dataset.n); plazos(); calc(); }));
}

$("c-precio").addEventListener("input", (e) => { const v = num(e.target.value); e.target.value = fmt(v); const a = LIST.find((x) => x.slug === $("c-auto").value); if (a && a.precio !== v) $("c-auto").value = "otro"; setPrecio(v, "txt"); });
$("c-precio-r").addEventListener("input", (e) => { if ($("c-auto").value && $("c-auto").value !== "otro") $("c-auto").value = "otro"; setPrecio(Number(e.target.value), "range"); });
$("c-eng").addEventListener("input", (e) => { const v = num(e.target.value); e.target.value = fmt(v); const p = precio(); setEngP(p ? (v / p) * 100 : 0, "txt$"); });
$("c-engp").addEventListener("change", (e) => setEngP(num(e.target.value), "txt%"));
$("c-eng-r").addEventListener("input", (e) => setEngP(Number(e.target.value), "range"));
$("c-tasa").addEventListener("input", calc);
$("c-nom").addEventListener("input", calc);
$("c-auto").addEventListener("change", () => { const a = LIST.find((x) => x.slug === $("c-auto").value); if (a) setPrecio(a.precio); else calc(); });

Promise.all([
  fetch(BASE + "data/credito.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => ({})),
  autos().catch(() => []),
]).then(([cfg, list]) => {
  CFG = { ...CFG, ...cfg }; LIST = list;
  PLAZO = CFG.plazos.includes(CFG.plazoInicial) ? CFG.plazoInicial : CFG.plazos.at(-1); ENGP = CFG.engancheSugerido;
  $("c-demo").hidden = !CFG.tasaEsEjemplo;
  $("c-precio-r").min = CFG.precioMin; $("c-precio-r").max = CFG.precioMax;
  $("c-eng-r").min = 0; $("c-eng-r").max = 90;
  if (CFG.tasaAnual) $("c-tasa").value = CFG.tasaAnual;
  else { $("c-tasa").closest(".field").hidden = true; $("r-men").classList.add("sm"); $("c-sin").hidden = false; }
  $("c-auto").innerHTML = `<option value="otro">Otro auto (escribe el precio)</option>` + list.filter((a) => !a.apartado).map((a) => `<option value="${esc(a.slug)}">${esc(a.title)} · ${mxn(a.precio)}</option>`).join("");
  const want = new URLSearchParams(location.search).get("a"), a = list.find((x) => x.slug === want);
  if (a) { $("c-auto").value = a.slug; setPrecio(a.precio); } else { $("c-auto").value = "otro"; setPrecio(400000); }
  plazos();
});
