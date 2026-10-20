import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, onSnapshot, arrayUnion,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { num, mxn, mxn2, GARANTIAS, GN, corridaMensual, corridaSemanal, factorGarantia, fechaPago, fcorta, avance } from "./calc.js?v=1";

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
  $("b-login").textContent = v ? "Crear cuenta" : "Entrar";
  $("l-q").textContent = v ? "¿Ya tienes cuenta?" : "¿Primera vez?";
  $("b-swap").textContent = v ? "Entra aquí" : "Crea tu cuenta";
  $("l-pass").autocomplete = v ? "new-password" : "current-password";
  $("l-err").hidden = true;
}
$("b-swap").onclick = () => setSignup(!signup);
if (new URLSearchParams(location.search).has("nueva")) setSignup(true);

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
      const c = await createUserWithEmailAndPassword(auth, mail, pass);
      await updateProfile(c.user, { displayName: nom });
      await ensureUser(c.user, nom);
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
let ME = null, USER = null, unsubs = [];
const isAdmin = () => !!ME && ADMINS.includes((ME.email || "").toLowerCase());
const isTeam = () => isAdmin() || USER?.rol === "equipo";

async function ensureUser(u, nombre) {
  const ref = doc(db, "usuarios", u.uid);
  const s = await getDoc(ref);
  if (s.exists()) return s.data();
  const d = { nombre: nombre || u.displayName || (u.email || "").split("@")[0], email: (u.email || "").toLowerCase(), rol: ADMINS.includes((u.email || "").toLowerCase()) ? "admin" : "pendiente", telefono: "", creado: new Date().toISOString() };
  await setDoc(ref, d);
  return d;
}

onAuthStateChanged(auth, async (u) => {
  unsubs.forEach((f) => f()); unsubs = [];
  ME = u; USER = null;
  $("b-out").hidden = !u;
  if (!u) { $("who").textContent = "Préstamos y cotizaciones"; show("v-login"); return; }
  show("v-load");
  try { USER = await ensureUser(u); } catch (e) { USER = { rol: "pendiente", nombre: u.displayName || "" }; }
  $("who").textContent = (USER.nombre || u.email) + (isAdmin() ? " · Administrador" : "");
  if (!isAdmin() && !["equipo", "cliente"].includes(USER.rol)) {
    $("p-nom").textContent = USER.nombre || "";
    $("p-wa").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Hola, ya creé mi cuenta en Entre Amigos con el correo " + (u.email || "") + ". ¿Me la pueden activar?");
    show("v-pend");
    // Si el administrador activa la cuenta, entra solo.
    unsubs.push(onSnapshot(doc(db, "usuarios", u.uid), (s) => { const r = s.data()?.rol; if (["equipo", "cliente"].includes(r)) location.reload(); }));
    return;
  }
  startApp();
});

/* ---------------- App ---------------- */
let TAB = "";
const TABS = () => isAdmin()
  ? [["cotizar", "Cotizar"], ["cotizaciones", "Cotizaciones"], ["prestamos", "Préstamos"], ["personas", "Personas"], ["tasas", "Tasas"]]
  : isTeam() ? [["cotizar", "Cotizar"], ["cotizaciones", "Mis cotizaciones"]]
  : [["mis", "Mis préstamos"]];

let CFG = {}, COTS = [], PRES = [], USERS = [];
function startApp() {
  show("v-app");
  if (isTeam()) unsubs.push(onSnapshot(doc(db, "config", "tasas"), (s) => { CFG = s.data() || {}; if (TAB === "cotizar" && !touched) applyCfg(); if (TAB === "tasas") draw(); }, () => {}));
  const qc = isAdmin() ? collection(db, "cotizaciones") : isTeam() ? query(collection(db, "cotizaciones"), where("por", "==", ME.uid)) : null;
  if (qc) unsubs.push(onSnapshot(qc, (s) => { COTS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); if (TAB === "cotizaciones") draw(); }, () => {}));
  const qp = isAdmin() ? collection(db, "prestamos") : USER.rol === "cliente" ? query(collection(db, "prestamos"), where("clienteUid", "==", ME.uid)) : null;
  if (qp) unsubs.push(onSnapshot(qp, (s) => { PRES = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.creado < b.creado ? 1 : -1)); if (TAB === "prestamos" || TAB === "mis") draw(); }, () => {}));
  if (isAdmin()) unsubs.push(onSnapshot(collection(db, "usuarios"), (s) => { USERS = s.docs.map((d) => ({ uid: d.id, ...d.data() })); if (TAB === "personas" || TAB === "prestamos") draw(); drawTabs(); }, () => {}));
  go(TABS()[0][0]);
}
function drawTabs() {
  const pend = USERS.filter((u) => u.rol === "pendiente").length;
  $("tabs").innerHTML = TABS().map(([k, t]) => `<button type="button" role="tab" data-t="${k}" aria-selected="${k === TAB}">${t}${k === "personas" && pend ? " (" + pend + ")" : ""}</button>`).join("");
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-t]"); if (b) go(b.dataset.t); });
function go(t) { TAB = t; drawTabs(); draw(); window.scrollTo(0, 0); }
function draw() { const f = { cotizar: vCotizar, cotizaciones: vCotizaciones, prestamos: vPrestamos, personas: vPersonas, tasas: vTasas, mis: vMis }[TAB]; f && f(); }
const nameOf = (uid) => (uid === ME.uid ? "Yo" : USERS.find((u) => u.uid === uid)?.nombre || "Equipo");

