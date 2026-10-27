import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signOut, sendEmailVerification, deleteUser,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, onSnapshot, arrayUnion, deleteField, getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { num, mxn, mxn2, GARANTIAS, GN, corridaMensual, corridaSemanal, factorGarantia, fechaPago, fcorta, avance, avanceInteres, vencido, desglosePagos, estadoCuenta, liquidacion, pagosInversion } from "./calc.js?v=13";

const CONF = {
  apiKey: "AIzaSyDrp5lK7COul0RaI4nvN1vOx5sQ5tSJIW8",
  authDomain: "entre-amigos-financiera.firebaseapp.com",
  projectId: "entre-amigos-financiera",
  storageBucket: "entre-amigos-financiera.firebasestorage.app",
  messagingSenderId: "244817036834",
  appId: "1:244817036834:web:7dd1a54f4825a318a2ac7b",
};
const app = initializeApp(CONF);
const auth = getAuth(app);
auth.languageCode = "es";
// Al confirmar el correo o cambiar la contraseña, el cliente regresa directo a la app.
const ACS = { url: "https://ventaentreamigos.com/cotiza/?verificado=1" };
const db = getFirestore(app);

// Administradores: también están en las reglas de Firestore (las reglas son las que mandan).
const ADMINS = ["jesusreynosoalfaro@gmail.com"];
const WA = "523333063319";
// Aviso al celular del administrador (app gratuita ntfy, tema privado). Sin datos personales.
const AVISO = "https://ntfy.sh/entreamigos-avisos-7q4k9x2m";
const avisar = (titulo, msg) => fetch(AVISO, { method: "POST", body: msg, headers: { Title: titulo, Click: "https://ventaentreamigos.com/cotiza/", Tags: "bell" } }).catch(() => {});

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const plusDays = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
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
  $("l-pass2-l").hidden = !v;
  $("l-err").hidden = true;
}
// Ojito para ver u ocultar la contraseña (cambia las dos casillas a la vez).
document.querySelectorAll("[data-eye]").forEach((b) => (b.onclick = () => {
  const ver = b.getAttribute("aria-pressed") !== "true";
  document.querySelectorAll("[data-eye]").forEach((x) => { x.setAttribute("aria-pressed", String(ver)); x.setAttribute("aria-label", ver ? "Ocultar contraseña" : "Mostrar contraseña"); });
  ["l-pass", "l-pass2"].forEach((id) => ($(id).type = ver ? "text" : "password"));
}));
$("b-swap").onclick = () => { setSignup(!signup); if (typeof INV !== "undefined" && INV.length) $("l-tipo-w").hidden = true; };
let TIPO = "cliente";
function setTipo(t) { TIPO = t; document.querySelectorAll("#l-tipo button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tipo === t))); }
document.querySelectorAll("#l-tipo button").forEach((b) => (b.onclick = () => setTipo(b.dataset.tipo)));
const QS = new URLSearchParams(location.search);
var PEND_TEL_Q = "";
if (QS.has("nueva")) setSignup(true);
if (QS.get("tipo") === "colaborador") setTipo("colaborador");
if (QS.get("tipo") === "empresa") TIPO = "empresa";
const SOLQ = /^[A-Za-z0-9]{10,40}$/.test(QS.get("sol") || "") ? QS.get("sol") : "";
if (SOLQ || QS.get("nom")) {
  setSignup(true); $("l-tipo-w").hidden = true;
  $("l-sub").textContent = "Último paso: crea tu cuenta para dar seguimiento a tu solicitud, subir tus documentos y recibir tu cotización. Si ya tienes cuenta, toca \"Entra aquí\" abajo.";
  if (QS.get("nom")) $("l-nom").value = QS.get("nom").slice(0, 80);
  if (QS.get("tel")) { $("l-tel").value = QS.get("tel").replace(/\D/g, "").slice(-10); PEND_TEL_Q = $("l-tel").value; }
}
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
  if (signup && !nom) { showErr({ code: "x" }); $("l-err").textContent = "Escribe tu nombre completo."; return; }
  if (signup && pass !== $("l-pass2").value) { showErr({ code: "x" }); $("l-err").textContent = "Las contraseñas no coinciden. Escríbelas otra vez."; return; }
  if (signup && nom.split(/\s+/).length < 2) { showErr({ code: "x" }); $("l-err").textContent = "Escribe tu nombre completo: nombre y apellidos."; return; }
  $("b-login").disabled = true;
  try {
    if (signup) {
      PEND_NAME = nom; PEND_TEL = tel10($("l-tel").value);
      try {
        const c = await createUserWithEmailAndPassword(auth, mail, pass);
        await updateProfile(c.user, { displayName: nom });
        sendEmailVerification(c.user, ACS).catch(() => sendEmailVerification(c.user).catch(() => {}));
      } catch (err) {
        if (err.code !== "auth/email-already-in-use") throw err;
        // El correo ya tenía cuenta: si el administrador la borró, se elimina y se crea de nuevo.
        RECREATE = { mail, pass, nom, tel: PEND_TEL };
        try { await signInWithEmailAndPassword(auth, mail, pass); }
        catch (e2) { RECREATE = null; showErr({ code: "x" }); $("l-err").textContent = "Ese correo ya tiene una cuenta. Toca \"Entra aquí\" abajo, o \"Olvidé mi contraseña\" si no la recuerdas."; }
      }
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
  try { await sendPasswordResetEmail(auth, mail, { url: "https://ventaentreamigos.com/cotiza/" }).catch(() => sendPasswordResetEmail(auth, mail)); $("l-err").hidden = false; $("l-err").className = "ok"; $("l-err").textContent = "Te mandamos un correo para cambiar tu contraseña."; }
  catch (err) { showErr(err); }
};
$("b-out").onclick = () => signOut(auth);

/* ---------------- Sesión ---------------- */
let ME = null, USER = null, unsubs = [], PEND_NAME = "", PEND_TEL = "", RECREATE = null, AVISO_BORRADO = "";
const isAdmin = () => !!ME && ADMINS.includes((ME.email || "").toLowerCase());
const isTeam = () => isAdmin() || USER?.rol === "equipo";

async function ensureUser(u, nombre) {
  const ref = doc(db, "usuarios", u.uid);
  const s = await getDoc(ref);
  if (s.exists()) return s.data();
  const d = { nombre: nombre || PEND_NAME || u.displayName || (u.email || "").split("@")[0], email: (u.email || "").toLowerCase(), rol: ADMINS.includes((u.email || "").toLowerCase()) ? "admin" : "cliente", solicita: TIPO === "colaborador" ? "equipo" : TIPO === "empresa" ? "empresa" : "", telefono: PEND_TEL || PEND_TEL_Q || "", creado: new Date().toISOString() };
  await setDoc(ref, d);
  if (d.rol !== "admin" && d.solicita === "empresa") avisar("Empresa interesada en convenio", (d.nombre || "Alguien") + " creó su cuenta desde Convenios para empresas. Revísalo en Personas.");
  else if (d.rol !== "admin") avisar(d.solicita === "equipo" ? "Nuevo colaborador por aprobar" : "Nuevo cliente registrado", d.solicita === "equipo" ? "Alguien pidió acceso como colaborador. Revísalo en Personas." : "Se creó una cuenta de cliente nueva en la app.");
  return d;
}

onAuthStateChanged(auth, async (u) => {
  unsubs.forEach((f) => f()); unsubs = [];
  ME = u; USER = null;
  $("b-out").hidden = !u;
  if (!u) {
    $("who").textContent = "Préstamos y cotizaciones"; show("v-login");
    if (AVISO_BORRADO) { setSignup(true); $("l-tipo-w").hidden = true; $("l-mail").value = AVISO_BORRADO; $("l-err").hidden = false; $("l-err").className = "ok"; $("l-err").textContent = "Tu cuenta anterior fue eliminada. Crea una cuenta nueva (o toca Continuar con Google)."; AVISO_BORRADO = ""; }
    return;
  }
  show("v-load");
  // Si el administrador borró esta cuenta, se elimina el acceso por completo y la persona puede registrarse de nuevo.
  const em = (u.email || "").toLowerCase();
  if (em && !ADMINS.includes(em)) {
    let fl = null; try { fl = await getDoc(doc(db, "borrados", em)); } catch (e) {}
    if (fl && fl.exists()) {
      await deleteDoc(doc(db, "borrados", em)).catch(() => {});
      const R = RECREATE; RECREATE = null;
      if (!R) AVISO_BORRADO = u.email || "";
      try { await deleteUser(u); } catch (e) { await signOut(auth).catch(() => {}); }
      if (R && R.mail.toLowerCase() === em) {
        try { PEND_NAME = R.nom; PEND_TEL = R.tel; const c = await createUserWithEmailAndPassword(auth, R.mail, R.pass); await updateProfile(c.user, { displayName: R.nom }); sendEmailVerification(c.user, ACS).catch(() => sendEmailVerification(c.user).catch(() => {})); }
        catch (e) { showErr(e); }
      }
      return;
    }
  }
  RECREATE = null;
  try { USER = await ensureUser(u); } catch (e) { USER = { rol: "cliente", nombre: u.displayName || "" }; }
  $("who").textContent = (USER.nombre || u.email) + " · " + (isAdmin() ? "Administrador" : USER.rol === "empresa" ? "Administradora de empresa" : USER.inversionista ? "Inversionista" : USER.rol === "equipo" ? "Colaborador" : "Cliente");
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
  if (!isAdmin() && !["equipo", "cliente", "empresa"].includes(USER.rol)) {
    $("pausa-nom").textContent = USER.nombre || "";
    $("p-wa").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Hola, mi cuenta de Entre Amigos (" + (u.email || "") + ") aparece inactiva. ¿Me ayudan?");
    show("v-pend");
    return;
  }
  // Si el administrador cambia el tipo de acceso, la pantalla se actualiza sola.
  unsubs.push(onSnapshot(doc(db, "usuarios", u.uid), (s) => { const d = s.data() || {}; if (USER && !isAdmin() && ((d.rol && d.rol !== USER.rol) || !!d.convenioOk !== !!USER.convenioOk || (d.solicita || "") !== (USER.solicita || ""))) location.reload(); }, () => {}));
  startApp();
});

/* ---------------- App ---------------- */
let TAB = "";
const TABS = () => isAdmin()
  ? [["agenda", "Agenda"], ["cotizar", "Cotizar"], ["cotizaciones", "Cotizaciones"], ["prestamos", "Préstamos"], ["empresas", "Empresas"], ["autos", "Autos ofrecidos"], ["cuentas", "Inversionistas"], ["personas", "Personas"], ["tasas", "Ajustes"]]
  : USER?.rol === "empresa" ? [["emp", "Mi empresa"]]
  : (USER?.inversionista ? [["inv", "Mi inversión"]] : []).concat(isTeam() ? [["agenda", "Agenda"], ["cotizar", "Cotizar"], ["cotizaciones", "Mis cotizaciones"], ["prestamos", "Mis clientes"]]
  : (USER?.inversionista && !PRES.length ? [] : [["mis", "Mis préstamos"]]));

let VIS = {}, EMPS = [], MIEMP = null;
let CFG = {}, COTS = [], PRES = [], USERS = [], PSRC = {}, REP = {}, ENT = [], SOLS = [], VENTAS = [];
function startApp() {
  show("v-app");
  if (isTeam()) unsubs.push(onSnapshot(doc(db, "config", "tasas"), (s) => { CFG = s.data() || {}; if (TAB === "cotizar" && !touched) applyCfg(); if (TAB === "tasas") draw(); }, () => {}));
  const qc = isAdmin() ? collection(db, "cotizaciones") : isTeam() ? query(collection(db, "cotizaciones"), where("por", "==", ME.uid)) : null;
  if (qc) unsubs.push(onSnapshot(qc, (s) => { COTS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); if (TAB === "cotizaciones") draw(); drawTabs(); }, () => {}));
  const setPres = () => { const m = {}; Object.values(PSRC).forEach((l) => l.forEach((x) => (m[x.id] = x))); PRES = Object.values(m).sort((a, b) => (a.creado < b.creado ? 1 : -1)); if (TAB === "prestamos" || TAB === "mis" || TAB === "agenda") draw(); if (!isAdmin()) drawTabs(); };
  const listenP = (key, q) => unsubs.push(onSnapshot(q, (s) => { PSRC[key] = s.docs.map((d) => ({ id: d.id, ...d.data() })); setPres(); }, () => {}));
  if (isAdmin()) unsubs.push(onSnapshot(query(collection(db, "comprobantes"), where("estado", "==", "por revisar")), (s) => { AVIS = {}; s.docs.forEach((d) => { const x = d.data(); AVIS[x.pid] = (AVIS[x.pid] || 0) + 1; }); if (TAB === "prestamos") draw(); }, () => {}));
  if (isAdmin()) getDoc(doc(db, "config", "reglas")).then((x) => { RULES_CUR = x.exists() ? x.data().v || 0 : 0; drawRulesBanner(); }).catch(() => { RULES_CUR = 0; drawRulesBanner(); });
  if (isAdmin()) getDoc(doc(db, "config", "convenioInfo")).then((x) => { if (!x.exists() || x.data().v !== CONV_V) setDoc(doc(db, "config", "convenioInfo"), { v: CONV_V, html: CONV_HTML }); }).catch(() => {});
  if (isAdmin()) { listenP("all", collection(db, "prestamos")); unsubs.push(onSnapshot(collection(db, "altas"), (s) => { ALTAS = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (TAB === "empresas") draw(); }, () => {})); unsubs.push(onSnapshot(collection(db, "empresas"), (s) => { EMPS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.nombre.localeCompare(b.nombre)); if (TAB === "empresas" || TAB === "prestamos") draw(); }, () => {})); }
  else if (USER.rol === "empresa" && USER.empresa) {
    listenP("emp", query(collection(db, "prestamos"), where("empresa", "==", USER.empresa)));
    unsubs.push(onSnapshot(query(collection(db, "solicitudes"), where("empresa", "==", USER.empresa)), (s) => { SOLS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); if (TAB === "emp") draw(); }, () => {}));
    unsubs.push(onSnapshot(query(collection(db, "altas"), where("empresa", "==", USER.empresa)), (s) => { ALTAS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); if (TAB === "emp") draw(); }, () => {}));
    unsubs.push(onSnapshot(doc(db, "empresas", USER.empresa), (s) => { MIEMP = s.exists() ? { id: s.id, ...s.data() } : null; if (TAB === "emp") draw(); }, () => {}));
  }
  else if (isTeam()) listenP("mine", query(collection(db, "prestamos"), where("por", "==", ME.uid)));
  else if (USER.rol === "cliente") {
    INV.forEach((id) => updateDoc(doc(db, "prestamos", id), { clienteUid: ME.uid }).then(async () => {
      if (USER.telefono) return;
      const s = await getDoc(doc(db, "prestamos", id)); const t = s.data()?.telefono;
      if (t) { await updateDoc(doc(db, "usuarios", ME.uid), { telefono: t }); USER.telefono = t; if (TAB === "mis") draw(); }
    }).catch(() => {}));
    if (SOLQ) updateDoc(doc(db, "solicitudes", SOLQ), { uid: ME.uid, email: (ME.email || "").toLowerCase() }).catch(() => {});
    if (INV.length || SOLQ) history.replaceState(null, "", location.pathname);
    listenP("uid", query(collection(db, "prestamos"), where("clienteUid", "==", ME.uid)));
    unsubs.push(onSnapshot(query(collection(db, "cotizaciones"), where("aceptadoPor", "==", ME.uid)), (s) => { MYCOTS = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (TAB === "mis") cotBox(); }, () => {}));
    if (ME.emailVerified && ME.email) listenP("mail", query(collection(db, "prestamos"), where("clienteEmail", "==", ME.email.toLowerCase())));
  }
  if (isAdmin()) {
    unsubs.push(onSnapshot(collection(db, "repartos"), (s) => { REP = {}; s.docs.forEach((d) => (REP[d.id] = d.data())); if (TAB === "cuentas" || TAB === "prestamos") draw(); }, () => {}));
    unsubs.push(onSnapshot(collection(db, "solicitudes"), (s) => { SOLS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); drawTabs(); if (TAB === "cotizaciones" || TAB === "agenda") draw(); }, () => {}));
    unsubs.push(onSnapshot(collection(db, "ventas"), (s) => { VENTAS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); drawTabs(); if (TAB === "autos" || TAB === "agenda") draw(); }, () => {}));
    unsubs.push(onSnapshot(collection(db, "entregas"), (s) => { ENT = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (TAB === "cuentas") draw(); }, () => {}));
    unsubs.push(onSnapshot(collection(db, "invcfg"), (s) => { INVCFG = {}; s.docs.forEach((d) => (INVCFG[d.id] = d.data())); if (TAB === "cuentas") draw(); else syncSoon(); }, () => {}));
    unsubs.push(onSnapshot(collection(db, "inversiones"), (s) => { INVS = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (TAB === "cuentas") draw(); drawInvAlert(); }, () => {}));
    unsubs.push(onSnapshot(collection(db, "solinv"), (s) => { SOLINV = s.docs.map((d) => ({ id: d.id, ...d.data() })); if (TAB === "cuentas") draw(); drawInvAlert(); }, () => {}));
  }
  if (isAdmin()) unsubs.push(onSnapshot(collection(db, "visitas"), (s) => { VIS = {}; s.docs.forEach((d) => (VIS[d.id] = d.data())); loadAutos().then(() => { if (TAB === "agenda") draw(); }); }, () => {}));
  if (isAdmin()) unsubs.push(onSnapshot(collection(db, "usuarios"), (s) => { USERS = s.docs.map((d) => ({ uid: d.id, ...d.data() })); if (TAB === "personas" || TAB === "prestamos" || TAB === "agenda") draw(); drawTabs(); }, () => {}));
  go(TABS()[0][0]);
}
const isNew = (u) => u.rol !== "admin" && u.creado && Date.now() - new Date(u.creado).getTime() < 3 * 864e5 && !u.visto;
function drawTabs() {
  const pend = USERS.filter((u) => isNew(u) || (u.rol === "cliente" && u.solicita === "equipo")).length;
  const conf = COTS.filter((c) => c.aceptadoPor && !PRES.some((p) => p.cotId === c.id)).length + SOLS.filter((x) => x.estado === "nueva").length;
  $("tabs").innerHTML = TABS().map(([k, t]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${k === TAB}">${t}${k === "personas" && pend ? " (" + pend + ")" : ""}${k === "cotizaciones" && conf ? " (" + conf + ")" : ""}${k === "autos" && VENTAS.some((v) => v.estado === "nueva") ? " (" + VENTAS.filter((v) => v.estado === "nueva").length + ")" : ""}</button>`).join("");
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-t]"); if (b) go(b.dataset.t); });
function go(t) { TAB = t; drawTabs(); draw(); window.scrollTo(0, 0); }
let NOTICE = null;
function notice(nombre, tel, msg, titulo, mail) {
  NOTICE = { nombre, tel: tel10(tel).length === 10 ? tel : "", msg, titulo, mail: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail || "") ? mail : "" };
  drawNotice(); window.scrollTo(0, 0);
}
function drawNotice() {
  const n = NOTICE, box = $("notice"); if (!box) return;
  if (!n) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="card notice"><h3>${esc(n.titulo)}</h3>
    <p class="muted">${n.tel ? "Avísale a " + esc(n.nombre) + (n.mail ? " por WhatsApp o por correo:" : " por WhatsApp con un toque:") : n.mail ? "Avísale a " + esc(n.nombre) + " por correo:" : esc(n.nombre) + " no tiene WhatsApp registrado. Copia el mensaje y mándaselo:"}</p>
    <pre>${esc(n.msg)}</pre>
    <div class="actions">${n.tel ? `<a class="btn primary" href="${waTo(n.tel, n.msg)}" target="_blank" rel="noopener" id="n-wa">Avisar por WhatsApp</a>` : ""}${n.mail ? `<a class="btn" href="mailto:${encodeURIComponent(n.mail)}?subject=${encodeURIComponent("Tu préstamo con Entre Amigos")}&body=${encodeURIComponent(n.msg)}">Mandar por correo</a>` : ""}<button class="btn" type="button" id="n-copy">Copiar</button><button class="link" type="button" id="n-x">Cerrar</button></div></div>`;
  $("n-x").onclick = () => { NOTICE = null; drawNotice(); };
  $("n-wa") && $("n-wa").addEventListener("click", () => setTimeout(() => { NOTICE = null; drawNotice(); }, 800));
  $("n-copy").onclick = () => navigator.clipboard?.writeText(n.msg).catch(() => {});
}
const PORTAL = () => location.origin + location.pathname;
function draw() { if (isAdmin()) { syncSoon(); drawInvAlert(); } const f = { emp: vEmp, empresas: vEmpresas, inv: vInv, agenda: vAgenda, cotizar: vCotizar, cotizaciones: vCotizaciones, prestamos: vPrestamos, autos: vAutos, cuentas: vCuentas, personas: vPersonas, tasas: vTasas, mis: vMis }[TAB]; f && f(); }
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
let COV = "", COV_OK_ONCE = "";
// "Sin garantía" y "Friends & family" solo los decide el administrador.
const garOpts = (sel) => Object.entries(GARANTIAS).filter(([k]) => isAdmin() || (k !== "ff" && k !== "sin")).map(([k, v]) => `<option value="${k}"${k === sel ? " selected" : ""}>${v}</option>`).join("");
// Regla de garantía 2 a 1 (3 a 1 arriba de 12 meses): los colaboradores no pueden enviar si no se cumple; el administrador confirma con un segundo toque.
function covGuard() {
  if (!COV) return true;
  const t = $("r-toast");
  if (!isAdmin()) { t.textContent = COV + " Ajusta el monto o el valor para poder enviarla."; t.className = "toast err"; return false; }
  if (COV_OK_ONCE === curKey + COV) return true;
  COV_OK_ONCE = curKey + COV; t.className = "toast err"; t.textContent = COV + " Toca otra vez para enviarla de todos modos."; return false;
}
let MODE = "garantia", touched = false, LAST = null, lastKey = "", curKey = "", CUR_REF = null, EDIT_COT = null, EDIT_PEND = false;
function editarCot(c) {
  if (!canEditCot(c)) return;
  EDIT_COT = c; EDIT_PEND = true; MODE = c.tipo === "semanal" ? "semanal" : "garantia"; go("cotizar");
}
function vCotizar() {
  touched = false; SOL_ID = "";
  if (!EDIT_PEND) EDIT_COT = null; EDIT_PEND = false;
  if (MODE === "auto") return vCotAuto();
  $("panel").innerHTML = `
  <div class="card">
    <div class="seg"><button type="button" data-m="garantia" aria-pressed="${MODE === "garantia"}">Con garantía</button><button type="button" data-m="semanal" aria-pressed="${MODE === "semanal"}">Semanal con aval</button><button type="button" data-m="auto" aria-pressed="false">Auto del inventario</button></div>
    ${EDIT_COT ? `<div class="cov ok" style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span>Editando la cotización de <b>${esc(EDIT_COT.cliente || "")}</b>${EDIT_COT.estado === "borrador" ? " (borrador, todavía no se envía)" : ""}.</span><button class="btn sm" type="button" id="q-cancel">Cancelar edición</button></div>` : ""}
    <form id="fq" novalidate>
      <p class="step">1. Cliente</p>
      ${EDIT_COT ? "" : pickCliente("q")}
      <div class="row"><label for="q-nom">Nombre completo del cliente<input id="q-nom" autocomplete="off" placeholder="Nombre y apellidos"></label>
      <label for="q-tel">WhatsApp del cliente<input id="q-tel" inputmode="tel" autocomplete="off" placeholder="33 1234 5678"></label></div>
      <p class="step">2. Condiciones</p>
      <div class="row"><label for="q-monto">Monto a prestar (MXN)<input id="q-monto" inputmode="numeric" value="${MODE === "garantia" ? "100,000" : "10,000"}"></label>
      ${MODE === "garantia"
        ? `<label for="q-tasa">Interés mensual (%)<input id="q-tasa" inputmode="decimal" value="5"></label></div>
      <div class="row"><label for="q-gar">Garantía<select id="q-gar">${garOpts()}</select></label>
      <label for="q-desc">Descripción<input id="q-desc" autocomplete="off" placeholder="Ej. Jetta 2019"></label></div>
      <div class="row"><label for="q-plazo">Plazo (meses)<input id="q-plazo" inputmode="numeric" value="12"></label>
      <label for="q-val">Valor de la garantía<input id="q-val" inputmode="numeric" placeholder="Ej. 250,000"></label></div>
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
    <p class="step">3. Revisa y envía</p>
    <div class="actions"><button class="btn primary" type="button" id="b-img">Enviar con imagen de la corrida</button><a class="btn" id="b-wa" href="#" target="_blank" rel="noopener">Solo texto por WhatsApp</a><button class="btn" type="button" id="b-copy">Copiar</button><button class="btn" type="button" id="b-draft">${EDIT_COT && EDIT_COT.estado !== "borrador" ? "Guardar cambios" : "Guardar sin enviar"}</button></div>
    <p class="note" style="margin:0">"Enviar con imagen" abre el menú de compartir de tu iPhone: elige WhatsApp y luego al cliente. Le llega la imagen con la corrida y el mensaje.</p>
    <p class="toast" id="r-toast"></p>
    <details><summary>Ver imagen que se envía</summary><img id="r-img" alt="Imagen de la cotización" style="width:100%;border-radius:10px;margin-top:8px"></details>
    <details><summary>Ver corrida completa</summary><div class="tbl"><table id="r-tbl"></table></div></details>
    <details><summary>Mensaje que se envía</summary><pre id="r-msg"></pre></details>
    <p class="note">Las cotizaciones que envías o copias se guardan en tu historial.</p>
  </div>`;
  $("panel").querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { MODE = b.dataset.m; EDIT_PEND = !!EDIT_COT && b.dataset.m !== "auto"; vCotizar(); }));
  $("q-cancel") && ($("q-cancel").onclick = () => { EDIT_COT = null; go("cotizaciones"); });
  ["q-monto", "q-val"].forEach((id) => $(id)?.addEventListener("input", (e) => { const d = e.target.value.replace(/\D/g, ""); e.target.value = d ? Number(d).toLocaleString("es-MX") : ""; }));
  $("fq").addEventListener("input", (e) => { if (["q-tasa", "q-fac", "q-sem"].includes(e.target.id)) touched = true; if (e.target.id === "q-plazo") e.target.dataset.t = "1"; calc(); });
  $("fq").addEventListener("change", (e) => { if (e.target.id === "q-gar" || e.target.id === "q-plazo") { if (e.target.id === "q-gar") { $("q-desc").placeholder = { auto: "Ej. Jetta 2019", reloj: "Ej. Rolex Submariner", oro: "Ej. Esclava 14k, 30 g", monedas: "Ej. 5 centenarios", otro: "Describe la prenda", ff: "Garantía acordada (opcional)" }[e.target.value]; touched = false; applyCfg(); } } calc(); });
  $("fq").addEventListener("submit", (e) => e.preventDefault());
  bindPick("q", $("fq"));
  $("b-wa").addEventListener("click", (e) => { if (!LAST || !covGuard()) { e.preventDefault(); return; } saveCot(); });
  $("b-img").onclick = () => {
    if (!LAST || !covGuard()) return;
    if (!IMG.file || IMG.key !== IMG.want) { $("r-toast").textContent = "Preparando la imagen, toca otra vez en un segundo."; return; }
    saveCot();
    const f = IMG.file;
    if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: LAST.msg }).catch(() => {});
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); $("r-toast").textContent = "Se descargó la imagen. Mándala por WhatsApp junto con el mensaje (botón Solo texto)."; }
  };
  $("b-draft").onclick = async () => {
    if (!LAST) return;
    if (EDIT_COT && EDIT_COT.estado !== "borrador") { const ok = await saveCot("cotizado"); $("r-toast").textContent = ok ? "Cambios guardados." : "No se pudo guardar. Revisa tu conexión."; return; }
    const ok = await saveCot("borrador");
    $("r-toast").textContent = ok ? "Guardada sin enviar. La encuentras en " + (isAdmin() ? "Cotizaciones" : "Mis cotizaciones") + " para editarla y enviarla después." : "No se pudo guardar. Revisa tu conexión.";
  };
  $("b-copy").onclick = () => {
    if (!LAST || !covGuard()) return; saveCot();
    const ok = () => ($("r-toast").textContent = "Cotización copiada. Pégala en el chat del cliente.");
    navigator.clipboard?.writeText(LAST.msg).then(ok, () => { $("r-msg").closest("details").open = true; $("r-toast").textContent = "Selecciona el mensaje y cópialo."; });
  };
  applyCfg(); calc();
  if (EDIT_COT) fillCot(EDIT_COT);
}
function fillCot(c) {
  const set = (id, v) => { const el = $(id); if (el && v !== undefined && v !== null) el.value = v; };
  const money = (v) => (v ? Number(v).toLocaleString("es-MX") : "");
  set("q-nom", c.cliente || ""); set("q-tel", c.telefono || ""); set("q-monto", money(c.monto));
  if (MODE === "semanal") { set("q-sem", c.plazo); set("q-fac", c.tasa); if (c.inicio) set("q-ini", c.inicio); }
  else {
    if (GARANTIAS[c.garantia]) $("q-gar").value = c.garantia;
    set("q-tasa", c.tasa); set("q-plazo", c.plazo); $("q-plazo").dataset.t = "1"; set("q-desc", c.desc || ""); set("q-val", money(c.valor));
  }
  touched = true; calc();
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
    const ff = g === "ff" || g === "sin";
    $("q-val").closest("label").hidden = ff;
    COV = ff || (val && val >= req) ? "" : !val ? `Falta el valor de la garantía. Para ${mxn(M)} a ${n} meses debe valer al menos ${mxn(req)} (${fx} a 1).` : `La garantía no cubre ${fx} a 1: para ${mxn(M)} a ${n} meses debe valer al menos ${mxn(req)}. Con ${mxn(val)} se puede prestar hasta ${mxn(Math.floor(val / fx))}.`;
    if (g === "sin") { cov.className = "cov"; cov.textContent = "Sin garantía: préstamo autorizado por ti. No aplica la regla 2 a 1 / 3 a 1."; }
    else if (ff) { cov.className = "cov"; cov.textContent = "Friends & family: tasa preferencial y garantía acordada. No aplica la regla 2 a 1 / 3 a 1."; }
    else if (val) { const ok = val >= req; cov.className = "cov " + (ok ? "ok" : "bad"); cov.textContent = ok ? `Garantía suficiente (${fx} a 1). Con este valor puedes prestar hasta ${mxn(Math.floor(val / fx))}.` : `Garantía insuficiente: para ${mxn(M)} a ${n} meses debe valer al menos ${mxn(req)} (${fx} a 1). Con este valor puedes prestar hasta ${mxn(Math.floor(val / fx))}.`; }
    else { cov.className = "cov"; cov.textContent = `Para ${mxn(M)} a ${n} meses, la garantía debe valer al menos ${mxn(req)} (${fx} a 1).`; }
    const cierre = g === "sin" ? "Este préstamo no requiere garantía." : ff ? (desc ? "Garantía acordada: " + desc + "." : "La garantía es la que acordamos.") : g === "auto" ? "Puedes seguir usando tu auto; solo dejas la documentación endosada y una llave." : "Tu garantía queda bajo resguardo y se te devuelve al liquidar el préstamo.";
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
  if (MODE !== "garantia") COV = "";
  r.cliente = nom; r.telefono = tel10(tel);
  if (EDIT_COT) CUR_REF = doc(db, "cotizaciones", EDIT_COT.id);
  else { const { msg, tbl, lbl, ...dd } = r; const k = JSON.stringify(dd); if (k !== curKey || !CUR_REF || CUR_REF.id === (LAST_SENT || "")) { curKey = k; CUR_REF = doc(collection(db, "cotizaciones")); } }
  r.msg += "\n\nRevisa y confirma tu cotización aquí:\n" + location.origin + location.pathname + "?c=" + CUR_REF.id;
  LAST = r; $("r-err").hidden = true;
  $("r-lbl").textContent = r.lbl; $("r-pago").textContent = mxn2(r.pago); $("r-m").textContent = mxn(r.monto); $("r-i").textContent = mxn(r.intereses); $("r-t").textContent = mxn(r.total);
  $("r-tbl").innerHTML = r.tbl; $("r-msg").textContent = r.msg; $("b-wa").href = waTo(tel, r.msg);
  prepImg(r);
  if (!COV && $("r-toast").classList.contains("err")) { $("r-toast").className = "toast"; $("r-toast").textContent = ""; }
  function err(m) { LAST = null; $("r-err").hidden = false; $("r-err").textContent = m; }
}
/* ---------- Imagen de la corrida para mandar al cliente ---------- */
let IMG = { key: "", want: "", file: null }, imgT = null, LOGO = null;
function prepImg(r) {
  const key = JSON.stringify([r.tipo, r.monto, r.tasa, r.plazo, r.inicio, r.cliente, r.garantia, r.desc]);
  IMG.want = key; clearTimeout(imgT);
  imgT = setTimeout(async () => {
    try {
      const blob = await corridaPNG(r);
      if (IMG.want !== key) return;
      IMG = { key, want: key, file: new File([blob], "cotizacion-entre-amigos.png", { type: "image/png" }) };
      const el = $("r-img"); if (el) { if (el.src.startsWith("blob:")) URL.revokeObjectURL(el.src); el.src = URL.createObjectURL(blob); }
    } catch (e) {}
  }, 250);
}
function loadLogo() {
  if (LOGO) return LOGO;
  LOGO = new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = "../assets/img/logo-mark.png"; });
  return LOGO;
}
async function corridaPNG(r) {
  const sem = r.tipo === "semanal";
  const c = sem ? corridaSemanal(r.monto, r.plazo, r.tasa) : corridaMensual(r.monto, r.tasa, r.plazo);
  const rows = c.filas, W = 1080, P = 60, RH = 46, head = 600, foot = 170;
  const H = head + 60 + rows.length * RH + foot;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  if (!g.roundRect) g.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  const F = "-apple-system, 'Helvetica Neue', Arial, sans-serif";
  const LIME = "#b6e21f", INK = "#f2f2ee", MUTED = "#9a9d94", PANEL = "#16181a", LINE = "#2a2d2a";
  g.fillStyle = "#0a0b0a"; g.fillRect(0, 0, W, H);
  const logo = await loadLogo();
  let x = P;
  if (logo) { const h = 64, w = (logo.width / logo.height) * h; g.drawImage(logo, P, 52, w, h); x = P + w + 18; }
  g.fillStyle = INK; g.font = `800 46px ${F}`; g.fillText("ENTRE", x, 100); const wE = g.measureText("ENTRE ").width;
  g.fillStyle = LIME; g.fillText("AMIGOS", x + wE, 100);
  g.fillStyle = MUTED; g.font = `500 26px ${F}`; g.textAlign = "right";
  g.fillText(new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }), W - P, 96); g.textAlign = "left";
  g.fillStyle = INK; g.font = `700 40px ${F}`; g.fillText("Cotización de préstamo", P, 190);
  if (r.cliente) { g.fillStyle = MUTED; g.font = `500 30px ${F}`; g.fillText("Para: " + r.cliente, P, 236); }
  // tarjetas
  const box = (bx, by, bw, lbl, val, hl) => {
    g.fillStyle = PANEL; g.beginPath(); g.roundRect(bx, by, bw, 140, 18); g.fill();
    g.fillStyle = MUTED; g.font = `600 24px ${F}`; g.fillText(lbl.toUpperCase(), bx + 26, by + 46);
    g.fillStyle = hl ? LIME : INK; g.font = `800 ${hl ? 46 : 40}px ${F}`; g.fillText(val, bx + 26, by + 108);
  };
  const bw = (W - 2 * P - 40) / 3;
  box(P, 280, bw, "Monto", mxn(r.monto));
  box(P + bw + 20, 280, bw, sem ? "Pago semanal" : "Pago mensual", mxn2(c.pago), true);
  box(P + 2 * (bw + 20), 280, bw, "Total a pagar", mxn2(c.total));
  g.fillStyle = INK; g.font = `500 28px ${F}`;
  const det = sem ? `${r.plazo} pagos semanales` : `${r.plazo} pagos mensuales · interés ${r.tasa}% mensual sobre saldo`;
  g.fillText(det, P, 480);
  if (!sem && r.garantia && r.garantia !== "ff" && r.garantia !== "sin") { g.fillStyle = MUTED; g.fillText("Garantía: " + (r.desc || GARANTIAS[r.garantia] || ""), P, 524); }
  if (sem) { g.fillStyle = MUTED; g.fillText("Requisitos: pagaré, aval, INE vigente y comprobante de domicilio.", P, 524); }
  // tabla
  const cols = sem ? [["Semana", 0.14, "l"], ["Fecha", 0.40, "l"], ["Pago", 0.23, "r"], ["Resta", 0.23, "r"]]
    : [["Mes", 0.10, "l"], ["Pago", 0.24, "r"], ["Interés", 0.22, "r"], ["Capital", 0.22, "r"], ["Saldo", 0.22, "r"]];
  const TW = W - 2 * P; let ty = head;
  g.fillStyle = LIME; g.beginPath(); g.roundRect(P, ty, TW, 56, 12); g.fill();
  const cellX = (i) => P + 20 + cols.slice(0, i).reduce((s, k) => s + k[1], 0) * (TW - 40);
  const cellR = (i) => cellX(i) + cols[i][1] * (TW - 40);
  g.fillStyle = "#11140a"; g.font = `700 24px ${F}`;
  cols.forEach((k, i) => { g.textAlign = k[2] === "r" ? "right" : "left"; g.fillText(k[0].toUpperCase(), k[2] === "r" ? cellR(i) : cellX(i), ty + 37); });
  ty += 60;
  rows.forEach((f, j) => {
    if (j % 2 === 0) { g.fillStyle = PANEL; g.fillRect(P, ty, TW, RH); }
    g.fillStyle = INK; g.font = `500 25px ${F}`;
    const vals = sem ? [String(f.n), r.inicio ? fcorta(fechaPago(r.inicio, f.n, "semanal")) : "", mxn2(f.pago), mxn2(f.saldo)]
      : [String(f.n), mxn2(f.pago), mxn2(f.interes), mxn2(f.capital), mxn2(f.saldo)];
    vals.forEach((v, i) => { g.textAlign = cols[i][2] === "r" ? "right" : "left"; g.fillText(v, cols[i][2] === "r" ? cellR(i) : cellX(i), ty + 32); });
    ty += RH;
  });
  g.textAlign = "left"; g.fillStyle = LINE; g.fillRect(P, ty + 20, TW, 2);
  g.fillStyle = MUTED; g.font = `500 23px ${F}`;
  g.fillText(sem ? "Cotización informativa, sujeta a aprobación." : "Cotización informativa, sujeta a aprobación. Si adelantas pagos, pagas menos interés.", P, ty + 66);
  g.fillStyle = INK; g.font = `600 25px ${F}`; g.fillText("ventaentreamigos.com  ·  WhatsApp 33 3306 3319", P, ty + 110);
  return new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no()), "image/png"));
}
let LAST_SENT = "";
function saveCot(estado = "cotizado") {
  if (!LAST) return Promise.resolve();
  const { msg, tbl, lbl, ...d } = LAST;
  const key = CUR_REF.id + estado + JSON.stringify(d);
  if (key === lastKey) return Promise.resolve(); lastKey = key;
  const now = new Date().toISOString();
  if (SOL_ID) d.solId = SOL_ID;
  let pr;
  if (EDIT_COT) {
    const upd = { ...d, editada: now, editPor: ME.uid };
    if (EDIT_COT.estado === "borrador") { upd.estado = estado; if (estado === "cotizado") upd.fecha = now; }
    pr = updateDoc(CUR_REF, upd);
  } else pr = setDoc(CUR_REF, { ...d, por: ME.uid, fecha: now, estado });
  pr = pr.then(() => true, () => { lastKey = ""; return false; });
  if (estado === "borrador") EDIT_COT = { ...(EDIT_COT || {}), id: CUR_REF.id, cliente: d.cliente, estado: "borrador", por: EDIT_COT?.por || ME.uid };
  else {
    if (EDIT_COT && EDIT_COT.estado === "borrador") EDIT_COT = { ...EDIT_COT, estado: "cotizado" };
    if (!isAdmin()) { LAST_SENT = CUR_REF.id; EDIT_COT = null; }
    if (SOL_ID) { updateDoc(doc(db, "solicitudes", SOL_ID), { estado: "cotizada", cotId: CUR_REF.id, cotizadaEn: now }).catch(() => {}); SOL_ID = ""; }
  }
  return pr;
}

