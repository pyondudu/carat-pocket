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
import { drawRoom, ROOM, ZOOM } from './home';

type Phase = 'pick' | 'shake' | 'result';

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
            h('h1', { textContent: '搖飲料' }),
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
        drawRoom(ctx, false);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const motion: Motion = { t, hopAt, tapAt };
        drawCharacter(ctx, char, 'happy', cx, bottom, height, motion);
        const sx = cx + height * 0.42;
        const sy = bottom - height * 0.5;
        if (phase === 'result') drawDrink(ctx, result!.drink, sx, bottom, 4);
        else {
          // 每點一下左右甩；選原料時斜斜拿著
          const swing = phase === 'shake' ? (taps % 2 ? 0.45 : -0.45) : -0.3;
          drawShaker(ctx, sx, sy, cell, swing);
          if (phase === 'shake' && tapAt !== undefined && t - tapAt < 180) {
            // 只畫在外側，左邊會蓋到角色的臉
            drawShakeLines(ctx, sx + 6 * cell, sy - cell, cell * 0.6, 1);
          }
        }
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
