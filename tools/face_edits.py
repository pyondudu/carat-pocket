#!/usr/bin/env python3
"""從開心版直接改出難過／睡覺版（AI 畫的比例或顏色跑掉的角色用）：清掉原本的眼睛、嘴巴，畫上新的，加眼淚或 Z。

用法：python3 tools/face_edits.py            全部重做
      python3 tools/face_edits.py <id>...   只做這幾隻
讀 assets-src/raw/<id>_happy.png，輸出 <id>_<pose>.png（原本 AI 畫的另存成 _ai.png）。
座標是開心版原圖（1024×1024）上的像素位置。
"""
import os
import shutil
import sys

from PIL import Image, ImageDraw

RAW = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets-src", "raw")
INK = (23, 22, 20, 255)
TEAR = (120, 185, 245, 255)
TEAR_EDGE = (60, 120, 210, 255)
Z_BLUE = (90, 150, 225, 255)


def arc_down(x0, y, w, t=16):
    """閉著的眼睛 ︶：兩端高、中間低"""
    e = w // 5
    return [(x0, y, x0 + e, y + t), (x0 + e, y + t, x0 + w - e, y + 2 * t), (x0 + w - e, y, x0 + w, y + t)]


def arc_up(x0, y, w, t=16):
    """難過的眼睛 ︵：中間高、兩端低"""
    e = w // 5
    return [(x0, y + t, x0 + e, y + 2 * t), (x0 + e, y, x0 + w - e, y + t), (x0 + w - e, y + t, x0 + w, y + 2 * t)]


# (角色, 表情)：fill＝[(範圍, 取色點)] 先蓋掉原本的五官；ink＝黑色方塊；tear＝眼淚；z＝頭上加 Z
EDITS = {
    ("shuasum", "sad"): {
        "fill": [((436, 548, 584, 640), (450, 560))],
        "ink": [(500, 545, 510, 572), (476, 572, 544, 590), (456, 590, 476, 610), (544, 590, 564, 610),
                (330, 404, 356, 418), (356, 394, 382, 408), (612, 394, 638, 408), (638, 404, 664, 418)],
        "tear": (368, 556, 400, 604),
    },
    ("shuasum", "sleep"): {
        "fill": [((322, 424, 452, 548), (300, 560)), ((566, 424, 692, 548), (720, 560)), ((436, 548, 584, 640), (450, 560))],
        "ink": arc_down(330, 482, 115, 18) + arc_down(572, 482, 115, 18) + [(500, 545, 510, 575), (484, 575, 536, 592)],
        "z": True,
    },
    ("thepalee", "sad"): {
        "fill": [((405, 343, 615, 414), (520, 430))],
        "ink": [(458, 362, 570, 388), (430, 388, 458, 412), (570, 388, 598, 412)],
        "tear": (334, 362, 364, 420),
    },
    ("foxdungee", "sleep"): {
        "fill": [((395, 407, 452, 466), (330, 450)), ((625, 407, 683, 466), (590, 450))],
        "ink": arc_down(335, 434, 110, 15) + arc_down(592, 434, 110, 15),
        "z": True,
    },
    ("ppyopuli", "sleep"): {
        "fill": [((348, 414, 414, 490), (330, 450)), ((608, 426, 704, 474), (720, 420))],
        "ink": arc_down(345, 436, 84, 22) + arc_down(612, 436, 84, 22),
        "z": True,
    },
    ("thepalee", "sleep"): {
        "fill": [((240, 146, 398, 362), (520, 250)), ((628, 146, 782, 362), (520, 250))],
        "ink": arc_down(258, 250, 120, 24) + arc_down(648, 250, 120, 24),
        "z": True,
    },
    ("foxdungee", "sad"): {
        "fill": [((490, 534, 550, 566), (470, 560))],
        "ink": [(506, 540, 534, 548), (498, 548, 506, 558), (534, 548, 542, 558)],
        "tear": (420, 494, 442, 534),
    },
    ("kimja", "sad"): {
        "fill": [((405, 520, 575, 588), (500, 600))],
        "ink": [(440, 530, 540, 552), (418, 552, 440, 574), (540, 552, 562, 574)],
        "tear": (360, 506, 388, 556),
    },
    ("doa", "sad"): {
        "fill": [((430, 466, 600, 538), None), ((468, 538, 562, 570), None), ((396, 296, 432, 330), None), ((588, 296, 628, 330), None)],
        "ink": [(500, 458, 525, 482), (474, 482, 550, 500), (454, 500, 474, 518), (550, 500, 570, 518),
                (398, 312, 414, 326), (414, 300, 430, 314), (594, 300, 610, 314), (610, 312, 626, 326)],
        "tear": (410, 438, 432, 482),
    },
    ("kimja", "sleep"): {
        "fill": [((312, 320, 445, 498), None), ((538, 320, 672, 498), None), ((330, 496, 420, 508), None), ((566, 496, 648, 508), None)],
        "ink": arc_down(322, 420, 112, 22) + arc_down(550, 420, 112, 22),
        "z": True,
    },
    ("doa", "sleep"): {
        "fill": [((392, 362, 454, 438), None), ((568, 362, 630, 438), None)],
        "ink": arc_down(390, 392, 66, 14) + arc_down(566, 392, 66, 14),
        "z": True,
    },
    ("jjongtoram", "sad"): {
        "fill": [((460, 538, 558, 618), None)],
        "ink": [(384, 424, 410, 436), (410, 414, 440, 426), (578, 414, 608, 426), (608, 424, 634, 436)]
               + arc_up(470, 560, 80, 14),
        "tear": (403, 520, 431, 566),
    },
    ("jjongtoram", "sleep"): {
        "fill": [((398, 445, 438, 520), None), ((582, 445, 622, 520), None)],
        "ink": arc_down(388, 472, 60, 12) + arc_down(572, 472, 60, 12),
        "z": True,
    },
    ("bboogyuli", "sad"): {
        "fill": [((470, 545, 580, 600), None)],
        "ink": [(336, 354, 372, 368), (372, 342, 410, 356), (616, 342, 654, 356), (654, 354, 690, 368)]
               + arc_up(490, 560, 70, 12),
        "tear": (360, 548, 388, 598),
    },
    ("bboogyuli", "sleep"): {
        "fill": [((326, 370, 446, 550), None), ((580, 370, 698, 550), None)],
        "ink": arc_down(340, 450, 96, 16) + arc_down(592, 450, 96, 16),
        "z": True,
    },
    ("ppyopuli", "sad"): {
        "fill": [((348, 414, 414, 490), (330, 450)), ((608, 426, 704, 474), (720, 420)), ((462, 466, 545, 606), (330, 450))],
        "ink": arc_up(345, 436, 84, 22) + arc_up(612, 436, 84, 22)
               + [(478, 520, 538, 544), (456, 544, 478, 568), (538, 544, 560, 568)],
        "tear": (370, 478, 396, 524),
    },
    ("nonver", "sad"): {
        "tear": (398, 424, 420, 446),
    },
    ("nonver", "sleep"): {
        "fill": [((382, 346, 462, 424), (480, 380)), ((560, 346, 642, 424), (480, 380))],
        "ink": arc_down(390, 372, 72, 13) + arc_down(566, 372, 72, 13),
        "z": True,
    },
    ("chandalee", "sad"): {
        "fill": [((355, 315, 462, 415), (300, 380)), ((563, 315, 670, 415), (720, 380)),
                 ((388, 415, 462, 450), (450, 455)), ((563, 415, 640, 450), (580, 455)),
                 ((420, 452, 606, 520), (450, 455))],
        "ink": [(372, 352, 402, 366), (402, 340, 432, 354), (593, 340, 623, 354), (623, 352, 653, 366)]
               + arc_up(378, 392, 80, 14) + arc_up(567, 392, 80, 14)
               + [(505, 447, 520, 470), (472, 470, 553, 486), (452, 486, 472, 502), (553, 486, 573, 502)],
        "tear": (400, 424, 424, 470),
    },
    ("chandalee", "sleep"): {
        "fill": [((355, 315, 462, 415), (300, 380)), ((563, 315, 670, 415), (720, 380)),
                 ((388, 415, 462, 450), (450, 455)), ((563, 415, 640, 450), (580, 455))],
        "ink": arc_down(378, 398, 80, 14) + arc_down(567, 398, 80, 14),
        "z": True,
    },
}


