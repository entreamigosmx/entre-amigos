// Contador anónimo de visitas: suma 1 por página vista en Firestore (visitas/AAAA-MM-DD). No guarda datos personales.
(function () {
  try {
    if (navigator.webdriver || /\/propuesta\//.test(location.pathname) || !/(^|\.)ventaentreamigos\.com$/.test(location.hostname)) return;
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
    const URL = "https://firestore.googleapis.com/v1/projects/entre-amigos-financiera/databases/(default)/documents:commit?key=AIzaSyDrp5lK7COul0RaI4nvN1vOx5sQ5tSJIW8";
    const send = (campos) => fetch(URL, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ writes: [{ transform: { document: "projects/entre-amigos-financiera/databases/(default)/documents/visitas/" + dia,
        fieldTransforms: campos.map((c) => ({ fieldPath: c, increment: { integerValue: "1" } })) } }] }) }).catch(() => {});
    let pg = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index";
    if (!/^[a-z]{1,20}$/.test(pg)) pg = "otra";
    const c = ["total", "paginas." + (pg === "index" ? "inicio" : pg)];
    try { if (localStorage.getItem("ea_v") !== dia) { localStorage.setItem("ea_v", dia); c.push("personas"); } } catch (e) {}
    const a = new URLSearchParams(location.search).get("a");
    if (pg === "auto" && a && /^[a-z0-9-]{1,80}$/.test(a)) c.push("autos.`" + a + "`");
    send(c);
    document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest('a[href*="wa.me"]')) send(["wa"]); }, true);
  } catch (e) {}
})();