/* ---------- Solicitudes que llegan de la página ---------- */
let SOL_ID = "", SOL_VER = false;
const SEST = { aprobada: "Aprobada", nueva: "Nueva", cotizada: "Cotizada", invitada: "Invitada a registrarse", negada: "No aprobada", descartada: "Descartada" };
function solNo(x) {
  return `Hola ${x.nombre}, gracias por tu solicitud de préstamo por ${mxn(x.monto)}. Por el momento no nos es posible aprobarla en esas condiciones.\n\nSi te interesa revisar otra opción (otro monto, plazo o garantía), con gusto te ayudamos. Tus datos quedan registrados para ofrecerte opciones más adelante.\n\nEntre Amigos`;
}
function solTxt(x) {
  const g = x.garantia === "aval" ? "Sin garantía (con aval)" : x.garantia === "sin" ? "<b>Sin garantía · tú decides</b>" : (GARANTIAS[x.garantia] || x.garantia || "") + (x.desc ? " · " + esc(x.desc) : "") + (x.valor ? " · valor aprox. " + mxn(x.valor) : "");
  return `${mxn(x.monto)} a ${x.plazo} ${x.unidad === "semanas" ? "semanas" : "meses"} · ${g}`;
}
function solInv(x) {
  return `Hola ${x.nombre}, gracias por tu solicitud de préstamo por ${mxn(x.monto)}.\n\nPara darte tu cotización y avanzar más rápido, crea tu cuenta aquí y sube tus documentos (INE y comprobante de domicilio):\n${SITE}/cotiza/?nueva&sol=${x.id}&nom=${encodeURIComponent(x.nombre || "")}&tel=${x.telefono || ""}\n\nEn cuanto la revisemos te contactamos.\n\nEntre Amigos`;
}
function solicitudesCard(limit) {
  const nuevas = SOLS.filter((x) => x.estado === "nueva"), rest = SOLS.filter((x) => x.estado !== "nueva");
  const L = SOL_VER ? SOLS : nuevas;
  if (!SOLS.length) return "";
  if (limit && !nuevas.length) return "";
  return `<div class="card"><div class="head"><h2>Solicitudes de préstamo${nuevas.length ? " (" + nuevas.length + " nuevas)" : ""}</h2>${!limit && rest.length ? `<button class="link" type="button" id="sol-ver">${SOL_VER ? "Solo nuevas" : "Ver todas (" + SOLS.length + ")"}</button>` : ""}</div>
    <div class="list">${L.length ? L.slice(0, limit || 999).map((x) => `<div class="item">
      <div class="item-top"><b>${esc(x.nombre)}${x.empresaNombre ? ` <span class="pill">${esc(x.empresaNombre)}</span>` : ""}</b><span>${x.estado === "nueva" ? `<span class="pill warn">Nueva</span>` : `<span class="pill">${SEST[x.estado] || esc(x.estado)}</span>`} ${fhora(x.fecha)}</span></div>
      <div class="item-mid">${solTxt(x)}${x.nota ? `<br>"${esc(x.nota)}"` : ""}</div>
      <div class="item-bot">${x.telefono ? `<a href="https://wa.me/52${esc(x.telefono)}" target="_blank" rel="noopener">${esc(x.telefono)}</a>` : `<span>Sin WhatsApp</span>`}${x.origen === "cliente" || x.uid ? `<span class="pill ok">Ya tiene cuenta</span>` : `<span class="pill">Sin cuenta todavía</span>`}</div>
      ${x.nDocs ? `<div class="actions">${["ine_f", "ine_r", "domicilio", "nomina"].map((k) => `<button class="btn sm" type="button" data-soldoc="${x.id}:${k}">${{ ine_f: "INE frente", ine_r: "INE reverso", domicilio: "Domicilio", nomina: "Nómina" }[k]}</button>`).join("")}</div>` : ""}
      ${x.estado === "descartada" ? "" : `<div class="actions">${x.empresa ? `<button class="btn sm primary" type="button" data-solpre="${x.id}">Aprobar y crear préstamo</button>` : `<button class="btn sm primary" type="button" data-solcot="${x.id}">Cotizar y enviar</button>`}${x.telefono && x.origen !== "cliente" && !x.uid ? `<a class="btn sm" href="${waTo(x.telefono, solInv(x))}" target="_blank" rel="noopener" data-solinv="${x.id}">Solo invitar a registrarse</a>` : ""}${x.telefono && x.estado !== "negada" ? `<a class="btn sm" href="${waTo(x.telefono, solNo(x))}" target="_blank" rel="noopener" data-solno="${x.id}">No aprobar</a>` : ""}<button class="btn sm" type="button" data-soldes="${x.id}">Descartar</button></div>`}
    </div>`).join("") : `<p class="muted">No hay solicitudes nuevas.</p>`}</div></div>`;
}
function bindSolicitudes(rerender) {
  const P = $("panel");
  $("sol-ver") && ($("sol-ver").onclick = () => { SOL_VER = !SOL_VER; rerender(); });
  P.querySelectorAll("[data-solcot]").forEach((b) => (b.onclick = () => cotizarSolicitud(SOLS.find((x) => x.id === b.dataset.solcot))));
  P.querySelectorAll("[data-soldoc]").forEach((b) => (b.onclick = async () => { const [id, k] = b.dataset.soldoc.split(":"); const t = b.textContent; b.textContent = "Abriendo…"; try { const s2 = await getDoc(doc(db, "solicitudes", id, "docs", k)); if (s2.exists()) verDoc({ data: s2.data().data, mime: "image/jpeg" }, t); else b.textContent = "No lo subió"; } catch (e) { b.textContent = "No se pudo abrir"; return; } if (b.textContent === "Abriendo…") b.textContent = t; }));
  P.querySelectorAll("[data-solpre]").forEach((b) => (b.onclick = () => { const x = SOLS.find((z) => z.id === b.dataset.solpre); if (!x) return; const e = EMPS.find((z) => z.id === x.empresa) || {};
    DRAFT = { tipo: "semanal", cliente: x.nombre, telefono: x.telefono, monto: x.monto, plazo: x.plazo, tasa: e.porMil || CFG.fac || "", empresa: x.empresa, solId: x.id, inicio: plusDays(7) }; go("prestamos"); }));
  P.querySelectorAll("[data-solno]").forEach((a) => a.addEventListener("click", () => updateDoc(doc(db, "solicitudes", a.dataset.solno), { estado: "negada" }).catch(() => {})));
  P.querySelectorAll("[data-solinv]").forEach((a) => a.addEventListener("click", () => updateDoc(doc(db, "solicitudes", a.dataset.solinv), { estado: "invitada" }).catch(() => {})));
  P.querySelectorAll("[data-soldes]").forEach((b) => (b.onclick = () => { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "¿Descartar?"; return; } updateDoc(doc(db, "solicitudes", b.dataset.soldes), { estado: "descartada" }); }));
}
function cotizarSolicitud(x) {
  if (!x) return;
  const semanal = x.unidad === "semanas" || x.garantia === "aval";
  MODE = semanal ? "semanal" : "garantia";
  go("cotizar");
  SOL_ID = x.id;
  const set = (id, v) => { const el = $(id); if (el && v !== undefined && v !== null && v !== "") el.value = v; };
  set("q-nom", x.nombre); set("q-tel", x.telefono); set("q-monto", Number(x.monto).toLocaleString("es-MX"));
  if (semanal) set("q-sem", x.unidad === "semanas" ? x.plazo : x.plazo * 4);
  else {
    if (GARANTIAS[x.garantia]) { $("q-gar").value = x.garantia; $("q-gar").dispatchEvent(new Event("change", { bubbles: true })); }
    set("q-plazo", x.plazo); if ($("q-plazo")) $("q-plazo").dataset.t = "1";
    set("q-desc", x.desc); if (x.valor) set("q-val", Number(x.valor).toLocaleString("es-MX"));
  }
  $("fq").dispatchEvent(new Event("input", { bubbles: true }));
  const c = $("fq").closest(".card");
  c.insertAdjacentHTML("afterbegin", `<p class="cov ok" style="margin:0">Cotizando la solicitud de ${esc(x.nombre)}. Revisa la tasa y toca "Enviar por WhatsApp": le llega su cotización con el enlace para crear su cuenta y confirmarla.</p>`);
}

