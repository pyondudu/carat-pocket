// 角色繪製集中在這裡：有 AI 生成的圖（public/sprites/<id>/）就用圖，沒有就用程式畫的 32×32 像素佔位圖

import type { Character } from './data/characters';
import type { Mood } from './pet';

/** 角色姿勢：四種表情之外加上搖飲料 */
export type Pose = Mood | 'shake';

export const SPRITE = 32;
const LINE = '#2b2b2b';
const BLUSH = '#f49aa8';

type Ctx = CanvasRenderingContext2D;

/** 逐像素填滿橢圓，保持銳利邊緣 */
function disc(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** 帶黑色外框的橢圓 */
function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  disc(ctx, cx, cy, rx + 1, ry + 1, LINE);
  disc(ctx, cx, cy, rx, ry, color);
}

/** 尖耳朵（三角形），tip 為耳尖座標 */
function pointyEar(ctx: Ctx, tipX: number, tipY: number, dir: -1 | 1, color: string): void {
  for (let i = 0; i < 8; i++) {
    const w = Math.floor(i / 2) + 1;
    const x0 = dir < 0 ? tipX : tipX - w + 1;
    ctx.fillStyle = LINE;
    ctx.fillRect(x0 - 1, tipY + i, w + 2, 1);
    ctx.fillStyle = color;
    if (i > 0) ctx.fillRect(x0, tipY + i, w, 1);
  }
}

function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function face(ctx: Ctx, cx: number, cy: number, mood: Mood): void {
  const lx = cx - 4;
  const rx = cx + 3;
  switch (mood) {
    case 'happy':
      px(ctx, lx, cy, 2, 2, LINE);
      px(ctx, rx, cy, 2, 2, LINE);
      px(ctx, cx - 1, cy + 3, 3, 1, LINE);
      px(ctx, cx - 2, cy + 2, 1, 1, LINE);
      px(ctx, cx + 2, cy + 2, 1, 1, LINE);
      break;
    case 'sad':
      px(ctx, lx, cy, 2, 2, LINE);
      px(ctx, rx, cy, 2, 2, LINE);
      px(ctx, lx, cy + 2, 1, 2, '#6ab4f0');
      px(ctx, cx - 1, cy + 3, 3, 1, LINE);
      px(ctx, cx - 2, cy + 4, 1, 1, LINE);
      px(ctx, cx + 2, cy + 4, 1, 1, LINE);
      break;
    case 'sick':
      for (const ex of [lx, rx]) {
        px(ctx, ex - 1, cy - 1, 1, 1, LINE);
        px(ctx, ex + 1, cy - 1, 1, 1, LINE);
        px(ctx, ex, cy, 1, 1, LINE);
        px(ctx, ex - 1, cy + 1, 1, 1, LINE);
        px(ctx, ex + 1, cy + 1, 1, 1, LINE);
      }
      px(ctx, cx - 2, cy + 3, 5, 1, LINE);
      break;
    case 'sleep':
      px(ctx, lx - 1, cy + 1, 3, 1, LINE);
      px(ctx, rx - 1, cy + 1, 3, 1, LINE);
      px(ctx, cx, cy + 3, 1, 1, LINE);
      break;
  }
  if (mood !== 'sick') {
    px(ctx, lx - 2, cy + 2, 2, 1, BLUSH);
    px(ctx, rx + 2, cy + 2, 2, 1, BLUSH);
  }
}

