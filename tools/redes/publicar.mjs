// Publica un auto en Instagram (carrusel) y en la página de Facebook, sin Canva.
//
//   node tools/redes/publicar.mjs preparar <slug> [--sin-precio] [--fotos 01,03,05]
//       Genera en fotos/<slug>/redes/: portada.jpg, 01.jpg... (1080x1350) y texto.txt
//       (texto para Instagram/Facebook y para Marketplace). No publica nada.
//   node tools/redes/publicar.mjs publicar <slug> [--solo ig|fb] [--forzar]
//       Sube lo preparado. Necesita META_TOKEN (secreto de GitHub) y RAW_REF (commit
//       donde ya están las imágenes, para que Meta las descargue de GitHub).
//
// Lo publicado se anota en data/redes.json para no repetir un auto por error.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { html as portadaHTML } from './portada.mjs';
const require = createRequire(import.meta.url);

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPO = 'entreamigosmx/entre-amigos';
const GRAPH = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v24.0'}`;
const MAX_FOTOS = 9; // Instagram: 10 por carrusel = portada + 9 fotos
const b64 = p => `data:image/jpeg;base64,` + readFileSync(p).toString('base64');
let LOGO = '';
const mx = n => '$' + Math.round(n).toLocaleString('en-US');
const leeJSON = (p, d) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d;

function autoDe(slug) {
  const autos = leeJSON(resolve(RAIZ, 'data/autos.json'), []);
  const a = autos.find(x => x.slug === slug);
  if (!a) throw new Error(`No existe el auto "${slug}" en data/autos.json`);
  if (a.borrador) throw new Error(`"${slug}" sigue en borrador: primero publícalo en la página`);
  if (a.disponible === false) throw new Error(`"${slug}" está marcado como vendido`);
  return a;
}

const sinHTML = s => (s || '').replace(/<li>/g, '- ').replace(/<\/(p|h4|li)>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();

function textos(a, conPrecio) {
  const nombre = a.nombre || `${a.marca} ${a.modelo}`;
  const titulo = `${nombre} ${a.version || ''} ${a.anio}`.replace(/ · /g, ' ').replace(/\s+/g, ' ').trim();
  const datos = [a.kilometraje && `${Math.round(a.kilometraje).toLocaleString('en-US')} km`,
    a.transmision && a.transmision.split(' de ')[0], a.combustible].filter(Boolean).join(' | ');
  const precio = conPrecio && a.precio ? `Precio: ${mx(a.precio)}${a.precioAnterior ? ` (antes ${mx(a.precioAnterior)})` : ''}` : 'Precio por WhatsApp';
  const tags = ['EntreAmigos', 'AutosGuadalajara', 'Seminuevos', 'Guadalajara', a.marca, nombre]
    .map(t => '#' + t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]/g, ''));
  const ficha = `ventaentreamigos.com/auto.html?a=${a.slug}`;
  const redes = [
    `${titulo}`, '', datos, precio, '',
    'Crédito con enganche desde 35%. Recibimos tu auto a cuenta.',
    'Escríbenos por WhatsApp: 33 3306 3319',
    'Visítanos en Av. Aztecas 1021, Col. Monraz, Guadalajara.', '',
    'Fotos, video y ficha completa en el enlace del perfil.', '',
    'Más que clientes, amigos.', '', [...new Set(tags)].join(' '),
  ].join('\n');
  const facebook = redes.replace('en el enlace del perfil.', `aquí: https://${ficha}`);
  const marketplace = [
    `TÍTULO: ${titulo}`, `PRECIO: ${a.precio ? Math.round(a.precio) : ''}`,
    `AÑO: ${a.anio}   MARCA: ${a.marca}   MODELO: ${a.modelo}`,
    a.kilometraje ? `KILOMETRAJE: ${Math.round(a.kilometraje)}` : '', '',
    'DESCRIPCIÓN:', `${titulo}. ${datos}.`, sinHTML(a.descripcion), '',
    'Crédito con enganche desde 35%. Recibimos tu auto a cuenta.',
    'WhatsApp 33 3306 3319. Av. Aztecas 1021, Col. Monraz, Guadalajara.',
    `Ficha completa: https://${ficha}`, 'Entre Amigos. Más que clientes, amigos.',
  ].filter(l => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
  return { redes, facebook, marketplace };
}

