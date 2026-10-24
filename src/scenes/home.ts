// 寵物房間：Canvas 畫房間與主角，DOM 放數值條與動作按鈕

import { getCharacter } from '../data/characters';
import { drawCharacter, hasRig, hasSprite, isHopping, type Motion } from '../draw';
import { doAction, feedSpecial, moodOf, STAT_LABELS, type Action, type PetStats } from '../pet';
import { go, type Scene } from '../router';
import { mainPet, passTime, resetSave, save, state } from '../state';
import { h, modal, toast } from '../ui';

export const ROOM = 64; // 房間以 64 格像素畫
export const ZOOM = 4; // 畫布實際為 256px，角色圖才有足夠解析度
const TICK_MS = 5000;

export function homeScene(): Scene {
  let raf = 0;
  let timer = 0;
  let hopAt: number | undefined; // 最近一次互動的時間，角色會跳一下

  return {
    mount(root) {
      const char = getCharacter(state.mainId!);
      const pet = mainPet()!;

      const canvas = h('canvas', { className: 'pixel room', width: ROOM * ZOOM, height: ROOM * ZOOM });
      const ctx = canvas.getContext('2d')!;
      const coins = h('span');
      const food = h('span');
      const bars = new Map<keyof PetStats, HTMLDivElement>();
      const statsEl = h('div', { className: 'stats' });
      for (const k of Object.keys(STAT_LABELS) as (keyof PetStats)[]) {
        const fill = h('div', { className: 'fill' });
        bars.set(k, fill);
        statsEl.append(h('div', { className: 'stat' }, h('span', { textContent: STAT_LABELS[k] }), h('div', { className: 'meter' }, fill)));
      }

      const refresh = () => {
        coins.textContent = `🪙 ${state.coins}`;
        food.textContent = `🍙 ${state.food}${state.specialFood ? ` ⭐ ${state.specialFood}` : ''}`;
        for (const [k, fill] of bars) {
          const v = pet.stats[k];
          fill.style.width = `${v}%`;
          fill.classList.toggle('low', v < 40);
        }
        sleepBtn.textContent = pet.sleeping ? '☀️ 起床' : '🌙 睡覺';
      };

      // 依存檔的 lastSeen 補算到現在，和回到 App 時的補算共用同一個起點，不會重複扣
      const tick = () => {
        passTime(Date.now() - state.lastSeen);
        save();
      };

      const act = (a: Action) => {
        tick();
        toast(doAction(pet, a));
        if (a !== 'sleep' && !pet.sleeping) hopAt = performance.now();
        save();
        refresh();
      };

      // 餵食選單：一般食物（飯糰）或本命的特殊食物
      const feedMenu = () => {
        tick();
        if (pet.sleeping) return toast('噓…正在睡覺');
        if (state.food <= 0 && state.specialFood <= 0) return toast('沒有食物了，去商店買吧（每 4 小時也會自動補 1 個）');
        const option = (label: string, count: number, note: string, eat: () => string) => {
          const b = h('button', { className: 'feed-option', disabled: count <= 0 }, h('strong', { textContent: `${label} ×${count}` }), h('small', { textContent: note }));
          b.onclick = () => {
            toast(eat());
            hopAt = performance.now();
            save();
            refresh();
            close();
          };
          return b;
        };
        const close = modal(
          h('h2', { textContent: '要餵什麼？' }),
          h(
            'div',
            { className: 'feed-options' },
            option('🍙 飯糰', state.food, '飽足 +30', () => {
              state.food--;
              return doAction(pet, 'feed');
            }),
            option(`⭐ ${char.specialFood}`, state.specialFood, '飽足 +40、心情 +30', () => {
              state.specialFood--;
              feedSpecial(pet);
              return `${char.specialFood}！最喜歡了！`;
            }),
          ),
          h('button', { className: 'ghost', textContent: '🛍️ 去商店買', onclick: () => (close(), go('shop')) }),
        );
      };

      const sleepBtn = h('button', { onclick: () => act('sleep') });
      const actions = h(
        'div',
        { className: 'actions' },
        h('button', { textContent: '🍙 餵食', onclick: feedMenu }),
        h('button', { textContent: '🎾 玩耍', onclick: () => act('play') }),
        h('button', { textContent: '🫧 清潔', onclick: () => act('clean') }),
        sleepBtn,
      );
      const soon = (name: string) => () => toast(`${name}即將推出`);
      // 網址加 ?debug（或 #debug）才出現：把 lastSeen 往前推，模擬離開幾小時
      const debugTools = () => {
        if (!new URLSearchParams(location.search).has('debug') && location.hash !== '#debug') return null;
        const skip = (hours: number) => () => {
          state.lastSeen -= hours * 3_600_000;
          tick();
          refresh();
          toast(`快轉 ${hours} 小時`);
        };
        return h(
          'div',
          { className: 'actions debug' },
          h('button', { textContent: '⏩ 1 小時', onclick: skip(1) }),
          h('button', { textContent: '⏩ 3 小時', onclick: skip(3) }),
          h('button', { textContent: '⏩ 8 小時', onclick: skip(8) }),
          h('button', { textContent: '🗑️ 重來', onclick: () => (resetSave(), go('select')) }),
        );
      };
      const nav = h(
        'nav',
        { className: 'nav' },
        h('button', { textContent: '📷 拍照', onclick: soon('拍照') }),
        h('button', { textContent: '🥤 搖飲料', onclick: () => go('shake') }),
        h('button', { textContent: '🛍️ 商店', onclick: () => go('shop') }),
        h('button', { textContent: '📒 相簿', onclick: soon('相簿') }),
      );

      root.append(
        h(
          'div',
          { className: 'screen home' },
          h(
            'header',
            { className: 'bar' },
            h('h1', { textContent: char.name }),
            h('div', { className: 'wallet' }, coins, food),
          ),
          canvas,
          statsEl,
          actions,
          nav,
          debugTools(),
        ),
      );
      refresh();

      const sprite = hasSprite(char);
      const rig = hasRig(char);
      const draw = (t: number) => {
        ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
        drawRoom(ctx);
        const motion: Motion = { t, hopAt };
        // 跳起來的時候（互動的反應）一律開心
        const mood = isHopping(motion) ? 'happy' : moodOf(pet);
        // 有程式五官的角色自己會呼吸；其他的醒著時每 0.5 秒跳一下，睡覺時不動
        const bounce = rig || mood === 'sleep' ? 0 : Math.floor(t / 500) % 2;
        if (mood === 'sleep' && !sprite) drawZzz(ctx, t); // 正式圖的睡覺版自己有 Z
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawCharacter(ctx, char, mood, (ROOM * ZOOM) / 2, (ROOM - 7) * ZOOM - bounce * ZOOM, sprite ? 168 : 128, motion);
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);

      // 開著 App 時也依真實時間衰減
      timer = window.setInterval(() => {
        tick();
        refresh();
      }, TICK_MS);
    },
    unmount() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    },
  };
}

