#!/usr/bin/env python3
"""無五官底圖＋五官位置：表情改由遊戲用程式畫（src/face.ts），身體永遠是同一張核准的開心版，不會跑掉。

用法：python3 tools/face_rig.py            全部重做
      python3 tools/face_rig.py <id>...   只做這幾隻
讀 assets-src/raw/<id>_happy.png → 清掉眼睛、嘴巴存成 <id>_base.png → 跑 sprites.py 的 process
→ 把五官範圍換算成 public/sprites/<id>/ 的座標，寫進 src/data/faces.json。
開心時遊戲直接從 happy.png 複製這些範圍（原本的眼睛、嘴巴），其他表情才用程式畫。
座標是開心版原圖（1024×1024）上的像素位置。
"""
import json
import os
import sys

from PIL import Image, ImageDraw

from face_edits import RAW, blend_fill
from sprites import ROOT, process

FACES_JSON = os.path.join(ROOT, "src", "data", "faces.json")

# eyes＝[左眼, 右眼]、mouth＝嘴巴，各是要清掉的範圍清單：(x0, y0, x1, y1) 用左右膚色漸變填，
#   ((x0, y0, x1, y1), 取色點) 用那一點的顏色填，((x0, y0, x1, y1), x) 每一列用第 x 欄同一列的顏色填（有明暗的臉）
#   （範圍大多沿用 face_edits.py 量過的）
# cell＝原圖一格像素的大小；closed＝開心版本來就是閉眼／瞇眼（不眨眼，難過時改畫睜開的眼睛）
# nose＝嘴巴從鼻子往下接一條線；brows＝自己有眉毛（難過時不另外畫八字眉）
RIGS = {
    "choitcherry": {
        "cell": 30, "closed": True, "nose": True,
        "eyes": [[(352, 428, 458, 556)], [(572, 428, 680, 556)]],
        "mouth": [(458, 552, 574, 606)],
    },
    "jjongtoram": {
        "cell": 31, "closed": True,
        "eyes": [[(398, 445, 438, 520)], [(582, 445, 622, 520)]],
        "mouth": [(460, 538, 558, 618)],
    },
    "shuasum": {
        "cell": 30,
        "eyes": [[((322, 424, 452, 548), (300, 560))], [((566, 424, 692, 548), (720, 560))]],
        "mouth": [((436, 548, 584, 640), (450, 560))],
    },
    "tamtam": {
        "cell": 24, "closed": True, "nose": True,
        "eyes": [[(322, 340, 442, 398)], [(584, 340, 708, 398)]],
        "mouth": [(410, 425, 618, 516)],
    },
    "foxdungee": {
        "cell": 30,
        "eyes": [[((395, 407, 452, 466), (330, 450))], [((625, 407, 683, 466), (590, 450))]],
        "mouth": [((490, 534, 550, 566), (470, 560))],
    },
    "ppyopuli": {
        "cell": 33,
        "eyes": [[((348, 414, 414, 490), (330, 450))], [((608, 426, 704, 474), (720, 420))]],
        "mouth": [((462, 466, 545, 616), (330, 450))],
    },
    "thepalee": {
        "cell": 28,
        "eyes": [[((240, 146, 398, 362), (520, 250))], [((628, 146, 782, 362), (520, 250))]],
        "mouth": [((405, 343, 615, 414), (520, 430))],
    },
    "kimja": {
        "cell": 26,
        "eyes": [[(312, 320, 445, 498), (330, 496, 420, 508)], [(538, 320, 672, 498), (566, 496, 648, 508)]],
        "mouth": [(405, 520, 575, 588)],
    },
    "doa": {
        "cell": 27, "brows": True,
        "eyes": [[(392, 362, 454, 438)], [(568, 362, 630, 438)]],
        "mouth": [(430, 466, 600, 538), (468, 538, 562, 570)],
    },
    "bboogyuli": {
        "cell": 25,
        "eyes": [[(326, 370, 446, 550)], [(580, 370, 698, 550)]],
        "mouth": [(470, 545, 580, 600)],
    },
    "nonver": {  # 帽子開口只露出眼睛和眉毛，沒有嘴巴
        "cell": 24, "brows": True,
        "eyes": [[((382, 346, 462, 424), 512)], [((560, 346, 642, 424), 512)]],
        "mouth": [],
    },
    "chandalee": {  # 眼睛範圍含眉毛
        "cell": 30, "brows": True,
        "eyes": [[((355, 315, 462, 415), (300, 380)), ((388, 415, 462, 450), (450, 455))],
                 [((563, 315, 670, 415), (720, 380)), ((563, 415, 640, 450), (580, 455))]],
        "mouth": [((420, 452, 606, 520), (450, 455))],
    },
}


def rect_of(r):
    return r[0] if isinstance(r[0], tuple) else r


def union(rects):
    rs = [rect_of(r) for r in rects]
    return (min(r[0] for r in rs), min(r[1] for r in rs), max(r[2] for r in rs), max(r[3] for r in rs))


def make_base(cid, rig):
    im = Image.open(os.path.join(RAW, f"{cid}_happy.png")).convert("RGBA")
    src = im.copy()
    d = ImageDraw.Draw(im)
    for r in [r for eye in rig["eyes"] for r in eye] + rig["mouth"]:
        (x0, y0, x1, y1), pt = (r, None) if not isinstance(r[0], tuple) else r
        if pt is None:
            blend_fill(im, src, x0, y0, x1, y1)
        elif isinstance(pt, int):
            for y in range(y0, y1):
                d.line([x0, y, x1 - 1, y], fill=src.getpixel((pt, y)))
        else:
            d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=src.getpixel(pt))
    im.save(os.path.join(RAW, f"{cid}_base.png"))
    return im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()


def to_sprite(layout, box):
    s = layout["scale"]
    x0, y0, x1, y1 = box
    return [round((x0 - layout["x0"]) * s + layout["dx"], 1), round((y0 - layout["y0"]) * s + layout["dy"], 1),
            round((x1 - layout["x0"]) * s + layout["dx"], 1), round((y1 - layout["y0"]) * s + layout["dy"], 1)]


def main():
    want = sys.argv[1:] or list(RIGS)
    faces = json.load(open(FACES_JSON)) if os.path.isfile(FACES_JSON) else {}
    for cid in want:
        rig = RIGS[cid]
        l, t, r, _ = make_base(cid, rig)
        layout = process(cid, only={"base"})
        top = to_sprite(layout, ((l + r) // 2, t, (l + r) // 2, t))
        faces[cid] = {
            "cell": round(rig["cell"] * layout["scale"], 2),
            "eyes": [to_sprite(layout, union(e)) for e in rig["eyes"]],
            "mouth": to_sprite(layout, union(rig["mouth"])) if rig["mouth"] else None,
            "closed": rig.get("closed", False),
            "nose": rig.get("nose", False),
            "brows": rig.get("brows", False),
            "top": top[:2],
        }
        print(f"{cid}：底圖與五官位置")
    with open(FACES_JSON, "w") as f:  # 一隻一行，方便看 diff
        f.write("{\n" + ",\n".join(f' "{k}": {json.dumps(v)}' for k, v in faces.items()) + "\n}\n")


if __name__ == "__main__":
    main()
