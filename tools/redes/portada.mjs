// Genera la portada de un auto para Instagram/Facebook (1080x1350, 4:5), sin Canva.
// Uso: node tools/redes/portada.mjs <slug> [--foto NN] [--sin-precio] [--salida ruta.jpg]
// Toma datos de data/autos.json y la foto ya publicada (placas difuminadas).
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const b64 = p => `data:image/${extname(p).slice(1).replace('jpg','jpeg')};base64,` + readFileSync(p).toString('base64');
const mx = n => '$' + Math.round(n).toLocaleString('en-US');

export function html(auto, foto, conPrecio = true) {
  const nombre = auto.nombre || `${auto.marca} ${auto.modelo}`;
  const version = auto.version || '';
  const datos = [];
  if (auto.kilometraje) datos.push(`${Math.round(auto.kilometraje).toLocaleString('en-US')} km`);
  if (auto.transmision) datos.push(auto.transmision.split(' de ')[0]);
  if (auto.combustible) datos.push(auto.combustible);
  const chips = datos.map(d => `<span>${d}</span>`).join('');
  let precio = '';
  if (conPrecio && auto.precio) precio = `<div class="precio">${auto.precioAnterior ? `<s>${mx(auto.precioAnterior)}</s>` : ''}<b>${mx(auto.precio)}</b></div>`;
  const etiqueta = auto.apartado ? 'APARTADO' : 'DISPONIBLE';
  const logo = b64(resolve(RAIZ, 'assets/img/logo-mark.png'));
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;1,800&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;background:#0a0b0a;color:#f3f4ef;font-family:'Source Sans 3',sans-serif;overflow:hidden;position:relative}
.foto{position:absolute;inset:0;background:url(${foto}) center/cover no-repeat}
.sombra{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,11,10,.75) 0,rgba(10,11,10,0) 18%,rgba(10,11,10,0) 45%,rgba(10,11,10,.85) 70%,#0a0b0a 100%)}
.top{position:absolute;top:48px;left:56px;right:56px;display:flex;align-items:center;justify-content:space-between}
.marca{display:flex;align-items:center;gap:16px}
.marca img{height:56px}
.marca b{font-family:'Barlow Condensed';font-weight:800;font-style:italic;font-size:38px;text-transform:uppercase;letter-spacing:.02em}
.marca b i{color:#b6e21f}
.tag{background:#b6e21f;color:#0a0b0a;font-family:'Barlow Condensed';font-weight:700;font-size:30px;letter-spacing:.12em;padding:8px 22px;border-radius:6px}
.abajo{position:absolute;left:56px;right:56px;bottom:52px}
.anio{font-family:'Barlow Condensed';font-weight:700;font-size:44px;color:#b6e21f;letter-spacing:.06em}
h1{font-family:'Barlow Condensed';font-weight:700;font-size:118px;line-height:.92;text-transform:uppercase;letter-spacing:.005em}
.ver{font-size:38px;font-weight:600;color:#d7dbd1;margin-top:10px}
.chips{display:flex;gap:14px;margin-top:26px;flex-wrap:wrap}
.chips span{border:2px solid rgba(243,244,239,.35);border-radius:999px;padding:8px 22px;font-size:28px;font-weight:600}
.precio{margin-top:28px;display:flex;align-items:baseline;gap:22px}
.precio b{font-family:'Barlow Condensed';font-weight:700;font-size:84px;color:#b6e21f;line-height:1}
.precio s{font-size:36px;color:#9ea597}
.pie{margin-top:30px;padding-top:22px;border-top:2px solid #b6e21f;display:flex;justify-content:space-between;font-size:28px;font-weight:600;color:#d7dbd1}
.pie b{color:#f3f4ef}
</style></head><body>
<div class="foto"></div><div class="sombra"></div>
<div class="top"><div class="marca"><img src="${logo}"><b>Entre <i>Amigos</i></b></div><div class="tag">${etiqueta}</div></div>
<div class="abajo">
<div class="anio">${auto.anio||''}</div>
<h1>${nombre}</h1>
<div class="ver">${version}</div>
<div class="chips">${chips}</div>
${precio}
<div class="pie"><span><b>Trato entre amigos</b></span><span>ventaentreamigos.com</span></div>
</div></body></html>`;
}

export async function generar(slug, { foto, conPrecio = true, salida } = {}) {
  const autos = JSON.parse(readFileSync(resolve(RAIZ, 'data/autos.json'), 'utf8'));
  const auto = autos.find(a => a.slug === slug);
  if (!auto) throw new Error('No existe el auto ' + slug);
  const ruta = resolve(RAIZ, foto ? `fotos/${slug}/${foto}.jpg` : auto.foto);
  salida = resolve(salida || resolve(RAIZ, `fotos/${slug}/redes/portada.jpg`));
  mkdirSync(dirname(salida), { recursive: true });
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(html(auto, b64(ruta), conPrecio), { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: salida, type: 'jpeg', quality: 90 });
  await b.close();
  return salida;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  console.log(await generar(a[0], { foto: opt('--foto'), conPrecio: !a.includes('--sin-precio'), salida: opt('--salida') }));
}
