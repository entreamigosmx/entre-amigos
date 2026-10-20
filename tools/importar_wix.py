# Copia a fotos/<slug>/ las fotos que aún viven en el CDN de Wix y actualiza data/autos.json.
import json, os, io, urllib.request
from PIL import Image, ImageOps
p = "data/autos.json"
d = json.load(open(p))
hechos = 0
for c in d:
    g = c.get("galeria") or []
    if not g or not any("wixstatic" in s for s in g):
        continue
    out = f"fotos/{c['slug']}"
    os.makedirs(out + "/t", exist_ok=True)
    nueva = []
    for i, src in enumerate(g, 1):
        if "wixstatic" not in src:
            nueva.append(src); continue
        f = src.split("/media/")[1].split("/")[0]
        url = f"https://static.wixstatic.com/media/{f}/v1/fit/w_2000,h_2000,q_95/{f}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=60).read()))
        im = ImageOps.exif_transpose(im).convert("RGB")
        for size, dst, q in ((1600, f"{out}/{i:02d}.jpg", 80), (640, f"{out}/t/{i:02d}.jpg", 78)):
            x = im.copy(); x.thumbnail((size, size), Image.LANCZOS)
            x.save(dst, quality=q, optimize=True, progressive=True)
        nueva.append(f"{out}/{i:02d}.jpg"); hechos += 1
    c["galeria"] = nueva
    c["foto"] = nueva[0]
    print(c["slug"], len(nueva))
json.dump(d, open(p, "w"), ensure_ascii=False, indent=1)
print("fotos copiadas:", hechos)
