// 手錶版 Pocket（網址加 #watch，工具頁）：預覽 410×502 手錶畫面，並把手錶要讀的圖輸出到 watch/
// 手錶程式在另一個專案（ESP32 S3 Watch），這裡只負責畫面設計和圖檔；版面數字要跟 watch/RULES.md 一致

import { CHARACTERS, getCharacter, type Character } from '../data/characters';
import { contentBox, drawCharacter, hasSprite } from '../draw';
import type { Mood, PetStats } from '../pet';
import { STAT_LABELS } from '../pet';
import type { Scene } from '../router';
import { state } from '../state';
import { h, toast } from '../ui';
import { BROOM_ART, BROOM_COLORS, DIGITS, drawBroom, drawRoom, drawTrash, drawWindow, ROOM, sweepX, SWEEP_MS, TRASH, TRASH_ART, TRASH_COLORS } from './home';

// ── 手錶畫面版面（px，手錶螢幕座標）──
export const WATCH = { w: 410, h: 502 };
const ZOOM = 5; // 房間 64 格 × 5 = 320
export const LAYOUT = {
  stats: { x: 20, y: 14, colW: 180, gap: 10, rowH: 30, barH: 14 }, // 2 欄 × 2 列
  room: { x: (WATCH.w - ROOM * ZOOM) / 2, y: 82, zoom: ZOOM },
  // 角色：水平置中、腳底在房間第 57 格（跟網頁一樣）；原畫質高 210（網頁 168 × 5/4），56 格版一格 4px
  char: { floorCell: ROOM - 7, fullHeight: 210, pxCell: 4 },
  buttons: { y: 414, h: 74, w: 116, gap: 11, radius: 12, border: 2, shadow: 3 },
};

const POSES: Mood[] = ['happy', 'sad', 'sick', 'sleep'];
const POSE_LABEL: Record<Mood, string> = { happy: '開心', sad: '難過', sick: '生病', sleep: '睡覺' };
// 預覽用的數值（看表情時數值條也要對得上）
const PRESET: Record<Mood, PetStats> = {
  happy: { hunger: 82, mood: 76, clean: 90, energy: 64 },
  sad: { hunger: 60, mood: 35, clean: 60, energy: 70 },
  sick: { hunger: 10, mood: 30, clean: 35, energy: 50 },
  sleep: { hunger: 70, mood: 66, clean: 75, energy: 20 },
};
const TIMES = { day: 12, dusk: 18, night: 22 } as const;
type TimeKey = keyof typeof TIMES;
const TIME_LABEL: Record<TimeKey, string> = { day: '白天', dusk: '傍晚', night: '晚上' };

const INK = '#2b2b2b';
const BAR_OK = '#8fd18f';
const BAR_LOW = '#f08a8a';
const BTN_BG = '#ffffff';
const BTN_SECONDARY = '#eef2fb';
const SCREEN_BG = '#fff6f2';

const timeAt = (hour: number, min = 30) => {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d;
};

/** 300×280（happy.png 原尺寸）畫一個表情；motion t=0：不呼吸、不眨眼，睡覺的 Z 固定在一個位置 */
function fullCanvas(c: Character, pose: Mood): HTMLCanvasElement {
  const box = contentBox(c);
  const cv = document.createElement('canvas');
  cv.width = box.width;
  cv.height = box.height;
  drawCharacter(cv.getContext('2d')!, c, pose, box.width / 2, box.height, box.height, { t: 0 });
  return cv;
}

function artCanvas(art: string[], colors: Record<string, string>): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.max(...art.map((r) => r.length));
  cv.height = art.length;
  const g = cv.getContext('2d')!;
  art.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = colors[ch];
      g.fillRect(x, y, 1, 1);
    }),
  );
  return cv;
}

function roomLayer(draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = ROOM;
  draw(cv.getContext('2d')!);
  return cv;
}

async function upload(path: string, body: Blob | string): Promise<void> {
  const res = await fetch(`/__watch-export/${path}`, { method: 'POST', body });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
}

const png = (cv: HTMLCanvasElement) => new Promise<Blob>((ok) => cv.toBlob((b) => ok(b!), 'image/png'));

