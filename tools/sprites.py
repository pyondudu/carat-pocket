#!/usr/bin/env python3
"""角色圖流程：裁官方參考圖 → 用 ~/ai_image.py 畫像素風角色 → 校色、對齊後放進 public/sprites/。

用法（在專案根目錄執行）：
  python3 tools/sprites.py refs                     從官方圖裁出所有角色的參考圖（全身、頭像）
  python3 tools/sprites.py gen <id> <pose>...       生圖（pose：happy sad sleep shake），會花錢
  python3 tools/sprites.py fix <id> "<要改的地方>"   以目前的開心版為底，只改指定的地方，會花錢
  python3 tools/sprites.py process <id>...          校色、對齊，輸出到 public/sprites/<id>/
  python3 tools/sprites.py shake <id>...            用開心版加上雪克杯做出搖飲料（不花錢，造型不會跑掉）

做法的來由見 ~/.claude/plans/app-mossy-sutton.md（TAMTAM 試圖結論）。需要 Pillow。
"""
import colorsys
import os
import re
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INTRO = os.path.join(ROOT, "參考資料", "miniteen", "螢幕擷取畫面 2026-10-23 {}.png")
REF_DIR = os.path.join(ROOT, "assets-src", "ref")
OUT_DIR = os.path.join(ROOT, "public", "sprites")
AI_IMAGE = os.path.expanduser("~/ai_image.py")
POSES = ["happy", "sad", "sleep", "shake"]
RAW_DIR = os.path.join(ROOT, "assets-src", "raw")
CANVAS = (300, 280)
HEIGHT = 256  # 開心版（扣掉藍色 Z／眼淚）縮放後的高度
STYLE_REF = os.path.join(RAW_DIR, "tamtam_happy.png")  # 已核准的畫風基準
FROM_HAPPY = {("choitcherry", "sad"), ("choitcherry", "sleep"), ("shuasumi", "sad"), ("shuasumi", "sleep"),
              ("thepalee", "sad"), ("foxdungee", "sleep"), ("ppyopuli", "sleep"), ("ppyopuli", "sad"), ("nonver", "sad"), ("nonver", "sleep"),
              ("chandalee", "sad"), ("chandalee", "sleep"),
              ("thepalee", "sleep"), ("foxdungee", "sad"), ("kimja", "sad"), ("doa", "sad"), ("kimja", "sleep"), ("doa", "sleep"),
             ("ocl", "sick"), ("jjongtoram", "sad"), ("jjongtoram", "sleep"), ("bboogyuli", "sad"), ("bboogyuli", "sleep")}  # 從開心版改出來的，不再校色
SHORT_BODY = {}  # 開心版手動縮過身體、其他表情又是 AI 畫的角色：其他表情也縮（寬、高比例）
NO_OFFICIAL_COLOR = {"tamtam", "kimja"}  # 不對照官方圖校色（TAMTAM 已核准；KIMJA 校了會變灰）

# 參考圖：「全員站姿」（172931）裁全身、「全員頭像」（172856）裁臉
BODY_SRC, HEAD_SRC = "172931", "172856"
BODY_BOX = {
    "choitcherry": (100, 122, 192, 300), "jjongtoram": (212, 148, 318, 300), "shuasumi": (338, 172, 432, 300),
    "ocl": (462, 122, 548, 300), "tamtam": (568, 168, 672, 300), "foxdungee": (148, 338, 252, 480),
    "ppyopuli": (282, 392, 382, 480), "thepalee": (408, 368, 492, 480), "kimja": (512, 302, 648, 480),
    "doa": (142, 542, 262, 665), "bboogyuli": (282, 542, 378, 665), "nonver": (392, 502, 512, 665),
    "chandalee": (532, 538, 628, 665),
}
HEAD_BOX = {
    "choitcherry": (192, 38, 292, 168), "jjongtoram": (312, 42, 428, 162), "shuasumi": (448, 62, 568, 162),
    "ocl": (598, 32, 688, 178), "tamtam": (182, 212, 302, 308), "foxdungee": (312, 208, 432, 312),
    "ppyopuli": (452, 208, 562, 302), "thepalee": (588, 212, 702, 302), "kimja": (112, 332, 232, 482),
    "doa": (248, 368, 382, 462), "bboogyuli": (402, 358, 522, 462), "nonver": (532, 358, 652, 462),
    "chandalee": (668, 368, 778, 462),
}

