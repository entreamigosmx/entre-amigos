// Menú para celular: botón junto a WhatsApp que abre la lista de secciones.
(function () {
  var top = document.querySelector('header.top .in');
  if (!top) return;
  var links = [
    ['./', 'Inicio'],
    ['inventario.html', 'Inventario'],
    ['servicios.html', 'Servicios'],
    ['vender.html', 'Vende tu auto'],
    ['creditos.html', 'Créditos'],
    ['nosotros.html', 'Nosotros'],
    ['nosotros.html#clientes', 'Nuestros clientes'],
    ['./#visita', 'Visítanos']
  ];
  var here = location.pathname.split('/').pop() || './';
  var btn = document.createElement('button');
  btn.className = 'menu-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Abrir menú');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'mmenu');
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var panel = document.createElement('nav');
  panel.id = 'mmenu';
  panel.className = 'mmenu';
  panel.setAttribute('aria-label', 'Menú');
  panel.hidden = true;
  links.forEach(function (l) {
    var a = document.createElement('a');
    a.href = l[0];
    a.textContent = l[1];
    if (l[0] === here || (here === 'index.html' && l[0] === './')) a.setAttribute('aria-current', 'page');
    panel.appendChild(a);
  });
  var wa = document.createElement('a');
  wa.href = 'https://wa.me/523333063319';
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.className = 'btn primary';
  wa.textContent = 'Escríbenos por WhatsApp';
  panel.appendChild(wa);
  var box = top.querySelector('.tact');
  if (!box) {
    box = document.createElement('div');
    box.className = 'tact';
    var last = top.querySelector(':scope > a.btn');
    top.appendChild(box);
    if (last) box.appendChild(last);
  }
  box.appendChild(btn);
  document.querySelector('header.top').appendChild(panel);
  function set(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    btn.innerHTML = open
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  }
  btn.addEventListener('click', function () { set(panel.hidden); });
  panel.addEventListener('click', function (e) { if (e.target.tagName === 'A') set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
})();