/* ---------- Cotizaciones ---------- */
const EST = { borrador: "Borrador (sin enviar)", cotizado: "Enviada", aceptado: "Aceptado", negado: "No aprobado", descartado: "Descartado" };
let FILT = "";
function detCot(r) {
  if (r.tipo === "auto") return `Auto · ${esc(r.autoTitulo || "")} · enganche ${mxn(r.enganche)} · ${r.plazo} meses al ${r.tasa}% anual${r.banco ? " (" + esc(r.banco) + ")" : ""} · ${mxn2(r.pago)}/mes`;
  return r.tipo === "semanal" ? `Semanal · ${mxn(r.monto)} · ${r.plazo} pagos de ${mxn2(r.pago)}`
    : `Garantía ${GARANTIAS[r.garantia] || ""}${r.desc ? " (" + esc(r.desc) + ")" : ""} · ${mxn(r.monto)} · ${r.plazo} meses al ${r.tasa}% · ${mxn2(r.pago)}/mes`;
}
const canEditCot = (r) => r && r.tipo !== "auto" && (isAdmin() || (r.por === ME.uid && r.estado === "borrador"));
const canDel = (r) => isAdmin() || (r.por === ME.uid && r.estado === "borrador");
function vCotizaciones() {
  const rows = COTS.filter((r) => !FILT || r.por === FILT);
  const acc = rows.filter((r) => r.estado === "aceptado"), sum = (l) => l.reduce((s, r) => s + (r.monto || 0), 0);
  const people = [...new Set(COTS.map((r) => r.por))];
  const viejas = rows.filter((r) => canDel(r) && (r.estado === "descartado" || r.estado === "negado"));
  $("panel").innerHTML = (isAdmin() ? solicitudesCard() : "") + `<div class="card">
    <div class="head"><h2>${isAdmin() ? "Cotizaciones" : "Mis cotizaciones"}</h2>
    ${isAdmin() ? `<label for="c-f">Quién cotizó<select id="c-f"><option value="">Todos</option>${people.map((p) => `<option value="${esc(p)}"${p === FILT ? " selected" : ""}>${esc(nameOf(p))}</option>`).join("")}</select></label>` : ""}</div>
    ${viejas.length ? `<div class="actions" style="margin-bottom:10px"><button class="btn sm" type="button" id="c-clean">Borrar descartadas y no aprobadas (${viejas.length})</button></div>` : ""}
    <div class="stats"><span class="stat"><b>${rows.length}</b> cotizaciones</span><span class="stat">Cotizado <b>${mxn(sum(rows))}</b></span><span class="stat"><b>${acc.length}</b> aceptadas · <b>${mxn(sum(acc))}</b></span></div>
    <div class="list">${rows.length ? rows.map((r) => {
      const f = new Date(r.fecha), est = r.estado || "cotizado";
      const pill = `<span class="pill${est === "aceptado" ? " ok" : (est === "descartado" || est === "negado") ? " no" : est === "borrador" ? " warn" : ""}">${EST[est] || est}</span>`;
      return `<div class="item"><div class="item-top"><b>${esc(r.cliente || "Sin nombre")}</b>${pill}</div>
        <div class="item-mid">${detCot(r)}</div>
        <div class="item-bot"><span>${f.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} ${f.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}${isAdmin() ? " · Cotizó: " + esc(nameOf(r.por)) : ""}${r.editada ? " · Editada" : ""}</span>${r.telefono ? `<a href="https://wa.me/52${esc(r.telefono)}" target="_blank" rel="noopener">${esc(r.telefono)}</a>` : ""}</div>
        ${r.aceptadoPor ? `<div class="item-bot"><span class="pill ok">Confirmada por el cliente</span><span>${esc(r.aceptadoNombre || "")} · ${esc(r.aceptadoEmail || "")}</span></div>` : ""}
        ${isAdmin() ? `<label class="inline">Estado <select data-cot="${r.id}" aria-label="Estado">${Object.entries(EST).map(([k, v]) => `<option value="${k}"${k === est ? " selected" : ""}>${v}</option>`).join("")}</select></label>` : ""}
        <div class="actions" style="margin-top:6px">${canEditCot(r) ? `<button class="btn sm${est === "borrador" ? " primary" : ""}" type="button" data-edcot="${r.id}">${est === "borrador" ? "Editar y enviar" : "Editar"}</button>` : ""}${r.tipo !== "auto" && est !== "borrador" ? `<button class="btn sm" type="button" data-mk="${r.id}">Crear préstamo</button>` : ""}${canDel(r) ? `<button class="btn sm danger" type="button" data-del="${r.id}">Borrar</button>` : ""}</div></div>`;
    }).join("") : `<p class="muted">Todavía no hay cotizaciones. Cuando envíes o copies una desde "Cotizar", aparece aquí.</p>`}</div></div>`;
  $("c-f") && ($("c-f").onchange = (e) => { FILT = e.target.value; vCotizaciones(); });
  $("panel").querySelectorAll("[data-edcot]").forEach((b) => (b.onclick = () => editarCot(COTS.find((x) => x.id === b.dataset.edcot))));
  bindSolicitudes(vCotizaciones);
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
let DRAFT = null, OPEN = "", DRAFT_COT = "", DRAFT_SOL = "";
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

/* ---------- Préstamos por cliente: una persona con varios préstamos ---------- */
let PVISTA = "lista", CLI_SEL = "", CLI_NOM = false;
const normNom = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
// Misma persona si sus préstamos coinciden en cualquiera de: unión hecha por el dueño, cuenta, WhatsApp o nombre
// (sin importar acentos ni mayúsculas). "Separar" (p.solo) hace que ese préstamo no se una por nombre ni WhatsApp.
let CLU_SIG = "", CLU = {};
function clusters() {
  const sig = PRES.map((p) => [p.id, p.persona, p.clienteUid, p.telefono, p.cliente, p.solo].join("|")).join("~");
  if (sig === CLU_SIG) return CLU;
  const par = {}, f = (x) => (par[x] === undefined ? (par[x] = x) : par[x] === x ? x : (par[x] = f(par[x]))), u = (a, b) => { const ra = f(a), rb = f(b); if (ra !== rb) par[ra] = rb; };
  const keys = (p) => [p.persona, p.clienteUid ? "u:" + p.clienteUid : "", p.solo ? "" : tel10(p.telefono || "").length === 10 ? "t:" + tel10(p.telefono) : "", p.solo ? "" : normNom(p.cliente) ? "n:" + normNom(p.cliente) : ""].filter(Boolean);
  PRES.forEach((p) => { f("p:" + p.id); keys(p).forEach((k) => u("p:" + p.id, k)); });
  const comp = {}; PRES.forEach((p) => (comp[f("p:" + p.id)] = comp[f("p:" + p.id)] || []).push(p));
  CLU = {};
  Object.values(comp).forEach((L) => {
    const per = L.map((p) => p.persona).filter(Boolean).sort()[0];
    const k = per || L.flatMap(keys).sort()[0] || "p:" + L[0].id;
    L.forEach((p) => (CLU[p.id] = k));
  });
  CLU_SIG = sig; return CLU;
}
const cliKey = (p) => clusters()[p.id] || "p:" + p.id;
function gruposClientes(L) {
  const G = {};
  L.forEach((p) => { const k = cliKey(p); (G[k] = G[k] || { k, P: [] }).P.push(p); });
  return Object.values(G).map((g) => {
    const r2 = (n) => Math.round(n * 100) / 100, hoy = today();
    g.P.sort((a, b) => ((a.creado || "") < (b.creado || "") ? -1 : 1));
    // Nombre a mostrar: el que más se repite; si empatan, el más completo y con mayúsculas en cada palabra.
    const cnt = {}; g.P.forEach((p) => { const n = String(p.cliente || "").trim().replace(/\s+/g, " "); if (n) cnt[n] = (cnt[n] || 0) + 1; });
    const caps = (n) => n.split(" ").filter((w) => w[0] && w[0] === w[0].toUpperCase()).length;
    g.nombre = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || b.split(" ").length - a.split(" ").length || caps(b) - caps(a) || b.length - a.length)[0] || "Cliente";
    g.A = g.P.map((p) => ({ p, a: avance(p) }));
    g.act = g.A.filter((z) => !z.a.liquidado);
    g.capital = r2(g.act.reduce((s2, z) => s2 + ((z.p.tipo === "semanal" ? z.a.restante : z.a.capital) || 0), 0));
    g.mes = r2(g.act.reduce((s2, z) => s2 + (z.a.siguiente ? (z.p.tipo === "interes" ? z.a.corrida.pago : (z.a.corrida.filas.find((f) => iso(fechaPago(z.p.inicio, f.n, z.p.tipo)) > hoy) || {}).pago || 0) : 0), 0));
    g.debe = r2(g.act.reduce((s2, z) => s2 + vencido(z.p, z.a), 0));
    g.pagado = r2(g.A.reduce((s2, z) => s2 + (z.p.pagos || []).reduce((t, x) => t + (x.monto || 0), 0), 0));
    // Próximo pago que todavía no vence (lo atrasado ya se ve en "Debe hoy").
    g.prox = g.act.map((z) => { const f = estadoCuenta(z.p).meses.find((x) => x.fecha > hoy && x.falta > 0.5); return f ? { f: f.fecha, m: f.falta, p: z.p } : null; }).filter(Boolean).sort((a, b) => (a.f < b.f ? -1 : 1))[0] || null;
    return g;
  }).sort((a, b) => (b.debe > 0.5) - (a.debe > 0.5) || a.nombre.localeCompare(b.nombre));
}
function vistaChips() {
  return `<div class="chips"><button type="button" class="chip${PVISTA === "lista" ? " on" : ""}" data-pvista="lista">Préstamos</button><button type="button" class="chip${PVISTA === "clientes" ? " on" : ""}" data-pvista="clientes">Por cliente</button></div>`;
}
function vClientesPrest() {
  const G = gruposClientes(visibles()), g = CLI_SEL ? G.find((x) => x.k === CLI_SEL) : null;
  if (CLI_SEL && !g) CLI_SEL = "";
  if (g) {
    const pagos = g.A.flatMap((z) => (z.p.pagos || []).map((x) => ({ x, p: z.p }))).sort((a, b) => (a.x.fecha < b.x.fecha ? 1 : -1));
    const liq = g.A.filter((z) => z.a.liquidado);
    return vistaChips() + `<button class="back" type="button" data-clix>‹ Todos los clientes</button>
    <div class="card"><div class="head"><h2>${esc(g.nombre)}</h2>${g.debe > 0.5 ? `<span class="pill warn">Debe ${mxn(g.debe)}</span>` : `<span class="pill ok">Al corriente</span>`}</div>
      ${isAdmin() ? (CLI_NOM ? `<form class="edit" id="cli-nomf" novalidate><label>Nombre correcto (se cambia en sus ${g.P.length} préstamos)<input name="n" value="${esc(g.nombre)}"></label><div class="actions"><button class="btn sm primary" type="submit">Guardar</button><button class="btn sm" type="button" data-clinom>Cancelar</button></div></form>` : `<button class="link" type="button" data-clinom style="justify-self:start">Corregir nombre</button>`) : ""}
      <div class="facts">
        <div><span>Préstamos abiertos</span><b>${g.act.length}</b></div><div><span>Te debe de capital</span><b>${mxn(g.capital)}</b></div>
        <div><span>Te paga al mes</span><b>${mxn2(g.mes)}</b></div><div><span>Debe hoy</span><b class="${g.debe > 0.5 ? "warn-t" : "lime"}">${mxn2(g.debe)}</b></div>
        <div><span>Te ha pagado</span><b>${mxn2(g.pagado)}</b></div><div><span>Próximo pago</span><b>${g.prox ? mxn2(g.prox.m) + " · " + fdate(g.prox.f) : "Ninguno"}</b></div>
      </div>
      ${g.P.some((p) => p.telefono) ? `<div class="actions"><a class="btn sm" href="${waTo(g.P.find((p) => p.telefono).telefono, `Hola ${g.nombre.split(" ")[0]}, te saluda Entre Amigos.`)}" target="_blank" rel="noopener">WhatsApp</a></div>` : ""}
    </div>
    <div class="card"><h2>Sus préstamos abiertos (${g.act.length})</h2><div class="list">${g.act.length ? g.act.map((z) => loanItem(z.p)).join("") : `<p class="muted">No tiene préstamos abiertos.</p>`}</div></div>
    ${liq.length ? `<div class="card"><details><summary>Liquidados (${liq.length})</summary><div class="list" style="margin-top:12px">${liq.map((z) => loanItem(z.p)).join("")}</div></details></div>` : ""}
    <div class="card"><h2>Todos sus pagos</h2><div class="tbl cuadre"><table class="edo"><tr><th>Fecha</th><th>Monto</th><th>Préstamo</th></tr>${pagos.length ? pagos.slice(0, 60).map(({ x, p }) => `<tr><td>${mesC(x.fecha, true)} ${x.fecha.slice(2, 4)}</td><td>${mxn(x.monto)}</td><td>${mxn(p.monto)}${x.tipo === "capital" ? " · capital" : ""}</td></tr>`).join("") : `<tr><td colspan="3">Sin pagos registrados.</td></tr>`}</table></div></div>`;
  }
  const multi = G.filter((x) => x.act.length > 1).length;
  return vistaChips() + `<div class="card"><div class="head"><h2>Clientes</h2><span class="muted">${G.filter((x) => x.act.length).length} con préstamo abierto${multi ? ` · ${multi} con varios` : ""}</span></div>
    <input id="cli-buscar" type="search" placeholder="Buscar cliente por nombre" autocomplete="off" value="${esc(FILT_P)}">
    <div class="list">${G.filter((x) => x.act.length).map((x) => `<div class="item tapi" data-cli="${esc(normNom(x.nombre))}" data-clisel="${esc(x.k)}" role="button" tabindex="0">
      <div class="item-top"><b>${esc(x.nombre)}${x.act.length > 1 ? ` <span class="pill">${x.act.length} préstamos</span>` : ""}</b>${x.debe > 0.5 ? `<span class="pill warn">Debe ${mxn(x.debe)}</span>` : `<span class="pill ok">Al corriente</span>`}</div>
      <div class="item-mid">Capital ${mxn(x.capital)} · Te paga ${mxn(x.mes)} al mes</div>
      ${x.prox ? `<div class="item-bot"><span>Próximo: ${mxn2(x.prox.m)} el ${fdate(x.prox.f)}</span></div>` : ""}</div>`).join("") || `<p class="muted">Sin préstamos abiertos.</p>`}</div></div>`;
}
function bindClientesPrest() {
  const P = $("panel");
  P.querySelectorAll("[data-pvista]").forEach((b) => (b.onclick = () => { PVISTA = b.dataset.pvista; CLI_SEL = ""; vPrestamos(); window.scrollTo(0, 0); }));
  P.querySelectorAll("[data-clisel]").forEach((b) => (b.onclick = () => { CLI_SEL = b.dataset.clisel; vPrestamos(); window.scrollTo(0, 0); }));
  P.querySelectorAll("[data-clix]").forEach((b) => (b.onclick = () => { CLI_SEL = ""; CLI_NOM = false; vPrestamos(); }));
  P.querySelectorAll("[data-clinom]").forEach((b) => (b.onclick = () => { CLI_NOM = !CLI_NOM; vPrestamos(); }));
  const nf = $("cli-nomf");
  if (nf) nf.onsubmit = async (ev) => {
    ev.preventDefault(); const n = nf.querySelector("[name=n]").value.trim().replace(/\s+/g, " "); if (!n) return;
    const g = gruposClientes(visibles()).find((x) => x.k === CLI_SEL); if (!g) return;
    // Todos sus préstamos quedan con el mismo nombre y unidos por la misma clave, para que no se vuelvan a separar.
    await Promise.all(g.P.map((p) => updateDoc(doc(db, "prestamos", p.id), { cliente: n, persona: g.k })));
    CLI_NOM = false;
  };
  const bus = $("cli-buscar"); if (bus) bus.addEventListener("input", () => { FILT_P = bus.value; const q = normNom(FILT_P); P.querySelectorAll("[data-clisel]").forEach((el) => (el.hidden = q && !el.dataset.cli.includes(q))); });
  if (bus && FILT_P) bus.dispatchEvent(new Event("input"));
}
function vPrestamos() {
  const PF = OPEN ? PRES.find((x) => x.id === OPEN) : null;
  if (OPEN && !PF) OPEN = "";
  if (PF) { $("panel").innerHTML = fichaHTML(PF); bindLoan(); fichaBind(PF); return; }
  if (PVISTA === "clientes") { $("panel").innerHTML = vClientesPrest(); bindLoan(); bindClientesPrest(); return; }
  const clientes = USERS.filter((u) => u.rol === "cliente");
  const d = DRAFT || {};
  const VP = visibles();
  const act = VP.filter((p) => !avance(p).liquidado), liq = VP.filter((p) => avance(p).liquidado);
  const cartera = act.reduce((s, p) => s + debeDe(p, avance(p)), 0);
  const equipo = USERS.filter((u) => u.rol === "equipo");
  $("panel").innerHTML = vistaChips() + `
  <div class="card"><details id="ex-d"${EXOPEN ? " open" : ""}><summary>Agregar cliente con préstamo que ya tiene</summary>
    <form id="fe" novalidate style="margin-top:12px">
      <p class="note" style="margin:0 0 10px">Para clientes de antes: registras lo que te debe hoy y cómo te paga. Al guardar te aparece el mensaje para invitarlo por WhatsApp a ver su préstamo en línea.</p>
      ${pickCliente("e")}
      <div class="row"><label for="e-nom">Nombre completo del cliente<input id="e-nom" placeholder="Nombre y apellidos"></label>
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
      <div class="row"><label for="e-ini">Fecha de su próximo pago (si va atrasado, la del primer mes que no ha pagado completo)<input id="e-ini" type="date" value="${plusDays(30)}"></label>
      <label for="e-mail">Correo (opcional)<input id="e-mail" type="email" inputmode="email" placeholder="cliente@correo.com"></label></div>
      <div class="row" data-f="gar"><label for="e-gar">Garantía<select id="e-gar"><option value="">Sin garantía</option>${garOpts().replace('<option value="sin">Sin garantía</option>', "")}</select></label>
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
      <div class="row"><label for="p-nom">Nombre completo del cliente<input id="p-nom" value="${esc(d.cliente || "")}" placeholder="Nombre y apellidos"></label>
      <label for="p-tel">WhatsApp<input id="p-tel" inputmode="tel" value="${esc(d.telefono || "")}" placeholder="33 1234 5678"></label></div>
      <label for="p-mail">Correo del cliente (con este correo verá su avance al crear su cuenta)<input id="p-mail" type="email" inputmode="email" value="${esc(d.email || "")}" placeholder="cliente@correo.com"></label>
      <label for="p-uid"${isAdmin() ? "" : " hidden"}>O elige su cuenta si ya la creó<select id="p-uid"><option value="">Todavía sin cuenta</option>${clientes.map((u) => `<option value="${u.uid}"${u.uid === d.clienteUid ? " selected" : ""}>${esc(u.nombre)} · ${esc(u.email)}</option>`).join("")}</select></label>
      <div class="row"><label for="p-monto">Monto<input id="p-monto" inputmode="numeric" value="${d.monto ? Number(d.monto).toLocaleString("es-MX") : ""}"></label>
      <label for="p-tasa" id="p-tasa-l">${d.tipo === "semanal" ? "Pago por cada $1,000" : "Interés mensual (%)"}<input id="p-tasa" inputmode="decimal" value="${d.tasa ?? ""}"></label></div>
      <div class="row"><label for="p-plazo" id="p-plazo-l">${d.tipo === "semanal" ? "Semanas" : "Meses"}<input id="p-plazo" inputmode="numeric" value="${d.plazo ?? ""}"></label>
      <label for="p-ini">Fecha del primer pago<input id="p-ini" type="date" value="${d.inicio || plusDays(d.tipo === "semanal" ? 7 : 30)}"></label></div>
      <div class="row" id="p-gar-row"${d.tipo === "semanal" ? " hidden" : ""}><label for="p-gar">Garantía<select id="p-gar">${garOpts(d.garantia)}</select></label>
      <label for="p-desc">Descripción<input id="p-desc" value="${esc(d.desc || "")}"></label></div>
      ${isAdmin() ? `<label for="p-emp" id="p-emp-l"${(d.tipo || "garantia") === "semanal" ? "" : " hidden"}>Empresa (convenio)<select id="p-emp"><option value="">Sin empresa</option>${EMPS.map((e) => `<option value="${e.id}"${e.id === d.empresa ? " selected" : ""}>${esc(e.nombre)}</option>`).join("")}</select></label>` : ""}
      <label for="p-fijo">Pago acordado (opcional, si es distinto al calculado)<input id="p-fijo" inputmode="decimal" placeholder="Opcional"></label>
      <p class="err" id="p-err" hidden></p>
      <button class="btn primary" type="submit">Guardar préstamo</button>
    </form></details></div>
  <div class="card">
    <div class="head"><h2>${isAdmin() ? "Préstamos activos" : "Mis clientes activos"}</h2>${ownerFilter(vPrestamos)}</div>
    <input id="p-buscar" type="search" placeholder="Buscar cliente por nombre" value="${esc(FILT_P)}" autocomplete="off" style="margin-bottom:8px">
    <div class="stats"><span class="stat"><b>${act.length}</b> activos</span><span class="stat">Por cobrar <b>${mxn(cartera)}</b></span><span class="stat"><b>${liq.length}</b> liquidados</span></div>
    <div class="list">${act.length ? act.map(loanItem).join("") : `<p class="muted">Sin préstamos activos. Crea uno arriba o desde una cotización aceptada.</p>`}</div>
  </div>
  ${liq.length ? `<div class="card"><details><summary>Liquidados (${liq.length})</summary><div class="list" style="margin-top:12px">${liq.map(loanItem).join("")}</div></details></div>` : ""}`;
  DRAFT_COT = d.cotId || ""; DRAFT_SOL = d.solId || DRAFT_SOL; DRAFT = null;
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
    if ($("p-emp-l")) $("p-emp-l").hidden = t !== "semanal";
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
    if (tipo === "semanal" && $("p-emp")?.value) { p.empresa = $("p-emp").value; p.empresaNombre = EMPS.find((e) => e.id === p.empresa)?.nombre || ""; }
    const solId = DRAFT_SOL;
    try {
      const ref = await addDoc(collection(db, "prestamos"), p);
      if (solId) { updateDoc(doc(db, "solicitudes", solId), { estado: "aprobada" }).catch(() => {}); DRAFT_SOL = ""; }
      const a = avance(p), sig = a.siguiente;
      notice(p.cliente, p.telefono, `Hola ${p.cliente}, ya está listo tu préstamo por ${mxn(p.monto)}.${sig ? " Tu primer pago es de " + mxn2(sig.monto) + (sig.fecha ? " el " + fcorta(sig.fecha) : "") + "." : ""}\n\nPuedes ver tu préstamo, tus pagos, tus fechas y tus documentos aquí:\n${p.clienteUid ? PORTAL() : invLink(ref.id)}${p.clienteUid ? "" : "\n\nEntra al enlace y crea tu cuenta" + (p.clienteEmail ? " con este correo: " + p.clienteEmail : "") + ". Así verás tu préstamo desde tu celular."}\n\nEntre Amigos`, "Préstamo guardado", p.clienteEmail);
    } catch (er) { $("p-err").hidden = false; $("p-err").textContent = "No se pudo guardar. Revisa tu conexión."; }
  });
  bindLoan();
}
function bindLoan() {
  $("panel").querySelectorAll("[data-open]").forEach((b) => (b.onclick = (e) => { if (e.target.closest("a")) return; OPEN = b.dataset.open; FX = ""; EDIT = ""; PEDIT = ""; vPrestamos(); window.scrollTo(0, 0); }));
  $("panel").querySelectorAll("form[data-pay]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const m = num(f.querySelector("[name=m]").value), fe = f.querySelector("[name=f]").value || today(), t = f.querySelector("[name=t]")?.value;
    if (!m) return;
    FX = "";
    const pg = { monto: m, fecha: fe, reg: new Date().toISOString(), regPor: ME.uid }; if (t === "capital") pg.tipo = "capital";
    const file = f.querySelector("[name=c]")?.files?.[0];
    await updateDoc(doc(db, "prestamos", f.dataset.pay), { pagos: arrayUnion(pg) });
    if (file) { try { const { data, mime } = await fileToData(file); await addDoc(collection(db, "comprobantes"), { pid: f.dataset.pay, reg: pg.reg, fecha: fe, monto: m, data, mime, por: ME.uid }); } catch (er) {} }
  }));
  editHandlers();
  bindClientesPrest();
  const bus = $("p-buscar"); if (bus) bus.addEventListener("input", () => { FILT_P = bus.value; const q = FILT_P.trim().toLowerCase(); $("panel").querySelectorAll("[data-cli]").forEach((el) => (el.hidden = q && !el.dataset.cli.includes(q))); });
  if (FILT_P && bus) bus.dispatchEvent(new Event("input"));
  $("panel").querySelectorAll("[data-liq]").forEach((b) => (b.onclick = async () => {
    const p = PRES.find((x) => x.id === b.dataset.liq); if (!p) return;
    const L = liquidacion(p), m = Math.round(L.total * 100) / 100;
    if (!m) return;
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez: registra " + mxn2(m) + " y lo liquida"; return; }
    b.disabled = true;
    const base = { fecha: today(), reg: new Date().toISOString(), regPor: ME.uid, nota: "Liquidación" };
    // Solo interés: se registra por separado el interés pendiente y el capital, para que cada cosa cuente donde va.
    const nuevos = p.tipo === "interes"
      ? [L.interes > 0.005 ? { ...base, monto: L.interes } : null, { ...base, reg: base.reg + "b", monto: L.capital, tipo: "capital" }].filter(Boolean)
      : [{ ...base, monto: m, liq: true, ...(L.intDias ? { intLiq: L.intDias } : {}) }];
    await updateDoc(doc(db, "prestamos", p.id), { pagos: arrayUnion(...nuevos) });
  }));
  $("panel").querySelectorAll("[data-comp]").forEach((b) => (b.onclick = () => { const [pid, id] = b.dataset.comp.split(":"); const c = (COMPS[pid] || []).find((x) => x.id === id); verDoc(c, "Comprobante de pago"); }));
  $("panel").querySelectorAll("textarea[data-nota]").forEach((t) => t.addEventListener("change", () => updateDoc(doc(db, "prestamos", t.dataset.nota), { nota: t.value.trim() })));
  $("panel").querySelectorAll("[data-undo]").forEach((b) => (b.onclick = async () => {
    const p = PRES.find((x) => x.id === b.dataset.undo); if (!p?.pagos?.length) return;
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez para borrar el último pago"; return; }
    await updateDoc(doc(db, "prestamos", p.id), { pagos: p.pagos.slice(0, -1) });
  }));
  $("panel").querySelectorAll("select[data-link]").forEach((s) => (s.onchange = () => { const u = USERS.find((x) => x.uid === s.value); updateDoc(doc(db, "prestamos", s.dataset.link), u ? { clienteUid: s.value, clienteEmail: u.email || "" } : { clienteUid: "" }); }));
  $("panel").querySelectorAll("input[data-mail]").forEach((i) => i.addEventListener("change", () => updateDoc(doc(db, "prestamos", i.dataset.mail), { clienteEmail: i.value.trim().toLowerCase() })));
}
let FX = "", AVIS = {};
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
    ${isAdmin() ? `<label>¿Quién recibe los pagos del cliente?<select name="recibe"><option value="">Yo</option>${USERS.filter(esInv).map((u) => `<option value="${u.uid}"${u.uid === p.recibe ? " selected" : ""}>${esc(u.nombre)} (me entrega lo que no le toca)</option>`).join("")}</select></label>` : ""}
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
      if (isAdmin()) d.recibe = g("recibe");
      const bad = !d.cliente || !d.monto || !d.inicio || (t === "capfijo" && !d.abono) || ((t === "garantia" || t === "semanal") && (!d.plazo || (!d.tasa && !d.pagoFijo))) || (t === "interes" && !d.tasa);
      if (bad) { err.hidden = false; err.textContent = "Revisa los datos: falta el cliente, el monto, la fecha o los datos de cómo paga."; return; }
      try { await updateDoc(doc(db, "prestamos", f.dataset.edf), d); EDIT = ""; vPrestamos(); }
      catch (er) { err.hidden = false; err.textContent = "No se pudo guardar. Revisa tu conexión."; }
    };
  });
}
/* ---------- Fondeo y comisiones ---------- */
const sigFecha = (p) => { const a = avance(p); return a.siguiente?.fecha ? iso(a.siguiente.fecha) : p.inicio || today(); };
// Suma días hábiles (lunes a viernes) a una fecha AAAA-MM-DD.
function masHabiles(f, n) { const d = new Date(f + "T12:00:00"); let k = 0; while (k < n) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) k++; } return iso(d); }
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
  return `${esc(persName(x))} · ${PAPEL[x.papel]} · ${v}${x.capital ? " · recibe el capital" : ""}${x.aporte ? " · puso " + mxn(x.aporte) : ""}${x.desde ? " · desde el " + fcorta(new Date(x.desde + "T12:00:00")) : ""}`;
}
let REPOPEN = "";
let RPEDIT = "";
const esInv = (u) => u.rol === "equipo" || u.inversionista;
function repartoBox(p) {
  const L = REP[p.id]?.participantes || [], eq = USERS.filter(esInv);
  const ei = RPEDIT.startsWith(p.id + ":") ? Number(RPEDIT.split(":")[1]) : -1, ed = L[ei] || null;
  const sl = (a, b) => (a === b ? " selected" : "");
  const intShare = L.filter((x) => x.base !== "fijo").reduce((s, x) => s + (x.base === "puntos" ? (p.tasa ? (x.valor / p.tasa) * 100 : 0) : x.valor), 0);
  return `<details class="rep" data-repd="${p.id}"${REPOPEN === p.id ? " open" : ""}><summary>Comisiones${L.filter((x) => !x.migrado).length ? " (" + L.filter((x) => !x.migrado).length + ")" : ""}</summary>
    <div class="list" style="margin-top:8px">${L.some((x) => !x.migrado) ? L.map((x, i) => x.migrado ? "" : `<div class="item"><div class="item-top"><span>${repTxt(p, x)}</span><span><button class="link" type="button" data-reped="${p.id}:${i}">${RPEDIT === p.id + ":" + i ? "Cancelar" : "Editar"}</button> <button class="link del" type="button" data-reprm="${p.id}:${i}">Quitar</button></span></div></div>`).join("") : `<p class="muted">Sin reparto. Todo el interés de este préstamo es para ti.</p>`}</div>
    ${L.length && intShare ? `<p class="note">Del interés que pague el cliente: ${Math.round(intShare)}% se reparte y ${Math.max(0, Math.round(100 - intShare))}% queda para ti${L.some((x) => x.base === "fijo") ? " (antes de los pagos fijos)" : ""}.</p>` : ""}
    <form class="edit" data-repf="${p.id}" data-idx="${ei}" novalidate>
      ${ed ? `<h3>Editar a ${esc(persName(ed))}</h3>` : ""}
      <div class="row"><label>Persona<select name="uid"><option value="">Otra persona (escribe el nombre)</option>${eq.map((u) => `<option value="${u.uid}"${sl(u.uid, ed?.uid)}>${esc(u.nombre)}</option>`).join("")}</select></label>
      <label data-rn>Nombre<input name="nombre" placeholder="Ej. Mamá" value="${esc(ed && !ed.uid ? ed.nombre : "")}"></label></div>
      <div class="row"><label>Papel<select name="papel"><option value="comision">Comisión (por traer al cliente)</option>${ed?.papel === "fondeo" ? `<option value="fondeo" selected>Fondeó el dinero (sistema anterior)</option>` : ""}</select></label>
      <label>Cómo se calcula<select name="base">${p.tipo !== "semanal" ? `<option value="puntos">Le pago X% al mes (de los ${p.tasa}% que cobro)</option>` : ""}<option value="pct"${sl("pct", ed?.base)}>% del interés que cobro</option><option value="fijo"${sl("fijo", ed?.base)}>Monto fijo por cada pago</option></select></label></div>
      <div class="row"><label><span data-vl>Valor</span><input name="valor" inputmode="decimal" placeholder="Ej. 3" value="${ed ? ed.valor : ""}"></label>
      <label class="chk"><input type="checkbox" name="capital"${!ed || ed.capital ? " checked" : ""}> Se le regresa el capital que pague el cliente</label></div>
      <div class="row"><label>Le toca desde el pago con fecha<input name="desde" type="date" value="${ed?.desde || (ed ? "" : sigFecha(p))}"></label><label>Monto que puso (opcional)<input name="aporte" inputmode="decimal" placeholder="Si no, todo el préstamo" value="${ed?.aporte || ""}"></label></div>
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
      const x = { uid, nombre, papel: g("papel").value, base: g("base").value, valor, capital: g("capital").checked, desde: g("desde").value || "", aporte: num(g("aporte").value) || 0 };
      REPOPEN = id;
      const L = (REP[id]?.participantes || []).slice(), idx = Number(f.dataset.idx);
      if (idx >= 0 && L[idx]) L[idx] = x; else L.push(x);
      RPEDIT = "";
      try { await setDoc(doc(db, "repartos", id), { participantes: L }); }
      catch (er) { err.hidden = false; err.textContent = "No se pudo guardar. Revisa tu conexión."; }
    };
  });
}

/* ---------- Autos ofrecidos (los manda la gente desde "Vende tu auto") ---------- */
const VEST = { nueva: "Nuevo", revision: "En revisión", propuesta: "Propuesta enviada", comprado: "Comprado", consignacion: "En consignación", descartado: "Descartado" };
let VOPEN = "", VFOTOS = {}, VVER = false;
function cargaFotos(id) {
  if (VFOTOS[id]) return;
  VFOTOS[id] = "cargando";
  const un = onSnapshot(collection(db, "ventas", id, "fotos"), (s) => { VFOTOS[id] = s.docs.map((d) => d.data()).sort((a, b) => a.i - b.i); un && un(); if (TAB === "autos") vAutos(); }, () => { VFOTOS[id] = []; });
}
const SLOTN = { frente: "Frente", atras: "Atrás", izq: "Costado izq.", der: "Costado der.", int1: "Interior del.", int2: "Interior tras.", tablero: "Kilometraje", motor: "Motor", serie: "No. de serie", llanta: "Llantas", factura: "Factura", tarjeta: "Tarjeta circ." };
function vAutos() {
  const L = VVER ? VENTAS : VENTAS.filter((v) => !["comprado", "descartado"].includes(v.estado));
  $("panel").innerHTML = `<div class="card"><div class="head"><h2>Autos ofrecidos</h2>${VENTAS.length !== L.length || VVER ? `<button class="link" type="button" id="v-ver">${VVER ? "Solo activos" : "Ver todos (" + VENTAS.length + ")"}</button>` : ""}</div>
    <p class="muted">Autos que la gente te ofrece desde "Vende tu auto" en la página, con sus fotos y factura.</p>
    <div class="list">${L.length ? L.map((v) => {
      const open = VOPEN === v.id; if (open) cargaFotos(v.id);
      const F = open && Array.isArray(VFOTOS[v.id]) ? VFOTOS[v.id] : null;
      const msg = `Hola ${v.nombre}, gracias por mandarnos los datos y fotos de tu ${v.marca} ${v.modelo} ${v.anio}. Lo estamos revisando y en breve te mandamos nuestra propuesta.\n\nEntre Amigos`;
      return `<div class="item">
        <div class="item-top"><b>${esc(v.marca)} ${esc(v.modelo)} ${esc(v.anio)}</b><span class="pill${v.estado === "nueva" ? " warn" : v.estado === "descartado" ? " no" : ""}">${VEST[v.estado] || esc(v.estado)}</span></div>
        <div class="item-mid">${Number(v.km || 0).toLocaleString("es-MX")} km · ${esc(v.como)}${v.precio ? " · espera " + mxn(v.precio) : ""} · ${v.nFotos} fotos</div>
        <div class="item-bot"><span>${esc(v.nombre)} · ${fhora(v.fecha)}</span>${v.telefono ? `<a href="${waTo(v.telefono, msg)}" target="_blank" rel="noopener">WhatsApp ${esc(v.telefono)}</a>` : ""}</div>
        <div class="actions" style="margin-top:6px"><button class="btn sm${open ? "" : " primary"}" type="button" data-vopen="${v.id}">${open ? "Ocultar fotos" : "Ver fotos y factura"}</button>
          <label class="inline">Estado <select data-vest="${v.id}">${Object.entries(VEST).map(([k, t]) => `<option value="${k}"${k === v.estado ? " selected" : ""}>${t}</option>`).join("")}</select></label>
          <button class="btn sm danger" type="button" data-vdel="${v.id}">Borrar</button></div>
        ${open ? (F ? `<div class="vgal">${F.map((f) => `<a href="${f.data}" target="_blank" rel="noopener" data-vimg><img src="${f.data}" alt="${esc(SLOTN[f.slot] || f.slot)}" loading="lazy"><span>${esc(SLOTN[f.slot] || "Extra")}</span></a>`).join("")}</div>` : `<p class="muted">Cargando fotos…</p>`) : ""}
      </div>`;
    }).join("") : `<p class="muted">Todavía no hay autos ofrecidos.</p>`}</div></div>`;
  $("v-ver") && ($("v-ver").onclick = () => { VVER = !VVER; vAutos(); });
  $("panel").querySelectorAll("[data-vopen]").forEach((b) => (b.onclick = () => { VOPEN = VOPEN === b.dataset.vopen ? "" : b.dataset.vopen; vAutos(); }));
  $("panel").querySelectorAll("select[data-vest]").forEach((s) => (s.onchange = () => updateDoc(doc(db, "ventas", s.dataset.vest), { estado: s.value })));
  $("panel").querySelectorAll("[data-vimg]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); const w = window.open(); if (w) { w.document.write(`<title>Foto</title><body style="margin:0;background:#000"><img src="${a.querySelector("img").src}" style="width:100%">`); } }));
  $("panel").querySelectorAll("[data-vdel]").forEach((b) => (b.onclick = async () => {
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez para borrarlo con sus fotos"; return; }
    b.disabled = true; const id = b.dataset.vdel;
    const fotos = await new Promise((ok) => { const un = onSnapshot(collection(db, "ventas", id, "fotos"), (s) => { ok(s.docs.map((d) => d.id)); un && un(); }, () => ok([])); });
    await Promise.all(fotos.map((f) => deleteDoc(doc(db, "ventas", id, "fotos", f)).catch(() => {})));
    await deleteDoc(doc(db, "ventas", id)); delete VFOTOS[id];
  }));
}

/* ---------- Reglas de seguridad: se publican desde la app con un toque ---------- */
const RULES_V = 3; // subir este número cada vez que cambie firestore.rules
let RULES_CUR = null;
async function publicarReglas(btn, out) {
  const say = (t, ok) => { out.textContent = t; out.className = ok ? "ok" : "err"; out.hidden = false; };
  btn.disabled = true; say("Pidiendo permiso a Google…", true);
  try {
    const tk = await tokenAdmin();
    say("Publicando reglas…", true);
    const content = await (await fetch("./firestore.rules?t=" + Date.now(), { cache: "no-store" })).text();
    const H = { Authorization: "Bearer " + tk, "Content-Type": "application/json", "X-Goog-User-Project": CONF.projectId }, B = `https://firebaserules.googleapis.com/v1/projects/${CONF.projectId}`;
    const r1 = await fetch(B + "/rulesets", { method: "POST", headers: H, body: JSON.stringify({ source: { files: [{ name: "firestore.rules", content }] } }) });
    const j1 = await r1.json().catch(() => ({}));
    if (!r1.ok) throw new Error(j1.error?.message || "No se pudieron revisar las reglas");
    const r2 = await fetch(B + "/releases/cloud.firestore", { method: "PATCH", headers: H, body: JSON.stringify({ release: { name: `projects/${CONF.projectId}/releases/cloud.firestore`, rulesetName: j1.name } }) });
    const j2 = await r2.json().catch(() => ({}));
    if (!r2.ok) throw new Error(j2.error?.message || "No se pudieron publicar");
    await setDoc(doc(db, "config", "reglas"), { v: RULES_V, fecha: new Date().toISOString() });
    RULES_CUR = RULES_V; say("Listo. Las reglas quedaron publicadas.", true); btn.textContent = "Publicadas";
    drawRulesBanner();
  } catch (e) {
    btn.disabled = false;
    say(e.code === "otra-cuenta" ? "Elige tu cuenta de administrador (jesusreynosoalfaro@gmail.com)." : e.code === "auth/popup-closed-by-user" ? "Se cerró la ventana de Google. Intenta otra vez." : "No se pudo: " + (e.message || "error") + ". Avísale a Claude.", false);
  }
}
function drawRulesBanner() {
  const box = $("rules-banner"); if (!box) return;
  if (!isAdmin() || RULES_CUR === null || RULES_CUR >= RULES_V) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="card notice"><h3>Hay una actualización de seguridad</h3><p class="muted">Para que funcionen las funciones nuevas hay que publicar las reglas de tu base de datos. Es un toque: Google te pide confirmar con tu cuenta.</p>
    <div class="actions"><button class="btn primary" type="button" id="rules-go">Actualizar ahora</button></div><p id="rules-out" hidden></p></div>`;
  $("rules-go").onclick = () => publicarReglas($("rules-go"), $("rules-out"));
}
/* ---------- Convenios con empresas ---------- */
// Explicación que ve una empresa interesada SOLO después de que el administrador la aprueba (se guarda en Firestore).
const CONV_V = 1;
const CONV_HTML = `<p class="hi">Convenio para empresas</p>
    <p class="big-t">Un beneficio para los colaboradores de tu empresa, sin costo para la empresa.</p>
    <ol class="req" style="margin:12px 0"><li><b>Firmamos un convenio</b> con tu empresa.</li><li><b>Te damos un enlace exclusivo</b> para tus colaboradores. Ahí piden su préstamo y suben sus documentos. Tú puedes darlos de alta también.</li><li><b>Montos:</b> $5,000, $10,000 o hasta $20,000.</li><li><b>Pagan en 14 semanas</b>, $100 por cada $1,000 a la semana (por ejemplo, $5,000 se pagan con $500 a la semana), en efectivo, por medio de la empresa.</li><li><b>La empresa respalda el convenio:</b> si alguien deja de trabajar ahí, el saldo se cubre con su finiquito.</li><li><b>Tienes tu propio acceso</b> para ver a tus colaboradores con préstamo, quién va al corriente y cuánto se junta cada semana.</li></ol>`;
let EMP_OPEN = "", EMP_FORM = "";
const convLink = (e) => SITE + "/convenio.html?c=" + e.codigo;
const slugE = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "empresa";
const rnd = () => Math.random().toString(36).slice(2, 8);
// Resumen de los préstamos de una empresa: quién va al corriente, quién está atrasado y cuánto toca juntar esta semana.
function empStats(id, L) {
  const hoy = today(), en7 = iso(new Date(Date.now() + 7 * 864e5));
  const filas = L.filter((p) => p.empresa === id).map((p) => { const a = avance(p); return { p, a, venc: vencido(p, a), sig: a.siguiente }; });
  const act = filas.filter((f) => !f.a.liquidado);
  return { filas, act, cartera: act.reduce((s, f) => s + (f.a.restante || 0), 0), atr: act.filter((f) => f.venc > 0.5), semana: act.reduce((s, f) => s + (f.venc || 0) + (f.sig && f.sig.fecha && iso(f.sig.fecha) <= en7 && iso(f.sig.fecha) >= hoy ? f.sig.monto : 0), 0) };
}
function empleadosLista(st) {
  return st.act.length ? `<div class="list">${st.act.map((f) => `<div class="item"><div class="item-top"><b>${esc(f.p.cliente)}</b><span>${f.venc > 0.5 ? `<span class="pill warn">Atrasado ${mxn(f.venc)}</span>` : `<span class="pill ok">Al corriente</span>`}</span></div>
    <div class="item-mid">Préstamo ${mxn(f.p.monto)} · Semana ${Math.min(f.a.cubiertos + 1, f.a.total)} de ${f.a.total} · Resta ${mxn2(f.a.restante)}</div>
    ${f.sig ? `<div class="item-bot"><span>Próximo pago: ${mxn2(f.sig.monto)}${f.sig.fecha ? " el " + fcorta(f.sig.fecha) : ""}</span></div>` : ""}</div>`).join("")}</div>` : `<p class="muted">Todavía no hay préstamos activos.</p>`;
}
function empForm(e) {
  e = e || {};
  return `<form class="edit" data-empf="${e.id || ""}" novalidate><h3>${e.id ? "Editar " + esc(e.nombre) : "Nueva empresa"}</h3>
    <div class="row"><label>Nombre de la empresa<input name="nombre" value="${esc(e.nombre || "")}" placeholder="Ej. Valle Real"></label><label>Contacto (Recursos Humanos)<input name="contacto" value="${esc(e.contacto || "")}" placeholder="Nombre"></label></div>
    <div class="row"><label>WhatsApp del contacto<input name="tel" inputmode="tel" value="${esc(e.tel || "")}"></label><label>Pago semanal por cada $1,000<input name="porMil" inputmode="decimal" value="${e.porMil || 100}" placeholder="Ej. 100"></label></div>
    <div class="row"><label>Semanas<input name="plazos" value="${esc((e.plazos || [14]).join(", "))}"></label><label>Montos que puede pedir<input name="montos" value="${esc((e.montos || [5000, 10000, 20000]).join(", "))}"></label></div>
    <p class="err" hidden></p>
    <div class="actions"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-empx>Cancelar</button></div></form>`;
}
function vEmpresas() {
  const P = $("panel");
  P.innerHTML = `<div class="card"><div class="head"><h2>Empresas con convenio</h2><button class="btn sm primary" type="button" id="emp-new">${EMP_FORM === "nuevo" ? "Cancelar" : "Agregar empresa"}</button></div>
    <p class="muted" style="margin:0">Préstamos semanales para empleados. Cada empresa tiene su enlace privado: solo quien lo recibe puede pedir. Todo se cobra en efectivo por medio de la empresa.</p>
    ${EMP_FORM === "nuevo" ? empForm() : ""}</div>
  ${EMPS.map((e) => {
    const st = empStats(e.id, PRES), sol = SOLS.filter((x) => x.empresa === e.id && x.estado === "nueva"), adm = USERS.filter((u) => u.rol === "empresa" && u.empresa === e.id), open = EMP_OPEN === e.id;
    const msgRH = `Hola ${e.contacto || ""}, este es el enlace del convenio de préstamos de ${e.nombre} con Entre Amigos. Compártelo solo con sus colaboradores; ahí piden su préstamo y suben sus documentos:\n${convLink(e)}\n\nEntre Amigos`;
    return `<div class="card"><div class="head"><h2>${esc(e.nombre)}</h2>${e.activo === false ? `<span class="pill warn">Enlace pausado</span>` : ""}</div>
      <div class="stats"><span class="stat"><b>${st.act.length}</b> con préstamo</span><span class="stat">Por cobrar <b>${mxn(st.cartera)}</b></span><span class="stat${st.atr.length ? " warn" : ""}"><b>${st.atr.length}</b> atrasados</span><span class="stat">A juntar esta semana <b>${mxn(st.semana)}</b></span>${sol.length ? `<span class="stat warn"><b>${sol.length}</b> solicitudes nuevas</span>` : ""}</div>
      <div class="item-mid" style="margin:8px 0">Enlace: <a href="${convLink(e)}" target="_blank" rel="noopener">${esc(convLink(e))}</a> · ${(e.montos || []).map((m) => mxn(m) + " = " + mxn(m / 1000 * (e.porMil || 0)) + "/sem").join(" · ")} · ${(e.plazos || [14]).join(", ")} semanas</div>
      <div class="actions">${e.tel ? `<a class="btn sm primary" href="${waTo(e.tel, msgRH)}" target="_blank" rel="noopener">Mandar enlace a ${esc(e.contacto || "RH")}</a>` : ""}<button class="btn sm" type="button" data-ecopy="${e.id}">Copiar enlace</button><button class="btn sm" type="button" data-eopen="${e.id}">${open ? "Cerrar" : "Ver empleados"}</button><button class="btn sm" type="button" data-eedit="${e.id}">Editar</button><button class="btn sm" type="button" data-epausa="${e.id}">${e.activo === false ? "Reactivar enlace" : "Pausar enlace"}</button></div>
      ${EMP_FORM === e.id ? empForm(e) : ""}
      ${altasAdmin(e)}
      <p class="lbl">Administradora</p>
      <div class="item-bot">${adm.length ? adm.map((u) => `<span class="pill ok">${esc(u.nombre)}</span><button class="link del" type="button" data-equit="${u.uid}">Quitar acceso</button>`).join("") : `<span class="muted">Sin administradora.</span>`}
        <select data-eadm="${e.id}"><option value="">Dar acceso a…</option>${USERS.filter((u) => u.rol === "cliente").map((u) => `<option value="${u.uid}">${esc(u.nombre)} · ${esc(u.email)}</option>`).join("")}</select></div>
      <p class="note">Ella ve a los empleados de ${esc(e.nombre)}, si van al corriente y cuánto se junta cada semana; da de alta y sube documentos. No puede borrar ni cambiar pagos. Primero crea su cuenta con el enlace de clientes.</p>
      ${open ? `<p class="lbl">Empleados con préstamo</p>${empleadosLista(st)}` : ""}
    </div>`;
  }).join("") || ""}
  ${(() => { const L = SOLS.filter((x) => x.empresa); return L.length ? solicitudesCardDe(L) : ""; })()}`;
  $("emp-new").onclick = () => { EMP_FORM = EMP_FORM === "nuevo" ? "" : "nuevo"; vEmpresas(); };
  P.querySelectorAll("[data-empx]").forEach((b) => (b.onclick = () => { EMP_FORM = ""; vEmpresas(); }));
  P.querySelectorAll("[data-eedit]").forEach((b) => (b.onclick = () => { EMP_FORM = EMP_FORM === b.dataset.eedit ? "" : b.dataset.eedit; vEmpresas(); }));
  P.querySelectorAll("[data-eopen]").forEach((b) => (b.onclick = () => { EMP_OPEN = EMP_OPEN === b.dataset.eopen ? "" : b.dataset.eopen; vEmpresas(); }));
  P.querySelectorAll("[data-ecopy]").forEach((b) => (b.onclick = () => { const e = EMPS.find((x) => x.id === b.dataset.ecopy); navigator.clipboard?.writeText(convLink(e)).then(() => (b.textContent = "Copiado")); }));
  P.querySelectorAll("[data-epausa]").forEach((b) => (b.onclick = async () => { const e = EMPS.find((x) => x.id === b.dataset.epausa); const act = e.activo === false; await updateDoc(doc(db, "empresas", e.id), { activo: act }); await updateDoc(doc(db, "convenios", e.codigo), { activo: act }).catch(() => {}); }));
  P.querySelectorAll("select[data-eadm]").forEach((sel) => (sel.onchange = async () => { if (!sel.value) return; const e = EMPS.find((x) => x.id === sel.dataset.eadm), u = USERS.find((x) => x.uid === sel.value);
    await updateDoc(doc(db, "usuarios", sel.value), { rol: "empresa", empresa: e.id, solicita: "" });
    notice(u?.nombre || "", u?.telefono || "", `Hola ${u?.nombre || ""}, ya tienes acceso como administradora del convenio de ${e.nombre} con Entre Amigos. Entra aquí con tu cuenta:\n${PORTAL()}\n\nAhí ves a los colaboradores con préstamo, si van al corriente y cuánto se junta cada semana. Para dar de alta a alguien usa el enlace del convenio:\n${convLink(e)}\n\nEntre Amigos`, "Acceso dado", u?.email); }));
  P.querySelectorAll("[data-equit]").forEach((b) => (b.onclick = () => { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez"; return; } updateDoc(doc(db, "usuarios", b.dataset.equit), { rol: "cliente", empresa: "" }); }));
  P.querySelectorAll("form[data-empf]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const g = (n) => f.querySelector(`[name=${n}]`).value.trim(), err = f.querySelector(".err");
    const plazos = g("plazos").split(/[^0-9]+/).map(Number).filter((n) => n > 0 && n <= 104), mm = g("montos").split(/[^0-9]+/).map(Number).filter(Boolean);
    const montos = g("montos").replace(/,(?=\d{3}\b)/g, "").split(/[^0-9]+/).map(Number).filter((n) => n >= 500).sort((a, b) => a - b);
    const d = { nombre: g("nombre"), contacto: g("contacto"), tel: tel10(g("tel")), porMil: num(g("porMil")), plazos: plazos.length ? plazos : [14], montos: montos.length ? montos : [5000, 10000, 20000] };
    if (!d.nombre || !d.porMil) { err.hidden = false; err.textContent = "Escribe el nombre de la empresa y el pago por cada $1,000."; return; }
    const id = f.dataset.empf, old = EMPS.find((x) => x.id === id);
    const codigo = old?.codigo || slugE(d.nombre) + "-" + rnd() + rnd();
    const pub = { empresa: id || "", nombre: d.nombre, porMil: d.porMil, plazos: d.plazos, montos: d.montos, activo: old ? old.activo !== false : true };
    try {
      if (old) { await updateDoc(doc(db, "empresas", id), d); await setDoc(doc(db, "convenios", codigo), { ...pub, empresa: id }); }
      else { const ref = await addDoc(collection(db, "empresas"), { ...d, codigo, activo: true, creado: new Date().toISOString() }); await setDoc(doc(db, "convenios", codigo), { ...pub, empresa: ref.id }); }
      EMP_FORM = ""; vEmpresas();
    } catch (er) { err.hidden = false; err.textContent = "No se pudo guardar. Revisa tu conexión."; }
  }));
  bindSolicitudes(vEmpresas);
  altasHandlers(vEmpresas);
}

// Préstamos que ya existían antes de usar la app: la administradora (o tú) los carga con los pagos que ya lleva; tú confirmas.
let ALTAS = [], ALTA_ED = "";
function altaForm(id, x) {
  x = x || {};
  return `<form class="edit" data-altaf="${id || ""}" novalidate>${id ? "<h3>Corregir antes de confirmar</h3>" : ""}
    <div class="row"><label>Nombre completo<input name="nombre" value="${esc(x.nombre || "")}" placeholder="Nombre y apellidos"></label><label>WhatsApp (opcional)<input name="tel" inputmode="tel" value="${esc(x.telefono || "")}"></label></div>
    <div class="row"><label>Monto del préstamo<input name="monto" inputmode="numeric" value="${x.monto ? Number(x.monto).toLocaleString("es-MX") : ""}" placeholder="Ej. 10,000"></label><label>¿Qué número de pago sigue?<input name="sigue" inputmode="numeric" value="${x.pagados >= 0 ? x.pagados + 1 : ""}" placeholder="Ej. 8"></label></div>
    <label>Fecha de ese pago<input name="prox" type="date" value="${x.prox || ""}"></label>
    <p class="note" data-sigtxt>Si el préstamo apenas empieza, pon 1: no pasa nada, empieza desde el primer pago.</p>
    <p class="err" hidden></p>
    <div class="actions"><button class="btn primary" type="submit">${id ? "Guardar" : "Agregar"}</button>${id ? `<button class="btn" type="button" data-altax>Cancelar</button>` : ""}</div></form>`;
}
function leerAlta(f) {
  const g = (n) => f.querySelector(`[name=${n}]`).value.trim();
  const sig = parseInt(g("sigue"), 10);
  const d = { nombre: g("nombre"), telefono: tel10(g("tel")), monto: num(g("monto")), pagados: sig - 1, prox: g("prox") };
  const err = f.querySelector(".err");
  if (d.nombre.split(/\s+/).length < 2 || !d.monto || !(sig >= 1 && sig <= 104) || !d.prox) { err.hidden = false; err.textContent = "Escribe nombre completo, monto, qué número de pago sigue (1 si apenas empieza) y la fecha de ese pago."; return null; }
  return d;
}
// Crea el préstamo semanal con los pagos que ya llevaba (marcados como carga inicial).
async function confirmarAlta(x) {
  const e = EMPS.find((z) => z.id === x.empresa) || {}, plazo = (e.plazos || [14])[0], porMil = e.porMil || 100, pago = Math.round((x.monto / 1000) * porMil * 100) / 100;
  const ini = new Date(x.prox + "T12:00:00"); ini.setDate(ini.getDate() - 7 * x.pagados);
  const pagos = Array.from({ length: Math.min(x.pagados, plazo) }, (_, i) => { const d = new Date(ini); d.setDate(d.getDate() + 7 * i); return { monto: pago, fecha: iso(d), reg: new Date().toISOString(), regPor: ME.uid, nota: "Carga inicial" }; });
  const ref = await addDoc(collection(db, "prestamos"), { tipo: "semanal", cliente: x.nombre, telefono: x.telefono || "", clienteUid: "", clienteEmail: "", monto: x.monto, tasa: porMil, plazo, inicio: iso(ini), por: ME.uid, cotId: "", garantia: "", desc: "", pagos, creado: new Date().toISOString(), empresa: x.empresa, empresaNombre: e.nombre || x.empresaNombre || "" });
  if (x.id) await updateDoc(doc(db, "altas", x.id), { estado: "confirmada", pid: ref.id });
}
function altasAdmin(e) {
  const L = ALTAS.filter((x) => x.empresa === e.id && x.estado === "pendiente");
  return `<p class="lbl">Préstamos cargados por confirmar${L.length ? ` <span class="pill warn">${L.length} por confirmar</span>` : ""}</p>
    ${L.length ? `<div class="list">${L.map((x) => `<div class="item"><div class="item-top"><b>${esc(x.nombre)}</b><span>${mxn(x.monto)} · ${x.pagados ? `sigue el pago ${x.pagados + 1} de ${(e.plazos || [14])[0]}` : "nuevo: empieza en el pago 1"}</span></div>
      <div class="item-mid">${x.pagados ? "Pago " + (x.pagados + 1) : "Primer pago"} el ${fcorta(new Date(x.prox + "T12:00:00"))} · lo subió ${esc(nameOf(x.por))}</div>
      <div class="actions"><button class="btn sm primary" type="button" data-altaok="${x.id}">Confirmar</button><button class="btn sm" type="button" data-altaed="${x.id}">${ALTA_ED === x.id ? "Cerrar" : "Corregir"}</button><button class="link del" type="button" data-altano="${x.id}">Rechazar</button></div>
      ${ALTA_ED === x.id ? altaForm(x.id, x) : ""}</div>`).join("")}</div>` : ""}
    <details><summary>Cargar yo un préstamo (nuevo o que ya llevaba pagos)</summary>${altaForm("", null).replace('data-altaf=""', `data-altaf="" data-altae="${e.id}"`)}</details>`;
}
function altasHandlers(rerender) {
  const P = $("panel");
  P.querySelectorAll("[data-altaok]").forEach((b) => (b.onclick = async () => { b.disabled = true; const x = ALTAS.find((z) => z.id === b.dataset.altaok); if (x) await confirmarAlta(x); }));
  P.querySelectorAll("[data-altaed]").forEach((b) => (b.onclick = () => { ALTA_ED = ALTA_ED === b.dataset.altaed ? "" : b.dataset.altaed; rerender(); }));
  P.querySelectorAll("[data-altax]").forEach((b) => (b.onclick = () => { ALTA_ED = ""; rerender(); }));
  P.querySelectorAll("[data-altano]").forEach((b) => (b.onclick = () => { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez"; return; } updateDoc(doc(db, "altas", b.dataset.altano), { estado: "rechazada" }); }));
  P.querySelectorAll("form[data-altaf]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const d = leerAlta(f); if (!d) return; const id = f.dataset.altaf;
    try {
      if (isAdmin() && id) { await updateDoc(doc(db, "altas", id), d); ALTA_ED = ""; rerender(); }
      else if (isAdmin()) { await confirmarAlta({ ...d, empresa: f.dataset.altae }); f.reset(); }
      else { await addDoc(collection(db, "altas"), { ...d, empresa: USER.empresa, empresaNombre: MIEMP?.nombre || "", por: ME.uid, estado: "pendiente", fecha: new Date().toISOString() }); f.reset(); avisar("Préstamo por confirmar", `${USER.nombre || "La administradora"} cargó a ${d.nombre} (${mxn(d.monto)}, ${d.pagados ? "sigue el pago " + (d.pagados + 1) : "empieza en el pago 1"}).`); }
    } catch (er) { const err = f.querySelector(".err"); err.hidden = false; err.textContent = "No se pudo guardar. Revisa tu conexión."; }
  }));
}
function solicitudesCardDe(L) { const keep = SOLS; SOLS = L; const h = solicitudesCard(0); SOLS = keep; return h; }
// Lo que ve la administradora de cada empresa.
function vEmp() {
  const e = MIEMP;
  if (!e) { $("panel").innerHTML = `<div class="card"><p class="muted">Cargando…</p></div>`; return; }
  const st = empStats(e.id, PRES), sols = SOLS.slice(0, 30), EST2 = { nueva: "En revisión", aprobada: "Aprobada", negada: "No aprobada", descartada: "Cancelada", cotizada: "En revisión", invitada: "En revisión" };
  setTimeout(() => altasHandlers(vEmp));
  $("panel").innerHTML = `<div class="card inv"><p class="hi">Convenio ${esc(e.nombre)}</p>
      <div class="tiles"><div><span>Colaboradores con préstamo</span><b>${st.act.length}</b></div><div><span>A juntar esta semana</span><b>${mxn(st.semana)}</b></div><div><span>Atrasados</span><b>${st.atr.length}</b></div></div></div>
    <div class="card"><h2>Dar de alta a un colaborador</h2><p class="muted">Abre el formulario, llénalo con sus datos y sube sus documentos. También puedes mandarle el enlace para que lo haga desde su celular.</p>
      <div class="actions"><a class="btn primary" href="${convLink(e)}" target="_blank" rel="noopener">Abrir formulario</a><a class="btn" href="https://wa.me/?text=${encodeURIComponent("Este es el enlace para pedir tu préstamo del convenio de " + e.nombre + " con Entre Amigos:\n" + convLink(e))}" target="_blank" rel="noopener">Mandar enlace por WhatsApp</a></div></div>
    <div class="card"><h2>Cargar préstamos</h2><p class="muted">Carga aquí a cada colaborador con su préstamo: si ya lleva pagos, pon el número de pago que sigue; si apenas empieza, pon 1. Entre Amigos lo revisa y lo confirma.</p>${altaForm("", null)}
      ${ALTAS.length ? `<div class="list" style="margin-top:10px">${ALTAS.slice(0, 40).map((x) => `<div class="item"><div class="item-top"><b>${esc(x.nombre)}</b><span class="pill${x.estado === "confirmada" ? " ok" : x.estado === "rechazada" ? " no" : " warn"}">${{ pendiente: "Por confirmar", confirmada: "Confirmado", rechazada: "No confirmado" }[x.estado] || ""}</span></div><div class="item-mid">${mxn(x.monto)} · ${x.pagados ? "sigue el pago " + (x.pagados + 1) : "nuevo, empieza en el pago 1"} · el ${fcorta(new Date(x.prox + "T12:00:00"))}</div></div>`).join("")}</div>` : ""}</div>
    <div class="card"><h2>Colaboradores con préstamo</h2>${empleadosLista(st)}</div>
    <div class="card"><h2>Solicitudes</h2><div class="list">${sols.length ? sols.map((x) => `<div class="item"><div class="item-top"><b>${esc(x.nombre)}</b><span class="pill${x.estado === "aprobada" ? " ok" : ""}">${EST2[x.estado] || "En revisión"}</span></div><div class="item-mid">${mxn(x.monto)} a ${x.plazo} semanas · ${fhora(x.fecha)}</div></div>`).join("") : `<p class="muted">Sin solicitudes todavía.</p>`}</div></div>
    <div class="card"><p class="muted">Los pagos se registran en Entre Amigos cuando se entrega el efectivo. Si ves algo que no cuadra, avísanos.</p><a class="btn" href="https://wa.me/${WA}?text=${encodeURIComponent("Hola, soy " + (USER.nombre || "") + " del convenio " + e.nombre + ".")}" target="_blank" rel="noopener">Escribir a Entre Amigos</a></div>`;
}

/* ---------- Mi inversión (lo que ve el inversionista) ---------- */
let PORT = undefined, PORT_UN = null, PORT_ALL = false;
// El inversionista avisa que te prestó dinero; queda pendiente hasta que el administrador lo autoriza.
let MYSOL = null, SOLF = false;
function misSolicitudesInv() {
  if (MYSOL === null) { MYSOL = []; onSnapshot(query(collection(db, "solinv"), where("uid", "==", ME.uid)), (s) => { MYSOL = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ((a.reg || "") < (b.reg || "") ? 1 : -1)); if (TAB === "inv") vInv(); }, () => {}); }
  const EA = { pendiente: ["En revisión", "warn"], autorizada: ["Autorizada", "ok"], rechazada: ["Revisar", "no"] };
  const L = MYSOL.filter((x) => x.estado !== "autorizada" || (x.reg || "") > new Date(Date.now() - 30 * 864e5).toISOString()).slice(0, 6);
  return `<div class="card inv"><h2>¿Le prestaste dinero a Entre Amigos?</h2>
    <p class="big-t">Avísanos aquí. Lo revisamos y, en cuanto lo confirmemos, aparece en tu inversión con tus fechas de pago.</p>
    ${L.length ? `<div class="list">${L.map((x) => `<div class="item"><div class="item-top"><b class="mid-t">${mxn(x.monto)} al ${x.tasa}%</b><span class="pill ${EA[x.estado]?.[1] || ""}">${EA[x.estado]?.[0] || ""}</span></div><div class="item-mid">El ${fcorta(new Date(x.fecha + "T12:00:00"))}${x.estado === "rechazada" && x.motivo ? " · " + esc(x.motivo) : ""}</div></div>`).join("")}</div>` : ""}
    ${SOLF ? `<form id="solinvf" novalidate>
      <div class="row"><label>¿Cuánto le prestaste?<input name="m" inputmode="decimal" placeholder="Ej. 100,000"></label><label>Interés mensual acordado (%)<input name="t" inputmode="decimal" placeholder="Ej. 2.5"></label></div>
      <label>¿Qué día se lo diste?<input name="f" type="date" value="${today()}" max="${today()}"></label>
      <label>Comentario (opcional)<input name="n" placeholder="Ej. Transferencia desde Banorte"></label>
      <p class="err" hidden></p><button class="btn primary" type="submit">Enviar</button></form>`
    : `<button class="btn primary" type="button" id="solinv-o">Avisar que presté dinero</button>`}</div>`;
}
function bindSolInv() {
  $("solinv-o") && ($("solinv-o").onclick = () => { SOLF = true; vInv(); });
  const f = $("solinvf"); if (!f) return;
  f.onsubmit = async (ev) => {
    ev.preventDefault(); const g = (n) => f.querySelector(`[name=${n}]`).value, er = f.querySelector(".err");
    const m = num(g("m")), t = num(g("t")), fe = g("f");
    if (!m || !t || !fe) { er.hidden = false; er.textContent = "Escribe cuánto, el interés y la fecha."; return; }
    if (t >= 20) { er.hidden = false; er.textContent = "Revisa el interés: es mensual, por ejemplo 2.5."; return; }
    f.querySelector("button").disabled = true;
    try { await addDoc(collection(db, "solinv"), { uid: ME.uid, nombre: USER.nombre || ME.email || "", monto: m, tasa: t, fecha: fe, nota: g("n").trim().slice(0, 200), estado: "pendiente", reg: new Date().toISOString() }); SOLF = false; vInv(); }
    catch (x) { f.querySelector("button").disabled = false; er.hidden = false; er.textContent = "No se pudo enviar. Intenta de nuevo."; }
  };
}

// Página del inversionista: pensada para leerse fácil a cualquier edad (letra grande, frases cortas, fechas completas).
let INV_BIG = (() => { try { return localStorage.getItem("inv_big") === "1"; } catch (e) { return false; } })();
const fechaLarga = (f) => { const t = new Date(f + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(",", ""); return t.charAt(0).toUpperCase() + t.slice(1); };
const fechaMedia = (f) => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
function invPageHTML(d, nom, vista) {
  const INV = d.inversiones || [], P = d.pagos || [], ver = PORT_ALL ? P : P.slice(0, 5), MET = { transferencia: "por transferencia", efectivo: "en efectivo" };
  return `<div class="invx${INV_BIG ? " big" : ""}">
  <div class="card ix"><p class="ix-hola">Hola, ${esc(nom)}</p>
    <button class="ix-a" type="button" data-ixbig>${INV_BIG ? "Letra normal" : "Letra más grande"}</button></div>
  <div class="card ix"><p class="ix-lbl">Tu dinero en Entre Amigos</p><p class="ix-num">${mxn(d.capital)}</p>
    ${d.mensual ? `<p class="ix-t">Te pagamos <b>${mxn(d.mensual)}</b> cada mes.</p>` : ""}</div>
  ${d.proximo ? `<div class="card ix ix-next"><p class="ix-lbl">Tu próximo pago</p><p class="ix-num lime">${mxn(d.proximo.monto)}</p><p class="ix-t">${fechaLarga(d.proximo.fecha)}</p></div>` : ""}
  ${INV.length ? `<div class="card ix"><p class="ix-lbl">${INV.length > 1 ? "Tus inversiones" : "Tu inversión"}</p>${INV.map((v) => `<div class="ix-row">
      <p class="ix-t">Nos prestaste <b>${mxn(v.original)}</b> el ${fechaMedia(v.desde)}.</p>
      ${v.original > v.monto + 0.5 ? `<p class="ix-t">Ya te regresamos <b>${mxn(v.original - v.monto)}</b>. Seguimos teniendo <b>${mxn(v.monto)}</b>.</p>` : ""}
      <p class="ix-t">Te pagamos <b>${mxn(v.mensual)}</b> el día <b>${v.dia}</b> de cada mes.</p></div>`).join("")}</div>` : ""}
  <div class="card ix"><p class="ix-lbl">Lo que te hemos pagado</p><p class="ix-num">${mxn(d.recibido)}</p>
    ${ver.length ? `<div class="ix-pagos">${ver.map((x) => `<div class="ix-pago"><div><b>${mxn(x.monto)}</b><span>${fechaMedia(x.fecha)}${MET[x.metodo] ? " · " + MET[x.metodo] : ""}</span></div>${x.recibo ? `<button class="btn sm" type="button" data-rcb="${x.id}">Ver comprobante</button>` : ""}</div>`).join("")}</div>` : `<p class="ix-t">Aquí verás cada pago que te hagamos.</p>`}
    ${P.length > 5 ? `<button class="btn" type="button" id="inv-all">${PORT_ALL ? "Ver menos" : "Ver todos tus pagos"}</button>` : ""}</div>
  <div class="card ix"><p class="ix-t">¿Tienes alguna duda?</p><a class="btn primary ix-wa" href="https://wa.me/${WA}?text=${encodeURIComponent("Hola, soy " + (d.nombre || nom) + ". Tengo una duda sobre mi inversión.")}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>
    ${d.actualizado ? `<p class="note">Actualizado el ${fechaMedia(d.actualizado.slice(0, 10))}.</p>` : ""}</div>
  </div>`;
}
function bindInvPage(box) {
  box.querySelectorAll("[data-ixbig]").forEach((b) => (b.onclick = () => { INV_BIG = !INV_BIG; try { localStorage.setItem("inv_big", INV_BIG ? "1" : "0"); } catch (e) {} box.querySelector(".invx")?.classList.toggle("big", INV_BIG); b.textContent = INV_BIG ? "Letra normal" : "Letra más grande"; }));
  const all = box.querySelector("#inv-all"); if (all) all.onclick = () => { PORT_ALL = !PORT_ALL; if (TAB === "inv") vInv(); };
  box.querySelectorAll("[data-rcb]").forEach((b) => (b.onclick = async () => { b.disabled = true; try { const s2 = await getDoc(doc(db, "recibos", b.dataset.rcb)); if (s2.exists()) verDoc(s2.data(), "Comprobante de pago"); } catch (er) {} b.disabled = false; }));
}
function vInv() {
  setTimeout(bindSolInv);
  if (!PORT_UN) PORT_UN = onSnapshot(doc(db, "portafolio", ME.uid), (s) => { PORT = s.exists() ? s.data() : null; if (TAB === "inv") vInv(); }, () => { PORT = null; if (TAB === "inv") vInv(); });
  const d = PORT, nom = (USER.nombre || "").split(" ")[0];
  if (d === undefined) { $("panel").innerHTML = `<div class="card"><p class="muted">Cargando tu inversión…</p></div>`; return; }
  if (!d) { $("panel").innerHTML = `<div class="card inv"><h2>Hola ${esc(nom)}</h2><p class="big-t">Estamos preparando el resumen de tu inversión. En cuanto esté listo lo verás aquí.</p><a class="btn primary" href="https://wa.me/${WA}" target="_blank" rel="noopener">Escribir a Entre Amigos</a></div>` + misSolicitudesInv(); return; }
  $("panel").innerHTML = invPageHTML(d, nom) + misSolicitudesInv();
  bindInvPage($("panel"));
}

/* ---------- Inversionistas y cuentas (admin) ---------- */
let CU_MONTH = null, CU_OPEN = "", ENTEDIT = "", INVS = [], INV_OPEN = "", INV_FORM = "", INVCFG = {};
const cfgKey = (k) => k.replace(/[\/]/g, "_");
// Apodo que el administrador le pone a cada inversionista para ubicarlo (solo lo ve él; a ellos les llega su nombre real).
const apodoDe = (k) => (INVCFG[cfgKey(k)]?.apodo || "").trim();
const verNom = (k, nombre) => apodoDe(k) || nombre || "";
const diasDe = (k) => { const d = INVCFG[cfgKey(k)]?.dias; return d === 0 || d ? Number(d) : 5; };
const uidDe = (e) => e.x.uid || INVCFG[cfgKey(e.k)]?.uid || "";
const METODO = { transferencia: "Transferencia", efectivo: "Efectivo", otro: "Otro" };
function movimientos() {
  // Para cada pago recibido, cuánto le toca a cada persona del reparto.
  const L = ledger(PRES);
  L.forEach((r) => {
    r.partes = (REP[r.p.id]?.participantes || []).map((x) => ({ x, ...parteDe(r, x) }));
    r.paraMi = Math.round((r.interes - r.partes.reduce((s, q) => s + q.int, 0)) * 100) / 100;
  });
  return L;
}
/* ---------- Inversiones (contratos): el inversionista te presta a una tasa fija y le pagas cada mes ---------- */
const INV_OFF = ["pendiente", "rechazada"];
const CONTRATOS = () => INVS.filter((m) => m.tipo !== "retiro" && m.tasa > 0 && !INV_OFF.includes(m.estado || ""));
const retirosDe = (m) => INVS.filter((z) => z.tipo === "retiro" && z.aid === m.id);
const vigenteDe = (m, f) => Math.max(0, Math.round((m.monto - retirosDe(m).filter((z) => !f || z.fecha <= f).reduce((s, z) => s + z.monto, 0)) * 100) / 100);
const mensualDe = (m) => Math.round(vigenteDe(m) * m.tasa) / 100;
const diaDe = (m) => Number((m.fecha || "").slice(8, 10)) || 1;
const proxInv = (m) => pagosInversion(m, retirosDe(m), iso(new Date(Date.now() + 400 * 864e5))).find((f) => f.fecha >= today()) || null;
// Cuánto te pagan los clientes de los préstamos donde colocaste ese dinero, contra lo que le pagas al inversionista.
function interesMesPrestamo(p) {
  const a = avance(p); if (a.liquidado) return { int: 0, cap: 0 };
  let f = null; try { f = desgloseFilas(p).find((x) => x.fecha >= today()); } catch (e) {}
  return { int: f ? f.interes : 0, cap: debeDe(p, a) || 0 };
}
// El capital de cada préstamo se reparte entre las inversiones colocadas en él (las más antiguas primero),
// para no contar dos veces el mismo interés.
function margenes() {
  const libre = {}, R = {};
  CONTRATOS().filter((m) => vigenteDe(m) > 0.5).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).forEach((m) => {
    let resto = vigenteDe(m), cobras = 0; const det = [];
    (m.pids || []).forEach((pid) => {
      const p = PRES.find((x) => x.id === pid); if (!p || resto <= 0.5) return;
      const { int, cap } = interesMesPrestamo(p); if (!cap) return;
      if (libre[pid] === undefined) libre[pid] = cap;
      const usa = Math.min(resto, libre[pid]); if (usa <= 0.5) return;
      const c = Math.round(((int * usa) / cap) * 100) / 100;
      libre[pid] -= usa; resto -= usa; cobras += c; det.push({ p, cobras: c, tasa: p.tasa, monto: Math.round(usa) });
    });
    const pagas = mensualDe(m);
    R[m.id] = { cobras: Math.round(cobras * 100) / 100, pagas, queda: Math.round((cobras - pagas) * 100) / 100, sinColocar: Math.max(0, Math.round(resto)), det };
  });
  return R;
}
// Evento mensual en Google Calendar (se abre en la app de Google con los datos listos para guardar).
function gcalLink(m) {
  const d = proxInv(m); if (!d) return "";
  const ymd = d.fecha.replace(/-/g, ""), nx = new Date(d.fecha + "T12:00:00"); nx.setDate(nx.getDate() + 1);
  const dia = diaDe(m), by = dia > 28 ? `BYMONTHDAY=${Array.from({ length: dia - 27 }, (_, i) => 28 + i).join(",")};BYSETPOS=-1` : `BYMONTHDAY=${dia}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: `Pagar a ${m.nombre} ${mxn(mensualDe(m))}`, dates: `${ymd}/${iso(nx).replace(/-/g, "")}`, recur: `RRULE:FREQ=MONTHLY;${by}`, ctz: "America/Mexico_City",
    details: `Interés de su inversión de ${mxn(vigenteDe(m))} al ${m.tasa}% mensual. Cuando le pagues, márcalo en la app de préstamos con "Ya le pagué".` });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}
