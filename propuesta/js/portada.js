import { autos, card, src, fotos, mxn, km, esc, BASE, WA_ICON, ficha } from "./comun.js?v=p3";

document.getElementById("fixwa").innerHTML = WA_ICON;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const local = (a) => fotos(a)[0] && !/^https?:/.test(fotos(a)[0]);

/* Showroom: portada a pantalla completa con los autos destacados */
function showroom(list) {
  const pick = list.filter((a) => a.portada && !a.apartado && local(a)).slice(0, 6);
  const slides = document.getElementById("slides"), bars = document.getElementById("bars");
  slides.insertAdjacentHTML("beforeend", pick.map((a) => {
    const media = `<img src="${src(fotos(a)[0])}" alt="${esc(a.title)}" loading="lazy" decoding="async">`;
    const sub = [a.anio, a.kilometraje ? km(a.kilometraje) : ""].filter(Boolean).join(" · ");
    return `<article class="sl">
      <div class="media">${media}</div>
      <div class="cap car-cap">
        <span class="eyebrow">Disponible</span>
        <h2>${esc(a.nombre || a.title)}</h2>
        <p class="sub">${esc([a.version, sub].filter(Boolean).join(" · "))}</p>
        <p class="price">${mxn(a.precio)}</p>
        <div class="btns"><a class="btn primary" href="${ficha(a)}">Ver ${a.categoria === "Moto" ? "moto" : "auto"}</a><a class="btn ghost" href="inventario.html">Ver inventario</a></div>
      </div>
    </article>`;
  }).join(""));
  const els = [...slides.children];
  bars.innerHTML = els.map(() => `<i><b></b></i>`).join("");
  const bs = [...bars.children];
  let i = 0, t0 = 0, raf = 0, paused = false, acc = 0;
  const dur = (k) => (k === 0 ? 7000 : 5000);
  function go(n) {
    const prev = els[i];
    i = (n + els.length) % els.length;
    els.forEach((e, k) => e.classList.toggle("on", k === i));
    bs.forEach((b, k) => { b.firstChild.style.transform = `scaleX(${k < i ? 1 : 0})`; });
    const pv = prev.querySelector("video"); if (pv && prev !== els[0]) pv.pause();
    const v = els[i].querySelector("video");
    if (v) { if (v.dataset.src && !v.src) v.src = v.dataset.src; v.currentTime = 0; v.play().catch(() => {}); }
    const nx = els[(i + 1) % els.length].querySelector("img"); if (nx) nx.loading = "eager";
    acc = 0; t0 = performance.now();
  }
  function tick(now) {
    if (!paused && !document.hidden) {
      acc += now - t0;
      const p = Math.min(1, acc / dur(i));
      bs[i].firstChild.style.transform = `scaleX(${p})`;
      if (p >= 1) go(i + 1);
    }
    t0 = now; raf = requestAnimationFrame(tick);
  }
  document.getElementById("sh-next").onclick = () => go(i + 1);
  document.getElementById("sh-prev").onclick = () => go(i - 1);
  const sh = document.getElementById("inicio");
  let x0 = null;
  sh.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; paused = true; }, { passive: true });
  sh.addEventListener("touchend", (e) => { paused = false; if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); x0 = null; });
  sh.addEventListener("mouseenter", () => (paused = true)); sh.addEventListener("mouseleave", () => (paused = false));
  addEventListener("keydown", (e) => { if (e.key === "ArrowRight") go(i + 1); if (e.key === "ArrowLeft") go(i - 1); });
  new IntersectionObserver(([en]) => { paused = !en.isIntersecting; document.getElementById("fixwa").classList.toggle("hide", en.intersectionRatio > 0.4); }, { threshold: [0, 0.4, 1] }).observe(sh);
  go(0);
  if (!reduce) raf = requestAnimationFrame((n) => { t0 = n; tick(n); });
  return pick;
}

