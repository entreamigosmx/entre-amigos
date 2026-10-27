import { autos, card, esc, WA_ICON } from "./comun.js?v=p4";

document.getElementById("fixwa").innerHTML = WA_ICON;
const $ = (id) => document.getElementById(id);
const ORDEN = ["Ofertas", "SUVs", "Familiares", "Pickups", "Trabajo", "Todo terreno", "Sedanes", "Lujo", "Eléctricos", "Motos"];
const LBL = { Motos: "Motocicletas y trimotos" };
// "Ofertas" se llena sola: todo auto con precio especial y precio anterior mayor al actual.
const oferta = (a) => !!(a.precioEspecial && a.precioAnterior && a.precioAnterior > a.precio);
const cats = (a) => [...(oferta(a) ? ["Ofertas"] : []), ...(a.categorias && a.categorias.length ? a.categorias : [a.categoria].filter(Boolean))];
let ALL = [], CAT = new URLSearchParams(location.search).get("cat") || "";

function draw() {
  const mn = Number($("f-min").value) || 0, mx = Number($("f-max").value) || Infinity, marca = $("f-marca").value, anio = Number($("f-anio").value) || 0, ord = $("f-ord").value;
  let l = ALL.filter((a) => (!CAT || cats(a).includes(CAT)) && (!marca || a.marca === marca) && (!anio || a.anio >= anio) && a.precio >= mn && a.precio <= mx);
  const nf = [marca, $("f-min").value, $("f-max").value, $("f-anio").value].filter(Boolean).length;
  $("ftog").textContent = nf ? `Filtrar vehículos (${nf})` : "Filtrar vehículos";
  const by = { pa: (a, b) => a.precio - b.precio, pd: (a, b) => b.precio - a.precio, ad: (a, b) => b.anio - a.anio, km: (a, b) => (a.kilometraje ?? 1e9) - (b.kilometraje ?? 1e9) }[ord];
  if (by) l = l.slice().sort(by);
  else if (CAT === "Ofertas") l = l.slice().sort((a, b) => (b.precioAnterior - b.precio) / b.precioAnterior - (a.precioAnterior - a.precio) / a.precioAnterior);
  $("count").textContent = CAT === "Ofertas" ? "Precios especiales de octubre" : `${l.length} ${l.length === 1 ? "vehículo" : "vehículos"}`; // en Ofertas no se muestra cantidad
  $("cars").innerHTML = l.length ? l.map(card).join("") : `<p class="empty">No hay vehículos con esos filtros. Prueba con otros filtros o escríbenos: si no lo tenemos, te lo buscamos.</p>`;
  const u = new URL(location); CAT ? u.searchParams.set("cat", CAT) : u.searchParams.delete("cat"); history.replaceState(null, "", u);
}
function chips() {
  const have = new Set(ALL.flatMap(cats));
  const list = ["", ...ORDEN.filter((c) => have.has(c))];
  $("chips").innerHTML = list.map((c) => `<button class="chip" type="button" data-c="${esc(c)}" aria-pressed="${c === CAT}"${c === "Ofertas" ? ' data-of="1"' : ""}>${esc(c ? LBL[c] || c : "Todos")}</button>`).join("");
  $("chips").querySelectorAll(".chip").forEach((b) => (b.onclick = () => { CAT = b.dataset.c; chips(); draw(); }));
}
autos().then((l) => {
  ALL = l;
  [...new Set(l.map((a) => a.marca))].sort().forEach((m) => $("f-marca").insertAdjacentHTML("beforeend", `<option>${esc(m)}</option>`));
  [...new Set(l.map((a) => a.anio))].sort((a, b) => b - a).forEach((y) => $("f-anio").insertAdjacentHTML("beforeend", `<option>${y}</option>`));
  ["f-min", "f-max", "f-marca", "f-anio", "f-ord"].forEach((id) => ($(id).onchange = draw));
  $("ftog").onclick = () => { const o = $("filters").classList.toggle("open"); $("ftog").setAttribute("aria-expanded", String(o)); };
  chips(); draw();
}).catch(() => { $("cars").innerHTML = `<p class="empty">No pudimos cargar el inventario. Recarga la página o escríbenos por WhatsApp al 33 3306 3319.</p>`; });
