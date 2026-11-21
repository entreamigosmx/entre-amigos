# Genera la voz de muestra (edge-tts) de cada segmento del guion.
import asyncio, json, sys, os, edge_tts
g = json.load(open(sys.argv[1])); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
async def main():
    for s in g["segmentos"]:
        c = edge_tts.Communicate(s["texto"], g["voz"], rate=g.get("rate", "+0%"))
        await c.save(f"{out}/{s['id']}.mp3")
asyncio.run(main())
