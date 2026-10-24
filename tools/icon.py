"""產生 PWA 主畫面圖示：像素風的克拉鑽石（Carat 代表色：玫瑰石英粉＋寧靜藍）。

用法：python3 tools/icon.py → public/icons/icon-192.png、icon-512.png、apple-touch-icon.png、favicon.png
"""
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

INK = (58, 51, 64)
BG = (247, 202, 201)  # 玫瑰石英粉
BG_LOW = (146, 168, 209)  # 寧靜藍
FACETS = {
    "a": (255, 255, 255),  # 最亮的面
    "b": (226, 236, 250),
    "c": (196, 212, 240),
    "d": (163, 184, 226),
    "e": (247, 214, 222),  # 帶一點粉
}
SPARK = (255, 255, 255)

# 16×13 的鑽石，一個字一格：o 外框、a～e 不同亮度的切面、'.' 透明
DIAMOND = [
    "....oooooooo....",
    "...oaabbccdeo...",
    "..oaabbbccddeo..",
    ".oaaabbbcccddeo.",
    "oooooooooooooooo",
    "oaabbbbccccddddo",
    ".oabbbbccccddeo.",
    "..oabbbccccdeo..",
    "...oabbcccddo...",
    "....oabcccdo....",
    ".....oabcdo.....",
    "......oaco......",
    ".......oo.......",
]

# 閃光（十字星），相對 24 格畫布的位置
SPARKS = [(19, 3, 1), (3, 19, 1), (21, 17, 1)]


def draw(size: int, pad: float) -> Image.Image:
    """size：輸出邊長；pad：鑽石外圍留白比例（Android 會把圖示裁成圓形，要留安全範圍）"""
    grid = 24
    img = Image.new("RGB", (grid, grid))
    px = img.load()
    # 背景：上粉下藍的直向漸層（像素化成 8 階）
    for y in range(grid):
        t = round(y / (grid - 1) * 7) / 7
        c = tuple(round(BG[i] + (BG_LOW[i] - BG[i]) * t) for i in range(3))
        for x in range(grid):
            px[x, y] = c
    for sx, sy, r in SPARKS:
        for d in range(-r, r + 1):
            px[sx + d, sy] = SPARK
            px[sx, sy + d] = SPARK
    art = Image.new("RGBA", (len(DIAMOND[0]), len(DIAMOND)), (0, 0, 0, 0))
    ap = art.load()
    for y, row in enumerate(DIAMOND):
        for x, ch in enumerate(row):
            if ch == "o":
                ap[x, y] = INK + (255,)
            elif ch in FACETS:
                ap[x, y] = FACETS[ch] + (255,)
    # 鑽石放大成整數倍，置中（往下 1 格，視覺上比較穩）
    scale = max(1, int(grid * (1 - pad * 2) / art.width))
    big = art.resize((art.width * scale, art.height * scale), Image.NEAREST)
    img.paste(big, ((grid - big.width) // 2, (grid - big.height) // 2 + 1), big)
    return img.resize((size, size), Image.NEAREST)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw(512, 0.1).save(OUT / "icon-512.png")
    draw(192, 0.1).save(OUT / "icon-192.png")
    draw(180, 0.1).save(OUT / "apple-touch-icon.png")
    draw(64, 0.1).save(OUT / "favicon.png")
    print("已輸出到", OUT)


if __name__ == "__main__":
    main()