// Lo que le toca a cada inversionista: el interés de cada pago programado del cliente (se le paga aunque el
// cliente se atrase) y el capital cuando el cliente lo paga. Fecha límite: el pago del cliente + 5 días hábiles.
function obligaciones() {
  const O = [], hoy = today();
  const lim = iso(new Date(Date.now() + 40 * 864e5));
  PRES.forEach((p) => {
    const L = REP[p.id]?.participantes || []; if (!L.length || !p.inicio) return;
    const recK = p.recibe ? persKey({ uid: p.recibe }) : "";
    let filas;
    try { filas = desgloseFilas(p); } catch (e) { filas = []; }
    // Si el préstamo se liquidó antes del plazo, no hay intereses de meses posteriores.
    const lp = (p.pagos || []).filter((y) => y.liq || y.nota === "Liquidación"), liqF = lp.length ? lp.map((y) => y.fecha).sort().at(-1) : "";
    L.forEach((x) => {
      if (x.migrado) return; // ya es un contrato de inversión: se paga por el contrato, no por el préstamo
      const k = persKey(x); if (k === recK) return; const dh = diasDe(k);
      filas.forEach((f) => {
        if (!f.fecha || f.fecha > lim || (x.desde && f.fecha < x.desde) || (p.corte && f.fecha <= p.corte) || (liqF && f.fecha > liqF)) return;
        const q = parteDe({ p, interes: f.interes, capital: 0 }, x); if (q.int < 0.005) return;
        O.push({ k, x, p, fecha: f.fecha, limite: masHabiles(f.fecha, dh), monto: q.int, concepto: (p.tipo === "interes" ? "Interés del mes " : "Interés, pago ") + f.n, futuro: f.fecha > hoy });
      });
      if (x.capital) ledger([p]).forEach((r) => { if (r.capital > 0.005 && (!x.desde || r.fecha >= x.desde)) O.push({ k, x, p, fecha: r.fecha, limite: masHabiles(r.fecha, dh), monto: Math.round(r.capital * 100) / 100, concepto: "Capital que pagó el cliente", futuro: false }); });
    });
  });
  CONTRATOS().forEach((m) => {
    const k = persKey(m), dh = diasDe(k);
    pagosInversion(m, retirosDe(m), lim).forEach((f) => O.push({ k, x: { uid: m.uid || "", nombre: m.nombre }, p: null, inv: m, fecha: f.fecha, limite: masHabiles(f.fecha, dh), monto: f.monto,
      concepto: f.final ? "Interés hasta el día que le regresaste su dinero" : f.parcial ? "Interés del mes (le regresaste capital)" : "Interés de su inversión", futuro: f.fecha > hoy }));
  });
  return O.sort((a, b) => (a.limite < b.limite ? -1 : 1));
}
function desgloseFilas(p) {
  if (p.tipo === "interes") return avanceInteres(p).corrida.filas.map((f) => ({ n: f.n, interes: f.pago, fecha: iso(f.fecha) }));
  const a = avance(p), c = a.corrida, fr = c.total ? c.intereses / c.total : 0;
  return c.filas.map((f) => ({ n: f.n, interes: f.interes ?? Math.round(f.pago * fr * 100) / 100, fecha: iso(fechaPago(p.inicio, f.n, p.tipo)) }));
}
// Estado de cuenta por persona: lo que le debo (o me debe si recibe pagos de clientes por mí).
function estadoPersonas() {
  const hoy = today(), O = obligaciones(), P = {};
  const get = (x) => { const k = persKey(x); return (P[k] = P[k] || { k, x, obl: [], debo: 0, futuro: [], cobrado: [], meDebe: 0, pagado: 0, recibido: 0, aportes: 0, retiros: 0, prestamos: [] }); };
  O.forEach((o) => { const e = get(o.x); if (o.futuro) e.futuro.push(o); else { e.obl.push(o); e.debo += o.monto; } });
  movimientos().forEach((r) => { if (!r.p.recibe) return; const e = get({ uid: r.p.recibe }); const mio = r.partes.find((q) => persKey(q.x) === e.k); const queda = mio ? mio.total : 0; e.cobrado.push({ r, entrega: Math.round((r.monto - queda) * 100) / 100 }); e.meDebe += r.monto - queda; });
  ENT.forEach((m) => { const e = get(m); if (m.dir === "de") e.recibido += m.monto || 0; else e.pagado += m.monto || 0; });
  INVS.forEach((m) => { if (INV_OFF.includes(m.estado || "")) return; const e = get(m); if (m.tipo === "retiro") e.retiros += m.monto || 0; else e.aportes += m.monto || 0; });
  PRES.forEach((p) => (REP[p.id]?.participantes || []).forEach((x) => { if (x.migrado) return; const a = avance(p); if (!a.liquidado) get(x).prestamos.push({ p, x, a }); }));
  Object.values(P).forEach((e) => {
    const r2 = (n) => Math.round(n * 100) / 100;
    e.neto = r2(e.debo - e.pagado - e.meDebe + e.recibido);
    // Qué pagos ya quedaron cubiertos (lo pagado se aplica a lo más antiguo).
    let disp = e.pagado + Math.max(0, e.meDebe - e.recibido); e.obl.forEach((o) => { const c = Math.min(disp, o.monto); o.cubierto = r2(c); o.falta = r2(o.monto - c); disp -= c; o.vencida = o.falta > 0.5 && o.limite < hoy; });
    e.pend = e.obl.filter((o) => o.falta > 0.5);
    e.capPuesto = r2(e.aportes - e.retiros);
    e.capPrestado = r2(e.prestamos.reduce((s, q) => s + (q.x.aporte ? Math.min(q.x.aporte, debeDe(q.p, q.a) || q.x.aporte) : debeDe(q.p, q.a) || q.p.monto) , 0));
    e.nombre = persName(e.x); e.ver = verNom(e.k, e.nombre);
    e.inv = e.prestamos.length || e.aportes || USERS.find((u) => u.uid === e.x.uid)?.inversionista;
  });
  return P;
}

/* ---------- Inversionistas desde la ficha del préstamo: quién puso el dinero y cuánto le pagas ---------- */
let PINV = "";
function personasInv() {
  const M = new Map();
  USERS.filter((u) => u.rol !== "admin" && u.rol !== "bloqueado" && (u.inversionista || u.rol === "equipo")).forEach((u) => M.set(u.uid, u.nombre || u.email));
  INVS.forEach((m) => { if (m.tipo === "retiro" || INV_OFF.includes(m.estado || "")) return; const k = persKey(m); if (!M.has(k)) M.set(k, m.nombre); });
  [...M.keys()].forEach((k) => { if (apodoDe(k)) M.set(k, apodoDe(k) + " (" + M.get(k) + ")"); });
  return [...M.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
}
function prestamoInvBox(p) {
  if (!isAdmin()) return "";
  const C = CONTRATOS().filter((m) => (m.pids || []).includes(p.id) && vigenteDe(m) > 0.5), MG = margenes();
  const viejos = (REP[p.id]?.participantes || []).map((x, i) => ({ x, i })).filter(({ x }) => x.papel === "fondeo" && !x.migrado);
  const { int } = interesMesPrestamo(p), paga = C.reduce((s2, m) => s2 + ((MG[m.id]?.det || []).find((d) => d.p.id === p.id) ? mensualDe(m) * (MG[m.id].det.find((d) => d.p.id === p.id).monto / vigenteDe(m)) : 0), 0);
  const P = personasInv(), r2 = (n) => Math.round(n * 100) / 100;
  return `<details class="sec" data-pinvsec${C.length || viejos.length || PINV ? " open" : ""}><summary>Quién puso el dinero</summary>
    ${C.length ? `<div class="tbl cuadre"><table>
      <tr><td>El cliente te paga al mes</td><td class="r">${mxn2(int)}</td></tr>
      <tr><td>Pagas a inversionistas por este préstamo</td><td class="r">− ${mxn2(r2(paga))}</td></tr>
      <tr><td><b>Te queda al mes</b></td><td class="r"><b>${sgn2(r2(int - paga))}</b></td></tr></table></div>` : `<p class="muted">Este préstamo es con tu dinero. Si lo fondeó un inversionista, agrégalo aquí.</p>`}
    <div class="list">${C.map((m) => { const d = (MG[m.id]?.det || []).find((z) => z.p.id === p.id); return `<div class="item"><div class="item-top"><b>${esc(verNom(persKey(m), m.nombre))} · ${m.tasa}% al mes</b><span>${mxn2(mensualDe(m))} cada día ${diaDe(m)}</span></div>
      <div class="item-mid">Su inversión: ${mxn(vigenteDe(m))} del ${fdate(m.fecha)}${d ? ` · en este préstamo ${mxn(d.monto)}` : ""}${(m.pids || []).length > 1 ? ` · también en ${m.pids.length - 1} préstamo${m.pids.length > 2 ? "s" : ""} más` : ""}</div>
      <div class="actions"><button class="btn sm" type="button" data-pinv="ed:${m.id}">${PINV === "ed:" + m.id ? "Cerrar" : "Cambiar monto o %"}</button><button class="btn sm" type="button" data-pinv="ret:${m.id}">${PINV === "ret:" + m.id ? "Cerrar" : "Le regresé capital"}</button><button class="link del" type="button" data-pinvq="${m.id}">Quitar de este préstamo</button></div>
      ${PINV === "ed:" + m.id ? `<form class="edit" data-pinvf="ed:${m.id}" novalidate><div class="row"><label>Monto que te prestó<input name="m" inputmode="decimal" value="${Number(m.monto).toLocaleString("es-MX")}"></label><label>Le pagas al mes (%)<input name="t" inputmode="decimal" value="${m.tasa}"></label></div>
        <label>Fecha en que te prestó (le pagas ese día cada mes)<input name="f" type="date" value="${m.fecha}"></label><p class="note">Cambia la inversión completa de ${esc(m.nombre)}, no solo este préstamo.</p><p class="err" hidden></p><button class="btn sm primary" type="submit">Guardar</button></form>` : ""}
      ${PINV === "ret:" + m.id ? `<form class="edit" data-pinvret="${m.id}" novalidate><div class="row"><label>Monto que le regresaste<input name="m" inputmode="decimal" value="${vigenteDe(m).toLocaleString("es-MX")}"></label><label>Fecha<input name="f" type="date" value="${today()}"></label></div><p class="note">Ese mes le toca el interés de lo regresado solo por los días que lo tuviste; desde ahí su pago baja.</p><p class="err" hidden></p><button class="btn sm primary" type="submit">Guardar</button></form>` : ""}</div>`; }).join("")}</div>
    ${viejos.map(({ x }) => `<p class="err" style="margin:0">${esc(persName(x))} aparece también con el sistema anterior en este préstamo. Pásalo en la pestaña Inversionistas, caja "Pasar a inversiones", para que no se le pague dos veces.</p>`).join("")}
    ${PINV === "nuevo" ? `<form class="edit" data-pinvnew novalidate><h3>Agregar inversionista a este préstamo</h3>
      <label>¿Quién puso el dinero?<select name="who"><option value="">Otra persona (escribe el nombre)</option>${P.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join("")}</select></label>
      <label data-w="nom">Nombre<input name="nombre" placeholder="Ej. Pilar"></label>
      <label data-w="usar">¿Qué dinero es?<select name="usar"></select></label>
      <div data-w="nueva"><div class="row"><label>Monto que te prestó<input name="m" inputmode="decimal" value="${Number(debeDe(p, avance(p)) || p.monto).toLocaleString("es-MX")}"></label><label>Le pagas al mes (%)<input name="t" inputmode="decimal" placeholder="Ej. 2.5"></label></div>
        <label>Fecha en que te prestó (le pagas ese día cada mes, desde el mes siguiente)<input name="f" type="date" value="${today()}"></label></div>
      <p class="err" hidden></p><div class="actions"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-pinv="nuevo">Cancelar</button></div></form>`
    : `<button class="btn sm" type="button" data-pinv="nuevo">Agregar inversionista</button>`}
  </details>`;
}
function bindPrestamoInv(p) {
  const P = $("panel");
  const sec = P.querySelector("[data-pinvsec]"); if (!sec) return;
  P.querySelectorAll("[data-pinv]").forEach((b) => (b.onclick = () => { PINV = PINV === b.dataset.pinv ? "" : b.dataset.pinv; vPrestamos(); }));
  P.querySelectorAll("[data-pinvq]").forEach((b) => (b.onclick = async () => {
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez: su inversión sigue, solo queda sin colocar"; return; }
    const m = INVS.find((x) => x.id === b.dataset.pinvq); if (m) await updateDoc(doc(db, "inversiones", m.id), { pids: (m.pids || []).filter((x) => x !== p.id) });
  }));
  P.querySelectorAll("form[data-pinvf]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const g = (n) => f.querySelector(`[name=${n}]`).value, er = f.querySelector(".err"), id = f.dataset.pinvf.split(":")[1];
    const monto = num(g("m")), tasa = num(g("t")), fecha = g("f");
    if (!monto || !tasa || !fecha) { er.hidden = false; er.textContent = "Escribe monto, porcentaje y fecha."; return; }
    if (tasa >= 20) { er.hidden = false; er.textContent = "El porcentaje es mensual, por ejemplo 2.5."; return; }
    await updateDoc(doc(db, "inversiones", id), { monto, tasa, fecha, editado: new Date().toISOString() }); PINV = ""; vPrestamos();
  }));
  P.querySelectorAll("form[data-pinvret]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const m = INVS.find((x) => x.id === f.dataset.pinvret), g = (n) => f.querySelector(`[name=${n}]`).value, er = f.querySelector(".err"), mo = num(g("m")), fe = g("f");
    if (!m || !mo || !fe) { er.hidden = false; er.textContent = "Escribe el monto y la fecha."; return; }
    if (mo > vigenteDe(m) + 0.5) { er.hidden = false; er.textContent = "Es más de lo que te prestó (" + mxn(vigenteDe(m)) + ")."; return; }
    await addDoc(collection(db, "inversiones"), { uid: m.uid || "", nombre: m.nombre, tipo: "retiro", aid: m.id, monto: mo, fecha: fe, nota: "", reg: new Date().toISOString() }); PINV = ""; vPrestamos();
  }));
  const f = P.querySelector("form[data-pinvnew]"); if (!f) return;
  const w = (k) => f.querySelector(`[data-w=${k}]`), sel = f.querySelector("[name=who]"), usar = f.querySelector("[name=usar]");
  const upd = () => {
    const k = sel.value, MG = margenes();
    const C = k ? CONTRATOS().filter((m) => persKey(m) === k && vigenteDe(m) > 0.5 && !(m.pids || []).includes(p.id)) : [];
    usar.innerHTML = `<option value="">Dinero nuevo que me prestó</option>` + C.map((m) => `<option value="${m.id}">La inversión de ${mxn(vigenteDe(m))} al ${m.tasa}% del ${fdate(m.fecha)}${MG[m.id] ? " · sin colocar " + mxn(MG[m.id].sinColocar) : ""}</option>`).join("");
    const cap = debeDe(p, avance(p)) || p.monto, libre = C.find((m) => (MG[m.id]?.sinColocar || 0) >= cap - 1); usar.value = libre ? libre.id : "";
    w("nom").hidden = !!k; w("usar").hidden = !C.length; w("nueva").hidden = !!usar.value;
  };
  sel.onchange = upd; usar.onchange = () => (w("nueva").hidden = !!usar.value); upd();
  f.onsubmit = async (ev) => {
    ev.preventDefault(); const g = (n) => f.querySelector(`[name=${n}]`).value, er = f.querySelector(".err");
    try {
      if (usar.value) { const m = INVS.find((x) => x.id === usar.value); await updateDoc(doc(db, "inversiones", m.id), { pids: [...new Set([...(m.pids || []), p.id])] }); }
      else {
        const k = sel.value, u = USERS.find((x) => x.uid === k), ex = INVS.find((m) => persKey(m) === k);
        const nombre = u ? u.nombre || u.email : ex ? ex.nombre : g("nombre").trim(), uid = u ? u.uid : ex ? ex.uid || "" : "";
        const monto = num(g("m")), tasa = num(g("t")), fecha = g("f");
        if (!nombre) { er.hidden = false; er.textContent = "Elige quién puso el dinero o escribe su nombre."; return; }
        if (!monto || !tasa || !fecha) { er.hidden = false; er.textContent = "Escribe monto, porcentaje y fecha."; return; }
        if (tasa >= 20) { er.hidden = false; er.textContent = "El porcentaje es mensual, por ejemplo 2.5."; return; }
        await addDoc(collection(db, "inversiones"), { uid, nombre, tipo: "aporte", monto, tasa, fecha, pids: [p.id], nota: "", reg: new Date().toISOString() });
        if (uid) updateDoc(doc(db, "usuarios", uid), { inversionista: true }).catch(() => {});
      }
      PINV = ""; vPrestamos();
    } catch (x) { er.hidden = false; er.textContent = "No se pudo guardar. Revisa tu conexión."; }
  };
}
/* ---------- Aviso al abrir la app: pagos a inversionistas de hoy o atrasados (hasta que marques "Ya le pagué") ---------- */
let INVAL_T = null;
function drawInvAlert() { clearTimeout(INVAL_T); INVAL_T = setTimeout(drawInvAlert0, 300); }
function drawInvAlert0() {
  const box = $("inv-alert"); if (!box) return;
  if (!isAdmin() || !USERS.length || TAB === "agenda") { box.innerHTML = ""; return; }
  let EP; try { EP = estadoPersonas(); } catch (e) { box.innerHTML = ""; return; }
  const hoy = today(), L = Object.values(EP).flatMap((e) => e.pend.filter((o) => o.fecha <= hoy).map((o) => ({ e, o })));
  const sol = SOLINV.filter((x) => x.estado === "pendiente").length;
  if (!L.length && !sol) { box.innerHTML = ""; return; }
  const atr = L.filter((z) => z.o.fecha < hoy), hoyL = L.filter((z) => z.o.fecha === hoy);
  const fila = (z) => `<li><b>${esc(z.e.ver || z.e.nombre)}</b> ${mxn2(z.o.falta)}${z.o.fecha < hoy ? ` · tocaba el ${fdate(z.o.fecha)}${z.o.vencida ? " (fuera de plazo)" : ""}` : ""}</li>`;
  box.innerHTML = `<div class="card notice"><h3>Pagos a inversionistas</h3>
    ${hoyL.length ? `<p class="lbl">Hoy</p><ul class="ul">${hoyL.map(fila).join("")}</ul>` : ""}
    ${atr.length ? `<p class="lbl">Pendientes de días anteriores</p><ul class="ul">${atr.map(fila).join("")}</ul>` : ""}
    ${sol ? `<p class="muted">${sol} ${sol === 1 ? "inversionista te avisa" : "inversionistas te avisan"} que te prestó dinero. Revísalo para autorizarlo.</p>` : ""}
    ${TAB === "cuentas" ? "" : `<div class="actions"><button class="btn primary sm" type="button" id="inval-go">Ver y registrar pagos</button></div>`}</div>`;
  $("inval-go") && ($("inval-go").onclick = () => go("cuentas"));
}
/* ---------- Pantalla de inversiones (admin) ---------- */
let IVF = "", CONV_OK = false, SOLINV = [];
const sgn2 = (n) => (n < -0.005 ? "−" + mxn2(-n) : mxn2(n));
const fdate = (f) => fcorta(new Date(f + "T12:00:00"));
const activosPres = () => PRES.filter((p) => !avance(p).liquidado);
function contratoForm(m, dataKey, preset) {
  const per = USERS.filter((u) => u.rol !== "admin" && u.rol !== "bloqueado"), ids = new Set(m?.pids || []);
  return `<form class="edit" data-ivf="${dataKey}" novalidate>
    <h3>${m && m.id ? (dataKey.startsWith("aut:") ? "Autorizar inversión de " + esc(m.nombre) : "Editar inversión de " + esc(m.nombre)) : "Nueva inversión"}</h3>
    ${m && m.id ? "" : `<div class="row"><label>Persona<select name="uid"><option value="">Otra persona (escribe el nombre)</option>${per.map((u) => `<option value="${u.uid}"${preset?.uid === u.uid ? " selected" : ""}>${esc(apodoDe(u.uid) ? apodoDe(u.uid) + " (" + u.nombre + ")" : u.nombre)}</option>`).join("")}</select></label><label data-nomw${preset?.uid ? " hidden" : ""}>Nombre de la persona<input name="nombre" placeholder="Ej. Mamá" value="${esc(preset && !preset.uid ? preset.nombre : "")}"></label></div>`}
    <div class="row"><label>Monto que te prestó<input name="m" inputmode="decimal" value="${m?.monto ? Number(m.monto).toLocaleString("es-MX") : ""}"></label><label>Le pagas al mes (%)<input name="t" inputmode="decimal" value="${m?.tasa ?? ""}" placeholder="Ej. 2.5"></label></div>
    <label>Fecha en que te prestó (le pagas ese día cada mes, desde el mes siguiente)<input name="f" type="date" value="${m?.fecha || today()}"></label>
    <p class="lbl">¿En qué préstamos lo colocaste? (solo tú lo ves)</p>
    <div class="chks">${activosPres().map((p) => `<label class="chk"><input type="checkbox" name="pid" value="${p.id}"${ids.has(p.id) ? " checked" : ""}> ${esc(p.cliente)} · ${mxn(debeDe(p, avance(p)) || p.monto)}${p.tasa ? " · " + p.tasa + "%" : ""}</label>`).join("") || `<p class="muted">No hay préstamos activos.</p>`}</div>
    <label>Nota interna (opcional, no la ve el inversionista)<input name="n" value="${esc(dataKey.startsWith("aut:") ? "" : m?.nota || "")}"></label>
    <p class="err" hidden></p>
    <div class="actions"><button class="btn primary" type="submit">${dataKey.startsWith("aut:") ? "Autorizar" : "Guardar"}</button><button class="btn" type="button" data-ivx>Cancelar</button></div></form>`;
}
function propuestasConv() {
  const L = [];
  PRES.forEach((p) => (REP[p.id]?.participantes || []).forEach((x, i) => {
    if (x.papel !== "fondeo" || x.migrado) return;
    const monto = x.aporte || p.monto;
    const tasa = x.base === "puntos" ? x.valor : x.base === "pct" ? Math.round(p.tasa * x.valor) / 100 : monto ? Math.round((x.valor / monto) * 10000) / 100 : 0;
    const fecha = iso(fechaPago(x.desde || p.inicio || today(), 0, "mensual"));
    const ex = INVS.find((m) => m.tipo !== "retiro" && !(m.tasa > 0) && !INV_OFF.includes(m.estado || "") && persKey(m) === persKey(x));
    // Inversiones con tasa que ya registraste a esa persona (por cuenta o por nombre): se pueden ligar sin crear otra.
    const nm = (t) => String(t || "").trim().toLowerCase().split(/\s+/)[0];
    const ya = CONTRATOS().filter((m) => persKey(m) === persKey(x) || (nm(m.nombre) && nm(m.nombre) === nm(persName(x))));
    L.push({ key: p.id + "_" + i, p, i, x, nombre: persName(x), monto, tasa, fecha, ex, ya });
  }));
  return L;
}
function convCard() {
  const L = propuestasConv(), usados = new Set(L.map((q) => q.ex?.id).filter(Boolean));
  const sueltas = INVS.filter((m) => m.tipo !== "retiro" && !(m.tasa > 0) && !INV_OFF.includes(m.estado || "") && !usados.has(m.id));
  if (!L.length && !sueltas.length) return "";
  return `<div class="card avis"><h2>Pasar a inversiones</h2>
    <p class="muted">Encontré lo que ya tenías capturado. Mientras esté aquí, ese fondeo sigue contando por separado: si además ya lo registraste como inversión, se le estaría pagando dos veces. Revisa cada dato; no se guarda nada hasta que toques Confirmar. Los préstamos y sus pagos no se modifican.</p>
    <form id="convf" novalidate><div class="list">
    ${L.map((q) => `<div class="item" data-cq="${q.key}"><div class="item-top"><b>${esc(q.nombre)}</b><span>Fondeó el préstamo de ${esc(q.p.cliente)}</span></div>
      ${q.ya.length ? `<label>¿Ya la registraste como inversión?<select name="link"><option value="">No, crear la inversión con estos datos</option>${q.ya.map((m) => `<option value="${m.id}"${(q.ya.find((z) => Math.abs(vigenteDe(z) - q.monto) < 1) || (q.ya.length === 1 ? q.ya[0] : null))?.id === m.id ? " selected" : ""}>Sí: ${esc(m.nombre)} · ${mxn(vigenteDe(m))} al ${m.tasa}% del ${fdate(m.fecha)}</option>`).join("")}</select></label>
      <p class="note">Si eliges "Sí", solo se quita el fondeo antiguo de este préstamo y se liga a esa inversión. No se crea otra.</p>` : ""}
      <div class="row"><label>Monto que te prestó<input name="m" inputmode="decimal" value="${Number(q.monto).toLocaleString("es-MX")}"></label><label>Le pagas al mes (%)<input name="t" inputmode="decimal" value="${q.tasa || ""}"></label></div>
      <label>Fecha en que te prestó<input name="f" type="date" value="${q.fecha}"></label>
      ${q.ex ? `<label class="chk"><input type="checkbox" name="ex" value="${q.ex.id}"${Math.abs(q.ex.monto - q.monto) < 1 ? " checked" : ""}> Es la misma aportación de ${mxn(q.ex.monto)} del ${fdate(q.ex.fecha)} que ya registraste (no la dupliques)</label>` : ""}</div>`).join("")}
    ${sueltas.map((m) => `<div class="item" data-cs="${m.id}"><div class="item-top"><b>${esc(m.nombre)}</b><span>Aportación sin tasa</span></div>
      <div class="row"><label>Monto<input name="m" inputmode="decimal" value="${Number(m.monto).toLocaleString("es-MX")}"></label><label>Le pagas al mes (%)<input name="t" inputmode="decimal" placeholder="Déjalo vacío si no le pagas interés"></label></div>
      <label>Fecha en que te prestó<input name="f" type="date" value="${m.fecha || today()}"></label></div>`).join("")}
    </div><p class="err" hidden></p><button class="btn primary" type="submit">Confirmar y pasar a inversiones</button></form></div>`;
}
function inversionesCard(solo) {
  const C = CONTRATOS().filter((m) => vigenteDe(m) > 0.5 && (!solo || persKey(m) === solo)).sort((a, b) => a.nombre.localeCompare(b.nombre) || (a.fecha < b.fecha ? -1 : 1));
  const pend = SOLINV.filter((m) => m.estado === "pendiente"), r2 = (n) => Math.round(n * 100) / 100;
  const M = margenes();
  const tot = r2(C.reduce((s, m) => s + vigenteDe(m), 0)), pagas = r2(C.reduce((s, m) => s + M[m.id].pagas, 0)), cobras = r2(C.reduce((s, m) => s + M[m.id].cobras, 0)), sin = C.reduce((s, m) => s + M[m.id].sinColocar, 0);
  const preset = solo ? (() => { const u = USERS.find((x) => x.uid === solo); const m = INVS.find((x) => persKey(x) === solo); return { uid: u ? u.uid : "", nombre: u ? u.nombre : m?.nombre || "" }; })() : null;
  return `${solo ? "" : convCard()}
  ${!solo && pend.length ? `<div class="card avis"><h2>Inversionistas que te avisan que te prestaron</h2><div class="list">${pend.map((m) => `<div class="item"><div class="item-top"><b>${esc(m.nombre)} · ${mxn(m.monto)}</b><span>${m.tasa}% al mes · ${fdate(m.fecha)}</span></div>
      ${m.nota ? `<div class="item-mid">${esc(m.nota)}</div>` : ""}
      <div class="actions"><button class="btn sm primary" type="button" data-ivo="aut:${m.id}">Revisar y autorizar</button><button class="link del" type="button" data-ivo="rej:${m.id}">No es correcto</button></div>
      ${IVF === "aut:" + m.id ? contratoForm(m, "aut:" + m.id) : ""}
      ${IVF === "rej:" + m.id ? `<form class="edit" data-ivrej="${m.id}" novalidate><label>Motivo (lo verá en su app)<input name="m" placeholder="Ej. El monto fue 80,000"></label><button class="btn sm danger" type="submit">Rechazar</button></form>` : ""}</div>`).join("")}</div></div>` : ""}
  <div class="card"><div class="head"><h2>${solo ? "Sus inversiones" : "Inversiones"}</h2><button class="btn sm" type="button" data-ivo="nuevo">${IVF === "nuevo" ? "Cancelar" : "Nueva inversión"}</button></div>
    <div class="facts"><div><span>Te han prestado</span><b>${mxn(tot)}</b></div><div><span>Les pagas al mes</span><b>${mxn2(pagas)}</b></div><div><span>Cobras por ese dinero</span><b>${mxn2(cobras)}</b></div><div><span>Te queda al mes</span><b class="${cobras - pagas < -0.5 ? "warn-t" : "lime"}">${sgn2(r2(cobras - pagas))}</b></div></div>
    ${sin > 0.5 ? `<p class="err" style="margin:0">Tienes ${mxn(sin)} de inversionistas sin colocar: les pagas interés sin que un cliente te lo pague.</p>` : ""}
    ${IVF === "nuevo" ? contratoForm(null, "nuevo", preset) : ""}
    <div class="list">${C.length ? C.map((m) => {
      const g = M[m.id], px = proxInv(m), cambio = m.gcalMonto && Math.abs(m.gcalMonto - mensualDe(m)) > 0.5;
      return `<div class="item"><div class="item-top"><b>${esc(verNom(persKey(m), m.nombre))} · ${mxn(vigenteDe(m))} al ${m.tasa}%</b><span>${mxn2(mensualDe(m))} cada día ${diaDe(m)}</span></div>
        <div class="item-mid">Te prestó el ${fdate(m.fecha)}${vigenteDe(m) < m.monto ? ` (${mxn(m.monto)}; le has regresado ${mxn(m.monto - vigenteDe(m))})` : ""}${px ? ` · Próximo pago ${mxn2(px.monto)} el ${fdate(px.fecha)}` : ""}</div>
        <div class="item-mid">${g.det.length ? `Colocado en ${g.det.map((d) => `${esc(d.p.cliente)} (${d.tasa}%, te paga ${mxn2(d.cobras)})`).join(", ")} · te quedan <b>${sgn2(g.queda)}</b> al mes` : ""}${g.sinColocar > 0.5 ? `${g.det.length ? " · " : ""}<span class="warn-t">Sin colocar ${mxn(g.sinColocar)}</span>` : ""}</div>
        ${cambio ? `<p class="note" style="color:var(--warn)">El pago mensual cambió a ${mxn2(mensualDe(m))}. Vuelve a anotarlo en Google Calendar y borra el evento anterior.</p>` : ""}
        <div class="actions"><button class="btn sm" type="button" data-ivo="ed:${m.id}">Editar</button><button class="btn sm" type="button" data-ivo="ret:${m.id}">Le regresé capital</button>${gcalLink(m) ? `<a class="btn sm" href="${gcalLink(m)}" target="_blank" rel="noopener" data-gcal="${m.id}">${m.gcalMonto ? "Volver a anotar en Google Calendar" : "Anotar en Google Calendar"}</a>` : ""}</div>
        ${IVF === "ed:" + m.id ? contratoForm(m, "ed:" + m.id) : ""}
        ${IVF === "ret:" + m.id ? `<form class="edit" data-ivret="${m.id}" novalidate><h3>Le regresé capital a ${esc(m.nombre)}</h3><div class="row"><label>Monto<input name="m" inputmode="decimal" value="${vigenteDe(m).toLocaleString("es-MX")}"></label><label>Fecha<input name="f" type="date" value="${today()}"></label></div>
          <p class="note">Ese mes le toca el interés de lo que le regresas solo por los días que lo tuviste; desde ahí su pago baja en proporción. Si le regresas todo, su último interés se le paga ese mismo día.</p><label>Nota (opcional)<input name="n"></label><p class="err" hidden></p><button class="btn primary" type="submit">Guardar</button></form>` : ""}</div>`;
    }).join("") : `<p class="muted">Sin inversiones activas. Toca Nueva inversión, o espera a que tus inversionistas te avisen desde su app.</p>`}</div>
  </div>`;
}
function bindInversiones() {
  const P = $("panel"), r2 = (n) => Math.round(n * 100) / 100;
  P.querySelectorAll("[data-ivo]").forEach((b) => (b.onclick = () => { IVF = IVF === b.dataset.ivo ? "" : b.dataset.ivo; vCuentas(); }));
  P.querySelectorAll("[data-ivx]").forEach((b) => (b.onclick = () => { IVF = ""; vCuentas(); }));
  P.querySelectorAll("[data-gcal]").forEach((a) => a.addEventListener("click", () => { const m = INVS.find((x) => x.id === a.dataset.gcal); if (m) updateDoc(doc(db, "inversiones", m.id), { gcalMonto: mensualDe(m) }).catch(() => {}); }));
  P.querySelectorAll("form[data-ivf]").forEach((f) => { const u = f.querySelector("[name=uid]"), w = f.querySelector("[data-nomw]"); if (u && w) u.onchange = () => (w.hidden = !!u.value); });
  P.querySelectorAll("form[data-ivf]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const g = (n) => f.querySelector(`[name=${n}]`), er = f.querySelector(".err"), k = f.dataset.ivf;
    const monto = num(g("m").value), tasa = num(g("t").value), fecha = g("f").value, pids = [...f.querySelectorAll("[name=pid]:checked")].map((x) => x.value);
    if (!monto || !tasa || !fecha) { er.hidden = false; er.textContent = "Escribe el monto, el porcentaje y la fecha."; return; }
    const d = { monto, tasa, fecha, pids, nota: g("n").value.trim(), editado: new Date().toISOString() };
    try {
      if (k === "nuevo") {
        const uid = g("uid").value, nombre = uid ? USERS.find((u) => u.uid === uid)?.nombre || "" : g("nombre").value.trim();
        if (!nombre) { er.hidden = false; er.textContent = "Elige la persona o escribe su nombre."; return; }
        await addDoc(collection(db, "inversiones"), { uid, nombre, tipo: "aporte", ...d, reg: new Date().toISOString() });
        if (uid) updateDoc(doc(db, "usuarios", uid), { inversionista: true }).catch(() => {});
      } else if (k.startsWith("aut:")) {
        const sid = k.split(":")[1], sq = SOLINV.find((x) => x.id === sid); if (!sq) return;
        const ref = await addDoc(collection(db, "inversiones"), { uid: sq.uid, nombre: sq.nombre, tipo: "aporte", ...d, sol: sid, reg: new Date().toISOString() });
        await updateDoc(doc(db, "solinv", sid), { estado: "autorizada", inv: ref.id, monto, tasa, fecha });
        updateDoc(doc(db, "usuarios", sq.uid), { inversionista: true }).catch(() => {});
      } else {
        await updateDoc(doc(db, "inversiones", k.split(":")[1]), d);
      }
      IVF = ""; vCuentas();
    } catch (x) { er.hidden = false; er.textContent = "No se pudo guardar. Revisa tu conexión."; }
  }));
  P.querySelectorAll("form[data-ivret]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const m = INVS.find((x) => x.id === f.dataset.ivret), g = (n) => f.querySelector(`[name=${n}]`).value, er = f.querySelector(".err");
    const mo = num(g("m")), fe = g("f");
    if (!m || !mo || !fe) { er.hidden = false; er.textContent = "Escribe el monto y la fecha."; return; }
    if (mo > vigenteDe(m) + 0.5) { er.hidden = false; er.textContent = "Es más de lo que te prestó (" + mxn(vigenteDe(m)) + ")."; return; }
    await addDoc(collection(db, "inversiones"), { uid: m.uid || "", nombre: m.nombre, tipo: "retiro", aid: m.id, monto: mo, fecha: fe, nota: g("n").trim(), reg: new Date().toISOString() });
    IVF = ""; vCuentas();
  }));
  P.querySelectorAll("form[data-ivrej]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const mo = f.querySelector("[name=m]").value.trim(); if (!mo) return;
    await updateDoc(doc(db, "solinv", f.dataset.ivrej), { estado: "rechazada", motivo: mo }); IVF = ""; vCuentas();
  }));
  const cf = $("convf");
  if (cf) cf.onsubmit = async (ev) => {
    ev.preventDefault(); const er = cf.querySelector(".err"), L = propuestasConv(), btn = cf.querySelector("button[type=submit]");
    const val = (el, n) => el.querySelector(`[name=${n}]`);
    for (const el of cf.querySelectorAll("[data-cq]")) if (!val(el, "link")?.value && (!num(val(el, "m").value) || !num(val(el, "t").value) || !val(el, "f").value)) { er.hidden = false; er.textContent = "Cada inversión necesita monto, porcentaje y fecha."; el.scrollIntoView({ block: "center" }); return; }
    btn.disabled = true; er.hidden = false; er.className = "ok"; er.textContent = "Guardando…";
    try {
      const porPres = {};
      for (const q of L) {
        const el = cf.querySelector(`[data-cq="${q.key}"]`); if (!el) continue;
        const d = { monto: num(val(el, "m").value), tasa: num(val(el, "t").value), fecha: val(el, "f").value, conv: true, editado: new Date().toISOString() };
        const ex = val(el, "ex")?.checked ? val(el, "ex").value : "", link = val(el, "link")?.value || "";
        let aid = link || ex;
        if (link) { const m = INVS.find((x) => x.id === link); await updateDoc(doc(db, "inversiones", link), { pids: [...new Set([...(m?.pids || []), q.p.id])] }); }
        else if (ex) { const m = INVS.find((x) => x.id === ex); await updateDoc(doc(db, "inversiones", ex), { ...d, pids: [...new Set([...(m?.pids || []), q.p.id])] }); }
        else { const ref = await addDoc(collection(db, "inversiones"), { uid: q.x.uid || "", nombre: q.nombre, tipo: "aporte", ...d, pids: [q.p.id], reg: new Date().toISOString() }); aid = ref.id; }
        (porPres[q.p.id] = porPres[q.p.id] || []).push({ i: q.i, aid });
      }
      // Solo se marca en el reparto (no en el préstamo) que ese fondeo ya es un contrato.
      for (const [pid, arr] of Object.entries(porPres)) {
        const Lp = (REP[pid]?.participantes || []).map((x, i) => { const z = arr.find((a) => a.i === i); return z ? { ...x, migrado: z.aid } : x; });
        await setDoc(doc(db, "repartos", pid), { ...(REP[pid] || {}), participantes: Lp });
      }
      for (const el of cf.querySelectorAll("[data-cs]")) { const t = num(val(el, "t").value); if (t) await updateDoc(doc(db, "inversiones", el.dataset.cs), { monto: num(val(el, "m").value), tasa: t, fecha: val(el, "f").value, conv: true }); }
      CONV_OK = true; vCuentas();
    } catch (x) { btn.disabled = false; er.className = "err"; er.textContent = "No se pudo guardar todo. Revisa tu conexión e intenta de nuevo."; }
  };
}