# 外型特徵：逐項寫清楚，AI 才畫得像。只畫角色本體，官方圖裡的道具、配件（碗、皇冠、領巾、果凍…）都不要。
# 生圖模型對否定句不敏感（寫「不要果凍」反而會畫出果凍），盡量用正面描述。
CHIBI = ("Proportions: cute chibi like the official art, the head is big (about 55 percent of the total height) "
         "and the body is small and short with stubby arms and legs, standing upright.")
LOOKS = {
    "choitcherry": "CHOITCHERRY, a slim white bunny. Silhouette: a rounded head slightly wider than tall, two long narrow upright "
                   "ears as tall as the head with dark crimson-red inner ears, a slim straight body a bit narrower than the head, "
                   "short arms held down at the sides, two short legs with a small gap between them. Face (small features, lots of "
                   "white space): both eyes are calm half-closed eyes, each a thick dark line slanting down toward the nose with a "
                   "thin line above it; two short whisker dashes on each cheek beside the eyes; a tiny dark nose in the center and "
                   "a tiny 'w' mouth right under it. All white, thick dark outline. {chibi}",
    "jjongtoram": "JJONGTORAM, a baby wearing a pink bunny costume. Head: a big pastel-pink hood with two long pink bunny ears whose "
                  "inner ears are pale yellow with a small orange lightning-bolt mark; inside the hood a round cream-peach baby face with "
                  "brown hair bangs drawn as three brown stripes on the forehead. Face: both eyes the same, two happy upward-curved eyes, "
                  "a small open smiling mouth, pink blush on both cheeks. Body: small pastel-pink costume body with a white oval belly, "
                  "one small hand raised waving. {chibi}",
    "shuasumi": "SHUASUMI, a fawn deer in light pastel peach-orange and cream. Head: big round head, pale peach-orange on top; the lower "
               "half of the face (both cheeks and the muzzle) is cream-white; a small cream V-shaped mark on the forehead, two short "
               "reddish-brown antlers, big rounded ears that are orange outside and cream inside. Face: big shiny black eyes, each with "
               "two little flicked eyelashes at the outer corner, tiny black nose, small open smiling mouth. Body: small peach-orange "
               "body with a few cream spots on the belly, cream hooves, one small hand raised. {chibi}",
    "ocl": "O.C.L, three round chubby cats stacked vertically like a totem, each cat a rounded bean shape with small pointed ears, "
           "the top white cat's head plain white and smooth. Top cat: white, narrow smug '= =' eyes and a small open grinning mouth "
           "shaped like a rounded triangle. Middle cat: light gray, happy closed '^ ^' arc eyes and a small 'ω' mouth. Bottom cat: "
           "dark charcoal gray, slightly bigger, small eyes and a small 'ω' mouth drawn in light gray lines. The whole stack is about "
           "as tall as the other characters",
    "tamtam": "TAMTAM, a tiger cub in pale cream-yellow. Head: big round head with small round ears with brown inner patches, a brown "
              "'+' cross mark on the forehead, two brown stripes on each cheek. Face: happy closed upward-curved eyes, tiny black "
              "triangle nose, a small 'ω' cat mouth. Body: small body with a white oval belly and a few brown stripes on the arms "
              "and legs, one small hand raised waving. {chibi}",
    "foxdungee": "FOXDUNGEE, a lavender-purple fox. Head: big head with two large pointed ears (white inside, lighter purple tips), "
                 "fluffy white cheeks and lower face. Face: round thin black glasses, eyes glancing to the side with a smug sly look "
                 "and small raised eyebrows, tiny black nose and right under it a tiny gentle closed smile line. Body: small purple "
                 "body with a white chest, a fluffy purple tail with a white tip curling out to the side. {chibi}",
    "ppyopuli": "PPYOPULI, a small round fluffy white rice ball creature shaped like a soft cloud with a bumpy puffy outline, "
                "tiny stubby arms and feet, plain body with nothing on its head. The face is very simple with lots of empty white "
                "space: two small black dot eyes (one may be a happy closed arc), a tiny '3'-shaped kissing mouth, and one soft pink "
                "oval blush on the cheek. It is a small character, a bit shorter than the others",
    "thepalee": "THEpalee, a green frog. Head: a big wide light-green head with two big round shiny black eyes bulging on top "
                "(each with a white shine). Face: soft pink oval blush on both cheeks, two tiny nostril dots, a small gentle wavy "
                "'w' smile line. Body: small green body with a white belly, short green arms and legs, one hand raised. {chibi}",
    "kimja": "KIMJA, a potato. Silhouette: one tall rounded potato shape in golden tan-yellow, narrower at the top and wider "
             "at the bottom, leaning very slightly, with a small tuft of hair (three short curved strands) on top. Face in the upper "
             "half: two BIG round eyes, black with large white shine spots (sparkly, cute), a tiny nose, a small 'U' smile, a few "
             "brown freckle dots and a small '17' on each cheek. One small hand touching the chin, the other arm raised and "
             "waving out to the side, two short stubby legs. KIMJA is tall and potato-shaped, not big-headed",
    "doa": "DOA, a cream-beige toy poodle puppy. Head: big round head whose outline is wavy and scalloped like tight curly fur, "
           "a curly puff on top, long floppy ears hanging down that are puffy clusters of curls with bumpy edges. Face: small black "
           "dot eyes with tiny eyebrows, small black nose, open smiling mouth with a little pink tongue. Body: small cream body with "
           "a white belly patch, short paws held up in front of the chest. {chibi}",
    "bboogyuli": "BBOOGYULI, a tangerine. Head: a big round orange tangerine head with a green stem and two green leaves on top, "
                 "three small curved hair lines on the forehead, a small pink round patch on the upper right of the head. Face: two "
                 "tall oval eyes with white highlights and little eyelashes, a tiny nose, and a small round open mouth like a little "
                 "'o'. Body: small orange body with short orange arms and legs, one hand raised. {chibi}",
    "nonver": "NONVER, a boy whose whole head is covered by a big round light-gray hood with two small round bear ears on top. "
              "The face shows only through a small horizontal oval opening in the middle of the hood: peach skin, a few brown hair "
              "strands, thick dark slanted eyebrows and sharp cool dark eyes. Body: a light-gray hoodie with a front pocket and two "
              "drawstrings, light-blue jeans, black sneakers with white soles, both hands raised a little. {chibi}",
    "chandalee": "CHANDALEE, an otter in light pastel tan-beige brown and white. Head: big wide rounded head, light tan on top; the "
                 "white area covers the entire lower half of the face including both cheeks and the muzzle; two small round ears. "
                 "Face: small dark eyes with short thick angled brown eyebrows (a cheeky determined look), tiny dark nose, a small "
                 "'ω' mouth. Body: a small slim short body, clearly narrower than the head, light brown with a white belly, short "
                 "arms and legs, one hand raised. {chibi}",
}
LOOKS = {k: v.replace("{chibi}", CHIBI) for k, v in LOOKS.items()}

