// Recorrido virtual de un auto con sus fotos reales.
// Datos en data/recorridos.json: { "<slug>": { tipo?: "moto", giro: [fotos alrededor], fh: { foto: [[x, y, destino]] }, s: { lugar: [foto, [[x, y, destino]]] } } }
// x, y = posición del punto verde en % de la foto. "fuera" es la vuelta alrededor del auto.
import { autos, src, wa, SITE, BASE } from "./comun.js?v=p6";

const NOM = {
  fuera: "Por fuera", puerta: "Puerta del conductor", asiento: "Asiento del conductor", volante: "Al volante", copiloto: "Asiento del copiloto",
  atras: "Asientos de atrás", desdeatras: "Sentado atrás", espacio: "Espacio atrás", cajuela: "Cajuela", motor: "Motor", rin: "Rin y llanta",
  tablero: "Tablero", medidores: "Medidores", reloj: "Reloj del tablero", tercera: "Tercera fila", techo: "Quemacocos", caja: "Caja",
  carga: "Zona de carga", lateral: "Puerta lateral", suspension: "Suspensión", turbo: "Motor de cerca", puertadet: "Puerta", frunk: "Cajuela delantera",
  cristal: "Cristal blindado", blindaje: "Placa del blindaje", delanteros: "Asientos delanteros", bocina: "Bocina Fender", estereo: "Estéreo",
  debajo: "Por debajo", manejo: "En el manubrio", guantera: "Compartimento",
};
const IR = {
  puerta: "Abrir la puerta", asiento: "Ver el asiento", volante: "Ponerte al volante", copiloto: "Ver el copiloto", atras: "Pasar atrás",
  desdeatras: "Sentarte atrás", espacio: "Ver el espacio", cajuela: "Abrir la cajuela", motor: "Abrir el cofre", rin: "Ver el rin",
  fuera: "Bajar del auto", tablero: "Ver el tablero", medidores: "Ver los medidores", reloj: "Ver el reloj", tercera: "Ver la tercera fila",
  techo: "Ver el quemacocos", caja: "Ver la caja", carga: "Ver la zona de carga", lateral: "Ver la puerta lateral", suspension: "Ver la suspensión",
  turbo: "Ver de cerca", puertadet: "Ver la puerta", frunk: "Abrir la cajuela delantera", cristal: "Ver el blindaje", blindaje: "Ver la placa del blindaje",
  delanteros: "Ver los asientos", bocina: "Ver la bocina", estereo: "Ver el estéreo", debajo: "Ver por debajo", manejo: "Subirte", guantera: "Ver el compartimento",
};
const $ = (id) => document.getElementById(id);
const stage = $("stage"), box = $("box"), img = $("img"), blur = $("blur"), hint = $("hint"), dock = $("dock"), where = $("rec-where"), cover = $("cover");
const slug = new URLSearchParams(location.search).get("a") || "";
let R = null, moto = false, entra = "asiento", cur = null, frame = null, busy = false, pan = 0, maxPan = 0;
const ratio = {};

function etiqueta(to) {
  if (cur === "fuera" && ["asiento", "puerta", "delanteros"].includes(to)) return "Abrir la puerta";
  if (moto && to === "fuera") return "Bajarte";
  if (moto && to === "asiento") return "Ver el asiento";
  return IR[to] || "Ir";
}
function nombre(k) { return moto && k === "asiento" ? "Asiento" : NOM[k] || "Recorrido"; }
const foto = () => (cur === "fuera" ? frame : R.s[cur][0]);
const puntos = () => (cur === "fuera" ? R.fh[frame] || [] : R.s[cur][1] || []);

