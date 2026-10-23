// 寵物房間：Canvas 畫房間與主角，DOM 放數值條與動作按鈕

import { getCharacter } from '../data/characters';
import { drawCharacter, SPRITE } from '../draw';
import { applyElapsed, doAction, moodOf, STAT_LABELS, type Action, type PetStats } from '../pet';
import { go, type Scene } from '../router';
import { mainPet, resetSave, save, state } from '../state';
import { h, toast } from '../ui';

const ROOM = 64; // 房間畫布邊長（像素），CSS 放大顯示
const TICK_MS = 5000;

export function homeScene(): Scene {
  let raf = 0;
  let timer = 0;

  return {
    mount(root) {
      const char = getCharacter(state.mainId!);
      const pet = mainPet()!;

      const canvas = h('canvas', { className: 'pixel room', width: ROOM, height: ROOM });
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
        food.textContent = `🍙 ${state.food}`;
        for (const [k, fill] of bars) {
          const v = pet.stats[k];
          fill.style.width = `${v}%`;
          fill.classList.toggle('low', v < 40);
        }
        sleepBtn.textContent = pet.sleeping ? '☀️ 起床' : '🌙 睡覺';
      };

      // 依存檔的 lastSeen 補算到現在，和回到 App 時的補算共用同一個起點，不會重複扣
      const tick = () => {
        applyElapsed(pet, Date.now() - state.lastSeen);
        save();
      };

      const act = (a: Action) => {
        tick();
        if (a === 'feed' && !pet.sleeping) {
          if (state.food <= 0) return toast('沒有食物了（商店之後開放）');
          state.food--;
        }
        toast(doAction(pet, a));
        save();
        refresh();
      };

      const sleepBtn = h('button', { onclick: () => act('sleep') });
      const actions = h(
        'div',
        { className: 'actions' },
        h('button', { textContent: '🍙 餵食', onclick: () => act('feed') }),
        h('button', { textContent: '🎾 玩耍', onclick: () => act('play') }),
        h('button', { textContent: '🫧 清潔', onclick: () => act('clean') }),
        sleepBtn,
      );
      const soon = (name: string) => () => toast(`${name}即將推出`);
      // 網址加 ?debug 才出現：把 lastSeen 往前推，模擬離開幾小時
      const debugTools = () => {
        if (!new URLSearchParams(location.search).has('debug')) return null;
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
        h('button', { textContent: '🥤 搖飲料', onclick: soon('搖飲料') }),
        h('button', { textContent: '🛍️ 商店', onclick: soon('商店') }),
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
            h('button', { className: 'ghost', textContent: '換主角', onclick: () => go('select') }),
          ),
          canvas,
          statsEl,
          actions,
          nav,
          debugTools(),
        ),
      );
      refresh();

      const draw = (t: number) => {
        drawRoom(ctx);
        const mood = moodOf(pet);
        // 醒著時每 0.5 秒跳一下，睡覺時不動
        const bounce = mood === 'sleep' ? 0 : Math.floor(t / 500) % 2;
        drawCharacter(ctx, char, mood, (ROOM - SPRITE) / 2, ROOM - SPRITE - 8 - bounce);
        if (mood === 'sleep') drawZzz(ctx, t);
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

function drawRoom(ctx: CanvasRenderingContext2D): void {
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
