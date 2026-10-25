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

// ---- 克拉棒（照十週年紀念款自己畫：透明球頂裡有藍色皇冠鑽石、銀藍色環、菱格紋握把由藍漸層到粉） ----

// D 球頂玻璃、d 玻璃暗面、s 反光、G/g 鑽石深淺、R/r 銀藍環、N 接頭、B/b M/m P/p 握把藍→紫→粉（深淺交錯做菱格紋）、C 底蓋
const CARATBONG = [
  '...DDDDD...',
  '.DDsDDDdDD.',
  '.DsDDDDDdD.',
  'DDDgDgDgDdD',
  'DdGGgGgGGdD',
  'DDdGGGGGdDD',
  '.DDdGGGdDD.',
  '.DdDDGDDdD.',
  '..DDDDDDD..',
  'RRRRRRRRRRR',
  'rrrrrrrrrrr',
  '.RRRRRRRRR.',
  '...NNNNN...',
  '...BbBbB...',
  '...bBbBb...',
  '...BbBbB...',
  '...bBbBb...',
  '...MmMmM...',
  '...mMmMm...',
  '...MmMmM...',
  '...PpPpP...',
  '...pPpPp...',
  '...PpPpP...',
  '...pPpPp...',
  '...CCCCC...',
];
const BONG_COLORS: Record<string, string> = {
  D: '#eef7fd', d: '#c9dff0', s: '#ffffff', G: '#4f86d4', g: '#8db8ee', R: '#b4c4d8', r: '#7d93b2', N: '#c9d5e3',
  B: '#b7d0ee', b: '#93b5e0', M: '#d3c6ea', m: '#b6a7da', P: '#f6c4d2', p: '#ec9fb6', C: '#9fb0c6',
};
/** 按下時球頂發光的顏色（粉、藍是應援色） */
export type Glow = 'pink' | 'blue';
const GLOW_DOME: Record<Glow, Record<string, string>> = {
  pink: { D: '#ffe1ea', d: '#f9b0c6', s: '#ffffff' },
  blue: { D: '#dcebff', d: '#a6c8f6', s: '#ffffff' },
};
export const GLOW_COLOR: Record<Glow, string> = { pink: '#f78fb0', blue: '#6f9ee8' };
const BONG_W = CARATBONG[0].length + 2;
const BONG_H = CARATBONG.length + 2;
const BONG_DOME_Y = 4.5; // 球頂中心在第幾格（發光的圓心）

const bongs = new Map<string, HTMLCanvasElement>();

function bongCanvas(glow?: Glow): HTMLCanvasElement {
  const key = glow ?? 'off';
  let cv = bongs.get(key);
  if (cv) return cv;
  const on = (x: number, y: number) => CARATBONG[y]?.[x] !== undefined && CARATBONG[y][x] !== '.';
  cv = grid(BONG_W, BONG_H, (px) => {
    for (let y = -1; y <= CARATBONG.length; y++)
      for (let x = -1; x <= CARATBONG[0].length; x++) {
        if (on(x, y)) {
          const ch = CARATBONG[y][x];
          px(x + 1, y + 1, (glow && GLOW_DOME[glow][ch]) || BONG_COLORS[ch]);
        } else if ([-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => on(x + dx, y + dy)))) px(x + 1, y + 1, INK);
      }
  });
  bongs.set(key, cv);
  return cv;
}

/** 以 (cx, cy) 為中心畫克拉棒，cell＝一格幾 px，angle 為弧度；glow 時球頂變色並有一圈光暈 */
export function drawCaratBong(ctx: Ctx, cx: number, cy: number, cell: number, angle: number, glow?: Glow): void {
  const cv = bongCanvas(glow);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  if (glow) {
    const gy = (BONG_DOME_Y + 1 - BONG_H / 2) * cell;
    const r = cell * 11;
    const g = ctx.createRadialGradient(0, gy, cell * 3, 0, gy, r);
    g.addColorStop(0, GLOW_COLOR[glow] + 'aa');
    g.addColorStop(1, GLOW_COLOR[glow] + '00');
    ctx.fillStyle = g;
    ctx.fillRect(-r, gy - r, r * 2, r * 2);
  }
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