/* ---------- Cotizar ---------- */
let MODE = "garantia", touched = false, LAST = null, lastKey = "";
function vCotizar() {
  touched = false;
  $("panel").innerHTML = `
  <div class="card">
    <div class="seg"><button type="button" data-m="garantia" aria-pressed="${MODE === "garantia"}">Con garantía</button><button type="button" data-m="semanal" aria-pressed="${MODE === "semanal"}">Semanal con aval</button></div>
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
  $("fq").addEventListener("change", (e) => { if (e.target.id === "q-gar" || e.target.id === "q-plazo") { if (e.target.id === "q-gar") { $("q-desc").placeholder = { auto: "Ej. Jetta 2019", reloj: "Ej. Rolex Submariner", oro: "Ej. Esclava 14k, 30 g", monedas: "Ej. 5 centenarios", otro: "Describe la prenda" }[e.target.value]; touched = false; applyCfg(); } } calc(); });
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
    if (val) { const ok = val >= req; cov.className = "cov " + (ok ? "ok" : "bad"); cov.textContent = ok ? `Garantía suficiente (${fx} a 1). Con este valor puedes prestar hasta ${mxn(Math.floor(val / fx))}.` : `Garantía insuficiente: para ${mxn(M)} a ${n} meses debe valer al menos ${mxn(req)} (${fx} a 1). Con este valor puedes prestar hasta ${mxn(Math.floor(val / fx))}.`; }
    else { cov.className = "cov"; cov.textContent = `Para ${mxn(M)} a ${n} meses, la garantía debe valer al menos ${mxn(req)} (${fx} a 1).`; }
    const cierre = g === "auto" ? "Puedes seguir usando tu auto; solo dejas la documentación endosada y una llave." : "Tu garantía queda bajo resguardo y se te devuelve al liquidar el préstamo.";
    const msg = `Hola${nom ? " " + nom : ""}, te comparto la cotización de tu préstamo con garantía de ${desc || GN[g]}:\n\nMonto: ${mxn(M)}\nPlazo: ${n} meses\nInterés: ${t}% mensual sobre saldo\nPago mensual: ${mxn2(c.pago)}\nTotal a pagar: ${mxn2(c.total)}\nGarantía requerida: con valor de al menos ${mxn(req)}\n\n${cierre} Si adelantas pagos, pagas menos interés.\n\nEntre Amigos`;
    r = { tipo: "garantia", garantia: g, desc, valor: val || null, monto: M, tasa: t, plazo: n, pago: c.pago, total: c.total, intereses: c.intereses, msg, lbl: "Pago mensual",
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
  LAST = r; $("r-err").hidden = true;
  $("r-lbl").textContent = r.lbl; $("r-pago").textContent = mxn2(r.pago); $("r-m").textContent = mxn(r.monto); $("r-i").textContent = mxn(r.intereses); $("r-t").textContent = mxn(r.total);
  $("r-tbl").innerHTML = r.tbl; $("r-msg").textContent = r.msg; $("b-wa").href = waTo(tel, r.msg);
  function err(m) { LAST = null; $("r-err").hidden = false; $("r-err").textContent = m; }
}
function saveCot() {
  if (!LAST) return;
  const { msg, tbl, lbl, ...d } = LAST;
  const key = JSON.stringify(d); if (key === lastKey) return; lastKey = key;
  addDoc(collection(db, "cotizaciones"), { ...d, por: ME.uid, fecha: new Date().toISOString(), estado: "cotizado" }).catch(() => (lastKey = ""));
}

/* ---------- Cotizaciones ---------- */
const EST = { cotizado: "Cotizado", aceptado: "Aceptado", descartado: "Descartado" };
let FILT = "";
function detCot(r) {
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
        <div class="item-bot">${isAdmin() ? `<select data-cot="${r.id}" aria-label="Estado">${Object.entries(EST).map(([k, v]) => `<option value="${k}"${k === est ? " selected" : ""}>${v}</option>`).join("")}</select><span>Cotizó: ${esc(nameOf(r.por))}</span><button class="link" type="button" data-mk="${r.id}">Crear préstamo</button>`
          : `<span class="pill${est === "aceptado" ? " ok" : est === "descartado" ? " no" : ""}">${EST[est]}</span>`}
        ${r.telefono ? `<a href="https://wa.me/52${esc(r.telefono)}" target="_blank" rel="noopener">${esc(r.telefono)}</a>` : ""}</div></div>`;
    }).join("") : `<p class="muted">Todavía no hay cotizaciones. Cuando envíes o copies una desde "Cotizar", aparece aquí.</p>`}</div></div>`;
  $("c-f") && ($("c-f").onchange = (e) => { FILT = e.target.value; vCotizaciones(); });
  $("panel").querySelectorAll("select[data-cot]").forEach((s) => (s.onchange = () => updateDoc(doc(db, "cotizaciones", s.dataset.cot), { estado: s.value })));
  $("panel").querySelectorAll("[data-mk]").forEach((b) => (b.onclick = () => { const c = COTS.find((x) => x.id === b.dataset.mk); DRAFT = c; go("prestamos"); }));
}

/* ---------- Préstamos (admin) ---------- */
let DRAFT = null, OPEN = "";
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
      <label for="p-uid">Cuenta del cliente (para que vea su avance)<select id="p-uid"><option value="">Todavía sin cuenta</option>${clientes.map((u) => `<option value="${u.uid}">${esc(u.nombre)} · ${esc(u.email)}</option>`).join("")}</select></label>
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
  DRAFT = null;
  $("panel").querySelectorAll("[data-pt]").forEach((b) => (b.onclick = () => {
    const t = b.dataset.pt; $("p-tipo").value = t;
    $("panel").querySelectorAll("[data-pt]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $("p-tasa-l").firstChild.textContent = t === "semanal" ? "Pago por cada $1,000" : "Interés mensual (%)";
    $("p-plazo-l").firstChild.textContent = t === "semanal" ? "Semanas" : "Meses";
    $("p-gar-row").hidden = t === "semanal";
  }));
  $("p-monto").addEventListener("input", (e) => { const v = e.target.value.replace(/\D/g, ""); e.target.value = v ? Number(v).toLocaleString("es-MX") : ""; });
  $("p-uid").addEventListener("change", (e) => { const u = USERS.find((x) => x.uid === e.target.value); if (u && !$("p-nom").value) $("p-nom").value = u.nombre; if (u?.telefono && !$("p-tel").value) $("p-tel").value = u.telefono; });
  $("fp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipo = $("p-tipo").value, monto = num($("p-monto").value), tasa = num($("p-tasa").value), plazo = parseInt($("p-plazo").value, 10) || 0;
    if (!$("p-nom").value.trim() || !monto || !tasa || !plazo) { $("p-err").hidden = false; $("p-err").textContent = "Completa cliente, monto, tasa y plazo."; return; }
    const p = { tipo, cliente: $("p-nom").value.trim(), telefono: tel10($("p-tel").value), clienteUid: $("p-uid").value || "", monto, tasa, plazo, inicio: $("p-ini").value,
      garantia: tipo === "semanal" ? "" : $("p-gar").value, desc: tipo === "semanal" ? "" : $("p-desc").value.trim(), pagos: [], creado: new Date().toISOString() };
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
  $("panel").querySelectorAll("select[data-link]").forEach((s) => (s.onchange = () => updateDoc(doc(db, "prestamos", s.dataset.link), { clienteUid: s.value })));
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
    <div class="item-bot"><button class="link" type="button" data-open="${p.id}">${open ? "Cerrar" : "Registrar pago y más"}</button>${p.telefono && rec ? `<a href="${waTo(p.telefono, rec)}" target="_blank" rel="noopener">Recordatorio por WhatsApp</a>` : ""}${p.clienteUid ? `<span class="pill ok">Con cuenta</span>` : ""}</div>
    ${open ? `<form data-pay="${p.id}" class="row" novalidate style="margin-top:8px">
        <label>Monto del pago<input name="m" inputmode="decimal" value="${a.siguiente ? a.siguiente.monto : ""}"></label>
        <label>Fecha<input name="f" type="date" value="${today()}"></label>
        <button class="btn primary" type="submit">Registrar pago</button>
        ${p.pagos?.length ? `<button class="btn" type="button" data-undo="${p.id}">Borrar último pago</button>` : ""}
      </form>
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
function vMis() {
  $("panel").innerHTML = PRES.length ? PRES.map((p) => {
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
  }).join("") : `<div class="card"><h2>Mis préstamos</h2><p class="muted">Aquí verás tu préstamo, en qué pago vas y cuánto te resta, en cuanto Entre Amigos lo registre.</p></div>`;
}