/* Explora por tipo: íconos de línea propios, uno por tipo */
const ICONOS = {
"SUVs": "<path d=\"M7.4 24 H3 L3 18 L5 15.5 L13 14.2 L19 8 L56 8 L59.5 10 L61 16 L61 24 V24 H55.6 M43.4 24 H19.6 M7.4 24 A6.1 6.1 0 0 1 19.6 24 M43.4 24 A6.1 6.1 0 0 1 55.6 24\"/><path d=\"M24 6.2H52\"/><path d=\"M20.2 9.6L16.6 14H31V9.6zM33.5 9.6V14H45V9.6zM47.5 9.6V14H59.2L58.2 9.6z\"/><circle cx=\"13.5\" cy=\"24\" r=\"4.8\"/><circle cx=\"49.5\" cy=\"24\" r=\"4.8\"/>",
"Pickups": "<path d=\"M7.5 24 H3 L3 18 L5 15.5 L13 14.5 L19 8.2 L35 8.2 L36 15 L62 15 L62 24 V24 H55.5 M44.5 24 H18.5 M7.5 24 A5.5 5.5 0 0 1 18.5 24 M44.5 24 A5.5 5.5 0 0 1 55.5 24\"/><path d=\"M20.4 9.8L17.2 14H26.5V9.8zM29 9.8V14H34.3L34 9.8z\"/><circle cx=\"13\" cy=\"24\" r=\"4.2\"/><circle cx=\"50\" cy=\"24\" r=\"4.2\"/>",
"Lujo": "<path d=\"M8 24 H3 L3 20.5 L5 18 L18 16.2 L27 11 L36 10.6 L52 16.4 L60 17.6 L61 20 L61 24 V24 H56 M45 24 H19 M8 24 A5.5 5.5 0 0 1 19 24 M45 24 A5.5 5.5 0 0 1 56 24\"/><path d=\"M28 12.3L21.6 16H46.5L37 12.3z\"/><circle cx=\"13.5\" cy=\"24\" r=\"4.2\"/><circle cx=\"50.5\" cy=\"24\" r=\"4.2\"/>",
"Sedanes": "<path d=\"M8 24 H3 L3 19 L5 16.5 L14 15 L21 9.5 L38 9.5 L46 15 L58 16.5 L61 18.5 L61 24 V24 H56 M45 24 H19 M8 24 A5.5 5.5 0 0 1 19 24 M45 24 A5.5 5.5 0 0 1 56 24\"/><path d=\"M22 11L17.6 15H29V11zM31.5 11V15H43.2L37.6 11z\"/><circle cx=\"13.5\" cy=\"24\" r=\"4.2\"/><circle cx=\"50.5\" cy=\"24\" r=\"4.2\"/>",
"Todo terreno": "<path d=\"M8.7 24 H5 L5 14.5 L16 13.5 L19.5 7.5 L53.5 7.5 L53.5 24 V24 H51.3 M38.7 24 H21.3 M8.7 24 A6.3 6.3 0 0 1 21.3 24 M38.7 24 A6.3 6.3 0 0 1 51.3 24\"/><path d=\"M21 9L18.4 13H31V9zM33.5 9V13H51V9z\"/><rect x=\"54\" y=\"12\" width=\"4.5\" height=\"9\" rx=\"1.6\"/><circle cx=\"15\" cy=\"24\" r=\"5\"/><circle cx=\"45\" cy=\"24\" r=\"5\"/>",
"Motos": "<circle cx=\"13\" cy=\"22\" r=\"7\"/><circle cx=\"51\" cy=\"22\" r=\"7\"/><path d=\"M13 22l9-9h12l5 9H24l-3-5M39 22l4-11 8 11M43 11h-5l-1-3h8M28 13l3-4h5\"/>",
"Trabajo": "<path d=\"M8 24 H3 L3 20 L5 17 L11 15.5 L17.5 7 L19.5 6 L59 6 L61 8 L61 24 V24 H56 M45 24 H19 M8 24 A5.5 5.5 0 0 1 19 24 M45 24 A5.5 5.5 0 0 1 56 24\"/><path d=\"M19.2 8L14.4 15H27V8zM33 8V21\"/><circle cx=\"13.5\" cy=\"24\" r=\"4.2\"/><circle cx=\"50.5\" cy=\"24\" r=\"4.2\"/>",
"Familiares": "<path d=\"M8 24 H3 L3 19 L5 16.8 L9 15.8 L21 7.2 L56 7.2 L60 8.8 L61 13 L61 24 V24 H56 M45 24 H19 M8 24 A5.5 5.5 0 0 1 19 24 M45 24 A5.5 5.5 0 0 1 56 24\"/><path d=\"M21.6 9L13.6 15.2H29V9zM31.5 9V15.2H43V9zM45.5 9V15.2H59.6L59 9zM31.5 17.5H43\"/><circle cx=\"13.5\" cy=\"24\" r=\"4.2\"/><circle cx=\"50.5\" cy=\"24\" r=\"4.2\"/>"
};
const TIPOS = ["SUVs", "Pickups", "Lujo", "Sedanes", "Todo terreno", "Motos", "Trabajo", "Familiares"];
function tipos(list) {
  document.getElementById("types").innerHTML = TIPOS.map((cat) => {
    const n = list.filter((a) => (a.categorias || []).includes(cat)).length;
    if (!n) return "";
    return `<a class="type" href="inventario.html?cat=${encodeURIComponent(cat)}"><svg viewBox="0 0 64 32" aria-hidden="true">${ICONOS[cat]}</svg><b>${cat}</b><small>${n} ${n === 1 ? "disponible" : "disponibles"}</small></a>`;
  }).join("");
}

