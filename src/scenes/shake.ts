// 搖飲料：選 2～3 種原料 → 10 秒連點「搖！」→ 做出飲料、拿金幣、記進圖鑑

import { getCharacter } from '../data/characters';
import { DRINKS, getIngredient, MYSTERY, type Drink } from '../data/drinks';
import { drawCharacter, hasSprite, type Motion } from '../draw';
import { drawDrink, drawShakeLines, drawShaker, drinkCanvas } from '../drinkart';
import { applyShake, shakeBlocked } from '../pet';
import { go, type Scene } from '../router';
import {
  availableIngredients, coinsFor, makeDrink, MAX_PICK, MIN_PICK, QUALITY_LABELS, qualityOf, SHAKE_SECONDS, type Quality,
} from '../shake';
import { mainPet, passTime, save, state } from '../state';
import { h, modal, toast } from '../ui';
import { drawClock, ROOM, ZOOM } from './home';

type Phase = 'pick' | 'shake' | 'result';

// ---- 手搖飲店（使用者 2026-10-26 嫌原本空房間太簡陋，選了「手搖飲店吧台」） ----

const COUNTER_TOP = 50; // 吧台桌面（房間格），本命站在吧台後面、飲料放在桌面上

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** 背景：牆、遮陽棚、黑板菜單、飲料架、時鐘（畫在角色後面） */
function drawShop(ctx: CanvasRenderingContext2D): void {
  px(ctx, 0, 0, ROOM, ROOM, '#fdeee4');
  // 下半牆面磁磚
  px(ctx, 0, 34, ROOM, COUNTER_TOP - 34, '#f6dccd');
  for (let y = 37; y < COUNTER_TOP; y += 4) px(ctx, 0, y, ROOM, 1, '#ecc9b6');
  for (let y = 34; y < COUNTER_TOP; y += 4) for (let x = (y / 4) % 2 ? 0 : 3; x < ROOM; x += 6) px(ctx, x, y, 1, 3, '#ecc9b6');
  // 遮陽棚：粉白條紋，下緣一顆顆圓弧（從時鐘右邊開始，不擋時鐘）
  for (let x = 24; x < ROOM; x += 4) {
    const c = (x / 4) % 2 ? '#f49aa8' : '#fffaf0';
    px(ctx, x, 0, 4, 5, c);
    px(ctx, x + 1, 5, 2, 1, c);
  }
  px(ctx, 24, 6, 40, 1, '#ecc9b6');
  // 黑板菜單：木框、標題、三行字和價錢
  px(ctx, 2, 13, 20, 19, '#8a6a52');
  px(ctx, 3, 14, 18, 17, '#35504a');
  px(ctx, 5, 16, 8, 2, '#f7a8bf');
  px(ctx, 16, 15, 3, 1, '#fffaf0'); // 小杯子：杯蓋
  px(ctx, 16, 16, 3, 3, '#c9a27a');
  px(ctx, 18, 14, 1, 1, '#f7a8bf'); // 吸管
  for (const [y, w] of [[21, 9], [24, 7], [27, 10]] as const) {
    px(ctx, 5, y, w, 1, '#e8efe8');
    px(ctx, 17, y, 2, 1, '#ffe27a');
  }
  // 右邊架子：上層飲料杯、下層原料罐
  for (const y of [21, 33]) {
    px(ctx, 50, y, 14, 2, '#b98a62');
    px(ctx, 52, y + 2, 1, 2, '#8a6a52');
    px(ctx, 61, y + 2, 1, 2, '#8a6a52');
  }
  for (const [x, c] of [[52, '#d9a98a'], [56, '#a8d8a0'], [60, '#c9b2e8']] as const) {
    px(ctx, x, 14, 1, 2, '#f49aa8'); // 吸管
    px(ctx, x - 1, 16, 3, 1, '#fffaf0'); // 杯蓋
    px(ctx, x - 1, 17, 3, 4, c);
    px(ctx, x - 1, 19, 3, 1, '#5a4034'); // 珍珠
  }
  px(ctx, 50, 26, 5, 7, '#eaf6fb'); // 珍珠罐
  px(ctx, 51, 29, 3, 4, '#5a4034');
  px(ctx, 50, 25, 5, 1, '#b98a62');
  px(ctx, 57, 27, 5, 6, '#eaf6fb'); // 糖罐
  px(ctx, 58, 29, 3, 4, '#fffaf0');
  px(ctx, 57, 26, 5, 1, '#f49aa8');
  drawClock(ctx, new Date());
}