POSE_TEXT = {
    "happy": "Expression: the character's own default happy expression exactly as described above. Hands empty, no food, no props.",
    "sad": "Same body, proportions and standing pose as the approved sprite. Expression: sad, eyes looking down, one small light-blue "
           "teardrop under one eye, small downturned mouth. Hands empty, no props.",
    "sleep": "Same body, proportions and standing pose as the approved sprite, head tilted slightly. Expression: asleep, eyes closed "
             "as gentle curved lines, small calm mouth, a few small blue 'Z' letters floating above the head. Hands empty, no props.",
    "shake": "Same body and proportions as the approved sprite. Pose: happily shaking a small silver cocktail shaker held with both "
             "hands in front of the chest, a couple of short motion lines beside the shaker, happy expression. The shaker is the only prop. "
             "All white areas are solid opaque white, fully enclosed by the outline.",
}


def crop_refs():
    body = Image.open(INTRO.format(BODY_SRC)).convert("RGB")
    head = Image.open(INTRO.format(HEAD_SRC)).convert("RGB")
    os.makedirs(REF_DIR, exist_ok=True)
    for cid in BODY_BOX:
        body.crop(BODY_BOX[cid]).save(os.path.join(REF_DIR, f"{cid}_body.png"))
        head.crop(HEAD_BOX[cid]).save(os.path.join(REF_DIR, f"{cid}_head.png"))
        print(cid)