// Foto a 1080x1350 (4:5). Vertical: recorte centrado. Horizontal: completa sobre fondo difuminado.
const fotoHTML = src => `<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@700&display=swap" rel="stylesheet"></head><body style="margin:0;width:1080px;height:1350px;overflow:hidden;background:#0a0b0a;position:relative">
<div style="position:absolute;inset:-40px;background:url(${src}) center/cover;filter:blur(30px) brightness(.55)"></div>
<img id="f" src="${src}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
<div style="position:absolute;right:36px;bottom:34px;display:flex;align-items:center;gap:12px;opacity:.6;filter:drop-shadow(0 2px 6px rgba(0,0,0,.7))">
<img src="${LOGO}" style="height:52px"><span style="font:700 30px 'Source Sans 3',sans-serif;color:#fff;letter-spacing:.01em">@entreamigosmx</span></div>
<script>const f=document.getElementById('f');f.onload=()=>{const r=f.naturalWidth/f.naturalHeight;if(r>.9)f.style.objectFit='contain'};</script>
</body></html>`;


// Historia individual del auto (1080x1920) para la destacada "Disponibles". Deja libre la franja
// central de abajo para que el dueño ponga el sticker de enlace a la ficha (la API no permite stickers).
function historiaHTML(a, foto, conPrecio) {
  const nombre = a.nombre || `${a.marca} ${a.modelo}`;
  const datos = [a.kilometraje && `${Math.round(a.kilometraje).toLocaleString('en-US')} km`, a.transmision && a.transmision.split(' de ')[0], a.combustible].filter(Boolean);
  const precio = conPrecio && a.precio ? `<div style="display:flex;align-items:baseline;gap:20px;margin-top:26px"><b style="font-family:'Barlow Condensed';font-weight:700;font-size:100px;color:#b6e21f;line-height:1">${mx(a.precio)}</b>${a.precioAnterior > a.precio ? `<s style="font-size:40px;color:#9ea597">${mx(a.precioAnterior)}</s>` : ''}</div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;1,800&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;background:#0a0b0a;color:#f3f4ef;font-family:'Source Sans 3',sans-serif;overflow:hidden;position:relative}</style></head><body>
<div style="position:absolute;inset:0 0 auto 0;height:1120px;background:url(${foto}) center/cover"></div>
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,11,10,.7) 0,rgba(10,11,10,0) 14%,rgba(10,11,10,0) 40%,#0a0b0a 58%)"></div>
<div style="position:absolute;top:150px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center">
<div style="display:flex;align-items:center;gap:14px"><img src="${LOGO}" style="height:56px"><b style="font-family:'Barlow Condensed';font-weight:800;font-style:italic;font-size:40px;text-transform:uppercase">Entre <i style="color:#b6e21f">Amigos</i></b></div>
<div style="background:#b6e21f;color:#0a0b0a;font-family:'Barlow Condensed';font-weight:700;font-size:32px;letter-spacing:.12em;padding:8px 22px;border-radius:6px">${a.apartado ? 'APARTADO' : 'DISPONIBLE'}</div></div>
<div style="position:absolute;left:64px;right:64px;top:860px">
<div style="font-family:'Barlow Condensed';font-weight:700;font-size:50px;color:#b6e21f;letter-spacing:.06em">${a.anio || ''}</div>
<h1 style="font-family:'Barlow Condensed';font-weight:700;font-size:120px;line-height:.9;text-transform:uppercase">${nombre}</h1>
<div style="font-size:44px;font-weight:600;color:#d7dbd1;margin-top:12px">${(a.version || '').replace(/ · /g, ' ')}</div>
<div style="display:flex;gap:14px;margin-top:26px;flex-wrap:wrap">${datos.map(d => `<span style="border:2px solid rgba(243,244,239,.35);border-radius:999px;padding:8px 24px;font-size:32px;font-weight:600">${d}</span>`).join('')}</div>
${precio}</div>
<div style="position:absolute;left:64px;right:64px;bottom:240px;text-align:center;font-size:34px;font-weight:600;color:#d7dbd1">Fotos, video y ficha completa en<br><b style="color:#f3f4ef;font-size:44px">ventaentreamigos.com</b></div>
</body></html>`;
}

