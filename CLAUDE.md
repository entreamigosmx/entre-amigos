# Entre Amigos — página web

Página estática (GitHub Pages) del negocio Entre Amigos, Guadalajara. El dueño trabaja solo desde iPhone/iPad; Claude administra todo.

## Estructura
- `index.html` portada, nosotros, inventario, opiniones, financiamiento, servicios, contacto.
- `auto.html?a=<slug>` ficha de cada auto.
- `data/autos.json` inventario. Campos: title, slug, marca, modelo, anio, precio, precioAnterior, precioEspecial, categoria (etiqueta corta), categorias (lista para los filtros: SUVs, Familiares, Pickups, Trabajo, Todo terreno, Sedanes, Lujo, Eléctricos, Motos; un auto puede estar en varias), kilometraje (omitir si el dueño no lo da: se muestra "Consultar"), disponible, destacado, apartado, orden (menor = primero), foto, galeria (lista de rutas/URLs), descripcion (HTML: p, h4, ul/li).
- `assets/js/wix.js` lee el JSON y arma URLs de imágenes (nombre heredado).
- `data/opiniones.json` opiniones de Google que rotan en la portada ({texto, nombre}); el dueño manda capturas y se transcriben.
- Fotos nuevas: `fotos/<slug>/NN.jpg` (1600px, q≈80) y miniatura `fotos/<slug>/t/NN.jpg` (640px). Fotos antiguas siguen en static.wixstatic.com.

## Reglas del dueño
- Sin emojis; tono profesional. Colores: negro + verde limón (#b6e21f).
- Difuminar placas en cada foto antes de publicar.
- Marcar "apartado" cuando lo pida; quitar (disponible:false) cuando se venda.
- Enganche publicado: desde 35%; con buen historial crediticio puede ser menor (lo decide el dueño).
