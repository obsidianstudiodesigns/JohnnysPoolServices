"""Builds the link-preview image and app icons from the Mosaic logo.

Run: python tools/make-social.py   (needs Pillow)
Outputs: assets/brand/og-image.jpg, apple-touch-icon.png, icon-192.png, icon-512.png, favicon-32.png
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'brand'
FONT = ROOT / 'tools' / 'fonts' / 'BricolageGrotesque.ttf'
ABYSS, GLINT, WHITE = (4, 48, 63), (191, 244, 247), (247, 252, 252)
TONES = ['#16a9c2', '#0b7f98', '#0a6d86', '#1394ad', '#0b7f98', '#0c5f75']
J = ['.XXXX', '...X.', '...X.', 'X..X.', '.XX..']


def font(size, weight='Bold', opsz=96):
    f = ImageFont.truetype(str(FONT), size)
    f.set_variation_by_axes([opsz, {'Regular': 400, 'Medium': 500, 'SemiBold': 600, 'Bold': 700, 'ExtraBold': 800}[weight], 100])
    return f


def mosaic(size, square_bg=False):
    """The Mosaic mark, drawn with the same layout and colour order as js/logos-data.js."""
    k = 4
    s = size * k / 120
    im = Image.new('RGBA', (size * k, size * k), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if square_bg:
        d.rectangle([0, 0, size * k, size * k], fill=ABYSS)
    else:
        d.rounded_rectangle([0, 0, size * k - 1, size * k - 1], radius=20 * s, fill=ABYSS)
    seed, t, g, o = 11, 21.2, 2.4, 3.4
    for r in range(5):
        for q in range(5):
            seed = (seed * 16807) % 2147483647
            fill = WHITE if J[r][q] == 'X' else TONES[seed % len(TONES)]
            x, y = (o + q * (t + g)) * s, (o + r * (t + g)) * s
            d.rounded_rectangle([x, y, x + t * s, y + t * s], radius=3.2 * s, fill=fill)
    return im.resize((size, size), Image.LANCZOS)


def og_image():
    W, H, k = 1200, 630, 2
    im = Image.new('RGB', (W * k, H * k), ABYSS)
    photo = Image.open(ROOT / 'assets' / 'work' / 'balau-deck-plunge-pool-1600.jpg').convert('RGB')
    pw = 640 * k
    scale = max(pw / photo.width, H * k / photo.height)
    photo = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS)
    left = (photo.width - pw) // 2 + 60 * k
    photo = photo.crop((left, 0, left + pw, H * k))
    im.paste(photo, (W * k - pw, 0))
    # fade the photo into the dark panel
    fade = Image.new('L', (220 * k, H * k))
    fd = ImageDraw.Draw(fade)
    for x in range(220 * k):
        fd.line([(x, 0), (x, H * k)], fill=int(255 * (1 - x / (220 * k)) ** 1.6))
    im.paste(Image.new('RGB', fade.size, ABYSS), (W * k - pw, 0), fade)

    d = ImageDraw.Draw(im)
    im.paste(mosaic(132 * k), (72 * k, 70 * k), mosaic(132 * k))
    x = 72 * k
    d.text((x, 236 * k), "Johnny's", font=font(96 * k, 'ExtraBold'), fill=WHITE)
    d.text((x + 3 * k, 340 * k), 'Pool Services', font=font(44 * k, 'Medium'), fill=GLINT)
    body = font(28 * k, 'Regular', 24)
    for i, line in enumerate(['Pool repairs, cleaning, pumps, heating', 'and decking across Cape Town', 'and the Western Cape']):
        d.text((x + 3 * k, (404 + i * 36) * k), line, font=body, fill=(210, 230, 233))
    phone = font(30 * k, 'Bold')
    label = 'Call 061 765 8479'
    tw = d.textlength(label, font=phone)
    d.rounded_rectangle([x, 530 * k, x + tw + 56 * k, 588 * k], radius=16 * k, fill=GLINT)
    d.text((x + 28 * k, 559 * k), label, font=phone, fill=ABYSS, anchor='lm')
    im.resize((W, H), Image.LANCZOS).save(OUT / 'og-image.jpg', quality=86, optimize=True, progressive=True)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    og_image()
    mosaic(180, square_bg=True).save(OUT / 'apple-touch-icon.png')
    mosaic(192).save(OUT / 'icon-192.png')
    mosaic(512).save(OUT / 'icon-512.png')
    mosaic(32).save(OUT / 'favicon-32.png')
    for p in sorted(OUT.iterdir()):
        print(p.name, p.stat().st_size // 1024, 'KB')