/** 前景：吧台（畫在角色前面，擋住腳），左邊桌上一疊杯子和吸管筒 */
function drawCounter(ctx: CanvasRenderingContext2D): void {
  px(ctx, 0, COUNTER_TOP, ROOM, 1, '#e8bc90');
  px(ctx, 0, COUNTER_TOP + 1, ROOM, 2, '#c08a5c');
  px(ctx, 0, COUNTER_TOP + 3, ROOM, ROOM - COUNTER_TOP - 3, '#f7cac9');
  for (let x = 3; x < ROOM; x += 6) px(ctx, x, COUNTER_TOP + 3, 1, ROOM - COUNTER_TOP - 5, '#efb3b8');
  px(ctx, 0, ROOM - 2, ROOM, 2, '#d79aa4');
  // 吧台正面中間的小招牌：粉色圓角框＋杯子
  const sy = COUNTER_TOP + 4;
  px(ctx, 26, sy, 12, 7, '#fffaf0');
  px(ctx, 27, sy + 1, 10, 5, '#fde6ee');
  px(ctx, 30, sy + 2, 4, 1, '#ffffff');
  px(ctx, 30, sy + 3, 4, 2, '#c9a27a');
  px(ctx, 33, sy + 1, 1, 1, '#f49aa8');
  // 桌上：一疊杯子、吸管筒
  for (let i = 0; i < 4; i++) px(ctx, 3, COUNTER_TOP - 2 - i * 2, 5, 2, i % 2 ? '#fffaf0' : '#eae2da');
  px(ctx, 10, COUNTER_TOP - 4, 3, 4, '#92a8d1');
  for (const [x, c] of [[10, '#f49aa8'], [11, '#ffe27a'], [12, '#a8d8a0']] as const) px(ctx, x, COUNTER_TOP - 7 + (x % 2), 1, 3, c);
}

interface Result {
  drink: Drink;
  quality: Quality;
  coins: number;
  isNew: boolean;
}

