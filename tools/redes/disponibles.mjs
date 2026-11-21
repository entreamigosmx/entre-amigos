// Carrusel "Disponibles" (feed, 1080x1350) e historias para la destacada (1080x1920).
// Uso: node tools/redes/disponibles.mjs [--sin slug1,slug2] [--salida dir]
//   --sin: autos que no van en el carrusel (p. ej. los que tienen su propia publicación).
//   Las historias llevan todos los disponibles.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const b64 = p => `data:image/${p.endsWith('.png') ? 'png' : 'jpeg'};base64,` + readFileSync(resolve(RAIZ, p)).toString('base64');
const mini = p => { const i = p.lastIndexOf('/'); const t = p.slice(0, i) + '/t' + p.slice(i); try { readFileSync(resolve(RAIZ, t)); return t; } catch { return p; } };
const mx = n => '$' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOGO = b64('assets/img/logo-mark.png');

const CSS = `*{box-sizing:border-box;margin:0}
body{background:#0a0b0a;color:#f3f4ef;font-family:'Source Sans 3',sans-serif;overflow:hidden;position:relative}
.d{font-family:'Barlow Condensed'}
.marca{display:flex;align-items:center;gap:14px}.marca img{height:48px}
.marca b{font-family:'Barlow Condensed';font-weight:800;font-style:italic;font-size:34px;text-transform:uppercase;letter-spacing:.02em}.marca b i{color:#b6e21f}
.top{display:flex;justify-content:space-between;align-items:center}
.tit{font-family:'Barlow Condensed';font-weight:700;font-size:40px;letter-spacing:.14em;color:#b6e21f}
.grid{display:grid;gap:24px}
.car{background:#151714;border-radius:18px;overflow:hidden;display:flex;flex-direction:column}
.car .f{background:center/cover no-repeat;flex:1}
.car .t{padding:16px 20px 18px}
.car h3{font-family:'Barlow Condensed';font-weight:700;font-size:38px;line-height:1;text-transform:uppercase}
.car .v{font-size:23px;color:#9ea597;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.car .p{display:flex;align-items:baseline;gap:12px;margin-top:8px}
.car .p b{font-family:'Barlow Condensed';font-weight:700;font-size:40px;color:#b6e21f}
.car .p s{font-size:22px;color:#7d8579}
.hist .car h3{font-size:32px}.hist .car .p b{font-size:34px}.hist .car .t{padding:12px 18px 14px}
.tag{position:absolute;margin:12px;background:#b6e21f;color:#0a0b0a;font-family:'Barlow Condensed';font-weight:700;font-size:20px;letter-spacing:.1em;padding:3px 10px;border-radius:5px}
.pie{display:flex;justify-content:space-between;font-size:26px;font-weight:600;color:#d7dbd1;border-top:2px solid #b6e21f;padding-top:18px}`;
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;1,800&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">`;
const page = (w, h, body) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS}body{width:${w}px;height:${h}px}</style></head><body>${body}</body></html>`;

function card(a) {
  const nombre = a.nombre || `${a.marca} ${a.modelo}`;
  const ver = [a.version, a.anio].filter(Boolean).join(' · ');
  const precio = a.precio ? `<b>${mx(a.precio)}</b>${a.precioAnterior > a.precio ? `<s>${mx(a.precioAnterior)}</s>` : ''}` : '<b>Consultar</b>';
  return `<div class="car"><div class="f" style="background-image:url(${b64(mini(a.foto))});position:relative">${a.apartado ? '<span class="tag">APARTADO</span>' : ''}</div>
<div class="t"><h3>${esc(nombre)}</h3><div class="v">${esc(ver)}</div><div class="p">${precio}</div></div></div>`;
}

function portada(lista, total) {
  const fotos = lista.slice(0, 6).map(a => `<div style="background:url(${b64(mini(a.foto))}) center/cover"></div>`).join('');
  return page(1080, 1350, `
<div style="position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:6px;filter:brightness(.45)">${fotos}</div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,11,10,.85) 0,rgba(10,11,10,.2) 30%,rgba(10,11,10,.3) 55%,#0a0b0a 88%)"></div>
<div style="position:absolute;top:52px;left:60px;right:60px" class="top"><div class="marca"><img src="${LOGO}"><b>Entre <i>Amigos</i></b></div></div>
<div style="position:absolute;left:60px;right:60px;bottom:60px">
<div class="tit">INVENTARIO</div>
<h1 class="d" style="font-weight:700;font-size:200px;line-height:.85;text-transform:uppercase">Dispo&shy;nibles</h1>
<div style="font-size:42px;font-weight:600;margin-top:22px">${total} autos listos para entregarse</div>
<div style="font-size:30px;color:#d7dbd1;margin-top:8px">Crédito con enganche desde 35%. Recibimos tu auto a cuenta.</div>
<div class="pie" style="margin-top:36px"><span><b style="color:#f3f4ef">Desliza para verlos</b></span><span>ventaentreamigos.com</span></div>
</div>`);
}

function slide(grupo, n, de) {
  return page(1080, 1350, `<div style="position:absolute;inset:48px 52px;display:flex;flex-direction:column;gap:26px">
