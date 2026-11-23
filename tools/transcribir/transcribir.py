import json, sys
from faster_whisper import WhisperModel
m = WhisperModel('medium', device='cpu', compute_type='int8')
segs, info = m.transcribe(sys.argv[1], language='es', word_timestamps=True, vad_filter=False)
words = [{'w': w.word, 's': round(w.start, 2), 'e': round(w.end, 2)} for s in segs for w in s.words]
json.dump({'texto': ''.join(x['w'] for x in words).strip(), 'palabras': words}, open(sys.argv[2], 'w'), ensure_ascii=False, indent=0)
