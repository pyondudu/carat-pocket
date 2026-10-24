"""13 個特殊食物的像素圖（16 格，一個字一格，'.' 透明），風格統一（使用者 2026-10-24 要求，不用表情符號）。

用法：python3 tools/food_icons.py → public/icons/food/<名稱>.png（放大 4 倍）、以及總表 food_sheet.png（給人看，不進遊戲）
遊戲裡用 characters.ts 的 specialIcon: 'img:<名稱>'。
"""
import sys
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "icons" / "food"

INK = (74, 56, 48)  # 外框（所有食物共用）

# 每個食物：(像素圖, 顏色)；'o' 一律是外框
FOODS: dict[str, tuple[list[str], dict[str, tuple[int, int, int]]]] = {
    # 烤豬頸肉：烤盤上的肉片，深色烤痕＋油花
    "porkjowl": (
        [
            "....oooooooo....",
            "..ooMMMMMMMMoo..",
            ".oMMgMMMgMMMFMo.",
            ".oMFMgMMMgMMMMo.",
            "oMMMMMgMMMgMMMMo",
            "oMFFMMMgMMMgMFMo",
            "oMMMgMMMgMMMgMMo",
            ".oMMMgMMMgMMMMo.",
            ".oMFMMgMMMgMFMo.",
            "..ooMMMgMMMMoo..",
            "....oooooooo....",
        ],
        {"M": (222, 140, 104), "g": (128, 66, 44), "F": (252, 226, 208)},
    ),
    # 部隊鍋：紅湯、泡麵、香腸片，兩邊有鍋耳
    "armystew": (
        [
            "....y.s...y.....",
            "...yyss..yyr....",
            "..oooooooooooo..",
            "ooRRyRsRRRyRsRoo",
            "o.oRRRRRyRRRRo.o",
            "o.oRsRRRRRsRRo.o",
            "oooKKKKKKKKKKooo",
            "...oKKKKKKKKo...",
            "....oooooooo....",
        ],
        {"y": (246, 208, 96), "s": (232, 120, 110), "r": (232, 120, 110), "R": (226, 86, 58), "K": (96, 96, 108)},
    ),
    # 牛排：烤痕＋旁邊一圈油花
    "steak": (
        [
            "...oooooooo.....",
            "..oBBBBBBBBoo...",
            ".oBdBBBdBBBBBo..",
            ".oBBdBBBdBBBBBo.",
            ".oBBBdBBBdBBBFo.",
            "..oBBBBdBBBBFFo.",
            "...ooBBBBBFFoo..",
            ".....ooooooo....",
        ],
        {"B": (156, 84, 54), "d": (92, 46, 30), "F": (242, 218, 192)},
    ),
    # 螺螄粉：白碗、紅湯、米粉、青菜、花生
    "luosifen": (
        [
            "....W..g..p.....",
            "...WWW.gg.pp....",
            "oooooooooooooooo",
            "oRWWRRWWRgRWWRRo",
            ".oRRWWRRpRRWWRo.",
            ".oBBBBBBBBBBBBo.",
            "..oBBBBBBBBBBo..",
            "...oBBBBBBBBo...",
            "....oooooooo....",
            "......oooo......",
        ],
        {"W": (250, 246, 236), "g": (110, 170, 80), "p": (204, 152, 92), "R": (214, 74, 52), "B": (236, 232, 224)},
    ),
    # 泡菜：紅色白菜疊在小碟子上
    "kimchi": (
        [
            "......oo........",
            ".....oRRo.oo....",
            "....oRrRRoRRo...",
            "...oRRrRRRrRo...",
            "..oRrRRrRRRrRo..",
            "..oRRYrRRYRRRo..",
            ".oRrRRRRYRRrRRo.",
            "oooooooooooooooo",
            "oDDDDDDDDDDDDDDo",
            ".oooooooooooooo.",
        ],
        {"R": (214, 62, 52), "r": (160, 40, 36), "Y": (250, 212, 172), "D": (200, 216, 232)},
    ),
    # 火雞麵：黑碗、紅色捲麵、筷子
    "buldak": (
        [
            "............cc..",
            "...........cc...",
            "..........cc....",
            "...NnNnNncNnN...",
            "..NnNnNnNcnNnN..",
            "oooooooooooooooo",
            ".oKKKKKKKKKKKKo.",
            ".oKKKKKKKKKKKKo.",
            "..oKKKKKKKKKKo..",
            "...oKKKKKKKKo...",
            "....oooooooo....",
        ],
        {"N": (224, 72, 40), "n": (168, 40, 28), "c": (176, 124, 72), "K": (52, 46, 52)},
    ),
    # 海苔：兩片疊在一起，有一點反光
    "seaweed": (
        [
            "....oooooooooo..",
            "...oGGGGGGGGGGo.",
            "..oooooooooooGo.",
            "..oGgGGGGGGGoGo.",
            "..oGGGGhGGGGoGo.",
            "..oGGGGGGGgGoGo.",
            "..oGhGGGGGGGoGo.",
            "..oGGGGgGGGGooo.",
            "..oGGGGGGGhGo...",
            "..oGgGGGGGGGo...",
            "..ooooooooooo...",
        ],
        {"G": (40, 70, 46), "g": (66, 106, 60), "h": (112, 150, 92)},
    ),
    # 小籠包：從頂端放射的摺子（🥟 是水餃，所以自己畫）
    "xiaolongbao": (
        [
            ".......oo.......",
            "......oPPo......",
            ".....oPWpPo.....",
            "....oWpWPWpo....",
            "...oWPWWpWWPo...",
            "..oWpWWWPWWWpo..",
            ".oWWPWWWpWWWPWo.",
            ".oWHpWWWPWWWpWo.",
            "oWHWWWWWWWWWWWWo",
            "oWHWWWWWWWWWWWSo",
            "oWWWWWWWWWWWWSSo",
            ".oSSSSSSSSSSSSo.",
            "..oooooooooooo..",
        ],
        {"W": (250, 244, 232), "p": (214, 196, 168), "P": (176, 150, 116), "S": (226, 211, 186), "H": (255, 255, 255)},
    ),
    # 洋芋片：紅色袋子、白標籤上有黃色洋芋片
    "chips": (
        [
            "...oooooooooo...",
            "...oPpPpPpPpo...",
            "..oPPPPPPPPPPo..",
            "..oPPWWWWWWPPo..",
            "..oPWWyyyyWWPo..",
            "..oPWyYYYYyWPo..",
            "..oPWyYYYYyWPo..",
            "..oPWWyyyyWWPo..",
            "..oPPWWWWWWPPo..",
            "..oPPPPPPPPPPo..",
            "...oPpPpPpPpo...",
            "...oooooooooo...",
        ],
        {"P": (222, 72, 72), "p": (176, 48, 52), "W": (252, 248, 240), "y": (226, 168, 52), "Y": (250, 212, 90)},
    ),
    # 披薩：一片三角形，餅皮＋起司＋臘腸
    "pizza": (
        [
            ".oooooooooooooo.",
            "oCCCCCCCCCCCCCCo",
            "oCCCCCCCCCCCCCCo",
            ".oYYRYYYYYRYYYo.",
            "..oYYYYRYYYYYo..",
            "..oYRYYYYYRYYo..",
            "...oYYYRYYYYo...",
            "....oYYYYYRo....",
            "....oYRYYYYo....",
            ".....oYYYYo.....",
            "......oYYo......",
            ".......oo.......",
        ],
        {"C": (212, 152, 82), "Y": (250, 212, 92), "R": (200, 60, 50)},
    ),
    # 冰美式：透明杯、黑咖啡、冰塊、吸管
    "icedamericano": (
        [
            "..........s.....",
            ".........s......",
            "..oooooooooooo..",
            "..oGGGGGGsGGGo..",
            "..oCIICCCsCCCo..",
            "..oCIICCCsIICo..",
            "...oCCCCCsIIo...",
            "...oCCIICsCCo...",
            "...oCCIICCCCo...",
            "....oCCCCCCo....",
            "....oCCCCCCo....",
            "....oooooooo....",
        ],
        {"s": (52, 52, 56), "G": (226, 238, 244), "C": (92, 56, 36), "I": (214, 234, 246)},
    ),
    # 北非蛋：平底鍋、番茄紅醬、兩顆蛋、香草
    "shakshuka": (
        [
            "..oooooooooo....",
            ".oRRRRRRRRRRo...",
            "oRWWWRRRRWWWRo..",
            "oRWYWRRgRWYWRoHH",
            "oRWWWRRRRWWWRoHH",
            "oRRRRgRRRRgRRo..",
            ".oRRRRRRRRRRo...",
            "..oooooooooo....",
        ],
        {"R": (204, 62, 46), "W": (252, 250, 244), "Y": (250, 190, 40), "g": (92, 152, 72), "H": (64, 54, 54)},
    ),
    # 奶奶醬蟹（醬油醃生蟹）：深橘褐色的蟹
    "gejang": (
        [
            ".oo..........oo.",
            "oCCo........oCCo",
            "oCo..........oCo",
            ".oCo........oCo.",
            "..oCooooooooCo..",
            "...oCCCCCCCCo...",
            "..oCCeCCCCeCCo..",
            ".oCCCCCCCCCCCCo.",
            ".oCcCCCCCCCCcCo.",
            "o.oCCCCCCCCCCo.o",
            ".o.oooooooooo.o.",
            "o..o........o..o",
        ],
        {"C": (190, 96, 44), "c": (150, 70, 32), "e": (30, 24, 24)},
    ),
}


def render(name: str) -> Image.Image:
    rows, colors = FOODS[name]
    for r in rows:
        assert len(r) == 16, f"{name} 有一列不是 16 格：{r!r}"
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    oy = (16 - len(rows)) // 2
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "o":
                img.putpixel((x, oy + y), INK + (255,))
            elif ch in colors:
                img.putpixel((x, oy + y), colors[ch] + (255,))
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in FOODS:
        render(name).resize((64, 64), Image.NEAREST).save(OUT / f"{name}.png")
    # 總表（第一個參數給路徑才輸出）：一格 96px，方便一次看全部
    if len(sys.argv) > 1:
        cell = 112
        sheet = Image.new("RGB", (cell * 7, cell * 2), (255, 246, 242))
        for i, name in enumerate(FOODS):
            im = render(name).resize((96, 96), Image.NEAREST)
            sheet.paste(im, ((i % 7) * cell + 8, (i // 7) * cell + 8), im)
        sheet.save(sys.argv[1])
    print("已輸出到", OUT)


if __name__ == "__main__":
    main()
