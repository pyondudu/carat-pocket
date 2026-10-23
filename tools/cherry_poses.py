#!/usr/bin/env python3
"""CHOITCHERRY 的難過／睡覺（搖飲料改用 sprites.py shake）：AI 畫其他表情時比例一直跑掉，改用已核准的開心版直接改臉、加道具。

用法：python3 tools/cherry_poses.py   （讀 assets-src/raw/choitcherry_happy.png，輸出同資料夾的 sad/sleep）
座標是開心版原圖（1024×1024）上的像素位置。
"""
import os

from PIL import Image, ImageDraw

RAW = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets-src", "raw")
INK = (23, 24, 24, 255)
RED = (196, 40, 58, 255)
BLUE = (90, 150, 225, 255)
SILVER = (172, 182, 198, 255)
SILVER_DARK = (108, 116, 134, 255)
SILVER_LIGHT = (205, 212, 224, 255)
SHINE = (250, 252, 255, 255)


def box(d, x0, y0, x1, y1, c=INK):
    d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=c)


def blank_face(im):
    """清掉眉毛、眼睛、睫毛、鼻子、嘴巴，用臉的白色蓋掉"""
    d = ImageDraw.Draw(im)
    white = im.getpixel((420, 480))
    box(d, 340, 420, 690, 612, white)
    return d


def nose(d):
    box(d, 480, 520, 542, 550, RED)


def happy_mouth(d):
    box(d, 500, 550, 522, 580)
    box(d, 458, 570, 478, 590); box(d, 544, 570, 566, 590)
    box(d, 480, 580, 542, 605)


def mirror_x(x0, x1):
    return 1024 + 12 - x1, 1024 + 12 - x0  # 臉的中線約在 x=518


def sad(im):
    d = blank_face(im)
    for x0, x1, y0 in ((372, 398, 452), (398, 424, 442), (424, 450, 432)):  # 八字眉（內側高）
        box(d, x0, y0, x1, y0 + 22)
        m0, m1 = mirror_x(x0, x1)
        box(d, m0, y0, m1, y0 + 22)
    for x0, x1, y0 in ((362, 388, 520), (388, 432, 504), (432, 456, 520)):  # 往下彎的眼睛
        box(d, x0, y0, x1, y0 + 22)
        m0, m1 = mirror_x(x0, x1)
        box(d, m0, y0, m1, y0 + 22)
    box(d, 376, 548, 398, 596, BLUE)  # 眼淚
    nose(d)
    box(d, 500, 550, 522, 570)  # 倒過來的嘴
    box(d, 478, 570, 544, 588)
    box(d, 458, 588, 478, 606); box(d, 544, 588, 566, 606)


def sleep(im):
    d = blank_face(im)
    for x0, x1, y0 in ((360, 384, 500), (384, 432, 516), (432, 456, 500)):  # 閉著的眼睛
        box(d, x0, y0, x1, y0 + 22)
        m0, m1 = mirror_x(x0, x1)
        box(d, m0, y0, m1, y0 + 22)
    nose(d)
    box(d, 500, 550, 522, 572)
    box(d, 488, 580, 534, 598)
    # 頭上的 Z（藍色，不算進身高）
    for x, y, s in ((780, 330, 14), (850, 190, 20)):
        box(d, x, y, x + 5 * s, y + s, BLUE)
        for i in range(1, 4):
            box(d, x + (4 - i) * s, y + i * s, x + (5 - i) * s, y + (i + 1) * s, BLUE)
        box(d, x, y + 4 * s, x + 5 * s, y + 5 * s, BLUE)


def main():
    src = Image.open(os.path.join(RAW, "choitcherry_happy.png")).convert("RGBA")
    for name, fn in (("sad", sad), ("sleep", sleep)):
        im = src.copy()
        fn(im)
        im.save(os.path.join(RAW, f"choitcherry_{name}.png"))
        print(name)


if __name__ == "__main__":
    main()
