import { getCar, img, photos, mxn, km, esc, waLink } from "./wix.js";

const root = document.getElementById("car");
const back = `<a class="back" href="./#inventario">← Volver al inventario</a>`;
const slug = new URLSearchParams(location.search).get("a") || "";

function notFound() {
  document.title = "Auto no disponible | Entre Amigos";
  root.innerHTML = `${back}<div class="state">Este auto ya no está disponible o el enlace cambió. Revisa el inventario o escríbenos por WhatsApp al 33 3306 3319.</div>`;
}

function render(c) {
  const p = photos(c);
  document.title = `${c.title} | Entre Amigos`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", `${c.title} en ${mxn(c.precio)}. Fotos, kilometraje y equipamiento en Entre Amigos, Guadalajara.`);

  const stage = p.length
    ? `<div class="stage"><img id="st" src="${img(p[0].src, 1600, 1200, "fit")}" alt="${esc(p[0].t)}">
        ${p.length > 1 ? `<button class="nav-ph prev" type="button" aria-label="Foto anterior">‹</button><button class="nav-ph next" type="button" aria-label="Foto siguiente">›</button>` : ""}
        <span class="count" id="cnt">1 / ${p.length}</span></div>
       ${p.length > 1 ? `<div class="strip">${p.map((x, i) => `<button type="button" data-i="${i}" aria-current="${i === 0}" aria-label="${esc(x.t)}"><img src="${img(x.src, 160, 120)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}`
    : `<div class="ph" style="border-radius:12px"><div class="mono"><b>${esc(c.marca)}</b><span>Fotos próximamente</span></div></div>`;

  const prev = c.precioEspecial && c.precioAnterior ? `<s>${mxn(c.precioAnterior)}</s>` : "";
  const ask = waLink(c.apartado ? `Hola, vi que el ${c.title} está apartado. ¿Tienen algo similar o me avisan si se libera?` : `Hola, me interesa el ${c.title} que vi en su página.`);
  root.innerHTML = `${back}
    <div class="dtop">
      <div>${stage}</div>
      <div class="side">
        <span class="eyebrow">${esc(c.categoria || "")}${c.precioEspecial ? " · Precio especial" : ""}</span>
        ${c.apartado ? `<div class="res-note"><b>Apartado</b><span>Este auto ya está apartado. Escríbenos y te avisamos si se libera o te mostramos opciones similares.</span></div>` : ""}
        <h1>${esc(c.title)}</h1>
        <div class="pr"><b>${mxn(c.precio)}</b>${prev}</div>
        <dl class="specs">
          <div><dt>Año</dt><dd>${esc(c.anio)}</dd></div>
          <div><dt>Kilometraje</dt><dd>${c.kilometraje ? km(c.kilometraje) : "Consultar"}</dd></div>
          <div><dt>Marca</dt><dd>${esc(c.marca)}</dd></div>
        </dl>
        <a class="btn primary" href="${ask}" target="_blank" rel="noopener">${c.apartado ? "Preguntar por uno similar" : "Preguntar por este auto"}</a>
        <a class="btn ghost" href="./?auto=${encodeURIComponent(c.slug)}#financiamiento">Cotizar crédito</a>
        <p class="hint">Tomamos tu auto a cuenta. Escríbenos al 33 3306 3319.</p>
      </div>
    </div>
    <div class="desc">${c.descripcion || `<p>Pronto publicaremos la ficha completa de este auto. Escríbenos por WhatsApp y te mandamos fotos, equipamiento y disponibilidad.</p>`}</div>`;

  if (p.length > 1) {
    let i = 0;
    const st = document.getElementById("st");
    const cnt = document.getElementById("cnt");
    const thumbs = [...root.querySelectorAll(".strip button")];
    const show = (n) => {
      i = (n + p.length) % p.length;
      st.src = img(p[i].src, 1600, 1200, "fit");
      st.alt = p[i].t;
      cnt.textContent = `${i + 1} / ${p.length}`;
      thumbs.forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
      thumbs[i].scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    root.querySelector(".prev").onclick = () => show(i - 1);
    root.querySelector(".next").onclick = () => show(i + 1);
    thumbs.forEach((b) => (b.onclick = () => show(Number(b.dataset.i))));
    let x0 = null;
    const stageEl = root.querySelector(".stage");
    stageEl.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stageEl.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    p.slice(1, 4).forEach((x) => { const im = new Image(); im.src = img(x.src, 1600, 1200, "fit"); });
  }
}

if (!slug) notFound();
else getCar(slug).then((c) => (c && c.disponible !== false ? render(c) : notFound())).catch(() => {
  root.innerHTML = `${back}<div class="state">No pudimos cargar este auto. Recarga la página o escríbenos por WhatsApp al 33 3306 3319.</div>`;
});