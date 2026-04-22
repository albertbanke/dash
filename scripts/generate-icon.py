#!/usr/bin/env python3
"""Generate Dash app icon (Scandi gradient) in all required sizes and formats."""

import os
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / 'build'
ICONSET = BUILD / 'icon.iconset'

SIZE = 1024
RADIUS_RATIO = 0.2237  # macOS Big Sur+ squircle approximation

TOP = (46, 48, 54)        # lifted charcoal    #2E3036
BOTTOM = (7, 7, 9)        # near-black         #070709
MARK = (242, 237, 224)    # warm paper         #F2EDE0
FONT_PATH = '/System/Library/Fonts/SFNS.ttf'


def gradient_fill(size):
    img = Image.new('RGB', (size, size), TOP)
    pixels = img.load()
    denom = 2 * (size - 1)
    for y in range(size):
        for x in range(size):
            t = (x + y) / denom
            r = round(TOP[0] * (1 - t) + BOTTOM[0] * t)
            g = round(TOP[1] * (1 - t) + BOTTOM[1] * t)
            b = round(TOP[2] * (1 - t) + BOTTOM[2] * t)
            pixels[x, y] = (r, g, b)
    return img


def draw_mark(img):
    size = img.width
    font = ImageFont.truetype(FONT_PATH, int(size * 0.15))
    overlay = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    bbox = draw.textbbox((0, 0), 'd', font=font)
    d_w = bbox[2] - bbox[0]
    d_h = bbox[3] - bbox[1]

    dash_w = int(d_w * 0.9)
    dash_h = max(2, int(size * 0.016))
    gap = int(d_w * 0.25)

    total_w = d_w + gap + dash_w
    margin_r = int(size * 0.11)
    margin_b = int(size * 0.12)

    x_d = size - margin_r - total_w
    y_baseline = size - margin_b
    y_d = y_baseline - d_h - bbox[1]

    draw.text((x_d, y_d), 'd', font=font, fill=MARK)

    x_dash = x_d + d_w + gap
    y_dash = y_baseline - dash_h
    draw.rectangle(
        [(x_dash, y_dash), (x_dash + dash_w, y_dash + dash_h)],
        fill=MARK,
    )

    img.alpha_composite(overlay)


def rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size, size)], radius=radius, fill=255
    )
    return mask


def make_icon(size):
    # Work at higher res then downsample for smoother edges at small sizes
    scale = 4 if size <= 128 else 1
    work = size * scale
    base = gradient_fill(work).convert('RGBA')
    draw_mark(base)
    mask = rounded_mask(work, int(work * RADIUS_RATIO))
    out = Image.new('RGBA', (work, work), (0, 0, 0, 0))
    out.paste(base, (0, 0), mask)
    if scale > 1:
        out = out.resize((size, size), Image.LANCZOS)
    return out


def main():
    ICONSET.mkdir(parents=True, exist_ok=True)
    sizes = [
        (16, 'icon_16x16.png'),
        (32, 'icon_16x16@2x.png'),
        (32, 'icon_32x32.png'),
        (64, 'icon_32x32@2x.png'),
        (128, 'icon_128x128.png'),
        (256, 'icon_128x128@2x.png'),
        (256, 'icon_256x256.png'),
        (512, 'icon_256x256@2x.png'),
        (512, 'icon_512x512.png'),
        (1024, 'icon_512x512@2x.png'),
    ]
    cache = {}
    for size, name in sizes:
        if size not in cache:
            cache[size] = make_icon(size)
        cache[size].save(ICONSET / name)
        print(f'wrote {name} ({size}x{size})')

    # Also emit a master 1024 png for any other use
    cache[1024].save(BUILD / 'icon.png')
    print('wrote build/icon.png')

    # Produce .icns via iconutil (macOS only)
    subprocess.run(
        ['iconutil', '-c', 'icns', str(ICONSET), '-o', str(BUILD / 'icon.icns')],
        check=True,
    )
    print('wrote build/icon.icns')


if __name__ == '__main__':
    main()