def draw_z(d, x, y, s):
    d.rectangle([x, y, x + 5 * s - 1, y + s - 1], fill=Z_BLUE)
    for i in range(1, 4):
        d.rectangle([x + (4 - i) * s, y + i * s, x + (5 - i) * s - 1, y + (i + 1) * s - 1], fill=Z_BLUE)
    d.rectangle([x, y + 4 * s, x + 5 * s - 1, y + 5 * s - 1], fill=Z_BLUE)


def strip_color(src, xs, y):
    """xs 範圍內、y 上下幾列的皮膚色中位數（略過黑線和透明）"""
    px = [src.getpixel((x, yy)) for x in xs for yy in range(y - 3, y + 4)
          if 0 <= x < src.width and 0 <= yy < src.height]
    px = [p for p in px if p[3] > 200 and sum(p[:3]) > 300]
    if not px:
        return None
    return tuple(sorted(c[i] for c in px)[len(px) // 2] for i in range(3))


def blend_fill(im, src, x0, y0, x1, y1):
    """取色點為 None：每一列用左右兩側的膚色漸變填，才不會出現色塊"""
    last = None
    for y in range(y0, y1):
        a = strip_color(src, range(x0 - 10, x0 - 2), y)
        b = strip_color(src, range(x1 + 2, x1 + 10), y)
        a, b = a or b or last, b or a or last
        if a is None:
            continue
        last = a
        for x in range(x0, x1):
            t = (x - x0) / max(1, x1 - x0 - 1)
            im.putpixel((x, y), tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3)) + (255,))


def make(cid, pose):
    cfg = EDITS[cid, pose]
    dest = os.path.join(RAW, f"{cid}_{pose}.png")
    ai = os.path.join(RAW, f"{cid}_{pose}_ai.png")
    if os.path.isfile(dest) and not os.path.isfile(ai):
        shutil.copy(dest, ai)  # AI 畫的留著比較
    im = Image.open(os.path.join(RAW, f"{cid}_happy.png")).convert("RGBA")
    d = ImageDraw.Draw(im)
    src = im.copy()
    for (x0, y0, x1, y1), pt in cfg.get("fill", []):
        if pt is None:
            blend_fill(im, src, x0, y0, x1, y1)
        else:
            d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=im.getpixel(pt))
    for x0, y0, x1, y1 in cfg.get("ink", []):
        d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=INK)
    if "tear" in cfg:
        x0, y0, x1, y1 = cfg["tear"]
        d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=TEAR_EDGE)
        d.rectangle([x0 + 6, y0, x1 - 7, y1 - 7], fill=TEAR)
    if cfg.get("z"):
        l, t, r, b = im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
        x = min(r - 20, im.width - 200)
        draw_z(d, x + 70, max(4, t - 20), 20)
        draw_z(d, x, max(4, t - 20) + 110, 14)
    im.save(dest)
    print(cid, pose)


if __name__ == "__main__":
    want = set(sys.argv[1:])
    for cid, pose in EDITS:
        if not want or cid in want:
            make(cid, pose)
