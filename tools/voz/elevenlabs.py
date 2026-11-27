# Genera cada segmento del guion con la voz clonada de Jesús (ElevenLabs).
import json, sys, os, urllib.request
g = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
key = os.environ["ELEVENLABS_API_KEY"]
for s in g["segmentos"]:
    body = json.dumps({"text": s["texto"], "model_id": g.get("modelo", "eleven_multilingual_v2"),
        "voice_settings": {"stability": g.get("estabilidad", 0.5), "similarity_boost": 0.85, "style": g.get("estilo", 0.15), "use_speaker_boost": True}}).encode()
    r = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{g['voz']}?output_format=mp3_44100_192",
        data=body, headers={"xi-api-key": key, "Content-Type": "application/json"})
    open(f"{out}/{s['id']}.mp3", "wb").write(urllib.request.urlopen(r).read())
