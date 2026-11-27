// Recorrido virtual de un auto con fotos reales.
// Datos en data/recorridos.json: { "<slug>": { "escenas": [ ... ] } }
// Tipos de escena:
//   giro: { fotos: [...] }  fotos tomadas alrededor del auto; se arrastra para darle la vuelta.
//   foto: { src }           una foto normal.
//   360:  { src, yaw?, ir?: [{ a: "<nombre de escena>", yaw, pitch }] }  foto 360 (equirectangular) de cámara 360.
import { autos, src, esc, wa, SITE, BASE } from "./comun.js?v=p6";

const $ = (id) => document.getElementById(id);
const slug = new URLSearchParams(location.search).get("a") || "";
const view = $("rec-view"), tabs = $("rec-tabs"), chips = $("rec-chips");
let esc_ = [], cur = -1, pano = null, cleanup = null;

const PN = "https://cdnjs.cloudflare.com/ajax/libs/pannellum/2.5.6/";
let pnLoad = null;
function loadPannellum() {
  if (pnLoad) return pnLoad;
  pnLoad = new Promise((ok, no) => {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = PN + "pannellum.css"; document.head.appendChild(l);
    const s = document.createElement("script"); s.src = PN + "pannellum.js"; s.onload = ok; s.onerror = no; document.head.appendChild(s);
  });
  return pnLoad;
}

function fail(msg) { view.innerHTML = `<p class="empty" style="position:absolute;inset:0;display:grid;place-items:center;padding:20px;text-align:center">${msg}</p>`; }

function grupos() { return [...new Set(esc_.map((e) => e.grupo))]; }

function drawTabs() {
  const g = esc_[cur].grupo;
  tabs.innerHTML = grupos().map((x) => `<button type="button" role="tab" aria-selected="${x === g}" data-g="${esc(x)}">${esc(x)}</button>`).join("");
  tabs.querySelectorAll("button").forEach((b) => (b.onclick = () => go(esc_.findIndex((e) => e.grupo === b.dataset.g))));
  const lst = esc_.map((e, i) => [e, i]).filter(([e]) => e.grupo === g);
  chips.innerHTML = lst.map(([e, i]) => `<button type="button" data-i="${i}" aria-current="${i === cur}"><img src="${src(e.tipo === "giro" ? e.fotos[0] : e.poster || e.src, e.tipo === "360" ? undefined : "t")}" alt="" loading="lazy"><span>${esc(e.nombre)}</span></button>`).join("");
  chips.querySelectorAll("button").forEach((b) => (b.onclick = () => go(Number(b.dataset.i))));
  chips.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function nextBtn() {
  // Botón para pasar a la siguiente parte del recorrido (por ejemplo, de "Por fuera" a "Por dentro").
  const g = esc_[cur].grupo, gs = grupos(), k = gs.indexOf(g);
  if (k < 0 || k === gs.length - 1) return "";
  const lbl = gs[k + 1] === "Por dentro" ? "Súbete al auto" : `Ver ${gs[k + 1].toLowerCase()}`;
  return `<button class="btn primary go" type="button" data-next="${esc(gs[k + 1])}">${lbl} ›</button>`;
}

function stepArrows() {
  return `<button class="arw l" type="button" aria-label="Anterior">‹</button><button class="arw r" type="button" aria-label="Siguiente">›</button>`;
}

function bindCommon() {
  view.querySelector(".go")?.addEventListener("click", (e) => { e.stopPropagation(); go(esc_.findIndex((x) => x.grupo === e.currentTarget.dataset.next)); });
}

function showFoto(e) {
  view.innerHTML = `<div class="blur" style="background-image:url('${src(e.src, "t")}')"></div><img class="main" src="${src(e.src)}" alt="${esc(e.nombre)}"><span class="rtag">${esc(e.nombre)}</span>${stepArrows()}${nextBtn()}`;
  view.querySelector(".arw.l").onclick = () => go(cur - 1);
  view.querySelector(".arw.r").onclick = () => go(cur + 1);
  let x0 = null;
  const ts = (ev) => (x0 = ev.touches[0].clientX);
  const te = (ev) => { if (x0 === null) return; const dx = ev.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1)); x0 = null; };
  view.addEventListener("touchstart", ts, { passive: true }); view.addEventListener("touchend", te);
  cleanup = () => { view.removeEventListener("touchstart", ts); view.removeEventListener("touchend", te); };
  bindCommon();
}