/* ---------- Vista de un inversionista: cuánto te prestó, cuánto le debes y todo su historial ---------- */
let INV_SEL = "";
function selectorInv(PL) {
  const L = PL.filter((e) => e.inv || CONTRATOS().some((m) => persKey(m) === e.k));
  if (!L.length) return "";
  return `<div class="chips" role="tablist"><button type="button" class="chip${INV_SEL ? "" : " on"}" data-isel="">Todos</button>${L.map((e) => `<button type="button" class="chip${INV_SEL === e.k ? " on" : ""}" data-isel="${esc(e.k)}">${esc(apodoDe(e.k) || nom1(e.nombre))}</button>`).join("")}</div>`;
}
function personaInvView(e, formPago) {
  const hoy = today(), r2 = (n) => Math.round(n * 100) / 100, C = CONTRATOS().filter((m) => persKey(m) === e.k);
  const mensual = r2(C.reduce((s2, m) => s2 + mensualDe(m), 0)), debe = r2(e.pend.reduce((s2, o) => s2 + o.falta, 0)), prox = e.futuro[0];
  const u = USERS.find((x) => x.uid === uidDe(e));
  const filas = [...e.obl, ...e.futuro.slice(0, 3)].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const st = (o) => o.futuro ? ["Próximo", ""] : (o.falta ?? o.monto) <= 0.5 ? ["Pagado", "ok"] : o.vencida ? ["Atrasado", "late"] : (o.cubierto || 0) > 0.005 ? ["Parcial", "warn"] : ["Por pagar", "warn"];
  return `<div class="card">
    <div class="head"><h2>${esc(e.ver)}</h2><span class="muted">${apodoDe(e.k) ? esc(e.nombre) + " · " : ""}${u ? "Tiene cuenta en la app" : "Sin cuenta en la app"}</span></div>
    <div class="facts">
      <div><span>Te ha prestado</span><b>${mxn(e.aportes)}</b></div><div><span>Le has regresado</span><b>${mxn(e.retiros)}</b></div>
      <div><span>Tienes de su dinero</span><b>${mxn(e.capPuesto)}</b></div><div><span>Le pagas al mes</span><b>${mxn2(mensual)}</b></div>
      <div><span>Le has pagado</span><b>${mxn2(e.pagado)}</b></div><div><span>Le debes hoy</span><b class="${debe > 0.5 ? "warn-t" : "lime"}">${mxn2(debe)}</b></div>
    </div>
    ${prox ? `<p class="muted" style="margin:0">Próximo pago: <b>${mxn2(prox.monto)}</b> el ${fdate(prox.fecha)}${prox.limite !== prox.fecha ? " (a más tardar el " + fdate(prox.limite) + ")" : ""}.</p>` : ""}
    <div class="actions"><button class="btn sm primary" type="button" data-pag="${esc(e.k)}">Ya le pagué</button>${e.meDebe > 0.5 || e.neto < -0.5 ? `<button class="btn sm" type="button" data-rec="${esc(e.k)}">Me entregó</button>` : ""}<button class="btn sm" type="button" data-icfg="${esc(e.k)}">${apodoDe(e.k) ? "Apodo, app y plazos" : "Ponerle apodo, app y plazos"}</button><button class="btn sm" type="button" data-ivver="${esc(e.k)}">Ver como lo ve ${esc(nom1(e.nombre))}</button></div>
    ${INV_FORM === "pag:" + e.k ? formPago(e, Math.min(debe, Math.max(0, e.neto)) || (prox ? prox.monto : 0), "a") : ""}
    ${INV_FORM === "rec:" + e.k ? formPago(e, -e.neto, "de") : ""}
    ${INV_FORM === "cfg:" + e.k ? cfgForm(e) : ""}
  </div>
  ${inversionesCard(e.k)}
  <div class="card"><h2>Sus pagos</h2>
    <p class="note" style="margin:0">Lo que le toca cada mes y si ya se lo pagaste. Lo que le pagas se aplica a lo más antiguo.</p>
    <div class="tbl cuadre"><table class="edo"><tr><th>Fecha</th><th>Monto</th><th>Falta</th><th></th></tr>${filas.length ? filas.map((o) => { const t = st(o); return `<tr><td>${mesC(o.fecha, true)} ${o.fecha.slice(2, 4)}</td><td>${mxn(o.monto)}</td><td>${o.futuro ? "" : mxn(o.falta ?? o.monto)}</td><td><span class="pill ${t[1]}">${t[0]}</span></td></tr>`; }).join("") : `<tr><td colspan="4">Todavía no le toca ningún pago.</td></tr>`}</table></div>
  </div>
  ${e.prestamos.length ? `<div class="card"><h2>Comisiones en préstamos</h2><div class="list">${e.prestamos.map((q) => `<div class="item"><div class="item-top"><b>${esc(q.p.cliente)}</b><span>${esc(repTxt(q.p, q.x))}</span></div></div>`).join("")}</div></div>` : ""}
  <div class="card"><h2>Historial</h2><p class="note" style="margin:0">Todo lo que te prestó, lo que le regresaste y lo que le has pagado, del más reciente al más antiguo.</p>
    <div class="list">${movsDe(e).length ? movsDe(e).map(movRow).join("") : `<p class="muted">Sin movimientos registrados.</p>`}</div></div>`;
}
function vCuentas() {
  const base = CU_MONTH || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const y = base.getFullYear(), m = base.getMonth(), mes = iso(base).slice(0, 7), hoy = today();
  const L = movimientos(), LM = L.filter((r) => r.fecha.startsWith(mes));
  const O = obligaciones(), OM = O.filter((o) => o.fecha.startsWith(mes) && o.concepto !== "Capital que pagó el cliente");
  const sum = (l, f) => Math.round(l.reduce((s, r) => s + f(r), 0) * 100) / 100;
  const EP = estadoPersonas(), PL = Object.values(EP).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const porPagar = PL.flatMap((e) => e.pend.map((o) => ({ e, o }))).sort((a, b) => (a.o.limite < b.o.limite ? -1 : 1));
  const vencidas = porPagar.filter((z) => z.o.vencida);
  const intCob = sum(LM, (r) => r.interes);
  // Ganancia del mes según lo programado: interés que deben pagar los clientes menos lo que le toca a inversionistas.
  let intProg = 0, intInv = 0;
  PRES.forEach((p) => { if (!p.inicio) return; let F = []; try { F = desgloseFilas(p).filter((f) => f.fecha && f.fecha.startsWith(mes)); } catch (e) {} F.forEach((f) => { intProg += f.interes; (REP[p.id]?.participantes || []).forEach((x) => { if (!x.migrado && (!x.desde || f.fecha >= x.desde)) intInv += parteDe({ p, interes: f.interes, capital: 0 }, x).int; }); }); });
  O.filter((o) => o.inv && o.fecha.startsWith(mes)).forEach((o) => (intInv += o.monto));
  intProg = Math.round(intProg * 100) / 100; intInv = Math.round(intInv * 100) / 100;
  const sl = (a, b) => (a === b ? " selected" : "");
  const formPago = (e, monto, dir) => `<form class="edit" data-pagf="${esc(e.k)}" data-dir="${dir}" novalidate>
      <h3>${dir === "de" ? esc(e.nombre) + " me entregó" : "Le pagué a " + esc(e.nombre)}</h3>
      <div class="row"><label>Monto<input name="m" inputmode="decimal" value="${monto > 0 ? Math.round(monto * 100) / 100 : ""}"></label><label>Fecha<input name="f" type="date" value="${hoy}"></label></div>
      <div class="row"><label>Cómo<select name="metodo">${Object.entries(METODO).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label><label>Referencia o banco (opcional)<input name="ref" placeholder="Ej. BBVA, folio 123456"></label></div>
      <label>Nota (opcional)<input name="n" placeholder="Ej. Interés de noviembre"></label>
      ${dir === "a" ? `<label>Comprobante (opcional, lo verá en su app)<input name="c" type="file" accept="image/*,application/pdf"></label>` : ""}
      <div class="actions"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-cancel>Cancelar</button></div></form>`;
  const SELE = INV_SEL ? EP[INV_SEL] : null; if (INV_SEL && !SELE) INV_SEL = "";
  $("panel").innerHTML = selectorInv(PL) + (SELE ? personaInvView(SELE, formPago) : `
  <div class="card">
    <div class="head"><h2>Inversionistas</h2><div class="actions"><button class="btn sm" type="button" id="cu-prev" aria-label="Mes anterior">‹</button><b style="align-self:center;min-width:120px;text-align:center">${base.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</b><button class="btn sm" type="button" id="cu-next" aria-label="Mes siguiente">›</button></div></div>
    <div class="facts"><div><span>Interés del mes (programado)</span><b>${mxn2(intProg)}</b></div><div><span>Para inversionistas</span><b>${mxn2(intInv)}</b></div><div><span>Tu ganancia</span><b class="lime">${mxn2(Math.round((intProg - intInv) * 100) / 100)}</b></div></div>
    <p class="note" style="margin-top:0">Interés que realmente entró este mes: ${mxn2(intCob)}.</p>
    <div class="stats"><span class="stat">Por pagar <b>${mxn2(sum(porPagar, (z) => z.o.falta))}</b></span>${vencidas.length ? `<span class="stat warn">Fuera de plazo <b>${vencidas.length}</b> · ${mxn2(sum(vencidas, (z) => z.o.falta))}</span>` : ""}<span class="stat">Te deben entregar <b>${mxn2(sum(PL.filter((e) => e.neto < -0.5), (e) => -e.neto))}</b></span></div>
    <p class="note">Inversiones: le pagas su tasa cada mes, el mismo día en que te prestó, haya o no cliente, hasta que le regreses su dinero. Comisiones de préstamos: le toca su parte del interés de cada pago programado del cliente. Tienes los días hábiles que configures (5 si no cambias nada) para pagarle.</p>
  </div>
  ${inversionesCard()}
  <div class="card"><h2>Pagos por hacer</h2>
    <div class="list">${porPagar.length ? porPagar.slice(0, 30).map(({ e, o }) => `<div class="item"><div class="item-top"><b>${esc(e.ver || e.nombre)} · ${mxn2(o.falta)}</b><span>${o.vencida ? `<span class="pill warn">Fuera de plazo</span>` : `Pagar a más tardar el ${fcorta(new Date(o.limite + "T12:00:00"))}`}</span></div>
      <div class="item-mid">${o.p ? esc(o.p.cliente) + " · " + esc(o.concepto) + " · el cliente paga el " : esc(o.concepto) + " · toca el "}${fcorta(new Date(o.fecha + "T12:00:00"))}${o.cubierto > 0.005 ? " · ya cubierto " + mxn2(o.cubierto) : ""}</div>
      <div class="actions"><button class="btn sm primary" type="button" data-pag="${esc(e.k)}">Ya le pagué</button></div></div>`).join("") : `<p class="muted">Estás al corriente con tus inversionistas.</p>`}</div></div>
  <div class="card"><div class="head"><h2>Por persona</h2><button class="btn sm" type="button" id="inv-new">${INV_FORM === "nuevo" ? "Cancelar" : "Registrar aportación de alguien nuevo"}</button></div>
    ${INV_FORM === "nuevo" ? `<form class="edit" id="invf-new" novalidate><div class="row"><label>Nombre<input name="nombre" placeholder="Ej. Pilar"></label><label>Cuenta (si tiene)<select name="uid"><option value="">Sin cuenta</option>${USERS.filter((u) => u.rol !== "admin").map((u) => `<option value="${u.uid}">${esc(u.nombre)}</option>`).join("")}</select></label></div>
      <div class="row"><label>Monto que te dio<input name="m" inputmode="decimal"></label><label>Fecha<input name="f" type="date" value="${hoy}"></label></div><label>Nota (opcional)<input name="n"></label><button class="btn primary" type="submit">Guardar aportación</button></form>` : ""}
    ${PL.length ? `<div class="list">${PL.map((e) => {
      const open = INV_OPEN === e.k;
      const prox = e.futuro.slice(0, 3);
      return `<div class="item"><div class="item-top"><b>${esc(e.nombre)}</b><span>${e.neto > 0.5 ? `Le debes <b>${mxn2(e.neto)}</b>` : e.neto < -0.5 ? `Te debe entregar <b>${mxn2(-e.neto)}</b>` : `<span class="pill ok">Al corriente</span>`}</span></div>
        <div class="item-mid">${e.capPuesto ? `Te ha dado ${mxn(e.capPuesto)} · ` : ""}${e.prestamos.length ? `En ${e.prestamos.length} ${e.prestamos.length === 1 ? "préstamo" : "préstamos"} (${mxn(e.capPrestado)} prestado)` : "Sin préstamos activos"}${e.capPuesto ? ` · Sin prestar ${mxn(Math.max(0, e.capPuesto - e.capPrestado))}` : ""}</div>
        ${e.meDebe > 0.5 ? `<div class="item-mid">Por pagarle ${mxn2(e.debo - e.pagado)} − cobró por ti y te debe ${mxn2(e.meDebe - e.recibido)} = ${e.neto >= 0 ? "le debes " + mxn2(e.neto) : "te debe " + mxn2(-e.neto)}</div>` : ""}
        ${prox.length ? `<div class="item-mid">Próximos: ${prox.map((o) => `${mxn2(o.monto)} a más tardar el ${fcorta(new Date(o.limite + "T12:00:00"))}`).join(" · ")}</div>` : ""}
        <div class="actions" style="margin-top:4px">${e.neto > -0.5 ? `<button class="btn sm primary" type="button" data-pag="${esc(e.k)}">Ya le pagué</button>` : ""}${e.meDebe > 0.5 || e.neto < -0.5 ? `<button class="btn sm" type="button" data-rec="${esc(e.k)}">Me entregó</button>` : ""}<button class="btn sm" type="button" data-apo="${esc(e.k)}">Aportación o retiro</button><button class="btn sm" type="button" data-icfg="${esc(e.k)}">Su app y plazos</button><button class="link" type="button" data-invo="${esc(e.k)}">${open ? "Cerrar detalle" : "Ver detalle"}</button></div>
        ${INV_FORM === "pag:" + e.k ? formPago(e, Math.min(e.pend.reduce((s, o) => s + o.falta, 0), Math.max(0, e.neto)), "a") : ""}
        ${INV_FORM === "rec:" + e.k ? formPago(e, -e.neto, "de") : ""}
        ${INV_FORM === "cfg:" + e.k ? cfgForm(e) : ""}
        ${INV_FORM === "apo:" + e.k ? `<form class="edit" data-apof="${esc(e.k)}" novalidate><div class="row"><label>Movimiento<select name="t"><option value="aporte">Me dio dinero (sin interés fijo)</option></select></label><label>Monto<input name="m" inputmode="decimal"></label></div><div class="row"><label>Fecha<input name="f" type="date" value="${hoy}"></label><label>Nota (opcional)<input name="n"></label></div><div class="actions"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-cancel>Cancelar</button></div></form>` : ""}
        ${!open && ultimoMov(e) ? `<div class="sub">${ultimoMov(e)}</div>` : ""}
        ${open ? detalleInv(e) : ""}
      </div>`;
    }).join("")}</div>` : `<p class="muted">Todavía no hay inversionistas. Agrégalos en un préstamo, en "Fondeo y comisiones", o registra una aportación arriba.</p>`}
  </div>
  <div class="card"><h2>Comisiones por préstamo</h2><div class="list">${PRES.filter((p) => (REP[p.id]?.participantes || []).some((x) => !x.migrado) && !avance(p).liquidado).map((p) => {
      const Lp = REP[p.id].participantes.filter((x) => !x.migrado), a = avance(p), sig = desgloseFilas(p).find((f) => f.fecha >= hoy);
      const intC = sig ? sig.interes : 0, parts = Lp.map((x) => ({ x, v: parteDe({ p, interes: intC, capital: 0 }, x).int }));
      const mio = Math.round((intC - parts.reduce((s, q) => s + q.v, 0)) * 100) / 100;
      return `<div class="item"><div class="item-top"><b>${esc(p.cliente)}</b><span>${p.tasa ? "Cobras " + p.tasa + "% al mes" : ""}</span></div>
        <div class="item-mid">${parts.map((q) => `${esc(persName(q.x))} ${q.x.base === "puntos" ? q.x.valor + "%" : ""} ${mxn2(q.v)}`).join(" · ")} · Para ti ${mxn2(mio)}${p.tasa && parts.every((q) => q.x.base === "puntos") ? " (" + Math.round((p.tasa - Lp.reduce((s, x) => s + x.valor, 0)) * 100) / 100 + "%)" : ""}</div>
        <div class="item-bot"><span>Próximo pago del cliente ${sig ? "el " + fcorta(new Date(sig.fecha + "T12:00:00")) + " · interés " + mxn2(intC) : "sin fecha"} · Capital ${mxn(debeDe(p, a) || p.monto)}</span></div></div>`;
    }).join("") || `<p class="muted">Ningún préstamo activo tiene inversionista.</p>`}</div></div>`);
  $("panel").querySelectorAll("[data-ivver]").forEach((b) => (b.onclick = () => {
    const e = EP[b.dataset.ivver]; if (!e) return;
    const ov = document.createElement("div"); ov.className = "viewer asc";
    ov.innerHTML = `<div class="vbar"><b>Así lo ve ${esc(nom1(e.nombre))}</b><button class="btn sm primary" type="button">Cerrar</button></div><div class="vbody"><div class="wrap">${invPageHTML({ ...portafolioDe(e), actualizado: new Date().toISOString() }, nom1(e.nombre), true)}</div></div>`;
    ov.querySelector(".vbar button").onclick = () => ov.remove();
    bindInvPage(ov); ov.querySelectorAll("a,[data-rcb],#inv-all").forEach((x) => { x.style.pointerEvents = "none"; x.setAttribute("tabindex", "-1"); });
    document.body.appendChild(ov);
  }));
  $("panel").querySelectorAll("[data-isel]").forEach((b) => (b.onclick = () => { INV_SEL = b.dataset.isel; INV_FORM = ""; IVF = ""; vCuentas(); window.scrollTo(0, 0); }));
  $("cu-prev") && ($("cu-prev").onclick = () => { CU_MONTH = new Date(y, m - 1, 1); vCuentas(); });
  $("cu-next") && ($("cu-next").onclick = () => { CU_MONTH = new Date(y, m + 1, 1); vCuentas(); });
  const P = $("panel"), key = (k) => EP[k];
  $("inv-new") && ($("inv-new").onclick = () => { INV_FORM = INV_FORM === "nuevo" ? "" : "nuevo"; vCuentas(); });
  P.querySelectorAll("[data-pag]").forEach((b) => (b.onclick = () => { INV_FORM = INV_FORM === "pag:" + b.dataset.pag ? "" : "pag:" + b.dataset.pag; vCuentas(); }));
  P.querySelectorAll("[data-rec]").forEach((b) => (b.onclick = () => { INV_FORM = INV_FORM === "rec:" + b.dataset.rec ? "" : "rec:" + b.dataset.rec; vCuentas(); }));
  P.querySelectorAll("[data-apo]").forEach((b) => (b.onclick = () => { INV_FORM = INV_FORM === "apo:" + b.dataset.apo ? "" : "apo:" + b.dataset.apo; vCuentas(); }));
  P.querySelectorAll("[data-icfg]").forEach((b) => (b.onclick = () => { INV_FORM = INV_FORM === "cfg:" + b.dataset.icfg ? "" : "cfg:" + b.dataset.icfg; vCuentas(); }));
  P.querySelectorAll("form[data-cfgf]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const k = f.dataset.cfgf, g = (n) => f.querySelector(`[name=${n}]`);
    const d = { apodo: (g("apodo")?.value || "").trim().slice(0, 40), dias: Math.max(0, parseInt(g("dias").value, 10) || 0), ver: g("ver").value, uid: g("uid") ? g("uid").value : (EP[k]?.x.uid || ""), tel: tel10(g("tel").value), mail: g("mail").value.trim().toLowerCase() };
    INV_FORM = ""; await setDoc(doc(db, "invcfg", cfgKey(k)), d);
    if (d.uid) updateDoc(doc(db, "usuarios", d.uid), { inversionista: true }).catch(() => {});
  }));
  P.querySelectorAll("[data-recibo]").forEach((b) => (b.onclick = async () => { const s2 = await getDoc(doc(db, "recibos", b.dataset.recibo)); if (s2.exists()) verDoc(s2.data(), "Comprobante de pago"); }));
  P.querySelectorAll("[data-invo]").forEach((b) => (b.onclick = () => { INV_OPEN = INV_OPEN === b.dataset.invo ? "" : b.dataset.invo; vCuentas(); }));
  P.querySelectorAll("[data-cancel]").forEach((b) => (b.onclick = () => { INV_FORM = ""; vCuentas(); }));
  const who = (e) => ({ uid: e.x.uid || "", nombre: e.x.nombre || e.nombre });
  P.querySelectorAll("form[data-pagf]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const e = key(f.dataset.pagf), g = (n) => f.querySelector(`[name=${n}]`).value, mo = num(g("m")); if (!e || !mo) return;
    INV_FORM = "";
    const file = f.querySelector("[name=c]")?.files?.[0], fe = g("f") || today(), dir = f.dataset.dir;
    const ref = await addDoc(collection(db, "entregas"), { ...who(e), dir, monto: mo, fecha: fe, metodo: g("metodo"), ref: g("ref").trim(), nota: g("n").trim(), reg: new Date().toISOString(), recibo: !!file });
    const uidI = uidDe(e);
    if (file) { try { const { data, mime } = await fileToData(file); await setDoc(doc(db, "recibos", ref.id), { uid: uidI, data, mime, fecha: fe, monto: mo }); } catch (er) {} }
    if (dir === "a") avisoInv(e, mo, fe, g("metodo"), !!file);
  }));
  P.querySelectorAll("form[data-apof]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const e = key(f.dataset.apof), g = (n) => f.querySelector(`[name=${n}]`).value, mo = num(g("m")); if (!e || !mo) return;
    INV_FORM = "";
    await addDoc(collection(db, "inversiones"), { ...who(e), tipo: g("t"), monto: mo, fecha: g("f") || today(), nota: g("n").trim(), reg: new Date().toISOString() });
  }));
  $("invf-new") && ($("invf-new").onsubmit = async (ev) => {
    ev.preventDefault(); const f = $("invf-new"), g = (n) => f.querySelector(`[name=${n}]`).value, uid = g("uid"), nombre = uid ? USERS.find((u) => u.uid === uid)?.nombre || "" : g("nombre").trim(), mo = num(g("m"));
    if (!nombre || !mo) return;
    INV_FORM = "";
    await addDoc(collection(db, "inversiones"), { uid, nombre, tipo: "aporte", monto: mo, fecha: g("f") || today(), nota: g("n").trim(), reg: new Date().toISOString() });
    if (uid) updateDoc(doc(db, "usuarios", uid), { inversionista: true }).catch(() => {});
  });
  P.querySelectorAll("[data-ented]").forEach((b) => (b.onclick = () => { ENTEDIT = ENTEDIT === b.dataset.ented ? "" : b.dataset.ented; vCuentas(); }));
  P.querySelectorAll("form[data-entedf]").forEach((f) => (f.onsubmit = async (ev) => {
    ev.preventDefault(); const g = (n) => f.querySelector(`[name=${n}]`).value, mo = num(g("m")); if (!mo) return;
    const [col, id] = f.dataset.entedf.split(":"); ENTEDIT = "";
    await updateDoc(doc(db, col, id), { monto: mo, fecha: g("f") || today(), nota: g("n").trim(), editado: new Date().toISOString(), ...(col === "entregas" ? { metodo: g("metodo"), ref: g("ref").trim() } : {}) });
  }));
  P.querySelectorAll("[data-entrm]").forEach((b) => (b.onclick = () => { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez para borrarlo"; return; } const [col, id] = b.dataset.entrm.split(":"); deleteDoc(doc(db, col, id)); }));
  bindInversiones();
  const fo = INV_FORM ? P.querySelector("form[data-pagf],form[data-apof],#invf-new") : IVF ? P.querySelector("form[data-ivf],form[data-ivret],form[data-ivrej]") : null; if (fo) fo.scrollIntoView({ block: "center" });
}
function movsDe(e) {
  return [...ENT.filter((m) => persKey(m) === e.k).map((m) => ({ col: "entregas", m, txt: m.dir === "de" ? "Te entregó" : "Le pagaste" })), ...INVS.filter((m) => persKey(m) === e.k).map((m) => ({ col: "inversiones", m, txt: m.tipo === "retiro" ? "Le regresaste capital" : "Te dio para prestar" }))].sort((a, b) => ((a.m.fecha || "") === (b.m.fecha || "") ? ((a.m.reg || "") < (b.m.reg || "") ? 1 : -1) : (a.m.fecha || "") < (b.m.fecha || "") ? 1 : -1));
}
const ultimoMov = (e) => { const m = movsDe(e)[0]; return m ? `<p class="lbl">Último movimiento</p><div class="list">${movRow(m)}</div>` : ""; };
function movRow({ col, m, txt }) {
  return `<div class="item"><div class="item-top"><b>${txt} ${mxn2(m.monto)}</b><span>${fcorta(new Date((m.fecha || today()) + "T12:00:00"))}</span></div>
    <div class="item-bot"><span>${[m.metodo ? METODO[m.metodo] : "", m.ref, m.nota, m.editado ? "Corregido el " + fhora(m.editado) : ""].filter(Boolean).map(esc).join(" · ")}</span><span>${m.recibo ? `<button class="link" type="button" data-recibo="${m.id}">Comprobante</button> ` : ""}<button class="link" type="button" data-ented="${col}:${m.id}">${ENTEDIT === col + ":" + m.id ? "Cancelar" : "Editar"}</button> <button class="link del" type="button" data-entrm="${col}:${m.id}">Borrar</button></span></div>
    ${ENTEDIT === col + ":" + m.id ? `<form class="edit" data-entedf="${col}:${m.id}" novalidate style="margin-top:6px"><div class="row"><label>Monto<input name="m" inputmode="decimal" value="${m.monto}"></label><label>Fecha<input name="f" type="date" value="${m.fecha || ""}"></label></div>${col === "entregas" ? `<div class="row"><label>Cómo<select name="metodo">${Object.entries(METODO).map(([k, v]) => `<option value="${k}"${k === m.metodo ? " selected" : ""}>${v}</option>`).join("")}</select></label><label>Referencia o banco<input name="ref" value="${esc(m.ref || "")}"></label></div>` : ""}<label>Nota<input name="n" value="${esc(m.nota || "")}"></label><button class="btn sm primary" type="submit">Guardar cambios</button></form>` : ""}</div>`;
}
// Ajustes de cada inversionista: cuántos días hábiles tengo para pagarle, qué ve en su app y cómo contactarlo.
function cfgForm(e) {
  const c = INVCFG[cfgKey(e.k)] || {}, u = USERS.find((x) => x.uid === uidDe(e)) || {};
  return `<form class="edit" data-cfgf="${esc(e.k)}" novalidate><h3>Su app y plazos</h3>
    <label>Apodo para ubicarlo (solo lo ves tú)<input name="apodo" value="${esc(c.apodo || "")}" placeholder="Ej. Pily, Tía Pilar"></label>
    <div class="row"><label>Días hábiles que tengo para pagarle<input name="dias" inputmode="numeric" value="${diasDe(e.k)}"></label>
    <label>Qué ve en su app<select name="ver"><option value="total"${c.ver !== "detalle" ? " selected" : ""}>Solo su inversión en Entre Amigos</option><option value="detalle"${c.ver === "detalle" ? " selected" : ""}>También en qué tipo de préstamos está (sin nombres)</option></select></label></div>
    ${e.x.uid ? "" : `<label>Su cuenta en la app<select name="uid"><option value="">Todavía no tiene cuenta</option>${USERS.filter((x) => x.rol !== "admin").map((x) => `<option value="${x.uid}"${x.uid === c.uid ? " selected" : ""}>${esc(x.nombre)} · ${esc(x.email)}</option>`).join("")}</select></label>`}
    <div class="row"><label>WhatsApp<input name="tel" inputmode="tel" value="${esc(c.tel || u.telefono || "")}"></label><label>Correo<input name="mail" type="email" value="${esc(c.mail || u.email || "")}"></label></div>
    <p class="note">Nunca ve nombres de clientes. En "Solo su inversión" ve: cuánto invirtió, cuánto ha ganado, cuánto ha recibido, cuánto le falta y cuándo es su próximo pago, con sus comprobantes.</p>
    <div class="actions"><button class="btn primary" type="submit">Guardar</button><button class="btn" type="button" data-cancel>Cancelar</button></div></form>`;
}
// Aviso al inversionista después de pagarle.
function avisoInv(e, monto, fecha, metodo, conRecibo) {
  const c = INVCFG[cfgKey(e.k)] || {}, u = USERS.find((x) => x.uid === uidDe(e)) || {};
  const pend = Math.max(0, Math.round((e.pend.reduce((s, o) => s + o.falta, 0) - monto) * 100) / 100), sig = e.futuro[0];
  const msg = `Hola ${e.nombre.split(" ")[0]}, te ${metodo === "efectivo" ? "entregamos" : "depositamos"} ${mxn2(monto)} el ${fcorta(new Date(fecha + "T12:00:00"))}${metodo === "transferencia" ? " por transferencia" : metodo === "efectivo" ? " en efectivo" : ""}.\n\n`
    + (e.capPuesto ? `Tu inversión: ${mxn(e.capPuesto)}\n` : "") + `Has recibido en total: ${mxn2(e.pagado + monto)}\n` + (pend > 0.5 ? `Pendiente por recibir: ${mxn2(pend)}\n` : "") + (sig ? `Tu próximo pago: ${mxn2(sig.monto)} a más tardar el ${fcorta(new Date(sig.limite + "T12:00:00"))}\n` : "")
    + (uidDe(e) ? `\n${conRecibo ? "Tu comprobante y " : ""}todos tus movimientos están aquí:\n${PORTAL()}\n` : "") + `\nGracias por tu confianza.\nEntre Amigos`;
  notice(e.nombre, c.tel || u.telefono || "", msg, "Pago registrado. Avísale", c.mail || u.email || "");
}
// Lo que ve cada inversionista en su app (se actualiza solo cuando el administrador abre la app).
let SYNC_T = null; const SYNC_LAST = {};
function syncSoon() { clearTimeout(SYNC_T); SYNC_T = setTimeout(syncPortafolios, 2500); }
function syncPortafolios() {
  if (!isAdmin() || !USERS.length) return;
  let EP; try { EP = estadoPersonas(); } catch (er) { return; }
  Object.values(EP).forEach((e) => {
    const uid = uidDe(e); if (!uid || uid === ME.uid) return;
    const d = portafolioDe(e);
    const j = JSON.stringify(d); if (SYNC_LAST[uid] === j) return; SYNC_LAST[uid] = j;
    setDoc(doc(db, "portafolio", uid), { ...d, actualizado: new Date().toISOString() }).catch(() => { delete SYNC_LAST[uid]; });
  });
}
// Lo que se le muestra al inversionista en su app (sin nombres de clientes ni tasas que cobras).
function portafolioDe(e) {
  {
    const c = INVCFG[cfgKey(e.k)] || {}, r2 = (n) => Math.round(n * 100) / 100;
    const ganado = r2(e.obl.filter((o) => o.concepto !== "Capital que pagó el cliente").reduce((s, o) => s + o.monto, 0));
    const prox = e.pend.length ? { monto: r2(e.pend.filter((o) => o.limite === e.pend[0].limite).reduce((s, o) => s + o.falta, 0)), fecha: e.pend[0].limite } : e.futuro[0] ? { monto: r2(e.futuro.filter((o) => o.limite === e.futuro[0].limite).reduce((s, o) => s + o.monto, 0)), fecha: e.futuro[0].limite } : null;
    const CI = CONTRATOS().filter((m) => persKey(m) === e.k && vigenteDe(m) > 0.5);
    const inversiones = CI.map((m) => { const px = proxInv(m); return { monto: vigenteDe(m), original: m.monto, tasa: m.tasa, mensual: mensualDe(m), dia: diaDe(m), desde: m.fecha, prox: px ? { fecha: px.fecha, monto: px.monto } : null }; });
    const mensual = r2(CI.reduce((s, m) => s + mensualDe(m), 0) + e.prestamos.reduce((s, q) => { const f = desgloseFilas(q.p).find((x) => x.fecha >= today()); return s + (f ? parteDe({ p: q.p, interes: f.interes, capital: 0 }, q.x).int : 0); }, 0));
    const d = { nombre: e.nombre, inversiones, capital: e.capPuesto || e.capPrestado, ganado, recibido: r2(e.pagado), pendiente: r2(e.pend.reduce((s, o) => s + o.falta, 0)), mensual, proximo: prox,
      pagos: movsDe(e).filter((m) => m.col === "entregas" && m.m.dir !== "de").slice(0, 36).map(({ m }) => ({ id: m.id, monto: m.monto, fecha: m.fecha, metodo: m.metodo || "", recibo: !!m.recibo })),
      aportes: INVS.filter((m) => persKey(m) === e.k && !INV_OFF.includes(m.estado || "")).map((m) => ({ tipo: m.tipo, monto: m.monto, fecha: m.fecha })),
      detalle: c.ver === "detalle" ? e.prestamos.map((q) => ({ tipo: q.p.tipo === "semanal" ? "Préstamo semanal" : "Préstamo con garantía" + (q.p.garantia && GARANTIAS[q.p.garantia] && !["sin", "ff"].includes(q.p.garantia) ? " (" + GARANTIAS[q.p.garantia].toLowerCase() + ")" : ""), monto: q.x.aporte || debeDe(q.p, q.a) || q.p.monto, tasa: q.x.base === "puntos" ? q.x.valor : null })) : [] };
    return d;
  }
}
// Detalle de un inversionista: sus préstamos, pagos y movimientos.
function detalleInv(e) {
  const movs0 = [...ENT.filter((m) => persKey(m) === e.k).map((m) => ({ col: "entregas", m, txt: m.dir === "de" ? "Te entregó" : "Le pagaste" })), ...INVS.filter((m) => persKey(m) === e.k).map((m) => ({ col: "inversiones", m, txt: m.tipo === "retiro" ? "Le regresaste capital" : "Te dio para prestar" }))].sort((a, b) => ((a.m.fecha || "") < (b.m.fecha || "") ? 1 : -1));
  const movs = movsDe(e), row = movRow;
  const row0 = ({ col, m, txt }) => `<div class="item"><div class="item-top"><b>${txt} ${mxn2(m.monto)}</b><span>${fcorta(new Date((m.fecha || today()) + "T12:00:00"))}</span></div>
    <div class="item-bot"><span>${[m.metodo ? METODO[m.metodo] : "", m.ref, m.nota].filter(Boolean).map(esc).join(" · ")}</span><span>${m.recibo ? `<button class="link" type="button" data-recibo="${m.id}">Comprobante</button> ` : ""}<button class="link" type="button" data-ented="${col}:${m.id}">${ENTEDIT === col + ":" + m.id ? "Cancelar" : "Editar"}</button> <button class="link del" type="button" data-entrm="${col}:${m.id}">Borrar</button></span></div>
    ${ENTEDIT === col + ":" + m.id ? `<form class="row" data-entedf="${col}:${m.id}" novalidate style="margin-top:6px"><label>Monto<input name="m" inputmode="decimal" value="${m.monto}"></label><label>Fecha<input name="f" type="date" value="${m.fecha || ""}"></label>${col === "entregas" ? `<label>Cómo<select name="metodo">${Object.entries(METODO).map(([k, v]) => `<option value="${k}"${k === m.metodo ? " selected" : ""}>${v}</option>`).join("")}</select></label><label>Referencia<input name="ref" value="${esc(m.ref || "")}"></label>` : ""}<label>Nota<input name="n" value="${esc(m.nota || "")}"></label><button class="btn sm primary" type="submit">Guardar</button></form>` : ""}</div>`;
  return `<div class="sub">
    ${e.prestamos.length ? `<p class="lbl">Sus préstamos</p><div class="list">${e.prestamos.map((q) => `<div class="item"><div class="item-top"><b>${esc(q.p.cliente)}</b><span>${q.x.aporte ? "Puso " + mxn(q.x.aporte) : "Capital " + mxn(debeDe(q.p, q.a) || q.p.monto)}</span></div><div class="item-mid">${repTxt(q.p, q.x)}${q.p.recibe ? " · Recibe los pagos: " + esc(nameOf(q.p.recibe)) : ""}</div></div>`).join("")}</div>` : ""}
    ${e.cobrado.length ? `<p class="lbl">Pagos de clientes que recibió por ti</p><div class="list">${e.cobrado.slice(-10).reverse().map((c) => `<div class="item"><div class="item-top"><b>${esc(c.r.p.cliente)} le pagó ${mxn2(c.r.monto)}</b><span>${fcorta(new Date(c.r.fecha + "T12:00:00"))}</span></div><div class="item-mid">Te debe entregar ${mxn2(c.entrega)}</div></div>`).join("")}</div>` : ""}
    <p class="lbl">Movimientos</p><div class="list">${movs.length ? movs.map(row).join("") : `<p class="muted">Sin movimientos registrados.</p>`}</div></div>`;
}
const cuotaLbl = (p, n, total) => (p.tipo === "interes" ? "Interés del mes " + n : (p.tipo === "semanal" ? "Semana " : "Mes ") + n + " de " + total);
const invLink = (id) => PORTAL() + "?nueva&inv=" + id;
function invMsg(p, id) {
  return `Hola ${p.cliente}, te saluda Entre Amigos.\n\nYa puedes consultar tu préstamo en línea desde tu celular:\n- Tus pagos, cuánto llevas y cuánto te resta\n- Si estás al corriente o tienes algún pago vencido\n- Tus próximas fechas de pago\n- Tus documentos\n\nY si necesitas otro préstamo, lo puedes pedir desde ahí mismo.\n\nCrea tu cuenta aquí (toma un minuto):\n${invLink(id || p.id)}\n\nCualquier duda, escríbenos por este medio.\n\nEntre Amigos`;
}
const debeDe = (p, a) => (p.tipo === "capfijo" || p.tipo === "interes" ? a.capital : a.restante);
function loanDesc(p, a) {
  const g = p.garantia ? (p.garantia === "ff" ? "Friends & family" : p.garantia === "sin" ? "Sin garantía" : "Garantía " + (GARANTIAS[p.garantia] || "")) + (p.desc ? " (" + esc(p.desc) + ")" : "") : "";
  const parts = p.tipo === "interes" ? ["Solo interés", g, mxn(p.monto), "interés " + p.tasa + "% = " + mxn2(a.corrida.pago) + "/mes"]
    : p.tipo === "capfijo" ? ["Interés + capital", g, mxn(p.monto), p.tasa + "% + " + mxn(p.abono) + " a capital al mes"]
    : p.tipo === "semanal" ? ["Semanal", mxn(p.monto), "pago " + mxn2(a.corrida.pago)]
    : ["Mensual", g, mxn(p.monto), "pago " + mxn2(a.corrida.pago)];
  return parts.filter(Boolean).join(" · ");
}
function loanItem(p) {
  return `<div class="owned" data-cli="${esc((p.cliente || "").toLowerCase())}" style="--own:${ownerColor(ownerOf(p))}">` + loanItem0(p) + "</div>";
}
function loanItem0(p) {
  const a = avance(p), unidad = p.tipo === "semanal" ? "Semana" : "Mes";
  const SI = p.tipo === "interes";
  const pct = SI ? Math.min(100, Math.round((a.capPagado / p.monto) * 100)) : Math.min(100, Math.round(((a.pagado + (a.credito || 0)) / a.corrida.total) * 100));
  const venc = vencido(p, a);
  const rec = SI && a.siguiente ? `Hola ${p.cliente}, te recordamos tu pago de interés del mes por ${mxn2(a.siguiente.monto)}${a.siguiente.fecha ? ", con fecha " + fcorta(a.siguiente.fecha) : ""}. Tu capital pendiente es de ${mxn2(a.capital)}.\n\nEntre Amigos` : a.siguiente ? `Hola ${p.cliente}, te recordamos tu pago ${a.siguiente.n} de ${a.total} por ${mxn2(a.siguiente.monto)}${a.siguiente.fecha ? ", con fecha " + fcorta(a.siguiente.fecha) : ""}. Llevas ${mxn2(a.pagado)} pagados y ${p.tipo === "capfijo" ? "tu capital pendiente es de " + mxn2(a.capital) : "te restan " + mxn2(a.restante)}.\n\nEntre Amigos` : "";
  return `<div class="item tapi" data-open="${p.id}" role="button" tabindex="0">
    <div class="item-top"><b>${esc(p.cliente)}${isAdmin() && ownerOf(p) !== ME.uid ? ` <span class="pill">Cartera: ${esc(nameOf(ownerOf(p)))}</span>` : ""}${isAdmin() && p.recibe ? ` <span class="pill warn">Recibe: ${esc(nameOf(p.recibe))}</span>` : ""}</b><span>${a.liquidado ? `<span class="pill ok">Liquidado</span>` : venc ? `<span class="pill warn">Vencido ${mxn(venc)}</span>` : SI ? `Capital ${mxn(a.capital)}` : `${unidad} ${Math.min(a.cubiertos + 1, a.total)} de ${a.total}`}</span></div>
    <div class="item-mid">${loanDesc(p, a)}</div>
    <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
    <div class="item-bot"><span>${SI ? `Intereses pagados ${mxn2(a.pagado)} · Abonos a capital ${mxn2(a.capPagado)}${a.interesAdeudado ? " · Interés vencido " + mxn2(a.interesAdeudado) : ""}` : p.tipo === "capfijo" ? `Pagado ${mxn2(a.pagado)} · Capital pendiente ${mxn2(a.capital)}` : `Pagado ${mxn2(a.pagado)} · Resta ${mxn2(a.restante)}`}</span></div>
    <div class="item-bot">${AVIS[p.id] ? `<span class="pill warn">Avisó un pago</span>` : ""}${isAdmin() ? [...new Set(CONTRATOS().filter((m) => (m.pids || []).includes(p.id) && vigenteDe(m) > 0.5).map((m) => nom1(m.nombre)))].map((n) => `<span class="pill">Dinero de ${esc(n)}</span>`).join("") : ""}${a.siguiente && !venc ? `<span>Próximo: ${mxn2(a.siguiente.monto)}${a.siguiente.fecha ? " el " + fcorta(a.siguiente.fecha) : ""}</span>` : ""}${p.telefono && rec ? `<a href="${waTo(p.telefono, rec)}" target="_blank" rel="noopener">Recordatorio por WhatsApp</a>` : ""}${p.clienteUid || USERS.some((u) => p.clienteEmail && u.email === p.clienteEmail) ? `<span class="pill ok">Tiene cuenta</span>` : `<span class="pill">Sin cuenta</span>`}</div>
  </div>`;
}
let PEDIT = "", FILT_P = "", COMPS = {};
// Comprobantes de pago del préstamo abierto.
function compBox(p) {
  if (!COMPS[p.id]) { COMPS[p.id] = []; onSnapshot(query(collection(db, "comprobantes"), where("pid", "==", p.id)), (s) => { COMPS[p.id] = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); if (TAB === "prestamos" && OPEN === p.id) vPrestamos(); }, () => {}); }
  const L = COMPS[p.id].filter((c) => !c.estado || c.estado === "confirmado");
  return L.length ? `<p class="lbl">Comprobantes de pago</p><div class="actions">${L.map((c) => `<button class="btn sm" type="button" data-comp="${p.id}:${c.id}">${fcorta(new Date(c.fecha + "T12:00:00"))} · ${mxn2(c.monto)}</button>`).join("")}</div>` : "";
}
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
function schedule(p, a, edit, sinPagos) {
  const pagos = (p.pagos || []).map((x, i) => ({ ...x, i })).reverse();
  return `<details${edit && PEDIT.startsWith(p.id + ":") ? " open" : ""}><summary>${sinPagos ? "Calendario completo" : "Corrida y pagos"}</summary><div class="tbl"><table><tr><th>${p.tipo === "semanal" ? "Semana" : "Mes"}</th><th>Fecha</th><th>Pago</th><th>Estado</th></tr>${a.corrida.filas.map((f, i) => `<tr class="${i < a.cubiertos ? "done" : i === a.cubiertos ? "next" : ""}"><td>${f.n}</td><td>${fcorta(fechaPago(p.inicio, f.n, p.tipo))}</td><td>${mxn2(f.pago)}</td><td>${i < a.cubiertos ? "Pagado" : i === a.cubiertos ? "Siguiente" : ""}</td></tr>`).join("")}</table></div>${p.tipo === "interes" ? `<p class="note">Solo interés: cada mes se paga el interés sobre el capital pendiente. Los abonos a capital bajan el interés de los meses siguientes.</p>` : ""}
  ${pagos.length && !sinPagos ? `<h3 style="margin-top:12px">Pagos recibidos</h3><div class="tbl"><table><tr><th>Fecha</th><th>Concepto</th><th>Monto</th>${edit ? "<th></th>" : ""}</tr>${pagos.map((x) => `<tr><td>${fcorta(new Date(x.fecha + "T12:00:00"))}</td><td>${x.tipo === "capital" ? "Abono a capital" : x.nota ? esc(x.nota) : p.tipo === "interes" ? "Interés" : "Pago"}</td><td>${mxn2(x.monto)}</td>${edit ? `<td><button class="link" type="button" data-payed="${p.id}:${x.i}">Editar</button> <button class="link del" type="button" data-rmpay="${p.id}:${x.i}">Quitar</button></td>` : ""}</tr>`).join("")}</table></div>${edit && PEDIT.startsWith(p.id + ":") ? payForm(p, Number(PEDIT.split(":")[1])) : ""}` : ""}</details>`;
}

/* ---------- Ficha de un préstamo (pantalla completa) ---------- */
const r2c = (n) => Math.round(n * 100) / 100;
const mesC = (f, sem) => { const d = new Date(f + "T12:00:00"); return sem ? d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) : d.toLocaleDateString("es-MX", { month: "short", year: "2-digit" }); };
const mesLbl = (f, sem) => { const d = new Date(f + "T12:00:00"); return sem ? fcorta(d) : d.toLocaleDateString("es-MX", { month: "short", year: "numeric" }); };
const ESTC = { pagado: ["Pagado", "ok"], parcial: ["Parcial", "warn"], vencido: ["Vencido", "warn"], proximo: ["Pendiente", ""], corte: ["Pagado", "ok"], liq: ["Liquidado", "ok"] };
const docKey = (p) => p.clienteUid || "p_" + p.id;
// Estado de cuenta por mes: lo ve el administrador y, solo para consultar, el cliente.
function estadoBox(p, admin) {
  const e = estadoCuenta(p), sem = p.tipo === "semanal", u = sem ? "Semana" : "Mes";
  if (!e.meses.length && !p.corte) return "";
  const debe = e.debeHoy > 0.5;
  return `<details class="sec"${admin || debe ? " open" : ""}><summary>${admin ? "Estado de cuenta" : "Tu estado de cuenta"}</summary>
    ${p.corte ? `<p class="muted">${admin ? "Último mes completo pagado" : "Pagado completo hasta"}: <b>${mesLbl(p.corte, sem)}</b>${admin ? ` (pago del ${fcorta(new Date(p.corte + "T12:00:00"))}). Lo anterior cuenta como pagado sin capturar pagos viejos. <button class="link" type="button" data-fx="corte">Cambiar</button>` : ""}</p>` : ""}
    <div class="tbl"><table class="edo"><tr><th>${u}</th><th>Debía</th><th>Abonó</th><th>Falta</th><th></th></tr>
    ${(() => { const C = e.todos.filter((f) => f.corte), ver = C.slice(-12), viejos = C.length - ver.length;
      return (viejos ? `<tr class="done"><td colspan="4">${viejos} ${sem ? "semanas" : "meses"} hasta ${mesLbl(C[viejos - 1].fecha, sem)}</td><td><span class="pill ok">Pagado</span></td></tr>` : "")
        + ver.map((f) => `<tr class="done"><td>${mesC(f.fecha, sem)}</td><td>${mxn(f.pago)}</td><td colspan="2">Saldado</td><td><span class="pill ok">Pagado</span></td></tr>`).join(""); })()}
    ${e.meses.map((f) => { const st = ESTC[f.estado]; return `<tr${f.estado === "pagado" ? ' class="done"' : ""}><td>${mesC(f.fecha, sem)}</td><td>${mxn(f.pago)}</td><td>${mxn(f.abono)}</td><td>${mxn(f.falta)}</td><td><span class="pill ${st[1]}">${st[0]}</span></td></tr>`; }).join("")}
    </table></div>
    <p class="note">Pagado: cubierto completo. Parcial: abonó una parte. Vencido: ya pasó su fecha y no lo ha pagado. Pendiente: todavía no vence. Cada abono se aplica ${sem ? "a la semana" : "al mes"} más ${sem ? "antigua" : "antiguo"} que tenga pendiente${p.tipo === "interes" ? ". Los abonos a capital bajan el interés de los meses siguientes" : ""}.</p>
  </details>`;
}
// Pagos y abonos recibidos, con la cuota a la que se aplicó cada uno.
function pagosBox(p, admin) {
  const e = estadoCuenta(p), sem = p.tipo === "semanal", n2f = Object.fromEntries(e.todos.map((f) => [f.n, f.fecha]));
  const aq = (x) => (p.tipo === "interes" && x.tipo === "capital" ? "Capital" : x.antes ? "Antes del corte (ya saldado)" : x.liq ? "Liquidación" : x.aplica.length ? x.aplica.map((n) => mesLbl(n2f[n], sem)).join(", ") : x.sobra ? "Adelanto" : "");
  const pend = admin ? (COMPS[p.id] || []).filter((c) => c.estado === "por revisar") : [];
  return `${pend.length ? `<div class="sec avis"><h3>El cliente avisa que pagó</h3>${pend.map((c) => `<div class="item"><div class="item-top"><b>${mxn2(c.monto)}</b><span>${fcorta(new Date(c.fecha + "T12:00:00"))}</span></div>
      ${c.nota ? `<div class="item-mid">${esc(c.nota)}</div>` : ""}
      <div class="item-bot">${c.data ? `<button class="btn sm" type="button" data-comp="${p.id}:${c.id}">Ver comprobante</button>` : ""}<button class="btn sm primary" type="button" data-cok="${c.id}">Confirmar, sí lo recibí</button><button class="link del" type="button" data-cno="${c.id}">No lo recibí</button></div>
      ${RECH === c.id ? `<form class="edit" data-cnof="${c.id}" novalidate><label>Motivo (lo verá el cliente)<input name="m" placeholder="Ej. No aparece en mi cuenta, mándame otro comprobante"></label><div class="actions"><button class="btn sm danger" type="submit">Rechazar aviso</button></div></form>` : ""}</div>`).join("")}</div>` : ""}
  <details class="sec"${admin || PEDIT.startsWith(p.id + ":") ? " open" : ""}><summary>${admin ? "Pagos recibidos" : "Tus pagos"} (${e.pagos.length})</summary>
    ${e.pagos.length ? `<div class="tbl"><table><tr><th>Fecha</th><th>Monto</th><th>${sem ? "Semana" : "Mes"}</th>${admin ? "<th></th>" : ""}</tr>${e.pagos.map((x) => `<tr><td>${fcorta(new Date(x.fecha + "T12:00:00"))}</td><td>${admin ? mxn(x.monto) : mxn2(x.monto)}</td><td>${aq(x)}</td>${admin ? `<td class="r"><button class="link" type="button" data-payed="${p.id}:${x.i}">Editar</button><button class="link del" type="button" data-rmpay="${p.id}:${x.i}">Quitar</button></td>` : ""}</tr>`).join("")}</table></div>` : `<p class="muted">Todavía no hay pagos registrados${p.corte ? " desde el corte" : ""}.</p>`}
    ${admin && PEDIT.startsWith(p.id + ":") ? payForm(p, Number(PEDIT.split(":")[1])) : ""}
  </details>`;
}
let RECH = "";
// Cuenta que ve este préstamo en su app (como deudor). Si es de un inversionista o colaborador, casi siempre es un error.
const cuentaDe = (p) => USERS.find((u) => (p.clienteUid && u.uid === p.clienteUid) || (p.clienteEmail && (u.email || "").toLowerCase() === p.clienteEmail)) || null;
function avisoCuenta(p) {
  const u = cuentaDe(p); if (!u || !isAdmin()) return "";
  const raro = u.inversionista || u.rol === "equipo" || u.rol === "admin";
  return raro ? `<div class="avis"><p class="err" style="margin:0"><b>Revisa:</b> este préstamo está ligado a la cuenta de <b>${esc(u.nombre || u.email)}</b>${u.inversionista ? ", que es inversionista" : ", que es colaborador"}. En su app lo ve como si ${esc((u.nombre || "").split(" ")[0] || "esa persona")} debiera este préstamo, con el interés completo. Si no es el cliente, en Datos del cliente cambia "Cuenta del cliente" a la correcta (o "Sin cuenta") y borra su correo.</p></div>` : "";
}
// Cómo se calcula lo que debe hoy, paso por paso, para poder revisarlo a mano.
function cuadreBox(p, a, e) {
  const hoy = today(), sem = p.tipo === "semanal", u = sem ? "semana" : "mes", us = sem ? "semanas" : "meses";
  const ven = e.meses.filter((f) => f.fecha <= hoy), tot = ven.reduce((s, f) => s + f.pago, 0);
  const iguales = ven.length && ven.every((f) => Math.abs(f.pago - ven[0].pago) < 0.01);
  const cuenta = (p.pagos || []).filter((x) => !(p.tipo === "interes" && x.tipo === "capital") && (!p.corte || x.fecha > p.corte));
  const abon = cuenta.reduce((s, x) => s + (x.monto || 0), 0), adel = Math.max(0, abon - tot);
  const antes = (p.pagos || []).filter((x) => p.corte && x.fecha <= p.corte && !(p.tipo === "interes" && x.tipo === "capital"));
  const ini = p.inicio && p.inicio > hoy;
  return `<details class="sec cuadre"${vencido(p, a) > 0.5 || (p.inicio && p.inicio > hoy) ? " open" : ""}><summary>Cómo se calcula</summary>
    ${ini ? `<p class="err" style="margin:0">La fecha del primer pago es el ${fcorta(new Date(p.inicio + "T12:00:00"))}, que todavía no llega. Por eso no cuenta ningún ${u} vencido. Si el cliente va atrasado, corrígela en Editar préstamo con la fecha del primer ${u} que debía pagar, o usa Último ${u} pagado.</p>` : ""}
    <div class="tbl"><table>
      <tr><td>${p.corte ? "Pagado completo hasta" : "Primer pago"}</td><td class="r">${p.corte ? mesLbl(p.corte, sem) : p.inicio ? fcorta(new Date(p.inicio + "T12:00:00")) : "Sin fecha"}</td></tr>
      <tr><td>${us[0].toUpperCase() + us.slice(1)} que ya vencieron${ven.length ? ` (${mesLbl(ven[0].fecha, sem)} a ${mesLbl(ven.at(-1).fecha, sem)})` : ""}</td><td class="r">${ven.length}${iguales ? " × " + mxn2(ven[0].pago) : ""}</td></tr>
      <tr><td><b>Debía pagar hasta hoy</b></td><td class="r"><b>${mxn2(tot)}</b></td></tr>
      <tr><td>Pagos que cuentan (${cuenta.length})${p.corte ? " desde el corte" : ""}</td><td class="r">− ${mxn2(abon)}</td></tr>
      <tr><td><b>Debe hoy</b></td><td class="r"><b>${mxn2(Math.max(0, tot - abon))}</b></td></tr>
      ${adel > 0.5 ? `<tr><td>Pagado por adelantado</td><td class="r">${mxn2(adel)}</td></tr>` : ""}
    </table></div>
    ${antes.length ? `<p class="note">${antes.length} pago${antes.length > 1 ? "s" : ""} con fecha hasta el corte (${mxn2(antes.reduce((s, x) => s + x.monto, 0))}) no se suma${antes.length > 1 ? "n" : ""} otra vez, porque ese periodo ya está marcado como pagado completo.</p>` : ""}
    ${p.tipo === "interes" ? `<p class="note">Interés del ${u}: ${p.pagoFijo ? "acordado en " + mxn2(p.pagoFijo) : p.tasa + "% de " + mxn2(a.capital) + " = " + mxn2(a.corrida.pago)}. Los abonos a capital no cuentan como interés.</p>` : ""}
  </details>`;
}
function fichaHTML(p) {
  const a = avance(p), e = estadoCuenta(p), SI = p.tipo === "interes", sem = p.tipo === "semanal", venc = vencido(p, a), adm = isAdmin();
  const unidad = sem ? "Semana" : "Mes", clientes = USERS.filter((u) => u.rol === "cliente");
  const tieneCuenta = p.clienteUid || USERS.some((u) => p.clienteEmail && u.email === p.clienteEmail);
  const faltan = e.meses.filter((f) => f.falta > 0.5 && f.fecha <= today());
  const rec = venc > 0.5 ? `Hola ${p.cliente}, te recordamos que tienes ${mxn2(venc)} pendientes de ${SI ? "intereses" : "tus pagos"} (${faltan.map((f) => mesLbl(f.fecha, sem)).join(", ")}). Por favor ponte al corriente o avísanos si necesitas ayuda.\n\nEntre Amigos`
    : a.siguiente ? `Hola ${p.cliente}, te recordamos tu ${SI ? "pago de interés" : "pago " + a.siguiente.n + " de " + a.total} por ${mxn2(a.siguiente.monto)}${a.siguiente.fecha ? ", con fecha " + fcorta(a.siguiente.fecha) : ""}.\n\nEntre Amigos` : "";
  const pct = SI ? Math.min(100, Math.round((a.capPagado / p.monto) * 100)) : Math.min(100, Math.round(((a.pagado + (a.credito || 0)) / a.corrida.total) * 100));
  const fx = FX, dk = docKey(p);
  return `<button class="back" type="button" data-back>‹ ${PVISTA === "clientes" && CLI_SEL ? esc((gruposClientes(visibles()).find((g) => g.k === CLI_SEL) || {}).nombre || "Cliente") : adm ? "Préstamos" : "Mis clientes"}</button>
  <div class="card ficha">
    <div class="head"><h2>${esc(p.cliente)}</h2>${a.liquidado ? `<span class="pill ok">Liquidado</span>` : venc > 0.5 ? `<span class="pill warn">Vencido ${mxn(venc)}</span>` : `<span class="pill ok">Al corriente</span>`}</div>
    ${adm && (ownerOf(p) !== ME.uid || p.recibe) ? `<div class="item-bot">${ownerOf(p) !== ME.uid ? `<span class="pill">Cartera: ${esc(nameOf(ownerOf(p)))}</span>` : ""}${p.recibe ? `<span class="pill warn">Recibe: ${esc(nameOf(p.recibe))}</span>` : ""}</div>` : ""}
    <p class="muted">${loanDesc(p, a)}</p>
    ${avisoCuenta(p)}
    ${a.liquidado ? `<p class="ok">Préstamo liquidado.</p>` : venc > 0.5 ? `<div class="big"><span>Debe hoy</span><b>${mxn2(venc)}</b></div>
      <p class="muted">Le falta${faltan.length > 1 ? "n" : ""} ${faltan.map((f) => mxn(f.falta) + " de " + mesLbl(f.fecha, sem)).join(" y ")}.${e.meses.find((f) => f.fecha > today()) ? " El " + fcorta(new Date(e.meses.find((f) => f.fecha > today()).fecha + "T12:00:00")) + " se suman " + mxn(e.meses.find((f) => f.fecha > today()).pago) + "." : ""}</p>`
      : a.siguiente ? `<div class="big"><span>Próximo pago${SI ? "" : " · " + unidad + " " + a.siguiente.n + " de " + a.total}</span><b>${mxn2(a.siguiente.monto)}</b></div>${a.siguiente.fecha ? `<p>Fecha: <b>${fcorta(a.siguiente.fecha)}</b></p>` : ""}` : ""}
    ${SI ? "" : `<div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>`}
    <div class="facts">
      <div><span>Pagado completo</span><b>${e.pagadoHasta ? "Hasta " + mesLbl(e.pagadoHasta.fecha, sem) : "Aún ninguno"}</b></div>
      <div><span>${p.corte ? "Abonado desde el corte" : "Pagado"}</span><b>${mxn2(a.pagado)}</b></div>
      ${SI ? `<div><span>Capital</span><b>${mxn2(a.capital)}</b></div><div><span>Interés al mes</span><b>${mxn2(a.corrida.pago)}</b></div>`
        : `<div><span>${p.tipo === "capfijo" ? "Capital pendiente" : "Resta"}</span><b>${mxn2(p.tipo === "capfijo" ? a.capital : a.restante)}</b></div><div><span>Avance</span><b>${a.cubiertos} de ${a.total}</b></div>`}
    </div>
    ${a.liquidado ? "" : cuadreBox(p, a, e)}
    <div class="grid4">
      ${a.liquidado ? "" : `<button class="btn${fx === "pago" ? "" : " primary"}" type="button" data-fx="pago">${fx === "pago" ? "Cerrar" : "Registrar pago o abono"}</button>`}
      ${adm ? `<button class="btn" type="button" data-edit="${p.id}">${EDIT === p.id ? "Cerrar edición" : "Editar préstamo"}</button>` : ""}
      ${adm && !a.liquidado ? `<button class="btn" type="button" data-fx="corte">${fx === "corte" ? "Cerrar" : "Último mes pagado"}</button>` : ""}
      <button class="btn" type="button" data-asc>Ver como el cliente</button>
      ${p.telefono && rec ? `<a class="btn" href="${waTo(p.telefono, rec)}" target="_blank" rel="noopener">Recordatorio WhatsApp</a>` : ""}
      ${p.telefono && !tieneCuenta ? `<a class="btn" href="${waTo(p.telefono, invMsg(p))}" target="_blank" rel="noopener">Invitar a su cuenta</a>` : ""}
    </div>
    ${fx === "pago" ? `<form data-pay="${p.id}" class="edit" novalidate><h3>Registrar pago o abono</h3>
        ${SI ? `<label>Concepto<select name="t"><option value="interes">Abono a interés</option><option value="capital">Abono a capital</option></select></label>` : ""}
        <p class="note">Puede ser cualquier cantidad, aunque sea parcial. Se aplica ${sem ? "a la semana más antigua pendiente" : "al mes más antiguo pendiente"}.</p>
        <div class="row"><label>Monto<input name="m" inputmode="decimal" value="${venc > 0.5 ? "" : a.siguiente ? a.siguiente.monto : ""}" placeholder="Ej. 5,000"></label>
        <label>Fecha en que pagó<input name="f" type="date" value="${today()}"></label></div>
        <label>Comprobante (opcional)<input name="c" type="file" accept="image/*,application/pdf"></label>
        <button class="btn primary" type="submit">Guardar pago</button></form>` : ""}
    ${fx === "corte" ? `<form data-corte="${p.id}" class="edit" novalidate><h3>Último mes pagado completo</h3>
        <p class="muted">Para clientes atrasados o que ya traías de antes: marca hasta qué ${sem ? "semana" : "mes"} te pagó completo y desde ahí la app lleva la cuenta. No necesitas capturar los pagos viejos.</p>
        ${SI ? `<label>Fecha en que debía pagar el último mes que pagó completo<input name="c" type="date" value="${p.corte || ""}" max="${today()}"></label><p class="note">Ejemplo: si debe de mayo en adelante y paga los días 4, pon el 4 de abril. Déjalo vacío para contar desde el primer pago.</p>` : `<label>Fecha de pago de ese ${sem ? "semana" : "mes"}<select name="c"><option value="">Ninguno (cuenta desde el primer pago)</option>${(SI ? avance({ ...p, corte: "" }).corrida.filas.map((f) => iso(f.fecha)) : a.corrida.filas.map((f) => iso(fechaPago(p.inicio, f.n, p.tipo)))).filter((f) => f <= plusDays(40)).map((f) => `<option value="${f}"${f === p.corte ? " selected" : ""}>${fcorta(new Date(f + "T12:00:00"))}</option>`).join("")}</select></label>`}
        ${SI ? `<label>Interés que paga cada mes<input name="i" inputmode="decimal" value="${(p.pagoFijo || Math.round(p.monto * p.tasa) / 100).toLocaleString("es-MX")}"></label><p class="note">Si cambias el interés, solo afecta a este préstamo. Calculado con la tasa: ${mxn2((p.monto * p.tasa) / 100)}.</p>` : ""}
        <p class="note">Si la fecha que buscas no aparece, cambia primero la fecha del primer pago en Editar préstamo.</p>
        <p class="err" hidden></p>
        <button class="btn primary" type="submit">Guardar</button></form>` : ""}
    ${adm && EDIT === p.id ? editForm(p) : ""}
    ${prestamoInvBox(p)}
    ${pagosBox(p, adm)}
    ${estadoBox(p, true)}
    ${schedule(p, a, false, true).replace("<details", '<details class="sec"')}
    <details class="sec"><summary>Datos del cliente</summary>
      <p class="muted">${tieneCuenta ? `Lo ve en su app la cuenta de <b>${esc(cuentaDe(p)?.nombre || cuentaDe(p)?.email || "")}</b>.` : "Todavía no crea su cuenta."}${p.telefono ? " WhatsApp: " + esc(p.telefono) + "." : ""}</p>
      <label>Correo (con este correo verá su préstamo)<input data-mail="${p.id}" type="email" value="${esc(p.clienteEmail || "")}" placeholder="cliente@correo.com"></label>
      ${adm ? (() => { const G = gruposClientes(PRES).filter((g) => g.k !== cliKey(p)); return G.length ? `<label>¿Es la misma persona que otro cliente? (para verlos juntos)<select data-mismo="${p.id}"><option value="">No, es otra persona</option>${G.map((g) => `<option value="${esc(g.k)}"${p.persona === g.k ? " selected" : ""}>${esc(g.nombre)} · ${g.P.length} préstamo${g.P.length > 1 ? "s" : ""}</option>`).join("")}</select></label>${gruposClientes(PRES).find((g) => g.k === cliKey(p))?.P.length > 1 ? `<button class="link" type="button" data-separa="${p.id}">No es la misma persona: separar este préstamo</button>` : ""}` : ""; })() : ""}
      ${adm ? `<label>Cuenta del cliente<select data-link="${p.id}"><option value="">Sin cuenta</option>${clientes.map((u) => `<option value="${u.uid}"${u.uid === p.clienteUid ? " selected" : ""}>${esc(u.nombre)} · ${esc(u.email)}</option>`).join("")}</select></label>` : ""}
    </details>
    ${adm ? `<details class="sec" data-docsec${DOCS_OPEN === dk ? " open" : ""}><summary>Documentos y comprobantes</summary>
      ${tieneCuenta && !p.clienteUid ? `<p class="note">Elige su cuenta en Datos del cliente para juntar sus documentos con los que él suba.</p>` : ""}
      <div id="pdocs"></div>${compBox(p)}</details>` : ""}
    ${adm ? `<details class="sec"${p.nota ? " open" : ""}><summary>Notas internas</summary><textarea data-nota="${p.id}" rows="2" placeholder="Ej. Paga siempre los viernes">${esc(p.nota || "")}</textarea></details>` : ""}
    ${adm ? `<div class="sec">${repartoBox(p)}</div>` : ""}
    ${adm ? `<details class="sec"><summary>Liquidar o borrar</summary>${(() => {
      if (a.liquidado) return "";
      const L = liquidacion(p), intV = r2c(L.interes - (L.intDias || 0) - (p.tipo === "interes" && L.dias ? 0 : 0));
      return `<div class="tbl cuadre"><table>
        <tr><td>Capital pendiente</td><td class="r">${mxn2(L.capital)}</td></tr>
        ${p.tipo === "interes" ? (L.interes > 0.005 ? `<tr><td>Interés${L.dias ? ` (vencido + ${L.dias} de ${L.diasMes} días de este mes)` : " vencido"}</td><td class="r">${mxn2(L.interes)}</td></tr>` : "")
          : `${intV > 0.005 ? `<tr><td>Interés vencido sin pagar</td><td class="r">${mxn2(intV)}</td></tr>` : ""}${L.intDias > 0.005 ? `<tr><td>Interés de ${L.dias} de ${L.diasMes} días de este mes</td><td class="r">${mxn2(L.intDias)}</td></tr>` : ""}`}
        <tr><td><b>Para liquidar hoy</b></td><td class="r"><b>${mxn2(L.total)}</b></td></tr></table></div>
      <p class="note">${L.semanal ? "En semanal se cobra lo que resta del pago acordado." : "Incluye el interés hasta hoy, por días reales. Si liquida otro día, la cantidad cambia: regístralo el día que te pague."}</p>
      <div class="actions"><button class="btn sm" type="button" data-liq="${p.id}">Liquidar con ${mxn2(L.total)}</button></div>`;
    })()}
      <p class="muted">Borrar elimina el préstamo con todos sus pagos; pide que toques dos veces.</p>
      <div class="actions"><button class="btn sm danger" type="button" data-delp="${p.id}">Borrar préstamo</button></div></details>` : ""}
  </div>`;
}
const MIGR = {};
function fichaBind(p) {
  const P = $("panel");
  P.querySelector("[data-back]").onclick = () => { OPEN = ""; FX = ""; EDIT = ""; PEDIT = ""; RECH = ""; vPrestamos(); };
  P.querySelectorAll("[data-fx]").forEach((b) => (b.onclick = () => { FX = FX === b.dataset.fx ? "" : b.dataset.fx; EDIT = ""; vPrestamos(); }));
  P.querySelector("[data-asc]").onclick = () => verComoCliente(p);
  // Al unir, el préstamo toma el nombre de esa persona (y sus otros préstamos se ligan a la misma clave).
  P.querySelectorAll("select[data-mismo]").forEach((sl) => (sl.onchange = async () => {
    if (!sl.value) return; const g = gruposClientes(PRES).find((x) => x.k === sl.value); if (!g) return;
    await Promise.all([p, ...g.P].map((q) => updateDoc(doc(db, "prestamos", q.id), { persona: sl.value, cliente: g.nombre, solo: deleteField() })));
  }));
  P.querySelectorAll("[data-separa]").forEach((b) => (b.onclick = () => updateDoc(doc(db, "prestamos", p.id), { persona: deleteField(), solo: true })));
  bindPrestamoInv(p);
  const fc = P.querySelector("form[data-corte]");
  if (fc) fc.onsubmit = async (e) => {
    e.preventDefault();
    const d = { corte: fc.querySelector("[name=c]").value };
    // En solo interés, si el primer pago registrado es posterior al corte, el calendario empieza en el corte para que cuenten los meses atrasados.
    if (p.tipo === "interes" && d.corte && (!p.inicio || p.inicio > d.corte)) d.inicio = d.corte;
    const i = fc.querySelector("[name=i]"); if (i) { const v = num(i.value), calc = Math.round(p.monto * p.tasa) / 100; d.pagoFijo = v && Math.abs(v - calc) > 0.005 ? v : null; }
    try { await updateDoc(doc(db, "prestamos", p.id), d); FX = ""; vPrestamos(); }
    catch (er) { const x = fc.querySelector(".err"); x.hidden = false; x.textContent = "No se pudo guardar. Revisa tu conexión."; }
  };
  // Avisos de pago del cliente: confirmar los agrega como pago; rechazar le avisa el motivo.
  P.querySelectorAll("[data-cok]").forEach((b) => (b.onclick = async () => {
    const c = (COMPS[p.id] || []).find((x) => x.id === b.dataset.cok); if (!c) return;
    b.disabled = true;
    const pg = { monto: c.monto, fecha: c.fecha, reg: c.reg || new Date().toISOString(), regPor: ME.uid, nota: "Avisado por el cliente" };
    if (c.tipo === "capital") pg.tipo = "capital";
    await updateDoc(doc(db, "prestamos", p.id), { pagos: arrayUnion(pg) });
    await updateDoc(doc(db, "comprobantes", c.id), { estado: "confirmado", reg: pg.reg, revisado: new Date().toISOString() });
  }));
  P.querySelectorAll("[data-cno]").forEach((b) => (b.onclick = () => { RECH = RECH === b.dataset.cno ? "" : b.dataset.cno; vPrestamos(); }));
  P.querySelectorAll("form[data-cnof]").forEach((f) => (f.onsubmit = async (e) => {
    e.preventDefault(); const m = f.querySelector("[name=m]").value.trim();
    if (!m) { f.querySelector("[name=m]").focus(); return; }
    await updateDoc(doc(db, "comprobantes", f.dataset.cnof), { estado: "rechazado", motivo: m, revisado: new Date().toISOString() }); RECH = "";
    if (p.telefono) notice(p.cliente, p.telefono, `Hola ${p.cliente}, revisamos tu aviso de pago y no lo encontramos.\nMotivo: ${m}\n\nEscríbenos para aclararlo.\n\nEntre Amigos`, "Aviso rechazado", p.clienteEmail);
  }));
  if (!isAdmin()) return;
  const dk = docKey(p), ds = P.querySelector("[data-docsec]");
  const loadDocs = () => docsCard($("pdocs"), dk, true, { extra: true, who: { nombre: p.cliente, telefono: p.telefono } });
  if (ds) { ds.ontoggle = () => { if (ds.open) { DOCS_OPEN = dk; loadDocs(); } else if (DOCS_OPEN === dk) DOCS_OPEN = ""; }; if (ds.open) loadDocs(); }
  // Documentos subidos antes de que el cliente tuviera cuenta: pasarlos a su cuenta.
  if (p.clienteUid && !MIGR[p.id]) {
    MIGR[p.id] = 1;
    getDocs(collection(db, "expedientes", "p_" + p.id, "archivos")).then(async (sn) => {
      for (const d of sn.docs) {
        const ya = await getDoc(doc(db, "expedientes", p.clienteUid, "archivos", d.id));
        if (!ya.exists()) { await setDoc(doc(db, "expedientes", p.clienteUid, "archivos", d.id), d.data()); updateDoc(doc(db, "usuarios", p.clienteUid), { ["docs." + d.id]: d.data().estado }).catch(() => {}); }
        await deleteDoc(d.ref);
      }
    }).catch(() => {});
  }
}
// Muestra exactamente lo que ve el cliente en su app.
function verComoCliente(p) {
  const ov = document.createElement("div"); ov.className = "viewer asc";
  ov.innerHTML = `<div class="vbar"><b>Así lo ve ${esc(((cuentaDe(p)?.nombre) || p.cliente || "el cliente").split(" ")[0])}${cuentaDe(p) ? "" : " (cuando cree su cuenta)"}</b><button class="btn sm primary" type="button">Cerrar</button></div><div class="vbody"><div class="wrap">${clienteLoanCard(p)}</div></div>`;
  ov.querySelectorAll("a,button:not(.vbar button),input,select,textarea").forEach((x) => { x.setAttribute("tabindex", "-1"); x.style.pointerEvents = "none"; });
  ov.querySelectorAll("form").forEach((f) => (f.onsubmit = (e) => e.preventDefault()));
  ov.querySelector(".vbar button").onclick = () => ov.remove();
  document.body.appendChild(ov);
}

