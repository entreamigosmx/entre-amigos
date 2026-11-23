import json, sys, subprocess, numpy as np
from faster_whisper import WhisperModel
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', sys.argv[1], '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, np.float32)
m = WhisperModel('medium', device='cpu', compute_type='int8')
segs, info = m.transcribe(audio, language='es', word_timestamps=True)
words = [{'w': w.word, 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in s.words]
json.dump({'texto': ''.join(x['w'] for x in words).strip(), 'palabras': words}, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
# Mon Nov 23 21:32:54 UTC 2026