function fit() {
  const p = foto(), r = ratio[p] || 3 / 4, W = stage.clientWidth, H = stage.clientHeight;
  let w = W, h = W / r; if (h > H) { h = H; w = H * r; }
  // Foto horizontal en pantalla vertical: llena el alto y se desliza a los lados para mirar alrededor.
  if (cur !== "fuera" && r > 1 && W / H < 1) { h = H; w = H * r; }
  maxPan = Math.max(0, (w - W) / 2); pan = Math.max(-maxPan, Math.min(maxPan, pan));
  box.style.width = w + "px"; box.style.height = h + "px"; box.style.left = `calc(50% + ${pan}px)`;
}
function paint() {
  const p = foto();
  img.src = src(p); img.alt = nombre(cur); blur.style.backgroundImage = `url('${src(p, "t")}')`;
  fit();
  box.querySelectorAll(".rec-hs").forEach((b) => b.remove());
  puntos().forEach(([x, y, to]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "rec-hs"; b.style.left = x + "%"; b.style.top = y + "%";
    b.innerHTML = `<span class="ring" aria-hidden="true">›</span><span class="lbl">${etiqueta(to)}</span>`;
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.onclick = (e) => { e.stopPropagation(); walk(to, x, y); };
    box.appendChild(b);
  });
}
function medir(p) {
  return new Promise((ok) => {
    if (ratio[p]) return ok();
    const im = new Image();
    im.onload = () => { ratio[p] = im.naturalWidth / im.naturalHeight || 3 / 4; ok(); };
    im.onerror = () => ok();
    im.src = src(p);
  });
}
function dockList() {
  const l = [["fuera", "Por fuera"], [entra, moto ? "Subirte" : "Subirte"]];
  for (const [k, t] of [["volante", "Volante"], ["medidores", "Medidores"], ["atras", "Atrás"], ["cajuela", "Cajuela"], ["caja", "Caja"], ["carga", "Carga"], ["motor", "Motor"]])
    if (R.s[k] && k !== entra && !(moto === false && k === "medidores")) l.push([k, t]);
  return l;
}
function setDock() {
  dock.innerHTML = dockList().map(([k, t]) => `<button type="button" data-k="${k}" aria-current="${k === cur}">${t}</button>`).join("");
  dock.querySelectorAll("button").forEach((b) => (b.onclick = () => walk(b.dataset.k, 50, 50)));
}
function showHint() {
  hint.textContent = maxPan ? "Desliza para mirar a los lados" : cur === "fuera" ? "Desliza para darle la vuelta" : "Toca un punto verde para moverte";
  hint.classList.remove("off");
  clearTimeout(showHint.t); showHint.t = setTimeout(() => hint.classList.add("off"), 3500);
}
async function enter(k) {
  cur = k; pan = 0;
  if (k === "fuera" && !R.giro.includes(frame)) frame = R.giro[0];
  await medir(foto());
  where.textContent = nombre(k); paint(); setDock(); showHint();
}
// Caminar: acercarse hacia el punto tocado y aparecer en el siguiente lugar.
async function walk(to, x, y) {
  if (busy || to === cur || (to !== "fuera" && !R.s[to])) return;
  busy = true;
  box.style.transformOrigin = `${x}% ${y}%`;
  box.style.transform = "translate(-50%,-50%) scale(2.3)"; box.classList.add("out");
  const nextP = to === "fuera" ? R.giro[0] : R.s[to][0];
  await Promise.all([medir(nextP), new Promise((r) => setTimeout(r, 520))]);
  if (to === "fuera") frame = R.giro[0];
  box.style.transition = "none"; box.style.transformOrigin = "50% 50%";
  box.style.transform = "translate(-50%,-50%) scale(.86)"; box.classList.remove("out"); box.classList.add("in");
  await enter(to);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    box.style.transition = ""; box.style.transform = "translate(-50%,-50%) scale(1)"; box.classList.remove("in");
    setTimeout(() => (busy = false), 500);
  }));
}
// Deslizar: por fuera le da la vuelta; en fotos horizontales mira a los lados.
let x0 = null, k0 = 0, p0 = 0;
stage.addEventListener("pointerdown", (e) => {
  if (!cur || (cur !== "fuera" && !maxPan)) return;
  x0 = e.clientX; p0 = pan; k0 = cur === "fuera" ? R.giro.indexOf(frame) : 0; hint.classList.add("off");
  try { stage.setPointerCapture(e.pointerId); } catch (er) {}
});
stage.addEventListener("pointermove", (e) => {
  if (x0 === null) return;
  if (cur !== "fuera") { pan = Math.max(-maxPan, Math.min(maxPan, p0 + e.clientX - x0)); box.style.left = `calc(50% + ${pan}px)`; return; }
  const n = R.giro.length, step = Math.max(40, stage.clientWidth / (n * 0.9));
  const k = (((k0 + Math.round((x0 - e.clientX) / step)) % n) + n) % n;
  if (R.giro[k] !== frame) { frame = R.giro[k]; medir(frame).then(paint); }
});
const up = () => (x0 = null);
stage.addEventListener("pointerup", up); stage.addEventListener("pointercancel", up);
window.addEventListener("resize", () => cur && fit());
document.addEventListener("keydown", (e) => {
  if (cur !== "fuera" || cover && !cover.classList.contains("gone")) return;
  const n = R.giro.length, k = R.giro.indexOf(frame);
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") { frame = R.giro[(k + (e.key === "ArrowRight" ? 1 : -1) + n) % n]; medir(frame).then(paint); }
});

