// Portadas de destacadas (todas iguales: fondo negro, ícono verde) e historias de Servicios, Ubicación y Reseñas.
// Uso: node tools/redes/destacadas.mjs [--salida dir]
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const b64 = p => `data:image/${p.endsWith('.png') ? 'png' : 'jpeg'};base64,` + readFileSync(resolve(RAIZ, p)).toString('base64');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOGO = b64('assets/img/logo-mark.png');
const L = '#b6e21f';

// Íconos de línea (viewBox 24x24)
const ICONOS = {
  clientes: '<path d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16.5 11a3 3 0 1 0 0-6M18 14.2c2.3.6 4 2.9 4 5.8"/>',
  disponibles: '<path d="M3 16v-3.5L5.2 7.6A2 2 0 0 1 7 6.5h10a2 2 0 0 1 1.8 1.1L21 12.5V16M3 12.5h18M3 16h18v2.5H18V16M6 16v2.5H3V16"/><circle cx="7" cy="14.2" r=".6"/><circle cx="17" cy="14.2" r=".6"/>',
  detallados: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z"/>',
  servicios: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.3-.4-.4-2.3z"/>',
  flash: '<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  ubicacion: '<path d="M12 21.5s-7-6.2-7-11.8a7 7 0 0 1 14 0c0 5.6-7 11.8-7 11.8z"/><circle cx="12" cy="9.7" r="2.6"/>',
  credito: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  resenas: '<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
};
const svg = (k, size, w = 1.5) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${L}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${ICONOS[k]}</svg>`;

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;1,800&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">`;
const CSS = `*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;background:#0a0b0a;color:#f3f4ef;font-family:'Source Sans 3',sans-serif;overflow:hidden;position:relative}
.d{font-family:'Barlow Condensed';font-weight:700;text-transform:uppercase}
.marca{display:flex;align-items:center;gap:14px}.marca img{height:52px}
.marca b{font-family:'Barlow Condensed';font-weight:800;font-style:italic;font-size:36px;text-transform:uppercase;letter-spacing:.02em}.marca b i{color:${L}}
.k{font-family:'Barlow Condensed';font-weight:700;font-size:40px;letter-spacing:.14em;color:${L}}
.zona{position:absolute;top:170px;bottom:230px;left:72px;right:72px;display:flex;flex-direction:column}
.pie{border-top:2px solid ${L};padding-top:22px;display:flex;justify-content:space-between;font-size:30px;font-weight:600;color:#d7dbd1}
ul{list-style:none;padding:0}li{font-size:44px;line-height:1.3;padding:20px 0 20px 56px;position:relative;border-bottom:1px solid #272b25}
li:before{content:'';position:absolute;left:0;top:38px;width:26px;height:4px;background:${L}}`;
const page = body => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${CSS}</style></head><body>${body}</body></html>`;
const pie = `<div class="pie"><span>WhatsApp 33 3306 3319</span><span>ventaentreamigos.com</span></div>`;
const cab = (n, de) => `<div style="display:flex;justify-content:space-between;align-items:center"><div class="marca"><img src="${LOGO}"><b>Entre <i>Amigos</i></b></div>${de > 1 ? `<div class="k">${n}/${de}</div>` : ''}</div>`;

const portada = k => page(`<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${svg(k, 560, 1.5)}</div>`);

function servicio({ icono, k, titulo, texto, puntos, cierre, n, de, foto }) {
  return page(`${foto ? `<div style="position:absolute;inset:0 0 50% 0;background:url(${b64(foto)}) center/cover;filter:brightness(.55)"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,11,10,.6) 0,rgba(10,11,10,.1) 20%,#0a0b0a 50%)"></div>` : ''}
<div class="zona">${cab(n, de)}
<div style="margin-top:${foto ? 520 : 120}px">${svg(icono, 110, 1.6)}<div class="k" style="margin-top:20px">${k}</div>
<h1 class="d" style="font-size:118px;line-height:.92;margin-top:6px">${titulo}</h1>
<p style="font-size:42px;line-height:1.35;color:#d7dbd1;margin-top:26px">${texto}</p></div>
${puntos ? `<ul style="margin-top:30px">${puntos.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
<div style="flex:1"></div>${cierre ? `<p style="font-size:40px;font-weight:700;margin-bottom:26px">${cierre}</p>` : ''}${pie}</div>`);
}

const ubicacion = () => page(`<div style="position:absolute;inset:0 0 45% 0;background:url(${b64('assets/img/fachada-2.jpg')}) center/cover"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,11,10,.55) 0,rgba(10,11,10,0) 18%,rgba(10,11,10,0) 38%,#0a0b0a 56%)"></div>
<div class="zona">${cab(1, 1)}<div style="flex:1"></div>
${svg('ubicacion', 100, 1.6)}<div class="k" style="margin-top:18px">VISÍTANOS</div>
<h1 class="d" style="font-size:120px;line-height:.9;margin-top:6px">Av. Aztecas 1021</h1>
<p style="font-size:46px;color:#d7dbd1;margin-top:14px">Col. Monraz, 44670, Guadalajara, Jalisco</p>
<div style="margin:44px 0;display:grid;grid-template-columns:auto 1fr;gap:14px 30px;font-size:42px">
<b style="color:${L}">Lunes a viernes</b><span>9:00 a 18:00</span><b style="color:${L}">Sábado</b><span>9:00 a 14:00</span></div>
<p style="font-size:38px;color:#d7dbd1;margin-bottom:26px">Búscanos en Google Maps como "Entre Amigos".</p>${pie}</div>`);