def refs_for(cid, pose):
    """官方參考：全員站姿裁的全身（<id>_body）＋頭像（<id>_head），再加畫風基準（開心版）或已核准的開心版（其他表情）"""
    big = os.path.join(REF_DIR, f"{cid}_body_big.png")  # 有放大版就用放大版，AI 比較看得清細節
    suffix = "_big" if os.path.isfile(big) else ""
    refs = [os.path.join(REF_DIR, f"{cid}_body{suffix}.png"), os.path.join(REF_DIR, f"{cid}_head{suffix}.png")]
    refs.append(STYLE_REF if pose == "happy" else os.path.join(RAW_DIR, f"{cid}_happy.png"))
    return refs


POSE_EXTRA = {
    ("ocl", "shake"): "O.C.L has no arms: the small silver shaker floats beside the stack, tilted, with motion lines, "
                      "and does not cover any cat's face. The top cat is solid white with a happy face.",
}


def prompt_for(cid, pose):
    if pose == "happy":
        style = ("The THIRD reference image is ONLY a pixel style guide showing a different character: copy its pixel art style, "
                 "pixel size, outline thickness and flat coloring, but NOT its tiger design, colors, sitting pose or proportions.")
    else:
        style = ("The THIRD reference image is the approved sprite of this same character: copy its exact pixel art style, proportions, "
                 "palette, outline thickness, size in the canvas and design. Only change the expression and pose as described.")
    return (f"Detailed pixel art game sprite (about 64x64 pixels, scaled up with crisp square pixels) of {LOOKS[cid].rstrip('.')}. "
            "The FIRST reference image is the official full-body art and the SECOND is the official face close-up of this same "
            "character: match their head shape, proportions, colors, markings and facial features as closely as possible. "
            f"{style} {POSE_TEXT[pose]} {POSE_EXTRA.get((cid, pose), '')} Flat colors, limited palette, no anti-aliasing, no gradients, no dithering. "
            "One single character, full body, facing the viewer, centered, filling most of the canvas. "
            "Transparent background, no text, no shadow.")


def fix_prompt(cid, change):
    return (f"Edit this pixel art game sprite of {cid.upper()}. The THIRD reference image is the approved sprite: keep its exact "
            "pixel art style, pixel size, outline, palette, pose, face and every detail the same, except this change: "
            f"{change} The FIRST and SECOND reference images are the official art of this character for reference. "
            "Transparent background, no text, no shadow.")


