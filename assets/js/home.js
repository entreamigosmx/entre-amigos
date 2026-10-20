import { getCars, img, photos, mxn, km, esc, waLink } from "./wix.js";

const carsEl = document.getElementById("cars");
const chipsEl = document.getElementById("chips");
const sel = document.getElementById("f-auto");
let CARS = [];
let current = "Todos";

function card(c) {
  const p = photos(c);
  const tag = c.apartado ? `<span class="tag res">Apartado</span>` : c.precioEspecial ? `<span class="tag">Precio especial</span>` : "";
  const ph = p.length
    ? `<img src="${img(p[0].src, 640, 480)}" srcset="${img(p[0].src, 480, 360)} 480w, ${img(p[0].src, 640, 480)} 640w, ${img(p[0].src, 960, 720)} 960w" sizes="(min-width: 1100px) 280px, (min-width: 600px) 45vw, 92vw" loading="lazy" decoding="async" alt="${esc(c.title)}">`
    : `<div class="mono"><b>${esc(c.marca)}</b><span>Fotos próximamente</span></div>`;
  const meta = [c.anio, c.kilometraje ? km(c.kilometraje) : "", c.categoria].filter(Boolean).join(" · ");
  const prev = c.precioEspecial && c.precioAnterior ? `<s>${mxn(c.precioAnterior)}</s>` : "";
  return `<a class="car${c.apartado ? " is-res" : ""}" href="auto.html?a=${encodeURIComponent(c.slug)}">
    <div class="ph">${ph}${tag}</div>
    <div class="cb"><h3>${esc(c.marca)} ${esc(c.modelo)}</h3><div class="m">${esc(meta)}</div>
    <div class="pr"><b>${mxn(c.precio)}</b>${prev}</div></div></a>`;
}

const cats = (c) => (c.categorias && c.categorias.length ? c.categorias : [c.categoria].filter(Boolean));
function drawChips() {
  const ORDEN = ["SUVs", "Familiares", "Pickups", "Trabajo", "Todo terreno", "Sedanes", "Lujo", "Eléctricos", "Motos"];
  const hay = new Set(CARS.flatMap(cats));
  const cats_ = ["Todos", ...ORDEN.filter((x) => hay.has(x)), ...[...hay].filter((x) => !ORDEN.includes(x))];
  chipsEl.innerHTML = cats_.map((c) => `<button class="chip" type="button" aria-pressed="${c === current}">${esc(c)}</button>`).join("");
  chipsEl.querySelectorAll(".chip").forEach((b) => (b.onclick = () => { current = b.textContent; drawChips(); drawCars(); }));
}
function drawCars() {
  const list = CARS.filter((c) => current === "Todos" || cats(c).includes(current));
  carsEl.innerHTML = list.length ? list.map(card).join("") : `<div class="state">No hay autos en esta categoría por ahora.</div>`;
}

function hero() {
  const pick = CARS.find((c) => c.destacado && photos(c).length > 2) || CARS.find((c) => photos(c).length);
  if (!pick) return;
  const p = photos(pick);
  const h = document.getElementById("heroImg");
  h.src = img((p[2] || p[0]).src, 1800, 1100);
  h.hidden = false;
}

/* financiamiento */
const fe = document.getElementById("f-eng");
const fh = document.getElementById("f-hint");
const ferr = document.getElementById("f-err");
const min = (c) => Math.ceil(c.precio * 0.35);
function updHint() {
  const c = CARS.find((x) => x.title === sel.value);
  fh.textContent = c ? `Enganche desde ${mxn(min(c))} (35% de ${mxn(c.precio)}). Con buen historial crediticio puede ser menor.` : "Enganche desde 35% del precio del auto. Con buen historial crediticio puede ser menor.";
}
function fillSelect() {
  sel.innerHTML = `<option value="">Elige un auto</option>` + CARS.map((c) => `<option>${esc(c.title)}</option>`).join("") + `<option>Otro auto</option>`;
  const want = new URLSearchParams(location.search).get("auto");
  const c = want && CARS.find((x) => x.slug === want);
  if (c) sel.value = c.title;
  updHint();
}
sel.onchange = updHint;
fe.addEventListener("input", () => { const d = fe.value.replace(/\D/g, ""); fe.value = d ? Number(d).toLocaleString("es-MX") : ""; });
document.getElementById("fin").addEventListener("submit", (e) => {
  e.preventDefault();
  const auto = sel.value;
  const eng = Number(fe.value.replace(/\D/g, ""));
  const plazo = document.getElementById("f-plazo").value;
  const nom = document.getElementById("f-nom").value.trim();
  const c = CARS.find((x) => x.title === auto);
  let err = "";
  if (!auto) err = "Elige el auto que te interesa.";
  else if (!eng) err = "Escribe cuánto quieres dar de enganche.";
  else if (!nom) err = "Escribe tu nombre para saber a quién mandarle la cotización.";
  ferr.hidden = !err;
  ferr.textContent = err;
  if (err) return;
  location.href = waLink(`Hola, soy ${nom}. Quiero cotizar un crédito para el ${auto}. Enganche: ${mxn(eng)}. Plazo: ${plazo}.`);
});

getCars()
  .then((cars) => {
    CARS = cars;
    const fc = document.getElementById("factCount");
    if (fc) fc.textContent = String(CARS.length);
    drawChips();
    drawCars();
    fillSelect();
  })
  .catch(() => {
    carsEl.innerHTML = `<div class="state">No pudimos cargar el inventario. Recarga la página o escríbenos por WhatsApp al 33 3306 3319.</div>`;
    sel.innerHTML = `<option value="">Otro auto</option>`;
  });