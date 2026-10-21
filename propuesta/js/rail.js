// Nivelador lateral: muestra en qué parte de la página vas y permite saltar o arrastrar a cualquier sección.
(function () {
  var SECS = [["inicio", "Inicio"], ["destacados", "Autos"], ["necesitas", "¿Qué necesitas?"], ["opiniones", "Opiniones"], ["como", "Nosotros"], ["vende", "Vender"], ["financiamiento", "Crédito"], ["servicios", "Servicios"], ["contacto", "Contacto"]];
  var $ = function (id) { return document.getElementById(id); };
  var rail = $("rail"), track = $("rtrack"), fill = $("rfill"), dots = $("rdots"), thumb = $("rthumb"), name = $("rname"), menu = $("rmenu");
  if (!rail) return;
  var els = SECS.map(function (s) { return document.getElementById(s[0]); });
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pos = [], cur = -1, idle = null, dragging = false;
  var maxY = function () { return Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  function layout() {
    pos = els.map(function (el) { return el ? Math.min(1, Math.max(0, (el.getBoundingClientRect().top + scrollY - 80) / maxY())) : 0; });
    dots.innerHTML = SECS.map(function (s, i) { return '<button type="button" data-i="' + i + '" style="top:' + (pos[i] * 100) + '%" aria-label="Ir a ' + s[1] + '"><span>' + s[1] + "</span></button>"; }).join("");
    menu.innerHTML = SECS.map(function (s, i) { return '<button type="button" data-i="' + i + '">' + s[1] + "</button>"; }).join("");
    update();
  }
  function go(i) {
    var el = els[i]; if (!el) return;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - 64), behavior: reduce ? "auto" : "smooth" });
    closeMenu();
  }
  function measure() {
    pos = els.map(function (el) { return el ? Math.min(1, Math.max(0, (el.getBoundingClientRect().top + scrollY - 80) / maxY())) : 0; });
    Array.prototype.forEach.call(dots.children, function (b, k) { b.style.top = pos[k] * 100 + "%"; });
  }
  function update() {
    measure();
    var p = Math.min(1, Math.max(0, scrollY / maxY()));
    fill.style.height = p * 100 + "%";
    thumb.style.top = p * 100 + "%";
    var i = 0; for (var k = 0; k < pos.length; k++) if (p + 0.002 >= pos[k]) i = k;
    if (i !== cur) {
      cur = i; name.textContent = SECS[i][1];
      Array.prototype.forEach.call(dots.children, function (b, k) { b.classList.toggle("on", k === i); b.classList.toggle("past", k < i); });
    }
    rail.classList.add("live"); clearTimeout(idle);
    idle = setTimeout(function () { if (!dragging) rail.classList.remove("live"); }, 1400);
  }
  function fromPointer(e) {
    var r = track.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    window.scrollTo(0, p * maxY());
  }
  function closeMenu() { menu.hidden = true; thumb.setAttribute("aria-expanded", "false"); }
  dots.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(+b.dataset.i); });
  menu.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) go(+b.dataset.i); });
  // Arrastrar el nivelador: se mueve la página. Un toque sin arrastrar abre la lista de secciones.
  var startY = 0, moved = false;
  thumb.addEventListener("pointerdown", function (e) { dragging = true; moved = false; startY = e.clientY; thumb.setPointerCapture(e.pointerId); rail.classList.add("live", "drag"); });
  thumb.addEventListener("pointermove", function (e) { if (!dragging) return; if (Math.abs(e.clientY - startY) > 6) { moved = true; closeMenu(); } if (moved) fromPointer(e); });
  thumb.addEventListener("pointerup", function () {
    dragging = false; rail.classList.remove("drag");
    if (!moved) { var open = menu.hidden; menu.hidden = !open; thumb.setAttribute("aria-expanded", String(open)); }
    update();
  });
  thumb.addEventListener("pointercancel", function () { dragging = false; rail.classList.remove("drag"); });
  track.addEventListener("click", fromPointer);
  document.addEventListener("click", function (e) { if (!rail.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", layout);
  addEventListener("load", layout);
  setTimeout(layout, 600); setTimeout(layout, 2500);
  layout();
})();
