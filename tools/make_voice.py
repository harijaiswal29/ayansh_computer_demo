"""Records Nova's voice lines for the solar system app.

Reads solar-system/lines.js and writes solar-system/audio/<id>.mp3 with the
Kokoro neural text-to-speech model, so the narration sounds like a person
rather than the browser's built-in voice. Lines that have not changed since
the last run are skipped.

Setup (once):
    pip install kokoro-onnx soundfile
    download kokoro-v1.0.onnx and voices-v1.0.bin from
    https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Run:
    python tools/make_voice.py --models /path/to/model/folder
"""
import argparse, hashlib, json, pathlib, re, subprocess, tempfile

import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = pathlib.Path(__file__).resolve().parent.parent / "solar-system"
VOICE, SPEED = "af_heart", 0.92
# Spellings that make the voice say Indian names the way family says them.
SOUNDS_LIKE = {"Ayansh": "Aayaansh"}


def load_lines():
    src = (ROOT / "lines.js").read_text()
    body = src[src.index("{"):src.rindex("}") + 1]
    return json.loads(body)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default=".")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    models = pathlib.Path(args.models)
    tts = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))

    out = ROOT / "audio"
    out.mkdir(exist_ok=True)
    manifest_path = out / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

    for key, line in load_lines().items():
        said = line.get("say", line["text"])
        for name, spoken in SOUNDS_LIKE.items():
            said = re.sub(rf"\b{name}\b", spoken, said)
        digest = hashlib.sha1(f"{VOICE}|{SPEED}|{said}".encode()).hexdigest()[:12]
        mp3 = out / f"{key}.mp3"
        if not args.force and manifest.get(key) == digest and mp3.exists():
            continue
        samples, rate = tts.create(said, voice=VOICE, speed=SPEED, lang="en-us",
                                   sentence_pause=0.35, clause_pause=0.12)
        with tempfile.NamedTemporaryFile(suffix=".wav") as wav:
            sf.write(wav.name, samples, rate)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav.name,
                            "-af", "apad=pad_dur=0.15", "-ac", "1", "-b:a", "56k", str(mp3)],
                           check=True)
        manifest[key] = digest
        print(f"{key}: {len(samples) / rate:.1f}s")
        manifest_path.write_text(json.dumps(manifest, indent=1, sort_keys=True))


if __name__ == "__main__":
    main()
