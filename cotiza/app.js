import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signOut, sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, onSnapshot, arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { num, mxn, mxn2, GARANTIAS, GN, corridaMensual, corridaSemanal, factorGarantia, fechaPago, fcorta, avance } from "./calc.js?v=2";

const app = initializeApp({
  apiKey: "AIzaSyDrp5lK7COul0RaI4nvN1vOx5sQ5tSJIW8",
  authDomain: "entre-amigos-financiera.firebaseapp.com",
  projectId: "entre-amigos-financiera",
  storageBucket: "entre-amigos-financiera.firebasestorage.app",
  messagingSenderId: "244817036834",
  appId: "1:244817036834:web:7dd1a54f4825a318a2ac7b",
});
const auth = getAuth(app);
auth.languageCode = "es";
const db = getFirestore(app);

// Administradores: también están en las reglas de Firestore (las reglas son las que mandan).
const ADMINS = ["jesusreynosoalfaro@gmail.com"];
const WA = "523333063319";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const tel10 = (t) => String(t || "").replace(/\D/g, "").slice(-10);
const waTo = (t, msg) => "https://wa.me/" + (tel10(t).length === 10 ? "52" + tel10(t) : "") + "?text=" + encodeURIComponent(msg);
function show(id) { ["v-load", "v-login", "v-pend", "v-app"].forEach((v) => ($(v).hidden = v !== id)); }

/* ---------------- Acceso ---------------- */
let signup = false;
function setSignup(v) {
  signup = v;
  $("l-title").textContent = v ? "Crea tu cuenta" : "Entra a tu cuenta";
  $("l-sub").textContent = v ? "Te toma un minuto. Usa Google o tu correo." : "Usa tu cuenta de Google o tu correo.";
  $("l-nom-l").hidden = !v;
  $("l-tipo-w").hidden = !v;
  $("b-login").textContent = v ? "Crear cuenta" : "Entrar";
  $("l-q").textContent = v ? "¿Ya tienes cuenta?" : "¿Primera vez?";
  $("b-swap").textContent = v ? "Entra aquí" : "Crea tu cuenta";
  $("l-pass").autocomplete = v ? "new-password" : "current-password";
  $("l-err").hidden = true;
}
$("b-swap").onclick = () => setSignup(!signup);
let TIPO = "cliente";
function setTipo(t) { TIPO = t; document.querySelectorAll("#l-tipo button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tipo === t))); }
document.querySelectorAll("#l-tipo button").forEach((b) => (b.onclick = () => setTipo(b.dataset.tipo)));
const QS = new URLSearchParams(location.search);
if (QS.has("nueva")) setSignup(true);
if (QS.get("tipo") === "colaborador") setTipo("colaborador");
if (QS.has("c")) { setSignup(true); $("l-sub").textContent = "Para ver y confirmar tu cotización, crea tu cuenta. Si ya tienes una, toca \"Entra aquí\" abajo."; $("l-tipo-w").hidden = true; }

const ERR = {
  "auth/invalid-email": "Revisa el correo, parece que tiene un error.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
  "auth/email-already-in-use": "Ese correo ya tiene cuenta. Toca \"Entra aquí\".",
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "No hay cuenta con ese correo. Toca \"Crea tu cuenta\".",
  "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.",
  "auth/network-request-failed": "Sin conexión. Revisa tu internet.",
};
const showErr = (e) => { $("l-err").hidden = false; $("l-err").className = "err"; $("l-err").textContent = ERR[e.code] || "No se pudo completar. Intenta de nuevo."; };

$("f-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const mail = $("l-mail").value.trim(), pass = $("l-pass").value, nom = $("l-nom").value.trim();
  if (signup && !nom) { showErr({ code: "x" }); $("l-err").textContent = "Escribe tu nombre."; return; }
  $("b-login").disabled = true;
  try {
    if (signup) {
      PEND_NAME = nom;
      const c = await createUserWithEmailAndPassword(auth, mail, pass);
      await updateProfile(c.user, { displayName: nom });
      sendEmailVerification(c.user).catch(() => {});
    } else await signInWithEmailAndPassword(auth, mail, pass);
  } catch (err) { showErr(err); }
  $("b-login").disabled = false;
});
$("b-google").onclick = async () => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  try { await signInWithPopup(auth, p); }
  catch (err) {
    if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") signInWithRedirect(auth, p);
    else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") showErr(err);
  }
};
getRedirectResult(auth).catch(() => {});
$("b-forgot").onclick = async () => {
  const mail = $("l-mail").value.trim();
  if (!mail) { showErr({ code: "x" }); $("l-err").textContent = "Escribe tu correo arriba y vuelve a tocar \"Olvidé mi contraseña\"."; return; }
  try { await sendPasswordResetEmail(auth, mail); $("l-err").hidden = false; $("l-err").className = "ok"; $("l-err").textContent = "Te mandamos un correo para cambiar tu contraseña."; }
  catch (err) { showErr(err); }
};
$("b-out").onclick = () => signOut(auth);

/* ---------------- Sesión ---------------- */
let ME = null, USER = null, unsubs = [], PEND_NAME = "";
const isAdmin = () => !!ME && ADMINS.includes((ME.email || "").toLowerCase());
const isTeam = () => isAdmin() || USER?.rol === "equipo";

async function ensureUser(u, nombre) {
  const ref = doc(db, "usuarios", u.uid);
  const s = await getDoc(ref);
  if (s.exists()) return s.data();
  const d = { nombre: nombre || PEND_NAME || u.displayName || (u.email || "").split("@")[0], email: (u.email || "").toLowerCase(), rol: ADMINS.includes((u.email || "").toLowerCase()) ? "admin" : "cliente", solicita: TIPO === "colaborador" ? "equipo" : "", telefono: "", creado: new Date().toISOString() };
  await setDoc(ref, d);
  return d;
}

onAuthStateChanged(auth, async (u) => {
  unsubs.forEach((f) => f()); unsubs = [];
  ME = u; USER = null;
  $("b-out").hidden = !u;
  if (!u) { $("who").textContent = "Préstamos y cotizaciones"; show("v-login"); return; }
  show("v-load");
  try { USER = await ensureUser(u); } catch (e) { USER = { rol: "cliente", nombre: u.displayName || "" }; }
  $("who").textContent = (USER.nombre || u.email) + " · " + (isAdmin() ? "Administrador" : USER.rol === "equipo" ? "Colaborador" : "Cliente");
  const espera = !isAdmin() && USER.rol === "cliente" && USER.solicita === "equipo";
  if (espera) {
    $("p-h").textContent = "Solicitud de colaborador";
    $("p-txt").innerHTML = `Gracias, <b>${esc(USER.nombre || "")}</b>. Tu cuenta de colaborador está en revisión. En cuanto Entre Amigos la apruebe, esta pantalla cambia sola y podrás cotizar.`;
    $("p-wa").textContent = "Avisar por WhatsApp";
    $("p-wa").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Hola, ya creé mi cuenta de colaborador en Entre Amigos con el correo " + (u.email || "") + ". ¿Me la apruebas?");
    show("v-pend");
    unsubs.push(onSnapshot(doc(db, "usuarios", u.uid), (s) => { const d = s.data(); if (d && (d.rol !== "cliente" || d.solicita !== "equipo")) location.reload(); }, () => {}));
    return;
  }
  if (!isAdmin() && !["equipo", "cliente"].includes(USER.rol)) {
    $("p-nom").textContent = USER.nombre || "";
    $("p-wa").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Hola, mi cuenta de Entre Amigos (" + (u.email || "") + ") aparece inactiva. ¿Me ayudan?");
    show("v-pend");
    return;
  }
  // Si el administrador cambia el tipo de acceso, la pantalla se actualiza sola.
  unsubs.push(onSnapshot(doc(db, "usuarios", u.uid), (s) => { const r = s.data()?.rol; if (r && USER && r !== USER.rol && !isAdmin()) location.reload(); }, () => {}));
  startApp();
});

/* ---------------- App ---------------- */
let TAB = "";
const TABS = () => isAdmin()
  ? [["cotizar", "Cotizar"], ["cotizaciones", "Cotizaciones"], ["prestamos", "Préstamos"], ["personas", "Personas"], ["tasas", "Tasas"]]
  : isTeam() ? [["cotizar", "Cotizar"], ["cotizaciones", "Mis cotizaciones"]]
  : [["mis", "Mis préstamos"]];