async function preparar(slug, { conPrecio = true, fotos } = {}) {
  const a = autoDe(slug);
  const dir = resolve(RAIZ, `fotos/${slug}/redes`);
  mkdirSync(dir, { recursive: true });
  let lista = (a.galeria || [a.foto]).filter(p => !/^https?:/.test(p));
  if (fotos) lista = fotos.split(',').map(n => `fotos/${slug}/${n.trim()}.jpg`);
  lista = lista.filter(p => p !== a.foto).slice(0, MAX_FOTOS);
  LOGO = 'data:image/png;base64,' + readFileSync(resolve(RAIZ, 'assets/img/logo-mark.png')).toString('base64');
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(portadaHTML(a, b64(resolve(RAIZ, a.foto)), conPrecio), { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: resolve(dir, 'portada.jpg'), type: 'jpeg', quality: 90 });
  await pg.setViewportSize({ width: 1080, height: 1920 });
  await pg.setContent(historiaHTML(a, b64(resolve(RAIZ, a.foto)), conPrecio), { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: resolve(dir, 'historia-01.jpg'), type: 'jpeg', quality: 90 });
  await pg.setViewportSize({ width: 1080, height: 1350 });
  const salida = ['portada.jpg'];
  for (const [i, p] of lista.entries()) {
    const nombre = String(i + 1).padStart(2, '0') + '.jpg';
    await pg.setContent(fotoHTML(b64(resolve(RAIZ, p))), { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: resolve(dir, nombre), type: 'jpeg', quality: 88 });
    salida.push(nombre);
  }
  await b.close();
  const t = textos(a, conPrecio);
  writeFileSync(resolve(dir, 'texto.txt'), `=== INSTAGRAM ===\n${t.redes}\n\n=== FACEBOOK ===\n${t.facebook}\n\n=== MARKETPLACE ===\n${t.marketplace}\n`);
  writeFileSync(resolve(dir, 'publicacion.json'), JSON.stringify({ slug, imagenes: salida, instagram: t.redes, facebook: t.facebook, marketplace: t.marketplace }, null, 1));
  console.log(`Listo: ${salida.length} imágenes y texto en fotos/${slug}/redes/`);
}

async function graph(ruta, params = {}, metodo = 'POST') {
  const url = new URL(GRAPH + ruta);
  const opt = { method: metodo };
  if (metodo === 'GET') Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  else opt.body = new URLSearchParams(params);
  const r = await fetch(url, opt);
  const j = await r.json();
  if (j.error) throw new Error(`Meta respondió: ${j.error.message} (código ${j.error.code})`);
  return j;
}
const espera = ms => new Promise(r => setTimeout(r, ms));

