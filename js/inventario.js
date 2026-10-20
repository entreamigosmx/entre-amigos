import { autos, card, esc, WA_ICON } from "./comun.js?v=1";

document.getElementById("fixwa").innerHTML = WA_ICON;
const $ = (id) => document.getElementById(id);
const ORDEN = ["SUVs", "Familiares", "Pickups", "Trabajo", "Todo terreno", "Sedanes", "Lujo", "Eléctricos", "Motos"];
const LBL = { Motos: "Motocicletas y trimotos" };
const cats = (a) => (a.categorias && a.categorias.length ? a.categorias : [a.categoria].filter(Boolean));
let ALL = [], CAT = new URLSearchParams(location.search).get("cat") || "";

function draw() {
  const pre = $("f-pre").value, marca = $("f-marca").value, anio = $("f-anio").value, ord = $("f-ord").value, dis = $("f-dis").value;
  let l = ALL.filter((a) => (!CAT || cats(a).includes(CAT)) && (!marca || a.marca === marca) && (!anio || String(a.anio) === anio) && (!dis || !a.apartado));
  if (pre) { const [lo, hi] = pre.split("-").map(Number); l = l.filter((a) => a.precio >= lo && a.precio <= hi); }
  const by = { pa: (a, b) => a.precio - b.precio, pd: (a, b) => b.precio - a.precio, ad: (a, b) => b.anio - a.anio, km: (a, b) => (a.kilometraje ?? 1e9) - (b.kilometraje ?? 1e9) }[ord];
  if (by) l = l.slice().sort(by);
  $("count").textContent = `${l.length} ${l.length === 1 ? "vehículo" : "vehículos"}`;
  $("cars").innerHTML = l.length ? l.map(card).join("") : `<p class="empty">No hay vehículos con esos filtros. Prueba con otro presupuesto o escríbenos: si no lo tenemos, te lo buscamos.</p>`;
  const u = new URL(location); CAT ? u.searchParams.set("cat", CAT) : u.searchParams.delete("cat"); history.replaceState(null, "", u);
}
function chips() {
  const have = new Set(ALL.flatMap(cats));
  const list = ["", ...ORDEN.filter((c) => have.has(c))];
  $("chips").innerHTML = list.map((c) => `<button class="chip" type="button" data-c="${esc(c)}" aria-pressed="${c === CAT}">${esc(c ? LBL[c] || c : "Todos")}</button>`).join("");
  $("chips").querySelectorAll(".chip").forEach((b) => (b.onclick = () => { CAT = b.dataset.c; chips(); draw(); }));
}
autos().then((l) => {
  ALL = l;
  [...new Set(l.map((a) => a.marca))].sort().forEach((m) => $("f-marca").insertAdjacentHTML("beforeend", `<option>${esc(m)}</option>`));
  [...new Set(l.map((a) => a.anio))].sort((a, b) => b - a).forEach((y) => $("f-anio").insertAdjacentHTML("beforeend", `<option>${y}</option>`));
  ["f-pre", "f-marca", "f-anio", "f-ord", "f-dis"].forEach((id) => ($(id).onchange = draw));
  chips(); draw();
}).catch(() => { $("cars").innerHTML = `<p class="empty">No pudimos cargar el inventario. Recarga la página o escríbenos por WhatsApp al 33 3306 3319.</p>`; });