<div class="top"><div class="marca"><img src="${LOGO}"><b>Entre <i>Amigos</i></b></div><div class="tit">DISPONIBLES ${n}/${de}</div></div>
<div class="grid" style="flex:1;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr">${grupo.map(card).join('')}</div>
<div class="pie"><span>WhatsApp 33 3306 3319</span><span>ventaentreamigos.com</span></div></div>`);
}

function historia(grupo, n, de, total) {
  return page(1080, 1920, `<div class="hist" style="position:absolute;top:150px;bottom:200px;left:52px;right:52px;display:flex;flex-direction:column;gap:26px">
<div class="top"><div class="marca"><img src="${LOGO}"><b>Entre <i>Amigos</i></b></div><div class="tit">${n}/${de}</div></div>
<div><div class="tit">${total} AUTOS</div><h1 class="d" style="font-weight:700;font-size:110px;line-height:.9;text-transform:uppercase">Disponibles</h1></div>
<div class="grid" style="flex:1;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr)">${grupo.map(card).join('')}</div>
<div class="pie"><span>WhatsApp 33 3306 3319</span><span>ventaentreamigos.com</span></div></div>`);
}

const destacada = () => page(1080, 1920, `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
<div style="width:720px;height:720px;border-radius:50%;background:#151714;border:14px solid #b6e21f;display:flex;flex-direction:column;align-items:center;justify-content:center">
<img src="${LOGO}" style="height:170px"><div class="d" style="font-weight:700;font-size:100px;letter-spacing:.06em;margin-top:28px;color:#f3f4ef">AUTOS</div></div></div>`);

const trozos = (l, n) => Array.from({ length: Math.ceil(l.length / n) }, (_, i) => l.slice(i * n, i * n + n));

export async function generar({ sin = [], salida } = {}) {
  const autos = JSON.parse(readFileSync(resolve(RAIZ, 'data/autos.json'), 'utf8'))
    .filter(a => a.disponible !== false && !a.borrador && a.foto && !/^https?:/.test(a.foto))
    .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
  const feed = autos.filter(a => !sin.includes(a.slug));
  salida = resolve(salida || resolve(RAIZ, 'redes/disponibles'));
  mkdirSync(salida, { recursive: true });
  const b = await chromium.launch();
  const shot = async (html, w, h, nombre) => {
    const pg = await b.newPage({ viewport: { width: w, height: h } });
    await pg.setContent(html, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: resolve(salida, nombre), type: 'jpeg', quality: 88 }); await pg.close();
    return nombre;
  };
  const carrusel = [await shot(portada(feed, feed.length), 1080, 1350, 'carrusel-00.jpg')];
  const g = trozos(feed, 4);
  for (const [i, x] of g.entries()) carrusel.push(await shot(slide(x, i + 1, g.length), 1080, 1350, `carrusel-${String(i + 1).padStart(2, '0')}.jpg`));
  const h = trozos(autos, 8), historias = [];
  for (const [i, x] of h.entries()) historias.push(await shot(historia(x, i + 1, h.length, autos.length), 1080, 1920, `historia-${String(i + 1).padStart(2, '0')}.jpg`));
  await shot(destacada(), 1080, 1920, 'destacada-portada.jpg');
  await b.close();
  const texto = [`Autos disponibles en Entre Amigos. Desliza para ver ${feed.length} opciones con precio.`, '',
    'Crédito con enganche desde 35%. Recibimos tu auto a cuenta.', 'Escríbenos por WhatsApp: 33 3306 3319',
    'Visítanos en Av. Aztecas 1021, Col. Monraz, Guadalajara.', '', 'Inventario completo en el enlace del perfil.', '',
    'Más que clientes, amigos.', '', '#EntreAmigos #AutosGuadalajara #Seminuevos #Guadalajara'].join('\n');
  writeFileSync(resolve(salida, 'texto.txt'), texto + '\n');
  console.log(`Carrusel: ${carrusel.length} imágenes (${feed.length} autos). Historias: ${historias.length} (${autos.length} autos).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : undefined; };
  await generar({ sin: (opt('--sin') || '').split(',').filter(Boolean), salida: opt('--salida') });
}
