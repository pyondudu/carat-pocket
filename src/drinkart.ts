// 程式畫的雪克杯與飲料杯（像素格，一格 1px 畫好再整數倍放大），不用生圖

import type { Drink } from './data/drinks';

type Ctx = CanvasRenderingContext2D;

const INK = '#2b2b2b';
const GLASS = '#eaf6fb';
const STRAW = '#f49aa8';

function grid(w: number, h: number, paint: (px: (x: number, y: number, c: string) => void) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  paint((x, y, c) => {
    g.fillStyle = c;
    g.fillRect(x, y, 1, 1);
  });
  return cv;
}

// ---- 雪克杯 ----

// K 深灰鈕、C 淺灰蓋、B 深灰濾網環、S 銀色杯身、H 反光（跟 tools/sprites.py 的 SHAKER 一樣）
const SHAKER = ['..K..', '.CCC.', '.BBB.', 'SHSSS', 'SHSSS', 'SHSSS', '.SSS.'];
const SHAKER_COLORS: Record<string, string> = { K: '#6c7486', C: '#cdd4e0', B: '#6c7486', S: '#acb6c6', H: '#fafcff' };

let shaker: HTMLCanvasElement | null = null;

function shakerCanvas(): HTMLCanvasElement {
  shaker ??= grid(7, 9, (px) => {
    const on = (x: number, y: number) => SHAKER[y]?.[x] !== undefined && SHAKER[y][x] !== '.';
    for (let y = -1; y <= SHAKER.length; y++)
      for (let x = -1; x <= 5; x++) {
        if (on(x, y)) px(x + 1, y + 1, SHAKER_COLORS[SHAKER[y][x]]);
        else if ([-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => on(x + dx, y + dy)))) px(x + 1, y + 1, INK);
      }
  });
  return shaker;
}

/** 以 (cx, cy) 為中心畫雪克杯，cell＝一格幾 px，angle 為弧度 */
export function drawShaker(ctx: Ctx, cx: number, cy: number, cell: number, angle: number): void {
  const cv = shakerCanvas();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, (-cv.width * cell) / 2, (-cv.height * cell) / 2, cv.width * cell, cv.height * cell);
  ctx.restore();
}

/** 搖晃線：杯子旁邊兩組斜線 */
export function drawShakeLines(ctx: Ctx, x: number, y: number, cell: number, side: -1 | 1): void {
  ctx.fillStyle = INK;
  for (const dy of [0, 3]) for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(x + side * i * cell), Math.round(y + (dy - i) * cell), Math.ceil(cell), Math.ceil(cell));
}

// ---- 飲料杯 ----

const CUP_W = 14;
const CUP_H = 18;
const cups = new Map<string, HTMLCanvasElement>();

/** 杯子每一列的左右邊界（上寬下窄） */
const edge = (y: number) => {
  const inset = Math.floor((y - 4) / 5);
  return [1 + inset, 12 - inset] as const;
};

function cupCanvas(d: Drink): HTMLCanvasElement {
  let cv = cups.get(d.id);
  if (cv) return cv;
  cv = grid(CUP_W, CUP_H, (px) => {
    const inside = (x: number, y: number) => {
      if (y < 5 || y > 16) return false;
      const [l, r] = edge(y);
      return x > l && x < r;
    };
    // 外框與杯身
    for (let y = 4; y < CUP_H; y++) {
      const [l, r] = edge(y);
      for (let x = l; x <= r; x++) px(x, y, y === 4 || y === CUP_H - 1 || x === l || x === r ? INK : y === 5 ? GLASS : d.color);
    }
    const ex = d.extra ?? '#ffffff';
    const put = (x: number, y: number, c: string) => inside(x, y) && px(x, y, c);
    switch (d.topping) {
      case 'ice':
        for (const [x, y] of [[4, 7], [8, 9], [5, 12]]) {
          put(x, y, '#ffffff');
          put(x + 1, y, '#e6f6ff');
          put(x, y + 1, '#e6f6ff');
          put(x + 1, y + 1, '#cfe9f7');
        }
        break;
      case 'foam':
        for (let x = 0; x < CUP_W; x++) for (const y of [6, 7]) put(x, y, ex);
        break;
      case 'cap':
        for (let x = 0; x < CUP_W; x++) for (const y of [6, 7, 8]) put(x, y, ex);
        break;
      case 'fruit':
        for (const [x, y] of [[4, 8], [8, 7], [6, 11], [9, 13], [5, 14]]) put(x, y, ex);
        break;
      case 'layer':
        for (let x = 0; x < CUP_W; x++) for (const y of [13, 14, 15, 16]) put(x, y, ex);
        break;
      case 'leaf':
        for (const [x, y] of [[3, 2], [4, 2], [3, 3], [4, 3], [5, 3], [4, 4]]) px(x, y, ex);
        break;
    }
    // 吸管
    for (let y = 0; y < 5; y++) px(9, y, STRAW);
    px(10, 0, STRAW);
  });
  cups.set(d.id, cv);
  return cv;
}

/** 畫飲料杯：水平置中於 cx、底部對齊 bottom，cell＝一格幾 px；silhouette 只畫剪影（圖鑑沒做過的） */
export function drawDrink(ctx: Ctx, d: Drink, cx: number, bottom: number, cell: number, silhouette = false): void {
  let cv = cupCanvas(d);
  if (silhouette) {
    const s = grid(CUP_W, CUP_H, () => {});
    const g = s.getContext('2d')!;
    g.drawImage(cv, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#cfc6d6';
    g.fillRect(0, 0, CUP_W, CUP_H);
    cv = s;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, Math.round(cx - (CUP_W * cell) / 2), Math.round(bottom - CUP_H * cell), CUP_W * cell, CUP_H * cell);
}

/** 建立一個顯示飲料的小 canvas */
export function drinkCanvas(d: Drink, cell = 4, silhouette = false): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = CUP_W * cell;
  cv.height = CUP_H * cell;
  cv.className = 'pixel';
  drawDrink(cv.getContext('2d')!, d, cv.width / 2, cv.height, cell, silhouette);
  return cv;
}