autos().then((list) => {
  const hero = showroom(list);
  tipos(list);
  const shown = new Set(hero.map((a) => a.slug));
  const rest = list.filter((a) => !shown.has(a.slug) && !a.apartado).slice(0, 8);
  document.getElementById("cars").innerHTML = rest.map(card).join("");
  document.getElementById("all-btn").textContent = `Ver todo el inventario (${list.length})`;
}).catch(() => {
  document.getElementById("cars").innerHTML = `<p class="empty">No pudimos cargar el inventario. Recarga la página o escríbenos por WhatsApp al 33 3306 3319.</p>`;
});

/* Una opinión a la vez */
fetch(BASE + "data/opiniones.json", { cache: "no-cache" }).then((r) => r.json()).then((list) => {
  for (let k = list.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [list[k], list[j]] = [list[j], list[k]]; }
  const box = document.getElementById("voice"), t = document.getElementById("v-t"), n = document.getElementById("v-n");
  let k = 0;
  const draw = () => { box.classList.add("fading"); setTimeout(() => { t.textContent = list[k].texto; box.classList.toggle("long", list[k].texto.length > 110); n.textContent = `${list[k].nombre} · Google`; box.classList.remove("fading"); }, reduce ? 0 : 350); };
  draw();
  if (!reduce) setInterval(() => { if (!document.hidden) { k = (k + 1) % list.length; draw(); } }, 6000);
}).catch(() => {});

/* Mini simulador de crédito */
(function () {
  const $ = (id) => document.getElementById(id);
  if (!$("msim")) return;
  let CFG = { tasaAnual: 15, ivaSobreIntereses: true, engancheSugerido: 35, plazos: [12, 24, 36, 48, 60], plazoInicial: 48 }, LIST = [], PL = 48;
  const m2 = (n) => "$" + Math.round(n || 0).toLocaleString("es-MX");
  const men = (f, t, n) => { const r = (t / 100 / 12) * (CFG.ivaSobreIntereses ? 1.16 : 1); return r ? (f * r) / (1 - Math.pow(1 + r, -n)) : f / n; };
  function plazos() {
    $("m-plazos").innerHTML = CFG.plazos.map((n) => `<button type="button" data-n="${n}" aria-pressed="${n === PL}">${n}</button>`).join("");
    $("m-plazos").querySelectorAll("button").forEach((b) => (b.onclick = () => { PL = Number(b.dataset.n); plazos(); calc(); }));
  }
  function calc() {
    const a = LIST.find((x) => x.slug === $("m-auto").value); if (!a) return;
    const ep = Number($("m-eng").value), e = (a.precio * ep) / 100, f = a.precio - e;
    $("m-eng-t").textContent = `${m2(e)} (${ep}%)`;
    $("m-pl-t").textContent = PL + " meses";
    $("m-eng-n").textContent = ep < CFG.engancheSugerido ? `Sugerimos desde ${CFG.engancheSugerido}%; con buen historial puede ser menor.` : "";
    $("m-men").textContent = CFG.tasaAnual ? m2(men(f, CFG.tasaAnual, PL)) : "Te la cotizamos";
    $("m-go").href = `creditos.html?a=${encodeURIComponent(a.slug)}&e=${ep}&p=${PL}`;
  }
  $("m-eng").addEventListener("input", calc); $("m-auto").addEventListener("change", calc);
  Promise.all([fetch(BASE + "data/credito.json", { cache: "no-cache" }).then((r) => r.json()).catch(() => ({})), autos()]).then(([cfg, list]) => {
    CFG = { ...CFG, ...cfg }; LIST = list.filter((a) => !a.apartado && a.precio);
    PL = CFG.plazos.includes(CFG.plazoInicial) ? CFG.plazoInicial : CFG.plazos.at(-1);
    $("m-eng").value = CFG.engancheSugerido;
    $("m-auto").innerHTML = LIST.map((a) => `<option value="${esc(a.slug)}">${esc(a.title)} · ${mxn(a.precio)}</option>`).join("");
    plazos(); calc();
  }).catch(() => {});
})();
