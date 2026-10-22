import { autos, card, src, fotos, mxn, km, esc, BASE, WA_ICON, ficha } from "./comun.js?v=p2";

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

/* Explora por tipo: una foto real por categoría */
const TIPOS = [["SUVs", "SUVs"], ["Pickups", "Pickups"], ["Lujo", "Lujo"], ["Sedanes", "Sedanes"], ["Todo terreno", "Todo terreno"], ["Motos", "Motos"], ["Trabajo", "Trabajo"], ["Familiares", "Familiares"]];
function tipos(list) {
  const used = new Set();
  document.getElementById("types").innerHTML = TIPOS.map(([cat, label]) => {
    const inCat = list.filter((a) => (a.categorias || []).includes(cat));
    if (!inCat.length) return "";
    const a = inCat.find((x) => local(x) && !used.has(x.slug)) || inCat.find(local) || inCat[0];
    used.add(a.slug);
    const img = cat === "Motos" ? BASE + "assets/img/motos.jpg" : src(fotos(a)[0], "t");
    return `<a class="type" href="inventario.html?cat=${encodeURIComponent(cat)}"><img src="${img}" alt="" loading="lazy" decoding="async"><span><b>${label}</b><small>${inCat.length}</small></span></a>`;
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
