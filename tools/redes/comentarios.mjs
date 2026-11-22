// Comentarios de los posts publicados (data/redes.json) en Instagram y Facebook.
// Uso: node tools/redes/comentarios.mjs leer [slug]     -> muestra comentarios y respuestas en el log (no guarda nada)
//      node tools/redes/comentarios.mjs responder       -> publica las respuestas pendientes de data/respuestas.json
// data/respuestas.json: [{ "red": "ig"|"fb", "id": "<id del comentario>", "texto": "...", "respondido": null }]
// Solo se agregan respuestas que el dueño aprobó.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const GRAPH = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v24.0'}`;
const leeJSON = (p, d) => existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d;

async function graph(ruta, params = {}, metodo = 'GET') {
  const url = new URL(GRAPH + ruta);
  const opt = { method: metodo };
  if (metodo === 'GET') Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  else opt.body = new URLSearchParams(params);
  const j = await (await fetch(url, opt)).json();
  if (j.error) throw new Error(`Meta respondió: ${j.error.message} (código ${j.error.code})`);
  return j;
}

async function cuentas(token) {
  const { data } = await graph('/me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: token });
  const pagina = data.find(p => p.id === process.env.META_PAGE_ID) || data.find(p => p.instagram_business_account);
  if (!pagina) throw new Error('El token no ve ninguna página con Instagram ligado.');
  return { pagina, ig: pagina.instagram_business_account };
}

const linea = s => String(s || '').replace(/\s+/g, ' ').trim();

async function leer(soloSlug) {
  const token = process.env.META_TOKEN;
  if (!token) throw new Error('Falta META_TOKEN.');
  const { pagina, ig } = await cuentas(token);
  const reg = leeJSON(resolve(RAIZ, 'data/redes.json'), {});
  for (const [slug, r] of Object.entries(reg)) {
    if (soloSlug && slug !== soloSlug) continue;
    console.log(`\n##### ${slug}`);
    if (r.instagram?.id) {
      try {
        const { data } = await graph(`/${r.instagram.id}/comments`, { fields: 'id,text,username,timestamp,replies{id,text,username,timestamp}', limit: 100, access_token: token });
        console.log(`--- Instagram (${data.length} comentarios) ${r.instagram.url}`);
        for (const c of data) {
          console.log(`[ig ${c.id}] @${c.username} (${c.timestamp}): ${linea(c.text)}`);
          for (const x of c.replies?.data || []) console.log(`    -> @${x.username}: ${linea(x.text)}`);
        }
      } catch (e) { console.log('--- Instagram: ERROR', e.message); }
    }
    if (r.facebook?.id) {
      try {
        const { data } = await graph(`/${r.facebook.id}/comments`, { fields: 'id,message,from,created_time,comments{id,message,from}', filter: 'toplevel', limit: 100, access_token: pagina.access_token });
        console.log(`--- Facebook (${data.length} comentarios) ${r.facebook.url}`);
        for (const c of data) {
          console.log(`[fb ${c.id}] ${c.from?.name || '(sin nombre)'} (${c.created_time}): ${linea(c.message)}`);
          for (const x of c.comments?.data || []) console.log(`    -> ${x.from?.name || '(sin nombre)'}: ${linea(x.message)}`);
        }
      } catch (e) { console.log('--- Facebook: ERROR', e.message); }
    }
  }
}

async function responder() {
  const token = process.env.META_TOKEN;
  if (!token) throw new Error('Falta META_TOKEN.');
  const p = resolve(RAIZ, 'data/respuestas.json');
  const lista = leeJSON(p, []);
  const pend = lista.filter(x => !x.respondido);
  if (!pend.length) { console.log('No hay respuestas pendientes.'); return; }
  const { pagina } = await cuentas(token);
  let fallas = 0;
  for (const x of pend) {
    try {
      const r = x.red === 'ig'
        ? await graph(`/${x.id}/replies`, { message: x.texto, access_token: token }, 'POST')
        : await graph(`/${x.id}/comments`, { message: x.texto, access_token: pagina.access_token }, 'POST');
      x.respondido = new Date().toISOString(); x.respuestaId = r.id;
      console.log(`Respondido ${x.red} ${x.id}`);
    } catch (e) { fallas++; console.log(`ERROR ${x.red} ${x.id}: ${e.message}`); }
  }
  writeFileSync(p, JSON.stringify(lista, null, 1) + '\n');
  if (fallas) process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [accion, slug] = process.argv.slice(2);
  const run = { leer: () => leer(slug), responder: () => responder() }[accion];
  if (!run) { console.error('Uso: leer [slug] | responder'); process.exit(1); }
  run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
}
