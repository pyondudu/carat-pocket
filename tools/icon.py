"""產生 PWA 主畫面圖示：平面的克拉鑽石（左粉右藍的橫向漸層，切面之間留白線；使用者給的參考圖樣式）。

用法：python3 tools/icon.py → public/icons/diamond-192.png、diamond-512.png、apple-touch-icon.png、favicon.png、diamond.png（透明背景）
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

BG = (253, 249, 248)
PINK = (238, 143, 163)  # 玫瑰石英粉（加深一點才看得清楚）
BLUE = (95, 134, 204)  # 寧靜藍

# 鑽石座標（寬 100、高 72）：上緣 y=0、腰線 y=24、底尖 (50, 72)
TOP = [18, 50, 82]
GIRDLE = [0, 34, 66, 100]
OUTLINE = [(18, 0), (82, 0), (100, 24), (50, 72), (0, 24)]
# 切面之間的分隔線
LINES = [
    ((0, 24), (100, 24)),  # 腰線
    ((18, 0), (34, 24)), ((50, 0), (34, 24)), ((50, 0), (66, 24)), ((82, 0), (66, 24)),  # 上半部交錯的三角形
    ((34, 24), (50, 72)), ((66, 24), (50, 72)),  # 下半部三塊
]


def diamond(S: int, width_ratio: float) -> Image.Image:
    """S×S 透明背景的鑽石；width_ratio：鑽石寬度佔畫面的比例"""
    w = S * width_ratio
    k = w / 100
    ox = (S - w) / 2
    oy = (S - 72 * k) / 2 + 2 * k  # 視覺上往下一點
    P = lambda x, y: (ox + x * k, oy + y * k)
    # 橫向漸層
    grad = Image.new("RGB", (S, S))
    gd = ImageDraw.Draw(grad)
    for x in range(S):
        t = min(1, max(0, (x - ox) / w))
        gd.line([(x, 0), (x, S)], fill=tuple(round(PINK[i] + (BLUE[i] - PINK[i]) * t) for i in range(3)))
    # 遮罩：鑽石外形，再挖掉切面之間的分隔線
    mask = Image.new("L", (S, S), 0)
    md = ImageDraw.Draw(mask)
    md.polygon([P(*p) for p in OUTLINE], fill=255)
    gap = max(1, round(3.2 * k))
    for a, b in LINES:
        md.line([P(*a), P(*b)], fill=0, width=gap)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


def draw(size: int, width_ratio: float, bg: tuple | None = BG) -> Image.Image:
    """bg=None 時輸出透明背景（說明頁用）；Android 會把圖示裁成圓形，width_ratio 要留安全範圍"""
    ss = 4  # 先放大 4 倍畫再縮小，邊緣才平滑
    d = diamond(size * ss, width_ratio)
    if bg is not None:
        base = Image.new("RGBA", d.size, bg + (255,))
        d = Image.alpha_composite(base, d).convert("RGB")
    return d.resize((size, size), Image.LANCZOS)


def main() -> None:
    # 主畫面圖示改過樣子就要換檔名：手機、GitHub、Google 打包 App 的伺服器都可能留著舊檔，對不上會裝不起來
    OUT.mkdir(parents=True, exist_ok=True)
    draw(512, 0.62).save(OUT / "diamond-512.png")
    draw(192, 0.62).save(OUT / "diamond-192.png")
    draw(180, 0.7).save(OUT / "apple-touch-icon.png")
    draw(64, 0.86).save(OUT / "favicon.png")
    draw(256, 0.96, None).save(OUT / "diamond.png")
    print("已輸出到", OUT)


if __name__ == "__main__":
    main()
