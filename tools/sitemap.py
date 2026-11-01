# Rehace sitemap.xml con las páginas públicas y los autos disponibles de data/autos.json.
# Correr después de agregar, vender o quitar un auto: python3 tools/sitemap.py
import json

A = json.load(open('data/autos.json'))
pages = ['', 'inventario.html', 'servicios.html', 'nosotros.html', 'vender.html', 'creditos.html', 'prestamos.html']
urls = ['https://ventaentreamigos.com/' + p for p in pages]
urls += ['https://ventaentreamigos.com/auto.html?a=' + a['slug']
         for a in sorted(A, key=lambda a: a.get('orden', 999))
         if a.get('disponible', True) and not a.get('borrador')]
with open('sitemap.xml', 'w') as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
    f.writelines('<url><loc>%s</loc></url>\n' % u for u in urls)
    f.write('</urlset>\n')
print(len(urls), 'direcciones en sitemap.xml')
