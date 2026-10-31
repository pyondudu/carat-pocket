"""手錶用的 56 格・24 色角色圖：讀 watch/sprites/<id>/full/*.png（#watch 頁輸出的），寫到 px56/。

做法照 2026-10-31 試過的 Kimo 修法（tools/pixel_test.py）：格子化、一格取多數色、固定色盤、不加輪廓。
減色用 libimagequant（MEDIANCUT 會浪費色數在相近的膚色上，THEPALEE 腮紅變橄欖色）。
同一個角色的四個表情共用一組 24 色色盤（先把四張接在一起再減色），表情切換時顏色才不會跳；
色盤另存 palette.json，手錶可以直接當 8-bit 索引色用。

用法：python3 tools/watch_pixel.py [角色 id ...] [--sheet 對照總表.png]
"""
import json
import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent / 'watch' / 'sprites'
POSES = ['happy', 'sad', 'sick', 'sleep']
ROWS = 56
COLORS = 24
FONT = '/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc'


# src/face.ts 程式畫的五官顏色（眼淚、睡覺的 Z）：面積小，減色時會被併掉，固定保留
RESERVED = [(0x78, 0xb9, 0xf5), (0x3c, 0x78, 0xd2), (0x5a, 0x96, 0xe1)]


def shared_palette(imgs):
    """四張圖的不透明像素一起減色（透明處不算，不浪費色數），再加上保留色；回傳 PIL 的 P 模式色盤圖"""
    px = [p[:3] for img in imgs for p in img.getdata() if p[3] >= 128]
    strip = Image.new('RGB', (len(px), 1))
    strip.putdata(px)
    q = strip.quantize(COLORS - len(RESERVED), method=Image.Quantize.LIBIMAGEQUANT, dither=Image.Dither.NONE)  # MEDIANCUT 會把腮紅併掉
    pal = q.getpalette()[:(COLORS - len(RESERVED)) * 3]
    for c in RESERVED:
        pal += list(c)
    pal_img = Image.new('P', (1, 1))
    pal_img.putpalette(pal + pal[:3] * (256 - COLORS))  # 補滿 256 色用第一色，免得多出色盤外的黑色
    return pal_img


def pixelize(img, pal_img):
    w, h = img.size
    cols = round(w * ROWS / h)
    rgb = Image.new('RGB', img.size, (255, 255, 255))
    rgb.paste(img, mask=img.split()[3])
    q = rgb.quantize(palette=pal_img, dither=Image.Dither.NONE)
    pal = q.getpalette()
    qp, ap = q.load(), img.split()[3].load()
    out = Image.new('RGBA', (cols, ROWS), (0, 0, 0, 0))
    op = out.load()
    for cy in range(ROWS):
        for cx in range(cols):
            x0, x1 = cx * w // cols, (cx + 1) * w // cols
            y0, y1 = cy * h // ROWS, (cy + 1) * h // ROWS
            cnt, solid = Counter(), 0
            for y in range(y0, y1):
                for x in range(x0, x1):
                    if ap[x, y] >= 128:
                        solid += 1
                        cnt[qp[x, y]] += 1
            if solid * 2 >= (x1 - x0) * (y1 - y0):  # 一半以上不透明才算一格
                i = cnt.most_common(1)[0][0]
                op[cx, cy] = (*pal[i * 3:i * 3 + 3], 255)
    return out


def process(cid):
    src = [Image.open(ROOT / cid / 'full' / f'{p}.png').convert('RGBA') for p in POSES]
    pal_img = shared_palette(src)
    out_dir = ROOT / cid / 'px56'
    out_dir.mkdir(exist_ok=True)
    outs = []
    used = set()
    for p, img in zip(POSES, src):
        px = pixelize(img, pal_img)
        px.save(out_dir / f'{p}.png')
        outs.append(px)
        used |= {c[:3] for c in px.getdata() if c[3]}
    colors = sorted('#%02x%02x%02x' % c for c in used)
    (out_dir / 'palette.json').write_text(json.dumps({'size': list(outs[0].size), 'colors': colors}, indent=1) + '\n')
    return src, outs


def sheet(rows, path):
    """每列一個角色：四個表情的原圖與 56 格版並排（56 格版一格放大 3 倍）"""
    font = ImageFont.truetype(FONT, 16, index=3)
    bg = (238, 226, 210, 255)
    k, show = 3, ROWS * 3
    cell = 200
    img = Image.new('RGBA', (cell * 8, (show + 26) * len(rows) + 30), bg)
    d = ImageDraw.Draw(img)
    labels = ['開心', '難過', '生病', '睡覺']
    for i in range(8):
        d.text((cell * i + cell // 2, 14), labels[i % 4] + ('' if i < 4 else '・56格'), fill=(30, 30, 30), font=font, anchor='mm')
    for r, (cid, src, outs) in enumerate(rows):
        y = 30 + r * (show + 26)
        for i, s in enumerate(src):
            t = s.resize((round(s.width * show / s.height), show), Image.LANCZOS)
            img.alpha_composite(t, (cell * i + (cell - t.width) // 2, y))
        for i, o in enumerate(outs):
            t = o.resize((o.width * k, o.height * k), Image.NEAREST)
            img.alpha_composite(t, (cell * (4 + i) + (cell - t.width) // 2, y))
        d.text((6, y + show + 12), cid, fill=(30, 30, 30), font=font, anchor='lm')
    img.save(path)
    print(path, img.size)


def main():
    args = sys.argv[1:]
    out = None
    if '--sheet' in args:
        i = args.index('--sheet')
        out = args[i + 1]
        del args[i:i + 2]
    ids = args or sorted(p.name for p in ROOT.iterdir() if (p / 'full').is_dir())
    rows = []
    for cid in ids:
        src, outs = process(cid)
        rows.append((cid, src, outs))
        print(cid, outs[0].size)
    if out:
        sheet(rows, out)


if __name__ == '__main__':
    main()
