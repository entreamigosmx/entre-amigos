import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signOut, sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, onSnapshot, arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { num, mxn, mxn2, GARANTIAS, GN, corridaMensual, corridaSemanal, factorGarantia, fechaPago, fcorta, avance, vencido, desglosePagos } from "./calc.js?v=6";

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
  $("l-tel-l").hidden = !v;
  $("l-tipo-w").hidden = !v;
  $("b-login").textContent = v ? "Crear cuenta" : "Entrar";
  $("l-q").textContent = v ? "¿Ya tienes cuenta?" : "¿Primera vez?";
  $("b-swap").textContent = v ? "Entra aquí" : "Crea tu cuenta";
  $("l-pass").autocomplete = v ? "new-password" : "current-password";
  $("l-err").hidden = true;
}
$("b-swap").onclick = () => { setSignup(!signup); if (typeof INV !== "undefined" && INV.length) $("l-tipo-w").hidden = true; };
let TIPO = "cliente";
function setTipo(t) { TIPO = t; document.querySelectorAll("#l-tipo button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tipo === t))); }
document.querySelectorAll("#l-tipo button").forEach((b) => (b.onclick = () => setTipo(b.dataset.tipo)));
const QS = new URLSearchParams(location.search);
if (QS.has("nueva")) setSignup(true);
if (QS.get("tipo") === "colaborador") setTipo("colaborador");
const INV = (QS.get("inv") || "").split(",").filter((x) => /^[A-Za-z0-9]{10,40}$/.test(x));
if (INV.length) { setSignup(true); $("l-sub").textContent = "Crea tu cuenta para ver tu préstamo, tus pagos y tus documentos. Si ya tienes una, toca \"Entra aquí\" abajo."; $("l-tipo-w").hidden = true; }
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
      PEND_NAME = nom; PEND_TEL = tel10($("l-tel").value);
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
let ME = null, USER = null, unsubs = [], PEND_NAME = "", PEND_TEL = "";
const isAdmin = () => !!ME && ADMINS.includes((ME.email || "").toLowerCase());
const isTeam = () => isAdmin() || USER?.rol === "equipo";

async function ensureUser(u, nombre) {
  const ref = doc(db, "usuarios", u.uid);
  const s = await getDoc(ref);
  if (s.exists()) return s.data();
  const d = { nombre: nombre || PEND_NAME || u.displayName || (u.email || "").split("@")[0], email: (u.email || "").toLowerCase(), rol: ADMINS.includes((u.email || "").toLowerCase()) ? "admin" : "cliente", solicita: TIPO === "colaborador" ? "equipo" : "", telefono: PEND_TEL || "", creado: new Date().toISOString() };
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
  ? [["agenda", "Agenda"], ["cotizar", "Cotizar"], ["cotizaciones", "Cotizaciones"], ["prestamos", "Préstamos"], ["cuentas", "Cuentas"], ["personas", "Personas"], ["tasas", "Tasas"]]
  : isTeam() ? [["agenda", "Agenda"], ["cotizar", "Cotizar"], ["cotizaciones", "Mis cotizaciones"], ["prestamos", "Mis clientes"]]
  : [["mis", "Mis préstamos"]];

let CFG = {}, COTS = [], PRES = [], USERS = [], PSRC = {}, REP = {}, ENT = [];
function startApp() {
  show("v-app");
  if (isTeam()) unsubs.push(onSnapshot(doc(db, "config", "tasas"), (s) => { CFG = s.data() || {}; if (TAB === "cotizar" && !touched) applyCfg(); if (TAB === "tasas") draw(); }, () => {}));
  const qc = isAdmin() ? collection(db, "cotizaciones") : isTeam() ? query(collection(db, "cotizaciones"), where("por", "==", ME.uid)) : null;
  if (qc) unsubs.push(onSnapshot(qc, (s) => { COTS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); if (TAB === "cotizaciones") draw(); drawTabs(); }, () => {}));
  const setPres = () => { const m = {}; Object.values(PSRC).forEach((l) => l.forEach((x) => (m[x.id] = x))); PRES = Object.values(m).sort((a, b) => (a.creado < b.creado ? 1 : -1)); if (TAB === "prestamos" || TAB === "mis" || TAB === "agenda") draw(); };
  const listenP = (key, q) => unsubs.push(onSnapshot(q, (s) => { PSRC[key] = s.docs.map((d) => ({ id: d.id, ...d.data() })); setPres(); }, () => {}));
  if (isAdmin()) listenP("all", collection(db, "prestamos"));
  else if (isTeam()) listenP("mine", query(collection(db, "prestamos"), where("por", "==", ME.uid)));
  else if (USER.rol === "cliente") {
    INV.forEach((id) => updateDoc(doc(db, "prestamos", id), { clienteUid: ME.uid }).then(async () => {
      if (USER.telefono) return;
      const s = await getDoc(doc(db, "prestamos", id)); const t = s.data()?.telefono;
      if (t) { await updateDoc(doc(db, "usuarios", ME.uid), { telefono: t }); USER.telefono = t; if (TAB === "mis") draw(); }
    }).catch(() => {}));
    if (INV.length) history.replaceState(null, "", location.pathname);
    listenP("uid", query(collection(db, "prestamos"), where("clienteUid", "==", ME.uid)));
    unsubs.push(onSnapshot(query(collection(db, "cotizaciones"), where("aceptadoPor", "==", ME.uid)), (s) => { MYCOTS = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (TAB === "mis") cotBox(); }, () => {}));
    if (ME.emailVerified && ME.email) listenP("mail", query(collection(db, "prestamos"), where("clienteEmail", "==", ME.email.toLowerCase())));
  }
  if (isAdmin()) {
    unsubs.push(onSnapshot(collection(db, "repartos"), (s) => { REP = {}; s.docs.forEach((d) => (REP[d.id] = d.data())); if (TAB === "cuentas" || TAB === "prestamos") draw(); }, () => {}));
    unsubs.push(onSnapshot(collection(db, "entregas"), (s) => { ENT = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (TAB === "cuentas") draw(); }, () => {}));
  }
  if (isAdmin()) unsubs.push(onSnapshot(collection(db, "usuarios"), (s) => { USERS = s.docs.map((d) => ({ uid: d.id, ...d.data() })); if (TAB === "personas" || TAB === "prestamos" || TAB === "agenda") draw(); drawTabs(); }, () => {}));
  go(TABS()[0][0]);
}
const isNew = (u) => u.rol !== "admin" && u.creado && Date.now() - new Date(u.creado).getTime() < 3 * 864e5 && !u.visto;
function drawTabs() {
  const pend = USERS.filter((u) => isNew(u) || (u.rol === "cliente" && u.solicita === "equipo")).length;
  const conf = COTS.filter((c) => c.aceptadoPor && !PRES.some((p) => p.cotId === c.id)).length;
  $("tabs").innerHTML = TABS().map(([k, t]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${k === TAB}">${t}${k === "personas" && pend ? " (" + pend + ")" : ""}${k === "cotizaciones" && conf ? " (" + conf + ")" : ""}</button>`).join("");
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-t]"); if (b) go(b.dataset.t); });
function go(t) { TAB = t; drawTabs(); draw(); window.scrollTo(0, 0); }
let NOTICE = null;
function notice(nombre, tel, msg, titulo) {
  NOTICE = tel10(tel).length === 10 ? { nombre, tel, msg, titulo } : { nombre, tel: "", msg, titulo };
  drawNotice(); window.scrollTo(0, 0);
}
function drawNotice() {
  const n = NOTICE, box = $("notice"); if (!box) return;
  if (!n) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="card notice"><h3>${esc(n.titulo)}</h3>
    <p class="muted">${n.tel ? "Avísale a " + esc(n.nombre) + " por WhatsApp con un toque:" : esc(n.nombre) + " no tiene WhatsApp registrado. Copia el mensaje y mándaselo:"}</p>
    <pre>${esc(n.msg)}</pre>
    <div class="actions">${n.tel ? `<a class="btn primary" href="${waTo(n.tel, n.msg)}" target="_blank" rel="noopener" id="n-wa">Avisar por WhatsApp</a>` : ""}<button class="btn" type="button" id="n-copy">Copiar</button><button class="link" type="button" id="n-x">Cerrar</button></div></div>`;
  $("n-x").onclick = () => { NOTICE = null; drawNotice(); };
  $("n-wa") && $("n-wa").addEventListener("click", () => setTimeout(() => { NOTICE = null; drawNotice(); }, 800));
  $("n-copy").onclick = () => navigator.clipboard?.writeText(n.msg).catch(() => {});
}
const PORTAL = () => location.origin + location.pathname;
function draw() { const f = { agenda: vAgenda, cotizar: vCotizar, cotizaciones: vCotizaciones, prestamos: vPrestamos, cuentas: vCuentas, personas: vPersonas, tasas: vTasas, mis: vMis }[TAB]; f && f(); }
const nameOf = (uid) => (uid === ME.uid ? "Yo" : USERS.find((u) => u.uid === uid)?.nombre || "Colaborador");

/* ---------- Clientes que ya tengo (para no volver a capturarlos) ---------- */
function clientesConocidos() {
  const m = new Map();
  const add = (nombre, tel, email, uid) => {
    nombre = (nombre || "").trim(); if (!nombre) return;
    const t = tel10(tel), k = t.length === 10 ? t : "n:" + nombre.toLowerCase();
    const o = m.get(k) || {};
    m.set(k, { nombre: o.nombre || nombre, telefono: o.telefono || (t.length === 10 ? t : ""), email: o.email || email || "", uid: o.uid || uid || "" });
  };
  PRES.forEach((p) => add(p.cliente, p.telefono, p.clienteEmail, p.clienteUid));
  COTS.forEach((c) => add(c.cliente || c.aceptadoNombre, c.telefono, c.aceptadoEmail, c.aceptadoPor));
  if (isAdmin()) USERS.filter((u) => u.rol === "cliente").forEach((u) => add(u.nombre, u.telefono, u.email, u.uid));
  return [...m.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
}
// Selector "Cliente que ya tienes": llena nombre, WhatsApp y correo del formulario.
function pickCliente(pre) {
  const L = clientesConocidos(); if (!L.length) return "";
  return `<label for="${pre}-pick">Cliente que ya tienes<select id="${pre}-pick" data-pick="${pre}"><option value="">Cliente nuevo</option>${L.map((c, i) => `<option value="${i}">${esc(c.nombre)}${c.telefono ? " · " + c.telefono : ""}</option>`).join("")}</select></label>`;
}
function bindPick(pre, form) {
  const sel = $(pre + "-pick"); if (!sel) return;
  const L = clientesConocidos();
  sel.onchange = () => {
    const c = L[sel.value]; form.dataset.uid = c?.uid || "";
    if (!c) return;
    $(pre + "-nom").value = c.nombre; if ($(pre + "-tel")) $(pre + "-tel").value = c.telefono || "";
    if ($(pre + "-mail")) $(pre + "-mail").value = c.email || "";
    if ($(pre + "-uid") && [...$(pre + "-uid").options].some((o) => o.value === c.uid)) $(pre + "-uid").value = c.uid;
    form.dispatchEvent(new Event("input", { bubbles: true }));
  };
}

/* ---------- Cotizar ---------- */
let MODE = "garantia", touched = false, LAST = null, lastKey = "", curKey = "", CUR_REF = null;
function vCotizar() {
  touched = false;
  if (MODE === "auto") return vCotAuto();
  $("panel").innerHTML = `
  <div class="card">
    <div class="seg"><button type="button" data-m="garantia" aria-pressed="${MODE === "garantia"}">Con garantía</button><button type="button" data-m="semanal" aria-pressed="${MODE === "semanal"}">Semanal con aval</button><button type="button" data-m="auto" aria-pressed="false">Auto del inventario</button></div>
    <form id="fq" novalidate>
      ${pickCliente("q")}
      <div class="row"><label for="q-nom">Cliente<input id="q-nom" autocomplete="off" placeholder="Nombre del cliente"></label>
      <label for="q-tel">WhatsApp del cliente<input id="q-tel" inputmode="tel" autocomplete="off" placeholder="33 1234 5678"></label></div>
      <div class="row"><label for="q-monto">Monto a prestar (MXN)<input id="q-monto" inputmode="numeric" value="${MODE === "garantia" ? "100,000" : "10,000"}"></label>
      ${MODE === "garantia"
        ? `<label for="q-tasa">Interés mensual (%)<input id="q-tasa" inputmode="decimal" value="5"></label></div>
      <div class="row"><label for="q-gar">Garantía<select id="q-gar">${Object.entries(GARANTIAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
      <label for="q-desc">Descripción<input id="q-desc" autocomplete="off" placeholder="Ej. Jetta 2019"></label></div>
      <div class="row"><label for="q-plazo">Plazo (meses)<input id="q-plazo" inputmode="numeric" value="12"></label>
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
  $("fq").addEventListener("input", (e) => { if (["q-tasa", "q-fac", "q-sem"].includes(e.target.id)) touched = true; if (e.target.id === "q-plazo") e.target.dataset.t = "1"; calc(); });
  $("fq").addEventListener("change", (e) => { if (e.target.id === "q-gar" || e.target.id === "q-plazo") { if (e.target.id === "q-gar") { $("q-desc").placeholder = { auto: "Ej. Jetta 2019", reloj: "Ej. Rolex Submariner", oro: "Ej. Esclava 14k, 30 g", monedas: "Ej. 5 centenarios", otro: "Describe la prenda", ff: "Garantía acordada (opcional)" }[e.target.value]; touched = false; applyCfg(); } } calc(); });
  $("fq").addEventListener("submit", (e) => e.preventDefault());
  bindPick("q", $("fq"));
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
    if (CFG.plazo && !$("q-plazo").dataset.t) $("q-plazo").value = CFG.plazo;
  } else { if (CFG.fac) $("q-fac").value = CFG.fac; if (CFG.sem) $("q-sem").value = CFG.sem; }
  calc();
}
function calc() {
  const M = num($("q-monto").value), nom = $("q-nom").value.trim(), tel = $("q-tel").value;
  let r;
  if (MODE === "garantia") {
    const t = num($("q-tasa").value), n = parseInt($("q-plazo").value, 10), g = $("q-gar").value, desc = $("q-desc").value.trim(), val = num($("q-val").value);
    if (!M || !n) return err("Escribe el monto y el plazo en meses.");
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
const EST = { cotizado: "Cotizado", aceptado: "Aceptado", negado: "No aprobado", descartado: "Descartado" };
let FILT = "";
function detCot(r) {
  if (r.tipo === "auto") return `Auto · ${esc(r.autoTitulo || "")} · enganche ${mxn(r.enganche)} · ${r.plazo} meses al ${r.tasa}% anual${r.banco ? " (" + esc(r.banco) + ")" : ""} · ${mxn2(r.pago)}/mes`;
  return r.tipo === "semanal" ? `Semanal · ${mxn(r.monto)} · ${r.plazo} pagos de ${mxn2(r.pago)}`
    : `Garantía ${GARANTIAS[r.garantia] || ""}${r.desc ? " (" + esc(r.desc) + ")" : ""} · ${mxn(r.monto)} · ${r.plazo} meses al ${r.tasa}% · ${mxn2(r.pago)}/mes`;
}
const canDel = (r) => isAdmin() || (r.por === ME.uid && !r.aceptadoPor && !PRES.some((p) => p.cotId === r.id));
function vCotizaciones() {
  const rows = COTS.filter((r) => !FILT || r.por === FILT);
  const acc = rows.filter((r) => r.estado === "aceptado"), sum = (l) => l.reduce((s, r) => s + (r.monto || 0), 0);
  const people = [...new Set(COTS.map((r) => r.por))];
  const viejas = rows.filter((r) => canDel(r) && (r.estado === "descartado" || r.estado === "negado"));
  $("panel").innerHTML = `<div class="card">
    <div class="head"><h2>${isAdmin() ? "Cotizaciones" : "Mis cotizaciones"}</h2>
    ${isAdmin() ? `<label for="c-f">Quién cotizó<select id="c-f"><option value="">Todos</option>${people.map((p) => `<option value="${esc(p)}"${p === FILT ? " selected" : ""}>${esc(nameOf(p))}</option>`).join("")}</select></label>` : ""}</div>
    ${viejas.length ? `<div class="actions" style="margin-bottom:10px"><button class="btn sm" type="button" id="c-clean">Borrar descartadas y no aprobadas (${viejas.length})</button></div>` : ""}
    <div class="stats"><span class="stat"><b>${rows.length}</b> cotizaciones</span><span class="stat">Cotizado <b>${mxn(sum(rows))}</b></span><span class="stat"><b>${acc.length}</b> aceptadas · <b>${mxn(sum(acc))}</b></span></div>
    <div class="list">${rows.length ? rows.map((r) => {
      const f = new Date(r.fecha), est = r.estado || "cotizado";
      return `<div class="item"><div class="item-top"><b>${esc(r.cliente || "Sin nombre")}</b><span>${f.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} ${f.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="item-mid">${detCot(r)}</div>
        ${r.aceptadoPor ? `<div class="item-bot"><span class="pill ok">Confirmada por el cliente</span><span>${esc(r.aceptadoNombre || "")} · ${esc(r.aceptadoEmail || "")}</span></div>` : ""}
        <div class="item-bot">${isAdmin() ? `<select data-cot="${r.id}" aria-label="Estado">${Object.entries(EST).map(([k, v]) => `<option value="${k}"${k === est ? " selected" : ""}>${v}</option>`).join("")}</select><span>Cotizó: ${esc(nameOf(r.por))}</span>${r.tipo === "auto" ? "" : `<button class="link" type="button" data-mk="${r.id}">Crear préstamo</button>`}`
          : `<span class="pill${est === "aceptado" ? " ok" : (est === "descartado" || est === "negado") ? " no" : ""}">${EST[est]}</span>${r.tipo === "auto" ? "" : `<button class="link" type="button" data-mk="${r.id}">Crear préstamo</button>`}`}
        ${r.telefono ? `<a href="https://wa.me/52${esc(r.telefono)}" target="_blank" rel="noopener">${esc(r.telefono)}</a>` : ""}${canDel(r) ? `<button class="link del" type="button" data-del="${r.id}">Borrar</button>` : ""}</div></div>`;
    }).join("") : `<p class="muted">Todavía no hay cotizaciones. Cuando envíes o copies una desde "Cotizar", aparece aquí.</p>`}</div></div>`;
  $("c-f") && ($("c-f").onchange = (e) => { FILT = e.target.value; vCotizaciones(); });
  const twice = (b, txt, fn) => (b.onclick = async () => { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = txt; return; } b.disabled = true; try { await fn(); } catch (e) { b.disabled = false; b.textContent = "No se pudo borrar"; } });
  $("panel").querySelectorAll("[data-del]").forEach((b) => twice(b, "Toca otra vez para borrar", () => deleteDoc(doc(db, "cotizaciones", b.dataset.del))));
  $("c-clean") && twice($("c-clean"), `Toca otra vez para borrar ${viejas.length}`, () => Promise.all(viejas.map((r) => deleteDoc(doc(db, "cotizaciones", r.id)))));
  $("panel").querySelectorAll("select[data-cot]").forEach((s) => (s.onchange = async () => {
    await updateDoc(doc(db, "cotizaciones", s.dataset.cot), { estado: s.value });
    if (s.value !== "negado") return;
    const c = COTS.find((x) => x.id === s.dataset.cot) || {}, nom = c.cliente || c.aceptadoNombre || "";
    notice(nom, c.telefono || USERS.find((u) => u.uid === c.aceptadoPor)?.telefono || "", `Hola${nom ? " " + nom : ""}, gracias por tu interés y por la confianza. Revisamos tu solicitud de préstamo por ${mxn(c.monto)} y por el momento no nos es posible aprobarla.\n\nSi cambia tu situación o quieres revisar otra opción (otro monto, plazo o garantía), con gusto lo platicamos.\n\nEntre Amigos`, "Préstamo no aprobado");
  }));
  $("panel").querySelectorAll("[data-mk]").forEach((b) => (b.onclick = () => { const c = COTS.find((x) => x.id === b.dataset.mk); DRAFT = { ...c, email: c.aceptadoEmail || "", clienteUid: c.aceptadoPor || "", cotId: c.id }; go("prestamos"); }));
}

/* ---------- Préstamos (admin) ---------- */
let DRAFT = null, OPEN = "", DRAFT_COT = "";
let OWN = "";
const ownerOf = (p) => p.por || ADMIN_UID();
const ADMIN_UID = () => (isAdmin() ? ME.uid : USERS.find((u) => u.rol === "admin")?.uid || "");
const visibles = () => PRES.filter((p) => !OWN || ownerOf(p) === OWN);
function ownerFilter(rerender) {
  if (!isAdmin()) return "";
  const ids = [...new Set(PRES.map(ownerOf))];
  if (ids.length < 2 && !OWN) return "";
  setTimeout(() => { const s = $("own-f"); if (s) s.onchange = () => { OWN = s.value; rerender(); }; });
  return `<label for="own-f">Cartera de<select id="own-f"><option value="">Todos</option>${ids.map((i) => `<option value="${esc(i)}"${i === OWN ? " selected" : ""}>${esc(i === ME.uid ? "Yo" : nameOf(i))}</option>`).join("")}</select></label>`;
}
function vPrestamos() {
  const clientes = USERS.filter((u) => u.rol === "cliente");
  const d = DRAFT || {};
  const VP = visibles();
  const act = VP.filter((p) => !avance(p).liquidado), liq = VP.filter((p) => avance(p).liquidado);
  const cartera = act.reduce((s, p) => s + debeDe(p, avance(p)), 0);
  const equipo = USERS.filter((u) => u.rol === "equipo");
  $("panel").innerHTML = `
  <div class="card"><details id="ex-d"${EXOPEN ? " open" : ""}><summary>Agregar cliente con préstamo que ya tiene</summary>
    <form id="fe" novalidate style="margin-top:12px">
      <p class="note" style="margin:0 0 10px">Para clientes de antes: registras lo que te debe hoy y cómo te paga. Al guardar te aparece el mensaje para invitarlo por WhatsApp a ver su préstamo en línea.</p>
      ${pickCliente("e")}
      <div class="row"><label for="e-nom">Cliente<input id="e-nom" placeholder="Nombre completo"></label>
      <label for="e-tel">WhatsApp<input id="e-tel" inputmode="tel" placeholder="33 1234 5678"></label></div>
      ${isAdmin() && equipo.length ? `<label for="e-own">¿De quién es el cliente?<select id="e-own"><option value="${ME.uid}">Mío</option>${equipo.map((u) => `<option value="${u.uid}">${esc(u.nombre)}</option>`).join("")}</select></label>` : ""}
      <p class="lbl" style="margin:6px 0">¿Cómo te paga?</p>
      <div class="seg wrap" id="e-modo"><button type="button" data-em="interes" aria-pressed="true">Solo interés</button><button type="button" data-em="capfijo" aria-pressed="false">Interés + abono a capital</button><button type="button" data-em="garantia" aria-pressed="false">Pago fijo mensual</button><button type="button" data-em="semanal" aria-pressed="false">Pago semanal</button></div>
      <p class="note" id="e-help"></p>
      <div class="row"><label for="e-saldo" data-f="saldo">Lo que te debe hoy (capital)<input id="e-saldo" inputmode="numeric" placeholder="Ej. 1,000,000"></label>
      <label for="e-tasa" data-f="tasa">Interés mensual (%)<input id="e-tasa" inputmode="decimal" placeholder="Ej. 3"></label></div>
      <div class="row"><label for="e-abono" data-f="abono">Abono a capital cada mes<input id="e-abono" inputmode="numeric" placeholder="Ej. 10,000"></label>
      <label for="e-pago" data-f="pago"><span id="e-pago-l">Pago acordado</span><input id="e-pago" inputmode="decimal" placeholder="Opcional"></label>
      <label for="e-n" data-f="n"><span id="e-n-l">Meses que le faltan</span><input id="e-n" inputmode="numeric" placeholder="Ej. 3"></label></div>
      <div class="row"><label for="e-ini">Fecha de su próximo pago<input id="e-ini" type="date" value="${plusDays(30)}"></label>
      <label for="e-mail">Correo (opcional)<input id="e-mail" type="email" inputmode="email" placeholder="cliente@correo.com"></label></div>
      <div class="row" data-f="gar"><label for="e-gar">Garantía<select id="e-gar"><option value="">Sin garantía</option>${Object.entries(GARANTIAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
      <label for="e-desc">Descripción<input id="e-desc" placeholder="Ej. Tahoe 2020, Rolex, 5 centenarios"></label></div>
      <p class="cov" id="e-prev"></p>
      <p class="err" id="e-err" hidden></p>
      <button class="btn primary" type="submit">Guardar y preparar invitación</button>
    </form></details></div>
  <div class="card"><details${DRAFT ? " open" : ""}><summary>Nuevo préstamo</summary>
    <form id="fp" novalidate style="margin-top:12px">
      <div class="seg"><button type="button" data-pt="garantia" aria-pressed="${(d.tipo || "garantia") === "garantia"}">Con garantía</button><button type="button" data-pt="semanal" aria-pressed="${d.tipo === "semanal"}">Semanal</button><button type="button" data-pt="interes" aria-pressed="false">Solo interés</button></div>
      <input type="hidden" id="p-tipo" value="${d.tipo || "garantia"}">
      ${DRAFT ? "" : pickCliente("p")}
      <div class="row"><label for="p-nom">Cliente<input id="p-nom" value="${esc(d.cliente || "")}" placeholder="Nombre"></label>
      <label for="p-tel">WhatsApp<input id="p-tel" inputmode="tel" value="${esc(d.telefono || "")}" placeholder="33 1234 5678"></label></div>
      <label for="p-mail">Correo del cliente (con este correo verá su avance al crear su cuenta)<input id="p-mail" type="email" inputmode="email" value="${esc(d.email || "")}" placeholder="cliente@correo.com"></label>
      <label for="p-uid"${isAdmin() ? "" : " hidden"}>O elige su cuenta si ya la creó<select id="p-uid"><option value="">Todavía sin cuenta</option>${clientes.map((u) => `<option value="${u.uid}"${u.uid === d.clienteUid ? " selected" : ""}>${esc(u.nombre)} · ${esc(u.email)}</option>`).join("")}</select></label>
      <div class="row"><label for="p-monto">Monto<input id="p-monto" inputmode="numeric" value="${d.monto ? Number(d.monto).toLocaleString("es-MX") : ""}"></label>
      <label for="p-tasa" id="p-tasa-l">${d.tipo === "semanal" ? "Pago por cada $1,000" : "Interés mensual (%)"}<input id="p-tasa" inputmode="decimal" value="${d.tasa ?? ""}"></label></div>
      <div class="row"><label for="p-plazo" id="p-plazo-l">${d.tipo === "semanal" ? "Semanas" : "Meses"}<input id="p-plazo" inputmode="numeric" value="${d.plazo ?? ""}"></label>
      <label for="p-ini">Fecha del primer pago<input id="p-ini" type="date" value="${d.inicio || plusDays(d.tipo === "semanal" ? 7 : 30)}"></label></div>
      <div class="row" id="p-gar-row"${d.tipo === "semanal" ? " hidden" : ""}><label for="p-gar">Garantía<select id="p-gar">${Object.entries(GARANTIAS).map(([k, v]) => `<option value="${k}"${k === d.garantia ? " selected" : ""}>${v}</option>`).join("")}</select></label>
      <label for="p-desc">Descripción<input id="p-desc" value="${esc(d.desc || "")}"></label></div>
      <label for="p-fijo">Pago acordado (opcional, si es distinto al calculado)<input id="p-fijo" inputmode="decimal" placeholder="Opcional"></label>
      <p class="err" id="p-err" hidden></p>
      <button class="btn primary" type="submit">Guardar préstamo</button>
    </form></details></div>
  <div class="card">
    <div class="head"><h2>${isAdmin() ? "Préstamos activos" : "Mis clientes activos"}</h2>${ownerFilter(vPrestamos)}</div>
    <div class="stats"><span class="stat"><b>${act.length}</b> activos</span><span class="stat">Por cobrar <b>${mxn(cartera)}</b></span><span class="stat"><b>${liq.length}</b> liquidados</span></div>
    <div class="list">${act.length ? act.map(loanItem).join("") : `<p class="muted">Sin préstamos activos. Crea uno arriba o desde una cotización aceptada.</p>`}</div>
  </div>
  ${liq.length ? `<div class="card"><details><summary>Liquidados (${liq.length})</summary><div class="list" style="margin-top:12px">${liq.map(loanItem).join("")}</div></details></div>` : ""}`;
  DRAFT_COT = d.cotId || ""; DRAFT = null;
  exForm();
  bindPick("p", $("fp"));
  $("panel").querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => {
    const t = b.dataset.pt; $("p-tipo").value = t;
    $("panel").querySelectorAll("[data-pt]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("p-tasa-l").firstChild.textContent = t === "semanal" ? "Pago por cada $1,000" : "Interés mensual (%)";
    $("p-plazo-l").firstChild.textContent = t === "semanal" ? "Semanas" : "Meses";
    $("p-plazo-l").hidden = t === "interes";
    $("p-ini").previousSibling.textContent = t === "interes" ? "Fecha del primer pago de interés" : "Fecha del primer pago";
    $("p-gar-row").hidden = t === "semanal";
  }));
  $("p-monto").addEventListener("input", (e) => { const v = e.target.value.replace(/\D/g, ""); e.target.value = v ? Number(v).toLocaleString("es-MX") : ""; });
  $("p-uid").addEventListener("change", (e) => { const u = USERS.find((x) => x.uid === e.target.value); if (u && !$("p-nom").value) $("p-nom").value = u.nombre; if (u) $("p-mail").value = u.email || ""; if (u?.telefono && !$("p-tel").value) $("p-tel").value = u.telefono; });
  $("fp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = $("p-tipo").value, monto = num($("p-monto").value), tasa = num($("p-tasa").value), plazo = parseInt($("p-plazo").value, 10) || 0;
    if (!$("p-nom").value.trim() || !monto || (!tasa && !num($("p-fijo").value)) || (!plazo && tipo !== "interes")) { $("p-err").hidden = false; $("p-err").textContent = "Completa cliente, monto, plazo y la tasa (o el pago acordado)."; return; }
    const p = { tipo, cliente: $("p-nom").value.trim(), telefono: tel10($("p-tel").value), clienteUid: $("p-uid").value || $("fp").dataset.uid || "", clienteEmail: $("p-mail").value.trim().toLowerCase(), monto, tasa, plazo, inicio: $("p-ini").value,
      por: ME.uid, cotId: DRAFT_COT || "", garantia: tipo === "semanal" ? "" : $("p-gar").value, desc: tipo === "semanal" ? "" : $("p-desc").value.trim(), pagos: [], creado: new Date().toISOString() };
    const fijo = num($("p-fijo").value); if (fijo) p.pagoFijo = fijo;
    try {
      const ref = await addDoc(collection(db, "prestamos"), p);
      const a = avance(p), sig = a.siguiente;
      notice(p.cliente, p.telefono, `Hola ${p.cliente}, ya está listo tu préstamo por ${mxn(p.monto)}.${sig ? " Tu primer pago es de " + mxn2(sig.monto) + (sig.fecha ? " el " + fcorta(sig.fecha) : "") + "." : ""}\n\nPuedes ver tu préstamo, tus pagos, tus fechas y tus documentos aquí:\n${p.clienteUid ? PORTAL() : invLink(ref.id)}\n\nEntre Amigos`, "Préstamo guardado");
    } catch (er) { $("p-err").hidden = false; $("p-err").textContent = "No se pudo guardar. Revisa tu conexión."; }
  });
  $("panel").querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => { OPEN = OPEN === b.dataset.open ? "" : b.dataset.open; vPrestamos(); }));
  $("panel").querySelectorAll("form[data-pay]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = num(f.querySelector("[name=m]").value), fe = f.querySelector("[name=f]").value || today(), t = f.querySelector("[name=t]")?.value;
    if (!m) return;
    const pg = { monto: m, fecha: fe, reg: new Date().toISOString(), regPor: ME.uid }; if (t === "capital") pg.tipo = "capital";
    await updateDoc(doc(db, "prestamos", f.dataset.pay), { pagos: arrayUnion(pg) });
  }));
  editHandlers();
  $("panel").querySelectorAll("[data-undo]").forEach((b) => (b.onclick = async () => {
    const p = PRES.find((x) => x.id === b.dataset.undo); if (!p?.pagos?.length) return;
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez para borrar el último pago"; return; }
    await updateDoc(doc(db, "prestamos", p.id), { pagos: p.pagos.slice(0, -1) });
  }));
  $("panel").querySelectorAll("select[data-link]").forEach((s) => (s.onchange = () => { const u = USERS.find((x) => x.uid === s.value); updateDoc(doc(db, "prestamos", s.dataset.link), u ? { clienteUid: s.value, clienteEmail: u.email || "" } : { clienteUid: "" }); }));
  $("panel").querySelectorAll("input[data-mail]").forEach((i) => i.addEventListener("change", () => updateDoc(doc(db, "prestamos", i.dataset.mail), { clienteEmail: i.value.trim().toLowerCase() })));
}
let EXOPEN = false, EXMODO = "interes";
const EX_HELP = {
  interes: "Cada mes te paga el interés sobre lo que debe. Los abonos a capital los registras cuando lleguen y el interés baja solo.",
  capfijo: "Cada mes te paga el interés sobre lo que debe más un abono fijo a capital, hasta liquidar. El pago baja cada mes.",
  garantia: "Pago mensual fijo con interés sobre saldo, a un número de meses. Si ya acordaron una cantidad, escríbela en Pago acordado.",
  semanal: "Pago semanal fijo. Escribe cuánto paga a la semana y cuántas semanas le faltan.",
};
const EX_FIELDS = { interes: ["saldo", "tasa", "gar"], capfijo: ["saldo", "tasa", "abono", "gar"], garantia: ["saldo", "tasa", "pago", "n", "gar"], semanal: ["pago", "n"] };
function exForm() {
  const f = $("fe"); if (!f) return;
  bindPick("e", f);
  $("ex-d").ontoggle = () => (EXOPEN = $("ex-d").open);
  const money = (id) => $(id).addEventListener("input", (e) => { const v = e.target.value.replace(/\D/g, ""); e.target.value = v ? Number(v).toLocaleString("es-MX") : ""; });
  ["e-saldo", "e-abono"].forEach(money);
  const build = () => {
    const m = EXMODO, saldo = num($("e-saldo").value), tasa = num($("e-tasa").value), abono = num($("e-abono").value), pago = num($("e-pago").value), n = parseInt($("e-n").value, 10) || 0;
    const p = { tipo: m, monto: saldo, tasa, plazo: n, inicio: $("e-ini").value, pagos: [] };
    if (m === "capfijo") p.abono = abono;
    if (m === "garantia" && pago) p.pagoFijo = pago;
    if (m === "semanal") { p.monto = Math.round(pago * n * 100) / 100; p.tasa = 0; p.pagoFijo = pago; }
    const ok = m === "semanal" ? pago && n : m === "garantia" ? saldo && n && (tasa || pago) : m === "capfijo" ? saldo && abono : saldo && tasa;
    return ok ? p : null;
  };
  const prev = () => {
    const p = build(), el = $("e-prev");
    if (!p) { el.textContent = ""; return; }
    const a = avance(p), c = a.corrida;
    el.textContent = EXMODO === "interes" ? `Paga ${mxn2(c.pago)} de interés al mes mientras deba ${mxn(p.monto)}.`
      : EXMODO === "capfijo" ? `Primer pago ${mxn2(c.filas[0]?.pago)} (${mxn2(c.filas[0]?.interes)} de interés + ${mxn(p.abono)} a capital). Termina en ${c.filas.length} meses, último pago ${mxn2(c.filas.at(-1)?.pago)}.`
      : EXMODO === "semanal" ? `${p.plazo} pagos semanales de ${mxn2(c.pago)}. Le resta pagar ${mxn2(c.total)}.`
      : `${p.plazo} pagos mensuales de ${mxn2(c.pago)}. Le resta pagar ${mxn2(c.total)}.`;
  };
  const setModo = (m) => {
    EXMODO = m;
    $("e-modo").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.em === m)));
    f.querySelectorAll("[data-f]").forEach((el) => (el.hidden = !EX_FIELDS[m].includes(el.dataset.f)));
    $("e-help").textContent = EX_HELP[m];
    $("e-pago-l").textContent = m === "semanal" ? "Pago semanal" : "Pago mensual acordado (opcional)";
    $("e-n-l").textContent = m === "semanal" ? "Semanas que le faltan" : "Meses que le faltan";
    if (!$("e-ini").dataset.touched) $("e-ini").value = plusDays(m === "semanal" ? 7 : 30);
    prev();
  };
  $("e-ini").addEventListener("change", () => ($("e-ini").dataset.touched = "1"));
  $("e-modo").querySelectorAll("button").forEach((b) => (b.onclick = () => setModo(b.dataset.em)));
  f.addEventListener("input", prev);
  setModo(EXMODO);
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = build(), nom = $("e-nom").value.trim();
    if (!nom || !p || !p.inicio) { $("e-err").hidden = false; $("e-err").textContent = "Completa el nombre, la fecha del próximo pago y los datos de cómo te paga."; return; }
    Object.assign(p, { cliente: nom, telefono: tel10($("e-tel").value), clienteUid: f.dataset.uid || "", clienteEmail: $("e-mail").value.trim().toLowerCase(),
      por: $("e-own")?.value || ME.uid, cotId: "", garantia: EXMODO === "semanal" ? "" : $("e-gar").value, desc: EXMODO === "semanal" ? "" : $("e-desc").value.trim(),
      existente: true, creado: new Date().toISOString() });
    if (!p.plazo) delete p.plazo;
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const ref = await addDoc(collection(db, "prestamos"), p);
      EXOPEN = false;
      notice(p.cliente, p.telefono, invMsg(p, ref.id), "Cliente agregado. Invítalo a ver su préstamo");
    } catch (er) { btn.disabled = false; $("e-err").hidden = false; $("e-err").textContent = "No se pudo guardar. Revisa tu conexión."; }
  });
}
let EDIT = "";
const ED_FIELDS = { interes: ["monto", "tasa", "gar"], capfijo: ["monto", "tasa", "abono", "gar"], garantia: ["monto", "tasa", "plazo", "fijo", "gar"], semanal: ["monto", "tasa", "plazo", "fijo"] };
function editForm(p) {
  const t = p.tipo || "garantia", eq = USERS.filter((u) => u.rol === "equipo"), f = (k) => (ED_FIELDS[t].includes(k) ? "" : " hidden");
  const money = (v) => (v || v === 0 ? Number(v).toLocaleString("es-MX") : "");
  return `<form class="edit" data-edf="${p.id}" novalidate>
    <h3>Editar préstamo</h3>
    <div class="row"><label>Cliente<input name="cliente" value="${esc(p.cliente || "")}"></label><label>WhatsApp<input name="telefono" inputmode="tel" value="${esc(p.telefono || "")}"></label></div>
    <div class="row"><label>Tipo<select name="tipo"><option value="interes"${t === "interes" ? " selected" : ""}>Solo interés</option><option value="capfijo"${t === "capfijo" ? " selected" : ""}>Interés + abono a capital</option><option value="garantia"${t === "garantia" ? " selected" : ""}>Pago fijo mensual</option><option value="semanal"${t === "semanal" ? " selected" : ""}>Semanal</option></select></label>
    ${isAdmin() ? `<label>Cartera de<select name="por"><option value="${ME.uid}">Mía</option>${eq.map((u) => `<option value="${u.uid}"${u.uid === p.por ? " selected" : ""}>${esc(u.nombre)}</option>`).join("")}</select></label>` : ""}</div>
    <div class="row"><label data-ef="monto">Monto (capital)<input name="monto" inputmode="decimal" value="${money(p.monto)}"></label>
    <label data-ef="tasa"><span>${t === "semanal" ? "Pago por cada $1,000" : "Interés mensual (%)"}</span><input name="tasa" inputmode="decimal" value="${p.tasa ?? ""}"></label></div>
    <div class="row"><label data-ef="plazo"${f("plazo")}><span>${t === "semanal" ? "Semanas" : "Meses"}</span><input name="plazo" inputmode="numeric" value="${p.plazo ?? ""}"></label>
    <label data-ef="fijo"${f("fijo")}>Pago acordado (opcional)<input name="pagoFijo" inputmode="decimal" value="${p.pagoFijo ?? ""}"></label>
    <label data-ef="abono"${f("abono")}>Abono a capital al mes<input name="abono" inputmode="decimal" value="${money(p.abono)}"></label></div>
    <label>Fecha del primer pago<input name="inicio" type="date" value="${p.inicio || ""}"></label>
    <div class="row" data-ef="gar"${f("gar")}><label>Garantía<select name="garantia"><option value="">Sin garantía</option>${Object.entries(GARANTIAS).map(([k, v]) => `<option value="${k}"${k === p.garantia ? " selected" : ""}>${v}</option>`).join("")}</select></label><label>Descripción<input name="desc" value="${esc(p.desc || "")}"></label></div>
    <p class="note">Los pagos registrados se conservan. Si cambias la fecha del primer pago, cambia todo el calendario.</p>
    <p class="err" hidden></p>
    <div class="actions"><button class="btn primary" type="submit">Guardar cambios</button><button class="btn" type="button" data-edit="${p.id}">Cancelar</button></div>
  </form>`;
}
function editHandlers() {
  const P = $("panel");
  const twice = (b, txt, fn) => (b.onclick = async () => { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = txt; return; } b.disabled = true; try { await fn(); } catch (e) { b.disabled = false; b.textContent = "No se pudo. Revisa tu conexión"; } });
  P.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => { EDIT = EDIT === b.dataset.edit ? "" : b.dataset.edit; vPrestamos(); }));
  P.querySelectorAll("[data-delp]").forEach((b) => twice(b, "Toca otra vez para borrarlo con todos sus pagos", async () => { await deleteDoc(doc(db, "prestamos", b.dataset.delp)); deleteDoc(doc(db, "repartos", b.dataset.delp)).catch(() => {}); OPEN = ""; EDIT = ""; }));
  repartoHandlers(twice);
  bindPayEdit(vPrestamos);
  P.querySelectorAll("[data-rmpay]").forEach((b) => twice(b, "¿Quitar?", async () => {
    const [id, i] = b.dataset.rmpay.split(":"), p = PRES.find((x) => x.id === id);
    await updateDoc(doc(db, "prestamos", id), { pagos: (p.pagos || []).filter((_, k) => k !== Number(i)) });
  }));
  P.querySelectorAll("form[data-edf]").forEach((f) => {
    const sel = f.querySelector("[name=tipo]");
    sel.onchange = () => {
      const t = sel.value;
      f.querySelectorAll("[data-ef]").forEach((el) => (el.hidden = !ED_FIELDS[t].includes(el.dataset.ef)));
      f.querySelector("[data-ef=tasa] span").textContent = t === "semanal" ? "Pago por cada $1,000" : "Interés mensual (%)";
      f.querySelector("[data-ef=plazo] span").textContent = t === "semanal" ? "Semanas" : "Meses";
    };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const g = (n) => f.querySelector(`[name=${n}]`)?.value ?? "", t = g("tipo"), err = f.querySelector(".err");
      const d = { cliente: g("cliente").trim(), telefono: tel10(g("telefono")), tipo: t, monto: num(g("monto")), tasa: num(g("tasa")), inicio: g("inicio"),
        plazo: ED_FIELDS[t].includes("plazo") ? parseInt(g("plazo"), 10) || 0 : null,
        pagoFijo: ED_FIELDS[t].includes("fijo") ? num(g("pagoFijo")) || null : null,
        abono: t === "capfijo" ? num(g("abono")) : null,
        garantia: ED_FIELDS[t].includes("gar") ? g("garantia") : "", desc: ED_FIELDS[t].includes("gar") ? g("desc").trim() : "" };
      if (isAdmin() && g("por")) d.por = g("por");
      const bad = !d.cliente || !d.monto || !d.inicio || (t === "capfijo" && !d.abono) || ((t === "garantia" || t === "semanal") && (!d.plazo || (!d.tasa && !d.pagoFijo))) || (t === "interes" && !d.tasa);
      if (bad) { err.hidden = false; err.textContent = "Revisa los datos: falta el cliente, el monto, la fecha o los datos de cómo paga."; return; }
      try { await updateDoc(doc(db, "prestamos", f.dataset.edf), d); EDIT = ""; vPrestamos(); }
      catch (er) { err.hidden = false; err.textContent = "No se pudo guardar. Revisa tu conexión."; }
    };
  });
}
/* ---------- Fondeo y comisiones ---------- */
const PAPEL = { fondeo: "Fondeó el dinero", comision: "Comisión" };
const BASE = { puntos: "puntos de interés al mes", pct: "% del interés cobrado", fijo: "fijo por pago" };
const persKey = (x) => x.uid || "n:" + (x.nombre || "").trim().toLowerCase();
const persName = (x) => (x.uid ? (x.uid === ME.uid ? "Yo" : USERS.find((u) => u.uid === x.uid)?.nombre || x.nombre || "Colaborador") : x.nombre);
function parteDe(r, x) {
  const p = r.p; let int = 0;
  if (x.base === "puntos") int = p.tipo !== "semanal" && p.tasa ? (r.interes * x.valor) / p.tasa : 0;
  else if (x.base === "pct") int = (r.interes * x.valor) / 100;
  else if (x.base === "fijo") int = r.interes > 0.005 ? x.valor : 0;
  int = Math.round(int * 100) / 100;
  const cap = x.capital ? r.capital : 0;
  return { int, cap, total: Math.round((int + cap) * 100) / 100 };
}
function repTxt(p, x) {
  const v = x.base === "fijo" ? mxn(x.valor) + " " + BASE.fijo : x.base === "puntos" ? x.valor + "% de " + p.tasa + "% al mes" : x.valor + BASE.pct;
  return `${esc(persName(x))} · ${PAPEL[x.papel]} · ${v}${x.capital ? " · recibe el capital" : ""}`;
}
let REPOPEN = "";
let RPEDIT = "";
function repartoBox(p) {
  const L = REP[p.id]?.participantes || [], eq = USERS.filter((u) => u.rol === "equipo");
  const ei = RPEDIT.startsWith(p.id + ":") ? Number(RPEDIT.split(":")[1]) : -1, ed = L[ei] || null;
  const sl = (a, b) => (a === b ? " selected" : "");
  const intShare = L.filter((x) => x.base !== "fijo").reduce((s, x) => s + (x.base === "puntos" ? (p.tasa ? (x.valor / p.tasa) * 100 : 0) : x.valor), 0);
  return `<details class="rep" data-repd="${p.id}"${REPOPEN === p.id ? " open" : ""}><summary>Fondeo y comisiones${L.length ? " (" + L.length + ")" : ""}</summary>
    <div class="list" style="margin-top:8px">${L.length ? L.map((x, i) => `<div class="item"><div class="item-top"><span>${repTxt(p, x)}</span><span><button class="link" type="button" data-reped="${p.id}:${i}">${RPEDIT === p.id + ":" + i ? "Cancelar" : "Editar"}</button> <button class="link del" type="button" data-reprm="${p.id}:${i}">Quitar</button></span></div></div>`).join("") : `<p class="muted">Sin reparto. Todo el interés de este préstamo es para ti.</p>`}</div>
    ${L.length && intShare ? `<p class="note">Del interés que pague el cliente: ${Math.round(intShare)}% se reparte y ${Math.max(0, Math.round(100 - intShare))}% queda para ti${L.some((x) => x.base === "fijo") ? " (antes de los pagos fijos)" : ""}.</p>` : ""}
    <form class="edit" data-repf="${p.id}" data-idx="${ei}" novalidate>
      ${ed ? `<h3>Editar a ${esc(persName(ed))}</h3>` : ""}
      <div class="row"><label>Persona<select name="uid"><option value="">Otra persona (escribe el nombre)</option>${eq.map((u) => `<option value="${u.uid}"${sl(u.uid, ed?.uid)}>${esc(u.nombre)}</option>`).join("")}</select></label>
      <label data-rn>Nombre<input name="nombre" placeholder="Ej. Mamá" value="${esc(ed && !ed.uid ? ed.nombre : "")}"></label></div>
      <div class="row"><label>Papel<select name="papel"><option value="fondeo">Fondeó el dinero</option><option value="comision"${sl("comision", ed?.papel)}>Comisión</option></select></label>
      <label>Cómo se calcula<select name="base">${p.tipo !== "semanal" ? `<option value="puntos">Le pago X% al mes (de los ${p.tasa}% que cobro)</option>` : ""}<option value="pct"${sl("pct", ed?.base)}>% del interés que cobro</option><option value="fijo"${sl("fijo", ed?.base)}>Monto fijo por cada pago</option></select></label></div>
      <div class="row"><label><span data-vl>Valor</span><input name="valor" inputmode="decimal" placeholder="Ej. 3" value="${ed ? ed.valor : ""}"></label>
      <label class="chk"><input type="checkbox" name="capital"${!ed || ed.capital ? " checked" : ""}> Se le regresa el capital que pague el cliente</label></div>
      <p class="err" hidden></p>
      <button class="btn sm primary" type="submit">${ed ? "Guardar cambios" : "Agregar al reparto"}</button>
    </form></details>`;
}
function repartoHandlers(twice) {
  const P = $("panel");
  P.querySelectorAll("details[data-repd]").forEach((d) => (d.ontoggle = () => { if (d.open) REPOPEN = d.dataset.repd; else if (REPOPEN === d.dataset.repd) REPOPEN = ""; }));
  P.querySelectorAll("[data-reprm]").forEach((b) => twice(b, "¿Quitar?", async () => {
    const [id, i] = b.dataset.reprm.split(":"); const L = (REP[id]?.participantes || []).filter((_, k) => k !== Number(i));
    await setDoc(doc(db, "repartos", id), { participantes: L });
  }));
  P.querySelectorAll("form[data-repf]").forEach((f) => {
    const g = (n) => f.querySelector(`[name=${n}]`);
    const sync = () => {
      f.querySelector("[data-rn]").hidden = !!g("uid").value;
      const b = g("base").value;
      f.querySelector("[data-vl]").textContent = b === "puntos" ? "Le pago (% al mes)" : b === "pct" ? "Porcentaje del interés" : "Monto por pago";
      g("valor").placeholder = b === "puntos" ? "Ej. 3" : b === "pct" ? "Ej. 25" : "Ej. 500";
    };
    g("uid").onchange = sync; g("base").onchange = sync;
    g("papel").onchange = () => { g("capital").checked = g("papel").value === "fondeo"; };
    P.querySelectorAll("[data-reped]").forEach((b) => (b.onclick = () => { RPEDIT = RPEDIT === b.dataset.reped ? "" : b.dataset.reped; REPOPEN = b.dataset.reped.split(":")[0]; vPrestamos(); }));
    sync();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const id = f.dataset.repf, uid = g("uid").value, nombre = uid ? USERS.find((u) => u.uid === uid)?.nombre || "" : g("nombre").value.trim(), valor = num(g("valor").value);
      const err = f.querySelector(".err");
      if (!nombre || !valor) { err.hidden = false; err.textContent = "Escribe el nombre y el valor."; return; }
      const x = { uid, nombre, papel: g("papel").value, base: g("base").value, valor, capital: g("capital").checked };
      REPOPEN = id;
      const L = (REP[id]?.participantes || []).slice(), idx = Number(f.dataset.idx);
      if (idx >= 0 && L[idx]) L[idx] = x; else L.push(x);
      RPEDIT = "";
      try { await setDoc(doc(db, "repartos", id), { participantes: L }); }
      catch (er) { err.hidden = false; err.textContent = "No se pudo guardar. Revisa tu conexión."; }
    };
  });
}

/* ---------- Cuentas (admin) ---------- */
let CU_MONTH = null, CU_OPEN = "", ENTEDIT = "";
function movimientos() {
  // Para cada pago, cuánto le toca a cada persona del reparto.
  const L = ledger(PRES), por = {};
  L.forEach((r) => {
    r.partes = (REP[r.p.id]?.participantes || []).map((x) => ({ x, ...parteDe(r, x) }));
    r.paraMi = Math.round((r.interes - r.partes.reduce((s, q) => s + q.int, 0)) * 100) / 100;
  });
  return L;
}
function vCuentas() {
  const base = CU_MONTH || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const y = base.getFullYear(), m = base.getMonth(), mes = iso(base).slice(0, 7);
  const L = movimientos(), LM = L.filter((r) => r.fecha.startsWith(mes));
  const sum = (l, f) => Math.round(l.reduce((s, r) => s + f(r), 0) * 100) / 100;
  const personas = {};
  const addP = (x, k, v) => { const key = persKey(x); personas[key] = personas[key] || { x, mesInt: 0, mesCap: 0, totInt: 0, totCap: 0, entregado: 0, entMes: 0 }; personas[key][k] += v; };
  L.forEach((r) => r.partes.forEach((q) => { addP(q.x, "totInt", q.int); addP(q.x, "totCap", q.cap); if (r.fecha.startsWith(mes)) { addP(q.x, "mesInt", q.int); addP(q.x, "mesCap", q.cap); } }));
  ENT.forEach((e) => { addP(e, "entregado", e.monto || 0); if ((e.fecha || "").startsWith(mes)) addP(e, "entMes", e.monto || 0); });
  const PL = Object.entries(personas).sort((a, b) => persName(a[1].x).localeCompare(persName(b[1].x)));
  const r2 = (n) => Math.round(n * 100) / 100;
  const entMes = ENT.filter((e) => (e.fecha || "").startsWith(mes)).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  $("panel").innerHTML = `
  <div class="card">
    <div class="head"><h2>Cuentas</h2><div class="actions"><button class="btn sm" type="button" id="cu-prev" aria-label="Mes anterior">‹</button><b style="align-self:center;min-width:120px;text-align:center">${base.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</b><button class="btn sm" type="button" id="cu-next" aria-label="Mes siguiente">›</button></div></div>
    <div class="facts"><div><span>Entró</span><b>${mxn2(sum(LM, (r) => r.monto))}</b></div><div><span>Capital</span><b>${mxn2(sum(LM, (r) => r.capital))}</b></div><div><span>Interés</span><b>${mxn2(sum(LM, (r) => r.interes))}</b></div></div>
    <div class="facts"><div><span>Para fondeadores y comisiones</span><b>${mxn2(sum(LM, (r) => r.partes.reduce((s, q) => s + q.total, 0)))}</b></div><div><span>Entregado este mes</span><b>${mxn2(sum(entMes, (e) => e.monto || 0))}</b></div><div><span>Tu ganancia (interés)</span><b>${mxn2(sum(LM, (r) => r.paraMi))}</b></div></div>
    <p class="note">El capital que entra de un préstamo fondeado por otra persona se le regresa a esa persona. Tu ganancia es el interés que queda después de fondeos y comisiones.</p>
  </div>
  <div class="card"><h2>Por persona</h2>
    ${PL.length ? `<div class="list">${PL.map(([k, o]) => {
      const gen = r2(o.totInt + o.totCap), pend = r2(gen - o.entregado);
      return `<div class="item"><div class="item-top"><b>${esc(persName(o.x))}</b><span>${pend > 0.5 ? `Le debes <b>${mxn2(pend)}</b>` : `<span class="pill ok">Al corriente</span>`}</span></div>
        <div class="item-mid">Este mes le toca ${mxn2(r2(o.mesInt + o.mesCap))}${o.mesCap ? ` (${mxn2(o.mesInt)} interés + ${mxn2(o.mesCap)} capital)` : ""} · Entregado este mes ${mxn2(o.entMes)}</div>
        <div class="item-bot"><span>Total generado ${mxn2(gen)} · Total entregado ${mxn2(o.entregado)}</span><button class="link" type="button" data-cuent="${esc(k)}">${CU_OPEN === k ? "Cerrar" : "Registrar entrega"}</button></div>
        ${CU_OPEN === k ? `<form class="row" data-entf="${esc(k)}" novalidate style="margin-top:6px"><label>Monto entregado<input name="m" inputmode="decimal" value="${pend > 0 ? pend : ""}"></label><label>Fecha<input name="f" type="date" value="${today()}"></label><label>Nota (opcional)<input name="n" placeholder="Ej. Transferencia"></label><button class="btn sm primary" type="submit">Guardar entrega</button></form>` : ""}
      </div>`;
    }).join("")}</div>` : `<p class="muted">Todavía no hay fondeadores ni comisiones. Para agregarlos, abre un préstamo en la pestaña Préstamos y entra a "Fondeo y comisiones".</p>`}
  </div>
  <div class="card"><h2>Entregas del mes</h2><div class="list">${entMes.length ? entMes.map((e) => `<div class="item"><div class="item-top"><b>${esc(persName(e))}</b><span>${mxn2(e.monto)}</span></div><div class="item-bot"><span>${fcorta(new Date(e.fecha + "T12:00:00"))}${e.nota ? " · " + esc(e.nota) : ""}</span><span><button class="link" type="button" data-ented="${e.id}">${ENTEDIT === e.id ? "Cancelar" : "Editar"}</button> <button class="link del" type="button" data-entrm="${e.id}">Borrar</button></span></div>
    ${ENTEDIT === e.id ? `<form class="row" data-entedf="${e.id}" novalidate style="margin-top:6px"><label>Monto<input name="m" inputmode="decimal" value="${e.monto}"></label><label>Fecha<input name="f" type="date" value="${e.fecha}"></label><label>Nota<input name="n" value="${esc(e.nota || "")}"></label><button class="btn sm primary" type="submit">Guardar</button></form>` : ""}</div>`).join("") : `<p class="muted">Sin entregas registradas este mes.</p>`}</div></div>
  <div class="card"><h2>Pagos del mes por préstamo</h2><div class="list">${LM.length ? LM.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).map((r) => `<div class="item owned" style="--own:${ownerColor(ownerOf(r.p))}"><div class="item-top"><b>${esc(r.p.cliente)}</b><span>${mxn2(r.monto)}</span></div>
      <div class="item-mid">${fcorta(new Date(r.fecha + "T12:00:00"))} · Capital ${mxn2(r.capital)} · Interés ${mxn2(r.interes)}</div>
      <div class="item-bot"><span>${r.partes.map((q) => esc(persName(q.x)) + " " + mxn2(q.total)).join(" · ")}${r.partes.length ? " · " : ""}Para ti ${mxn2(r.paraMi)}</span></div></div>`).join("") : `<p class="muted">Sin pagos este mes.</p>`}</div></div>`;
  $("cu-prev").onclick = () => { CU_MONTH = new Date(y, m - 1, 1); vCuentas(); };
  $("cu-next").onclick = () => { CU_MONTH = new Date(y, m + 1, 1); vCuentas(); };
  $("panel").querySelectorAll("[data-cuent]").forEach((b) => (b.onclick = () => { CU_OPEN = CU_OPEN === b.dataset.cuent ? "" : b.dataset.cuent; vCuentas(); }));
  $("panel").querySelectorAll("form[data-entf]").forEach((f) => (f.onsubmit = async (e) => {
    e.preventDefault();
    const o = personas[f.dataset.entf], mo = num(f.querySelector("[name=m]").value); if (!o || !mo) return;
    CU_OPEN = "";
    await addDoc(collection(db, "entregas"), { uid: o.x.uid || "", nombre: o.x.nombre || persName(o.x), monto: mo, fecha: f.querySelector("[name=f]").value || today(), nota: f.querySelector("[name=n]").value.trim(), reg: new Date().toISOString() });
  }));
  $("panel").querySelectorAll("[data-ented]").forEach((b) => (b.onclick = () => { ENTEDIT = ENTEDIT === b.dataset.ented ? "" : b.dataset.ented; vCuentas(); }));
  $("panel").querySelectorAll("form[data-entedf]").forEach((f) => (f.onsubmit = async (e) => {
    e.preventDefault(); const mo = num(f.querySelector("[name=m]").value); if (!mo) return;
    const id = f.dataset.entedf; ENTEDIT = "";
    await updateDoc(doc(db, "entregas", id), { monto: mo, fecha: f.querySelector("[name=f]").value || today(), nota: f.querySelector("[name=n]").value.trim() });
  }));
  $("panel").querySelectorAll("[data-entrm]").forEach((b) => (b.onclick = () => { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "¿Borrar?"; return; } deleteDoc(doc(db, "entregas", b.dataset.entrm)); }));
}
const cuotaLbl = (p, n, total) => (p.tipo === "interes" ? "Interés del mes " + n : (p.tipo === "semanal" ? "Semana " : "Mes ") + n + " de " + total);
const invLink = (id) => PORTAL() + "?nueva&inv=" + id;
function invMsg(p, id) {
  return `Hola ${p.cliente}, te saluda Entre Amigos.\n\nYa puedes consultar tu préstamo en línea desde tu celular:\n- Tus pagos, cuánto llevas y cuánto te resta\n- Si estás al corriente o tienes algún pago vencido\n- Tus próximas fechas de pago\n- Tus documentos\n\nY si necesitas otro préstamo, lo puedes pedir desde ahí mismo.\n\nCrea tu cuenta aquí (toma un minuto):\n${invLink(id || p.id)}\n\nCualquier duda, escríbenos por este medio.\n\nEntre Amigos`;
}
const debeDe = (p, a) => (p.tipo === "capfijo" || p.tipo === "interes" ? a.capital : a.restante);
function loanDesc(p, a) {
  const g = p.garantia ? (p.garantia === "ff" ? "Friends & family" : "Garantía " + (GARANTIAS[p.garantia] || "")) + (p.desc ? " (" + esc(p.desc) + ")" : "") : "";
  const parts = p.tipo === "interes" ? ["Solo interés", g, mxn(p.monto), "interés " + p.tasa + "% = " + mxn2(a.corrida.pago) + "/mes"]
    : p.tipo === "capfijo" ? ["Interés + capital", g, mxn(p.monto), p.tasa + "% + " + mxn(p.abono) + " a capital al mes"]
    : p.tipo === "semanal" ? ["Semanal", mxn(p.monto), "pago " + mxn2(a.corrida.pago)]
    : ["Mensual", g, mxn(p.monto), "pago " + mxn2(a.corrida.pago)];
  return parts.filter(Boolean).join(" · ");
}
function loanItem(p) {
  return `<div class="owned" style="--own:${ownerColor(ownerOf(p))}">` + loanItem0(p) + "</div>";
}
function loanItem0(p) {
  const a = avance(p), unidad = p.tipo === "semanal" ? "Semana" : "Mes";
  const SI = p.tipo === "interes";
  const pct = SI ? Math.min(100, Math.round((a.capPagado / p.monto) * 100)) : Math.min(100, Math.round((a.pagado / a.corrida.total) * 100));
  const venc = vencido(p, a);
  const rec = SI && a.siguiente ? `Hola ${p.cliente}, te recordamos tu pago de interés del mes por ${mxn2(a.siguiente.monto)}${a.siguiente.fecha ? ", con fecha " + fcorta(a.siguiente.fecha) : ""}. Tu capital pendiente es de ${mxn2(a.capital)}.\n\nEntre Amigos` : a.siguiente ? `Hola ${p.cliente}, te recordamos tu pago ${a.siguiente.n} de ${a.total} por ${mxn2(a.siguiente.monto)}${a.siguiente.fecha ? ", con fecha " + fcorta(a.siguiente.fecha) : ""}. Llevas ${mxn2(a.pagado)} pagados y ${p.tipo === "capfijo" ? "tu capital pendiente es de " + mxn2(a.capital) : "te restan " + mxn2(a.restante)}.\n\nEntre Amigos` : "";
  const open = OPEN === p.id, clientes = USERS.filter((u) => u.rol === "cliente");
  return `<div class="item">
    <div class="item-top"><b>${esc(p.cliente)}${isAdmin() && ownerOf(p) !== ME.uid ? ` <span class="pill">Cobra: ${esc(nameOf(ownerOf(p)))}</span>` : ""}</b><span>${a.liquidado ? `<span class="pill ok">Liquidado</span>` : venc ? `<span class="pill warn">Vencido ${mxn(venc)}</span>` : SI ? `Capital ${mxn(a.capital)}` : `${unidad} ${Math.min(a.cubiertos + 1, a.total)} de ${a.total}`}</span></div>
    <div class="item-mid">${loanDesc(p, a)}</div>
    <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <div class="item-bot"><span>${SI ? `Intereses pagados ${mxn2(a.pagado)} · Abonos a capital ${mxn2(a.capPagado)}${a.interesAdeudado ? " · Interés vencido " + mxn2(a.interesAdeudado) : ""}` : p.tipo === "capfijo" ? `Pagado ${mxn2(a.pagado)} · Capital pendiente ${mxn2(a.capital)}` : `Pagado ${mxn2(a.pagado)} · Resta ${mxn2(a.restante)}`}</span>${a.siguiente ? `<span>Próximo: ${mxn2(a.siguiente.monto)} ${a.siguiente.fecha ? "el " + fcorta(a.siguiente.fecha) : ""}</span>` : ""}</div>
    <div class="item-bot"><button class="link" type="button" data-open="${p.id}">${open ? "Cerrar" : "Registrar pago y más"}</button>${p.telefono && rec ? `<a href="${waTo(p.telefono, rec)}" target="_blank" rel="noopener">Recordatorio por WhatsApp</a>` : ""}${p.telefono && !p.clienteUid && !USERS.some((u) => p.clienteEmail && u.email === p.clienteEmail) ? `<a href="${waTo(p.telefono, invMsg(p))}" target="_blank" rel="noopener">Invitar a ver su préstamo</a>` : ""}${p.clienteUid || USERS.some((u) => p.clienteEmail && u.email === p.clienteEmail) ? `<span class="pill ok">Ve su avance</span>` : p.clienteEmail ? `<span class="pill">Aún no crea cuenta</span>` : ""}</div>
    ${open ? `<form data-pay="${p.id}" class="row" novalidate style="margin-top:8px">
        ${SI ? `<label>Concepto<select name="t"><option value="interes">Pago de interés</option><option value="capital">Abono a capital</option></select></label>` : ""}
        <label>Monto del pago<input name="m" inputmode="decimal" value="${a.siguiente ? a.siguiente.monto : ""}"></label>
        <label>Fecha<input name="f" type="date" value="${today()}"></label>
        <button class="btn primary" type="submit">Registrar pago</button>
        ${p.pagos?.length && isAdmin() ? `<button class="btn" type="button" data-undo="${p.id}">Borrar último pago</button>` : ""}
      </form>
      <label>Correo del cliente<input data-mail="${p.id}" type="email" value="${esc(p.clienteEmail || "")}" placeholder="cliente@correo.com"></label>
      <label${isAdmin() ? "" : " hidden"}>Cuenta del cliente<select data-link="${p.id}"><option value="">Sin cuenta</option>${clientes.map((u) => `<option value="${u.uid}"${u.uid === p.clienteUid ? " selected" : ""}>${esc(u.nombre)} · ${esc(u.email)}</option>`).join("")}</select></label>
      ${schedule(p, a, isAdmin())}
      ${isAdmin() ? `<div class="actions" style="margin-top:6px"><button class="btn sm" type="button" data-edit="${p.id}">${EDIT === p.id ? "Cerrar edición" : "Editar préstamo"}</button><button class="btn sm danger" type="button" data-delp="${p.id}">Borrar préstamo</button></div>
      ${EDIT === p.id ? editForm(p) : ""}` : ""}
      ${isAdmin() ? repartoBox(p) : ""}` : ""}
  </div>`;
}
let PEDIT = "";
function payForm(p, i) {
  const x = (p.pagos || [])[i]; if (!x) return "";
  return `<form class="edit" data-payedf="${p.id}:${i}" novalidate><h3>Corregir pago de ${esc(p.cliente)}</h3>
    <div class="row"><label>Monto<input name="m" inputmode="decimal" value="${x.monto}"></label><label>Fecha en que pagó<input name="f" type="date" value="${x.fecha}"></label></div>
    ${p.tipo === "interes" ? `<label>Concepto<select name="t"><option value="interes">Pago de interés</option><option value="capital"${x.tipo === "capital" ? " selected" : ""}>Abono a capital</option></select></label>` : ""}
    <label>Nota (opcional)<input name="n" value="${esc(x.nota || "")}"></label>
    <div class="actions"><button class="btn sm primary" type="submit">Guardar</button><button class="btn sm" type="button" data-payed="${p.id}:${i}">Cancelar</button></div></form>`;
}
function bindPayEdit(rerender) {
  const P = $("panel");
  P.querySelectorAll("[data-payed]").forEach((b) => (b.onclick = () => { PEDIT = PEDIT === b.dataset.payed ? "" : b.dataset.payed; rerender(); }));
  P.querySelectorAll("form[data-payedf]").forEach((f) => (f.onsubmit = async (e) => {
    e.preventDefault();
    const [id, i] = f.dataset.payedf.split(":"), p = PRES.find((x) => x.id === id), m = num(f.querySelector("[name=m]").value);
    if (!p || !m) return;
    const pagos = (p.pagos || []).slice(), x = { ...pagos[i], monto: m, fecha: f.querySelector("[name=f]").value || pagos[i].fecha, editado: new Date().toISOString(), editPor: ME.uid };
    const t = f.querySelector("[name=t]"); if (t) { if (t.value === "capital") x.tipo = "capital"; else delete x.tipo; }
    const n = f.querySelector("[name=n]").value.trim(); if (n) x.nota = n; else delete x.nota;
    pagos[Number(i)] = x; PEDIT = "";
    await updateDoc(doc(db, "prestamos", id), { pagos });
  }));
}
function schedule(p, a, edit) {
  const pagos = (p.pagos || []).map((x, i) => ({ ...x, i })).reverse();
  return `<details${edit && PEDIT.startsWith(p.id + ":") ? " open" : ""}><summary>Corrida y pagos</summary><div class="tbl"><table><tr><th>${p.tipo === "semanal" ? "Semana" : "Mes"}</th><th>Fecha</th><th>Pago</th><th>Estado</th></tr>${a.corrida.filas.map((f, i) => `<tr class="${i < a.cubiertos ? "done" : i === a.cubiertos ? "next" : ""}"><td>${f.n}</td><td>${fcorta(fechaPago(p.inicio, f.n, p.tipo))}</td><td>${mxn2(f.pago)}</td><td>${i < a.cubiertos ? "Pagado" : i === a.cubiertos ? "Siguiente" : ""}</td></tr>`).join("")}</table></div>${p.tipo === "interes" ? `<p class="note">Solo interés: cada mes se paga el interés sobre el capital pendiente. Los abonos a capital bajan el interés de los meses siguientes.</p>` : ""}
  ${pagos.length ? `<h3 style="margin-top:12px">Pagos recibidos</h3><div class="tbl"><table><tr><th>Fecha</th><th>Concepto</th><th>Monto</th>${edit ? "<th></th>" : ""}</tr>${pagos.map((x) => `<tr><td>${fcorta(new Date(x.fecha + "T12:00:00"))}</td><td>${x.tipo === "capital" ? "Abono a capital" : x.nota ? esc(x.nota) : p.tipo === "interes" ? "Interés" : "Pago"}</td><td>${mxn2(x.monto)}</td>${edit ? `<td><button class="link" type="button" data-payed="${p.id}:${x.i}">Editar</button> <button class="link del" type="button" data-rmpay="${p.id}:${x.i}">Quitar</button></td>` : ""}</tr>`).join("")}</table></div>${edit && PEDIT.startsWith(p.id + ":") ? payForm(p, Number(PEDIT.split(":")[1])) : ""}` : ""}</details>`;
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
      ${c.estado === "negado" && (mine || !c.aceptadoPor) ? `<p class="muted">Por el momento no nos es posible aprobar esta solicitud. Si quieres revisar otra opción, escríbenos por WhatsApp.</p>`
        : mine ? `<p class="ok">Confirmaste esta cotización. Te avisaremos por WhatsApp cuando tu préstamo esté listo y la fecha de tu primer pago.</p>`
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
function estadoPill(p, a) {
  if (a.liquidado) return `<span class="pill ok">Liquidado</span>`;
  return vencido(p, a) > 0.5 ? `<span class="pill warn">Pago vencido</span>` : `<span class="pill ok">Al corriente</span>`;
}
function vencBox(p, a) {
  const v = vencido(p, a);
  return v > 0.5 ? `<p class="err" style="margin:0">Tienes ${mxn2(v)} vencidos. Ponte al corriente o escríbenos si necesitas ayuda.</p>` : "";
}
function solicitudCard() {
  return `<form class="card" id="sol" novalidate><h2>${PRES.length ? "Pedir otro préstamo" : "Solicitar un préstamo"}</h2>
    <p class="muted">Cuéntanos qué necesitas y te mandamos tu cotización por WhatsApp.</p>
    <label for="s-monto">Monto que necesitas<input id="s-monto" inputmode="numeric" placeholder="Ej. 50,000"></label>
    <div class="row"><label for="s-plazo">Plazo<input id="s-plazo" inputmode="numeric" placeholder="Ej. 3"></label>
    <label for="s-uni">En<select id="s-uni"><option value="meses">Meses</option><option value="semanas">Semanas</option></select></label></div>
    <div class="row"><label for="s-gar">Garantía<select id="s-gar">${Object.entries(GARANTIAS).filter(([k]) => k !== "ff").map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}<option value="aval">Sin garantía (con aval)</option></select></label>
    <label for="s-desc">Descripción de la garantía<input id="s-desc" placeholder="Ej. Jetta 2019, Rolex Submariner"></label></div>
    <label for="s-nota">Comentarios (opcional)<input id="s-nota" placeholder="Ej. Lo necesito para el viernes"></label>
    <p class="err" id="s-err" hidden></p>
    <button class="btn primary" type="submit">Enviar solicitud por WhatsApp</button></form>`;
}
function solicitudForm() {
  const f = $("sol"); if (!f) return;
  $("s-monto").addEventListener("input", (e) => { const v = e.target.value.replace(/\D/g, ""); e.target.value = v ? Number(v).toLocaleString("es-MX") : ""; });
  f.onsubmit = (e) => {
    e.preventDefault();
    const m = num($("s-monto").value), n = parseInt($("s-plazo").value, 10) || 0, g = $("s-gar").value;
    if (!m || !n) { $("s-err").hidden = false; $("s-err").textContent = "Escribe el monto y el plazo."; return; }
    const gar = g === "aval" ? "Sin garantía (con aval)" : GARANTIAS[g] + ($("s-desc").value.trim() ? ": " + $("s-desc").value.trim() : "");
    const msg = `Hola, quiero solicitar ${PRES.length ? "otro " : "un "}préstamo.\n\nNombre: ${USER.nombre || ""}\nCorreo: ${ME.email || ""}${USER.telefono ? "\nWhatsApp: " + USER.telefono : ""}\nMonto: ${mxn(m)}\nPlazo: ${n} ${$("s-uni").value}\nPagos: ${$("s-uni").value === "semanas" ? "semanales" : "mensuales"}\nGarantía: ${gar}${$("s-nota").value.trim() ? "\nComentarios: " + $("s-nota").value.trim() : ""}`;
    window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  };
}
function vMis() {
  const ver = ME.emailVerified ? "" : `<div class="card"><h3>Confirma tu correo</h3><p class="muted">Te mandamos un enlace a ${esc(ME.email)}. Ábrelo para que aparezcan tus préstamos, y luego toca "Ya lo confirmé". Revisa también la carpeta de spam.</p><div class="actions"><button class="btn primary" type="button" id="b-ver">Ya lo confirmé</button><button class="btn" type="button" id="b-rev">Reenviar correo</button></div><p class="toast" id="ver-t"></p></div>`;
  setTimeout(() => {
    $("b-ver") && ($("b-ver").onclick = async () => { await ME.reload(); if (auth.currentUser.emailVerified) { await auth.currentUser.getIdToken(true); location.reload(); } else $("ver-t").textContent = "Todavía no aparece confirmado. Abre el enlace del correo e intenta de nuevo."; });
    $("b-rev") && ($("b-rev").onclick = () => sendEmailVerification(auth.currentUser).then(() => ($("ver-t").textContent = "Correo reenviado."), () => ($("ver-t").textContent = "Espera un momento antes de reenviar.")));
  });
  setTimeout(cotBox);
  setTimeout(() => { const f = $("my-tel"); if (f) f.onsubmit = async (e) => { e.preventDefault(); const t = tel10($("my-tel-i").value); if (t.length !== 10) return; await updateDoc(doc(db, "usuarios", ME.uid), { telefono: t }); USER.telefono = t; vMis(); }; });
  setTimeout(() => docsCard($("docs-box"), ME.uid, false));
  const telBox = USER.telefono ? "" : `<form class="card" id="my-tel" novalidate><h3>Agrega tu WhatsApp</h3><p class="muted">Para avisarte cuando tu préstamo esté listo o cuando revisemos tus documentos.</p><div class="row"><label for="my-tel-i">WhatsApp<input id="my-tel-i" type="tel" inputmode="tel" placeholder="33 1234 5678"></label><button class="btn primary" type="submit">Guardar</button></div></form>`;
  $("panel").innerHTML = ver + telBox + `<div id="cot-box" style="display:grid;gap:16px"></div>` + (PRES.length ? PRES.map((p) => {
    const a = avance(p), unidad = p.tipo === "semanal" ? "Semana" : "Mes";
    if (p.tipo === "interes") return `<div class="card">
      <div class="head"><h2>Préstamo de ${mxn(p.monto)}</h2>${estadoPill(p, a)}</div>${vencBox(p, a)}
      <p class="muted">Pagas cada mes el interés (${p.tasa}% mensual) sobre lo que debes. Puedes abonar a capital cuando quieras y tu interés baja.${p.desc ? " Garantía: " + esc(p.desc) + "." : ""}</p>
      ${a.siguiente ? `<div class="big"><span>Tu próximo pago de interés</span><b>${mxn2(a.siguiente.monto)}</b></div>${a.siguiente.fecha ? `<p>Fecha: <b>${fcorta(a.siguiente.fecha)}</b></p>` : ""}` : a.liquidado ? `<p class="ok">Liquidaste tu préstamo. Gracias por tu confianza.</p>` : ""}
      <div class="facts"><div><span>Capital pendiente</span><b>${mxn2(a.capital)}</b></div><div><span>Abonos a capital</span><b>${mxn2(a.capPagado)}</b></div><div><span>Intereses pagados</span><b>${mxn2(a.pagado)}</b></div></div>
      ${schedule(p, a)}
      <a class="btn" href="https://wa.me/${WA}?text=${encodeURIComponent("Hola, te envío el comprobante de mi pago.")}" target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a>
    </div>`;
    const pct = Math.min(100, Math.round((a.pagado / a.corrida.total) * 100));
    return `<div class="card">
      <div class="head"><h2>Préstamo de ${mxn(p.monto)}</h2>${estadoPill(p, a)}</div>${vencBox(p, a)}
      <p class="muted">${p.tipo === "semanal" ? `${a.total} pagos semanales` : p.tipo === "capfijo" ? `Pagas cada mes el interés (${p.tasa}% mensual) sobre lo que debes más un abono a capital de ${mxn(p.abono)}. Tu pago baja cada mes.${p.desc ? " Garantía: " + esc(p.desc) + "." : ""}` : `${a.total} pagos mensuales${p.desc ? " · Garantía: " + esc(p.desc) : ""}`}</p>
      ${a.siguiente ? `<div class="big"><span>Tu próximo pago · ${unidad} ${a.siguiente.n} de ${a.total}</span><b>${mxn2(a.siguiente.monto)}</b></div>${a.siguiente.fecha ? `<p>Fecha: <b>${fcorta(a.siguiente.fecha)}</b></p>` : ""}` : `<p class="ok">Liquidaste tu préstamo. Gracias por tu confianza.</p>`}
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <div class="facts"><div><span>Pagado</span><b>${mxn2(a.pagado)}</b></div>${p.tipo === "capfijo" ? `<div><span>Capital pendiente</span><b>${mxn2(a.capital)}</b></div>` : `<div><span>Te resta</span><b>${mxn2(a.restante)}</b></div>`}<div><span>Avance</span><b>${a.cubiertos} de ${a.total}</b></div></div>
      ${schedule(p, a)}
      <a class="btn" href="https://wa.me/${WA}?text=${encodeURIComponent("Hola, te envío el comprobante de mi pago.")}" target="_blank" rel="noopener">Enviar comprobante por WhatsApp</a>
    </div>`;
  }).join("") : `<div class="card"><h2>Mis préstamos</h2><p class="muted">Aquí verás tu préstamo, tus pagos y cuánto te resta en cuanto Entre Amigos lo registre. Si te llegó una invitación por WhatsApp, ábrela desde ese enlace.</p></div>`) + `<div id="docs-box"></div>` + solicitudCard();
  setTimeout(solicitudForm);
}

/* ---------- Personas (admin) ---------- */
const ROL = { cliente: "Cliente", equipo: "Colaborador (cotiza)", bloqueado: "Bloqueado" };
function vPersonas() {
  const order = { pendiente: 0, equipo: 1, cliente: 2, bloqueado: 3, admin: 4 };
  USERS.filter(isNew).forEach((u) => updateDoc(doc(db, "usuarios", u.uid), { visto: true }).catch(() => {}));
  const list = USERS.filter((u) => u.rol !== "admin").sort((a, b) => (order[a.rol] ?? 9) - (order[b.rol] ?? 9) || (a.nombre || "").localeCompare(b.nombre || ""));
  const link = SITE + "/clientes", linkC = SITE + "/colaboradores";
  const mC = `Hola, te comparto el enlace de Entre Amigos. Ahí creas tu cuenta y llenas tus datos. Desde ahí puedes subir tus documentos, ver tus préstamos y tus pagos, y pedir un préstamo:\n${link}\n\nCualquier duda, escríbenos.`;
  const mE = `Hola, te comparto el enlace para registrarte como colaborador de Entre Amigos. Crea tu cuenta con tus datos y en cuanto la apruebe vas a poder cotizar y llevar el control de tus clientes:\n${linkC}`;
  setTimeout(() => document.querySelectorAll("[data-cp]").forEach((b) => (b.onclick = () => navigator.clipboard?.writeText(b.dataset.cp === "c" ? link : linkC).then(() => (b.textContent = "Copiado")))));
  $("panel").innerHTML = `<div class="card">
    <h2>Invitar</h2>
    <p class="muted">Manda el enlace por WhatsApp. Cada persona crea su cuenta y llena sus datos. Los clientes entran directo y ven sus préstamos, sus pagos y sus documentos. Los colaboradores esperan a que tú los apruebes aquí.</p>
    <div class="item"><div class="item-top"><b>Clientes</b><span>${esc(link)}</span></div>
      <div class="actions"><a class="btn sm primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(mC)}">Mandar por WhatsApp</a><button class="btn sm" type="button" data-cp="c">Copiar enlace</button></div></div>
    <div class="item"><div class="item-top"><b>Colaboradores</b><span>${esc(linkC)}</span></div>
      <div class="actions"><a class="btn sm primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(mE)}">Mandar por WhatsApp</a><button class="btn sm" type="button" data-cp="e">Copiar enlace</button></div></div>
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
  $("panel").querySelectorAll("[data-ok]").forEach((b) => (b.onclick = async () => {
    await updateDoc(doc(db, "usuarios", b.dataset.ok), { rol: "equipo", solicita: "" });
    const u = USERS.find((x) => x.uid === b.dataset.ok) || {};
    notice(u.nombre || "", u.telefono, `Hola ${u.nombre || ""}, ya aprobé tu cuenta de colaborador en Entre Amigos. Ya puedes cotizar y llevar a tus clientes aquí:\n${PORTAL()}\n\nCualquier duda me dices.`, "Colaborador aprobado");
  }));
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
    const avisaDoc = (k, ok) => {
      if (!admin) return; const u = USERS.find((x) => x.uid === uid) || {};
      notice(u.nombre || "", u.telefono, ok ? `Hola ${u.nombre || ""}, ya revisamos tu ${DOCS[k]} y quedó aprobado. Gracias.\n\nEntre Amigos` : `Hola ${u.nombre || ""}, revisamos tu ${DOCS[k]} y necesitamos que lo subas de nuevo (no se ve bien o no es válido). Puedes hacerlo aquí:\n${PORTAL()}\n\nEntre Amigos`, ok ? "Documento aprobado" : "Documento rechazado");
    };
    box.querySelectorAll("[data-ap]").forEach((b) => (b.onclick = () => setEst(b.dataset.ap, "aprobado", "").then(() => avisaDoc(b.dataset.ap, true))));
    box.querySelectorAll("[data-rj]").forEach((b) => (b.onclick = () => setEst(b.dataset.rj, "rechazado", "Vuelve a subirlo, no se ve bien o no es válido.").then(() => avisaDoc(b.dataset.rj, false))));
  };
  let SEE = "";
  docsUnsub = onSnapshot(collection(db, "expedientes", uid, "archivos"), (snap) => { FILES = {}; snap.docs.forEach((d) => (FILES[d.id] = d.data())); render(); }, () => { box.innerHTML = ""; });
  render();
}


/* ---------- Agenda de cobranza (admin) ---------- */
let AG_DAY = "", AG_MONTH = null;
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
// Todas las cuotas de todos los préstamos con su estado.
function cuotas() {
  const out = [], hoy = today();
  visibles().forEach((p) => {
    if (!p.inicio) return;
    const a = avance(p); let acum = 0;
    a.corrida.filas.forEach((f) => {
      acum += f.pago;
      const fecha = iso(fechaPago(p.inicio, f.n, p.tipo));
      const pagada = a.pagado + 0.5 >= acum;
      const debe = pagada ? 0 : Math.round(Math.min(f.pago, acum - a.pagado) * 100) / 100;
      out.push({ p, n: f.n, total: a.total, monto: f.pago, debe, fecha, pagada, atrasada: !pagada && fecha < hoy, noPago: p.noPago?.[f.n] || "", restante: a.restante, pagado: a.pagado, capital: a.capital });
    });
  });
  return out;
}
function recMsg(c) {
  const atr = c.atrasada;
  if (c.p.tipo === "interes") return `Hola ${c.p.cliente}, ${atr ? "te recordamos que tu pago de interés por " + mxn2(c.debe) + " venció el " + fcorta(new Date(c.fecha + "T12:00:00")) + ". Por favor ponte al corriente o avísanos si necesitas ayuda." : "te recordamos tu pago de interés por " + mxn2(c.debe) + " con fecha " + fcorta(new Date(c.fecha + "T12:00:00")) + "."} Tu capital pendiente es de ${mxn2(c.capital)}.\n\nCuando pagues, mándanos tu comprobante por este medio.\n\nEntre Amigos`;
  return `Hola ${c.p.cliente}, ${atr ? "te recordamos que tu pago " + c.n + " de " + c.total + " por " + mxn2(c.debe) + " venció el " + fcorta(new Date(c.fecha + "T12:00:00")) + ". Por favor ponte al corriente o avísanos si necesitas ayuda." : "te recordamos tu pago " + c.n + " de " + c.total + " por " + mxn2(c.debe) + " con fecha " + fcorta(new Date(c.fecha + "T12:00:00")) + "."} Llevas ${mxn2(c.pagado)} pagados y ${c.p.tipo === "capfijo" ? "tu capital pendiente es de " + mxn2(c.capital) : "te restan " + mxn2(c.restante)}.\n\nCuando pagues, mándanos tu comprobante por este medio.\n\nEntre Amigos`;
}
const PAL = ["#b6e21f", "#4fc3f7", "#ff8a65", "#ba68c8", "#ffd54f", "#4db6ac", "#f06292", "#a1887f", "#90caf9", "#e57373"];
function ownerColor(uid) {
  if (!isAdmin()) return PAL[0];
  if (uid === ME.uid) return PAL[0];
  const team = USERS.filter((u) => u.rol === "equipo" || PRES.some((p) => ownerOf(p) === u.uid)).filter((u) => u.uid !== ME.uid).sort((a, b) => ((a.creado || "") < (b.creado || "") ? -1 : 1));
  const i = team.findIndex((u) => u.uid === uid);
  return PAL[1 + ((i < 0 ? team.length : i) % (PAL.length - 1))];
}
function legend() {
  if (!isAdmin()) return "";
  const ids = [...new Set(PRES.map(ownerOf))]; if (ids.length < 2) return "";
  return `<p class="legend">${ids.map((i) => `<span><i style="background:${ownerColor(i)}"></i>${esc(i === ME.uid ? "Mis clientes" : nameOf(i))}</span>`).join("")}</p>`;
}
function colabLink(c) {
  const u = USERS.find((x) => x.uid === ownerOf(c.p));
  if (!u?.telefono) return `<span class="muted">Cobra: ${esc(u?.nombre || "colaborador")} (sin WhatsApp)</span>`;
  const msg = `Hola ${u.nombre}, ${c.atrasada ? "tu cliente " + c.p.cliente + " tiene atrasado su pago (" + cuotaLbl(c.p, c.n, c.total) + ") por " + mxn2(c.debe) + " desde el " + fcorta(new Date(c.fecha + "T12:00:00")) + "." : "recuerda que tu cliente " + c.p.cliente + " tiene pago (" + cuotaLbl(c.p, c.n, c.total) + ") por " + mxn2(c.debe) + " el " + fcorta(new Date(c.fecha + "T12:00:00")) + "."} ¿Me ayudas a darle seguimiento?`;
  return `<a class="btn sm" href="${waTo(u.telefono, msg)}" target="_blank" rel="noopener">Avisar a ${esc(u.nombre)}</a>`;
}
function cuotaRow(c, showDate) {
  const key = c.p.id + ":" + c.n;
  const st = c.pagada ? `<span class="pill ok">Pagó</span>` : c.atrasada ? `<span class="pill warn">Atrasado</span>` : `<span class="pill">Pendiente</span>`;
  return `<div class="item owned" style="--own:${ownerColor(ownerOf(c.p))}">
    <div class="item-top"><b>${esc(c.p.cliente)}</b><span>${st}</span></div>
    <div class="item-mid">${cuotaLbl(c.p, c.n, c.total)} · ${mxn2(c.pagada ? c.monto : c.debe)}${showDate ? " · " + fcorta(new Date(c.fecha + "T12:00:00")) : ""}${c.noPago ? " · Marcado sin pago el " + fcorta(new Date(c.noPago + "T12:00:00")) : ""}</div>
    ${c.pagada ? "" : `<div class="item-bot">
      <button class="btn sm primary" type="button" data-pago="${key}">Sí pagó</button>
      <button class="btn sm" type="button" data-otro="${key}">Pagó otra cantidad</button>
      <button class="btn sm" type="button" data-nopago="${key}">No pagó</button>
      ${c.p.telefono ? `<a class="btn sm" href="${waTo(c.p.telefono, recMsg(c))}" target="_blank" rel="noopener">Recordatorio</a>` : `<span class="muted">Sin WhatsApp registrado</span>`}
      ${isAdmin() && ownerOf(c.p) !== ME.uid ? colabLink(c) : ""}
    </div>
    <form data-otrof="${key}" class="row" hidden novalidate style="margin-top:6px"><label>Monto recibido<input name="m" inputmode="decimal" value="${c.debe}"></label><button class="btn sm primary" type="submit">Registrar</button></form>`}
  </div>`;
}
// Todos los pagos registrados con su desglose (qué cuota cubrieron, capital e interés).
function ledger(list) {
  return (list || visibles()).flatMap((p) => desglosePagos(p).map((r) => ({ ...r, p, tarde: r.debia && r.fecha > r.debia ? Math.round((new Date(r.fecha + "T12:00:00") - new Date(r.debia + "T12:00:00")) / 864e5) : 0 })));
}
const fhora = (s) => { if (!s) return ""; const d = new Date(s); return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); };
function pagoRow(r) {
  const p = r.p, quien = r.regPor ? nameOf(r.regPor) : "";
  return `<div class="item owned" style="--own:${ownerColor(ownerOf(p))}">
    <div class="item-top"><b>${esc(p.cliente)}</b><span><b>${mxn2(r.monto)}</b></span></div>
    <div class="item-mid">Pagó el ${fcorta(new Date(r.fecha + "T12:00:00"))}${r.debia ? ` · Debía pagarse el ${fcorta(new Date(r.debia + "T12:00:00"))} (${cuotaLbl(p, r.n, avance(p).total)})` : r.tipo === "capital" ? " · Abono a capital" : ""}${r.nota ? " · " + esc(r.nota) : ""}
      ${r.debia ? (r.tarde > 0 ? ` <span class="pill warn">${r.tarde} ${r.tarde === 1 ? "día" : "días"} tarde</span>` : ` <span class="pill ok">A tiempo</span>`) : ""}</div>
    <div class="item-bot"><span>Registrado ${r.reg ? "el " + fhora(r.reg) : ""}${quien ? " por " + esc(quien) : ""}${r.editado ? " · Corregido el " + fhora(r.editado) : ""}</span><span>Capital ${mxn2(r.capital)} · Interés ${mxn2(r.interes)}</span></div>
  </div>`;
}
function vAgenda() {
  const all = cuotas(), hoy = today();
  const en7 = iso(new Date(Date.now() + 7 * 864e5));
  const atr = all.filter((c) => c.atrasada).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const deHoy = all.filter((c) => c.fecha === hoy);
  const prox = all.filter((c) => !c.pagada && c.fecha > hoy && c.fecha <= en7).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const LED = ledger();
  const sum = (l, k) => l.reduce((s, c) => s + (c[k] || 0), 0);
  // calendario del mes
  const base = AG_MONTH || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const y = base.getFullYear(), m = base.getMonth(), first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7; // lunes primero
  const mes = iso(first).slice(0, 7);
  const byDay = {}; all.forEach((c) => { if (c.fecha.startsWith(mes)) (byDay[c.fecha] = byDay[c.fecha] || []).push(c); });
  const rcv = {}; LED.forEach((r) => { if (r.fecha.startsWith(mes)) (rcv[r.fecha] = rcv[r.fecha] || []).push(r); });
  const delMes = LED.filter((r) => r.fecha.startsWith(mes)).sort((a, b) => (a.fecha === b.fecha ? ((a.reg || "") < (b.reg || "") ? 1 : -1) : a.fecha < b.fecha ? 1 : -1));
  let cells = ""; for (let i = 0; i < off; i++) cells += `<span></span>`;
  for (let d = 1; d <= days; d++) {
    const k = iso(new Date(y, m, d)), l = byDay[k] || [];
    const cls = !l.length ? "" : l.some((c) => c.atrasada) ? "late" : l.every((c) => c.pagada) ? "paid" : "due";
    cells += `<button type="button" class="day ${cls}${rcv[k] ? " rcv" : ""}${k === hoy ? " today" : ""}${k === AG_DAY ? " sel" : ""}" data-day="${k}">${d}${l.length ? `<i>${l.length}</i><u>${[...new Set(l.map((c) => ownerOf(c.p)))].slice(0, 4).map((o) => `<b style="background:${ownerColor(o)}"></b>`).join("")}</u>` : ""}</button>`;
  }
  const sel = AG_DAY ? all.filter((c) => c.fecha === AG_DAY) : [];
  $("panel").innerHTML = `
  <div class="card">
    <div class="head"><h2>Hoy · ${fcorta(new Date())}</h2>${ownerFilter(vAgenda)}</div>
    ${legend()}
    <div class="stats"><span class="stat"><b>${atr.length}</b> atrasados · <b>${mxn(sum(atr, "debe"))}</b></span><span class="stat"><b>${deHoy.filter((c) => !c.pagada).length}</b> por cobrar hoy</span><span class="stat"><b>${deHoy.filter((c) => c.pagada).length}</b> ya pagaron hoy</span><span class="stat"><b>${prox.length}</b> en los próximos 7 días</span></div>
  </div>
  ${atr.length ? `<div class="card"><h2>Atrasados</h2><div class="list">${atr.map((c) => cuotaRow(c, true)).join("")}</div></div>` : ""}
  <div class="card"><h2>Pagos de hoy</h2><div class="list">${deHoy.length ? deHoy.map((c) => cuotaRow(c, false)).join("") : `<p class="muted">No hay pagos programados para hoy.</p>`}</div></div>
  <div class="card"><h2>Próximos 7 días</h2><div class="list">${prox.length ? prox.map((c) => cuotaRow(c, true)).join("") : `<p class="muted">Sin pagos en los próximos 7 días.</p>`}</div></div>
  <div class="card">
    <div class="head"><h2>Calendario</h2><div class="actions"><button class="btn sm" type="button" id="m-prev" aria-label="Mes anterior">‹</button><b style="align-self:center;min-width:120px;text-align:center">${first.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</b><button class="btn sm" type="button" id="m-next" aria-label="Mes siguiente">›</button></div></div>
    <div class="cal"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>${cells}</div>
    <p class="note"><span class="dot due"></span> Por cobrar <span class="dot late"></span> Atrasado <span class="dot paid"></span> Todo pagado <span class="dot rcv"></span> Entró dinero ese día</p>
    ${AG_DAY ? `<h3>${fcorta(new Date(AG_DAY + "T12:00:00"))}</h3>
      ${sel.length ? `<p class="lbl">Pagos que tocaban ese día</p><div class="list">${sel.map((c) => cuotaRow(c, false)).join("")}</div>` : ""}
      ${(rcv[AG_DAY] || []).length ? `<p class="lbl">Pagos recibidos ese día</p><div class="list">${rcv[AG_DAY].map(pagoRow).join("")}</div>` : ""}
      ${!sel.length && !(rcv[AG_DAY] || []).length ? `<p class="muted">Sin movimientos ese día.</p>` : ""}` : `<p class="muted">Toca un día para ver qué pagos tocaban y cuáles se recibieron.</p>`}
  </div>
  <div class="card"><div class="head"><h2>Pagos recibidos en ${first.toLocaleDateString("es-MX", { month: "long" })}</h2></div>
    <div class="stats"><span class="stat">Total <b>${mxn2(sum(delMes, "monto"))}</b></span><span class="stat">Capital <b>${mxn2(sum(delMes, "capital"))}</b></span><span class="stat">Interés <b>${mxn2(sum(delMes, "interes"))}</b></span><span class="stat"><b>${delMes.filter((r) => r.tarde > 0).length}</b> pagaron tarde</span></div>
    <div class="list">${delMes.length ? delMes.map(pagoRow).join("") : `<p class="muted">Sin pagos registrados este mes.</p>`}</div></div>`;
  const find = (key) => { const [id, n] = key.split(":"); return all.find((c) => c.p.id === id && c.n === Number(n)); };
  const pay = (c, m) => updateDoc(doc(db, "prestamos", c.p.id), { pagos: arrayUnion({ monto: m, fecha: today(), reg: new Date().toISOString(), regPor: ME.uid }) });
  $("panel").querySelectorAll("[data-pago]").forEach((b) => (b.onclick = () => { b.disabled = true; pay(find(b.dataset.pago), find(b.dataset.pago).debe); }));
  $("panel").querySelectorAll("[data-otro]").forEach((b) => (b.onclick = () => { const f = $("panel").querySelector(`[data-otrof="${b.dataset.otro}"]`); f.hidden = !f.hidden; }));
  $("panel").querySelectorAll("form[data-otrof]").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); const m = num(f.querySelector("[name=m]").value); if (m) pay(find(f.dataset.otrof), m); }));
  $("panel").querySelectorAll("[data-nopago]").forEach((b) => (b.onclick = () => { const c = find(b.dataset.nopago); updateDoc(doc(db, "prestamos", c.p.id), { ["noPago." + c.n]: today() }); }));
  $("panel").querySelectorAll("[data-day]").forEach((b) => (b.onclick = () => { AG_DAY = AG_DAY === b.dataset.day ? "" : b.dataset.day; vAgenda(); }));
  $("m-prev").onclick = () => { AG_MONTH = new Date(y, m - 1, 1); AG_DAY = ""; vAgenda(); };
  $("m-next").onclick = () => { AG_MONTH = new Date(y, m + 1, 1); AG_DAY = ""; vAgenda(); };

}
