import json, sys, wave, numpy as np
from faster_whisper import WhisperModel
w = wave.open(sys.argv[1]); audio = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
m = WhisperModel('medium', device='cpu', compute_type='int8')
segs, info = m.transcribe(audio, language='es', word_timestamps=True)
words = [{'w': x.word, 's': round(x.start, 2), 'e': round(x.end, 2)} for s in segs for x in s.words]
json.dump({'texto': ''.join(x['w'] for x in words).strip(), 'palabras': words}, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
