// DJ 小遊戲用的耳機：程式畫的像素耳機，疊在角色圖上（圖片座標，跟著 drawCharacter 的縮放、呼吸一起動）
// 款式是使用者 2026-10-27 用 THEpalee 試過定案的：戴在頭上、黑色耳罩、深灰頭帶加高光，頭帶是圓弧、跟頭頂留一點空隙

import faces from './data/faces.json';

interface Spec {
  cx: number; // 頭帶中心 x
  cy: number; // 頭帶橢圓中心 y（耳罩上緣下面一格）
  a: number; // 橢圓外圈半徑（x）
  b: number; // 橢圓外圈半徑（y）
  cupTop: number;
  left: number; // 頭的左右邊（耳罩內側貼在這裡）
  right: number;
  cell: number; // 一格像素多大（沿用 faces.json 的 cell）
}

/** 手動微調：自動算不好的角色（數字是圖片座標） */
const FIX: Record<string, Partial<Spec>> = {};

/** 耳罩對齊眼睛高度（其他角色貼在頭最寬的地方）：KIMJA 馬鈴薯、NONVER（使用者 2026-10-27 指定） */
const EYE_LEVEL = new Set(['kimja', 'nonver']);

/** 沒有五官資料時用的預設：O.C.L 只有最上面的白貓戴（使用者 2026-10-27 指定），眼睛位置照白貓的臉估的 */
type Rig = { eyes: [number, number, number, number][]; mouth: [number, number, number, number] | null; cell: number };
const FALLBACK: Record<string, Rig> = {
  ocl: { eyes: [[110, 62, 135, 80], [165, 62, 190, 80]], mouth: [135, 84, 165, 94], cell: 6 },
};

const PAD = 80; // 頭帶可能超出圖片上緣，離屏畫布上面多留的空間
const cache = new Map<string, HTMLCanvasElement | null>();

const INK = '#2b2b2b';
const BAND = '#4a4550';
const BAND_HI = '#78708a';
const CUP = '#26242a';
const CUP_DARK = '#18161a';
const CUP_HI = '#6e6a76';
const CUSHION = '#46424c';

/** 從開心版的輪廓和眼睛位置算出耳機的位置 */
function measure(id: string, img: HTMLImageElement): Spec | null {
  const rig = (faces as unknown as Record<string, Rig>)[id] ?? FALLBACK[id];
  if (!rig) return null;
  const w = img.width;
  const h = img.height;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const { data } = g.getImageData(0, 0, w, h);
  const solid = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h && data[(Math.round(y) * w + Math.round(x)) * 4 + 3] > 40;
  const c = rig.cell;
  const ey0 = Math.min(...rig.eyes.map((e) => e[1]));
  const ey1 = Math.max(...rig.eyes.map((e) => e[3]));
  const ecx = (Math.min(...rig.eyes.map((e) => e[0])) + Math.max(...rig.eyes.map((e) => e[2]))) / 2;
  // 頭最寬的地方：眼睛上緣到嘴巴下面一點，從中心往左右找連續的不透明；一樣寬的好幾列取中間那列，耳罩就貼在這裡
  // 沒有嘴巴資料（NONVER）就用眼睛下面一個眼睛高的位置
  const my1 = rig.mouth ? Math.max(ey1, rig.mouth[3]) : ey1 + (ey1 - ey0);
  let left = ecx;
  let right = ecx;
  let rows: number[] = [];
  for (let y = Math.floor(ey0); y <= my1 + c; y++) {
    let l = ecx;
    let r = ecx;
    while (solid(l - 1, y)) l--;
    while (solid(r + 1, y)) r++;
    if (r - l > right - left + 1) {
      [left, right] = [l, r];
      rows = [y];
    } else if (r - l >= right - left - 1) rows.push(y);
  }
  const wideY = (rows[0] + rows[rows.length - 1]) / 2;
  // 頭頂：只看頭的正中央往下第一個不透明，兩耳中間的縫很窄也不會碰到耳朵（CHOITCHERRY）
  const cx = (left + right) / 2;
  let top = 0;
  while (top < h && !solid(cx, top)) top++;
  const cupTop = (EYE_LEVEL.has(id) ? (ey0 + ey1) / 2 : wideY) - 4.5 * c;
  const cy = cupTop + c;
  const spec: Spec = { cx, cy, a: (right - left) / 2 + 3.5 * c, b: cy - (top - 5 * c), cupTop, left, right, cell: c };
  return { ...spec, ...FIX[id] };
}

function render(spec: Spec, w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h + PAD;
  const g = cv.getContext('2d')!;
  const { cx, cy, a, b, cell: c } = spec;
  const px = (x: number, y: number, col: string, ww = c, hh = c) => {
    g.fillStyle = col;
    g.fillRect(Math.round(x), Math.round(y + PAD), Math.ceil(ww), Math.ceil(hh));
  };
  // 頭帶：以 cx 為中心的格子，判斷每格落在橢圓環的哪一層（外框黑、中間灰、內框黑）
  const e = (x: number, y: number, k: number) => ((x - cx) / (a - k * c)) ** 2 + ((y - cy) / (b - k * c)) ** 2;
  const cols = Math.ceil(a / c) + 1;
  for (let y = cy - b - c; y < cy; y += c) {
    for (let i = -cols; i <= cols; i++) {
      const x = cx + (i - 0.5) * c;
      const mx = x + c / 2;
      const my = y + c / 2;
      if (e(mx, my, 0) > 1 || e(mx, my, 3) <= 1) continue;
      const edge = e(mx, my, 1) > 1 || e(mx, my, 2) <= 1;
      px(x, y, edge ? INK : my < cy - b + 3 * c && Math.abs(mx - cx) < a * 0.4 ? BAND_HI : BAND);
    }
  }
  // 耳罩：6×9 格圓角，貼頭那側是耳墊
  const cup = (x0: number, padRight: boolean) => {
    const cw = 6;
    const ch = 9;
    for (let r = 0; r < ch; r++)
      for (let k = 0; k < cw; k++) {
        if ((r === 0 || r === ch - 1) && (k === 0 || k === cw - 1)) continue;
        const edge = r === 0 || r === ch - 1 || k === 0 || k === cw - 1;
        px(x0 + k * c, spec.cupTop + r * c, edge ? INK : CUP);
      }
    for (let r = 1; r < ch - 1; r++) px(x0 + (padRight ? cw - 2 : 1) * c, spec.cupTop + r * c, CUSHION);
    for (let r = 2; r < ch - 2; r++) px(x0 + (padRight ? 1 : cw - 2) * c, spec.cupTop + r * c, CUP_DARK);
    px(x0 + (padRight ? 2 : cw - 3) * c, spec.cupTop + c, CUP_HI);
  };
  cup(spec.left - 6 * c, true);
  cup(spec.right, false);
  return cv;
}

/** 在圖片座標系（原點＝角色圖左上角）畫耳機；ctx 已經套好角色的縮放 */
export function drawHeadphones(ctx: CanvasRenderingContext2D, id: string, img: HTMLImageElement): void {
  if (!cache.has(id)) {
    const spec = measure(id, img);
    cache.set(id, spec ? render(spec, img.width, img.height) : null);
  }
  const cv = cache.get(id);
  if (cv) ctx.drawImage(cv, 0, -PAD);
}