export function shakeScene(): Scene {
  let raf = 0;
  let timer = 0;

  return {
    mount(root) {
      const char = getCharacter(state.mainId!);
      const pet = mainPet()!;
      // 進來先補算時間，體力才是最新的
      passTime(Date.now() - state.lastSeen);
      save();

      let phase: Phase = 'pick';
      let picked: string[] = [];
      let taps = 0;
      let tapAt: number | undefined;
      let hopAt: number | undefined;
      let result: Result | null = null;

      const canvas = h('canvas', { className: 'pixel room', width: ROOM * ZOOM, height: ROOM * ZOOM });
      const ctx = canvas.getContext('2d')!;
      const coins = h('span', { textContent: `🪙 ${state.coins}` });
      const panel = h('div', { className: 'shake-panel' });

      const showPick = () => {
        phase = 'pick';
        clearInterval(timer);
        const blocked = shakeBlocked(pet);
        if (blocked) {
          panel.replaceChildren(h('p', { className: 'hint', textContent: blocked }), h('button', { className: 'primary', textContent: '回房間', onclick: () => go('home') }));
          return;
        }
        const start = h('button', { className: 'primary', textContent: '開始搖！（體力 −10）', onclick: () => startShake() });
        const count = h('span');
        const update = () => {
          start.disabled = picked.length < MIN_PICK;
          count.textContent = `已選 ${picked.length}／${MAX_PICK}`;
          for (const b of buttons) b.classList.toggle('on', picked.includes(b.dataset.id!));
        };
        const buttons = availableIngredients(state.unlocked).map((ing) => {
          const b = h('button', { className: `ing${ing.owner ? ' special' : ''}` }, h('i'), ing.name);
          b.dataset.id = ing.id;
          b.style.setProperty('--c', ing.color);
          b.onclick = () => {
            if (picked.includes(ing.id)) picked = picked.filter((x) => x !== ing.id);
            else if (picked.length < MAX_PICK) picked = [...picked, ing.id];
            else return toast(`最多選 ${MAX_PICK} 種`);
            update();
          };
          return b;
        });
        panel.replaceChildren(
          h('p', { className: 'hint' }, `選 ${MIN_PICK}～${MAX_PICK} 種原料，加果糖會更好喝。`, count),
          h('div', { className: 'ings' }, ...buttons),
          start,
        );
        update();
      };

      const startShake = () => {
        phase = 'shake';
        taps = 0;
        let end = 0; // 第一下才開始倒數
        const count = h('strong', { className: 'taps', textContent: '0' });
        const left = h('span', { className: 'left', textContent: `⏱ ${SHAKE_SECONDS.toFixed(1)} 秒` });
        const btn = h('button', { className: 'shake-btn ready', textContent: '點擊此處開始搖' });
        const tick = () => {
          const ms = Math.max(0, end - performance.now());
          left.textContent = `⏱ ${(ms / 1000).toFixed(1)} 秒`;
          if (ms <= 0) finish();
        };
        // pointerdown 比 click 快，連點才不會漏
        btn.onpointerdown = (e) => {
          e.preventDefault();
          if (!end) {
            end = performance.now() + SHAKE_SECONDS * 1000;
            btn.textContent = '搖！';
            btn.classList.remove('ready');
            timer = window.setInterval(tick, 100);
          }
          taps++;
          tapAt = performance.now();
          count.textContent = String(taps);
        };
        panel.replaceChildren(h('div', { className: 'shake-info' }, left, count, h('span', { textContent: '下' })), btn);
      };

      const finish = () => {
        clearInterval(timer);
        passTime(Date.now() - state.lastSeen);
        const drink = makeDrink(picked);
        const quality = qualityOf(taps, picked, drink);
        const isNew = drink !== MYSTERY && !state.codex[drink.id];
        const gain = coinsFor(drink, quality, isNew);
        state.coins += gain;
        if (drink !== MYSTERY) {
          const entry = (state.codex[drink.id] ??= { count: 0, best: 0 });
          entry.count++;
          entry.best = Math.max(entry.best, quality);
        }
        applyShake(pet);
        save();
        result = { drink, quality, coins: gain, isNew };
        phase = 'result';
        hopAt = performance.now();
        coins.textContent = `🪙 ${state.coins}`;
        showResult();
      };

      const showResult = () => {
        const r = result!;
        const stars = '★'.repeat(r.quality) + '☆'.repeat(3 - r.quality);
        const comment = r.drink === MYSTERY ? '好像不是任何一種飲料…換個組合試試？' : `${taps} 下，${QUALITY_LABELS[r.quality]}！`;
        panel.replaceChildren(
          h(
            'div',
            { className: 'result' },
            drinkCanvas(r.drink, 5),
            h(
              'div',
              {},
              h('h2', { textContent: r.drink.name }),
              h('p', { className: 'stars', textContent: `${stars} ${QUALITY_LABELS[r.quality]}` }),
              h('p', { textContent: comment }),
              h('p', { className: 'gain', textContent: `+${r.coins} 🪙` }),
              r.isNew && h('p', { className: 'new', textContent: '新飲料！記進圖鑑了（+20）' }),
            ),
          ),
          h(
            'div',
            { className: 'row' },
            h('button', { textContent: '再搖一杯', onclick: () => showPick() }),
            h('button', { className: 'primary', textContent: '回房間', onclick: () => go('home') }),
          ),
        );
      };

      root.append(
        h(
          'div',
          { className: 'screen shake' },
          h(
            'header',
            { className: 'bar' },
            h('button', { className: 'secondary', textContent: '← 房間', onclick: () => go('home') }),
            h('h1', { textContent: '手搖飲' }),
            coins,
            h('button', { className: 'secondary', textContent: '📖 圖鑑', onclick: showCodex }),
          ),
          canvas,
          panel,
        ),
      );
      showPick();

      const height = hasSprite(char) ? 168 : 128;
      const cx = (ROOM * ZOOM) / 2 - 24;
      const bottom = (ROOM - 7) * ZOOM;
      const cell = 6;
      const draw = (t: number) => {
        ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
        drawShop(ctx);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const motion: Motion = { t, hopAt, tapAt };
        drawCharacter(ctx, char, 'happy', cx, bottom, height, motion);
        const sx = cx + height * 0.42;
        const sy = bottom - height * 0.5;
        if (phase !== 'result') {
          // 每點一下左右甩；選原料時斜斜拿著
          const swing = phase === 'shake' ? (taps % 2 ? 0.45 : -0.45) : -0.3;
          drawShaker(ctx, sx, sy, cell, swing);
          if (phase === 'shake' && tapAt !== undefined && t - tapAt < 180) {
            // 只畫在外側，左邊會蓋到角色的臉
            drawShakeLines(ctx, sx + 6 * cell, sy - cell, cell * 0.6, 1);
          }
        }
        ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
        drawCounter(ctx);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // 做好的飲料放在吧台桌面上
        if (phase === 'result') drawDrink(ctx, result!.drink, sx, (COUNTER_TOP + 1) * ZOOM, 4);
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    },
    unmount() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    },
  };
}

/** 飲料圖鑑：做過的顯示飲料，沒做過的顯示剪影和提示 */
function showCodex(): void {
  const made = DRINKS.filter((d) => state.codex[d.id]).length;
  const cells = DRINKS.map((d) => {
    const entry = state.codex[d.id];
    const owner = d.owner ? getCharacter(d.owner) : null;
    let note: string;
    if (entry) note = `做過 ${entry.count} 次・最佳 ${QUALITY_LABELS[entry.best as Quality]}`;
    else if (owner && !state.unlocked.includes(owner.id)) note = '解鎖後才有原料';
    else note = `需要：${getIngredient(d.recipe[0]).name}＋？`;
    return h(
      'div',
      { className: `codex-item${entry ? '' : ' unknown'}` },
      drinkCanvas(d, 3, !entry),
      h('strong', { textContent: entry ? d.name : '？？？' }),
      owner && h('small', { textContent: owner.name }),
      h('small', { textContent: note }),
    );
  });
  modal(h('h2', { textContent: `飲料圖鑑 ${made}／${DRINKS.length}` }), h('div', { className: 'codex' }, ...cells));
}
