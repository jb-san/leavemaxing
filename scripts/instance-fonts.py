"""Trim Archivo's variable axes to the ranges the site uses, for smaller font files.

The site sets Archivo at weights 400-900 and widths 72%-100% (body 100%, headings 80%, the hero
figure 72%). The packaged file spans weights 100-900 and widths 62%-125%; dropping the unused
ranges takes the Latin file from about 90 KB to 60 KB. If the CSS starts using a weight or width
outside these ranges, widen them here and run again:

    python3 -m venv /tmp/fonts && /tmp/fonts/bin/pip install fonttools brotli
    /tmp/fonts/bin/python scripts/instance-fonts.py

Archivo is under the SIL Open Font License 1.1 (src/assets/fonts/OFL.txt), which allows modified
versions; it reserves no font names.
"""

from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "node_modules/@fontsource-variable/archivo/files"
OUT = ROOT / "src/assets/fonts"
LIMITS = {"wght": (400, 900), "wdth": (72, 100)}

for subset in ("latin", "latin-ext", "vietnamese"):
    font = TTFont(SOURCE / f"archivo-{subset}-wdth-normal.woff2")
    trimmed = instancer.instantiateVariableFont(font, LIMITS)
    trimmed.flavor = "woff2"
    target = OUT / f"archivo-{subset}-wght400-900-wdth72-100.woff2"
    trimmed.save(target)
    print(f"{target.relative_to(ROOT)}: {target.stat().st_size} bytes")