/** 輸出手錶要讀的全部圖檔（只在 npm run dev 有效） */
async function exportAll(onProgress: (msg: string) => void): Promise<void> {
  const chars = CHARACTERS.filter(hasSprite);
  for (const c of chars) {
    onProgress(`角色 ${c.name}…`);
    for (const pose of POSES) await upload(`sprites/${c.id}/full/${pose}.png`, await png(fullCanvas(c, pose)));
  }
  onProgress('房間圖層…');
  await upload('room/base.png', await png(roomLayer((g) => drawRoom(g, false, new Date(), false))));
  for (const [key, hour] of Object.entries(TIMES)) await upload(`room/window_${key}.png`, await png(roomLayer((g) => drawWindow(g, timeAt(hour)))));
  for (const [kind, art] of Object.entries(TRASH_ART)) await upload(`room/trash_${kind}.png`, await png(artCanvas(art, TRASH_COLORS)));
  await upload('room/broom.png', await png(artCanvas(BROOM_ART, BROOM_COLORS)));
  const room = {
    note: '由 Carat Pocket 的 #watch 頁產生，不要手改；規則見 RULES.md',
    size: ROOM,
    layers: {
      base: 'base.png',
      window: { day: 'window_day.png', dusk: 'window_dusk.png', night: 'window_night.png' },
      windowRule: '6:00–16:59 day、17:00–18:59 dusk、19:00–5:59 night',
    },
    // [x, y, 種類, 清潔「低於」這個值才出現]（房間格座標，左上角）
    trash: TRASH.map(([x, y, kind, below]) => ({ x, y, file: `trash_${kind}.png`, below })),
    broom: { file: 'broom.png', sweepMs: SWEEP_MS, top: ROOM - 3 - BROOM_ART.length, rule: '刷毛中心 x 從 -4 線性走到 ROOM+4；x − 3 是圖的左邊，再加 sin(t/70)×2 左右刷；中心經過的垃圾消失' },
    clock: {
      x: 1, y: 1, w: 21, h: 9, frame: '#8a6a52', screen: '#2f3a4a', digit: '#9ff0c4',
      screenInset: 1, digitY: 3, digitX: [3, 7, 13, 17], colon: [[11, 4], [11, 6]],
      digits: DIGITS, digitRule: '3×5，每列 3 bit（4=左、1=右）；冒號秒數偶數時亮',
    },
  };
  await upload('room/room.json', JSON.stringify(room, null, 2) + '\n');
  await upload('layout.json', JSON.stringify({ note: room.note, screen: WATCH, ...LAYOUT, colors: { bg: SCREEN_BG, ink: INK, barOk: BAR_OK, barLow: BAR_LOW, barLowBelow: 40, button: BTN_BG, buttonSecondary: BTN_SECONDARY } }, null, 2) + '\n');
  await upload('characters.json', JSON.stringify(chars.map((c) => ({ id: c.id, name: c.name })), null, 2) + '\n');
}

