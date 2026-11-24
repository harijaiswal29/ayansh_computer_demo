"""Bundles some of Nova's voice clips into small script files for the claude.ai copy of the app.

A claude.ai page can hold at most 511 files, and the app already has more than 400. So the newer
clips (the Did you know? facts, the big moons, the record breakers, the Amazing Facts Quiz and
Beyond Pluto) are published as bundles of a few clips each: audio/packs/p_<name>.js. The published page sets
AUDIO_PACKS to true in index.html so Nova's voice fetches a bundle the first time it needs one.
The folder version keeps using the separate mp3 files and never needs these bundles.

Run:
    python tools/pack_audio.py OUTDIR      (writes OUTDIR/audio/packs/p_*.js)

The grouping must match Voice.packOf() in solar-system/index.html.
"""
import base64, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "solar-system"
GROUP = re.compile(r"^(?:dyk_([a-z]+)_\d+|m_([a-z]+)|(rec|fq)_.+|nb_([a-z]+)(?:_.*)?)$")


def main():
    out = pathlib.Path(sys.argv[1]) / "audio" / "packs"
    out.mkdir(parents=True, exist_ok=True)
    src = (ROOT / "lines.js").read_text()
    lines = json.loads(src[src.index("{"):src.rindex("}") + 1])
    packs = {}
    for key in lines:
        m = GROUP.match(key)
        if m:
            name = "p_nb_" + m.group(4) if m.group(4) else "p_" + (m.group(1) or m.group(2) or m.group(3))
            packs.setdefault(name, []).append(key)
    for name, keys in sorted(packs.items()):
        parts = ["(window.AUDIOPACK = window.AUDIOPACK || {});"]
        for key in keys:
            data = base64.b64encode((ROOT / "audio" / f"{key}.mp3").read_bytes()).decode()
            parts.append(f'AUDIOPACK[{json.dumps(key)}] = "data:audio/mpeg;base64,{data}";')
        (out / f"{name}.js").write_text("\n".join(parts) + "\n")
    print(len(packs), "bundles,", sum(len(k) for k in packs.values()), "clips ->", out)


if __name__ == "__main__":
    main()
