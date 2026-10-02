"""Exports the Mosaic logo (the one used on the site) as high-resolution PNGs.

Run: python tools/export-logo-png.py   (needs Pillow)
Outputs to logos/png/: the icon, and the full logo for light and for dark backgrounds,
all with transparent backgrounds. Layout matches js/logos-data.js (viewBox 380 x 120).
"""
import importlib.util
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'logos' / 'png'
FONT = ROOT / 'tools' / 'fonts' / 'BricolageGrotesque.ttf'

spec = importlib.util.spec_from_file_location('social', ROOT / 'tools' / 'make-social.py')
social = importlib.util.module_from_spec(spec)
spec.loader.exec_module(social)

INK, MOSAIC_DEEP, GLINT, WHITE = (6, 37, 48), (11, 127, 152), (191, 244, 247), (247, 252, 252)


def text_layer(text, size, weight, opsz, fill, target_width):
    """Render text and stretch it to an exact width, like SVG textLength."""
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_axes([opsz, weight, 100])
    l, t, r, b = f.getbbox(text)
    layer = Image.new('RGBA', (r - l + 4, b - t + 4), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text((2 - l, 2 - t), text, font=f, fill=fill)
    return layer.resize((round(target_width), layer.height), Image.LANCZOS), t


def lockup(theme, scale=8):
    W, H = 380 * scale, 120 * scale
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mark = social.mosaic(120 * scale)
    im.alpha_composite(mark, (0, 0))
    name_fill = WHITE if theme == 'dark' else INK
    sub_fill = GLINT if theme == 'dark' else MOSAIC_DEEP
    # "Johnny's": baseline y=66, size 50, weight ~760, stretched to 222 units wide
    name, top = text_layer("Johnny's", 50 * scale, 760, 50, name_fill, 222 * scale)
    asc = ImageFont.truetype(str(FONT), 50 * scale).getmetrics()[0]
    im.alpha_composite(name, (142 * scale, 66 * scale - asc + top - 2))
    # "Pool Services": baseline y=99, size 22, weight 500, 152 units wide
    sub, top = text_layer('Pool Services', 22 * scale, 500, 22, sub_fill, 152 * scale)
    asc = ImageFont.truetype(str(FONT), 22 * scale).getmetrics()[0]
    im.alpha_composite(sub, (144 * scale, 99 * scale - asc + top - 2))
    return im.crop(im.getbbox())


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    social.mosaic(1024).save(OUT / 'johnnys-pool-services-icon-1024.png')
    social.mosaic(512).save(OUT / 'johnnys-pool-services-icon-512.png')
    for theme, label in [('light', 'for-light-backgrounds'), ('dark', 'for-dark-backgrounds')]:
        lockup(theme).save(OUT / f'johnnys-pool-services-logo-{label}.png')
    for p in sorted(OUT.iterdir()):
        with Image.open(p) as i:
            print(p.name, i.size, p.stat().st_size // 1024, 'KB')
