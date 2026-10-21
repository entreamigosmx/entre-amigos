// Funciones compartidas. BASE apunta a la raíz del sitio (la versión de prueba vive en /nuevo/).
export const BASE = "../";
export const WA = "523333063319";
export const SITE = "https://ventaentreamigos.com";

let cache = null;
export async function autos() {
  if (cache) return cache;
  const r = await fetch(BASE + "data/autos.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("inventario");
  cache = (await r.json()).filter((a) => a.disponible).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  return cache;
}
export function src(path, size) {
  if (!path) return "";
  if (/^https?:/.test(path)) return path;
  const i = path.lastIndexOf("/");
  return BASE + (size === "t" ? path.slice(0, i) + "/t" + path.slice(i) : path);
}
export const fotos = (a) => (a.galeria && a.galeria.length ? a.galeria : a.foto ? [a.foto] : []);
export const mxn = (n) => "$" + Number(n).toLocaleString("es-MX");
export const km = (n) => Number(n).toLocaleString("es-MX") + " km";
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const wa = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
export const ficha = (a) => `auto.html?a=${encodeURIComponent(a.slug)}`;
export const WA_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>`;

export const credito = (a) => `creditos.html${a ? "?a=" + encodeURIComponent(a.slug) : ""}`;
export function card(a) {
  const f = fotos(a)[0];
  const tag = a.apartado ? `<span class="tag res">Apartado</span>` : a.precioEspecial ? `<span class="tag">Precio especial</span>` : "";
  const img = f
    ? `<img src="${src(f, "t")}" srcset="${src(f, "t")} 640w, ${src(f)} 1200w" sizes="(min-width: 1100px) 280px, (min-width: 600px) 45vw, 92vw" loading="lazy" decoding="async" alt="${esc(a.title)}">`
    : `<span class="none">Fotos próximamente</span>`;
  const meta = [a.anio, a.kilometraje ? km(a.kilometraje) : "Km a consultar", a.transmision].filter(Boolean);
  const prev = a.precioEspecial && a.precioAnterior ? `<s>${mxn(a.precioAnterior)}</s>` : "";
  return `<article class="car${a.apartado ? " is-res" : ""}">
    <a class="cl" href="${ficha(a)}"><div class="ph">${img}${tag}</div>
    <div class="cb"><h3>${esc(a.nombre || a.title)}</h3>${a.version ? `<p class="ver">${esc(a.version)}</p>` : ""}
      <div class="m">${meta.map((x) => `<span>${esc(x)}</span>`).join("")}</div>
      <div class="pr"><b>${mxn(a.precio)}</b>${prev}</div></div></a>
    <div class="ca"><a class="btn sm quiet" href="${ficha(a)}">Ver detalles</a>${a.apartado ? `<span class="st res">Apartado</span>` : `<a class="btn sm ghost" href="${credito(a)}">Cotizar crédito</a>`}</div>
  </article>`;
}
