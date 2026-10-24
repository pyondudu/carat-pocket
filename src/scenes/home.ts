// 寵物房間：Canvas 畫房間與主角，DOM 放數值條與動作按鈕

import { CHARACTERS, getCharacter, type Character } from '../data/characters';
import { INVITE_PRICE } from '../data/shop';
import { characterCanvas, contentBox, drawCharacter, hasRig, hasSprite, isHopping, type Motion } from '../draw';
import { applyInvite, doAction, feedSpecial, INVITE_ENERGY, INVITE_MOOD, moodOf, STAT_LABELS, type Action, type PetStats } from '../pet';
import { go, type Scene } from '../router';
import { GUEST_HOURS, mainPet, passTime, resetSave, save, sendGuestHome, state } from '../state';
import { h, modal, toast } from '../ui';
import { howToPlay } from './intro';

export const ROOM = 64; // 房間以 64 格像素畫
export const ZOOM = 4; // 畫布實際為 256px，角色圖才有足夠解析度
const TICK_MS = 5000;

export function homeScene(): Scene {
  let raf = 0;
  let timer = 0;
  let hopAt: number | undefined; // 最近一次互動的時間，角色會跳一下
  let guestHopAt: number | undefined; // 點客人時客人跳一下

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
        const g = state.guest;
        guestBtn.textContent = g
          ? `🏠 ${getCharacter(g.id).name} 作客中・還有 ${Math.max(1, Math.ceil((g.until - Date.now()) / 60_000))} 分鐘`
          : pet.sleeping
            ? `🌙 ${char.name} 睡覺中，起床才能邀請夥伴`
            : `🏠 邀請夥伴來玩（${INVITE_PRICE} 🪙）`;
        // 睡覺時不能邀請：按鈕看起來停用（還是可以點，點了會提示）
        guestBtn.classList.toggle('off', !g && pet.sleeping);
      };

      // 依存檔的 lastSeen 補算到現在，和回到 App 時的補算共用同一個起點，不會重複扣
      const tick = () => {
        passTime(Date.now() - state.lastSeen);
        const left = sendGuestHome();
        if (left) toast(`${getCharacter(left).name} 回家了，下次再來玩～`);
        save();
      };

      const act = (a: Action) => {
        tick();
        toast(doAction(pet, a));
        if (a !== 'sleep' && !pet.sleeping) hopAt = performance.now();
        save();
        refresh();
      };

      // 餵食選單：一般食物（紫菜飯糰）或本命的特殊食物
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
            option('🍙 紫菜飯糰', state.food, '飽足 +30', () => {
              state.food--;
              return doAction(pet, 'feed');
            }),
            option(`⭐ ${char.specialFood}`, state.specialFood, '飽足 +40、心情 +30', () => {
              state.specialFood--;
              feedSpecial(pet);
              return `${char.specialFood}！最喜歡了！`;
            }),
          ),
          h('button', { className: 'secondary', textContent: '🛍️ 去商店買', onclick: () => (close(), go('shop')) }),
        );
      };

      // 邀請已解鎖的夥伴來房間作客（要花金幣，一次一隻，GUEST_HOURS 小時後回家）
      const inviteMenu = () => {
        tick();
        refresh();
        const g = state.guest;
        if (g) {
          const name = getCharacter(g.id).name;
          const close = modal(
            characterCanvas(getCharacter(g.id)),
            h('h2', { textContent: `${name} 作客中` }),
            h('p', { textContent: `${char.name} 和 ${name} 玩得很開心！` }),
            h('button', {
              className: 'secondary',
              textContent: `請 ${name} 先回家`,
              onclick: () => {
                state.guest = null;
                save();
                refresh();
                close();
                toast(`${name} 回家了`);
              },
            }),
          );
          return;
        }
        if (pet.sleeping) return toast(`噓…${char.name} 正在睡覺，起床再邀請吧`);
        if (pet.stats.energy < INVITE_ENERGY) return toast(`${char.name} 太累了，先睡一下再邀請朋友吧`);
        const friends = CHARACTERS.filter((c) => c.id !== char.id && state.unlocked.includes(c.id));
        if (!friends.length) {
          const close = modal(
            h('h2', { textContent: '還沒有夥伴' }),
            h('p', { textContent: '去商店解鎖夥伴，就可以邀請他們來玩了。' }),
            h('button', { className: 'primary', textContent: '🛍️ 去商店', onclick: () => (close(), go('shop')) }),
          );
          return;
        }
        const tiles = friends.map((c) => {
          const tile = h('button', { className: 'tile' }, characterCanvas(c), h('strong', { textContent: c.name }));
          tile.style.setProperty('--c', c.color);
          tile.onclick = () => {
            if (state.coins < INVITE_PRICE) return toast(`金幣不夠，還差 ${INVITE_PRICE - state.coins}，去搖飲料賺吧`);
            state.coins -= INVITE_PRICE;
            state.guest = { id: c.id, until: Date.now() + GUEST_HOURS * 3_600_000 };
            applyInvite(pet);
            hopAt = guestHopAt = performance.now();
            save();
            refresh();
            close();
            toast(`${c.name} 來玩了！心情 +${INVITE_MOOD}、體力 −${INVITE_ENERGY}`);
          };
          return tile;
        });
        const close = modal(
          h('h2', { textContent: '邀請誰來玩？' }),
          h('p', { className: 'hint', textContent: `每次 ${INVITE_PRICE} 🪙，朋友會待 ${GUEST_HOURS} 小時\n來玩時心情 +${INVITE_MOOD}、體力 −${INVITE_ENERGY}\n目前有 ${state.coins} 🪙` }),
          h('div', { className: 'invite-grid' }, ...tiles),
        );
      };
      const guestBtn = h('button', { className: 'guest-bar', onclick: inviteMenu });

      // 朋友在的時候不能睡覺（睡覺和作客不能同時發生），起床則隨時可以
      const sleepBtn = h('button', {
        onclick: () => {
          if (!pet.sleeping && state.guest) return toast(`${getCharacter(state.guest.id).name} 還在作客，先請他回家再睡吧`);
          act('sleep');
          refresh();
        },
      });
      const actions = h(
        'div',
        { className: 'actions' },
        h('button', { textContent: '🍙 餵食', onclick: feedMenu }),
        h('button', { textContent: '🎾 玩耍', onclick: () => act('play') }),
        h('button', { textContent: '🫧 清潔', onclick: () => act('clean') }),
        sleepBtn,
      );
      const soon = () => toast('敬請期待～');
      // 網址加 ?debug（或 #debug）才出現：把 lastSeen 往前推，模擬離開幾小時
      const debugTools = () => {
        if (!new URLSearchParams(location.search).has('debug') && location.hash !== '#debug') return null;
        const skip = (hours: number) => () => {
          state.lastSeen -= hours * 3_600_000;
          if (state.guest) state.guest.until -= hours * 3_600_000;
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
          h('button', {
            textContent: '💩 弄髒',
            onclick: () => {
              pet.stats.clean = Math.max(0, pet.stats.clean - 20);
              save();
              refresh();
              toast(`清潔剩 ${Math.round(pet.stats.clean)}`);
            },
          }),
          h('button', {
            textContent: '💰 +500',
            onclick: () => {
              state.coins += 500;
              save();
              refresh();
              toast(`金幣 ${state.coins}`);
            },
          }),
          h('button', {
            textContent: '🔓 全部解鎖',
            onclick: () => {
              state.unlocked = CHARACTERS.map((c) => c.id);
              save();
              toast('13 個角色全部解鎖了');
            },
          }),
          h('button', { textContent: '🗑️ 重來', onclick: () => (resetSave(), go('select')) }),
        );
      };
      const nav = h(
        'nav',
        { className: 'nav' },
        h('button', { textContent: '🥤 搖飲料', onclick: () => go('shake') }),
        h('button', { textContent: '🛍️ 商店', onclick: () => go('shop') }),
        // 後兩格原本是「拍照」「相簿」（里程碑 2），要做什麼之後再決定，先顯示待推出
        h('button', { className: 'soon', textContent: '待推出', onclick: soon }),
        h('button', { className: 'soon', textContent: '待推出', onclick: soon }),
      );

      root.append(
        h(
          'div',
          { className: 'screen home' },
          h(
            'header',
            { className: 'bar' },
            h('h1', { textContent: char.name }),
            h('button', { className: 'help', textContent: '📖 玩法說明', onclick: () => modal(h('h2', { textContent: '怎麼玩' }), howToPlay()) }),
            h('div', { className: 'wallet' }, coins, food),
          ),
          canvas,
          guestBtn,
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
        drawTrash(ctx, pet.stats.clean);
        const motion: Motion = { t, hopAt };
        // 跳起來的時候（互動的反應）一律開心
        const mood = isHopping(motion) ? 'happy' : moodOf(pet);
        // 有程式五官的角色自己會呼吸；其他的醒著時每 0.5 秒跳一下，睡覺時不動
        const bounce = rig || mood === 'sleep' ? 0 : Math.floor(t / 500) % 2;
        if (mood === 'sleep' && !sprite && !guest()) drawZzz(ctx, t); // 正式圖的睡覺版自己有 Z
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const bottom = (ROOM - 7) * ZOOM;
        const g = guest();
        if (g) {
          // 有客人：照娃娃的實際身高比例畫，本命在左、客人在右
          const [ma, ga] = pairLayout(char, g, bottom);
          drawCharacter(ctx, char, mood, ma.cx, ma.bottom - bounce * ZOOM, ma.height, motion);
          // 客人的時間錯開，才不會跟本命同時呼吸、眨眼
          const off = 1700;
          const gm: Motion = { t: t + off, hopAt: guestHopAt === undefined ? undefined : guestHopAt + off };
          const gBounce = hasRig(g) ? 0 : Math.floor((t + off) / 500) % 2;
          drawCharacter(ctx, g, 'happy', ga.cx, ga.bottom - gBounce * ZOOM, ga.height, gm);
          // 玩在一起：頭上飄音符
          ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
          drawNotes(ctx, t, Math.min(ma.bottom - ma.height, ga.bottom - ga.height) / ZOOM);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
          drawCharacter(ctx, char, mood, (ROOM * ZOOM) / 2, bottom - bounce * ZOOM, sprite ? 168 : 128, motion);
        }
        raf = requestAnimationFrame(draw);

      // 點房間裡的角色會跳一下（有客人時點右半邊是客人）
      canvas.onpointerdown = (e) => {
        const rect = canvas.getBoundingClientRect();
        if (guest() && e.clientX - rect.left > rect.width / 2) guestHopAt = performance.now();
        else if (!pet.sleeping) hopAt = performance.now();
      };
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

/** 兩隻同框時，比較高的那隻畫多高（角色本身，不含圖片留白）、兩隻之間的空隙、最多佔多寬 */
const PAIR_TALLEST = 112;
const PAIR_GAP = 6;
const PAIR_MAX_WIDTH = 240;

/** 兩隻同框的位置：照 heightCm 比例縮放，腳底踩同一條線，水平置中；回傳給 drawCharacter 用的中心、底部、圖片高度 */
function pairLayout(a: Character, b: Character, floor: number) {
  const boxes = [contentBox(a), contentBox(b)];
  const cms = [a.heightCm, b.heightCm];
  // 一公分幾 px：最高的那隻用滿 PAIR_TALLEST，太寬就整體縮小
  let k = PAIR_TALLEST / Math.max(...cms);
  const widthAt = (k: number) =>
    boxes.reduce((sum, box, i) => sum + (box.right - box.left) * ((cms[i] * k) / (box.bottom - box.top)), 0) + PAIR_GAP;
  if (widthAt(k) > PAIR_MAX_WIDTH) k *= (PAIR_MAX_WIDTH - PAIR_GAP) / (widthAt(k) - PAIR_GAP);
  const items = boxes.map((box, i) => {
    const s = (cms[i] * k) / (box.bottom - box.top); // 圖片每 px 畫成幾 px
    return { s, box, w: (box.right - box.left) * s };
  });
  let x = (ROOM * ZOOM - (items[0].w + PAIR_GAP + items[1].w)) / 2;
  return items.map(({ s, box, w }) => {
    // drawCharacter 以整張圖的中心和底部對齊，換算回去
    const cx = x - box.left * s + (box.width * s) / 2;
    x += w + PAIR_GAP;
    return { cx, bottom: floor + (box.height - box.bottom) * s, height: box.height * s };
  });
}

/** 目前作客的夥伴（時間到但還沒結算的也算在，等下一次 tick 才回家） */
function guest() {
  return state.guest ? getCharacter(state.guest.id) : null;
}

/** 房間背景；搖飲料畫面不放窗戶 */
export function drawRoom(ctx: CanvasRenderingContext2D, withWindow = true): void {
  ctx.fillStyle = '#fde7e4';
  ctx.fillRect(0, 0, ROOM, ROOM);
  if (withWindow) drawWindow(ctx, new Date());
  // 地板
  ctx.fillStyle = '#e8c39e';
  ctx.fillRect(0, 44, ROOM, ROOM - 44);
  ctx.fillStyle = '#d9ab80';
  for (let y = 48; y < ROOM; y += 5) ctx.fillRect(0, y, ROOM, 1);
  // 地毯
  ctx.fillStyle = '#92a8d1';
  ctx.fillRect(14, 52, 36, 6);
  drawClock(ctx, new Date());
}

/** 窗戶：窗外天色跟真實時間走（白天藍天白雲、傍晚橘、晚上星星月亮），兩側粉紅窗簾 */
function drawWindow(ctx: CanvasRenderingContext2D, now: Date): void {
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };
  const hour = now.getHours();
  const night = hour >= 19 || hour < 6;
  const dusk = hour >= 17 && hour < 19;
  const [skyTop, skyLow] = night ? ['#2c3560', '#46518a'] : dusk ? ['#f4a77c', '#fbd9b0'] : ['#9fd3f2', '#d6eefb'];
  // 玻璃（上下兩段顏色）
  px(41, 7, 18, 8, skyTop);
  px(41, 15, 18, 8, skyLow);
  if (night) {
    px(53, 9, 3, 3, '#fff3b0'); // 月亮
    px(54, 9, 2, 1, skyTop);
    for (const [x, y] of [[44, 9], [48, 12], [43, 17], [56, 18], [50, 19]]) px(x, y, 1, 1, '#ffffff');
  } else {
    // 雲
    px(43, 11, 5, 2, '#ffffff');
    px(44, 10, 2, 1, '#ffffff');
    px(52, 17, 4, 2, '#ffffff');
    px(53, 16, 2, 1, '#ffffff');
  }
  // 窗框與十字窗格
  const FRAME = '#fffaf0';
  const EDGE = '#b89a7e';
  px(40, 6, 20, 1, EDGE);
  px(40, 23, 20, 1, EDGE);
  px(40, 6, 1, 18, EDGE);
  px(59, 6, 1, 18, EDGE);
  px(41, 7, 18, 1, FRAME);
  px(41, 7, 1, 16, FRAME);
  px(58, 7, 1, 16, FRAME);
  px(49, 7, 2, 16, FRAME);
  px(41, 14, 18, 1, FRAME);
  // 窗台
  px(38, 24, 24, 2, '#c08a5c');
  px(38, 26, 24, 1, '#8a6a52');
  // 窗簾桿與窗簾（綁起來的弧形）
  px(36, 4, 28, 1, '#8a6a52');
  for (const [x0, dir] of [[37, 1], [62, -1]] as const) {
    for (let y = 5; y < 24; y++) {
      // 中段收進去（綁帶處），下段散開
      const w = y < 13 ? 4 : y < 16 ? 2 : 3;
      const x = dir === 1 ? x0 : x0 - w + 1;
      px(x, y, w, 1, '#f4a6b8');
      px(dir === 1 ? x : x + w - 1, y, 1, 1, '#e58aa0'); // 外側摺痕
    }
    px(dir === 1 ? x0 : x0 - 2, 13, 3, 1, '#f7d36b'); // 綁帶
  }
}

// 3×5 像素數字（0～9），每列 3 bit
const DIGITS = [
  [7, 5, 5, 5, 7], [2, 6, 2, 2, 7], [7, 1, 7, 4, 7], [7, 1, 7, 1, 7], [5, 5, 7, 1, 1],
  [7, 4, 7, 1, 7], [7, 4, 7, 5, 7], [7, 1, 1, 1, 1], [7, 5, 7, 5, 7], [7, 5, 7, 1, 7],
];

/** 牆上的電子鐘：真實時間，24 小時制，冒號每秒閃一次 */
function drawClock(ctx: CanvasRenderingContext2D, now: Date): void {
  // 放在左上角，不擋角色
  const x0 = 1;
  const y0 = 1;
  ctx.fillStyle = '#8a6a52';
  ctx.fillRect(x0, y0, 21, 9);
  ctx.fillStyle = '#2f3a4a';
  ctx.fillRect(x0 + 1, y0 + 1, 19, 7);
  ctx.fillStyle = '#9ff0c4';
  const text = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const xs = [x0 + 2, x0 + 6, x0 + 12, x0 + 16];
  for (let i = 0; i < 4; i++) {
    const rows = DIGITS[+text[i]];
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (rows[y] & (4 >> x)) ctx.fillRect(xs[i] + x, y0 + 2 + y, 1, 1);
  }
  if (now.getSeconds() % 2 === 0) {
    ctx.fillRect(x0 + 10, y0 + 3, 1, 1);
    ctx.fillRect(x0 + 10, y0 + 5, 1, 1);
  }
}

// 地上的垃圾：清潔越低越多，按「清潔」回滿就全部消失
// 像素圖，一個字一格；'.' 透明
const TRASH_ART = {
  paper: ['..oooo..', '.owwgwo.', 'owgwwwwo', 'owwwgwgo', 'owgwwwwo', '.owwgwo.', '..oooo..'],
  peel: ['....b...', '...yy...', '..yyyy..', '.yYyyYy.', 'yY.yy.Yy', 'y..yy..y', '...dd...'],
  can: ['.oooooooo.', 'oSrrrrrrSo', 'oSwwwwwwSo', 'oSrrrrrrSo', '.oooooooo.'],
};
const TRASH_COLORS: Record<string, string> = {
  o: '#4a4550', w: '#fbfaf6', g: '#b9b3a8', // 紙團
  b: '#6b4a1e', y: '#f5d04a', Y: '#d9a72a', d: '#8a6a2a', // 香蕉皮
  S: '#cfd6de', r: '#e5534b', // 空罐
};
// [x, y, 種類, 清潔低於多少才出現]；擺在角色兩側的地板
const TRASH: [number, number, keyof typeof TRASH_ART, number][] = [
  [1, 46, 'paper', 70],
  [52, 46, 'can', 55],
  [10, 54, 'peel', 40],
  [56, 50, 'paper', 40],
  [0, 58, 'can', 25],
  [52, 58, 'peel', 15],
];

function drawTrash(ctx: CanvasRenderingContext2D, clean: number): void {
  for (const [x, y, kind, below] of TRASH) {
    if (clean >= below) continue;
    TRASH_ART[kind].forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch === '.') return;
        ctx.fillStyle = TRASH_COLORS[ch];
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }),
    );
  }
}

// 音符像素圖（八分音符），一個字一格
const NOTE = ['..XXX', '..X.X', '..X..', '..X..', 'XXX..', 'XXX..'];
const NOTE_COLORS = ['#e87a96', '#6f8fd0', '#e87a96'];

/** 作客時頭上的音符：三顆輪流往上飄、左右晃、淡出；top＝兩隻角色比較高的那隻頭頂（房間格座標） */
function drawNotes(ctx: CanvasRenderingContext2D, t: number, top: number): void {
  const CYCLE = 2400;
  [20, 32, 44].forEach((x0, i) => {
    const p = ((t + i * (CYCLE / 3)) % CYCLE) / CYCLE; // 0～1
    const x = Math.round(x0 + Math.sin(p * Math.PI * 2 + i) * 2);
    const y = Math.round(top - 5 - p * 12);
    ctx.globalAlpha = p < 0.2 ? p / 0.2 : p > 0.7 ? (1 - p) / 0.3 : 1;
    ctx.fillStyle = NOTE_COLORS[i];
    NOTE.forEach((row, dy) => [...row].forEach((ch, dx) => ch === 'X' && ctx.fillRect(x + dx, y + dy, 1, 1)));
  });
  ctx.globalAlpha = 1;
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
