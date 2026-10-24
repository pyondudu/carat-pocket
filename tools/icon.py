"""產生 PWA 主畫面圖示：像素風的克拉鑽石（32 格、左粉右藍分 6 段漸層、切面之間留 1 格白線，左右對稱）。

形狀照使用者給的平面鑽石參考圖（上半部交錯三角形、下半部三塊），2026-10-24 使用者從預覽選了「32 格・小」。
用法：python3 tools/icon.py → public/icons/
  diamond-px-192.png、diamond-px-512.png（主畫面）、apple-touch-icon-px.png、favicon-px.png、diamond-px.png（說明頁，透明背景）
主畫面圖示改樣子時要換檔名：手機、GitHub、Google 打包 App 的伺服器都可能留著舊檔，對不上會裝不起來。
"""
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

BG = (253, 249, 248)
PINK = (238, 143, 163)  # 玫瑰石英粉
BLUE = (95, 134, 204)  # 寧靜藍

GRID = 32  # 圖示的格數
WIDTH = 21  # 鑽石寬（奇數才有正中間那一格）
CROWN = 6  # 上半部列數
STEPS = 6  # 漸層分幾段


def diamond_cells() -> tuple[dict[tuple[int, int], tuple[int, int, int]], int]:
    """回傳 {(x, y): 顏色} 和鑽石高度；座標從鑽石左上角起算"""
    c = WIDTH // 2
    top = CROWN - 1  # 第 0 列左端，每往下一列外擴 1 格
    g = round(0.34 * (WIDTH - 1))  # 腰線上的內側頂點（參考圖在 34% 的位置）
    girdle = CROWN  # 腰線那一列整列留白
    tip = girdle + c  # 底尖

    def color(x: int) -> tuple[int, int, int]:
        t = round(x / (WIDTH - 1) * (STEPS - 1)) / (STEPS - 1)
        return tuple(round(PINK[i] + (BLUE[i] - PINK[i]) * t) for i in range(3))

    def line_x(x0: float, y0: float, x1: float, y1: float, y: int) -> int:
        return round(x0 + (x1 - x0) * (y - y0) / (y1 - y0))

    cells = {}
    for y in range(tip + 1):
        if y == girdle:
            continue
        left = top - y if y < girdle else y - girdle
        gaps = set()
        if y < girdle:
            # 上半部：從上緣的 top、c 斜到腰線內點 g（右邊對稱）
            for x0 in (top, c):
                gx = line_x(x0, 0, g, CROWN - 1, y)
                gaps |= {gx, WIDTH - 1 - gx}
        elif y < tip - 1:
            # 下半部：從腰線內點 g 斜到底尖，最後兩列不畫線，尖端才不會被切掉
            gx = line_x(g, girdle, c, tip, y)
            gaps |= {gx, WIDTH - 1 - gx}
        for x in range(left, WIDTH - left):
            if x not in gaps:
                cells[(x, y)] = color(x)
    return cells, tip + 1


def icon(size: int) -> Image.Image:
    cells, h = diamond_cells()
    img = Image.new("RGB", (GRID, GRID), BG)
    ox, oy = (GRID - WIDTH) // 2, (GRID - h) // 2
    for (x, y), c in cells.items():
        img.putpixel((ox + x, oy + y), c)
    return img.resize((size, size), Image.NEAREST)


def transparent(scale: int) -> Image.Image:
    """說明頁用：只有鑽石、透明背景"""
    cells, h = diamond_cells()
    img = Image.new("RGBA", (WIDTH, h), (0, 0, 0, 0))
    for (x, y), c in cells.items():
        img.putpixel((x, y), c + (255,))
    return img.resize((WIDTH * scale, h * scale), Image.NEAREST)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    icon(512).save(OUT / "diamond-px-512.png")
    icon(192).save(OUT / "diamond-px-192.png")
    icon(192).save(OUT / "apple-touch-icon-px.png")  # iPhone 會自己縮成 180
    icon(64).save(OUT / "favicon-px.png")
    transparent(8).save(OUT / "diamond-px.png")
    print("已輸出到", OUT)


if __name__ == "__main__":
    main()