/* ---------- Mis préstamos (cliente) ---------- */
const COT_ID = new URLSearchParams(location.search).get("c") || "";
let MYCOTS = [];
function corridaCliente(c) {
  if (c.tipo === "auto" || !c.monto || !c.plazo) return "";
  const sem = c.tipo === "semanal", k = sem ? corridaSemanal(c.monto, c.plazo, c.tasa) : corridaMensual(c.monto, c.tasa, c.plazo);
  return `<details open><summary>Tu corrida de pagos</summary><div class="tbl"><table>${sem
    ? "<tr><th>Semana</th><th>Fecha</th><th>Pago</th><th>Resta</th></tr>" + k.filas.map((f) => `<tr><td>${f.n}</td><td>${c.inicio ? fcorta(fechaPago(c.inicio, f.n, "semanal")) : ""}</td><td>${mxn2(f.pago)}</td><td>${mxn2(f.saldo)}</td></tr>`).join("")
    : "<tr><th>Mes</th><th>Pago</th><th>Interés</th><th>Capital</th><th>Saldo</th></tr>" + k.filas.map((f) => `<tr><td>${f.n}</td><td>${mxn2(f.pago)}</td><td>${mxn2(f.interes)}</td><td>${mxn2(f.capital)}</td><td>${mxn2(f.saldo)}</td></tr>`).join("")}</table></div></details>`;
}
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
      <p>${detalle}</p><p class="muted">Total a pagar: ${mxn2(c.total)}${c.tipo !== "semanal" && c.garantia && c.garantia !== "ff" && c.garantia !== "sin" ? " · Garantía: " + esc(c.desc || GARANTIAS[c.garantia]) : ""}</p>
      ${corridaCliente(c)}
      ${c.estado === "negado" && (mine || !c.aceptadoPor) ? `<p class="muted">Por el momento no nos es posible aprobar esta solicitud. Si quieres revisar otra opción, escríbenos por WhatsApp.</p>`
        : mine ? `<p class="ok">Confirmaste esta cotización. Te avisaremos por WhatsApp cuando tu préstamo esté listo y la fecha de tu primer pago.</p>`
        : libre && !ME.emailVerified ? `<p class="cov bad" style="margin:0">Para confirmar tu cotización, primero confirma tu correo con el enlace que te mandamos (revisa también "No deseados" o "Spam"). En cuanto lo confirmes, aquí aparece el botón.</p>`
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
    <div class="row"><label for="s-gar">Garantía<select id="s-gar">${Object.entries(GARANTIAS).filter(([k]) => k !== "ff" && k !== "sin").map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}<option value="sin">No tengo garantía (ustedes deciden)</option><option value="aval">Sin garantía (con aval)</option></select></label>
    <label for="s-desc">Descripción de la garantía<input id="s-desc" placeholder="Ej. Jetta 2019, Rolex Submariner"></label></div>
    <label for="s-val" id="s-val-l">Valor de tu garantía<input id="s-val" inputmode="numeric" placeholder="Ej. 150,000"></label>
    <p class="cov" id="s-cov">Tu garantía debe valer al menos el doble de lo que pides (2 a 1). Si el plazo es mayor a 12 meses, el triple (3 a 1).</p>
    <label for="s-nota">Comentarios (opcional)<input id="s-nota" placeholder="Ej. Lo necesito para el viernes"></label>
    <p class="err" id="s-err" hidden></p>
    <button class="btn primary" type="submit">Enviar solicitud por WhatsApp</button></form>`;
}
function solicitudForm() {
  const f = $("sol"); if (!f) return;
  ["s-monto", "s-val"].forEach((id) => $(id).addEventListener("input", (e) => { const v = e.target.value.replace(/\D/g, ""); e.target.value = v ? Number(v).toLocaleString("es-MX") : ""; }));
  const meses = () => { const n = parseInt($("s-plazo").value, 10) || 0; return $("s-uni").value === "semanas" ? Math.ceil(n / 4.33) : n; };
  const cob = () => {
    const g = $("s-gar").value, aval = g === "aval" || g === "sin", m = num($("s-monto").value), v = num($("s-val").value), fx = factorGarantia(meses()), req = m * fx, box = $("s-cov");
    $("s-val-l").hidden = aval; $("s-desc").closest("label").hidden = aval; box.hidden = aval;
    if (g === "aval") { $("s-uni").value = "semanas"; return ""; }
    if (g === "sin") return "";
    if (!m) return "Escribe el monto.";
    if (!v) { box.className = "cov"; box.textContent = `Para ${mxn(m)} tu garantía debe valer al menos ${mxn(req)} (${fx} a 1).`; return `Escribe cuánto vale tu garantía: debe ser al menos ${mxn(req)} (${fx} a 1).`; }
    if (v >= req) { box.className = "cov ok"; box.textContent = `Tu garantía cubre el préstamo (${fx} a 1).`; return ""; }
    box.className = "cov bad"; box.textContent = `Tu garantía no alcanza: debe valer al menos ${mxn(req)} (${fx} a 1), porque pedimos que valga ${fx === 2 ? "el doble" : "el triple"} del préstamo. Con ${mxn(v)} puedes pedir hasta ${mxn(Math.floor(v / fx / 1000) * 1000)}.`;
    return `Tu garantía debe valer al menos ${mxn(req)} (${fx} a 1). Ajusta el monto o el valor de tu garantía.`;
  };
  ["s-monto", "s-val", "s-plazo", "s-uni", "s-gar"].forEach((id) => $(id).addEventListener(id === "s-gar" || id === "s-uni" ? "change" : "input", cob));
  cob();
  f.onsubmit = (e) => {
    e.preventDefault();
    const m = num($("s-monto").value), n = parseInt($("s-plazo").value, 10) || 0, g = $("s-gar").value;
    if (!m || !n) { $("s-err").hidden = false; $("s-err").textContent = "Escribe el monto y el plazo."; return; }
    const ce = cob(); if (ce) { $("s-err").hidden = false; $("s-err").textContent = ce; return; }
    $("s-err").hidden = true;
    const gar = g === "aval" ? "Sin garantía (con aval)" : g === "sin" ? "No tengo garantía" : GARANTIAS[g] + ($("s-desc").value.trim() ? ": " + $("s-desc").value.trim() : "") + " (valor " + mxn(num($("s-val").value)) + ")";
    const msg = `Hola, quiero solicitar ${PRES.length ? "otro " : "un "}préstamo.\n\nNombre: ${USER.nombre || ""}\nCorreo: ${ME.email || ""}${USER.telefono ? "\nWhatsApp: " + USER.telefono : ""}\nMonto: ${mxn(m)}\nPlazo: ${n} ${$("s-uni").value}\nPagos: ${$("s-uni").value === "semanas" ? "semanales" : "mensuales"}\nGarantía: ${gar}${$("s-nota").value.trim() ? "\nComentarios: " + $("s-nota").value.trim() : ""}`;
    avisar("Nueva solicitud de préstamo", `${mxn(m)} a ${n} ${$("s-uni").value} (cliente con cuenta). Ábrela en la app.`);
    addDoc(collection(db, "solicitudes"), { nombre: (USER.nombre || "").slice(0, 80), telefono: USER.telefono || "", monto: m, plazo: n, unidad: $("s-uni").value, garantia: g, desc: $("s-desc").value.trim().slice(0, 200), valor: g === "aval" || g === "sin" ? 0 : num($("s-val").value), nota: $("s-nota").value.trim().slice(0, 300), fecha: new Date().toISOString(), origen: "cliente", uid: ME.uid, email: (ME.email || "").toLowerCase(), estado: "nueva" }).catch(() => {});
    window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(msg), "_blank", "noopener");
  };
}
let VERI_T = null;
function clienteLoanCard(p) {
    const a = avance(p), unidad = p.tipo === "semanal" ? "Semana" : "Mes", sem = p.tipo === "semanal";
    // Si va atrasado, lo primero que ve es cuánto debe hoy y de qué meses (no una fecha que ya pasó).
    const e = estadoCuenta(p), venc = vencido(p, a), faltan = e.meses.filter((f) => f.falta > 0.5 && f.fecha <= today());
    const debeHoy = venc > 0.5 ? `<div class="big"><span>Debes hoy</span><b>${mxn2(venc)}</b></div><p class="muted">Te falta${faltan.length > 1 ? "n" : ""} ${faltan.map((f) => mxn(f.falta) + " de " + mesLbl(f.fecha, sem)).join(" y ")}. Ponte al corriente o escríbenos si necesitas ayuda.</p>` : "";
    if (p.tipo === "interes") return `<div class="card">
      <div class="head"><h2>Préstamo de ${mxn(p.monto)}</h2>${estadoPill(p, a)}</div>
      <p class="muted">Pagas cada mes el interés (${p.tasa}% mensual) sobre lo que debes. Puedes abonar a capital cuando quieras y tu interés baja.${p.desc ? " Garantía: " + esc(p.desc) + "." : ""}</p>
      ${debeHoy || (a.siguiente ? `<div class="big"><span>Tu próximo pago de interés</span><b>${mxn2(a.siguiente.monto)}</b></div>${a.siguiente.fecha ? `<p>Fecha: <b>${fcorta(a.siguiente.fecha)}</b></p>` : ""}` : a.liquidado ? `<p class="ok">Liquidaste tu préstamo. Gracias por tu confianza.</p>` : "")}
      <div class="facts"><div><span>Capital pendiente</span><b>${mxn2(a.capital)}</b></div><div><span>Interés al mes</span><b>${mxn2(a.corrida.pago)}</b></div><div><span>Intereses pagados</span><b>${mxn2(a.pagado)}</b></div><div><span>Abonos a capital</span><b>${mxn2(a.capPagado)}</b></div></div>
      ${estadoBox(p, false)}
      ${pagosBox(p, false)}
      ${avisoBox(p)}
      ${schedule(p, a, false, true)}
      <a class="btn" href="https://wa.me/${WA}?text=${encodeURIComponent("Hola, tengo una duda sobre mi préstamo.")}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
    </div>`;
    const pct = Math.min(100, Math.round(((a.pagado + (a.credito || 0)) / a.corrida.total) * 100));
    return `<div class="card">
      <div class="head"><h2>Préstamo de ${mxn(p.monto)}</h2>${estadoPill(p, a)}</div>
      <p class="muted">${p.tipo === "semanal" ? `${a.total} pagos semanales` : p.tipo === "capfijo" ? `Pagas cada mes el interés (${p.tasa}% mensual) sobre lo que debes más un abono a capital de ${mxn(p.abono)}. Tu pago baja cada mes.${p.desc ? " Garantía: " + esc(p.desc) + "." : ""}` : `${a.total} pagos mensuales${p.desc ? " · Garantía: " + esc(p.desc) : ""}`}</p>
      ${debeHoy || (a.siguiente ? `<div class="big"><span>Tu próximo pago · ${unidad} ${a.siguiente.n} de ${a.total}</span><b>${mxn2(a.siguiente.monto)}</b></div>${a.siguiente.fecha ? `<p>Fecha: <b>${fcorta(a.siguiente.fecha)}</b></p>` : ""}` : `<p class="ok">Liquidaste tu préstamo. Gracias por tu confianza.</p>`)}
      <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <div class="facts"><div><span>Pagado</span><b>${mxn2(a.pagado)}</b></div>${p.tipo === "capfijo" ? `<div><span>Capital pendiente</span><b>${mxn2(a.capital)}</b></div>` : `<div><span>Te resta</span><b>${mxn2(a.restante)}</b></div>`}<div><span>Avance</span><b>${a.cubiertos} de ${a.total}</b></div></div>
      ${estadoBox(p, false)}
      ${pagosBox(p, false)}
      ${avisoBox(p)}
      ${schedule(p, a, false, true)}
      <a class="btn" href="https://wa.me/${WA}?text=${encodeURIComponent("Hola, tengo una duda sobre mi préstamo.")}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
    </div>`;
}

// Aviso de pago del cliente: no cambia nada del préstamo; queda en revisión hasta que el administrador lo confirma o lo rechaza.
let MISAV = null, AVFORM = "";
function avisoBox(p) {
  if (isAdmin() || !ME || p.clienteUid !== ME.uid) return "";
  if (MISAV === null) { MISAV = []; onSnapshot(query(collection(db, "comprobantes"), where("por", "==", ME.uid)), (s) => { MISAV = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ((a.creado || "") < (b.creado || "") ? 1 : -1)); if (TAB === "mis") draw(); }, () => {}); }
  const L = MISAV.filter((c) => c.pid === p.id && c.estado).slice(0, 5), SI = p.tipo === "interes";
  const EA = { "por revisar": ["En revisión", "warn"], confirmado: ["Confirmado", "ok"], rechazado: ["No se encontró", "no"] };
  return `<div class="sec"><h3>¿Ya pagaste?</h3>
    <p class="muted">Avísanos aquí con tu comprobante. Lo revisamos y, en cuanto lo confirmemos, aparece en tus pagos.</p>
    ${L.length ? `<div class="list">${L.map((c) => `<div class="item"><div class="item-top"><b>${mxn2(c.monto)} · ${fcorta(new Date(c.fecha + "T12:00:00"))}</b><span class="pill ${EA[c.estado]?.[1] || ""}">${EA[c.estado]?.[0] || ""}</span></div>${c.estado === "rechazado" && c.motivo ? `<div class="item-mid">Motivo: ${esc(c.motivo)}</div>` : ""}</div>`).join("")}</div>` : ""}
    ${AVFORM === p.id ? `<form class="edit" data-avf="${p.id}" novalidate>
      ${SI ? `<label>¿Qué pagaste?<select name="t"><option value="interes">Interés</option><option value="capital">Abono a capital</option></select></label>` : ""}
      <div class="row"><label>Monto que pagaste<input name="m" inputmode="decimal" placeholder="Ej. 5,000"></label><label>Fecha en que pagaste<input name="f" type="date" value="${today()}" max="${today()}"></label></div>
      <label>Foto del comprobante<input name="c" type="file" accept="image/*,application/pdf"></label>
      <label>Comentario (opcional)<input name="n" placeholder="Ej. Transferencia desde BBVA"></label>
      <p class="err" hidden></p>
      <button class="btn primary" type="submit">Enviar aviso de pago</button></form>`
    : `<button class="btn primary" type="button" data-avo="${p.id}">Avisar que ya pagué</button>`}</div>`;
}
function bindAvisos() {
  const P = $("panel");
  P.querySelectorAll("[data-avo]").forEach((b) => (b.onclick = () => { AVFORM = b.dataset.avo; vMis(); }));
  P.querySelectorAll("form[data-avf]").forEach((f) => (f.onsubmit = async (e) => {
    e.preventDefault();
    const er = f.querySelector(".err"), m = num(f.querySelector("[name=m]").value), fe = f.querySelector("[name=f]").value, file = f.querySelector("[name=c]").files[0];
    if (!m || !fe) { er.hidden = false; er.textContent = "Escribe el monto y la fecha en que pagaste."; return; }
    if (!file) { er.hidden = false; er.textContent = "Agrega la foto de tu comprobante."; return; }
    const btn = f.querySelector("button[type=submit]"); btn.disabled = true; er.hidden = false; er.className = "ok"; er.textContent = "Enviando…";
    try {
      const { data, mime } = await fileToData(file);
      const d = { pid: f.dataset.avf, por: ME.uid, estado: "por revisar", monto: m, fecha: fe, nota: f.querySelector("[name=n]").value.trim().slice(0, 200), data, mime, creado: new Date().toISOString() };
      const t = f.querySelector("[name=t]"); if (t && t.value === "capital") d.tipo = "capital";
      await addDoc(collection(db, "comprobantes"), d);
      AVFORM = ""; vMis();
    } catch (x) { btn.disabled = false; er.className = "err"; er.textContent = x.message || "No se pudo enviar. Intenta de nuevo."; }
  }));
}
function vMis() {
  const okv = QS.has("verificado") && ME.emailVerified ? `<div class="card"><p class="ok" style="margin:0">Tu correo quedó confirmado. Ya puedes ver tus préstamos y seguir con tu solicitud.</p></div>` : "";
  if (QS.has("verificado")) history.replaceState(null, "", location.pathname);
  const ver = ME.emailVerified ? okv : `<div class="card"><h3>Confirma tu correo</h3><p class="muted" style="margin:0">Te mandamos un enlace a <b>${esc(ME.email)}</b>. Ábrelo para activar tu cuenta.</p>
    <p class="cov" style="margin:0"><b>¿No lo ves?</b> Revisa la carpeta <b>"No deseados"</b> o <b>"Spam"</b>. Si está ahí, márcalo como "No es spam" para recibir nuestros avisos.</p>
    <p class="note" style="margin:0">Esta pantalla se actualiza sola en cuanto lo confirmas. El botón de abajo solo funciona si de verdad ya abriste el enlace.</p>
    <div class="actions"><button class="btn primary" type="button" id="b-ver">Ya lo confirmé</button><button class="btn" type="button" id="b-rev">Reenviar correo</button></div><p class="toast" id="ver-t"></p></div>`;
  if (!ME.emailVerified && !VERI_T) {
    const chk = async () => { try { await auth.currentUser.reload(); if (auth.currentUser.emailVerified) { clearInterval(VERI_T); await auth.currentUser.getIdToken(true); location.reload(); } } catch (e) {} };
    VERI_T = setInterval(() => { if (!document.hidden) chk(); }, 5000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) chk(); });
  }
  setTimeout(() => {
    $("b-ver") && ($("b-ver").onclick = async () => { await ME.reload(); if (auth.currentUser.emailVerified) { await auth.currentUser.getIdToken(true); location.reload(); } else $("ver-t").textContent = "Todavía no está confirmado. Abre el enlace del correo (revisa también No deseados) y vuelve a tocar el botón."; });
    $("b-rev") && ($("b-rev").onclick = () => sendEmailVerification(auth.currentUser, ACS).then(() => ($("ver-t").textContent = "Correo reenviado."), () => ($("ver-t").textContent = "Espera un momento antes de reenviar.")));
  });
  setTimeout(cotBox);
  setTimeout(() => { const f = $("my-tel"); if (f) f.onsubmit = async (e) => { e.preventDefault(); const t = tel10($("my-tel-i").value); if (t.length !== 10) return; await updateDoc(doc(db, "usuarios", ME.uid), { telefono: t }); USER.telefono = t; vMis(); }; });
  setTimeout(() => docsCard($("docs-box"), ME.uid, false));
  setTimeout(bindAvisos);
  const telBox = USER.telefono ? "" : `<form class="card" id="my-tel" novalidate><h3>Agrega tu WhatsApp</h3><p class="muted">Para avisarte cuando tu préstamo esté listo o cuando revisemos tus documentos.</p><div class="row"><label for="my-tel-i">WhatsApp<input id="my-tel-i" type="tel" inputmode="tel" placeholder="33 1234 5678"></label><button class="btn primary" type="submit">Guardar</button></div></form>`;
  const conv = USER.solicita === "empresa" ? `<div class="card inv" id="conv-box">${USER.convenioOk ? `<p class="muted">Cargando…</p>` : `<p class="hi">Convenio para empresas</p><p class="big-t">Recibimos tu solicitud. La revisamos y te avisamos por WhatsApp; en cuanto la aprobemos, aquí verás toda la información.</p>`}</div>` : "";
  if (USER.solicita === "empresa" && USER.convenioOk) setTimeout(async () => { try { const s2 = await getDoc(doc(db, "config", "convenioInfo")); const box = $("conv-box"); if (box && s2.exists()) box.innerHTML = s2.data().html + `<a class="btn primary" href="https://wa.me/${WA}?text=${encodeURIComponent("Hola, soy " + (USER.nombre || "") + ". Ya vi la información del convenio para mi empresa.")}" target="_blank" rel="noopener">Escribir a Entre Amigos</a>`; } catch (e) {} });
  $("panel").innerHTML = ver + conv + telBox + `<div id="cot-box" style="display:grid;gap:16px"></div>` + (PRES.length ? PRES.map((p) => clienteLoanCard(p)).join("") : `<div class="card"><h2>Mis préstamos</h2><p class="muted">Aquí verás tu préstamo, tus pagos y cuánto te resta en cuanto Entre Amigos lo registre. Si te llegó una invitación por WhatsApp, ábrela desde ese enlace.</p></div>`) + `<div id="docs-box"></div>` + solicitudCard();
  setTimeout(solicitudForm);

}

/* ---------- Personas (admin) ---------- */
const ROL = { cliente: "Cliente", equipo: "Colaborador (cotiza)", empresa: "Administradora de empresa", bloqueado: "Bloqueado" };
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
  <form class="card" id="bc-f" novalidate><h2>Borrar una cuenta</h2><p class="muted" style="margin:0">Borra por completo el acceso, el perfil y los documentos de una persona para que pueda registrarse de nuevo. Sus préstamos y cotizaciones se conservan. La primera vez Google te pide permiso con tu cuenta de administrador.</p>
    <div class="row"><label for="bc-mail">Correo de la cuenta<input id="bc-mail" type="email" inputmode="email" placeholder="cliente@correo.com"></label><button class="btn danger" type="submit" id="bc-b" style="align-self:end">Borrar cuenta</button></div>
    <p class="toast" id="bc-t"></p></form>
  <div class="card"><h2>Personas</h2><div class="list">${list.length ? list.map((u) => `<div class="item">
    <div class="item-top"><b>${esc(u.nombre || "Sin nombre")}${u.rol === "equipo" ? ` <span class="pill">Colaborador</span>` : ""}${u.inversionista ? ` <span class="pill ok">Inversionista</span>` : ""}${u.solicita === "empresa" ? (u.convenioOk ? ` <span class="pill ok">Convenio: aprobada</span>` : ` <span class="pill warn">Empresa interesada</span>`) : ""}</b><span>${esc(u.email)}</span></div>
    ${(() => { const L = PRES.filter((p) => p.clienteUid === u.uid || (u.email && p.clienteEmail === u.email)); return L.length ? `<div class="item-mid">Préstamos: ${L.map((p) => { const a = avance(p); return esc(mxn(p.monto)) + (a.liquidado ? " (liquidado)" : vencido(p, a) ? " (vencido)" : " (al corriente)"); }).join(" · ")}</div>` : ""; })()}
    <div class="item-bot"><select data-rol="${u.uid}" aria-label="Tipo de acceso">${Object.entries(ROL).map(([k, v]) => `<option value="${k}"${k === u.rol ? " selected" : ""}>${v}</option>`).join("")}</select>
    ${u.solicita === "empresa" && !u.convenioOk ? `<button class="btn sm primary" type="button" data-convok="${u.uid}">Aprobar convenio</button><button class="link" type="button" data-convno="${u.uid}">No aprobar</button>` : ""}
    ${u.rol === "cliente" && u.solicita === "equipo" ? `<span class="pill warn">Quiere ser colaborador</span><button class="btn sm primary" type="button" data-ok="${u.uid}">Aprobar</button><button class="link" type="button" data-no="${u.uid}">Dejar como cliente</button>` : isNew(u) ? `<span class="pill warn">Nuevo</span>` : ""}
    <label class="chk" style="margin:0"><input type="checkbox" data-inv="${u.uid}"${u.inversionista ? " checked" : ""}> Inversionista</label>
    <input data-tel="${u.uid}" inputmode="tel" placeholder="WhatsApp" value="${esc(u.telefono || "")}" style="width:150px;font-size:14px;padding:6px 8px">
    <button class="link" type="button" data-docs="${u.uid}">Documentos ${docCount(u)}</button><button class="link del" type="button" data-udel="${u.uid}">Borrar registro</button></div>
    ${DOCS_OPEN === u.uid ? `<div id="docs-${u.uid}"></div>` : ""}</div>`).join("") : `<p class="muted">Todavía nadie ha creado cuenta. Manda el link de arriba.</p>`}</div>
    <p class="note">Colaborador: cotiza y ve solo sus propias cotizaciones y clientes (por ejemplo Javier, Paola o Pilar). Inversionista: te da dinero para prestar y le pagas un interés; puede ser también colaborador. Cliente: ve solo sus préstamos y su avance.</p></div>`;
  $("panel").querySelectorAll("select[data-rol]").forEach((s) => (s.onchange = () => updateDoc(doc(db, "usuarios", s.dataset.rol), { rol: s.value, solicita: "" })));
  $("panel").querySelectorAll("[data-ok]").forEach((b) => (b.onclick = async () => {
    await updateDoc(doc(db, "usuarios", b.dataset.ok), { rol: "equipo", solicita: "" });
    const u = USERS.find((x) => x.uid === b.dataset.ok) || {};
    notice(u.nombre || "", u.telefono, `Hola ${u.nombre || ""}, ya aprobé tu cuenta de colaborador en Entre Amigos. Ya puedes cotizar y llevar a tus clientes aquí:\n${PORTAL()}\n\nCualquier duda me dices.`, "Colaborador aprobado");
  }));
  $("panel").querySelectorAll("[data-convok]").forEach((b) => (b.onclick = async () => {
    await updateDoc(doc(db, "usuarios", b.dataset.convok), { convenioOk: true });
    const u = USERS.find((x) => x.uid === b.dataset.convok) || {};
    notice(u.nombre || "", u.telefono, `Hola ${u.nombre || ""}, ya aprobamos tu solicitud del convenio para empresas. Entra con tu cuenta para ver toda la información:\n${PORTAL()}\n\nEntre Amigos`, "Convenio aprobado", u.email);
  }));
  $("panel").querySelectorAll("[data-convno]").forEach((b) => (b.onclick = () => { if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez"; return; } updateDoc(doc(db, "usuarios", b.dataset.convno), { solicita: "" }); }));
  $("panel").querySelectorAll("[data-no]").forEach((b) => (b.onclick = () => updateDoc(doc(db, "usuarios", b.dataset.no), { solicita: "" })));
  $("panel").querySelectorAll("[data-docs]").forEach((b) => (b.onclick = () => { DOCS_OPEN = DOCS_OPEN === b.dataset.docs ? "" : b.dataset.docs; vPersonas(); }));
  if (DOCS_OPEN && $("docs-" + DOCS_OPEN)) docsCard($("docs-" + DOCS_OPEN), DOCS_OPEN, true, { extra: true });
  $("panel").querySelectorAll("input[data-inv]").forEach((i) => i.addEventListener("change", () => updateDoc(doc(db, "usuarios", i.dataset.inv), { inversionista: i.checked })));
  $("panel").querySelectorAll("input[data-tel]").forEach((i) => i.addEventListener("change", () => updateDoc(doc(db, "usuarios", i.dataset.tel), { telefono: tel10(i.value) })));
  // Borrar una cuenta por completo: acceso (usuario y contraseña), perfil y documentos. Sus préstamos y cotizaciones se conservan.
  $("panel").querySelectorAll("[data-udel]").forEach((b) => (b.onclick = () => {
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez para borrar su cuenta"; return; }
    const u = USERS.find((x) => x.uid === b.dataset.udel) || {};
    borrarCuenta(u.email, u.uid, b);
  }));
  $("bc-f").onsubmit = (e) => { e.preventDefault(); const m = $("bc-mail").value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(m)) { $("bc-t").textContent = "Escribe un correo válido."; return; } borrarCuenta(m, (USERS.find((x) => (x.email || "").toLowerCase() === m) || {}).uid, $("bc-b")); };
}
// Permiso temporal de Google (1 hora) para que el administrador borre accesos desde la app, sin entrar a Firebase.
let GTOKEN = null, GTOKEN_T = 0, ADM_APP = null;
async function tokenAdmin() {
  if (GTOKEN && Date.now() - GTOKEN_T < 50 * 60e3) return GTOKEN;
  ADM_APP = ADM_APP || initializeApp(CONF, "permiso");
  const a2 = getAuth(ADM_APP), p = new GoogleAuthProvider();
  p.addScope("https://www.googleapis.com/auth/cloud-platform");
  p.setCustomParameters({ login_hint: ADMINS[0], prompt: "select_account" });
  const r = await signInWithPopup(a2, p);
  const tk = GoogleAuthProvider.credentialFromResult(r)?.accessToken, mail = (r.user.email || "").toLowerCase();
  signOut(a2).catch(() => {});
  if (!ADMINS.includes(mail)) throw Object.assign(new Error("cuenta"), { code: "otra-cuenta" });
  GTOKEN = tk; GTOKEN_T = Date.now(); return tk;
}
async function idt(path, body, tk) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${CONF.projectId}/${path}`, { method: "POST", headers: { Authorization: "Bearer " + tk, "Content-Type": "application/json", "X-Goog-User-Project": CONF.projectId }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error?.message || "error"), { code: j.error?.message || r.status }); return j;
}
async function borrarCuenta(email, uid, btn) {
  const t = $("bc-t"), msg = (x) => { if (t) t.textContent = x; };
  const tkP = tokenAdmin(); // se pide primero para que el iPad no bloquee la ventana de Google
  if (btn) { btn.disabled = true; btn.textContent = "Borrando…"; }
  let acceso = false;
  try {
    const tk = await tkP;
    if (email) {
      const L = await idt("accounts:lookup", { email: [email] }, tk);
      for (const us of L.users || []) { await idt("accounts:delete", { localId: us.localId }, tk); acceso = true; uid = uid || us.localId; }
    }
  } catch (e) {
    msg(e.code === "otra-cuenta" ? "Elige tu cuenta de administrador en la ventana de Google." : e.code === "auth/popup-closed-by-user" ? "Cerraste la ventana de Google; el acceso no se borró." : "No se pudo borrar el acceso con Google (" + (e.code || e.message) + "). Se marcó para borrarse cuando la persona vuelva a entrar.");
  }
  if (email) await setDoc(doc(db, "borrados", email.toLowerCase()), { fecha: new Date().toISOString() }).catch(() => {});
  if (uid) {
    await Promise.all(Object.keys({ ...DOCS_BASE, ...DOCS_EXTRA }).map((k) => deleteDoc(doc(db, "expedientes", uid, "archivos", k)).catch(() => {})));
    await deleteDoc(doc(db, "usuarios", uid)).catch(() => {});
  }
  if (acceso) { await deleteDoc(doc(db, "borrados", email.toLowerCase())).catch(() => {}); msg(`Listo: la cuenta de ${email} quedó borrada por completo. Ya puede registrarse de nuevo.`); }
  if (btn) { btn.disabled = false; btn.textContent = btn.id === "bc-b" ? "Borrar cuenta" : "Borrar registro"; btn.dataset.sure = ""; }
  if ($("bc-mail") && acceso) $("bc-mail").value = "";
}

/* ---------- Tasas (admin) ---------- */
function vTasas() {
  const t = CFG.tasas || {};
  setTimeout(() => { const b = $("rules-now"); if (b) b.onclick = () => publicarReglas(b, $("rules-now-out")); });
  $("panel").innerHTML = `<div class="card"><h2>Reglas de seguridad</h2><p class="muted">Publica las reglas de tu base de datos sin copiar y pegar. Úsalo cuando Claude te avise de un cambio.</p><button class="btn" type="button" id="rules-now">Publicar reglas ahora</button><p id="rules-now-out" hidden></p></div>
  <div class="card"><h2>Valores sugeridos</h2><p class="muted">Tu equipo los verá ya puestos al cotizar. Pueden ajustarlos en cada cotización.</p>
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


/* ---------- Visitas de la página (contador anónimo) ---------- */
const autoNom = (slug) => { const a = (AUTOS || []).find((x) => x.slug === slug); return a ? a.title : slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); };
const PAG_NOM = { inicio: "Portada", inventario: "Inventario", auto: "Fichas de autos", creditos: "Simulador de crédito", vender: "Vende tu auto", prestamos: "Préstamos", nosotros: "Nosotros" };
function topAutos(dias, n) {
  const t = {}; dias.forEach((k) => Object.entries((VIS[k] || {}).autos || {}).forEach(([s, v]) => (t[s] = (t[s] || 0) + v)));
  return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function visDia(k) {
  const v = VIS[k]; if (!v) return `<p class="muted">Sin visitas registradas ese día.</p>`;
  const top = topAutos([k], 5), pags = Object.entries(v.paginas || {}).sort((a, b) => b[1] - a[1]);
  return `<div class="stats"><span class="stat"><b>${v.personas || 0}</b> personas</span><span class="stat"><b>${v.total || 0}</b> páginas vistas</span><span class="stat"><b>${v.wa || 0}</b> clics a WhatsApp</span></div>
    ${top.length ? `<p class="lbl">Autos más vistos</p><ol class="vtop">${top.map(([s, n]) => `<li><span>${esc(autoNom(s))}</span><b>${n}</b></li>`).join("")}</ol>` : ""}
    ${pags.length ? `<p class="note">${pags.map(([p, n]) => `${esc(PAG_NOM[p] || p)} ${n}`).join(" · ")}</p>` : ""}`;
}
function visitasCard() {
  if (!isAdmin()) return "";
  const hoy = today(), ayer = iso(new Date(new Date(hoy + "T12:00:00").getTime() - 864e5));
  const d7 = Array.from({ length: 7 }, (_, i) => iso(new Date(new Date(hoy + "T12:00:00").getTime() - i * 864e5)));
  const sum = (ks, f) => ks.reduce((a, k) => a + ((VIS[k] || {})[f] || 0), 0);
  const top7 = topAutos(d7, 5);
  return `<div class="card"><div class="head"><h2>Visitas a tu página</h2><span class="note">ventaentreamigos.com</span></div>
    <p class="lbl">Hoy</p>${visDia(hoy)}
    <div class="stats" style="margin-top:10px"><span class="stat">Ayer <b>${sum([ayer], "personas")}</b> personas</span><span class="stat">Últimos 7 días <b>${sum(d7, "personas")}</b> personas · <b>${sum(d7, "total")}</b> vistas · <b>${sum(d7, "wa")}</b> WhatsApp</span></div>
    ${top7.length ? `<p class="lbl">Más vistos en 7 días</p><ol class="vtop">${top7.map(([s, n]) => `<li><span>${esc(autoNom(s))}</span><b>${n}</b></li>`).join("")}</ol>` : ""}
    <p class="note">Se cuenta una persona por celular o computadora al día. No se guardan datos personales.</p></div>`;
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
const DOCS_BASE = {
  ine_f: "INE (frente)",
  ine_r: "INE (reverso)",
  domicilio: "Comprobante de domicilio (no mayor a 3 meses)",
  constancia: "Constancia de situación fiscal",
};
const DEST = { pendiente: ["En revisión", "warn"], aprobado: ["Aprobado", "ok"], rechazado: ["Rechazado", "no"] };
let DOCS_OPEN = "", docsUnsub = null;
const docCount = (u) => { const d = u.docs || {}; const n = Object.keys(DOCS_BASE).filter((k) => d[k]).length; return `(${n}/${Object.keys(DOCS_BASE).length})`; };

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
const DOCS_EXTRA = { factura: "Factura endosada", tarjeta: "Tarjeta de circulación", otro: "Otro documento" };
function docsCard(box, uid, admin, opts = {}) {
  const DOCS = opts.extra ? { ...DOCS_BASE, ...DOCS_EXTRA } : DOCS_BASE;
  if (!box) return;
  if (docsUnsub) { docsUnsub(); docsUnsub = null; }
  let FILES = {}, OPENF = "";
  const viejo = (fd) => fd && (Date.now() - new Date(fd + "T12:00:00").getTime()) / 864e5 > 92;
  const render = () => {
    const done = Object.keys(DOCS).filter((k) => FILES[k]).length;
    box.innerHTML = `<div class="card" style="${admin ? "margin-top:10px;background:var(--panel-2)" : ""}">
      <div class="head"><h2>${admin ? "Documentos" : "Mis documentos"}</h2><span class="muted">${done} de ${Object.keys(DOCS).length}</span></div>
      ${admin ? `<p class="muted" style="margin:0">Tú decides: aprueba, aprueba con observación o rechaza con el motivo. También puedes subir tú lo que te mandan por WhatsApp (queda aprobado).</p>` : `<p class="muted">Adelanta tus documentos para que tu préstamo esté listo más rápido. Puedes tomarles foto con tu celular.</p>`}
      <div class="list">${Object.entries(DOCS).map(([k, t]) => {
        const f = FILES[k], na = f && f.estado === "noaplica", st = f ? (na ? ["No aplica", ""] : DEST[f.estado] || DEST.pendiente) : null;
        const puedeSubir = admin || !f || (f.estado !== "aprobado" && !na);
        return `<div class="item"><div class="item-top"><b>${t}</b>${st ? `<span class="pill ${st[1]}">${st[0]}</span>` : `<span class="pill">Falta</span>`}</div>
          ${f && !na ? `<div class="item-mid">Subido el ${fcorta(new Date(f.fecha))}${f.fechaDoc ? " · Fecha del comprobante: " + fcorta(new Date(f.fechaDoc + "T12:00:00")) : ""}${viejo(f.fechaDoc) ? ` <span class="pill warn">Más de 3 meses</span>` : ""}</div>` : ""}
          ${f && f.nota ? `<div class="item-mid"><b>${f.estado === "rechazado" ? "Motivo" : "Nota"}:</b> ${esc(f.nota)}</div>` : ""}
          ${k === "domicilio" && puedeSubir && !(admin && f) ? `<label>Fecha que aparece en el comprobante${admin ? " (opcional)" : ""}<input type="date" data-fd="${k}" max="${today()}"></label>` : ""}
          <div class="item-bot">
            ${puedeSubir ? `<label class="btn sm" style="cursor:pointer">${f && !na ? "Reemplazar" : admin ? "Agregar foto o PDF" : "Subir foto o PDF"}<input type="file" accept="image/*,application/pdf" data-up="${k}" hidden></label>` : ""}
            ${f && !na ? `<button class="btn sm" type="button" data-see="${k}">Ver en grande</button>` : ""}
            ${admin && f && !na && f.estado !== "aprobado" ? `<button class="btn sm primary" type="button" data-ap="${k}">Aprobar</button>` : ""}
            ${admin && f && !na ? `<button class="link" type="button" data-dec="${k}">${OPENF === k ? "Cerrar" : "Aprobar con nota o rechazar"}</button>` : ""}
            ${admin && !f ? `<button class="link" type="button" data-na="${k}">No aplica</button>` : ""}
            ${admin && f ? `<button class="link del" type="button" data-rm="${k}">${na ? "Quitar \"no aplica\"" : "Borrar"}</button>` : ""}
          </div>
          ${admin && OPENF === k ? `<form class="edit" data-decf="${k}" novalidate style="margin-top:6px"><label>Nota o motivo (lo verá el cliente)<input name="nota" value="${esc(f.nota || "")}" placeholder="${k === "domicilio" ? "Ej. Aceptado aunque tiene 4 meses / No es a su nombre" : "Ej. Se ve borroso, súbelo otra vez"}"></label>
            <div class="actions"><button class="btn sm primary" type="submit" data-d="aprobado">Aprobar con esta nota</button><button class="btn sm danger" type="submit" data-d="rechazado">Rechazar y pedir otro</button></div></form>` : ""}
          <p class="err" data-er="${k}" hidden></p>
        </div>`;
      }).join("")}</div></div>`;
    box.querySelectorAll("[data-up]").forEach((inp) => inp.addEventListener("change", async () => {
      const k = inp.dataset.up, file = inp.files[0], er = box.querySelector(`[data-er="${k}"]`); if (!file) return;
      const fd = box.querySelector(`[data-fd="${k}"]`)?.value || "";
      if (k === "domicilio" && !fd && !admin) { er.hidden = false; er.textContent = "Escribe primero la fecha que aparece en el comprobante."; inp.value = ""; return; }
      er.hidden = false; er.className = "ok"; er.textContent = viejo(fd) ? "Tu comprobante tiene más de 3 meses. Lo subimos y lo revisamos; si hace falta te pediremos uno más reciente. Subiendo…" : "Subiendo…";
      try {
        const { data, mime } = await fileToData(file);
        await setDoc(doc(db, "expedientes", uid, "archivos", k), { data, mime, nombre: file.name || k, fecha: new Date().toISOString(), fechaDoc: fd, estado: admin ? "aprobado" : "pendiente", nota: "", por: ME.uid });
        await updateDoc(doc(db, "usuarios", uid), { ["docs." + k]: admin ? "aprobado" : "pendiente" }).catch(() => {});
      } catch (e) { er.className = "err"; er.textContent = e.message || "No se pudo subir. Intenta de nuevo."; }
    }));
    box.querySelectorAll("[data-see]").forEach((b) => (b.onclick = () => verDoc(FILES[b.dataset.see], DOCS[b.dataset.see])));
    const setEst = (k, estado, nota) => Promise.all([updateDoc(doc(db, "expedientes", uid, "archivos", k), { estado, nota }), updateDoc(doc(db, "usuarios", uid), { ["docs." + k]: estado }).catch(() => {})]);
    const avisaDoc = (k, ok, nota) => {
      if (!admin) return; const u = USERS.find((x) => x.uid === uid) || opts.who || {};
      notice(u.nombre || "", u.telefono, ok ? `Hola ${u.nombre || ""}, ya revisamos tu ${DOCS[k]} y quedó aprobado.${nota ? " " + nota + "." : ""} Gracias.\n\nEntre Amigos` : `Hola ${u.nombre || ""}, revisamos tu ${DOCS[k]} y necesitamos que lo subas de nuevo.${nota ? "\nMotivo: " + nota : ""}\n\nPuedes hacerlo aquí:\n${PORTAL()}\n\nEntre Amigos`, ok ? "Documento aprobado" : "Documento rechazado", u.email);
    };
    box.querySelectorAll("[data-ap]").forEach((b) => (b.onclick = () => setEst(b.dataset.ap, "aprobado", "").then(() => avisaDoc(b.dataset.ap, true, ""))));
    box.querySelectorAll("[data-dec]").forEach((b) => (b.onclick = () => { OPENF = OPENF === b.dataset.dec ? "" : b.dataset.dec; render(); }));
    box.querySelectorAll("form[data-decf]").forEach((f) => f.querySelectorAll("button[data-d]").forEach((btn) => (btn.onclick = (e) => {
      e.preventDefault(); const k = f.dataset.decf, nota = f.querySelector("[name=nota]").value.trim(), d = btn.dataset.d;
      if (d === "rechazado" && !nota) { f.querySelector("[name=nota]").focus(); f.querySelector("[name=nota]").placeholder = "Escribe el motivo para que el cliente sepa qué corregir"; return; }
      OPENF = ""; setEst(k, d, nota).then(() => avisaDoc(k, d === "aprobado", nota));
    })));
    box.querySelectorAll("[data-na]").forEach((b) => (b.onclick = async () => {
      const k = b.dataset.na;
      await setDoc(doc(db, "expedientes", uid, "archivos", k), { estado: "noaplica", nota: "", fecha: new Date().toISOString(), por: ME.uid });
      await updateDoc(doc(db, "usuarios", uid), { ["docs." + k]: "noaplica" }).catch(() => {});
    }));
    box.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => {
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Toca otra vez para borrarlo"; return; }
      const k = b.dataset.rm;
      await deleteDoc(doc(db, "expedientes", uid, "archivos", k));
      await updateDoc(doc(db, "usuarios", uid), { ["docs." + k]: deleteField() }).catch(() => {});
    }));
  };
  docsUnsub = onSnapshot(collection(db, "expedientes", uid, "archivos"), (snap) => { FILES = {}; snap.docs.forEach((d) => (FILES[d.id] = d.data())); render(); }, () => { box.innerHTML = ""; });
  render();
}
// Visor a pantalla completa (se puede hacer zoom con los dedos).
function verDoc(f, titulo) {
  if (!f || !f.data) return;
  const ov = document.createElement("div"); ov.className = "viewer";
  ov.innerHTML = `<div class="vbar"><b>${esc(titulo || "Documento")}</b><span>${f.mime === "application/pdf" ? `<a class="btn sm" href="${blobUrl(f.data)}" target="_blank" rel="noopener">Abrir PDF</a> ` : ""}<button class="btn sm primary" type="button">Cerrar</button></span></div>
    <div class="vbody">${f.mime === "application/pdf" ? `<iframe src="${blobUrl(f.data)}" title="${esc(titulo || "")}"></iframe>` : `<img src="${f.data}" alt="${esc(titulo || "")}">`}</div>`;
  ov.querySelector("button").onclick = () => ov.remove();
  document.body.appendChild(ov);
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
      const ef = a.pagado + (a.credito || 0), pagada = a.liquidado || ef + 0.5 >= acum;
      const debe = pagada ? 0 : Math.round(Math.min(f.pago, acum - ef) * 100) / 100;
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
// Tareas de un día, como en un calendario: cobrar, recordar, dar seguimiento, responder.
const nom1 = (n) => String(n || "").trim().split(/\s+/)[0];
function tareasDia(k, all, rcv) {
  const hoy = today(), T = [];
  const man = iso(new Date(new Date(k + "T12:00:00").getTime() + 864e5));
  all.filter((c) => c.fecha === k).forEach((c) => T.push(c.pagada ? { t: "pago", cls: "paid", txt: "Pagó " + c.p.cliente, c }
    : { t: "cobrar", cls: k < hoy ? "late" : "due", txt: "Cobrar a " + c.p.cliente + " " + mxn(c.debe), c }));
  if (k >= hoy) all.filter((c) => c.fecha === man && !c.pagada).forEach((c) => T.push({ t: "msg", cls: "msg", txt: "Recordar a " + c.p.cliente + " que paga mañana", c }));
  if (k === hoy) all.filter((c) => c.atrasada).forEach((c) => T.push({ t: "seg", cls: "late", txt: "Seguimiento: " + c.p.cliente + " (atrasado " + mxn(c.debe) + ")", c }));
  (rcv[k] || []).forEach((r) => { if (!T.some((x) => x.t === "pago" && x.c.p.id === r.p.id)) T.push({ t: "entro", cls: "paid", txt: "Entró " + mxn(r.monto) + " de " + r.p.cliente, r }); });
  if (k === hoy) {
    const dias = (f) => Math.max(0, Math.round((new Date(hoy + "T12:00:00") - new Date(String(f).slice(0, 10) + "T12:00:00")) / 864e5));
    const hace = (d) => (d === 0 ? "llegó hoy" : d === 1 ? "lleva 1 día" : "lleva " + d + " días");
    if (isAdmin()) SOLS.filter((x) => x.estado === "nueva").forEach((x) => { const d = dias(x.fecha); T.push({ t: "sol", cls: d >= 2 ? "late" : "msg", txt: `Revisar solicitud de ${x.nombre}: ${mxn(x.monto)} a ${x.plazo} ${x.unidad === "semanas" ? "semanas" : "meses"} (${hace(d)})`, x }); });
    if (isAdmin()) VENTAS.filter((v) => v.estado === "nueva").forEach((v) => { const d = dias(v.fecha); T.push({ t: "venta", cls: d >= 2 ? "late" : "msg", txt: `Revisar auto ofrecido: ${v.marca} ${v.modelo} ${v.anio} de ${v.nombre} (${hace(d)})`, v }); });
    if (isAdmin()) { try { Object.values(estadoPersonas()).forEach((e) => e.pend.filter((o) => o.limite <= iso(new Date(new Date(hoy + "T12:00:00").getTime() + 2 * 864e5))).forEach((o) => T.push({ t: "inv", cls: o.vencida ? "late" : "msg", txt: `Pagar a ${e.ver || e.nombre} ${mxn2(o.falta)} (${o.p ? o.p.cliente : "su inversión"}, ${o.vencida ? "fuera de plazo" : "a más tardar el " + fcorta(new Date(o.limite + "T12:00:00"))})` }))); } catch (er) {} }
    COTS.filter((c) => c.estado === "cotizado" && !c.aceptadoPor && c.tipo !== "auto" && dias(c.fecha) >= 3 && dias(c.fecha) <= 30 && !PRES.some((p) => p.cotId === c.id))
      .forEach((c) => T.push({ t: "segcot", cls: "msg", txt: `Dar seguimiento: ${c.cliente || "cliente"} no ha confirmado su cotización de ${mxn(c.monto)} (${hace(dias(c.fecha))})`, c2: c }));
  }
  return T;
}
function tareaRow(x) {
  const wa = x.c && x.c.p.telefono ? waTo(x.c.p.telefono, x.t === "msg" ? `Hola ${x.c.p.cliente}, te recordamos que mañana ${fcorta(new Date(x.c.fecha + "T12:00:00"))} toca tu pago ${x.c.p.tipo === "interes" ? "de interés" : x.c.n + " de " + x.c.total} por ${mxn2(x.c.debe)}.\n\nCuando pagues, mándanos tu comprobante por este medio.\n\nEntre Amigos` : recMsg(x.c)) : "";
  const wa2 = x.t === "segcot" && x.c2.telefono ? waTo(x.c2.telefono, `Hola ${x.c2.cliente || ""}, ¿pudiste revisar la cotización de tu préstamo por ${mxn(x.c2.monto)}? Si tienes dudas o quieres ajustar el monto o el plazo, con gusto te ayudo.\n\nPara confirmarla entra aquí:\n${PORTAL()}?c=${x.c2.id}\n\nEntre Amigos`) : "";
  return `<div class="task ${x.cls}"><span>${esc(x.txt)}</span>${x.t !== "pago" && x.t !== "entro" && wa ? `<a class="btn sm" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${wa2 ? `<a class="btn sm" href="${wa2}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${x.t === "sol" ? `<button class="btn sm" type="button" data-solcot="${x.x.id}">Revisar y cotizar</button>` : ""}${x.t === "venta" ? `<button class="btn sm" type="button" data-goventa="${x.v.id}">Ver fotos</button>` : ""}${x.t === "inv" ? `<button class="btn sm" type="button" data-goinv>Ir a Inversionistas</button>` : ""}</div>`;
}
/* ---------- Pantalla principal: avisos arriba y secciones que se abren o se minimizan ---------- */
// Al abrir la app todo empieza cerrado (menos el calendario, que siempre se ve); lo que abras se queda abierto mientras la usas.
let FOLD = {};
const saveFold = () => {};
const FOLD_KEYS = [["Solicitudes", "sol"], ["Hoy", "hoy"], ["Tareas", "tareas"], ["Atrasados", "atr"], ["Pagos de hoy", "phoy"], ["Próximos", "prox"], ["Visitas", "vis"], ["Pagos recibidos", "rec"]];
const FOLD_CORTO = { sol: "Solicitudes", hoy: "Resumen de hoy", tareas: "Tareas de hoy", atr: "Atrasados", phoy: "Cobros de hoy", prox: "Próximos 7 días", vis: "Visitas", cal: "Calendario", rec: "Recibido del mes" };
function plegarPanel(res) {
  $("panel").querySelectorAll(":scope > .card").forEach((card) => {
    const h = card.querySelector("h2"); if (!h) return;
    const t = h.textContent.trim(), key = (FOLD_KEYS.find(([pre]) => t.startsWith(pre)) || [])[1]; if (!key) return;
    const d = document.createElement("details"); d.className = card.className + " fold"; d.id = "f-" + key; d.open = !!FOLD[key];
    const sm = document.createElement("summary"); sm.innerHTML = `<span class="ft">${esc(t)}</span><span class="fs">${FOLD_CORTO[key]}</span>${res[key] !== "" && res[key] !== undefined ? `<span class="fr">${res[key]}</span>` : ""}`;
    h.remove(); d.appendChild(sm); while (card.firstChild) d.appendChild(card.firstChild); card.replaceWith(d);
    d.addEventListener("toggle", () => { FOLD[key] = d.open; saveFold(); });
  });
  const F = [...$("panel").querySelectorAll(":scope > details.fold")];
  if (F.length) { const g = document.createElement("div"); g.className = "foldgrid"; F[0].before(g); F.forEach((d) => g.appendChild(d)); }
}
function avisosCard(A) {
  const L = A.filter((a) => a.n);
  return `<div class="card avisos"><h3>Avisos</h3>${L.length ? `<div class="avl">${L.map((a) => `<button type="button" class="aviso ${a.cls || ""}" data-ir="${a.ir}"><b>${a.big}</b><span>${a.txt}</span></button>`).join("")}</div>` : `<p class="muted">Todo al día. No hay nada pendiente por revisar.</p>`}</div>`;
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
  // Pagos a inversionistas por día: pagado, pendiente o atrasado (se queda atrasado hasta que marques "Ya le pagué").
  const INVD = {};
  if (isAdmin()) { try { Object.values(estadoPersonas()).forEach((e) => [...e.obl, ...e.futuro].forEach((o) => {
    const falta = o.falta ?? o.monto, est = falta <= 0.5 ? "paid" : o.fecha < hoy ? "late" : "due";
    (INVD[o.fecha] = INVD[o.fecha] || []).push({ e, o, falta, est });
  })); } catch (er) {} }
  const rcv = {}; LED.forEach((r) => (rcv[r.fecha] = rcv[r.fecha] || []).push(r));
  const delMes = LED.filter((r) => r.fecha.startsWith(mes)).sort((a, b) => (a.fecha === b.fecha ? ((a.reg || "") < (b.reg || "") ? 1 : -1) : a.fecha < b.fecha ? 1 : -1));
  let cells = ""; for (let i = 0; i < off; i++) cells += `<span></span>`;
  for (let d = 1; d <= days; d++) {
    const k = iso(new Date(y, m, d)), l = byDay[k] || [];
    const iv = INVD[k] || [];
    const cls = !l.length && !iv.length ? "" : l.some((c) => c.atrasada) || iv.some((z) => z.est === "late") ? "late" : l.every((c) => c.pagada) && iv.every((z) => z.est === "paid") ? "paid" : "due";
    const T = tareasDia(k, all, rcv).filter((x) => x.t === "cobrar" || x.t === "pago" || x.t === "entro");
    (INVD[k] || []).forEach((z) => T.push({ t: "invd", cls: z.est, txt: "Pagar " + (apodoDe(z.e.k) || nom1(z.e.nombre)), z }));
    if (k === hoy) { const ns = tareasDia(k, all, rcv).filter((x) => x.t === "sol" || x.t === "segcot" || x.t === "venta" || x.t === "inv").length; if (ns) T.unshift({ t: "solchip", cls: "msg", n: ns }); }
    cells += `<button type="button" class="day ${cls}${rcv[k] ? " rcv" : ""}${k === hoy ? " today" : ""}${k === AG_DAY ? " sel" : ""}" data-day="${k}"><span class="dn">${d}</span>${T.slice(0, 3).map((x) => `<em class="${x.cls}">${esc(x.t === "solchip" ? x.n + (x.n === 1 ? " pendiente" : " pendientes") : x.t === "entro" ? nom1(x.r.p.cliente) : x.t === "invd" ? "→ " + (apodoDe(x.z.e.k) || nom1(x.z.e.nombre)) : nom1(x.c.p.cliente))}</em>`).join("")}${T.length > 3 ? `<em class="more">+${T.length - 3} más</em>` : ""}${isAdmin() && VIS[k] && VIS[k].personas ? `<em class="vis" title="Personas que entraron a la página">${VIS[k].personas}</em>` : ""}</button>`;
  }
  const sel = AG_DAY ? all.filter((c) => c.fecha === AG_DAY) : [];
  const nSol = isAdmin() ? SOLS.filter((x) => x.estado === "nueva").length : 0, visHoy = isAdmin() ? (VIS[hoy] || {}).personas || 0 : 0;
  let invHoy = [], invSol = 0;
  if (isAdmin()) { try { invHoy = Object.values(estadoPersonas()).flatMap((e) => e.pend.filter((o) => o.fecha <= hoy).map((o) => ({ e, o }))); } catch (er) {} invSol = SOLINV.filter((x) => x.estado === "pendiente").length; }
  const nAvis = isAdmin() ? Object.values(AVIS).reduce((s2, n) => s2 + n, 0) : 0, nVen = isAdmin() ? VENTAS.filter((v) => v.estado === "nueva").length : 0;
  const porHoy = deHoy.filter((c) => !c.pagada);
  const avisos = avisosCard([
    { n: nSol, big: nSol, txt: nSol === 1 ? "Solicitud de préstamo por revisar" : "Solicitudes de préstamo por revisar", ir: "sol", cls: "warn" },
    { n: atr.length, big: mxn(sum(atr, "debe")), txt: `${atr.length} ${atr.length === 1 ? "cliente atrasado" : "clientes atrasados"}`, ir: "atr", cls: "warn" },
    { n: nAvis, big: nAvis, txt: nAvis === 1 ? "Cliente avisa que pagó" : "Clientes avisan que pagaron", ir: "tab:prestamos", cls: "warn" },
    { n: invHoy.length, big: mxn(invHoy.reduce((s2, z) => s2 + z.o.falta, 0)), txt: "Pagar a " + [...new Set(invHoy.map((z) => esc(apodoDe(z.e.k) || nom1(z.e.nombre))))].join(", "), ir: "tab:cuentas", cls: invHoy.some((z) => z.o.fecha < hoy) ? "warn" : "" },
    { n: invSol, big: invSol, txt: invSol === 1 ? "Inversionista te avisa que prestó" : "Inversionistas te avisan que prestaron", ir: "tab:cuentas" },
    { n: porHoy.length, big: mxn(sum(porHoy, "debe")), txt: `${porHoy.length} por cobrar hoy`, ir: "phoy" },
    { n: nVen, big: nVen, txt: nVen === 1 ? "Auto ofrecido por revisar" : "Autos ofrecidos por revisar", ir: "tab:autos" },
    { n: prox.length, big: prox.length, txt: "Pagos en los próximos 7 días", ir: "prox" },
    { n: visHoy, big: visHoy, txt: visHoy === 1 ? "Persona entró hoy a tu página" : "Personas entraron hoy a tu página", ir: "vis" },
  ]);
  const tHoy = tareasDia(hoy, all, rcv).length;
  const res = { sol: String(nSol), hoy: fcorta(new Date()).replace(/ \d{4}$/, ""), tareas: String(tHoy), atr: mxn(sum(atr, "debe")), phoy: mxn(sum(porHoy, "debe")), prox: String(prox.length), vis: isAdmin() ? String(visHoy) : "", cal: first.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""), rec: mxn(sum(delMes, "monto")) };
  $("panel").innerHTML = avisos + (isAdmin() ? solicitudesCard(3) : "") + `
  <div class="card">
    <div class="head"><h2>Hoy · ${fcorta(new Date())}</h2>${ownerFilter(vAgenda)}</div>
    ${legend()}
    <div class="stats"><span class="stat"><b>${atr.length}</b> atrasados · <b>${mxn(sum(atr, "debe"))}</b></span><span class="stat"><b>${deHoy.filter((c) => !c.pagada).length}</b> por cobrar hoy</span><span class="stat"><b>${deHoy.filter((c) => c.pagada).length}</b> ya pagaron hoy</span><span class="stat"><b>${prox.length}</b> en los próximos 7 días</span></div>
  </div>
  ${(() => { const T = tareasDia(hoy, all, rcv); return T.length ? `<div class="card"><h2>Tareas de hoy</h2><div class="tasks">${T.map(tareaRow).join("")}</div></div>` : ""; })()}
  ${atr.length ? `<div class="card"><h2>Atrasados</h2><div class="list">${atr.map((c) => cuotaRow(c, true)).join("")}</div></div>` : ""}
  <div class="card"><h2>Pagos de hoy</h2><div class="list">${deHoy.length ? deHoy.map((c) => cuotaRow(c, false)).join("") : `<p class="muted">No hay pagos programados para hoy.</p>`}</div></div>
  <div class="card"><h2>Próximos 7 días</h2><div class="list">${prox.length ? prox.map((c) => cuotaRow(c, true)).join("") : `<p class="muted">Sin pagos en los próximos 7 días.</p>`}</div></div>
  ${visitasCard()}
  <div class="card">
    <div class="head"><h2>Calendario</h2><div class="actions"><button class="btn sm" type="button" id="m-prev" aria-label="Mes anterior">‹</button><b style="align-self:center;min-width:120px;text-align:center">${first.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}</b><button class="btn sm" type="button" id="m-next" aria-label="Mes siguiente">›</button></div></div>
    <div class="cal"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>${cells}</div>
    <p class="note"><span class="dot due"></span> Por cobrar <span class="dot late"></span> Atrasado <span class="dot paid"></span> Todo pagado <span class="dot rcv"></span> Entró dinero ese día${isAdmin() ? " · → Pago a inversionista" : ""}${isAdmin() ? ` <small class="vis">12</small> Personas que entraron a la página` : ""}</p>
    ${AG_DAY ? `<h3>${fcorta(new Date(AG_DAY + "T12:00:00"))}</h3>
      ${(() => { const T = tareasDia(AG_DAY, all, rcv); return T.length ? `<p class="lbl">Tareas del día</p><div class="tasks">${T.map(tareaRow).join("")}</div>` : ""; })()}
      ${(INVD[AG_DAY] || []).length ? `<p class="lbl">Pagos a inversionistas</p><div class="list">${INVD[AG_DAY].map((z) => `<div class="item"><div class="item-top"><b>${esc(z.e.ver || z.e.nombre)} · ${mxn2(z.o.monto)}</b>${z.est === "paid" ? `<span class="pill ok">Pagado</span>` : z.est === "late" ? `<span class="pill warn">Pendiente, ya pasó</span>` : `<span class="pill">Por pagar</span>`}</div><div class="item-mid">${esc(z.o.concepto)}${z.falta > 0.5 && z.falta < z.o.monto - 0.5 ? " · falta " + mxn2(z.falta) : ""}</div>${z.est !== "paid" ? `<div class="actions"><button class="btn sm primary" type="button" data-goinv>Registrar pago</button></div>` : ""}</div>`).join("")}</div>` : ""}
      ${sel.length ? `<p class="lbl">Pagos que tocaban ese día</p><div class="list">${sel.map((c) => cuotaRow(c, false)).join("")}</div>` : ""}
      ${(rcv[AG_DAY] || []).length ? `<p class="lbl">Pagos recibidos ese día</p><div class="list">${rcv[AG_DAY].map(pagoRow).join("")}</div>` : ""}
      ${!sel.length && !(rcv[AG_DAY] || []).length ? `<p class="muted">Sin movimientos ese día.</p>` : ""}
      ${isAdmin() ? `<p class="lbl">Visitas a la página</p>${visDia(AG_DAY)}` : ""}` : `<p class="muted">Toca un día para ver qué pagos tocaban y cuáles se recibieron.</p>`}
  </div>
  <div class="card"><div class="head"><h2>Pagos recibidos en ${first.toLocaleDateString("es-MX", { month: "long" })}</h2></div>
    <div class="stats"><span class="stat">Total <b>${mxn2(sum(delMes, "monto"))}</b></span><span class="stat">Capital <b>${mxn2(sum(delMes, "capital"))}</b></span><span class="stat">Interés <b>${mxn2(sum(delMes, "interes"))}</b></span><span class="stat"><b>${delMes.filter((r) => r.tarde > 0).length}</b> pagaron tarde</span></div>
    <div class="list">${delMes.length ? delMes.map(pagoRow).join("") : `<p class="muted">Sin pagos registrados este mes.</p>`}</div></div>`;
  plegarPanel(res);
  $("panel").querySelectorAll("[data-ir]").forEach((b) => (b.onclick = () => {
    const k = b.dataset.ir; if (k.startsWith("tab:")) return go(k.slice(4));
    const d = $("f-" + k); if (!d) return; d.open = true; FOLD[k] = true; saveFold(); d.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const find = (key) => { const [id, n] = key.split(":"); return all.find((c) => c.p.id === id && c.n === Number(n)); };
  const pay = (c, m) => updateDoc(doc(db, "prestamos", c.p.id), { pagos: arrayUnion({ monto: m, fecha: today(), reg: new Date().toISOString(), regPor: ME.uid }) });
  $("panel").querySelectorAll("[data-pago]").forEach((b) => (b.onclick = () => { b.disabled = true; pay(find(b.dataset.pago), find(b.dataset.pago).debe); }));
  $("panel").querySelectorAll("[data-otro]").forEach((b) => (b.onclick = () => { const f = $("panel").querySelector(`[data-otrof="${b.dataset.otro}"]`); f.hidden = !f.hidden; }));
  $("panel").querySelectorAll("form[data-otrof]").forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); const m = num(f.querySelector("[name=m]").value); if (m) pay(find(f.dataset.otrof), m); }));
  $("panel").querySelectorAll("[data-nopago]").forEach((b) => (b.onclick = () => { const c = find(b.dataset.nopago); updateDoc(doc(db, "prestamos", c.p.id), { ["noPago." + c.n]: today() }); }));
  $("panel").querySelectorAll("[data-day]").forEach((b) => (b.onclick = () => { AG_DAY = AG_DAY === b.dataset.day ? "" : b.dataset.day; vAgenda(); }));
  $("m-prev").onclick = () => { AG_MONTH = new Date(y, m - 1, 1); AG_DAY = ""; vAgenda(); };
  $("m-next").onclick = () => { AG_MONTH = new Date(y, m + 1, 1); AG_DAY = ""; vAgenda(); };
  bindSolicitudes(vAgenda);
  $("panel").querySelectorAll("[data-goventa]").forEach((b) => (b.onclick = () => { VOPEN = b.dataset.goventa; go("autos"); }));
  $("panel").querySelectorAll("[data-goinv]").forEach((b) => (b.onclick = () => go("cuentas")));

}