export function watchScene(): Scene {
  let raf = 0;
  return {
    mount(root) {
      const cv = h('canvas', { className: 'watch-screen', width: WATCH.w, height: WATCH.h });
      const ctx = cv.getContext('2d')!;
      const opts = { id: state.mainId ?? CHARACTERS.find(hasSprite)!.id, pose: 'happy' as Mood, time: 'day' as TimeKey, clean: 90, px: false, food: 12 };
      let hopAt = -1e9;
      let sweepAt: number | undefined;
      const pxImages = new Map<string, HTMLImageElement | null>();

      const pxImage = (id: string, pose: Mood) => {
        const key = `${id}:${pose}`;
        if (!pxImages.has(key)) {
          pxImages.set(key, null);
          const img = new Image();
          img.onload = () => {
            pxImages.set(key, img);
            render(performance.now());
          };
          img.src = `./watch/sprites/${id}/px56/${pose}.png`;
        }
        return pxImages.get(key);
      };

      const roundRect = (x: number, y: number, w: number, hh: number, r: number) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, hh, r);
      };

      const button = (x: number, label: string, sub: string, secondary = false) => {
        const b = LAYOUT.buttons;
        ctx.fillStyle = INK;
        roundRect(x + b.shadow, b.y + b.shadow, b.w, b.h, b.radius);
        ctx.fill();
        ctx.fillStyle = secondary ? BTN_SECONDARY : BTN_BG;
        roundRect(x, b.y, b.w, b.h, b.radius);
        ctx.fill();
        ctx.lineWidth = b.border;
        ctx.strokeStyle = INK;
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "700 24px 'Noto Sans TC', sans-serif";
        ctx.fillText(label, x + b.w / 2, b.y + (sub ? 28 : b.h / 2));
        if (sub) {
          ctx.font = "15px 'Noto Sans TC', sans-serif";
          ctx.fillText(sub, x + b.w / 2, b.y + 54);
        }
      };

      const render = (t: number) => {
        const c = getCharacter(opts.id);
        const stats = { ...PRESET[opts.pose], clean: opts.clean };
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = SCREEN_BG;
        ctx.fillRect(0, 0, WATCH.w, WATCH.h);

        // 數值條 2×2
        const s = LAYOUT.stats;
        (Object.keys(STAT_LABELS) as (keyof PetStats)[]).forEach((k, i) => {
          const x = s.x + (i % 2) * (s.colW + s.gap);
          const y = s.y + Math.floor(i / 2) * s.rowH;
          ctx.fillStyle = INK;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.font = "16px 'Noto Sans TC', sans-serif";
          ctx.fillText(STAT_LABELS[k], x, y + s.barH / 2 + 1);
          const bx = x + 42;
          const bw = s.colW - 42;
          ctx.fillStyle = '#ffffff';
          roundRect(bx, y, bw, s.barH, 6);
          ctx.fill();
          ctx.save();
          ctx.clip();
          ctx.fillStyle = stats[k] < 40 ? BAR_LOW : BAR_OK;
          ctx.fillRect(bx, y, (bw * stats[k]) / 100, s.barH);
          ctx.restore();
          ctx.lineWidth = 2;
          ctx.strokeStyle = INK;
          roundRect(bx, y, bw, s.barH, 6);
          ctx.stroke();
        });

        // 房間（64 格，整數倍放大）
        const r = LAYOUT.room;
        const now = timeAt(TIMES[opts.time], new Date().getMinutes());
        ctx.imageSmoothingEnabled = false;
        ctx.setTransform(r.zoom, 0, 0, r.zoom, r.x, r.y);
        drawRoom(ctx, true, now);
        const broomX = sweepAt === undefined ? undefined : sweepX((t - sweepAt) / SWEEP_MS);
        drawTrash(ctx, broomX !== undefined && (t - sweepAt!) >= SWEEP_MS ? 100 : opts.clean, broomX);

        // 角色：點按鈕時跳一下（0.4 秒），其他時間靜止
        const hp = (t - hopAt) / 400;
        const up = hp >= 0 && hp < 1 ? Math.sin(hp * Math.PI) * 16 : 0;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const floor = r.y + LAYOUT.char.floorCell * r.zoom - up;
        const cx = WATCH.w / 2;
        if (opts.px) {
          const img = pxImage(c.id, opts.pose);
          if (img) {
            const k = LAYOUT.char.pxCell;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, Math.round(cx - (img.width * k) / 2), Math.round(floor - img.height * k), img.width * k, img.height * k);
          } else {
            ctx.fillStyle = INK;
            ctx.textAlign = 'center';
            ctx.font = "16px 'Noto Sans TC', sans-serif";
            ctx.fillText('還沒輸出 56 格版', cx, floor - 100);
          }
        } else {
          drawCharacter(ctx, c, opts.pose, cx, floor, LAYOUT.char.fullHeight, { t: 0 });
        }
        if (broomX !== undefined) {
          ctx.imageSmoothingEnabled = false;
          ctx.setTransform(r.zoom, 0, 0, r.zoom, r.x, r.y);
          drawBroom(ctx, broomX, t);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        // 下面三顆按鈕
        const b = LAYOUT.buttons;
        const xs = [0, 1, 2].map((i) => (WATCH.w - (3 * b.w + 2 * b.gap)) / 2 + i * (b.w + b.gap));
        button(xs[0], '餵食', `剩 ${opts.food} 個`);
        button(xs[1], '清潔', '');
        button(xs[2], opts.pose === 'sleep' ? '起床' : '睡覺', '', true);
      };

      // 只有動畫中才持續重畫，平常靜止（跟手錶一樣省電）
      const animate = () => {
        const t = performance.now();
        render(t);
        const busy = t - hopAt < 400 || (sweepAt !== undefined && t - sweepAt < SWEEP_MS);
        if (busy) raf = requestAnimationFrame(animate);
        else {
          if (sweepAt !== undefined) {
            sweepAt = undefined;
            opts.clean = 100;
            cleanInput.value = '100';
          }
          render(t);
        }
      };
      const play = () => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(animate);
      };

      // 點預覽上的按鈕可以試操作
      cv.onclick = (e) => {
        const rect = cv.getBoundingClientRect();
        const x = ((e.clientX - rect.left) * WATCH.w) / rect.width;
        const y = ((e.clientY - rect.top) * WATCH.h) / rect.height;
        const b = LAYOUT.buttons;
        if (y < b.y || y > b.y + b.h) return;
        const i = Math.floor((x - (WATCH.w - (3 * b.w + 2 * b.gap)) / 2) / (b.w + b.gap));
        if (i === 2) {
          opts.pose = opts.pose === 'sleep' ? 'happy' : 'sleep';
          poseSel.value = opts.pose;
          return play();
        }
        if (opts.pose === 'sleep') return toast('噓…正在睡覺');
        if (i === 0) {
          if (opts.food <= 0) return toast('沒有食物了');
          opts.food--;
          hopAt = performance.now();
        }
        if (i === 1) {
          if (opts.clean >= 70) return toast('很乾淨，不需要清潔喔');
          sweepAt = performance.now();
          hopAt = sweepAt + SWEEP_MS;
        }
        play();
      };

      // 手錶上沒有能加心情的動作：心情 < 40 時進 Pocket 提醒玩家用手機補（使用者 2026-10-31）
      const moodHint = () => {
        if (PRESET[opts.pose].mood < 40) toast(`${getCharacter(opts.id).name} 心情不太好，\n有空用手機陪他玩吧`);
      };

      const select = <T extends string>(entries: [T, string][], value: T, set: (v: T) => void) => {
        const el = h('select', {}, ...entries.map(([v, label]) => h('option', { value: v, textContent: label })));
        el.value = value;
        el.onchange = () => {
          set(el.value as T);
          moodHint();
          play();
        };
        return el;
      };
      const charSel = select(CHARACTERS.filter(hasSprite).map((c) => [c.id, c.name]), opts.id, (v) => (opts.id = v));
      const poseSel = select(POSES.map((p) => [p, POSE_LABEL[p]]), opts.pose, (v) => (opts.pose = v));
      const timeSel = select((Object.keys(TIMES) as TimeKey[]).map((k) => [k, TIME_LABEL[k]]), opts.time, (v) => (opts.time = v));
      const qualSel = select([['full', '原畫質'], ['px', '56 格・24 色']], 'full', (v) => (opts.px = v === 'px'));
      const cleanInput = h('input', { type: 'range', min: '0', max: '100', value: String(opts.clean) });
      cleanInput.oninput = () => {
        opts.clean = +cleanInput.value;
        play();
      };
      const status = h('p', { className: 'hint', textContent: '' });
      const exportBtn = h('button', {
        textContent: '輸出給手錶',
        onclick: async () => {
          exportBtn.disabled = true;
          try {
            await exportAll((m) => (status.textContent = m));
            document.title = 'export-done';
            status.textContent = '完成：watch/ 已更新，接著跑 python3 tools/watch_pixel.py 產生 56 格版';
            pxImages.clear();
          } catch (err) {
            status.textContent = `輸出失敗（要用 npm run dev 開）：${err}`;
          }
          exportBtn.disabled = false;
        },
      });

      root.append(
        h(
          'div',
          { className: 'screen' },
          h('header', { className: 'bar' }, h('h1', { textContent: '手錶版預覽' })),
          h('p', { className: 'hint', textContent: '410×502 手錶畫面；點下面三顆按鈕可以試操作' }),
          cv,
          h(
            'div',
            { className: 'watch-controls' },
            h('label', {}, '角色 ', charSel),
            h('label', {}, '表情 ', poseSel),
            h('label', {}, '時段 ', timeSel),
            h('label', {}, '畫質 ', qualSel),
            h('label', {}, '清潔 ', cleanInput),
          ),
          exportBtn,
          status,
        ),
      );
      play();
      // #watch-export：進來就自動輸出（用 headless 瀏覽器跑，不用手動按）
      if (location.hash === '#watch-export') exportBtn.click();
    },
    unmount() {
      cancelAnimationFrame(raf);
    },
  };
}
