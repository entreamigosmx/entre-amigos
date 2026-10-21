import { wa, WA_ICON } from "./comun.js?v=p1";

const $ = (id) => document.getElementById(id);
$("fixwa") && ($("fixwa").innerHTML = WA_ICON);
const num = (v) => Number(String(v || "").replace(/[^0-9]/g, "")) || 0;
const fmt = (e) => { const d = e.target.value.replace(/\D/g, ""); e.target.value = d ? Number(d).toLocaleString("es-MX") : ""; };
["v-km", "v-precio"].forEach((id) => $(id).addEventListener("input", fmt));

const FOTOS = {}; // slot -> Blob comprimido
const EXTRA = [];
const REQ = [...document.querySelectorAll(".slot[data-slot]:not(.opt)")].map((l) => l.dataset.slot);
const NOMBRE = {}; document.querySelectorAll(".slot[data-slot]").forEach((l) => (NOMBRE[l.dataset.slot] = l.querySelector(".sl").textContent));

// Reduce cada foto a 1280 px para que suba rápido aunque la señal sea lenta.
async function comprimir(file) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
  let q = 0.72, b;
  do { b = await new Promise((ok) => c.toBlob(ok, "image/jpeg", q)); q -= 0.12; } while (b.size > 600000 && q > 0.3);
  return b;
}
function contar() {
  const n = REQ.filter((s) => s !== "factura" && FOTOS[s]).length;
  $("v-cnt").textContent = `${n} de 10`; $("v-cnt").classList.toggle("ok", n >= 10);
}
document.querySelectorAll(".slot[data-slot]").forEach((l) => {
  const inp = l.querySelector("input");
  inp.addEventListener("change", async () => {
    const f = inp.files[0]; if (!f) return;
    l.classList.add("busy");
    try { const b = await comprimir(f); FOTOS[l.dataset.slot] = b; l.querySelector(".ph").style.backgroundImage = `url(${URL.createObjectURL(b)})`; l.classList.add("done"); }
    catch (e) { alert0("No pudimos leer esa foto. Intenta con otra."); }
    l.classList.remove("busy"); contar(); inp.value = "";
  });
});
$("v-extra").addEventListener("change", async (e) => {
  for (const f of [...e.target.files].slice(0, 10 - EXTRA.length)) {
    try { const b = await comprimir(f); EXTRA.push(b); $("v-extras").insertAdjacentHTML("beforeend", `<span class="ph" style="background-image:url(${URL.createObjectURL(b)})"></span>`); } catch (er) {}
  }
  e.target.value = "";
});
function alert0(t) { $("v-err").hidden = !t; $("v-err").textContent = t || ""; if (t) $("v-err").scrollIntoView({ block: "center", behavior: "smooth" }); }

let fb = null;
Promise.all([import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"), import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")]).then(([A, F]) => {
  const app = A.initializeApp({ apiKey: "AIzaSyDrp5lK7COul0RaI4nvN1vOx5sQ5tSJIW8", authDomain: "entre-amigos-financiera.firebaseapp.com", projectId: "entre-amigos-financiera", appId: "1:244817036834:web:7dd1a54f4825a318a2ac7b" });
  fb = { F, db: F.getFirestore(app) };
}).catch(() => {});
const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });

$("vf").addEventListener("submit", async (e) => {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  if (!v("v-marca") || !v("v-modelo") || !v("v-anio") || !v("v-km")) return alert0("Paso 1: escribe marca, modelo, año y kilometraje.");
  const faltan = REQ.filter((s) => !FOTOS[s]);
  if (faltan.length) return alert0("Faltan fotos: " + faltan.map((s) => NOMBRE[s]).join(", ") + ".");
  if (!v("v-nom") || num(v("v-tel")) < 1000000000) return alert0("Paso 4: escribe tu nombre completo y tu WhatsApp a 10 dígitos.");
  if (v("v-nom").split(/\s+/).length < 2) return alert0("Paso 4: escribe tu nombre completo, con nombre y apellidos.");
  if (!$("v-ok").checked) return alert0("Marca la casilla para aceptar el uso de tus datos.");
  if (!fb) return alert0("No pudimos conectar. Revisa tu internet e intenta de nuevo.");
  alert0("");
  const btn = $("v-send"); btn.disabled = true; $("v-prog").hidden = false;
  const lista = [...Object.entries(FOTOS), ...EXTRA.map((b, i) => ["extra" + (i + 1), b])];
  const tel = String(num(v("v-tel"))).slice(-10);
  const auto = `${v("v-marca")} ${v("v-modelo")} ${v("v-anio")}`;
  try {
    const { F, db } = fb;
    const ref = await F.addDoc(F.collection(db, "ventas"), { marca: v("v-marca").slice(0, 40), modelo: v("v-modelo").slice(0, 60), anio: num(v("v-anio")), km: num(v("v-km")), precio: num(v("v-precio")), como: $("v-como").value, nombre: v("v-nom").slice(0, 80), telefono: tel, nFotos: lista.length, fecha: new Date().toISOString(), estado: "nueva" });
    let n = 0;
    for (const [slot, blob] of lista) {
      $("v-ptxt").textContent = `Subiendo fotos: ${n + 1} de ${lista.length}`; $("v-bar").style.width = Math.round((n / lista.length) * 100) + "%";
      await F.setDoc(F.doc(db, "ventas", ref.id, "fotos", String(n).padStart(2, "0")), { slot, i: n, data: await b64(blob) });
      n++;
    }
    $("v-bar").style.width = "100%";
    fetch("https://ntfy.sh/entreamigos-avisos-7q4k9x2m", { method: "POST", body: `${auto}, ${v("v-km")} km, con ${lista.length} fotos. Revísalo en la app.`, headers: { Title: "Nuevo auto ofrecido", Click: "https://ventaentreamigos.com/cotiza/", Tags: "car" } }).catch(() => {});
    const msg = `Hola, soy ${v("v-nom")}. Quiero vender mi auto.\n\nAuto: ${auto}\nKilometraje: ${v("v-km")} km${num(v("v-precio")) ? "\nEspero recibir: $" + v("v-precio") : ""}\nMe interesa: ${$("v-como").value}\n\nYa subí las fotos y la factura en su página.`;
    $("vf").hidden = true; const d = $("v-done"); d.hidden = false;
    d.innerHTML = `<h2>Recibimos tu auto</h2><p class="muted">Ya tenemos tus datos, las fotos de tu auto y tu factura. Revisamos y te mandamos tu propuesta por WhatsApp.</p><a class="btn primary wa" href="${wa(msg)}" target="_blank" rel="noopener">${WA_ICON}Avisar por WhatsApp</a><a class="btn quiet" href="inventario.html">Ver autos en venta</a>`;
    d.scrollIntoView({ block: "start" });
  } catch (er) {
    btn.disabled = false; $("v-prog").hidden = true; alert0("No se pudieron subir las fotos. Revisa tu internet e intenta de nuevo.");
  }
});
