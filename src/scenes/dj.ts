// Disc Jockey 小遊戲（使用者 2026-10-27 定名）：疊音軌 Mix＋刷碟。本命戴耳機站在 DJ 台後面，背景是夜店
// 流程照節奏應援：說明視窗 → 開始 → 3、2、1 倒數 → 16 小節約 31 秒 → 結算。規則在 src/dj.ts，曲子在 src/data/djsong.ts

import { audio, duck, heardTime, scratch as scratchSound, tone } from '../audio';
import { CHARACTERS } from '../data/characters';
import { DJ_BARS, DJ_BPM, DJ_SONG } from '../data/djsong';
import { DJ_RANK_LABEL, djScore, MIX_LABEL, ORDERS, orderAt, sameMix, SCRATCH_STEPS, SCRATCHES, wanted, type DjTally, type Judge } from '../dj';
import { drawCharacter, hasSprite, type Motion } from '../draw';
import { playDjBar, type DjLayers } from '../music';
import { applyDj, djBlocked, GAME_ENERGY, GAME_MOOD } from '../pet';
import { go, type Scene } from '../router';
import { mainPet, passTime, save, state } from '../state';
import { h, modal } from '../ui';
import { drawClock, ROOM, ZOOM } from './home';
import { drawCountdown, WINDOWS } from './rhythm';

const INK = '#2b2b2b';
const PINK = '#f78fb0';
const BLUE = '#6f9ee8';
const NEON_PINK = '#ff7ab8';
const NEON_BLUE = '#6fd0ff';
const CROWD = '#1c1238';