def run_ai(cid, pose, prompt, refs):
    for r in refs:
        if not os.path.isfile(r):
            sys.exit(f"缺少參考圖：{r}")
    cmd = ["python3", AI_IMAGE, prompt, "-q", "中", "-b", "transparent"]
    for r in refs:
        cmd += ["--ref", r]
    out = subprocess.run(cmd, capture_output=True, text=True)
    m = re.search(r"已存檔：(.+\.png)", out.stdout)
    if not m:
        sys.exit(f"{cid} {pose} 生圖失敗：{out.stdout}{out.stderr}")
    os.makedirs(RAW_DIR, exist_ok=True)
    dest = os.path.join(RAW_DIR, f"{cid}_{pose}.png")
    if os.path.isfile(dest):  # 舊版留著比較
        n = 1
        while os.path.isfile(os.path.join(RAW_DIR, f"{cid}_{pose}_v{n}.png")):
            n += 1
        shutil.move(dest, os.path.join(RAW_DIR, f"{cid}_{pose}_v{n}.png"))
    shutil.copy(m.group(1), dest)
    print(f"{cid} {pose}：{m.group(1)} → {dest}", flush=True)


def gen(cid, pose):
    run_ai(cid, pose, prompt_for(cid, pose), refs_for(cid, pose))


def fix(cid, change):
    run_ai(cid, "happy", fix_prompt(cid, change), refs_for(cid, "sad"))  # 第三張參考＝目前的開心版


def is_blue(r, g, b):
    return b > r + 30  # Z 與眼淚，不參與校色和高度計算


def body_mean(im):
    """角色主色的平均：不透明、不太暗（外框）、不太灰白、不是藍色的像素"""
    total, n = [0, 0, 0], 0
    for r, g, b, a in im.getdata():
        if a < 200 or is_blue(r, g, b):
            continue
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if v > 0.35 and (s > 0.2 or v < 0.9):
            total[0] += r; total[1] += g; total[2] += b; n += 1
    return [t / n for t in total] if n else None


def dominant_color(im):
    """最多像素的色相（36 格直方圖的峰值）與那一格的平均飽和度；平均色會被臉、肚子等其他顏色拉偏"""
    bins, sats = [0] * 36, [0.0] * 36
    for r, g, b, a in im.getdata():
        if a < 200 or is_blue(r, g, b):
            continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s > 0.2 and v > 0.35:
            i = int(h * 36) % 36
            bins[i] += 1
            sats[i] += s
    i = bins.index(max(bins))
    return (i + 0.5) / 36, sats[i] / max(1, bins[i])


def fill_holes(im):
    """透明背景模式偶爾把白色身體、眼睛反光也當成背景挖空：外框裡面的透明像素補成白色"""
    alpha = im.getchannel("A").point(lambda a: 255 if a > 40 else 0)
    w, h = im.size
    pad = Image.new("L", (w + 2, h + 2), 0)
    pad.paste(alpha, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)  # 從外面灌，碰不到的透明區就是洞
    holes = pad.crop((1, 1, w + 1, h + 1)).point(lambda v: 255 if v == 0 else 0)
    if holes.getbbox():  # 透明像素裡的 RGB 不可靠，直接補白
        im.paste((255, 255, 255, 255), mask=holes)
    return im


def white_balance(im, ref_white):
    """接近白色的像素（白毛、白肚子）統一成開心版的白，AI 畫其他表情時白色常偏黃或偏粉"""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 40 and not is_blue(r, g, b):
                _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                if v > 0.82 and s < 0.22:
                    k = v / ref_white[3]
                    px[x, y] = tuple(min(255, round(c * k)) for c in ref_white[:3]) + (a,)


def lightest(im):
    """開心版的白色：最亮且不飽和的像素平均，最後一格放亮度"""
    total, n = [0, 0, 0], 0
    for r, g, b, a in im.getdata():
        if a > 200:
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if v > 0.9 and s < 0.12:
                total[0] += r; total[1] += g; total[2] += b; n += 1
    if not n:
        return None
    w = [t / n for t in total]
    return w + [max(w) / 255]