function resenas(lista, n, de) {
  return page(`<div class="zona">${cab(n, de)}
<div style="margin-top:90px">${svg('resenas', 100, 1.6)}<div class="k" style="margin-top:18px">RESEÑAS DE GOOGLE</div>
<h1 class="d" style="font-size:112px;line-height:.92;margin-top:6px">Lo que dicen nuestros amigos</h1></div>
<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:36px">
${lista.map(o => `<div style="background:#151714;border-left:6px solid ${L};border-radius:16px;padding:40px 44px">
<p style="font-size:44px;line-height:1.35">"${esc(o.texto)}"</p><p style="font-size:34px;font-weight:700;color:${L};margin-top:20px">${esc(o.nombre)}</p></div>`).join('')}</div>
<p style="font-size:38px;font-weight:700;margin:26px 0">Más que clientes, amigos.</p>${pie}</div>`);
}

export async function generar(salida) {
  salida = resolve(salida || resolve(RAIZ, 'redes/destacadas'));
  mkdirSync(resolve(salida, 'portadas'), { recursive: true });
  const b = await chromium.launch();
  const shot = async (html, nombre) => {
    const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await pg.setContent(html, { waitUntil: 'networkidle' }); await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: resolve(salida, nombre), type: 'jpeg', quality: 88 }); await pg.close();
  };
  const nombres = { clientes: 'clientes', disponibles: 'disponibles', detallados: 'detallados', servicios: 'servicios', flash: 'flash-sale', ubicacion: 'ubicacion', resenas: 'resenas' };
  for (const [k, n] of Object.entries(nombres)) await shot(portada(k), `portadas/${n}.jpg`);

  const S = [
    { icono: 'servicios', k: 'QUÉ HACEMOS', titulo: 'Servicios', texto: 'Todo lo que necesitas para comprar o vender tu auto, en un solo lugar y con trato entre amigos.',
      puntos: ['Venta de autos seleccionados', 'Consignación', 'Te compramos tu auto', 'Toma a cuenta', 'Crédito', 'Préstamos con garantía', 'Detallado, gestoría y seguros'] },
    { icono: 'disponibles', k: 'CONSIGNACIÓN', titulo: 'Vendemos tu auto por ti', foto: 'assets/img/showroom.jpg',
      texto: 'Tu auto se exhibe en nuestro piso de venta y en nuestras redes. Nosotros atendemos a los interesados, negociamos y hacemos los trámites en un lugar seguro.',
      cierre: 'Tú no tienes que recibir desconocidos en tu casa.' },
    { icono: 'clientes', k: 'TE COMPRAMOS TU AUTO', titulo: 'Recibe una propuesta', foto: 'assets/img/fachada.jpg',
      texto: 'Manda los datos y 10 fotos de tu auto desde tu celular y te contestamos por WhatsApp. Compra directa o tómalo a cuenta de uno de nuestros autos.',
      cierre: 'ventaentreamigos.com/vender' },
    { icono: 'credito', k: 'CRÉDITO', titulo: 'Estrena con crédito', texto: 'Te ayudamos a financiar tu próximo auto.',
      puntos: ['Enganche desde 35%', 'Plazos de 12 a 60 meses', 'Simula tu mensualidad en nuestra página'], cierre: 'Con buen historial, el enganche puede ser menor.' },
    { icono: 'credito', k: 'PRÉSTAMOS', titulo: 'Préstamos con garantía', texto: 'Si necesitas liquidez, te prestamos con garantía, con pagos mensuales y plazos a tu medida.',
      puntos: ['Con tu auto: lo sigues usando', 'Con relojes, oro o monedas', 'Corrida de pagos antes de firmar'], cierre: 'Solicítalo en ventaentreamigos.com/prestamos' },
  ];
  for (const [i, s] of S.entries()) await shot(servicio({ ...s, n: i + 1, de: S.length }), `servicios-${String(i + 1).padStart(2, '0')}.jpg`);
  await shot(ubicacion(), 'ubicacion-01.jpg');
  const ops = JSON.parse(readFileSync(resolve(RAIZ, 'data/opiniones.json'), 'utf8')).slice(0, 8);
  const pares = Array.from({ length: Math.ceil(ops.length / 2) }, (_, i) => ops.slice(i * 2, i * 2 + 2));
  for (const [i, p] of pares.entries()) await shot(resenas(p, i + 1, pares.length), `resenas-${String(i + 1).padStart(2, '0')}.jpg`);
  await b.close();
  console.log('Listo en', salida);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const i = a.indexOf('--salida');
  await generar(i >= 0 ? a[i + 1] : undefined);
}
