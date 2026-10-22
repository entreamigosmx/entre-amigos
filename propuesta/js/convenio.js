import { wa, WA_ICON } from "./comun.js?v=p2";
// Préstamo semanal por convenio: solo se llega con el enlace privado de cada empresa (?c=CODIGO).
const $ = (id) => document.getElementById(id);
$("fixwa") && ($("fixwa").innerHTML = WA_ICON);
const mxn = (n) => "$" + Math.round(n).toLocaleString("es-MX");
const mxn2 = (n) => "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COD = (new URLSearchParams(location.search).get("c") || "").trim();
const DEMO = { empresa: "demo", nombre: "Empresa de ejemplo", porMil: 125, plazos: [10, 12, 15], montoMin: 5000, montoMax: 10000 };
let CV = null, PL = 0, fb = null;
const FOTOS = {}, REQ = ["ine_f", "ine_r", "domicilio"];

function pinta() {
  $("c-emp").textContent = "Convenio " + CV.nombre;
  $("c-lead").textContent = `Préstamo para colaboradores de ${CV.nombre}, con pagos semanales fijos en efectivo por medio de tu empresa.`;
  const M = []; for (let m = CV.montoMin || 5000; m <= (CV.montoMax || 10000); m += 1000) M.push(m);
  $("c-monto").innerHTML = M.map((m) => `<option value="${m}">${mxn(m)}</option>`).join("");
  PL = PL || (CV.plazos || [12])[Math.floor(((CV.plazos || [12]).length - 1) / 2)];
  $("c-plazos").innerHTML = (CV.plazos || [12]).map((n) => `<button type="button" data-n="${n}" aria-pressed="${n === PL}">${n} semanas</button>`).join("");
  $("c-plazos").querySelectorAll("button").forEach((b) => (b.onclick = () => { PL = Number(b.dataset.n); pinta(); }));
  calc(); $("cf").hidden = false;
}
function calc() {
  const m = Number($("c-monto").value), pago = Math.round(((m / 1000) * CV.porMil) * 100) / 100;
  $("c-pago").textContent = mxn2(pago);
  $("c-det").textContent = `${PL} pagos de ${mxn2(pago)} · Total ${mxn2(pago * PL)}`;
}
$("c-monto").addEventListener("change", calc);

async function comprimir(file) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
  let q = 0.75, b; do { b = await new Promise((ok) => c.toBlob(ok, "image/jpeg", q)); q -= 0.12; } while (b.size > 600000 && q > 0.3);
  return b;
}
document.querySelectorAll(".slot[data-slot]").forEach((l) => {
  const inp = l.querySelector("input");
  inp.addEventListener("change", async () => {
    const f = inp.files[0]; if (!f) return; l.classList.add("busy");
    try { const b = await comprimir(f); FOTOS[l.dataset.slot] = b; l.querySelector(".ph").style.backgroundImage = `url(${URL.createObjectURL(b)})`; l.classList.add("done"); } catch (e) { err("No pudimos leer esa foto. Intenta con otra."); }
    l.classList.remove("busy"); inp.value = "";
  });
});
function err(t) { $("c-err").hidden = !t; $("c-err").textContent = t || ""; if (t) $("c-err").scrollIntoView({ block: "center", behavior: "smooth" }); }
const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });

$("cf").addEventListener("submit", async (e) => {
  e.preventDefault();
  const v = (id) => $(id).value.trim(), tel = v("c-tel").replace(/\D/g, "").slice(-10);
  if (v("c-nom").split(/\s+/).length < 2) return err("Escribe tu nombre completo, con nombre y apellidos.");
  if (tel.length < 10) return err("Escribe tu WhatsApp a 10 dígitos.");
  const faltan = REQ.filter((s) => !FOTOS[s]); if (faltan.length) return err("Faltan documentos: " + faltan.map((s) => document.querySelector(`[data-slot="${s}"] .sl`).textContent).join(", ") + ".");
  if (!$("c-ok").checked) return err("Marca la casilla para aceptar el uso de tus datos.");
  const monto = Number(v("c-monto")), pago = Math.round(((monto / 1000) * CV.porMil) * 100) / 100;
  const fin = () => {
    $("cf").hidden = true; const d = $("c-done"); d.hidden = false;
    const msg = `Hola, soy ${v("c-nom")}, de ${CV.nombre}. Ya mandé mi solicitud de préstamo por ${mxn(monto)} a ${PL} semanas.`;
    d.innerHTML = `<h2>Recibimos tu solicitud</h2><p class="muted">Revisamos tus datos con ${CV.nombre} y te avisamos por WhatsApp. Préstamo de ${mxn(monto)}: ${PL} pagos semanales de ${mxn2(pago)}.</p><a class="btn primary wa" href="${wa(msg)}" target="_blank" rel="noopener">${WA_ICON}Avisar por WhatsApp</a>`;
    d.scrollIntoView({ block: "start" });
  };
  if (CV.empresa === "demo") return fin();
  if (!fb) return err("No pudimos conectar. Revisa tu internet e intenta de nuevo.");
  err(""); $("c-send").disabled = true; $("c-prog").hidden = false;
  try {
    const { F, db } = fb;
    const docs = Object.entries(FOTOS);
    const ref = await F.addDoc(F.collection(db, "solicitudes"), { nombre: v("c-nom").slice(0, 80), telefono: tel, monto, plazo: PL, unidad: "semanas", garantia: "empresa", desc: v("c-puesto").slice(0, 100), fecha: new Date().toISOString(), origen: "convenio", estado: "nueva", empresa: CV.empresa, empresaNombre: CV.nombre, nDocs: docs.length });
    let n = 0;
    for (const [k, blob] of docs) { $("c-ptxt").textContent = `Subiendo documentos: ${n + 1} de ${docs.length}`; $("c-bar").style.width = Math.round((n / docs.length) * 100) + "%"; await F.setDoc(F.doc(db, "solicitudes", ref.id, "docs", k), { data: await b64(blob) }); n++; }
    fetch("https://ntfy.sh/entreamigos-avisos-7q4k9x2m", { method: "POST", body: `${v("c-nom")} (${CV.nombre}) pide ${mxn(monto)} a ${PL} semanas. Revísalo en la app.`, headers: { Title: "Solicitud por convenio", Click: "https://ventaentreamigos.com/cotiza/", Tags: "moneybag" } }).catch(() => {});
    fin();
  } catch (er) { $("c-send").disabled = false; $("c-prog").hidden = true; err("No se pudo enviar. Revisa tu internet e intenta de nuevo."); }
});

Promise.all([import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"), import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")]).then(async ([A, F]) => {
  const app = A.initializeApp({ apiKey: "AIzaSyDrp5lK7COul0RaI4nvN1vOx5sQ5tSJIW8", authDomain: "entre-amigos-financiera.firebaseapp.com", projectId: "entre-amigos-financiera", appId: "1:244817036834:web:7dd1a54f4825a318a2ac7b" });
  fb = { F, db: F.getFirestore(app) };
  if (COD === "demo") { CV = DEMO; return pinta(); }
  if (!/^[a-z0-9-]{6,60}$/.test(COD)) { $("c-bad").hidden = false; return; }
  const s = await F.getDoc(F.doc(fb.db, "convenios", COD));
  if (!s.exists() || s.data().activo === false) { $("c-bad").hidden = false; return; }
  CV = s.data(); pinta();
}).catch(() => { if (COD === "demo") { CV = DEMO; pinta(); } else $("c-bad").hidden = false; });
