// 程式畫的五官：身體永遠是同一張無五官底圖（tools/face_rig.py 產生），表情只是幾組參數，不會跑掉
// 開心時直接從核准的 happy.png 複製原本的眼睛、嘴巴；其他表情只換需要換的部分
// 座標是 public/sprites/<id>/ 圖上的像素位置；程式畫的五官以「格」為單位，跟 AI 圖的像素格一樣大

import type { Mood } from './pet';

type Box = [number, number, number, number]; // x0, y0, x1, y1

export interface FaceRig {
  cell: number; // 一格幾 px
  eyes: Box[]; // 左眼、右眼的範圍
  mouth: Box | null; // 嘴巴範圍（NONVER 沒有嘴巴）
  closed: boolean; // 開心版本來就是閉眼／瞇眼：不眨眼，難過時改畫睜開的眼睛
  nose: boolean; // 嘴巴從鼻子往下接一條線
  brows: boolean; // 自己有眉毛，難過時不另外畫八字眉
  top: [number, number]; // 頭頂中央，睡覺的 Z 從這裡飄
}

type EyeShape = 'own' | 'open' | 'line' | 'sleep' | 'cross';
type MouthShape = 'own' | 'frown' | 'flat' | 'small';

export interface Expression {
  eyes: EyeShape;
  ifClosed?: EyeShape; // 開心版是閉眼的角色改用這個
  brows?: boolean; // 難過的八字眉
  mouth: MouthShape;
  tear?: boolean;
}

export const EXPRESSIONS: Record<Mood, Expression> = {
  happy: { eyes: 'own', mouth: 'own' },
  sad: { eyes: 'own', ifClosed: 'open', brows: true, mouth: 'frown', tear: true },
  sick: { eyes: 'cross', mouth: 'flat' },
  sleep: { eyes: 'sleep', mouth: 'small' },
};

// 圖樣以左眼為準（右邊是靠鼻子那側），右眼左右翻轉；# 是一格黑
const BROW = ['..##', '##..'];
const CROSS = ['#.#', '.#.', '#.#'];

/** 閉著的眼睛 ︶，n 格寬 */
const arc = (n: number) => ['#' + '.'.repeat(n - 2) + '#', '.' + '#'.repeat(n - 2) + '.'];

// 嘴巴圖樣，第一列對齊嘴巴範圍頂端；有鼻子的版本多一條往上接鼻子的線
const MOUTHS: Record<Exclude<MouthShape, 'own'>, { nose: string[]; plain: string[] }> = {
  frown: { nose: ['..#..', '.###.', '#...#'], plain: ['.###.', '#...#'] },
  flat: { nose: ['..#..', '#####'], plain: ['#####'] },
  small: { nose: ['.#.', '###'], plain: ['###'] },
};

const INK = '#171614';
const TEAR = '#78b9f5';
const TEAR_EDGE = '#3c78d2';
const Z_BLUE = '#5a96e1';

type Ctx = CanvasRenderingContext2D;

/** 以 (x, y) 為左上角、一格 cell px 畫圖樣；格線對齊整數 px，相鄰格才不會有縫 */
function pattern(ctx: Ctx, rows: string[], x: number, y: number, cell: number, color: string, mirror = false): void {
  ctx.fillStyle = color;
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (row[mirror ? row.length - 1 - i : i] !== '#') continue;
      const x0 = Math.round(x + i * cell);
      const y0 = Math.round(y + j * cell);
      ctx.fillRect(x0, y0, Math.round(x + (i + 1) * cell) - x0, Math.round(y + (j + 1) * cell) - y0);
    }
  });
}

/** 以中心點畫圖樣 */
function centered(ctx: Ctx, rows: string[], cx: number, cy: number, cell: number, color: string, mirror = false): void {
  pattern(ctx, rows, cx - (rows[0].length * cell) / 2, cy - (rows.length * cell) / 2, cell, color, mirror);
}

/** 從開心版複製一塊（多抓 2px，縮圖時邊緣的混色才會一致） */
function copy(ctx: Ctx, happy: CanvasImageSource, [x0, y0, x1, y1]: Box): void {
  const x = Math.floor(x0) - 2;
  const y = Math.floor(y0) - 2;
  const w = Math.ceil(x1) + 2 - x;
  const h = Math.ceil(y1) + 2 - y;
  ctx.drawImage(happy, x, y, w, h, x, y, w, h);
}

/** 畫五官（不含會動的 Z）；blink 為 true 時睜著的眼睛改成閉一下 */
export function drawFace(ctx: Ctx, rig: FaceRig, happy: CanvasImageSource, expr: Expression, blink = false): void {
  const c = rig.cell;
  let eyes = rig.closed && expr.ifClosed ? expr.ifClosed : expr.eyes;
  if (blink && (eyes === 'open' || (eyes === 'own' && !rig.closed))) eyes = 'line';
  rig.eyes.forEach((box, k) => {
    const [x0, y0, x1, y1] = box;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const n = Math.max(3, Math.min(5, Math.round(((x1 - x0) / c) * 0.7)));
    const mirror = k === 1;
    if (eyes === 'own') copy(ctx, happy, box);
    else if (eyes === 'open') centered(ctx, ['##', '##'], cx, cy, c, INK);
    else if (eyes === 'line') centered(ctx, ['#'.repeat(n)], cx, cy, c, INK);
    else if (eyes === 'sleep') centered(ctx, arc(n), cx, cy, c, INK);
    else centered(ctx, CROSS, cx, cy, c, INK);
    if (expr.brows && !rig.brows) centered(ctx, BROW, cx, (eyes === 'own' ? y0 : cy - c) - 1.5 * c, c, INK, mirror);
  });
  if (rig.mouth) {
    if (expr.mouth === 'own') copy(ctx, happy, rig.mouth);
    else {
      const m = MOUTHS[expr.mouth][rig.nose ? 'nose' : 'plain'];
      const [x0, y0, x1] = rig.mouth;
      pattern(ctx, m, (x0 + x1) / 2 - (m[0].length * c) / 2, y0, c, INK);
    }
  }
  if (expr.tear) {
    // 左眼外側下方一滴淚：深藍外框、淺藍裡面
    const [x0, , x1, y1] = rig.eyes[0];
    const x = x0 + (x1 - x0) * 0.15 - 0.7 * c;
    const y = y1 - 0.3 * c;
    ctx.fillStyle = TEAR_EDGE;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(1.4 * c), Math.round(2.2 * c));
    ctx.fillStyle = TEAR;
    ctx.fillRect(Math.round(x + c * 0.35), Math.round(y), Math.round(c * 0.7), Math.round(1.6 * c));
  }
}

const Z = ['#####', '...#.', '..#..', '.#...', '#####'];

/** 睡覺時從頭頂右上飄出兩個 Z，3 秒一輪 */
export function drawZzz(ctx: Ctx, rig: FaceRig, t: number): void {
  const [x, y] = rig.top;
  for (let k = 0; k < 2; k++) {
    const p = ((t / 3000 + k / 2) % 1 + 1) % 1; // 0～1，往上飄並淡出
    const size = rig.cell * (0.55 + 0.25 * p);
    ctx.globalAlpha = p < 0.8 ? 1 : (1 - p) / 0.2;
    pattern(ctx, Z, x + rig.cell * (4 + 4 * p), y + rig.cell * (1 - 4 * p), size, Z_BLUE);
  }
  ctx.globalAlpha = 1;
}