function fail(msg) { stage.innerHTML = `<p class="rec-empty">${msg}</p>`; dock.innerHTML = ""; }

async function init() {
  if (!slug) return fail("Falta elegir un auto. Regresa al inventario.");
  let rec, lista;
  try { [rec, lista] = await Promise.all([fetch(BASE + "data/recorridos.json", { cache: "no-cache" }).then((r) => r.json()), autos()]); }
  catch (er) { return fail("No pudimos cargar el recorrido. Recarga la página o escríbenos por WhatsApp al 33 3306 3319."); }
  const a = lista.find((x) => x.slug === slug);
  R = rec[slug];
  $("rec-back").href = `auto.html?a=${encodeURIComponent(slug)}`;
  if (!a || !R) return fail("Este auto todavía no tiene recorrido virtual. Escríbenos por WhatsApp y te mandamos fotos o video.");
  moto = R.tipo === "moto";
  entra = ["puerta", "asiento", "manejo", "delanteros"].find((k) => R.s[k]) || Object.keys(R.s)[0];
  const name = a.nombre || a.title;
  document.title = `Recorrido virtual: ${name} | Entre Amigos`;
  $("cover-t").textContent = name;
  $("cover-img").src = src(a.foto || R.giro[0]); $("cover-img").alt = name;
  $("subir").textContent = moto ? "Súbete a la moto" : "Súbete al auto";
  if (moto) $("cover-p").textContent = "Revísala como si estuvieras aquí: rodéala y súbete.";
  $("rec-wa").href = wa(`Hola, vi el recorrido virtual del ${name} en su página y me interesa: ${SITE}/auto.html?a=${encodeURIComponent(slug)}`);
  R.giro.forEach((p) => { const im = new Image(); im.src = src(p); });
  Object.values(R.s).forEach(([p]) => { const im = new Image(); im.src = src(p, "t"); });
  const start = async (k) => {
    cover.classList.add("gone");
    frame = R.giro[0];
    // Entrar caminando hacia el primer punto que lleva adentro, si lo hay.
    const fhEntry = Object.entries(R.fh).find(([, l]) => l.some((h) => h[2] === entra));
    if (k !== "fuera" && fhEntry) frame = fhEntry[0];
    await enter("fuera");
    if (k !== "fuera") { const h = (R.fh[frame] || []).find((t) => t[2] === entra) || [50, 50]; setTimeout(() => walk(k, h[0], h[1]), 350); }
  };
  $("subir").onclick = () => start(entra);
  $("rodear").onclick = () => start("fuera");
}
init();
