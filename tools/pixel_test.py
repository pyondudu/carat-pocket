"""試驗 Kimo 修法：格子化、一格一色（取多數色）、固定色盤、補輪廓。只輸出對照圖，不動遊戲。"""
import sys
from collections import Counter
from PIL import Image, ImageDraw, ImageFont

ROOT = str(__import__('pathlib').Path(__file__).resolve().parent.parent / 'public' / 'sprites')
OUT = sys.argv[1]
SHOW_H = 168  # 遊戲裡角色圖的顯示高度
FONT = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc', 16, index=3)


def pixelize(img, rows, colors, outline):
    w, h = img.size
    cols = round(w * rows / h)
    rgb = Image.new('RGB', img.size, (255, 255, 255))
    rgb.paste(img, mask=img.split()[3])
    q = rgb.quantize(colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette()
    qp, ap = q.load(), img.split()[3].load()
    out = Image.new('RGBA', (cols, rows), (0, 0, 0, 0))
    op = out.load()
    for cy in range(rows):
        for cx in range(cols):
            x0, x1 = cx * w // cols, (cx + 1) * w // cols
            y0, y1 = cy * h // rows, (cy + 1) * h // rows
            cnt, solid = Counter(), 0
            for y in range(y0, y1):
                for x in range(x0, x1):
                    if ap[x, y] >= 128:
                        solid += 1
                        cnt[qp[x, y]] += 1
            if solid * 2 >= (x1 - x0) * (y1 - y0):  # 一半以上不透明才算一格
                i = cnt.most_common(1)[0][0]
                op[cx, cy] = (*pal[i * 3:i * 3 + 3], 255)
    if outline:
        dark = (40, 30, 40, 255)
        src = out.copy().load()
        for cy in range(rows):
            for cx in range(cols):
                if src[cx, cy][3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if 0 <= nx < cols and 0 <= ny < rows and src[nx, ny][3]:
                        op[cx, cy] = dark
                        break
    return out.resize((round(cols * SHOW_H / rows), SHOW_H), Image.NEAREST)


def tile(img, label, bg):
    t = Image.new('RGBA', (220, SHOW_H + 30), bg)
    t.alpha_composite(img, ((220 - img.width) // 2, 0))
    ImageDraw.Draw(t).text((110, SHOW_H + 14), label, fill=(30, 30, 30), font=FONT, anchor='mm')
    return t


VARIANTS = [(42, 16, False, '42格・16色'), (42, 32, True, '42格・32色・輪廓'),
            (56, 24, False, '56格・24色'), (70, 32, False, '70格・32色')]
BG = (238, 226, 210, 255)  # 接近房間牆面的米色
rows = []
for cid in sys.argv[2:]:
    src = Image.open(f'{ROOT}/{cid}/happy.png').convert('RGBA')
    orig = src.resize((round(src.width * SHOW_H / src.height), SHOW_H), Image.LANCZOS)
    tiles = [tile(orig, f'{cid} 原圖', BG)]
    tiles += [tile(pixelize(src, r, c, o), lab, BG) for r, c, o, lab in VARIANTS]
    row = Image.new('RGBA', (sum(t.width for t in tiles), tiles[0].height), BG)
    x = 0
    for t in tiles:
        row.alpha_composite(t, (x, 0)); x += t.width
    rows.append(row)
sheet = Image.new('RGBA', (rows[0].width, sum(r.height for r in rows)), BG)
y = 0
for r in rows:
    sheet.alpha_composite(r, (0, y)); y += r.height
sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST)
sheet.save(OUT)
print(OUT, sheet.size)