/** 夜店畫面的狀態：layers＝開著的音軌數（0～3）、scratch＝刷碟進度 0～1（沒在刷是 null） */
export interface ClubState {
  beat: number;
  layers: number;
  scratch: number | null;
  cheer: boolean; // 點單做對時觀眾舉手
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** 粉→藍的漸層色（t＝0～1） */
function neon(t: number): string {
  const a = [255, 122, 184];
  const b = [111, 208, 255];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

/** 雷射：從 (x, y) 射出的細光束 */
function laser(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, color: string): void {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.sin(angle) * 90, y + Math.cos(angle) * 90);
  ctx.stroke();
  ctx.restore();
}

/** 夜店背景（房間格座標）：後牆 LED 等化器、天花板鏡面球和雷射；DJ 台和觀眾另外畫在角色前面 */
export function drawClub(ctx: CanvasRenderingContext2D, s: ClubState): void {
  const { beat, layers } = s;
  const g = ctx.createLinearGradient(0, 0, 0, ROOM);
  g.addColorStop(0, '#0e0a24');
  g.addColorStop(1, '#22134a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ROOM, ROOM);
  // LED 牆：14 根等化器長條，開的音軌越多越高越亮；沒亮的格子是暗暗的點陣
  const pulse = 1 - (beat % 1); // 每拍一開始最亮
  const x0 = 5;
  const yBottom = 40;
  const rows = 9;
  for (let i = 0; i < 14; i++) {
    const x = x0 + i * 4;
    const wave = (Math.sin(beat * Math.PI * 0.5 + i * 0.9) + 1) / 2;
    const level = layers === 0 ? 1 : Math.round(1 + (rows - 1) * (layers / 3) * (0.45 + 0.55 * wave * (0.6 + 0.4 * pulse)));
    for (let r = 0; r < rows; r++) {
      const y = yBottom - (r + 1) * 3;
      const lit = r < level;
      px(ctx, x, y, 3, 2, lit ? neon(i / 13) : '#2a1f4e');
    }
  }
  // 鏡面球：天花板中間垂下來，刷碟時閃一下
  const bx = 32;
  const by = 7;
  px(ctx, bx, 0, 1, 3, '#8a84a0');
  for (let y = -3; y <= 3; y++)
    for (let x = -3; x <= 3; x++) {
      if (x * x + y * y > 11) continue;
      const tile = (x + y + Math.floor(beat * 2)) % 2 === 0;
      px(ctx, bx + x, by + y, 1, 1, tile ? '#e8e6f2' : '#9d98b8');
    }
  if (s.scratch !== null || pulse > 0.85) {
    ctx.globalAlpha = s.scratch !== null ? 0.9 : 0.5;
    for (const [dx, dy] of [[-5, -1], [5, 1], [-2, 5], [3, -5]]) px(ctx, bx + dx, by + dy, 1, 1, '#ffffff');
    ctx.globalAlpha = 1;
  }
  // 雷射：從兩個上角往下掃，開幾軌就幾道（全關時一道都沒有）
  for (let k = 0; k < layers; k++) {
    const swing = Math.sin(beat * Math.PI * 0.5 + k * 1.3) * 0.5;
    laser(ctx, 0, 0, 0.55 + k * 0.18 + swing, k % 2 ? NEON_BLUE : NEON_PINK);
    laser(ctx, ROOM, 0, -0.55 - k * 0.18 - swing, k % 2 ? NEON_PINK : NEON_BLUE);
  }
  drawClock(ctx, new Date());
}

/** 唱盤：(cx, cy) 中心，spin＝黑膠轉的角度（弧度），標籤顏色粉或藍 */
function turntable(ctx: CanvasRenderingContext2D, cx: number, cy: number, spin: number, label: string): void {
  px(ctx, cx - 7, cy - 4, 14, 8, '#3d3858');
  px(ctx, cx - 7, cy - 4, 14, 1, '#57507a');
  // 黑膠（俯視的扁圓）
  for (let y = -3; y <= 3; y++)
    for (let x = -6; x <= 6; x++) {
      if ((x / 6.2) ** 2 + (y / 3.2) ** 2 > 1) continue;
      const groove = Math.round(Math.sqrt((x / 6) ** 2 + (y / 3) ** 2) * 4) % 2;
      px(ctx, cx + x, cy + y, 1, 1, groove ? '#151319' : '#211e27');
    }
  px(ctx, cx - 1, cy - 1, 3, 2, label);
  // 黑膠上的反光點跟著轉
  px(ctx, Math.round(cx + Math.cos(spin) * 4), Math.round(cy + Math.sin(spin) * 2), 1, 1, '#d8d4e8');
}

/** 前景：DJ 台（擋住角色下半身）＋最前排觀眾剪影 */
export function drawBooth(ctx: CanvasRenderingContext2D, s: ClubState): void {
  const { beat } = s;
  const top = 46;
  // 唱盤：平常一直轉，刷碟時左邊那台來回轉
  const spin = beat * Math.PI;
  const rock = s.scratch !== null ? Math.sin(s.scratch * Math.PI * 6) * 1.6 : spin;
  // 台面
  px(ctx, 2, top, ROOM - 4, 3, '#3a3555');
  px(ctx, 2, top, ROOM - 4, 1, '#5a5380');
  turntable(ctx, 13, top - 1, rock, PINK);
  turntable(ctx, 51, top - 1, spin + 1, BLUE);
  // 混音器：中間小盒子，推桿和燈
  px(ctx, 25, top - 3, 14, 4, '#2c2843');
  px(ctx, 25, top - 3, 14, 1, '#4a4468');
  for (let i = 0; i < 4; i++) {
    px(ctx, 27 + i * 3, top - 2, 1, 2, '#1a1726');
    px(ctx, 27 + i * 3, top - 2 + ((i + Math.floor(beat)) % 2), 1, 1, i < s.layers + 1 ? NEON_BLUE : '#6a6488');
  }
  // 台子正面：深色面板＋跑馬燈
  px(ctx, 3, top + 3, ROOM - 6, 9, '#1b1830');
  px(ctx, 3, top + 3, ROOM - 6, 1, INK);
  const run = Math.floor(beat * 2);
  for (let x = 5; x < ROOM - 5; x += 3) {
    const k = (x / 3 + run) % 4;
    px(ctx, x, top + 6, 2, 1, k === 0 ? NEON_PINK : k === 2 ? NEON_BLUE : '#3b3460');
  }
  px(ctx, 3, top + 9, ROOM - 6, 1, '#2a2546');
  // 觀眾：一排剪影跟拍子點頭，做對時舉手
  const bob = (beat % 1) < 0.5 ? 0 : 1;
  for (let i = 0; i < 8; i++) {
    const x = 2 + i * 8 + (i % 2 ? 2 : 0);
    const y = 59 + ((i % 2 ? bob : 1 - bob));
    for (let yy = -3; yy <= 2; yy++)
      for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy <= 9) px(ctx, x + xx, y + yy, 1, 1, CROWD);
    px(ctx, x - 4, y + 3, 9, 4, CROWD);
    // 頭頂和肩膀的霓虹反光，剪影才不會跟背景混在一起
    const rim = i % 2 ? '#4f6fc0' : '#b0508e';
    px(ctx, x - 2, y - 3, 4, 1, rim);
    px(ctx, x - 3, y - 2, 1, 1, rim);
    px(ctx, x - 4, y + 3, 2, 1, rim);
    if (s.cheer && i % 3 !== 1) {
      px(ctx, x + 3, y - 6, 1, 6, CROWD);
      px(ctx, x + 3, y - 7, 1, 1, i % 2 ? NEON_BLUE : NEON_PINK);
    }
  }
}

/** 刷碟時的像素字「Zzzik!」＋動作線（畫在左邊唱盤上方，房間格座標） */
function drawZzzik(ctx: CanvasRenderingContext2D, p: number): void {
  ctx.save();
  ctx.globalAlpha = p > 0.75 ? (1 - p) / 0.25 : 1;
  ctx.font = 'bold 6px "Noto Sans TC", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = INK;
  const y = 37 - p * 3;
  const x = 13 + Math.sin(p * Math.PI * 6) * 1.5;
  ctx.strokeText('Zzzik!', x, y);
  ctx.fillStyle = NEON_PINK;
  ctx.fillText('Zzzik!', x, y);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 0.6;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(13, 44, 8 + (k + 1) * 1.5, Math.PI * 1.1, Math.PI * 1.45);
    ctx.stroke();
  }
  ctx.restore();
}