/* ---------- Personas (admin) ---------- */
const ROL = { pendiente: "Por activar", equipo: "Equipo (cotiza)", cliente: "Cliente", bloqueado: "Bloqueado" };
function vPersonas() {
  const order = { pendiente: 0, equipo: 1, cliente: 2, bloqueado: 3, admin: 4 };
  const list = USERS.filter((u) => u.rol !== "admin").sort((a, b) => (order[a.rol] ?? 9) - (order[b.rol] ?? 9) || (a.nombre || "").localeCompare(b.nombre || ""));
  const link = location.origin + location.pathname + "?nueva";
  $("panel").innerHTML = `<div class="card">
    <h2>Invitar</h2>
    <p class="muted">Manda este link a tu equipo o a tus clientes. Crean su cuenta y aquí los activas.</p>
    <pre id="inv">${esc(link)}</pre>
    <div class="actions"><a class="btn primary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("Crea tu cuenta de Entre Amigos aquí: " + link)}">Mandar por WhatsApp</a><button class="btn" type="button" id="b-inv">Copiar link</button></div>
    <p class="toast" id="inv-t"></p>
  </div>
  <div class="card"><h2>Personas</h2><div class="list">${list.length ? list.map((u) => `<div class="item">
    <div class="item-top"><b>${esc(u.nombre || "Sin nombre")}</b><span>${esc(u.email)}</span></div>
    <div class="item-bot"><select data-rol="${u.uid}" aria-label="Tipo de acceso">${Object.entries(ROL).map(([k, v]) => `<option value="${k}"${k === u.rol ? " selected" : ""}>${v}</option>`).join("")}</select>
    ${u.rol === "pendiente" ? `<span class="pill warn">Nuevo</span>` : ""}
    <input data-tel="${u.uid}" inputmode="tel" placeholder="WhatsApp" value="${esc(u.telefono || "")}" style="width:150px;font-size:14px;padding:6px 8px"></div></div>`).join("") : `<p class="muted">Todavía nadie ha creado cuenta. Manda el link de arriba.</p>`}</div>
    <p class="note">Equipo: puede cotizar y ver sus propias cotizaciones. Cliente: ve solo sus préstamos y su avance.</p></div>`;
  $("b-inv").onclick = () => navigator.clipboard?.writeText(link).then(() => ($("inv-t").textContent = "Link copiado."), () => {});
  $("panel").querySelectorAll("select[data-rol]").forEach((s) => (s.onchange = () => updateDoc(doc(db, "usuarios", s.dataset.rol), { rol: s.value })));
  $("panel").querySelectorAll("input[data-tel]").forEach((i) => i.addEventListener("change", () => updateDoc(doc(db, "usuarios", i.dataset.tel), { telefono: tel10(i.value) })));
}

