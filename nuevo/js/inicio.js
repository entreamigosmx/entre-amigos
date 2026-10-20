import { autos, card, mxn, esc, wa, BASE, WA_ICON } from "./comun.js?v=1";

document.getElementById("fixwa").innerHTML = WA_ICON;
document.getElementById("wa-sell").insertAdjacentHTML("afterbegin", WA_ICON);

/* Destacados y formulario de financiamiento */
const sel = document.getElementById("f-auto");
let LIST = [];
autos().then((list) => {
  LIST = list;
  const dest = list.filter((a) => a.portada && !a.apartado).slice(0, 8);
  const pick = dest.length >= 6 ? dest : dest.concat(list.filter((a) => !a.portada && !a.apartado)).slice(0, 8);
  document.getElementById("cars").innerHTML = pick.map(card).join("");
  const t = `Ver todo el inventario (${list.length})`;
  document.getElementById("all-btn").textContent = t;
  document.getElementById("all-top").textContent = t;
  sel.innerHTML = `<option value="">Elige un auto</option>` + list.map((a) => `<option value="${esc(a.slug)}">${esc(a.title)} · ${mxn(a.precio)}</option>`).join("") + `<option value="otro">Otro auto</option>`;
  const want = new URLSearchParams(location.search).get("auto");
  if (want && list.some((a) => a.slug === want)) { sel.value = want; document.getElementById("financiamiento").scrollIntoView(); }
  hint();
}).catch(() => {
  document.getElementById("cars").innerHTML = `<p class="empty">No pudimos cargar el inventario. Recarga la página o escríbenos por WhatsApp al 33 3306 3319.</p>`;
  sel.innerHTML = `<option value="otro">Otro auto</option>`;
});

const fe = document.getElementById("f-eng");
function hint() {
  const a = LIST.find((x) => x.slug === sel.value);
  document.getElementById("f-hint").textContent = a
    ? `Enganche sugerido para este auto: ${mxn(Math.ceil(a.precio * 0.35))} (35%). Puede ser menor según tu historial crediticio.`
    : "Enganche sugerido: 35% del precio del auto.";
}
sel.onchange = hint;
fe.addEventListener("input", () => { const d = fe.value.replace(/\D/g, ""); fe.value = d ? Number(d).toLocaleString("es-MX") : ""; });
document.getElementById("fin").addEventListener("submit", (e) => {
  e.preventDefault();
  const a = LIST.find((x) => x.slug === sel.value), eng = Number(fe.value.replace(/\D/g, "")), nom = document.getElementById("f-nom").value.trim(), plazo = document.getElementById("f-plazo").value;
  const err = !sel.value ? "Elige el auto que te interesa." : !nom ? "Escribe tu nombre." : "";
  const el = document.getElementById("f-err"); el.hidden = !err; el.textContent = err; if (err) return;
  location.href = wa(`Hola, soy ${nom}. Quiero cotizar un crédito para ${a ? "el " + a.title + " (" + mxn(a.precio) + ")" : "un auto"}.${eng ? " Enganche: " + mxn(eng) + "." : ""} Plazo: ${plazo}.`);
});

/* Opiniones que rotan */
const box = document.getElementById("revs"), dots = document.getElementById("rev-dots");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
fetch(BASE + "data/opiniones.json", { cache: "no-cache" }).then((r) => r.json()).then((list) => {
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  let start = 0, paused = false;
  const per = () => (innerWidth >= 1100 ? 4 : innerWidth >= 800 ? 3 : innerWidth >= 560 ? 2 : 1);
  const draw = () => {
    const n = Math.min(per(), list.length);
    box.classList.add("fading");
    setTimeout(() => {
      box.style.gridTemplateColumns = `repeat(${n}, minmax(0, 1fr))`;
      box.innerHTML = Array.from({ length: n }, (_, k) => list[(start + k) % list.length]).map((o) => `<figure class="rev"><div class="stars" aria-label="5 de 5 estrellas">★★★★★</div><blockquote>${esc(o.texto)}</blockquote><figcaption>${esc(o.nombre)} · Google</figcaption></figure>`).join("");
      box.classList.remove("fading");
      const pages = Math.ceil(list.length / n), cur = Math.floor(start / n) % pages;
      dots.innerHTML = Array.from({ length: pages }, (_, p) => `<button type="button" aria-label="Opiniones ${p + 1}" data-p="${p}"${p === cur ? ' aria-current="true"' : ""}></button>`).join("");
    }, reduce ? 0 : 300);
  };
  dots.onclick = (e) => { const b = e.target.closest("button"); if (b) { start = Number(b.dataset.p) * per(); draw(); } };
  box.onmouseenter = () => (paused = true); box.onmouseleave = () => (paused = false);
  box.addEventListener("touchstart", () => { paused = true; setTimeout(() => (paused = false), 12000); }, { passive: true });
  draw(); setInterval(() => { if (!paused && !document.hidden) { start = (start + Math.min(per(), list.length)) % list.length; draw(); } }, 7000);
  addEventListener("resize", draw);
}).catch(() => {});
