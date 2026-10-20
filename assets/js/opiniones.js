// Opiniones que van rotando. Los textos viven en data/opiniones.json.
(function () {
  var box = document.getElementById("revs");
  if (!box) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function perView() { return innerWidth >= 1100 ? 4 : innerWidth >= 800 ? 3 : innerWidth >= 560 ? 2 : 1; }
  fetch("data/opiniones.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (list) {
    if (!list || list.length < 2) return;
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
    var start = 0, paused = false;
    var dots = document.createElement("div"); dots.className = "rev-dots"; box.after(dots);
    function card(o) {
      return '<figure class="rev"><div class="stars" aria-label="5 de 5 estrellas">★★★★★</div><blockquote>' + esc(o.texto) + '</blockquote><figcaption>' + esc(o.nombre) + ' · Google</figcaption></figure>';
    }
    function draw() {
      var n = Math.min(perView(), list.length), html = "";
      for (var k = 0; k < n; k++) html += card(list[(start + k) % list.length]);
      box.classList.add("fading");
      setTimeout(function () {
        box.innerHTML = html; box.style.gridTemplateColumns = "repeat(" + n + ", minmax(0, 1fr))"; box.classList.remove("fading");
        var pages = Math.ceil(list.length / n), cur = Math.floor(start / n) % pages, d = "";
        for (var p = 0; p < pages; p++) d += '<button type="button" aria-label="Opiniones ' + (p + 1) + '"' + (p === cur ? ' aria-current="true"' : "") + ' data-p="' + p + '"></button>';
        dots.innerHTML = d;
      }, reduce ? 0 : 350);
    }
    function next() { start = (start + Math.min(perView(), list.length)) % list.length; draw(); }
    dots.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; start = Number(b.dataset.p) * perView(); draw(); });
    box.addEventListener("mouseenter", function () { paused = true; });
    box.addEventListener("mouseleave", function () { paused = false; });
    box.addEventListener("touchstart", function () { paused = true; setTimeout(function () { paused = false; }, 12000); }, { passive: true });
    draw();
    setInterval(function () { if (!paused && !document.hidden) next(); }, 7000);
    addEventListener("resize", function () { draw(); });
  }).catch(function () {});
})();
