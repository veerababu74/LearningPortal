"""
One-time converter: asyncconcur/async/Async_Programming_FastAPI_Interview_Guide.pdf -> markdown.

The PDF's own table of contents supplies the exact chapter / section / task / question titles,
which are promoted to headings in the body. Code runs are fenced, wrapped prose is reflowed.

    python scripts/pdf-to-md.py

Writes src/content/asyncconcur/sources/fastapi-async-interview-guide.md (committed, so the
site build does not need Python).
"""
import re
import sys
from pathlib import Path

import pypdf

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "asyncconcur" / "async" / "Async_Programming_FastAPI_Interview_Guide.pdf"
OUT = ROOT / "src" / "content" / "asyncconcur" / "sources" / "fastapi-async-interview-guide.md"

NOISE = [
    re.compile(r"^Asynchronous Programming with FastAPI\s+-\s+Interview Mastery Guide$"),
    re.compile(r"^Page \d+$"),
    re.compile(r"^v1\.0\s+-\s+2026$"),
]

CODE_START = re.compile(
    r"^(import |from \S+ import |async def |def |class |@\w|await |#\s?\S|[A-Za-z_][\w.\[\]'\"]*\s*(=|\+=|-=)\s*\S|"
    r"[A-Za-z_][\w.]*\(.*\)\s*(#.*)?$|for .+:$|while .+:$|if .+:$|with .+:$|async with .+:$|async for .+:$|try:$|"
    r"except.*:$|else:$|elif .+:$|return\b|raise\b|yield\b|pass$|\.\.\.$|[\)\]\}],?$|\$ |uvicorn |pip |gunicorn )"
)


def is_code(line: str, nxt: str = "", in_code: bool = False) -> bool:
    s = line.rstrip()
    if not s:
        return False
    if s.startswith("    ") or s.startswith("\t"):
        return True
    if re.match(r"^#\d", s):
        return False  # "#1 beginner mistake." is prose, not a comment
    if s.startswith("#") and not in_code:
        # a comment only opens a code block when real code follows it
        n = nxt.rstrip()
        return bool(n) and not n.startswith("#") and bool(CODE_START.match(n)) or (bool(n) and n.startswith("#") and len(s) < 70 and not s.endswith("."))
    if CODE_START.match(s):
        # Prose sentences that happen to start like code ("If you declare ...") are long and end with '.'
        words = s.split()
        if len(words) > 8 and not re.search(r"[()=\[\]{}]|:$", s):
            return False  # long line without code punctuation: wrapped prose ("async def compiles the …")
        return True
    return False


def toc_titles(text: str):
    toc_end = text.find("Chapter 1 -", text.find("Chapter 1 -") + 20)
    toc = text[:toc_end]
    titles = []
    entry = re.compile(r"^(Chapter \d+ - .+|\d+\.\d+ .+|Task \d+ - .+|Q\d+\. .+)$")
    toc_lines = [l.strip() for l in toc.split("\n")]
    for k, line in enumerate(toc_lines):
        m = entry.match(line)
        if not m or " .  . " in line:
            continue
        title = re.sub(r"\s+\d+$", "", m.group(1)).strip()
        # wrapped TOC entry: next line continues the title (not dots, not a page number, not an entry)
        nxt = toc_lines[k + 1] if k + 1 < len(toc_lines) else ""
        if nxt and not entry.match(nxt) and not nxt.startswith(".") and not re.fullmatch(r"[\d\s.]+", nxt):
            title = f"{title} {re.sub(r'[ .]+\d*$', '', nxt).strip()}".strip()
        titles.append(title)
    return titles, toc_end


def main():
    reader = pypdf.PdfReader(str(SRC))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    titles, toc_end = toc_titles(text)
    body = text[toc_end:]
    lines = [l.rstrip() for l in body.split("\n")]
    lines = [l for l in lines if not any(n.match(l.strip()) for n in NOISE)]

    # Join titles that wrap onto two lines in the body ("Chapter 9 - 10 Scenario-Based Interview" + "Questions ...")
    out = []
    i = 0
    pending_titles = list(titles)
    in_code = False
    para = []

    def flush_para():
        nonlocal para
        if para:
            out.append(" ".join(p.strip() for p in para))
            out.append("")
            para = []

    def close_code():
        nonlocal in_code
        if in_code:
            while out and not out[-1].strip():
                out.pop()
            out.append("```")
            out.append("")
            in_code = False

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        # heading match (possibly spanning two lines)
        matched = None
        norm = lambda s: s.rstrip(" .?!:")
        consumed = 1
        for t in pending_titles[:3]:
            if not stripped:
                break
            if norm(t) == norm(stripped):
                matched, consumed = t, 1
                break
            two = f"{stripped} {lines[i+1].strip()}" if i + 1 < len(lines) else ""
            if t.startswith(stripped) and norm(t) == norm(two):
                matched, consumed = t, 2
                break
        if matched:
            flush_para()
            close_code()
            if matched.startswith("Chapter"):
                out.append(f"# {matched.replace(' - ', ' — ', 1)}")
            elif matched.startswith("Task"):
                out.append(f"### {matched.replace(' - ', ' — ', 1)}")
            elif matched.startswith("Q"):
                out.append(f"### {matched}")
            else:
                out.append(f"## {matched}")
            out.append("")
            pending_titles.remove(matched)
            i += consumed
            continue

        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if is_code(line, nxt, in_code) or (in_code and (not stripped or line.startswith(" "))):
            if not in_code:
                flush_para()
                out.append("```python")
                in_code = True
            out.append(line)
            i += 1
            continue

        close_code()
        if not stripped:
            flush_para()
            i += 1
            continue
        # call-out labels used throughout the guide
        nxt_text = next((l.strip() for l in lines[i + 1 : i + 3] if l.strip()), "")
        if (
            len(stripped) < 60
            and not stripped.endswith((".", ",", ";", ":"))
            and stripped[:1].isupper()
            and len(para) == 0
            and len(stripped.split()) <= 8
            and nxt_text[:1] in ('"', "“") or (
                len(stripped) < 60 and len(para) == 0 and not stripped.endswith((".", ",", ";"))
                and len(stripped.split()) <= 8 and stripped[:1].isupper() and len(nxt_text) > 60
                and nxt_text[:1].isupper() and not is_code(nxt_text)
            )
        ):
            flush_para()
            out.append(f"**{stripped}**")
            out.append("")
            i += 1
            continue
        para.append(stripped)
        # paragraph break heuristic: short final line of a wrapped paragraph
        if len(stripped) < 85 and stripped.endswith((".", ":", '"', "?", "!")):
            flush_para()
        i += 1

    flush_para()
    close_code()

    md = "\n".join(out)
    md = re.sub(r"\n{3,}", "\n\n", md).strip()
    header = (
        "<!-- Generated from asyncconcur/async/Async_Programming_FastAPI_Interview_Guide.pdf by "
        "scripts/pdf-to-md.py. Edit the PDF converter, not this file. -->\n\n"
        "# Asynchronous Programming with FastAPI — Interview Mastery Guide\n\n"
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(header + md + "\n", encoding="utf-8")
    missing = [t for t in pending_titles]
    print(f"wrote {OUT} ({len(md)} chars), {len(titles) - len(missing)}/{len(titles)} headings matched")
    if missing:
        print("unmatched:", missing[:20])


if __name__ == "__main__":
    sys.exit(main())
