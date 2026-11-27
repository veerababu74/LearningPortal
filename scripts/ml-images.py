"""
One-time image step for the VeeraML track.

Collects the real plots that exist in the .ml/ sources and makes them web-sized:
  * image/png outputs saved inside notebooks           → public/ml-img/nb-<sha16>.png
  * PNG/JPG files next to the lessons (mm/, images/)    → public/ml-img/<name>-<sha8>.png

Images are resized to at most 1100 px wide and palette-compressed (matplotlib plots stay sharp).
Writes src/content/ml/sources/images.json, which scripts/parse-ml.mjs reads:
  { "notebook": { "<sha16 of the base64 text>": "/ml-img/nb-….png" },
    "files":    { "<path relative to .ml>": "/ml-img/….png" } }

    python scripts/ml-images.py      (needs Pillow; the site build itself does not)
"""
import base64
import hashlib
import io
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ".ml"
OUT = ROOT / "public" / "ml-img"
MANIFEST = ROOT / "src" / "content" / "ml" / "sources" / "images.json"
SKIP_DIRS = {".git", ".ipynb_checkpoints", "__pycache__", ".venv", "node_modules"}
MAX_W = 1100


def web_png(data: bytes) -> bytes:
    im = Image.open(io.BytesIO(data))
    im.load()
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        rgba = im.convert("RGBA")
        bg.paste(rgba, mask=rgba.split()[-1])
        im = bg
    else:
        im = im.convert("RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im = im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def walk(d: Path):
    for p in sorted(d.iterdir()):
        if p.name in SKIP_DIRS:
            continue
        if p.is_dir():
            yield from walk(p)
        else:
            yield p


def main():
    if not SRC.exists():
        print(".ml/ not found — nothing to do")
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"notebook": {}, "files": {}}
    written = set()
    total = 0

    def save(name: str, data: bytes) -> str:
        nonlocal total
        if name not in written:
            png = web_png(data)
            (OUT / name).write_bytes(png)
            written.add(name)
            total += len(png)
        return f"/ml-img/{name}"

    for p in walk(SRC):
        rel = p.relative_to(SRC).as_posix()
        ext = p.suffix.lower()
        if ext == ".ipynb":
            try:
                nb = json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                continue
            for cell in nb.get("cells", []):
                for o in cell.get("outputs", []) or []:
                    b64 = (o.get("data") or {}).get("image/png")
                    if not b64:
                        continue
                    text = "".join(b64) if isinstance(b64, list) else b64
                    key = hashlib.sha1(text.encode()).hexdigest()[:16]
                    if key in manifest["notebook"]:
                        continue
                    try:
                        manifest["notebook"][key] = save(f"nb-{key}.png", base64.b64decode(text))
                    except Exception as e:  # corrupt output
                        print("skip notebook image", rel, e)
        elif ext in (".png", ".jpg", ".jpeg"):
            data = p.read_bytes()
            digest = hashlib.sha1(data).hexdigest()[:8]
            stem = "".join(c if c.isalnum() else "-" for c in p.stem.lower()).strip("-")[:40]
            try:
                manifest["files"][rel] = save(f"{stem}-{digest}.png", data)
            except Exception as e:
                print("skip image", rel, e)

    # remove images no longer referenced
    for f in OUT.glob("*.png"):
        if f.name not in written:
            f.unlink()
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"{len(written)} images, {total / 1e6:.1f} MB -> {OUT.relative_to(ROOT)}; manifest {MANIFEST.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
