// Inventario: se lee de data/autos.json (lo actualiza Claude en el repositorio).
// Fotos: las antiguas siguen en el CDN de Wix; las nuevas viven en /fotos/<auto>/.
export const WA = "523333063319";
export const WA_TEXT = "33 3306 3319";

let all = null;
async function load() {
  if (all) return all;
  const r = await fetch("data/autos.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("inventario " + r.status);
  all = (await r.json()).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  return all;
}

export async function getCars() {
  return (await load()).filter((c) => c.disponible);
}
export async function getCar(slug) {
  return (await load()).find((c) => c.slug === slug) || null;
}

function wixFile(v) {
  const m = String(v || "").match(/static\.wixstatic\.com\/media\/([^/#?]+)/);
  return m ? m[1] : "";
}
// Fotos locales: fotos/<auto>/01.jpg (grande, 1600px) y fotos/<auto>/t/01.jpg (miniatura, 640px).
function thumbOf(src) {
  const i = src.lastIndexOf("/");
  return src.slice(0, i) + "/t" + src.slice(i);
}
export function img(v, w, h, mode = "fill") {
  const f = wixFile(v);
  if (f) {
    const opts = mode === "fit" ? `w_${w},h_${h},q_85,enc_auto` : `w_${w},h_${h},al_c,q_85,enc_auto`;
    return `https://static.wixstatic.com/media/${f}/v1/${mode}/${opts}/${f}`;
  }
  const s = String(v || "");
  if (!s) return "";
  return w <= 640 ? thumbOf(s) : s;
}
export function photos(car) {
  const g = (car.galeria || []).filter(Boolean).map((src) => ({ src, t: car.title }));
  if (!g.length && car.foto) g.push({ src: car.foto, t: car.title });
  return g;
}

export const mxn = (n) => "$" + Number(n).toLocaleString("es-MX");
export const km = (n) => Number(n).toLocaleString("es-MX") + " km";
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