const COUNTDOWN = 3;
const STEP = 60 / DJ_BPM / 4; // 16 分音符（秒）
const BAR = STEP * 16;
const LAYERS: (keyof DjLayers)[] = ['drums', 'bass', 'lead'];
const ICON: Record<keyof DjLayers, string> = { drums: '🥁', bass: '🎸', lead: '🎹' };
const LANE_W = ROOM * ZOOM;
const LANE_H = 64;
const JUDGE_X = 34; // 點單軌道的判定線（像素）
const PX_PER_BAR = 64;

export function djScene(): Scene {
  let raf = 0;
  let timer = 0;
  let press: (k: keyof DjLayers | 'scratch') => void = () => {};
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.key === '1') press('drums');
    if (e.key === '2') press('bass');
    if (e.key === '3') press('lead');
    if (e.key === ' ') {
      e.preventDefault();
      press('scratch');
    }
  };

  return {
    mount(root) {
      // 用本命；還沒選本命（#dj 直接開預覽）時用第一個角色、不給獎勵
      const charIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === state.mainId));
      const char = CHARACTERS[charIndex];
      const pet = mainPet();
      if (pet) {
        passTime(Date.now() - state.lastSeen);
        save();
      }
      const coins = h('span', { className: 'coins', textContent: `🪙 ${state.coins}` });
      let playing = false;
      let t0 = 0; // 第一拍的音訊時間
      let scheduled = 0; // 已經排進去幾個小節
      /** 按鈕目前的開關（下一個小節線才生效） */
      const next: DjLayers = { drums: false, bass: false, lead: false };
      /** 每個小節實際排進去的組合 */
      const played: DjLayers[] = [];
      /** 每個小節的判定結果（null＝前奏不算） */
      const barOk: (boolean | null)[] = [];
      let tally: DjTally = { mixOk: 0, mixBars: 0, scratch: { 完美: 0, 很好: 0, 還行: 0, 漏掉: 0 } };
      let scratchDone: boolean[] = [];
      let scratchAt: number | null = null; // 開始刷碟的 performance.now()
      let judge: { label: string; color: string; at: number } | null = null;
      let combo = 0;
      let hopAt: number | undefined;
      let lastShown = -1; // 最後一個顯示過判定的小節

      const room = h('canvas', { className: 'pixel room', width: ROOM * ZOOM, height: ROOM * ZOOM });
      const lane = h('canvas', { className: 'pixel lane', width: LANE_W, height: LANE_H });
      const ctx = room.getContext('2d')!;
      const lctx = lane.getContext('2d')!;
      const panel = h('div', { className: 'rhythm-panel' });
      const info = h('div', { className: 'shake-info' });

      const songTime = () => heardTime() - t0;

      // 排程：每 25 毫秒看一次，小節開始前 0.12 秒才用當下按鈕的開關排進去，所以在小節線前按都來得及
      const schedule = () => {
        if (!playing) return;
        const ac = audio();
        while (scheduled < DJ_BARS && t0 + scheduled * BAR < ac.currentTime + 0.12) {
          const i = scheduled;
          const on = { ...next };
          playDjBar(DJ_SONG[i], t0 + i * BAR, STEP, on);
          played[i] = on;
          const o = orderAt(i);
          if (o && !DJ_SONG[i].last) {
            const ok = sameMix(on, wanted(o.mix));
            barOk[i] = ok;
            tally.mixBars++;
            if (ok) tally.mixOk++;
          } else barOk[i] = null;
          scheduled++;
        }
      };

      const keys = {} as Record<keyof DjLayers, HTMLButtonElement>;
      const scratchBtn = h('button', { className: 'dj-scratch', textContent: '💿 刷碟' });
      const refreshKeys = () => {
        for (const k of LAYERS) keys[k].classList.toggle('on', next[k]);
        // 只有點單出現時才能刷碟：前後一小節內有刷碟點單才亮
        const st = songTime();
        const near = playing && SCRATCHES.some((s, i) => !scratchDone[i] && s * STEP - st < BAR && st - s * STEP < WINDOWS[2].ms / 1000);
        scratchBtn.classList.toggle('off', !near);
      };

      press = (k) => {
        if (!playing) return;
        if (k !== 'scratch') {
          next[k] = !next[k];
          tone(audio().currentTime, next[k] ? 1320 : 660, 0.04, 'square', 0.05);
          refreshKeys();
          return;
        }
        const st = songTime();
        const i = SCRATCHES.findIndex((s, n) => !scratchDone[n] && Math.abs(s * STEP - st) <= WINDOWS[2].ms / 1000);
        if (i < 0) return;
        scratchDone[i] = true;
        const dt = Math.abs(SCRATCHES[i] * STEP - st) * 1000;
        const w = WINDOWS.find((x) => dt <= x.ms)!;
        tally.scratch[w.label as Judge]++;
        judge = { label: `刷碟 ${w.label}`, color: w.color, at: performance.now() };
        // 刷碟聲從按下的這一刻開始，長刷兩拍；其他聲音壓小
        const now = audio().currentTime;
        scratchSound(now, SCRATCH_STEPS * STEP);
        duck(now, SCRATCH_STEPS * STEP);
        scratchAt = performance.now();
        refreshKeys();
      };

      for (const k of LAYERS) {
        const b = h('button', { className: `dj-key ${k}`, textContent: `${ICON[k]} ${MIX_LABEL[k]}` });
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          press(k);
        });
        keys[k] = b;
      }
      scratchBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        press('scratch');
      });

      const start = () => {
        if (pet) {
          passTime(Date.now() - state.lastSeen);
          if (djBlocked(pet)) return ready();
        }
        const ac = audio();
        playing = true;
        t0 = ac.currentTime + COUNTDOWN;
        for (let k = COUNTDOWN; k >= 1; k--) tone(t0 - k, 880, 0.12, 'triangle', 0.25);
        scheduled = 0;
        played.length = 0;
        barOk.length = 0;
        lastShown = -1;
        for (const k of LAYERS) next[k] = false;
        tally = { mixOk: 0, mixBars: 0, scratch: { 完美: 0, 很好: 0, 還行: 0, 漏掉: 0 } };
        scratchDone = SCRATCHES.map(() => false);
        scratchAt = null;
        judge = null;
        combo = 0;
        clearInterval(timer);
        timer = window.setInterval(schedule, 25);
        schedule();
        panel.replaceChildren(info, h('div', { className: 'dj-keys' }, ...LAYERS.map((k) => keys[k])), scratchBtn, h('p', { className: 'hint', textContent: '電腦可以用 1／2／3 和空白鍵' }));
        refreshKeys();
      };

      const finish = () => {
        playing = false;
        clearInterval(timer);
        const r = djScore(tally);
        let record = false;
        if (pet) {
          passTime(Date.now() - state.lastSeen);
          state.coins += r.coins;
          applyDj(pet);
          state.dj.plays++;
          record = r.score > state.dj.best;
          state.dj.best = Math.max(state.dj.best, r.score);
          save();
          coins.textContent = `🪙 ${state.coins}`;
        }
        hopAt = performance.now();
        const row = (k: string, v: string) => h('div', { className: 'stat-row' }, h('span', { textContent: k }), h('strong', { textContent: v }));
        panel.replaceChildren(
          h('div', { className: 'rhythm-rank' }, h('strong', { className: `rank rank-${r.rank}`, textContent: r.rank }), h('div', {}, h('h2', { textContent: DJ_RANK_LABEL[r.rank] }), h('p', { textContent: `${r.score} 分${record ? '・新紀錄！' : ''}` }))),
          h(
            'div',
            { className: 'rhythm-result' },
            row('點單做對', `${tally.mixOk}／${tally.mixBars} 小節`),
            row('刷碟完美', String(tally.scratch.完美)),
            row('刷碟很好', String(tally.scratch.很好)),
            row('刷碟還行', String(tally.scratch.還行)),
            row('刷碟漏掉', String(tally.scratch.漏掉)),
          ),
          ...(pet ? [h('p', { className: 'gain rhythm-gain', textContent: `+${r.coins} 🪙　體力 −${GAME_ENERGY}　心情 +${GAME_MOOD}` })] : []),
          h('div', { className: 'row' }, h('button', { className: 'secondary', textContent: '回房間', onclick: () => go(state.mainId ? 'home' : 'intro') }), h('button', { className: 'primary', textContent: '再玩一次', onclick: ready })),
        );
      };

      function ready(): void {
        const blocked = pet && djBlocked(pet);
        if (blocked) {
          panel.replaceChildren(h('p', { className: 'hint', textContent: blocked }), h('button', { className: 'primary', textContent: '回房間', onclick: () => go('home') }));
          return;
        }
        panel.replaceChildren(h('button', { className: 'primary', textContent: pet ? `開始！（體力 −${GAME_ENERGY}）` : '開始！', onclick: start }));
      }

      ready();
      const closeIntro = modal(
        h('h2', { textContent: '🎧 Disc Jockey' }),
        h('p', { textContent: '照著點單切換鼓、低音、旋律，\n看到唱片就按刷碟！' }),
        h('p', { className: 'credit', textContent: '切換會在下一個小節生效' }),
        h('button', { className: 'primary', textContent: '好！', onclick: () => closeIntro() }),
      );

      root.append(
        h(
          'div',
          { className: 'screen rhythm' },
          h('div', { className: 'bar' }, h('button', { className: 'secondary', textContent: '← 房間', onclick: () => go(state.mainId ? 'home' : 'intro') }), h('h1', { textContent: '🎧 Disc Jockey' }), coins),
          h('div', { className: 'rhythm-stage' }, room, lane),
          panel,
        ),
      );
      window.addEventListener('keydown', onKey);

      /** 點單軌道：點單卡片從右往左流到判定線，卡片上亮著的圖示是要開的音軌；唱片圖示是刷碟點單 */
      const drawLane = (st: number) => {
        lctx.fillStyle = '#16102e';
        lctx.fillRect(0, 0, LANE_W, LANE_H);
        const xOf = (t: number) => JUDGE_X + ((t - st) / BAR) * PX_PER_BAR;
        lctx.font = '15px "Noto Color Emoji", "Apple Color Emoji", sans-serif';
        lctx.textAlign = 'center';
        lctx.textBaseline = 'middle';
        ORDERS.forEach((o, i) => {
          const end = ORDERS[i + 1]?.from ?? DJ_BARS - 1;
          const x0 = xOf(o.from * BAR) + 2;
          const x1 = xOf(end * BAR) - 2;
          if (x1 < 0 || x0 > LANE_W) return;
          const now = st >= o.from * BAR && st < end * BAR;
          lctx.fillStyle = now ? '#3a2c6e' : '#271d4c';
          lctx.fillRect(x0, 8, x1 - x0, 34);
          lctx.strokeStyle = now ? '#ff7ab8' : '#5a4a90';
          lctx.lineWidth = 2;
          lctx.strokeRect(x0, 8, x1 - x0, 34);
          const want = wanted(o.mix);
          LAYERS.forEach((k, n) => {
            lctx.globalAlpha = want[k] ? 1 : 0.18;
            lctx.fillText(ICON[k], x0 + 16 + n * 22, 25);
          });
          lctx.globalAlpha = 1;
        });
        // 刷碟點單：唱片圖示＋長刷的長度
        SCRATCHES.forEach((s, i) => {
          const x = xOf(s * STEP);
          const x1 = xOf((s + SCRATCH_STEPS) * STEP);
          if (x1 < 0 || x > LANE_W) return;
          lctx.fillStyle = scratchDone[i] ? '#5a4a90' : '#ff7ab8';
          lctx.fillRect(x, 50, x1 - x, 4);
          lctx.fillText('💿', x, 52);
        });
        // 判定線
        lctx.fillStyle = '#ffffff';
        lctx.fillRect(JUDGE_X - 1, 2, 2, LANE_H - 4);
      };

      const draw = (now: number) => {
        const st = playing ? songTime() : -99;
        const beat = playing ? st / (STEP * 4) : now / (60000 / DJ_BPM);
        const bar = Math.floor(st / BAR);
        if (playing) {
          // 小節開始時顯示上一個判定（點單做對或錯）
          if (bar >= 0 && bar !== lastShown && barOk[bar] !== undefined) {
            lastShown = bar;
            if (barOk[bar] === true) {
              combo++;
              judge = { label: combo >= 2 ? `Mix OK ×${combo}` : 'Mix OK', color: '#9ff0c4', at: now };
            } else if (barOk[bar] === false) {
              combo = 0;
              judge = { label: '點單不對', color: '#9a93a8', at: now };
            }
          }
          // 錯過的刷碟
          SCRATCHES.forEach((s, i) => {
            if (!scratchDone[i] && st - s * STEP > WINDOWS[2].ms / 1000) {
              scratchDone[i] = true;
              tally.scratch.漏掉++;
              judge = { label: '刷碟漏掉', color: '#9a93a8', at: now };
            }
          });
          refreshKeys();
          const left = DJ_BARS * BAR - st;
          const o = orderAt(Math.max(0, bar + 1));
          const text = `⏱ ${Math.max(0, Math.ceil(Math.min(left, DJ_BARS * BAR)))} 秒${o ? '　下一張：' + [...o.mix].map((c) => ICON[c === 'd' ? 'drums' : c === 'b' ? 'bass' : 'lead']).join('') : ''}`;
          if (info.textContent !== text) info.textContent = text;
          if (left < -0.8) finish();
        }
        const layersNow = bar >= 0 && played[bar] ? LAYERS.filter((k) => played[bar][k]).length : 0;
        const sp = scratchAt === null ? null : (now - scratchAt) / (SCRATCH_STEPS * STEP * 1000);
        const scratchP = sp !== null && sp < 1 ? sp : null;
        const s: ClubState = { beat, layers: playing ? layersNow : 0, scratch: scratchP, cheer: !!judge && judge.label.startsWith('Mix OK') && now - judge.at < 600 };
        ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
        drawClub(ctx, s);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const height = hasSprite(char) ? 150 : 120;
        const cx = (ROOM * ZOOM) / 2;
        const bottom = 55 * ZOOM;
        const motion: Motion = { t: now, hopAt };
        if (scratchP !== null) {
          ctx.save();
          ctx.translate(cx, bottom);
          ctx.rotate(Math.sin(scratchP * Math.PI * 6) * 0.06);
          ctx.translate(-cx, -bottom);
        }
        drawCharacter(ctx, char, 'happy', cx, bottom, height, motion, true);
        if (scratchP !== null) ctx.restore();
        ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
        drawBooth(ctx, s);
        if (scratchP !== null) drawZzzik(ctx, scratchP);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        // 判定文字
        if (judge && now - judge.at < 600) {
          const p = (now - judge.at) / 600;
          ctx.globalAlpha = 1 - p * p;
          ctx.font = 'bold 22px "Noto Sans TC", system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 5;
          ctx.strokeStyle = INK;
          const y = 64 - p * 10;
          ctx.strokeText(judge.label, (ROOM * ZOOM) / 2, y);
          ctx.fillStyle = judge.color;
          ctx.fillText(judge.label, (ROOM * ZOOM) / 2, y);
          ctx.globalAlpha = 1;
        }
        if (playing && st < 0) {
          const n = Math.min(COUNTDOWN, Math.ceil(-st));
          ctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
          drawCountdown(ctx, n, Math.max(0, n + st));
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        drawLane(playing ? st : -BAR * 2);
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    },
    unmount() {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    },
  };
}