async function cuentas(token) {
  const { data } = await graph('/me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: token }, 'GET');
  const pagina = data.find(p => p.id === process.env.META_PAGE_ID) || data.find(p => p.instagram_business_account);
  if (!pagina) throw new Error('El token no ve ninguna página con Instagram ligado. Revisa "Asignar activos" del usuario del sistema.');
  return { pagina, ig: pagina.instagram_business_account };
}

async function publicar(slug, { solo, forzar } = {}) {
  const token = process.env.META_TOKEN, ref = process.env.RAW_REF;
  if (!token) throw new Error('Falta META_TOKEN (secreto de GitHub).');
  if (!ref) throw new Error('Falta RAW_REF (commit con las imágenes).');
  const dir = resolve(RAIZ, `fotos/${slug}/redes`);
  const pub = leeJSON(resolve(dir, 'publicacion.json'), null);
  if (!pub) throw new Error(`Primero corre: preparar ${slug}`);
  const regPath = resolve(RAIZ, 'data/redes.json');
  const reg = leeJSON(regPath, {});
  const ya = reg[slug] || {};
  const url = n => `https://raw.githubusercontent.com/${REPO}/${ref}/fotos/${slug}/redes/${n}`;
  const { pagina, ig } = await cuentas(token);
  const hacerIG = solo !== 'fb' && (forzar || !ya.instagram);
  const hacerFB = solo !== 'ig' && (forzar || !ya.facebook);

  if (hacerIG) {
    const hijos = [];
    for (const n of pub.imagenes) hijos.push((await graph(`/${ig.id}/media`, { image_url: url(n), is_carousel_item: 'true', access_token: token })).id);
    const car = await graph(`/${ig.id}/media`, { media_type: 'CAROUSEL', children: hijos.join(','), caption: pub.instagram, access_token: token });
    for (let i = 0; i < 30; i++) {
      const s = await graph(`/${car.id}`, { fields: 'status_code', access_token: token }, 'GET');
      if (s.status_code === 'FINISHED') break;
      if (s.status_code === 'ERROR') throw new Error('Instagram no pudo procesar las imágenes.');
      await espera(5000);
    }
    const p = await graph(`/${ig.id}/media_publish`, { creation_id: car.id, access_token: token });
    const { permalink } = await graph(`/${p.id}`, { fields: 'permalink', access_token: token }, 'GET');
    ya.instagram = { id: p.id, url: permalink, fecha: new Date().toISOString() };
    console.log('Instagram:', permalink);
  } else if (solo !== 'fb') console.log('Instagram: ya estaba publicado', ya.instagram?.url);

  if (hacerFB) {
    const pt = pagina.access_token, fotos = [];
    for (const n of pub.imagenes) fotos.push((await graph(`/${pagina.id}/photos`, { url: url(n), published: 'false', access_token: pt })).id);
    const post = await graph(`/${pagina.id}/feed`, { message: pub.facebook, attached_media: JSON.stringify(fotos.map(id => ({ media_fbid: id }))), access_token: pt });
    ya.facebook = { id: post.id, url: `https://www.facebook.com/${post.id}`, fecha: new Date().toISOString() };
    console.log('Facebook:', ya.facebook.url);
  } else if (solo !== 'ig') console.log('Facebook: ya estaba publicado', ya.facebook?.url);

  reg[slug] = ya;
  writeFileSync(regPath, JSON.stringify(reg, null, 1) + '\n');
}

// Historias de Instagram con las imágenes historia-*.jpg de una carpeta del repo (p. ej. redes/disponibles).
async function historias(dirRel, prefijos = 'historia') {
  const token = process.env.META_TOKEN, ref = process.env.RAW_REF;
  if (!token || !ref) throw new Error('Faltan META_TOKEN o RAW_REF.');
  const imgs = readdirSync(resolve(RAIZ, dirRel)).filter(n => new RegExp(`^(${prefijos.split(',').join('|')})-\\d+\\.jpg$`).test(n)).sort();
  if (!imgs.length) throw new Error(`No hay historias en ${dirRel}`);
  const { ig } = await cuentas(token);
  for (const n of imgs) {
    const c = await graph(`/${ig.id}/media`, { image_url: `https://raw.githubusercontent.com/${REPO}/${ref}/${dirRel}/${n}`, media_type: 'STORIES', access_token: token });
    for (let i = 0; i < 30; i++) {
      const st = await graph(`/${c.id}`, { fields: 'status_code', access_token: token }, 'GET');
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR') throw new Error(`Instagram no pudo procesar ${n}`);
      await espera(4000);
    }
    const p = await graph(`/${ig.id}/media_publish`, { creation_id: c.id, access_token: token });
    console.log('Historia publicada:', n, p.id);
  }
}

// Reel: carpeta del repo con video.mp4, portada.jpg y texto.txt (p. ej. redes/reels/reel-1-enganche).
// Antes de publicar revisa los posts recientes para no duplicar (mismo inicio del texto).
async function reel(dirRel, { solo } = {}) {
  const token = process.env.META_TOKEN, ref = process.env.RAW_REF;
  if (!token || !ref) throw new Error('Faltan META_TOKEN o RAW_REF.');
  const nombre = dirRel.split('/').filter(Boolean).pop();
  const caption = readFileSync(resolve(RAIZ, dirRel, 'texto.txt'), 'utf8').trim();
  const firma = caption.slice(0, 60);
  const url = n => `https://raw.githubusercontent.com/${REPO}/${ref}/${dirRel}/${n}`;
  const regPath = resolve(RAIZ, 'data/redes.json');
  const reg = leeJSON(regPath, {});
  const ya = reg[nombre] || {};
  const { pagina, ig } = await cuentas(token);
  const guarda = () => { reg[nombre] = ya; writeFileSync(regPath, JSON.stringify(reg, null, 1) + '\n'); };

  if (solo !== 'fb' && !ya.instagram) {
    const { data = [] } = await graph(`/${ig.id}/media`, { fields: 'id,caption,permalink,timestamp,media_product_type', limit: '25', access_token: token }, 'GET');
    const dup = data.find(m => (m.caption || '').trim().startsWith(firma));
    if (dup) { ya.instagram = { id: dup.id, url: dup.permalink, fecha: dup.timestamp }; console.log('Instagram: ya estaba publicado', dup.permalink); }
    else {
      const c = await graph(`/${ig.id}/media`, { media_type: 'REELS', video_url: url('video.mp4'), cover_url: url('portada.jpg'), caption, share_to_feed: 'true', access_token: token });
      let ok = false;
      for (let i = 0; i < 60; i++) {
        const st = await graph(`/${c.id}`, { fields: 'status_code,status', access_token: token }, 'GET');
        if (st.status_code === 'FINISHED') { ok = true; break; }
        if (st.status_code === 'ERROR') throw new Error(`Instagram no pudo procesar el video: ${st.status || ''}`);
        await espera(10000);
      }
      if (!ok) throw new Error('Instagram tardó demasiado en procesar el video.');
      const p = await graph(`/${ig.id}/media_publish`, { creation_id: c.id, access_token: token });
      const { permalink } = await graph(`/${p.id}`, { fields: 'permalink', access_token: token }, 'GET');
      ya.instagram = { id: p.id, url: permalink, fecha: new Date().toISOString() };
      console.log('Instagram:', permalink);
    }
    guarda();
  } else if (solo !== 'fb') console.log('Instagram: ya estaba publicado', ya.instagram.url);

  if (solo !== 'ig' && !ya.facebook) {
    const pt = pagina.access_token;
    const { data = [] } = await graph(`/${pagina.id}/videos`, { fields: 'id,description,permalink_url,created_time', limit: '25', access_token: pt }, 'GET');
    const dup = data.find(v => (v.description || '').trim().startsWith(firma));
    if (dup) { ya.facebook = { id: dup.id, url: `https://www.facebook.com${dup.permalink_url || '/' + dup.id}`, fecha: dup.created_time }; console.log('Facebook: ya estaba publicado', ya.facebook.url); }
    else {
      const v = await graph(`/${pagina.id}/videos`, { file_url: url('video.mp4'), description: caption, access_token: pt });
      ya.facebook = { id: v.id, url: `https://www.facebook.com/${pagina.id}/videos/${v.id}`, fecha: new Date().toISOString() };
      console.log('Facebook:', ya.facebook.url);
    }
    guarda();
  } else if (solo !== 'ig') console.log('Facebook: ya estaba publicado', ya.facebook.url);
}

async function verificar() {
  const token = process.env.META_TOKEN;
  if (!token) throw new Error('Falta META_TOKEN (secreto de GitHub).');
  const { pagina, ig } = await cuentas(token);
  console.log(`Conexión correcta. Página: ${pagina.name}. Instagram: @${ig.username}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [accion, slug, ...r] = process.argv.slice(2);
  const opt = k => { const i = r.indexOf(k); return i >= 0 ? r[i + 1] : undefined; };
  const run = { preparar: () => preparar(slug, { conPrecio: !r.includes('--sin-precio'), fotos: opt('--fotos') }),
    publicar: () => publicar(slug, { solo: opt('--solo'), forzar: r.includes('--forzar') }),
    historias: () => historias(slug, r[0]),
    reel: () => reel(slug, { solo: opt('--solo') }),
    verificar: () => verificar() }[accion];
  if (!run) { console.error('Uso: preparar|publicar|verificar <slug>'); process.exit(1); }
  run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
}