export function drawRoom(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#fde7e4';
  ctx.fillRect(0, 0, ROOM, ROOM);
  // 窗戶
  ctx.fillStyle = '#8a6a52';
  ctx.fillRect(38, 8, 18, 14);
  ctx.fillStyle = '#bfe3f7';
  ctx.fillRect(39, 9, 16, 12);
  ctx.fillStyle = '#8a6a52';
  ctx.fillRect(46, 9, 1, 12);
  // 地板
  ctx.fillStyle = '#e8c39e';
  ctx.fillRect(0, 44, ROOM, ROOM - 44);
  ctx.fillStyle = '#d9ab80';
  for (let y = 48; y < ROOM; y += 5) ctx.fillRect(0, y, ROOM, 1);
  // 地毯
  ctx.fillStyle = '#92a8d1';
  ctx.fillRect(14, 52, 36, 6);
}

function drawZzz(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.fillStyle = '#5b6b9a';
  const y = 12 - (Math.floor(t / 400) % 4);
  for (const [x, dy] of [[44, 0], [50, -5]]) {
    ctx.fillRect(x, y + dy, 4, 1);
    ctx.fillRect(x + 2, y + dy + 1, 1, 1);
    ctx.fillRect(x + 1, y + dy + 2, 1, 1);
    ctx.fillRect(x, y + dy + 3, 4, 1);
  }
}