function render(ctx: Ctx, c: Character, mood: Mood): void {
  const cx = 16;
  const cy = 20;
  // 頭頂/耳朵（畫在身體後面）
  switch (c.shape) {
    case 'longEars':
      for (const ex of [11, 21]) {
        blob(ctx, ex, 8, 2, 6, c.color);
        disc(ctx, ex, 8, 1, 4, c.id === 'choitcherry' ? c.accent : '#fbe7a1');
      }
      break;
    case 'pointyEars':
      pointyEar(ctx, 8, 6, -1, c.color);
      pointyEar(ctx, 24, 6, 1, c.color);
      break;
    case 'roundEars':
      blob(ctx, 8, 11, 3, 3, c.color);
      blob(ctx, 24, 11, 3, 3, c.color);
      break;
    case 'frog':
      blob(ctx, 11, 11, 4, 4, c.color);
      blob(ctx, 21, 11, 4, 4, c.color);
      break;
    case 'fluffy':
      for (const [bx, by] of [[8, 14], [24, 14], [12, 10], [20, 10], [16, 9]]) blob(ctx, bx, by, 3, 3, c.color);
      break;
    default:
      break;
  }

  if (c.shape === 'stack') {
    // O.C.L：白、灰、黑三隻貓疊在一起
    blob(ctx, cx, 26, 9, 4, '#4d4d50');
    blob(ctx, cx, 19, 9, 4, c.color);
    pointyEar(ctx, 9, 6, -1, c.accent);
    pointyEar(ctx, 23, 6, 1, c.accent);
    blob(ctx, cx, 12, 8, 4, c.accent);
    face(ctx, cx, 11, mood);
    return;
  }

  blob(ctx, cx, cy, 10, 9, c.color);
  // 肚子/臉部色塊
  if (c.id === 'jjongtoram' || c.id === 'nonver') disc(ctx, cx, cy - 1, 6, 5, c.accent);
  // CHOITCHERRY 的重點色是耳朵、TAMTAM 是條紋，肚子都是白的
  else if (c.id === 'choitcherry' || c.id === 'tamtam') disc(ctx, cx, cy + 6, 5, 3, '#ffffff');
  else if (c.shape !== 'leaf' && c.shape !== 'tuft' && c.accent !== c.color) disc(ctx, cx, cy + 6, 5, 3, c.accent);
  if (c.id === 'tamtam') {
    px(ctx, cx - 1, cy - 9, 2, 3, c.accent);
    px(ctx, cx - 10, cy - 1, 3, 1, c.accent);
    px(ctx, cx + 8, cy - 1, 3, 1, c.accent);
  }

  if (c.shape === 'leaf') {
    disc(ctx, cx + 2, 9, 3, 2, c.accent);
    px(ctx, cx, 10, 1, 2, '#2e7d32');
  } else if (c.shape === 'tuft') {
    px(ctx, cx, 8, 1, 3, LINE);
    px(ctx, cx + 1, 7, 2, 1, LINE);
    px(ctx, cx - 2, 8, 1, 2, LINE);
    px(ctx, cx - 6, cy + 2, 1, 1, c.accent);
    px(ctx, cx + 6, cy + 2, 1, 1, c.accent);
  }

  if (c.shape === 'frog') {
    face(ctx, cx, 11, mood);
  } else {
    face(ctx, cx, cy - 2, mood);
  }
  if (c.id === 'foxdungee') {
    // 圓眼鏡
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 6.5, cy - 3.5, 5, 4);
    ctx.strokeRect(cx + 1.5, cy - 3.5, 5, 4);
  }
}

const cache = new Map<string, HTMLCanvasElement>();

function spriteFor(c: Character, mood: Mood): HTMLCanvasElement {
  const key = `${c.id}:${mood}`;
  let cv = cache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = cv.height = SPRITE;
    render(cv.getContext('2d')!, c, mood);
    cache.set(key, cv);
  }
  return cv;
}

// ---- AI 生成的角色圖 ----

/** 已經有正式圖的角色；每個角色資料夾放 happy/sad/sleep/shake 四張 */
const SPRITE_IDS = [
  'choitcherry', 'jjongtoram', 'shuasum', 'ocl', 'tamtam', 'foxdungee', 'ppyopuli',
  'thepalee', 'kimja', 'doa', 'bboogyuli', 'nonver', 'chandalee',
];
const SPRITE_FILES: Record<Pose, string> = { happy: 'happy', sad: 'sad', sick: 'sad', sleep: 'sleep', shake: 'shake' };
const images = new Map<string, HTMLImageElement>();

/** 開始遊戲前先載入所有角色圖；載入失敗的就退回佔位圖 */
export function loadSprites(): Promise<void> {
  const jobs = SPRITE_IDS.flatMap((id) =>
    [...new Set(Object.values(SPRITE_FILES))].map(
      (file) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            images.set(`${id}:${file}`, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = `${import.meta.env.BASE_URL}sprites/${id}/${file}.png`;
        }),
    ),
  );
  return Promise.all(jobs).then(() => undefined);
}

function imageFor(c: Character, pose: Pose): HTMLImageElement | undefined {
  return images.get(`${c.id}:${SPRITE_FILES[pose]}`);
}

/** 畫角色：水平置中於 cx、腳底對齊 bottom、高度約 height 像素 */
export function drawCharacter(ctx: Ctx, c: Character, pose: Pose, cx: number, bottom: number, height: number): void {
  const img = imageFor(c, pose);
  if (img) {
    // AI 圖解析度比畫面高，縮小時開平滑才不會破碎
    const w = (img.width * height) / img.height;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, Math.round(cx - w / 2), Math.round(bottom - height), Math.round(w), Math.round(height));
    return;
  }
  // 佔位圖：以整數倍放大，保持像素銳利
  const scale = Math.max(1, Math.floor(height / SPRITE));
  const size = SPRITE * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spriteFor(c, pose === 'shake' ? 'happy' : pose), Math.round(cx - size / 2), Math.round(bottom - size), size, size);
}

export function hasSprite(c: Character): boolean {
  return imageFor(c, 'happy') !== undefined;
}

/** 建立一個顯示單一角色的小 canvas（選角格子、介紹視窗用） */
export function characterCanvas(c: Character, pose: Pose = 'happy'): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  // 有正式圖時用較高解析度，佔位圖維持 32px 再由 CSS 放大
  const size = hasSprite(c) ? 160 : SPRITE;
  cv.width = cv.height = size;
  cv.className = hasSprite(c) ? 'art' : 'pixel';
  drawCharacter(cv.getContext('2d')!, c, pose, size / 2, size, size);
  return cv;
}
