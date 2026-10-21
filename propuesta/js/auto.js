import { autos, src, fotos, mxn, km, esc, wa, WA_ICON, card, credito, SITE } from "./comun.js?v=p1";

const root = document.getElementById("car");
const back = `<a class="back" href="inventario.html">← Ver todo el inventario</a>`;
const slug = new URLSearchParams(location.search).get("a") || "";

function notFound() {
  document.title = "Vehículo no disponible | Entre Amigos";
  root.innerHTML = `${back}<p class="empty">Este vehículo ya no está disponible o el enlace cambió. Revisa el inventario o escríbenos por WhatsApp al 33 3306 3319; con gusto te mostramos opciones similares.</p>`;
}

function render(a, list) {
  const p = fotos(a), name = a.title;
  document.title = `${name} | Entre Amigos`;
  document.querySelector('meta[name="description"]').setAttribute("content", `${name} en ${mxn(a.precio)}. Fotos, kilometraje y equipamiento. Entre Amigos, Guadalajara.`);
  const specs = [["Versión", a.version || a.modelo], ["Año", a.anio], ["Kilometraje", a.kilometraje ? km(a.kilometraje) : "Consultar"], ["Transmisión", a.transmision], ["Combustible", a.combustible], ["Categoría", a.categoria]].filter(([, v]) => v);
  const prev = a.precioEspecial && a.precioAnterior ? `<s>${mxn(a.precioAnterior)}</s>` : "";
  const ask = wa(a.apartado ? `Hola, vi que el ${name} está apartado. ¿Tienen algo similar o me avisan si se libera?` : `Hola, me interesa el ${name} (${mxn(a.precio)}) que vi en su página: ${SITE}/auto.html?a=${encodeURIComponent(a.slug)}`);
  const visit = wa(`Hola, me gustaría agendar una visita para ver el ${name}. ¿Qué día y hora tienen disponible?`);
  const stage = p.length ? `<div class="stage"><div class="blur" id="bl" style="background-image:url('${src(p[0], "t")}')"></div><img id="st" src="${src(p[0])}" alt="${esc(name)}, foto 1">
      ${p.length > 1 ? `<button class="nav-ph prev" type="button" aria-label="Foto anterior">‹</button><button class="nav-ph next" type="button" aria-label="Foto siguiente">›</button>` : ""}<span class="cnt" id="cnt">1 / ${p.length}</span></div>
    ${p.length > 1 ? `<div class="strip">${p.map((x, i) => `<button type="button" data-i="${i}" aria-current="${i === 0}" aria-label="Foto ${i + 1}"><img src="${src(x, "t")}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}`
    : `<div class="stage"><p class="empty" style="position:absolute;inset:0;display:grid;place-items:center">Fotos próximamente</p></div>`;
  const similares = list.filter((x) => x.slug !== a.slug && x.categoria === a.categoria).slice(0, 4);
  const sub = [a.version, a.anio, a.kilometraje ? km(a.kilometraje) : ""].filter(Boolean).map(esc).join(" · ");
  root.innerHTML = `${back}
  <div class="mtitle"><span class="eyebrow">${a.apartado ? "Apartado" : "Disponible"}${a.precioEspecial ? " · Precio especial" : ""}</span><h1>${esc(a.nombre || name)}</h1><p class="muted">${sub}</p><div class="pr"><b>${mxn(a.precio)}</b>${prev}</div></div>
  <div class="dtop">
    <div>${stage}</div>
    <div class="side">
      <div class="dtitle"><span class="eyebrow">${a.apartado ? "Apartado" : "Disponible"}${a.precioEspecial ? " · Precio especial" : ""}</span>
      <h1>${esc(a.nombre || name)}</h1>
      <p class="lead" style="margin-top:-6px">${sub}</p>
      ${a.apartado ? `<p class="res-note">Este vehículo ya está apartado. Escríbenos y te avisamos si se libera o te mostramos opciones similares.</p>` : ""}
      <div class="pr"><b>${mxn(a.precio)}</b>${prev}</div></div>
      <dl class="specs">${specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      <div class="btns" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <a class="btn primary wa" style="grid-column:1/-1" href="${ask}" target="_blank" rel="noopener">${WA_ICON}${a.apartado ? "Preguntar por uno similar" : "Me interesa"}</a>
        <a class="btn ghost" href="${credito(a)}">Cotizar financiamiento</a>
        <button class="btn quiet" type="button" id="share">Compartir</button>
        <a class="btn quiet" style="grid-column:1/-1" href="${visit}" target="_blank" rel="noopener">Agendar una visita</a>
      </div>
      <p class="toast2" id="share-t"></p>
      <p class="note">Tomamos tu auto a cuenta. Crédito sujeto a evaluación y aprobación.</p>
    </div>
  </div>
  <details class="ficha"><summary>Ficha completa y equipamiento</summary><div class="desc">${a.descripcion || `<p>Pronto publicaremos la ficha completa de este vehículo. Escríbenos por WhatsApp y te mandamos fotos, equipamiento y disponibilidad.</p>`}</div></details>
  ${similares.length ? `<section style="margin-top:56px"><div class="head"><span class="eyebrow">También te puede interesar</span><h2 style="font-size:clamp(28px,3.6vw,40px)">Similares</h2></div><div class="cars">${similares.map(card).join("")}</div></section>` : ""}`;

  const url = SITE + "/auto.html?a=" + encodeURIComponent(a.slug);
  document.getElementById("share").onclick = async () => {
    const t = document.getElementById("share-t");
    if (navigator.share) { try { await navigator.share({ title: name, text: `${name} en ${mxn(a.precio)} · Entre Amigos`, url }); } catch (e) {} }
    else { try { await navigator.clipboard.writeText(url); t.textContent = "Enlace copiado. Pégalo donde quieras compartirlo."; } catch (e) { t.textContent = url; } }
  };
  const ld = { "@context": "https://schema.org", "@type": "Car", name, brand: { "@type": "Brand", name: a.marca }, model: a.modelo, vehicleModelDate: String(a.anio), url, image: p.slice(0, 5).map((x) => new URL(src(x), location.href).href),
    offers: { "@type": "Offer", price: a.precio, priceCurrency: "MXN", availability: a.apartado ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock", seller: { "@type": "AutoDealer", name: "Entre Amigos" } } };
  if (a.kilometraje) ld.mileageFromOdometer = { "@type": "QuantitativeValue", value: a.kilometraje, unitCode: "KMT" };
  const sc = document.createElement("script"); sc.type = "application/ld+json"; sc.textContent = JSON.stringify(ld); document.head.appendChild(sc);
  if (p.length > 1) {
    let i = 0;
    const st = document.getElementById("st"), cnt = document.getElementById("cnt"), bl = document.getElementById("bl");
    const thumbs = [...root.querySelectorAll(".strip button")];
    const show = (n) => {
      i = (n + p.length) % p.length;
      st.src = src(p[i]); st.alt = `${name}, foto ${i + 1}`; bl.style.backgroundImage = `url('${src(p[i], "t")}')`;
      cnt.textContent = `${i + 1} / ${p.length}`;
      thumbs.forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
      thumbs[i].scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    root.querySelector(".prev").onclick = () => show(i - 1);
    root.querySelector(".next").onclick = () => show(i + 1);
    thumbs.forEach((b) => (b.onclick = () => show(Number(b.dataset.i))));
    let x0 = null; const sg = root.querySelector(".stage");
    sg.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    sg.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(i + (dx < 0 ? 1 : -1)); x0 = null; });
    document.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") show(i - 1); if (e.key === "ArrowRight") show(i + 1); });
    p.slice(1, 4).forEach((x) => { const im = new Image(); im.src = src(x); });
  }
}

if (!slug) notFound();
else autos().then((l) => { const a = l.find((x) => x.slug === slug); a ? render(a, l) : notFound(); }).catch(() => {
  root.innerHTML = `${back}<p class="empty">No pudimos cargar este vehículo. Recarga la página o escríbenos por WhatsApp al 33 3306 3319.</p>`;
});