let CFG = {}, COTS = [], PRES = [], USERS = [], PSRC = {};
function startApp() {
  show("v-app");
  if (isTeam()) unsubs.push(onSnapshot(doc(db, "config", "tasas"), (s) => { CFG = s.data() || {}; if (TAB === "cotizar" && !touched) applyCfg(); if (TAB === "tasas") draw(); }, () => {}));
  const qc = isAdmin() ? collection(db, "cotizaciones") : isTeam() ? query(collection(db, "cotizaciones"), where("por", "==", ME.uid)) : null;
  if (qc) unsubs.push(onSnapshot(qc, (s) => { COTS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); if (TAB === "cotizaciones") draw(); }, () => {}));
  const setPres = () => { const m = {}; Object.values(PSRC).forEach((l) => l.forEach((x) => (m[x.id] = x))); PRES = Object.values(m).sort((a, b) => (a.creado < b.creado ? 1 : -1)); if (TAB === "prestamos" || TAB === "mis") draw(); };
  const listenP = (key, q) => unsubs.push(onSnapshot(q, (s) => { PSRC[key] = s.docs.map((d) => ({ id: d.id, ...d.data() })); setPres(); }, () => {}));
  if (isAdmin()) listenP("all", collection(db, "prestamos"));
  else if (USER.rol === "cliente") {
    listenP("uid", query(collection(db, "prestamos"), where("clienteUid", "==", ME.uid)));
    unsubs.push(onSnapshot(query(collection(db, "cotizaciones"), where("aceptadoPor", "==", ME.uid)), (s) => { MYCOTS = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (TAB === "mis") cotBox(); }, () => {}));
    if (ME.emailVerified && ME.email) listenP("mail", query(collection(db, "prestamos"), where("clienteEmail", "==", ME.email.toLowerCase())));
  }
  if (isAdmin()) unsubs.push(onSnapshot(collection(db, "usuarios"), (s) => { USERS = s.docs.map((d) => ({ uid: d.id, ...d.data() })); if (TAB === "personas" || TAB === "prestamos") draw(); drawTabs(); }, () => {}));
  go(TABS()[0][0]);
}
const isNew = (u) => u.rol !== "admin" && u.creado && Date.now() - new Date(u.creado).getTime() < 3 * 864e5 && !u.visto;
function drawTabs() {
  const pend = USERS.filter((u) => isNew(u) || (u.rol === "cliente" && u.solicita === "equipo")).length;
  $("tabs").innerHTML = TABS().map(([k, t]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${k === TAB}">${t}${k === "personas" && pend ? " (" + pend + ")" : ""}</button>`).join("");
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-t]"); if (b) go(b.dataset.t); });
function go(t) { TAB = t; drawTabs(); draw(); window.scrollTo(0, 0); }
function draw() { const f = { cotizar: vCotizar, cotizaciones: vCotizaciones, prestamos: vPrestamos, personas: vPersonas, tasas: vTasas, mis: vMis }[TAB]; f && f(); }
const nameOf = (uid) => (uid === ME.uid ? "Yo" : USERS.find((u) => u.uid === uid)?.nombre || "Colaborador");

/* ---------- Cotizar ---------- */
let MODE = "garantia", touched = false, LAST = null, lastKey = "", curKey = "", CUR_REF = null;
function vCotizar() {
  touched = false;
  if (MODE === "auto") return vCotAuto();
  $("panel").innerHTML = `
  <div class="card">
    <div class="seg"><button type="button" data-m="garantia" aria-pressed="${MODE === "garantia"}">Con garantía</button><button type="button" data-m="semanal" aria-pressed="${MODE === "semanal"}">Semanal con aval</button><button type="button" data-m="auto" aria-pressed="false">Auto del inventario</button></div>
    <form id="fq" novalidate>
      <div class="row"><label for="q-nom">Cliente<input id="q-nom" autocomplete="off" placeholder="Nombre del cliente"></label>
      <label for="q-tel">WhatsApp del cliente<input id="q-tel" inputmode="tel" autocomplete="off" placeholder="33 1234 5678"></label></div>
      <div class="row"><label for="q-monto">Monto a prestar (MXN)<input id="q-monto" inputmode="numeric" value="${MODE === "garantia" ? "100,000" : "10,000"}"></label>
      ${MODE === "garantia"
        ? `<label for="q-tasa">Interés mensual (%)<input id="q-tasa" inputmode="decimal" value="5"></label></div>
      <div class="row"><label for="q-gar">Garantía<select id="q-gar">${Object.entries(GARANTIAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
      <label for="q-desc">Descripción<input id="q-desc" autocomplete="off" placeholder="Ej. Jetta 2019"></label></div>
      <div class="row"><label for="q-plazo">Plazo (meses)<select id="q-plazo">${[3, 6, 9, 12, 18, 24, 36].map((n) => `<option${n === 12 ? " selected" : ""}>${n}</option>`).join("")}</select></label>
      <label for="q-val">Valor de la garantía (opcional)<input id="q-val" inputmode="numeric" placeholder="Ej. 250,000"></label></div>
      <p class="cov" id="q-cov"></p>`
        : `<label for="q-sem">Número de semanas<input id="q-sem" inputmode="numeric" value="14"></label></div>
      <div class="row"><label for="q-fac">Pago semanal por cada $1,000<input id="q-fac" inputmode="decimal" value="100"></label>
      <label for="q-ini">Primer pago<input id="q-ini" type="date" value="${plusDays(7)}"></label></div>
      <p class="note">Requisitos: pagaré, aval, INE vigente y comprobante de domicilio.</p>`}
    </form>
  </div>
  <div class="card" aria-live="polite">
    <div class="big"><span id="r-lbl">Pago</span><b id="r-pago">$0</b></div>
    <div class="facts"><div><span>Prestado</span><b id="r-m">$0</b></div><div><span>Intereses</span><b id="r-i">$0</b></div><div><span>Total a pagar</span><b id="r-t">$0</b></div></div>
    <p class="err" id="r-err" hidden></p>
    <div class="actions"><a class="btn primary" id="b-wa" href="#" target="_blank" rel="noopener">Enviar por WhatsApp</a><button class="btn" type="button" id="b-copy">Copiar</button></div>
    <p class="toast" id="r-toast"></p>
    <details><summary>Ver corrida completa</summary><div class="tbl"><table id="r-tbl"></table></div></details>
    <details><summary>Mensaje que se envía</summary><pre id="r-msg"></pre></details>
    <p class="note">Las cotizaciones que envías o copias se guardan en tu historial.</p>
  </div>`;
  $("panel").querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { MODE = b.dataset.m; vCotizar(); }));
  ["q-monto", "q-val"].forEach((id) => $(id)?.addEventListener("input", (e) => { const d = e.target.value.replace(/\D/g, ""); e.target.value = d ? Number(d).toLocaleString("es-MX") : ""; }));
  $("fq").addEventListener("input", (e) => { if (["q-tasa", "q-fac", "q-sem"].includes(e.target.id)) touched = true; calc(); });
  $("fq").addEventListener("change", (e) => { if (e.target.id === "q-gar" || e.target.id === "q-plazo") { if (e.target.id === "q-gar") { $("q-desc").placeholder = { auto: "Ej. Jetta 2019", reloj: "Ej. Rolex Submariner", oro: "Ej. Esclava 14k, 30 g", monedas: "Ej. 5 centenarios", otro: "Describe la prenda", ff: "Garantía acordada (opcional)" }[e.target.value]; touched = false; applyCfg(); } } calc(); });
  $("fq").addEventListener("submit", (e) => e.preventDefault());
  $("b-wa").addEventListener("click", (e) => { if (!LAST) { e.preventDefault(); return; } saveCot(); });
  $("b-copy").onclick = () => {
    if (!LAST) return; saveCot();
    const ok = () => ($("r-toast").textContent = "Cotización copiada. Pégala en el chat del cliente.");
    navigator.clipboard?.writeText(LAST.msg).then(ok, () => { $("r-msg").closest("details").open = true; $("r-toast").textContent = "Selecciona el mensaje y cópialo."; });
  };
  applyCfg(); calc();
}
function applyCfg() {
  if (!$("fq")) return;
  if (MODE === "garantia") {
    const g = $("q-gar").value, t = CFG.tasas?.[g];
    if (t) $("q-tasa").value = t;
    if (CFG.plazo && [...$("q-plazo").options].some((o) => o.value == CFG.plazo)) $("q-plazo").value = CFG.plazo;
  } else { if (CFG.fac) $("q-fac").value = CFG.fac; if (CFG.sem) $("q-sem").value = CFG.sem; }
  calc();
}
function calc() {
  const M = num($("q-monto").value), nom = $("q-nom").value.trim(), tel = $("q-tel").value;
  let r;
  if (MODE === "garantia") {
    const t = num($("q-tasa").value), n = parseInt($("q-plazo").value, 10), g = $("q-gar").value, desc = $("q-desc").value.trim(), val = num($("q-val").value);
    if (!M || !n) return err("Escribe el monto.");
    const c = corridaMensual(M, t, n), fx = factorGarantia(n), req = M * fx, cov = $("q-cov");
    const ff = g === "ff";
    $("q-val").closest("label").hidden = ff;
    if (ff) { cov.className = "cov"; cov.textContent = "Friends & family: tasa preferencial y garantía acordada. No aplica la regla 2 a 1 / 3 a 1."; }
    else if (val) { const ok = val >= req; cov.className = "cov " + (ok ? "ok" : "bad"); cov.textContent = ok ? `Garantía suficiente (${fx} a 1). Con este valor puedes prestar hasta ${mxn(Math.floor(val / fx))}.` : `Garantía insuficiente: para ${mxn(M)} a ${n} meses debe valer al menos ${mxn(req)} (${fx} a 1). Con este valor puedes prestar hasta ${mxn(Math.floor(val / fx))}.`; }
    else { cov.className = "cov"; cov.textContent = `Para ${mxn(M)} a ${n} meses, la garantía debe valer al menos ${mxn(req)} (${fx} a 1).`; }
    const cierre = ff ? (desc ? "Garantía acordada: " + desc + "." : "La garantía es la que acordamos.") : g === "auto" ? "Puedes seguir usando tu auto; solo dejas la documentación endosada y una llave." : "Tu garantía queda bajo resguardo y se te devuelve al liquidar el préstamo.";
    const msg = `Hola${nom ? " " + nom : ""}, te comparto la cotización de tu préstamo${ff ? "" : " con garantía de " + (desc || GN[g])}:\n\nMonto: ${mxn(M)}\nPlazo: ${n} meses\nInterés: ${t}% mensual sobre saldo\nPago mensual: ${mxn2(c.pago)}\nTotal a pagar: ${mxn2(c.total)}${ff ? "" : "\nGarantía requerida: con valor de al menos " + mxn(req)}\n\n${cierre} Si adelantas pagos, pagas menos interés.\n\nEntre Amigos`;
    r = { tipo: "garantia", garantia: g, desc, valor: ff ? null : val || null, monto: M, tasa: t, plazo: n, pago: c.pago, total: c.total, intereses: c.intereses, msg, lbl: "Pago mensual",
      tbl: "<tr><th>Mes</th><th>Pago</th><th>Interés</th><th>Capital</th><th>Saldo</th></tr>" + c.filas.map((f) => `<tr><td>${f.n}</td><td>${mxn2(f.pago)}</td><td>${mxn2(f.interes)}</td><td>${mxn2(f.capital)}</td><td>${mxn2(f.saldo)}</td></tr>`).join("") };
  } else {
    const n = parseInt($("q-sem").value, 10) || 0, f = num($("q-fac").value), ini = $("q-ini").value;
    if (!M || !n || !f) return err("Escribe el monto, las semanas y el pago por cada $1,000.");
    const c = corridaSemanal(M, n, f);
    const d1 = fechaPago(ini, 1, "semanal"), dn = fechaPago(ini, n, "semanal");
    const msg = `Hola${nom ? " " + nom : ""}, te comparto la cotización de tu préstamo:\n\nMonto: ${mxn(M)}\n${n} pagos semanales de ${mxn2(c.pago)}\nTotal a pagar: ${mxn2(c.total)}${d1 ? "\nPrimer pago: " + fcorta(d1) + "\nÚltimo pago: " + fcorta(dn) : ""}\n\nRequisitos: pagaré, aval, INE vigente y comprobante de domicilio.\n\nEntre Amigos`;
    r = { tipo: "semanal", monto: M, tasa: f, plazo: n, inicio: ini, pago: c.pago, total: c.total, intereses: c.intereses, msg, lbl: "Pago semanal",
      tbl: "<tr><th>Semana</th><th>Fecha</th><th>Pago</th><th>Resta</th></tr>" + c.filas.map((x) => `<tr><td>${x.n}</td><td>${fcorta(fechaPago(ini, x.n, "semanal"))}</td><td>${mxn2(x.pago)}</td><td>${mxn2(x.saldo)}</td></tr>`).join("") };
  }
  r.cliente = nom; r.telefono = tel10(tel);
  { const { msg, tbl, lbl, ...dd } = r; const k = JSON.stringify(dd); if (k !== curKey) { curKey = k; CUR_REF = doc(collection(db, "cotizaciones")); } }
  r.msg += "\n\nRevisa y confirma tu cotización aquí:\n" + location.origin + location.pathname + "?c=" + CUR_REF.id;
  LAST = r; $("r-err").hidden = true;
  $("r-lbl").textContent = r.lbl; $("r-pago").textContent = mxn2(r.pago); $("r-m").textContent = mxn(r.monto); $("r-i").textContent = mxn(r.intereses); $("r-t").textContent = mxn(r.total);
  $("r-tbl").innerHTML = r.tbl; $("r-msg").textContent = r.msg; $("b-wa").href = waTo(tel, r.msg);
  function err(m) { LAST = null; $("r-err").hidden = false; $("r-err").textContent = m; }
}
function saveCot() {
  if (!LAST) return;
  const { msg, tbl, lbl, ...d } = LAST;
  if (CUR_REF.id === lastKey) return; lastKey = CUR_REF.id;
  setDoc(CUR_REF, { ...d, por: ME.uid, fecha: new Date().toISOString(), estado: "cotizado" }).catch(() => (lastKey = ""));
}

/* ---------- Cotizaciones ---------- */
const EST = { cotizado: "Cotizado", aceptado: "Aceptado", descartado: "Descartado" };
let FILT = "";
function detCot(r) {
  if (r.tipo === "auto") return `Auto · ${esc(r.autoTitulo || "")} · enganche ${mxn(r.enganche)} · ${r.plazo} meses al ${r.tasa}% anual${r.banco ? " (" + esc(r.banco) + ")" : ""} · ${mxn2(r.pago)}/mes`;
  return r.tipo === "semanal" ? `Semanal · ${mxn(r.monto)} · ${r.plazo} pagos de ${mxn2(r.pago)}`
    : `Garantía ${GARANTIAS[r.garantia] || ""}${r.desc ? " (" + esc(r.desc) + ")" : ""} · ${mxn(r.monto)} · ${r.plazo} meses al ${r.tasa}% · ${mxn2(r.pago)}/mes`;
}
function vCotizaciones() {
  const rows = COTS.filter((r) => !FILT || r.por === FILT);
  const acc = rows.filter((r) => r.estado === "aceptado"), sum = (l) => l.reduce((s, r) => s + (r.monto || 0), 0);
  const people = [...new Set(COTS.map((r) => r.por))];
  $("panel").innerHTML = `<div class="card">
    <div class="head"><h2>${isAdmin() ? "Cotizaciones" : "Mis cotizaciones"}</h2>
    ${isAdmin() ? `<label for="c-f">Quién cotizó<select id="c-f"><option value="">Todos</option>${people.map((p) => `<option value="${esc(p)}"${p === FILT ? " selected" : ""}>${esc(nameOf(p))}</option>`).join("")}</select></label>` : ""}</div>
    <div class="stats"><span class="stat"><b>${rows.length}</b> cotizaciones</span><span class="stat">Cotizado <b>${mxn(sum(rows))}</b></span><span class="stat"><b>${acc.length}</b> aceptadas · <b>${mxn(sum(acc))}</b></span></div>
    <div class="list">${rows.length ? rows.map((r) => {
      const f = new Date(r.fecha), est = r.estado || "cotizado";
      return `<div class="item"><div class="item-top"><b>${esc(r.cliente || "Sin nombre")}</b><span>${f.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} ${f.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="item-mid">${detCot(r)}</div>
        ${r.aceptadoPor ? `<div class="item-bot"><span class="pill ok">Confirmada por el cliente</span><span>${esc(r.aceptadoNombre || "")} · ${esc(r.aceptadoEmail || "")}</span></div>` : ""}
        <div class="item-bot">${isAdmin() ? `<select data-cot="${r.id}" aria-label="Estado">${Object.entries(EST).map(([k, v]) => `<option value="${k}"${k === est ? " selected" : ""}>${v}</option>`).join("")}</select><span>Cotizó: ${esc(nameOf(r.por))}</span>${r.tipo === "auto" ? "" : `<button class="link" type="button" data-mk="${r.id}">Crear préstamo</button>`}`
          : `<span class="pill${est === "aceptado" ? " ok" : est === "descartado" ? " no" : ""}">${EST[est]}</span>`}
        ${r.telefono ? `<a href="https://wa.me/52${esc(r.telefono)}" target="_blank" rel="noopener">${esc(r.telefono)}</a>` : ""}</div></div>`;
    }).join("") : `<p class="muted">Todavía no hay cotizaciones. Cuando envíes o copies una desde "Cotizar", aparece aquí.</p>`}</div></div>`;
  $("c-f") && ($("c-f").onchange = (e) => { FILT = e.target.value; vCotizaciones(); });
  $("panel").querySelectorAll("select[data-cot]").forEach((s) => (s.onchange = () => updateDoc(doc(db, "cotizaciones", s.dataset.cot), { estado: s.value })));
  $("panel").querySelectorAll("[data-mk]").forEach((b) => (b.onclick = () => { const c = COTS.find((x) => x.id === b.dataset.mk); DRAFT = { ...c, email: c.aceptadoEmail || "", clienteUid: c.aceptadoPor || "", cotId: c.id }; go("prestamos"); }));
}

/* ---------- Préstamos (admin) ---------- */
let DRAFT = null, OPEN = "", DRAFT_COT = "";
function vPrestamos() {
  const clientes = USERS.filter((u) => u.rol === "cliente");
  const d = DRAFT || {};
  const act = PRES.filter((p) => !avance(p).liquidado), liq = PRES.filter((p) => avance(p).liquidado);
  const cartera = act.reduce((s, p) => s + avance(p).restante, 0);
  $("panel").innerHTML = `
  <div class="card"><details${DRAFT ? " open" : ""}><summary>Nuevo préstamo</summary>
    <form id="fp" novalidate style="margin-top:12px">
      <div class="seg"><button type="button" data-pt="garantia" aria-pressed="${(d.tipo || "garantia") === "garantia"}">Con garantía</button><button type="button" data-pt="semanal" aria-pressed="${d.tipo === "semanal"}">Semanal</button></div>
      <input type="hidden" id="p-tipo" value="${d.tipo || "garantia"}">
      <div class="row"><label for="p-nom">Cliente<input id="p-nom" value="${esc(d.cliente || "")}" placeholder="Nombre"></label>
      <label for="p-tel">WhatsApp<input id="p-tel" inputmode="tel" value="${esc(d.telefono || "")}" placeholder="33 1234 5678"></label></div>
      <label for="p-mail">Correo del cliente (con este correo verá su avance al crear su cuenta)<input id="p-mail" type="email" inputmode="email" value="${esc(d.email || "")}" placeholder="cliente@correo.com"></label>
      <label for="p-uid">O elige su cuenta si ya la creó<select id="p-uid"><option value="">Todavía sin cuenta</option>${clientes.map((u) => `<option value="${u.uid}"${u.uid === d.clienteUid ? " selected" : ""}>${esc(u.nombre)} · ${esc(u.email)}</option>`).join("")}</select></label>
      <div class="row"><label for="p-monto">Monto<input id="p-monto" inputmode="numeric" value="${d.monto ? Number(d.monto).toLocaleString("es-MX") : ""}"></label>
      <label for="p-tasa" id="p-tasa-l">${d.tipo === "semanal" ? "Pago por cada $1,000" : "Interés mensual (%)"}<input id="p-tasa" inputmode="decimal" value="${d.tasa ?? ""}"></label></div>
      <div class="row"><label for="p-plazo" id="p-plazo-l">${d.tipo === "semanal" ? "Semanas" : "Meses"}<input id="p-plazo" inputmode="numeric" value="${d.plazo ?? ""}"></label>
      <label for="p-ini">Fecha del primer pago<input id="p-ini" type="date" value="${d.inicio || plusDays(d.tipo === "semanal" ? 7 : 30)}"></label></div>
      <div class="row" id="p-gar-row"${d.tipo === "semanal" ? " hidden" : ""}><label for="p-gar">Garantía<select id="p-gar">${Object.entries(GARANTIAS).map(([k, v]) => `<option value="${k}"${k === d.garantia ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label for="p-desc">Descripción<input id="p-desc" value="${esc(d.desc || "")}"></label></div>
      <p class="err" id="p-err" hidden></p>
      <button class="btn primary" type="submit">Guardar préstamo</button>
    </form></details></div>
  <div class="card">
    <div class="head"><h2>Préstamos activos</h2></div>
    <div class="stats"><span class="stat"><b>${act.length}</b> activos</span><span class="stat">Por cobrar <b>${mxn(cartera)}</b></span><span class="stat"><b>${liq.length}</b> liquidados</span></div>
    <div class="list">${act.length ? act.map(loanItem).join("") : `<p class="muted">Sin préstamos activos. Crea uno arriba o desde una cotización aceptada.</p>`}</div>
  </div>
  ${liq.length ? `<div class="card"><details><summary>Liquidados (${liq.length})</summary><div class="list" style="margin-top:12px">${liq.map(loanItem).join("")}</div></details></div>` : ""}`;
  DRAFT_COT = d.cotId || ""; DRAFT = null;
  $("panel").querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => {
    const t = b.dataset.pt; $("p-tipo").value = t;
    $("panel").querySelectorAll("[data-pt]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("p-tasa-l").firstChild.textContent = t === "semanal" ? "Pago por cada $1,000" : "Interés mensual (%)";
    $("p-plazo-l").firstChild.textContent = t === "semanal" ? "Semanas" : "Meses";
    $("p-gar-row").hidden = t === "semanal";
  }));
  $("p-monto").addEventListener("input", (e) => { const v = e.target.value.replace(/\D/g, ""); e.target.value = v ? Number(v).toLocaleString("es-MX") : ""; });
  $("p-uid").addEventListener("change", (e) => { const u = USERS.find((x) => x.uid === e.target.value); if (u && !$("p-nom").value) $("p-nom").value = u.nombre; if (u) $("p-mail").value = u.email || ""; if (u?.telefono && !$("p-tel").value) $("p-tel").value = u.telefono; });
  $("fp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = $("p-tipo").value, monto = num($("p-monto").value), tasa = num($("p-tasa").value), plazo = parseInt($("p-plazo").value, 10) || 0;
    if (!$("p-nom").value.trim() || !monto || !tasa || !plazo) { $("p-err").hidden = false; $("p-err").textContent = "Completa cliente, monto, tasa y plazo."; return; }
    const p = { tipo, cliente: $("p-nom").value.trim(), telefono: tel10($("p-tel").value), clienteUid: $("p-uid").value || "", clienteEmail: $("p-mail").value.trim().toLowerCase(), monto, tasa, plazo, inicio: $("p-ini").value,
      cotId: DRAFT_COT || "", garantia: tipo === "semanal" ? "" : $("p-gar").value, desc: tipo === "semanal" ? "" : $("p-desc").value.trim(), pagos: [], creado: new Date().toISOString() };
    try { await addDoc(collection(db, "prestamos"), p); } catch (er) { $("p-err").hidden = false; $("p-err").textContent = "No se pudo guardar. Revisa tu conexión."; }
  });
  $("panel").querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => { OPEN = OPEN === b.dataset.open ? "" : b.dataset.open; vPrestamos(); }));
  $("panel").querySelectorAll("form[data-pay]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = num(f.querySelector("[name=m]").value), fe = f.querySelector("[name=f]").value || today();
    if (!m) return;
    await updateDoc(doc(db, "prestamos", f.dataset.pay), { pagos: arrayUnion({ monto: m, fecha: fe, reg: new Date().toISOString() }) });
  }));
  $("panel").querySelectorAll("[data-undo]").forEach((b) => (b.onclick = async () => {
    const p = PRES.find((x) => x.id === b.dataset.undo); if (!p?.pagos?.length) return;
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez para borrar el último pago"; return; }
    await updateDoc(doc(db, "prestamos", p.id), { pagos: p.pagos.slice(0, -1) });
  }));
  $("panel").querySelectorAll("select[data-link]").forEach((s) => (s.onchange = () => { const u = USERS.find((x) => x.uid === s.value); updateDoc(doc(db, "prestamos", s.dataset.link), u ? { clienteUid: s.value, clienteEmail: u.email || "" } : { clienteUid: "" }); }));
  $("panel").querySelectorAll("input[data-mail]").forEach((i) => i.addEventListener("change", () => updateDoc(doc(db, "prestamos", i.dataset.mail), { clienteEmail: i.value.trim().toLowerCase() })));
}
function loanItem(p) {
  const a = avance(p), unidad = p.tipo === "semanal" ? "Semana" : "Mes";
  const pct = Math.min(100, Math.round((a.pagado / a.corrida.total) * 100));
  const venc = a.siguiente?.fecha && a.siguiente.fecha < new Date(new Date().toDateString());
  const rec = a.siguiente ? `Hola ${p.cliente}, te recordamos tu pago ${a.siguiente.n} de ${a.total} por ${mxn2(a.siguiente.monto)}${a.siguiente.fecha ? ", con fecha " + fcorta(a.siguiente.fecha) : ""}. Llevas ${mxn2(a.pagado)} pagados y te restan ${mxn2(a.restante)}.\n\nEntre Amigos` : "";
  const open = OPEN === p.id, clientes = USERS.filter((u) => u.rol === "cliente");
  return `<div class="item">
    <div class="item-top"><b>${esc(p.cliente)}</b><span>${a.liquidado ? `<span class="pill ok">Liquidado</span>` : venc ? `<span class="pill warn">Pago atrasado</span>` : `${unidad} ${Math.min(a.cubiertos + 1, a.total)} de ${a.total}`}</span></div>
    <div class="item-mid">${p.tipo === "semanal" ? "Semanal" : "Garantía " + (GARANTIAS[p.garantia] || "")}${p.desc ? " (" + esc(p.desc) + ")" : ""} · ${mxn(p.monto)} · pago ${mxn2(a.corrida.pago)}</div>
    <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <div class="item-bot"><span>Pagado ${mxn2(a.pagado)} · Resta ${mxn2(a.restante)}</span>${a.siguiente ? `<span>Próximo: ${mxn2(a.siguiente.monto)} ${a.siguiente.fecha ? "el " + fcorta(a.siguiente.fecha) : ""}</span>` : ""}</div>
    <div class="item-bot"><button class="link" type="button" data-open="${p.id}">${open ? "Cerrar" : "Registrar pago y más"}</button>${p.telefono && rec ? `<a href="${waTo(p.telefono, rec)}" target="_blank" rel="noopener">Recordatorio por WhatsApp</a>` : ""}${p.clienteUid || USERS.some((u) => p.clienteEmail && u.email === p.clienteEmail) ? `<span class="pill ok">Ve su avance</span>` : p.clienteEmail ? `<span class="pill">Aún no crea cuenta</span>` : ""}</div>
    ${open ? `<form data-pay="${p.id}" class="row" novalidate style="margin-top:8px">
        <label>Monto del pago<input name="m" inputmode="decimal" value="${a.siguiente ? a.siguiente.monto : ""}"></label>
        <label>Fecha<input name="f" type="date" value="${today()}"></label>
        <button class="btn primary" type="submit">Registrar pago</button>
        ${p.pagos?.length ? `<button class="btn" type="button" data-undo="${p.id}">Borrar último pago</button>` : ""}
      </form>
      <label>Correo del cliente<input data-mail="${p.id}" type="email" value="${esc(p.clienteEmail || "")}" placeholder="cliente@correo.com"></label>
      <label>Cuenta del cliente<select data-link="${p.id}"><option value="">Sin cuenta</option>${clientes.map((u) => `<option value="${u.uid}"${u.uid === p.clienteUid ? " selected" : ""}>${esc(u.nombre)} · ${esc(u.email)}</option>`).join("")}</select></label>
      ${schedule(p, a)}` : ""}
  </div>`;
}
function schedule(p, a) {
  const pagos = (p.pagos || []).slice().reverse();
  return `<details><summary>Corrida y pagos</summary><div class="tbl"><table><tr><th>${p.tipo === "semanal" ? "Semana" : "Mes"}</th><th>Fecha</th><th>Pago</th><th>Estado</th></tr>${a.corrida.filas.map((f, i) => `<tr class="${i < a.cubiertos ? "done" : i === a.cubiertos ? "next" : ""}"><td>${f.n}</td><td>${fcorta(fechaPago(p.inicio, f.n, p.tipo))}</td><td>${mxn2(f.pago)}</td><td>${i < a.cubiertos ? "Pagado" : i === a.cubiertos ? "Siguiente" : ""}</td></tr>`).join("")}</table></div>
  ${pagos.length ? `<h3 style="margin-top:12px">Pagos recibidos</h3><div class="tbl"><table><tr><th>Fecha</th><th>Monto</th></tr>${pagos.map((x) => `<tr><td>${fcorta(new Date(x.fecha + "T12:00:00"))}</td><td>${mxn2(x.monto)}</td></tr>`).join("")}</table></div>` : ""}</details>`;
}

/* ---------- Mis préstamos (cliente) ---------- */
const COT_ID = new URLSearchParams(location.search).get("c") || "";
let MYCOTS = [];
async function cotBox() {
  const box = $("cot-box"); if (!box) return;
  const ids = new Set(MYCOTS.map((c) => c.id));
  let list = MYCOTS.slice();
  if (COT_ID && !ids.has(COT_ID)) { try { const s = await getDoc(doc(db, "cotizaciones", COT_ID)); if (s.exists()) list.unshift({ id: s.id, ...s.data() }); } catch (e) {} }
  const conPrestamo = new Set(PRES.map((p) => p.cotId).filter(Boolean));
  list = list.filter((c) => !conPrestamo.has(c.id));
  box.innerHTML = list.map((c) => {
    const mine = c.aceptadoPor === ME.uid, libre = !c.aceptadoPor && c.estado === "cotizado";
    const detalle = c.tipo === "semanal" ? `${c.plazo} pagos semanales de ${mxn2(c.pago)}` : `${c.plazo} pagos mensuales de ${mxn2(c.pago)} · interés ${c.tasa}% mensual sobre saldo`;
    return `<div class="card"><h2>Tu cotización</h2>
      <div class="big"><span>Monto del préstamo</span><b>${mxn(c.monto)}</b></div>
      <p>${detalle}</p><p class="muted">Total a pagar: ${mxn2(c.total)}${c.tipo !== "semanal" && c.garantia && c.garantia !== "ff" ? " · Garantía: " + esc(c.desc || GARANTIAS[c.garantia]) : ""}</p>
      ${mine ? `<p class="ok">Confirmaste esta cotización. Te avisaremos por WhatsApp cuando tu préstamo esté listo y la fecha de tu primer pago.</p>`
        : libre ? `<button class="btn primary" type="button" data-acc="${c.id}">Confirmar cotización</button><p class="note">Al confirmar, Entre Amigos prepara tu préstamo y te indica la fecha de inicio.</p>`
        : `<p class="muted">Esta cotización ya no está disponible. Escríbenos si quieres una nueva.</p>`}</div>`;
  }).join("");
  box.querySelectorAll("[data-acc]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try {
      await updateDoc(doc(db, "cotizaciones", b.dataset.acc), { estado: "aceptado", aceptadoPor: ME.uid, aceptadoEmail: (ME.email || "").toLowerCase(), aceptadoNombre: USER.nombre || "", aceptadoEn: new Date().toISOString() });
      const s = await getDoc(doc(db, "cotizaciones", b.dataset.acc)); MYCOTS = MYCOTS.filter((x) => x.id !== s.id).concat([{ id: s.id, ...s.data() }]); cotBox();
    } catch (e) { b.disabled = false; b.insertAdjacentHTML("afterend", `<p class="err">No se pudo confirmar. Intenta de nuevo o escríbenos por WhatsApp.</p>`); }
  }));
}
function vMis() {
  const ver = ME.emailVerified ? "" : `<div class="card"><h3>Confirma tu correo</h3><p class="muted">Te mandamos un enlace a ${esc(ME.email)}. Ábrelo para que aparezcan tus préstamos, y luego toca "Ya lo confirmé". Revisa también la carpeta de spam.</p><div class="actions"><button class="btn primary" type="button" id="b-ver">Ya lo confirmé</button><button class="btn" type="button" id="b-rev">Reenviar correo</button></div><p class="toast" id="ver-t"></p></div>`;
  setTimeout(() => {
    $("b-ver") && ($("b-ver").onclick = async () => { await ME.reload(); if (auth.currentUser.emailVerified) { await auth.currentUser.getIdToken(true); location.reload(); } else $("ver-t").textContent = "Todavía no aparece confirmado. Abre el enlace del correo e intenta de nuevo."; });
    $("b-rev") && ($("b-rev").onclick = () => sendEmailVerification(auth.currentUser).then(() => ($("ver-t").textContent = "Correo reenviado."), () => ($("ver-t").textContent = "Espera un momento antes de reenviar.")));
  });
  setTimeout(cotBox);
  setTimeout(() => docsCard($("docs-box"), ME.uid, false));
  $("panel").innerHTML = ver + `<div id="cot-box" style="display:grid;gap:16px"></div><div id="docs-box"></div>` + (PRES.length ? PRES.map((p) => {
    const a = avance(p), unidad = p.tipo === "semanal" ? "Semana" : "Mes", pct = Math.min(100, Math.round((a.pagado / a.corrida.total) * 100));
    return `<div class="card">
      <div class="head"><h2>Préstamo de ${mxn(p.monto)}</h2>${a.liquidado ? `<span class="pill ok">Liquidado</span>` : ""}</div>
      <p class="muted">${p.tipo === "semanal" ? `${a.total} pagos semanales` : `${a.total} pagos mensuales${p.desc ? " · Garantía: " + esc(p.desc) : ""}`}</p>
      ${a.siguiente ? `<div class="big"><span>Tu próximo pago · ${unidad} ${a.siguiente.n} de ${a.total}</span><b>${mxn2(a.siguiente.monto)}</b></div>${a.siguiente.fecha ? `<p>Fecha: <b>${fcorta(a.siguiente.fecha)}</b></p>` : ""}` : `<p class="ok">Liquidaste tu préstamo. Gracias por tu confianza.</p>`}
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <div class="facts"><div><span>Pagado</span><b>${mxn2(a.pagado)}</b></div><div><span>Te resta</span><b>${mxn2(a.restante)}</b></div><div><span>Avance</span><b>${a.cubiertos} de ${a.total}</b></div></div>
      ${schedule(p, a)}
      <a class="btn" href="https://wa.me/${WA}?text=${encodeURIComponent("Hola, te envío el comprobante de mi pago.")}" target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a>
    </div>`;
  }).join("") : `<div class="card"><h2>Mis préstamos</h2><p class="muted">Aquí verás tu préstamo, en qué pago vas y cuánto te resta, en cuanto Entre Amigos lo registre con tu correo.</p></div>`);
}

/* ---------- Personas (admin) ---------- */
const ROL = { cliente: "Cliente", equipo: "Colaborador (cotiza)", bloqueado: "Bloqueado" };
function vPersonas() {
  const order = { pendiente: 0, equipo: 1, cliente: 2, bloqueado: 3, admin: 4 };
  USERS.filter(isNew).forEach((u) => updateDoc(doc(db, "usuarios", u.uid), { visto: true }).catch(() => {}));
  const list = USERS.filter((u) => u.rol !== "admin").sort((a, b) => (order[a.rol] ?? 9) - (order[b.rol] ?? 9) || (a.nombre || "").localeCompare(b.nombre || ""));
  const base = location.origin + location.pathname, link = base + "?nueva", linkC = base + "?nueva&tipo=colaborador";
  $("panel").innerHTML = `<div class="card">
    <h2>Invitar</h2>
    <p class="muted">Al crear su cuenta cada persona elige si es cliente o colaborador. Los clientes entran directo y solo ven sus préstamos. Los colaboradores esperan a que tú los apruebes aquí.</p>
    <div class="actions"><a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("Crea tu cuenta de cliente en Entre Amigos para ver tu préstamo: " + link)}">Invitar cliente</a>
    <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("Crea tu cuenta de colaborador en Entre Amigos para cotizar: " + linkC)}">Invitar colaborador</a></div>
    <p class="note">Link para clientes: ${esc(link)}<br>Link para colaboradores: ${esc(linkC)}</p>
  </div>
  <div class="card"><h2>Personas</h2><div class="list">${list.length ? list.map((u) => `<div class="item">
    <div class="item-top"><b>${esc(u.nombre || "Sin nombre")}</b><span>${esc(u.email)}</span></div>
    <div class="item-bot"><select data-rol="${u.uid}" aria-label="Tipo de acceso">${Object.entries(ROL).map(([k, v]) => `<option value="${k}"${k === u.rol ? " selected" : ""}>${v}</option>`).join("")}</select>
    ${u.rol === "cliente" && u.solicita === "equipo" ? `<span class="pill warn">Quiere ser colaborador</span><button class="btn sm primary" type="button" data-ok="${u.uid}">Aprobar</button><button class="link" type="button" data-no="${u.uid}">Dejar como cliente</button>` : isNew(u) ? `<span class="pill warn">Nuevo</span>` : ""}
    <input data-tel="${u.uid}" inputmode="tel" placeholder="WhatsApp" value="${esc(u.telefono || "")}" style="width:150px;font-size:14px;padding:6px 8px">
    <button class="link" type="button" data-docs="${u.uid}">Documentos ${docCount(u)}</button></div>
    ${DOCS_OPEN === u.uid ? `<div id="docs-${u.uid}"></div>` : ""}</div>`).join("") : `<p class="muted">Todavía nadie ha creado cuenta. Manda el link de arriba.</p>`}</div>
    <p class="note">Colaborador: cotiza y ve solo sus propias cotizaciones. Cliente: ve solo sus préstamos y su avance.</p></div>`;
  $("panel").querySelectorAll("select[data-rol]").forEach((s) => (s.onchange = () => updateDoc(doc(db, "usuarios", s.dataset.rol), { rol: s.value, solicita: "" })));
  $("panel").querySelectorAll("[data-ok]").forEach((b) => (b.onclick = () => updateDoc(doc(db, "usuarios", b.dataset.ok), { rol: "equipo", solicita: "" })));
  $("panel").querySelectorAll("[data-no]").forEach((b) => (b.onclick = () => updateDoc(doc(db, "usuarios", b.dataset.no), { solicita: "" })));
  $("panel").querySelectorAll("[data-docs]").forEach((b) => (b.onclick = () => { DOCS_OPEN = DOCS_OPEN === b.dataset.docs ? "" : b.dataset.docs; vPersonas(); }));
  if (DOCS_OPEN && $("docs-" + DOCS_OPEN)) docsCard($("docs-" + DOCS_OPEN), DOCS_OPEN, true);
  $("panel").querySelectorAll("input[data-tel]").forEach((i) => i.addEventListener("change", () => updateDoc(doc(db, "usuarios", i.dataset.tel), { telefono: tel10(i.value) })));
}

/* ---------- Tasas (admin) ---------- */
function vTasas() {
  const t = CFG.tasas || {};
  $("panel").innerHTML = `<div class="card"><h2>Valores sugeridos</h2><p class="muted">Tu equipo los verá ya puestos al cotizar. Pueden ajustarlos en cada cotización.</p>
    <form id="ft" novalidate>
      <div class="row">${Object.entries(GARANTIAS).map(([k, v]) => `<label for="t-${k}">Interés mensual: ${v.toLowerCase()} (%)<input id="t-${k}" inputmode="decimal" value="${t[k] ?? ""}"></label>`).join("")}
      <label for="t-plazo">Plazo sugerido (meses)<input id="t-plazo" inputmode="numeric" value="${CFG.plazo ?? 12}"></label></div>
      <div class="row"><label for="t-atasa">Autos: tasa anual sugerida (%)<input id="t-atasa" inputmode="decimal" value="${CFG.autoTasa ?? ""}"></label>
      <label for="t-aeng">Autos: enganche sugerido (%)<input id="t-aeng" inputmode="numeric" value="${CFG.autoEng ?? 35}"></label></div>
      <div class="row"><label for="t-fac">Semanal: pago por cada $1,000<input id="t-fac" inputmode="decimal" value="${CFG.fac ?? 100}"></label>
      <label for="t-sem">Semanal: número de semanas<input id="t-sem" inputmode="numeric" value="${CFG.sem ?? 14}"></label></div>
      <button class="btn primary" type="submit">Guardar</button><p class="toast" id="t-t"></p>
    </form></div>`;
  $("ft").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tasas = {}; Object.keys(GARANTIAS).forEach((k) => { const v = num($("t-" + k).value); if (v) tasas[k] = v; });
    try { await setDoc(doc(db, "config", "tasas"), { tasas, autoTasa: num($("t-atasa").value) || null, autoEng: num($("t-aeng").value) || 35, plazo: parseInt($("t-plazo").value, 10) || 12, fac: num($("t-fac").value) || 100, sem: parseInt($("t-sem").value, 10) || 14 }); $("t-t").textContent = "Guardado."; }
    catch (er) { $("t-t").textContent = "No se pudo guardar."; }
  });
}


/* ---------- Cotizar auto del inventario (Entre Amigos) ---------- */
let AUTOS = null;
const SITE = "https://ventaentreamigos.com";
async function loadAutos() {
  if (AUTOS) return AUTOS;
  try { const r = await fetch("../data/autos.json", { cache: "no-cache" }); AUTOS = (await r.json()).filter((a) => a.disponible).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999)); }
  catch (e) { AUTOS = []; }
  return AUTOS;
}
async function vCotAuto() {
  const autos = await loadAutos();
  const eng0 = CFG.autoEng || 35, tasa0 = CFG.autoTasa || "";
  $("panel").innerHTML = `
  <div class="card">
    <div class="seg"><button type="button" data-m="garantia" aria-pressed="false">Con garantía</button><button type="button" data-m="semanal" aria-pressed="false">Semanal con aval</button><button type="button" data-m="auto" aria-pressed="true">Auto del inventario</button></div>
    <form id="fa" novalidate>
      <div class="row"><label for="a-nom">Cliente<input id="a-nom" autocomplete="off" placeholder="Nombre del cliente"></label>
      <label for="a-tel">WhatsApp del cliente<input id="a-tel" inputmode="tel" autocomplete="off" placeholder="33 1234 5678"></label></div>
      <label for="a-auto">Auto<select id="a-auto">${autos.map((a) => `<option value="${esc(a.slug)}">${esc(a.title)} · ${mxn(a.precio)}${a.apartado ? " (apartado)" : ""}</option>`).join("")}</select></label>
      <div class="row"><label for="a-precio">Precio<input id="a-precio" inputmode="numeric"></label>
      <label for="a-engp">Enganche (%)<input id="a-engp" inputmode="decimal" value="${eng0}"></label></div>
      <div class="row"><label for="a-eng">Enganche ($)<input id="a-eng" inputmode="numeric"></label>
      <label for="a-plazo">Plazo (meses)<select id="a-plazo">${[12, 24, 36, 48, 60].map((n) => `<option${n === 48 ? " selected" : ""}>${n}</option>`).join("")}</select></label></div>
      <div class="row"><label for="a-tasa">Tasa anual (%)<input id="a-tasa" inputmode="decimal" value="${tasa0}" placeholder="Ej. 15.9"></label>
      <label for="a-banco">Banco o financiera (opcional)<input id="a-banco" autocomplete="off" placeholder="Ej. BBVA"></label></div>
      <label class="chk" for="a-iva" style="display:flex;gap:10px;align-items:center;font-size:15px;color:var(--soft)"><input id="a-iva" type="checkbox" checked style="width:22px;height:22px">Sumar IVA (16%) a los intereses</label>
    </form>
  </div>
  <div class="card" aria-live="polite">
    <div class="big"><span>Mensualidad aproximada</span><b id="ar-pago">$0</b></div>
    <div class="facts"><div><span>Enganche</span><b id="ar-eng">$0</b></div><div><span>A financiar</span><b id="ar-fin">$0</b></div><div><span>Total pagado</span><b id="ar-tot">$0</b></div></div>
    <p class="err" id="ar-err" hidden></p>
    <div class="actions"><a class="btn primary" id="ab-wa" href="#" target="_blank" rel="noopener">Enviar por WhatsApp</a><button class="btn" type="button" id="ab-copy">Copiar</button><a class="btn" id="ab-ver" href="#" target="_blank" rel="noopener">Ver ficha</a></div>
    <p class="toast" id="ar-toast"></p>
    <details><summary>Mensaje que se envía</summary><pre id="ar-msg"></pre></details>
    <p class="note">Cotización informativa. La mensualidad final depende de la aprobación del banco o financiera, el seguro y las comisiones.</p>
  </div>`;
  $("panel").querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { MODE = b.dataset.m; vCotizar(); }));
  if (!autos.length) { $("ar-err").hidden = false; $("ar-err").textContent = "No se pudo cargar el inventario."; return; }
  const money = (el) => { const d = el.value.replace(/\D/g, ""); el.value = d ? Number(d).toLocaleString("es-MX") : ""; };
  const setAuto = () => { const a = autos.find((x) => x.slug === $("a-auto").value); $("a-precio").value = a ? Number(a.precio).toLocaleString("es-MX") : ""; syncEng("p"); };
  const syncEng = (from) => {
    const P = num($("a-precio").value);
    if (from === "p") $("a-eng").value = P ? Math.round((P * num($("a-engp").value)) / 100).toLocaleString("es-MX") : "";
    else $("a-engp").value = P ? Math.round((num($("a-eng").value) / P) * 1000) / 10 : "";
    calcAuto();
  };
  $("a-auto").onchange = setAuto;
  $("a-precio").addEventListener("input", (e) => { money(e.target); syncEng("p"); });
  $("a-engp").addEventListener("input", () => syncEng("p"));
  $("a-eng").addEventListener("input", (e) => { money(e.target); syncEng("$"); });
  $("fa").addEventListener("input", (e) => { if (!["a-precio", "a-engp", "a-eng"].includes(e.target.id)) calcAuto(); });
  $("fa").addEventListener("change", calcAuto);
  $("fa").addEventListener("submit", (e) => e.preventDefault());
  $("ab-wa").addEventListener("click", (e) => { if (!LAST) { e.preventDefault(); return; } saveAuto(); });
  $("ab-copy").onclick = () => { if (!LAST) return; saveAuto(); navigator.clipboard?.writeText(LAST.msg).then(() => ($("ar-toast").textContent = "Cotización copiada."), () => { $("ar-msg").closest("details").open = true; $("ar-toast").textContent = "Selecciona el mensaje y cópialo."; }); };
  setAuto();
}
function calcAuto() {
  const a = AUTOS.find((x) => x.slug === $("a-auto").value);
  const P = num($("a-precio").value), E = num($("a-eng").value), n = parseInt($("a-plazo").value, 10), t = num($("a-tasa").value), iva = $("a-iva").checked;
  const F = Math.max(0, P - E);
  const err = (m) => { LAST = null; $("ar-err").hidden = false; $("ar-err").textContent = m; };
  if (!a || !P) return err("Elige un auto.");
  if (!t) return err("Escribe la tasa anual del banco o financiera.");
  if (E >= P) return err("El enganche no puede ser igual o mayor al precio.");
  const r = (t / 100 / 12) * (iva ? 1.16 : 1);
  const pago = Math.ceil((r ? (F * r) / (1 - Math.pow(1 + r, -n)) : F / n) * 100) / 100;
  const total = E + pago * n, nom = $("a-nom").value.trim(), tel = $("a-tel").value, banco = $("a-banco").value.trim();
  const ficha = `${SITE}/auto.html?a=${encodeURIComponent(a.slug)}`;
  const msg = `Hola${nom ? " " + nom : ""}, te comparto la cotización del ${a.title}:\n\nPrecio: ${mxn(P)}\nEnganche: ${mxn(E)} (${Math.round((E / P) * 100)}%)\nMonto a financiar: ${mxn(F)}\nPlazo: ${n} meses\nTasa: ${t}% anual${iva ? " + IVA" : ""}${banco ? " con " + banco : ""}\nMensualidad aproximada: ${mxn2(pago)}\n\nFotos y ficha completa:\n${ficha}\n\nConoce todo nuestro inventario:\n${SITE}/#inventario\n\nTomamos tu auto a cuenta. Cotización informativa, sujeta a la aprobación del crédito.\n\nEntre Amigos`;
  LAST = { tipo: "auto", autoSlug: a.slug, autoTitulo: a.title, precio: P, enganche: E, monto: F, plazo: n, tasa: t, iva, banco, pago, total, cliente: nom, telefono: tel10(tel), msg };
  $("ar-err").hidden = true;
  $("ar-pago").textContent = mxn2(pago); $("ar-eng").textContent = mxn(E); $("ar-fin").textContent = mxn(F); $("ar-tot").textContent = mxn(total);
  $("ar-msg").textContent = msg; $("ab-wa").href = waTo(tel, msg); $("ab-ver").href = ficha;
}
function saveAuto() {
  if (!LAST) return;
  const { msg, ...d } = LAST; const k = JSON.stringify(d); if (k === lastKey) return; lastKey = k;
  addDoc(collection(db, "cotizaciones"), { ...d, por: ME.uid, fecha: new Date().toISOString(), estado: "cotizado" }).catch(() => (lastKey = ""));
}


/* ---------- Documentos del cliente ---------- */
const DOCS = {
  ine_f: "INE (frente)",
  ine_r: "INE (reverso)",
  domicilio: "Comprobante de domicilio (no mayor a 3 meses)",
  constancia: "Constancia de situación fiscal",
};
const DEST = { pendiente: ["En revisión", "warn"], aprobado: ["Aprobado", "ok"], rechazado: ["Rechazado", "no"] };
let DOCS_OPEN = "", docsUnsub = null;
const docCount = (u) => { const d = u.docs || {}; const n = Object.keys(DOCS).filter((k) => d[k]).length; return `(${n}/${Object.keys(DOCS).length})`; };

const BLOBS = {};
function blobUrl(dataUrl) {
  if (BLOBS[dataUrl.length + dataUrl.slice(-40)]) return BLOBS[dataUrl.length + dataUrl.slice(-40)];
  const [h, b64] = dataUrl.split(","), mime = (h.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(b64), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return (BLOBS[dataUrl.length + dataUrl.slice(-40)] = URL.createObjectURL(new Blob([arr], { type: mime })));
}
function fileToData(file) {
  return new Promise((ok, bad) => {
    if (file.type === "application/pdf") {
      if (file.size > 650000) return bad(new Error("El PDF pesa más de 650 KB. Mejor tómale una foto o captura de pantalla."));
      const fr = new FileReader(); fr.onload = () => ok({ data: fr.result, mime: "application/pdf" }); fr.onerror = () => bad(new Error("No se pudo leer el archivo.")); fr.readAsDataURL(file); return;
    }
    if (!file.type.startsWith("image/")) return bad(new Error("Sube una foto o un PDF."));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const tryq = (max, q) => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", q);
      };
      let d = tryq(1800, 0.75); if (d.length > 850000) d = tryq(1400, 0.65); if (d.length > 850000) d = tryq(1100, 0.6);
      d.length > 900000 ? bad(new Error("La foto es demasiado pesada. Intenta con otra.")) : ok({ data: d, mime: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); bad(new Error("No se pudo abrir la foto.")); };
    img.src = url;
  });
}
function docsCard(box, uid, admin) {
  if (!box) return;
  if (docsUnsub) { docsUnsub(); docsUnsub = null; }
  let FILES = {};
  const render = () => {
    const done = Object.keys(DOCS).filter((k) => FILES[k]).length;
    box.innerHTML = `<div class="card" style="${admin ? "margin-top:10px;background:var(--panel-2)" : ""}">
      <div class="head"><h2>${admin ? "Documentos" : "Mis documentos"}</h2><span class="muted">${done} de ${Object.keys(DOCS).length}</span></div>
      ${admin ? "" : `<p class="muted">Adelanta tus documentos para que tu préstamo esté listo más rápido. Puedes tomarles foto con tu celular.</p>`}
      <div class="list">${Object.entries(DOCS).map(([k, t]) => {
        const f = FILES[k], st = f ? DEST[f.estado] || DEST.pendiente : null;
        return `<div class="item"><div class="item-top"><b>${t}</b>${st ? `<span class="pill ${st[1]}">${st[0]}</span>` : `<span class="pill">Falta</span>`}</div>
          ${f ? `<div class="item-mid">Subido el ${fcorta(new Date(f.fecha))}${f.fechaDoc ? " · Fecha del comprobante: " + fcorta(new Date(f.fechaDoc + "T12:00:00")) : ""}${f.nota ? " · " + esc(f.nota) : ""}</div>` : ""}
          ${k === "domicilio" && (admin || !f || f.estado !== "aprobado") ? `<label>Fecha que aparece en el comprobante<input type="date" data-fd="${k}" max="${today()}"></label>` : ""}
          <div class="item-bot">
            ${!f || f.estado !== "aprobado" || admin ? `<label class="btn sm" style="cursor:pointer">${f ? "Reemplazar" : "Subir foto o PDF"}<input type="file" accept="image/*,application/pdf" data-up="${k}" hidden></label>` : ""}
            ${f ? `<button class="link" type="button" data-see="${k}">Ver</button>` : ""}
            ${admin && f ? `<button class="btn sm primary" type="button" data-ap="${k}">Aprobar</button><button class="link" type="button" data-rj="${k}">Rechazar</button>` : ""}
          </div><p class="err" data-er="${k}" hidden></p>
          ${f && SEE === k ? (f.mime === "application/pdf" ? `<p><a href="${blobUrl(f.data)}" target="_blank" rel="noopener">Abrir PDF</a></p>` : `<img src="${f.data}" alt="${t}" style="max-width:100%;border-radius:10px;margin-top:6px">`) : ""}
        </div>`;
      }).join("")}</div></div>`;
    box.querySelectorAll("[data-up]").forEach((inp) => inp.addEventListener("change", async () => {
      const k = inp.dataset.up, file = inp.files[0], er = box.querySelector(`[data-er="${k}"]`); if (!file) return;
      const fd = box.querySelector(`[data-fd="${k}"]`)?.value || "";
      if (k === "domicilio" && !fd) { er.hidden = false; er.textContent = "Escribe primero la fecha que aparece en el comprobante."; inp.value = ""; return; }
      if (k === "domicilio" && (Date.now() - new Date(fd + "T12:00:00").getTime()) / 864e5 > 92) { er.hidden = false; er.textContent = "El comprobante tiene más de 3 meses. Sube uno más reciente."; inp.value = ""; return; }
      er.hidden = false; er.className = "ok"; er.textContent = "Subiendo…";
      try {
        const { data, mime } = await fileToData(file);
        await setDoc(doc(db, "expedientes", uid, "archivos", k), { data, mime, nombre: file.name || k, fecha: new Date().toISOString(), fechaDoc: fd, estado: admin ? "aprobado" : "pendiente", nota: "", por: ME.uid });
        await updateDoc(doc(db, "usuarios", uid), { ["docs." + k]: admin ? "aprobado" : "pendiente" }).catch(() => {});
      } catch (e) { er.className = "err"; er.textContent = e.message || "No se pudo subir. Intenta de nuevo."; }
    }));
    box.querySelectorAll("[data-see]").forEach((b) => (b.onclick = () => { SEE = SEE === b.dataset.see ? "" : b.dataset.see; render(); }));
    const setEst = (k, estado, nota) => Promise.all([updateDoc(doc(db, "expedientes", uid, "archivos", k), { estado, nota }), updateDoc(doc(db, "usuarios", uid), { ["docs." + k]: estado })]);
    box.querySelectorAll("[data-ap]").forEach((b) => (b.onclick = () => setEst(b.dataset.ap, "aprobado", "")));
    box.querySelectorAll("[data-rj]").forEach((b) => (b.onclick = () => setEst(b.dataset.rj, "rechazado", "Vuelve a subirlo, no se ve bien o no es válido.")));
  };
  let SEE = "";
  docsUnsub = onSnapshot(collection(db, "expedientes", uid, "archivos"), (snap) => { FILES = {}; snap.docs.forEach((d) => (FILES[d.id] = d.data())); render(); }, () => { box.innerHTML = ""; });
  render();
}