/* ---------- Tasas (admin) ---------- */
function vTasas() {
  const t = CFG.tasas || {};
  $("panel").innerHTML = `<div class="card"><h2>Valores sugeridos</h2><p class="muted">Tu equipo los verá ya puestos al cotizar. Pueden ajustarlos en cada cotización.</p>
    <form id="ft" novalidate>
      <div class="row">${Object.entries(GARANTIAS).map(([k, v]) => `<label for="t-${k}">Interés mensual: ${v.toLowerCase()} (%)<input id="t-${k}" inputmode="decimal" value="${t[k] ?? ""}"></label>`).join("")}
      <label for="t-plazo">Plazo sugerido (meses)<input id="t-plazo" inputmode="numeric" value="${CFG.plazo ?? 12}"></label></div>
      <div class="row"><label for="t-fac">Semanal: pago por cada $1,000<input id="t-fac" inputmode="decimal" value="${CFG.fac ?? 100}"></label>
      <label for="t-sem">Semanal: número de semanas<input id="t-sem" inputmode="numeric" value="${CFG.sem ?? 14}"></label></div>
      <button class="btn primary" type="submit">Guardar</button><p class="toast" id="t-t"></p>
    </form></div>`;
  $("ft").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tasas = {}; Object.keys(GARANTIAS).forEach((k) => { const v = num($("t-" + k).value); if (v) tasas[k] = v; });
    try { await setDoc(doc(db, "config", "tasas"), { tasas, plazo: parseInt($("t-plazo").value, 10) || 12, fac: num($("t-fac").value) || 100, sem: parseInt($("t-sem").value, 10) || 14 }); $("t-t").textContent = "Guardado."; }
    catch (er) { $("t-t").textContent = "No se pudo guardar."; }
  });
}
