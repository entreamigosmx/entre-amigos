# Entre Amigos — página web

Página estática (GitHub Pages) del negocio Entre Amigos, Guadalajara. El dueño trabaja solo desde iPhone/iPad; Claude administra todo.

## Estructura
- `index.html` portada (video), cómo trabajamos, inventario destacado, vende tu auto, financiamiento, opiniones, servicios, contacto.
- `inventario.html` inventario con filtros; `auto.html?a=<slug>` ficha de cada auto (Me interesa, Cotizar financiamiento, Compartir); `creditos.html?a=<slug>` simulador de crédito (`/creditos/` redirige); `prestamos.html` préstamos con garantía; `vender.html` + `js/vender.js` Vende tu auto (10 fotos obligatorias + factura, se guarda en Firestore `ventas` y avisa por ntfy).
- `data/credito.json` parámetros del simulador: tasaAnual (null = no se muestra mensualidad hasta que el dueño dé la tasa real; nunca inventar), enganche sugerido 35%, plazos.
- `propuesta/` vista previa (noindex) para que el dueño revise cambios ANTES de publicarlos; copia del sitio con rutas `../`. Regla: todo cambio visible primero va ahí. Para publicar lo aprobado: `python3 tools/publicar.py` (copia a la raíz, quita barra y noindex, ajusta rutas).
- `css/estilo.css`, `js/comun.js` (lee el JSON y arma URLs de imágenes), `js/inicio.js`, `js/inventario.js`, `js/auto.js`.
- `assets/img`, `assets/video` (portada.mp4 vertical 720p sin audio; anuncio.mp4).
- `cotiza/` app privada de préstamos (Firebase). `nuevo/` solo redirige a la portada.
- Pendiente: sección de equipo (fotos, nombre y función) y aviso de privacidad (borrador en `tools/privacidad-borrador.html`; falta razón social, correo y fecha).
- `data/autos.json` inventario. Campos: title, slug, marca, modelo, anio, precio, precioAnterior, precioEspecial, categoria (etiqueta corta), categorias (lista para los filtros: SUVs, Familiares, Pickups, Trabajo, Todo terreno, Sedanes, Lujo, Eléctricos, Motos; un auto puede estar en varias), kilometraje (omitir si el dueño no lo da: se muestra "Consultar"), disponible, destacado, apartado, orden (menor = primero), foto, galeria (lista de rutas/URLs), descripcion (HTML: p, h4, ul/li).
- `data/opiniones.json` opiniones de Google que rotan en la portada ({texto, nombre}); el dueño manda capturas y se transcriben.
- Fotos nuevas: `fotos/<slug>/NN.jpg` (1600px, q≈80) y miniatura `fotos/<slug>/t/NN.jpg` (640px). Fotos antiguas siguen en static.wixstatic.com.

## Reglas del dueño
- Sin emojis; tono profesional. Colores: negro + verde limón (#b6e21f).
- Difuminar placas en cada foto antes de publicar.
- Marcar "apartado" cuando lo pida; quitar (disponible:false) cuando se venda.
- Enganche publicado: desde 35%; con buen historial crediticio puede ser menor (lo decide el dueño).
