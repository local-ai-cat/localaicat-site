#!/usr/bin/env python3
"""Regenerate public/assets/home-voyage-poster.webp, the still the homepage shows while the voyage loads.

It is the voyage's own first frame (Cat HQ before liftoff), cropped to the middle band the homepage window can show.
Rerun it when the opening scene changes. Needs Python Playwright, ImageMagick and cwebp, plus the site running:

    pnpm dev   # or pnpm build && pnpm start
    python3 scripts/capture-voyage-poster.py http://localhost:3000
"""
import base64
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

SEED = "7"  # A purple Cat HQ, close to the site's own colours.
BACKING_SCALE = 2  # 1920x1200 canvas: sharp on a 2x screen at the 1100px window.
# The window shows at most ~41% of the canvas height around its centre; keep 45% (scene rows 165-435).
CROP = "1920x540+0+330"
OUTPUT = Path(__file__).resolve().parent.parent / "public/assets/home-voyage-poster.webp"


def capture(base_url: str) -> bytes:
    with sync_playwright() as playwright:
        # Installed Chrome, not the headless shell: the shell lacks the system fonts, so the CAT HQ sign changed font
        # when the live scene took over.
        browser = playwright.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 1100, "height": 230})
        page.goto(f"{base_url}/space-demo/lockscreen.html?homepage&seed={SEED}")
        page.wait_for_function("document.getElementById('scene').dataset.phase !== undefined")
        data_url = page.evaluate(f"""() => {{
            const canvas = document.getElementById('scene');
            backingScale = {BACKING_SCALE};
            canvas.width = sceneWidth * backingScale;
            canvas.height = sceneHeight * backingScale;
            draw();
            return canvas.toDataURL('image/png');
        }}""")
        browser.close()
    return base64.b64decode(data_url.split(",", 1)[1])


def main() -> None:
    base_url = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:3000"
    with tempfile.TemporaryDirectory() as work:
        frame, band = Path(work, "frame.png"), Path(work, "band.png")
        frame.write_bytes(capture(base_url))
        subprocess.run(["magick", str(frame), "-crop", CROP, "+repage", str(band)], check=True)
        subprocess.run(["cwebp", "-quiet", "-lossless", "-z", "9", str(band), "-o", str(OUTPUT)], check=True)
    print(f"wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
