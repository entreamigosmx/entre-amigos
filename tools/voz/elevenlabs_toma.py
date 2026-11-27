# Genera TODO el guion en una sola toma (entonación natural) con tiempos por letra.
import json, sys, os, base64, urllib.request
g = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
sep = " "
texto = sep.join(s["texto"] for s in g["segmentos"])
inicios = []; p = 0
for s in g["segmentos"]:
    inicios.append(p); p += len(s["texto"]) + len(sep)
vs = {"stability": g.get("estabilidad", 0.4), "similarity_boost": 0.85, "style": g.get("estilo", 0.2), "use_speaker_boost": True}
body = json.dumps({"text": texto, "model_id": g.get("modelo", "eleven_multilingual_v2"), "voice_settings": vs}).encode()
r = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{g['voz']}/with-timestamps?output_format=mp3_44100_192",
    data=body, headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
try: d = json.loads(urllib.request.urlopen(r).read())
except urllib.error.HTTPError as e: open(f"{out}/error.txt","w").write(e.read().decode()); raise
open(f"{out}/toma.mp3", "wb").write(base64.b64decode(d["audio_base64"]))
json.dump({"texto": texto, "inicios": inicios, "alineacion": d.get("normalized_alignment") or d.get("alignment"), "alineacion_original": d.get("alignment")}, open(f"{out}/tiempos.json", "w"), ensure_ascii=False)