function showGiro(e) {
  const fr = e.fotos, n = fr.length;
  let k = 0;
  view.innerHTML = `<div class="blur" style="background-image:url('${src(fr[0], "t")}')"></div><div class="giro" style="position:absolute;inset:0"></div><img class="main" src="${src(fr[0])}" alt="${esc(e.nombre)}"><span class="rtag">${esc(e.nombre)}</span><div class="dots">${fr.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join("")}</div><span class="hint">Desliza para darle la vuelta</span>${stepArrows()}${nextBtn()}`;
  const img = view.querySelector("img.main"), bl = view.querySelector(".blur"), dots = [...view.querySelectorAll(".dots i")], hint = view.querySelector(".hint");
  fr.forEach((f) => { const im = new Image(); im.src = src(f); });
  const set = (v) => { k = ((v % n) + n) % n; img.src = src(fr[k]); bl.style.backgroundImage = `url('${src(fr[k], "t")}')`; dots.forEach((d, i) => d.classList.toggle("on", i === k)); };
  view.querySelector(".arw.l").onclick = () => set(k - 1);
  view.querySelector(".arw.r").onclick = () => set(k + 1);
  // Arrastrar: cada tramo de pantalla cambia de ángulo, como si caminaras alrededor del auto.
  const pad = view.querySelector(".giro");
  let x0 = null, k0 = 0;
  const step = () => Math.max(40, view.clientWidth / (n * 0.9));
  pad.addEventListener("pointerdown", (ev) => { x0 = ev.clientX; k0 = k; pad.setPointerCapture(ev.pointerId); hint.classList.add("off"); });
  pad.addEventListener("pointermove", (ev) => { if (x0 === null) return; const d = Math.round((x0 - ev.clientX) / step()); if (k0 + d !== k) set(k0 + d); });
  const up = () => (x0 = null);
  pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);
  bindCommon();
}

async function show360(e) {
  view.innerHTML = `<div class="pano" id="pano"></div><span class="rtag">${esc(e.nombre)}</span><span class="hint">Arrastra para mirar alrededor</span>${nextBtn()}`;
  bindCommon();
  try { await loadPannellum(); } catch (er) { fail("No se pudo cargar el recorrido. Revisa tu conexión y vuelve a intentar."); return; }
  const hint = view.querySelector(".hint");
  pano = window.pannellum.viewer("pano", {
    type: "equirectangular", panorama: new URL(src(e.src), location.href).href, autoLoad: true,
    yaw: e.yaw || 0, pitch: e.pitch || 0, hfov: 100, showFullscreenCtrl: true, showZoomCtrl: false, compass: false,
    hotSpots: (e.ir || []).map((h) => ({ yaw: h.yaw, pitch: h.pitch || -10, type: "info", text: h.texto || h.a, clickHandlerFunc: () => go(esc_.findIndex((x) => x.nombre === h.a)) })),
  });
  pano.on("mousedown", () => hint?.classList.add("off"));
  pano.on("touchstart", () => hint?.classList.add("off"));
}

function go(i) {
  if (i < 0 || !esc_.length) return;
  i = (i + esc_.length) % esc_.length;
  if (i === cur) return;
  if (cleanup) { cleanup(); cleanup = null; }
  if (pano) { try { pano.destroy(); } catch (er) {} pano = null; }
  cur = i;
  const e = esc_[i];
  if (e.tipo === "giro") showGiro(e); else if (e.tipo === "360") show360(e); else showFoto(e);
  drawTabs();
  history.replaceState(null, "", `?a=${encodeURIComponent(slug)}&e=${i}`);
}

async function init() {
  if (!slug) return fail("Falta elegir un auto. Regresa al inventario.");
  let rec, lista;
  try {
    [rec, lista] = await Promise.all([fetch(BASE + "data/recorridos.json", { cache: "no-cache" }).then((r) => r.json()), autos()]);
  } catch (er) { return fail("No pudimos cargar el recorrido. Recarga la página o escríbenos por WhatsApp al 33 3306 3319."); }
  const a = lista.find((x) => x.slug === slug), r = rec[slug];
  $("rec-back").href = `auto.html?a=${encodeURIComponent(slug)}`;
  if (!a || !r || !r.escenas?.length) return fail("Este auto todavía no tiene recorrido virtual. Escríbenos por WhatsApp y te mandamos fotos o video.");
  const name = a.nombre || a.title;
  document.title = `Recorrido virtual: ${name} | Entre Amigos`;
  $("rec-t").textContent = name;
  $("rec-wa").href = wa(`Hola, vi el recorrido virtual del ${name} en su página y me interesa: ${SITE}/auto.html?a=${encodeURIComponent(slug)}`);
  esc_ = r.escenas;
  const e0 = Number(new URLSearchParams(location.search).get("e")) || 0;
  go(Math.min(Math.max(e0, 0), esc_.length - 1));
  document.addEventListener("keydown", (ev) => { if (esc_[cur]?.tipo === "360") return; if (ev.key === "ArrowLeft") view.querySelector(".arw.l")?.click(); if (ev.key === "ArrowRight") view.querySelector(".arw.r")?.click(); });
}
init();
