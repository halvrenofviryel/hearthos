#!/usr/bin/env python3
"""
Build the HearthOS Starter Kit PDF from source.html via weasyprint.

Run:
  python3 scripts/starter-kit/build.py

Output:
  apps/demo/public/hearthos-starter-kit-v0.1.pdf
"""

from __future__ import annotations

import sys
from pathlib import Path

from weasyprint import HTML

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "scripts" / "starter-kit" / "source.html"
OUT_DIR = REPO / "apps" / "demo" / "public"
OUT_FILE = OUT_DIR / "hearthos-starter-kit-v0.1.pdf"


def main() -> int:
    if not SRC.exists():
        print(f"ERROR: source not found: {SRC}", file=sys.stderr)
        return 2

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"==> Rendering {SRC.name} -> {OUT_FILE.relative_to(REPO)}")
    HTML(string=SRC.read_text(encoding="utf-8"), base_url=str(SRC.parent)).write_pdf(str(OUT_FILE))

    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"==> Done. {OUT_FILE.name}: {size_kb:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