def shorten_body(im, sx, sy):
    """脖子以下縮小（CHOITCHERRY 的開心版是手動縮身體的，其他表情要一致）：
    脖子＝身高 45%～75% 之間外框寬度最窄的那一列"""
    alpha = im.getchannel("A").point(lambda a: 255 if a > 40 else 0)
    l, t, r, b = alpha.getbbox()
    ap = alpha.load()
    def width(y):
        xs = [x for x in range(l, r) if ap[x, y]]
        return xs[-1] - xs[0] if xs else 10 ** 6
    neck = min(range(t + int((b - t) * 0.45), t + int((b - t) * 0.75)), key=width)
    head = im.crop((0, 0, im.width, neck))
    body = im.crop((0, neck, im.width, im.height))
    bb = body.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
    body = body.crop(bb)
    cx = (bb[0] + bb[2]) / 2
    body = body.resize((round(body.width * sx), round(body.height * sy)), Image.NEAREST)
    out = Image.new("RGBA", im.size)
    out.alpha_composite(head)
    out.alpha_composite(body, (round(cx - body.width / 2), neck))
    return out


def process(cid, only=None):
    """only：只輸出這幾個表情（其他表情仍會讀進來，縮放比例才跟開心版一致）"""
    raws = {p: os.path.join(RAW_DIR, f"{cid}_{p}.png") for p in POSES + ["sick", "base"]}
    raws = {p: f for p, f in raws.items() if os.path.isfile(f)}
    if "happy" not in raws:
        sys.exit(f"{cid} 還沒有開心版")
    images = {p: fill_holes(Image.open(f).convert("RGBA")) for p, f in raws.items()}
    for pose in images:
        if pose != "happy" and cid in SHORT_BODY:
            images[pose] = shorten_body(images[pose], *SHORT_BODY[cid])
    white = lightest(images["happy"])
    if white:
        for pose in images:
            if pose not in ("happy", "base") and (cid, pose) not in FROM_HAPPY:
                white_balance(images[pose], white)
    target = body_mean(images["happy"])
    # AI 畫的顏色常偏深、偏飽和，開心版再以官方全身圖的主色校正
    official = os.path.join(REF_DIR, f"{cid}_body.png")
    if cid not in NO_OFFICIAL_COLOR and os.path.isfile(official):
        ref_mean = body_mean(Image.open(official).convert("RGBA"))
        if ref_mean and target:
            target = [t * min(1.25, max(0.8, r / t)) for t, r in zip(target, ref_mean)]
    happy_mean = body_mean(images["happy"])  # 迴圈裡開心版會先被校色，要在那之前記下來
    scale = layout = None
    os.makedirs(os.path.join(OUT_DIR, cid), exist_ok=True)
    for pose in POSES + ["sick", "base"]:
        if pose not in images:
            continue
        im = images[pose]
        px = im.load()
        mean = body_mean(im) if pose != "base" and (cid, pose) not in FROM_HAPPY else happy_mean
        gain = [t / m if m else 1 for t, m in zip(target, mean)] if mean else [1, 1, 1]
        main_hue, main_sat = dominant_color(im)
        mask = Image.new("L", im.size, 0)
        mp = mask.load()
        for y in range(im.height):
            for x in range(im.width):
                r, g, b, a = px[x, y]
                if not a:
                    continue
                if not is_blue(r, g, b):
                    hue, sat, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                    # 只調主色附近的顏色：白、灰、黑和臉、肚子、淺色口鼻等別的顏色不動，免得偏色
                    if sat > max(0.2, main_sat * 0.6) and min(abs(hue - main_hue), 1 - abs(hue - main_hue)) < 0.07:
                        px[x, y] = tuple(min(255, round(c * k)) for c, k in zip((r, g, b), gain)) + (a,)
                    if a > 40:
                        mp[x, y] = 255
        body = mask.getbbox()
        if scale is None:  # 以開心版的高度決定整組的縮放比例
            scale = HEIGHT / (body[3] - body[1])
        full = im.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
        c = im.crop(full)
        s = c.resize((round(c.width * scale), round(c.height * scale)), Image.LANCZOS)
        if s.width > CANVAS[0] or s.height > CANVAS[1] - 4:  # 太寬就整張縮進畫布
            k = min(CANVAS[0] / s.width, (CANVAS[1] - 4) / s.height)
            s = s.resize((round(s.width * k), round(s.height * k)), Image.LANCZOS)
        canvas = Image.new("RGBA", CANVAS)
        pos = ((CANVAS[0] - s.width) // 2, CANVAS[1] - s.height - 4)
        canvas.paste(s, pos, s)
        if pose == "happy":  # 原圖座標 → 輸出圖座標，給 tools/face_rig.py 換算五官位置
            layout = {"x0": full[0], "y0": full[1], "scale": s.width / c.width, "dx": pos[0], "dy": pos[1]}
        if only is None or pose in only:
            canvas.save(os.path.join(OUT_DIR, cid, f"{pose}.png"))
    print(f"{cid}：輸出 {', '.join(p for p in POSES + ['sick', 'base'] if p in images and (only is None or p in only))}")
    return layout


# 雪克杯像素圖：K 深灰鈕、C 淺灰蓋、B 深灰濾網環、S 銀色杯身、H 反光
SHAKER = [
    "..K..",
    ".CCC.",
    ".BBB.",
    "SHSSS",
    "SHSSS",
    "SHSSS",
    ".SSS.",
]
SHAKER_COLORS = {"K": (108, 116, 134), "C": (205, 212, 224), "B": (108, 116, 134),
                 "S": (172, 182, 198), "H": (250, 252, 255)}
SHAKER_INK = (30, 28, 28)
SHAKER_CELL = 7   # 輸出圖上一格幾 px（跟角色的像素大小差不多）


def shake_from_happy(cid):
    """搖飲料＝開心版原封不動＋旁邊一個斜斜的雪克杯和搖晃線（使用者決定的做法）"""
    happy = Image.open(os.path.join(OUT_DIR, cid, "happy.png")).convert("RGBA")
    l, t, r, b = happy.getbbox()
    c = SHAKER_CELL
    w, h = len(SHAKER[0]) * c, len(SHAKER) * c
    cup = Image.new("RGBA", (w + 2 * c, h + 2 * c))
    d = ImageDraw.Draw(cup)
    cells = {(x, y) for y, row in enumerate(SHAKER) for x, ch in enumerate(row) if ch != "."}
    for x, y in cells:  # 外框：形狀往外一格
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                if (x + dx, y + dy) not in cells:
                    d.rectangle([(x + dx + 1) * c, (y + dy + 1) * c, (x + dx + 2) * c - 1, (y + dy + 2) * c - 1], fill=SHAKER_INK)
    for y, row in enumerate(SHAKER):
        for x, ch in enumerate(row):
            if ch != ".":
                d.rectangle([(x + 1) * c, (y + 1) * c, (x + 2) * c - 1, (y + 2) * c - 1], fill=SHAKER_COLORS[ch])
    cup = cup.rotate(-20, resample=Image.NEAREST, expand=True)
    # 放在角色右側、身高一半左右，稍微疊在身體邊緣上；畫布不夠就往左挪
    x = min(r - c * 2, CANVAS[0] - cup.width - 4 * c)
    y = t + (b - t) // 2 - cup.height // 2
    out = happy.copy()
    out.alpha_composite(cup, (x, y))
    d = ImageDraw.Draw(out)
    for k, dy in enumerate((c, 4 * c)):  # 搖晃線
        lx, ly = x + cup.width + c // 2, y + dy
        for i in range(3):
            d.rectangle([lx + i * 3, ly - i * 3, lx + i * 3 + 2, ly - i * 3 + 2], fill=SHAKER_INK)
    out.save(os.path.join(OUT_DIR, cid, "shake.png"))
    print(f"{cid}：搖飲料（開心版＋雪克杯）")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == "refs":
        crop_refs()
    elif cmd == "gen":
        cid, poses = args[0], args[1:] or POSES
        for pose in poses:
            gen(cid, pose)
    elif cmd == "shake":
        for cid in args:
            shake_from_happy(cid)
    elif cmd == "fix":
        fix(args[0], args[1])
    elif cmd == "process":
        for cid in args:
            process(cid)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
