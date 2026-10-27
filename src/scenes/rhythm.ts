// 節奏應援：上方房間，本命拿克拉棒跳舞；中間音符軌道（太鼓式，由右往左流）；下方粉／藍兩顆按鈕
// 流程（使用者 2026-10-26 定案）：進來先跳說明視窗 → 選難度 → 按開始 → 房間中央 3、2、1 倒數 → 一局約 30 秒 → 結算
// 一局體力 −10、心情 +10（pet.ts 的 GAME_ENERGY、GAME_MOOD），金幣依得分（src/rhythm.ts）；還沒選本命（#rhythm 預覽）時不給獎勵

import { CHARACTERS } from '../data/characters';
import { drawCharacter, hasSprite, type Motion } from '../draw';
import { drawCaratBong, type Glow } from '../drinkart';
import { audio, heardTime, loadTrack, padSound, playTrack, tone } from '../audio';
import { expandChart, LEVEL_LABEL, LEVEL_TRAVEL, LEVELS, PARTY, songBars, TO_BE_FREE, totalBars, type Bar, type Level, type Song } from '../data/songs';
import { playBar } from '../music';
import { go, type Scene } from '../router';
import { applyRhythm, GAME_ENERGY, GAME_MOOD, rhythmBlocked } from '../pet';
import { RANK_LABEL, scoreOf } from '../rhythm';
import { mainPet, passTime, save, state } from '../state';
import { h, modal } from '../ui';
import { drawClock, drawRoom, NOTE, ROOM, ZOOM } from './home';

const INK = '#2b2b2b';
const COUNTDOWN = 3; // 按開始後 3、2、1 倒數，倒數完第一拍
const LANE_H = 15; // 軌道高度（房間格數）
const JUDGE_X = 9; // 判定圈中心（房間格數）
export const WINDOWS = [
  { ms: 50, label: '完美', color: '#ffd84a' },
  { ms: 100, label: '很好', color: '#ffffff' },
  { ms: 150, label: '還行', color: '#cfe3ff' },
];

interface Note {
  t: number; // 秒（從第一拍算）
  color: Glow | 'roll'; // roll＝紫色連打（拉長的音符，經過判定圈時粉藍都可以一直按）
  len?: number; // 連打的長度（秒）
  rolls?: number; // 連打按了幾下
  hit?: boolean;
  missed?: boolean;
}

/** 圓形像素圖：d 為直徑（格），外圈墨線、左上一點反光；ring＝只有白框的判定圈 */
function dot(d: number, fill: string, ring = false): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = cv.height = d;
  const g = cv.getContext('2d')!;
  const c = d / 2;
  // 以格子中心判斷是否在圓內，邊緣比較圓滑
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < d && y < d && (x + 0.5 - c) ** 2 + (y + 0.5 - c) ** 2 <= c * c;
  const near = (x: number, y: number, k: number) => [[k, 0], [-k, 0], [0, k], [0, -k], [k, k], [-k, k], [k, -k], [-k, -k]].some(([dx, dy]) => !inside(x + dx, y + dy));
  for (let y = 0; y < d; y++)
    for (let x = 0; x < d; x++) {
      if (!inside(x, y)) continue;
      if (ring) g.fillStyle = near(x, y, 1) ? 'rgba(255,255,255,0.9)' : near(x, y, 2) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)';
      else g.fillStyle = near(x, y, 1) ? INK : fill;
      g.fillRect(x, y, 1, 1);
    }
  if (!ring) {
    const k = Math.round(d * 0.28);
    g.fillStyle = '#ffffff';
    g.fillRect(k, k, 2, 1);
    g.fillRect(k, k + 1, 1, 1);
  }
  return cv;
}

/** 像素小工具：在房間格座標畫一格方塊 */
function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/** 聚光燈：從 (x, y) 往下的半透明光錐，angle 為弧度（0＝正下方） */
function beam(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, len: number, spread: number, color: string): void {
  const dx = Math.sin(angle) * len;
  const dy = Math.cos(angle) * len;
  const g = ctx.createLinearGradient(x, y, x + dx, y + dy);
  g.addColorStop(0, color + '88');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 1, y);
  ctx.lineTo(x + 1, y);
  ctx.lineTo(x + dx + spread, y + dy);
  ctx.lineTo(x + dx - spread, y + dy);
  ctx.fill();
}

/** 應援背景＝房間開演唱會（使用者 2026-10-25 選的）：房間關燈、掛彩燈跟拍子閃、地毯換成小舞台、聚光燈打在本命身上 */
function drawStage(ctx: CanvasRenderingContext2D, beat: number): void {
  drawRoom(ctx, false);
  px(ctx, 0, 0, ROOM, ROOM, 'rgba(24,16,48,0.5)');
  drawClock(ctx, new Date()); // 時鐘不調暗
  // 彩燈：從時鐘右邊拉到右牆的波浪形線，燈泡粉藍黃輪流閃
  const on = Math.floor(beat) % 2;
  for (let x = 23; x < ROOM; x++) {
    const y = 7 + Math.round(Math.sin((x / ROOM) * Math.PI * 3) * 2 + 2);
    px(ctx, x, y, 1, 1, '#3a3050');
    if (x % 5 === 2) {
      const c = ['#f78fb0', '#6f9ee8', '#ffe27a'][(x + on * 5) % 3];
      px(ctx, x, y + 1, 2, 2, c);
      ctx.globalAlpha = 0.3;
      px(ctx, x - 1, y, 4, 4, c);
      ctx.globalAlpha = 1;
    }
  }
  // 小舞台
  px(ctx, 8, 52, 44, 6, '#c9a0d8');
  px(ctx, 8, 52, 44, 1, '#f0d4f7');
  px(ctx, 8, 57, 44, 1, '#8e6aa0');
  for (let x = 10; x < 52; x += 6) px(ctx, x, 54, 2, 2, (x / 6 + on) % 2 ? '#f78fb0' : '#6f9ee8');
  beam(ctx, 27, 0, 0, 56, 14, '#fff1a8');
}

/** 倒數用的 5×7 像素數字 */
const BIG_DIGITS: Record<number, string[]> = {
  1: ['..X..', '.XX..', '..X..', '..X..', '..X..', '..X..', '.XXX.'],
  2: ['.XXX.', 'X...X', '....X', '...X.', '..X..', '.X...', 'XXXXX'],
  3: ['XXXX.', '....X', '....X', '.XXX.', '....X', '....X', 'XXXX.'],
};

/** 房間正中央的倒數圖示：佔房間一半大小的圓牌＋大數字，每秒換數字時彈一下（ctx 是房間格座標） */
export function drawCountdown(ctx: CanvasRenderingContext2D, n: number, p: number): void {
  const s = 1 + Math.max(0, 0.2 - p) * 1.2; // 剛換數字時大一點再縮回
  ctx.save();
  ctx.translate(ROOM / 2, ROOM / 2);
  ctx.scale(s, s);
  ctx.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1;
  const r = ROOM / 4;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, r + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f78fb0';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
  ctx.fill();
  const cell = 3;
  const rows = BIG_DIGITS[n];
  ctx.fillStyle = '#c2607a';
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch === 'X' && ctx.fillRect((x - 2.5) * cell, (y - 3.5) * cell, cell, cell)));
  ctx.restore();
}

export function rhythmScene(): Scene {
  let raf = 0;
  let timer = 0;
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.key === 'f' || e.key === 'F' || e.key === 'ArrowLeft') press('pink');
    if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowRight') press('blue');
  };
  let press: (c: Glow) => void = () => {};
  let stopTrack = () => {};

  return {
    mount(root) {
      // 用本命；還沒選本命（#rhythm 直接開預覽）時用第一個角色、不給獎勵
      const charIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === state.mainId));
      const pet = mainPet();
      if (pet) {
        // 進來先補算時間，體力才是最新的
        passTime(Date.now() - state.lastSeen);
        save();
      }
      const coins = h('span', { className: 'coins', textContent: `🪙 ${state.coins}` });
      let playing = false;
      let t0 = 0; // 第一拍的音訊時間
      let scheduledBar = 0;
      // 正式曲是音檔〈To Be Free〉；音檔載入失敗（例如離線第一次開）就改用程式合成的「克拉派對」
      let song: Song = TO_BE_FREE;
      let track: AudioBuffer | null = null;
      let ready = false; // 音檔載入完成（或確定失敗、改用備用曲）
      let synthBars: Bar[] = []; // 只有合成曲用得到
      let STEP = 60 / song.bpm / 4; // 16 分音符（秒）
      let BAR = STEP * 16;
      let songBarCount = totalBars(song);
      const useSong = (s: Song) => {
        song = s;
        STEP = 60 / s.bpm / 4;
        BAR = STEP * 16;
        songBarCount = totalBars(s);
        synthBars = s === PARTY ? songBars(PARTY) : [];
      };
      let onReady = () => {};
      loadTrack(`${import.meta.env.BASE_URL}${TO_BE_FREE.audio!.src}`)
        .then((buf) => (track = buf))
        .catch(() => useSong(PARTY))
        .finally(() => {
          ready = true;
          onReady();
        });
      let level: Level | null = null;
      let TRAVEL = LEVEL_TRAVEL.normal; // 音符從右邊出現到判定圈的秒數
      const notes: Note[] = [];
      let combo = 0;
      let best = 0;
      const counts = { 完美: 0, 很好: 0, 還行: 0, 漏掉: 0, 連打: 0 };
      const info = h('div', { className: 'shake-info' });
      let judge: { label: string; color: string; at: number } | null = null;
      let tapAt: number | undefined;
      let hopAt: number | undefined;
      let lastPad: { color: Glow; at: number } | null = null;
      // 揮克拉棒時從球頂冒出的音符（顏色跟按的一樣）
      const sparks: { color: Glow; at: number; dx: number }[] = [];

      const room = h('canvas', { className: 'pixel room', width: ROOM * ZOOM, height: ROOM * ZOOM });
      const lane = h('canvas', { className: 'pixel lane', width: ROOM * ZOOM, height: LANE_H * ZOOM });
      const rctx = room.getContext('2d')!;
      const lctx = lane.getContext('2d')!;
      const stage = h('div', { className: 'rhythm-stage' });
      const panel = h('div', { className: 'rhythm-panel' });

      const notePink = dot(10, '#f78fb0');
      const noteBlue = dot(10, '#6f9ee8');
      const ROLL = '#c79be8';
      const noteRoll = dot(10, ROLL);
      const ring = dot(12, '', true);

      // 軌道放在房間和按鈕之間（使用者 2026-10-25 定案）
      stage.append(room, lane);

      // 排程：音樂提前 0.6 秒排進 AudioContext（音符在開始時就整首放好，一定從軌道右邊出現）
      const schedule = () => {
        if (!playing) return;
        const ac = audio();
        while (scheduledBar < synthBars.length && t0 + scheduledBar * BAR < ac.currentTime + 0.6) {
          playBar(synthBars[scheduledBar], t0 + scheduledBar * BAR, STEP);
          scheduledBar++;
        }
      };

      const songTime = () => heardTime() - t0;

      press = (c: Glow) => {
        padSound(c);
        const now = performance.now();
        lastPad = { color: c, at: now };
        sparks.push({ color: c, at: now, dx: c === 'pink' ? -1 : 1 });
        if (sparks.length > 8) sparks.shift();
        if (!playing) return;
        tapAt = now;
        const st = songTime();
        // 連打中：粉藍都算，不影響 combo
        const roll = notes.find((n) => n.color === 'roll' && st >= n.t - 0.05 && st <= n.t + n.len! + 0.05);
        if (roll) {
          roll.rolls!++;
          counts.連打++;
          judge = { label: `連打 ${roll.rolls}`, color: '#e3c8ff', at: now };
          return;
        }
        const n = notes.find((n) => n.color === c && !n.hit && !n.missed && Math.abs(n.t - st) <= WINDOWS[2].ms / 1000);
        if (!n) return;
        n.hit = true;
        const dt = Math.abs(n.t - st) * 1000;
        const w = WINDOWS.find((w) => dt <= w.ms)!;
        counts[w.label as '完美' | '很好' | '還行']++;
        combo++;
        best = Math.max(best, combo);
        judge = { label: w.label, color: w.color, at: now };
        if (combo % 10 === 0) hopAt = now;
      };

      const pad = (c: Glow, label: string) => {
        const b = h('button', { className: `pad ${c}`, textContent: label });
        b.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          press(c);
        });
        return b;
      };

      const start = (lv: Level) => {
        if (pet) {
          passTime(Date.now() - state.lastSeen);
          if (rhythmBlocked(pet)) return pick();
        }
        const ac = audio();
        level = lv;
        TRAVEL = LEVEL_TRAVEL[lv];
        playing = true;
        t0 = ac.currentTime + COUNTDOWN;
        // 倒數的嗶聲：3、2、1
        for (let k = COUNTDOWN; k >= 1; k--) tone(t0 - k, 880, 0.12, 'triangle', 0.25);
        stopTrack();
        if (song.audio && track) stopTrack = playTrack(track, t0, song.audio.offset, songBarCount * BAR);
        scheduledBar = 0;
        notes.length = 0;
        for (const n of expandChart(song, lv)) notes.push({ t: n.step * STEP, color: n.color, ...(n.color === 'roll' ? { len: n.steps! * STEP, rolls: 0 } : {}) });
        combo = best = 0;
        for (const k of Object.keys(counts) as (keyof typeof counts)[]) counts[k] = 0;
        judge = null;
        schedule();
        clearInterval(timer);
        timer = window.setInterval(schedule, 100);
        panel.replaceChildren(info, h('div', { className: 'pads' }, pad('pink', '粉'), pad('blue', '藍')), h('p', { className: 'hint', textContent: '電腦可以用 F／J 鍵' }));
      };

      // 一局結束：算分、給金幣、扣體力、記最高分
      const finish = () => {
        playing = false;
        clearInterval(timer);
        stopTrack();
        const lv = level!;
        const total = expandChart(song, lv).filter((n) => n.color !== 'roll').length;
        const r = scoreOf(counts, total, lv);
        let record = false;
        if (pet) {
          passTime(Date.now() - state.lastSeen);
          state.coins += r.coins;
          applyRhythm(pet);
          const entry = (state.rhythm[`${song.id}:${lv}`] ??= { best: 0, plays: 0 });
          entry.plays++;
          record = r.score > entry.best;
          entry.best = Math.max(entry.best, r.score);
          save();
          coins.textContent = `🪙 ${state.coins}`;
        }
        hopAt = performance.now();
        const row = (k: string, v: number) => h('div', { className: 'stat-row' }, h('span', { textContent: k }), h('strong', { textContent: String(v) }));
        panel.replaceChildren(
          h('div', { className: 'rhythm-rank' }, h('strong', { className: `rank rank-${r.rank}`, textContent: r.rank }), h('div', {}, h('h2', { textContent: RANK_LABEL[r.rank] }), h('p', { textContent: `${LEVEL_LABEL[lv]}・${r.score} 分${record ? '・新紀錄！' : ''}` }))),
          h(
            'div',
            { className: 'rhythm-result' },
            row('完美', counts.完美),
            row('很好', counts.很好),
            row('還行', counts.還行),
            row('漏掉', counts.漏掉),
            row('最高連擊', best),
            row('連打', counts.連打),
          ),
          ...(pet ? [h('p', { className: 'gain rhythm-gain', textContent: `+${r.coins} 🪙　體力 −${GAME_ENERGY}　心情 +${GAME_MOOD}` })] : []),
          h('div', { className: 'row' }, h('button', { className: 'secondary', textContent: '回房間', onclick: () => go(state.mainId ? 'home' : 'intro') }), h('button', { className: 'primary', textContent: '再玩一次', onclick: pick })),
        );
      };

      // 選難度：簡單／普通／困難三顆按鈕，選好再按開始
      function pick(): void {
        const blocked = pet && rhythmBlocked(pet);
        if (blocked) {
          panel.replaceChildren(h('p', { className: 'hint', textContent: blocked }), h('button', { className: 'primary', textContent: '回房間', onclick: () => go('home') }));
          return;
        }
        const startBtn = h('button', { className: 'primary', onclick: () => start(level!) });
        // 音檔還沒載完時顯示載入中，不能按
        const updateStart = () => {
          startBtn.textContent = !ready ? '音樂載入中…' : pet ? `開始！（體力 −${GAME_ENERGY}）` : '開始！';
          startBtn.disabled = !ready || !level;
        };
        onReady = updateStart;
        updateStart();
        const buttons = LEVELS.map((lv) => {
          const b = h('button', { className: `level ${lv}`, textContent: LEVEL_LABEL[lv] });
          b.onclick = () => {
            level = lv;
            for (const x of buttons) x.classList.toggle('on', x === b);
            updateStart();
          };
          b.classList.toggle('on', lv === level);
          return b;
        });
        panel.replaceChildren(h('div', { className: 'levels' }, ...buttons), startBtn);
      }

      const char = () => CHARACTERS[charIndex];

      pick();
      // 進來先跳說明視窗
      const closeIntro = modal(
        h('h2', { textContent: '🎵 節奏應援' }),
        h('p', { textContent: '跟著歌曲用按鈕應援吧！\n點選難易程度後開始遊戲' }),
        h('p', { className: 'credit', textContent: '音樂：To Be Free – Nck\nMusic powered by BreakingCopyright' }),
        h('button', { className: 'primary', textContent: '好！', onclick: () => closeIntro() }),
      );

      root.append(
        h(
          'div',
          { className: 'screen rhythm' },
          h('div', { className: 'bar' }, h('button', { className: 'secondary', textContent: '← 房間', onclick: () => go(state.mainId ? 'home' : 'intro') }), h('h1', { textContent: '🎵 節奏應援' }), coins),
          stage,
          panel,
        ),
      );
      window.addEventListener('keydown', onKey);

      const cell = 3;
      const drawLane = (now: number) => {
        const W = ROOM * ZOOM;
        const H = LANE_H * ZOOM;
        lctx.imageSmoothingEnabled = false;
        lctx.fillStyle = '#3d3552';
        lctx.fillRect(0, 0, W, H);
        lctx.fillStyle = '#4c4366';
        lctx.fillRect(0, ZOOM * 3, W, H - ZOOM * 6);
        lctx.fillStyle = '#2b2440';
        lctx.fillRect(0, 0, W, ZOOM);
        lctx.fillRect(0, H - ZOOM, W, ZOOM);
        const jx = JUDGE_X * ZOOM;
        const cy = H / 2;
        const blit = (img: HTMLCanvasElement, x: number) => lctx.drawImage(img, Math.round(x - (img.width * ZOOM) / 2), Math.round(cy - (img.height * ZOOM) / 2), img.width * ZOOM, img.height * ZOOM);
        // 按下時判定圈閃一下按的顏色
        if (lastPad && now - lastPad.at < 120) {
          lctx.fillStyle = lastPad.color === 'pink' ? 'rgba(247,143,176,0.55)' : 'rgba(111,158,232,0.55)';
          lctx.beginPath();
          lctx.arc(jx, cy, 7 * ZOOM, 0, Math.PI * 2);
          lctx.fill();
        }
        blit(ring, jx);
        if (!playing) return;
        const st = songTime();
        const pos = (d: number) => jx + (d / TRAVEL) * (W - jx + 8 * ZOOM);
        // 連打長條先畫在最底下，一般音符蓋在上面，才不會被長條藏住
        for (const n of notes) {
          if (n.color !== 'roll') continue;
          const dt = n.t - st;
          const end = dt + n.len!;
          if (dt > TRAVEL || end < -0.3) continue;
          // 經過判定圈的部分被「吃掉」：頭停在判定圈，尾巴流進來
          const hx = Math.max(pos(dt), jx);
          const tx = pos(end);
          if (tx < jx) continue;
          const r = 5 * ZOOM;
          lctx.fillStyle = INK;
          lctx.fillRect(Math.round(hx), Math.round(cy - r), Math.round(tx - hx), r * 2);
          lctx.fillStyle = ROLL;
          lctx.fillRect(Math.round(hx), Math.round(cy - r + ZOOM), Math.round(tx - hx), r * 2 - ZOOM * 2);
          lctx.fillStyle = '#e3c8ff';
          lctx.fillRect(Math.round(hx), Math.round(cy - r + ZOOM * 2), Math.round(tx - hx), ZOOM);
          blit(noteRoll, tx);
          blit(noteRoll, hx);
        }
        // 一般音符：後面的先畫，前面的蓋在上面
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          if (n.hit || n.color === 'roll') continue;
          const dt = n.t - st;
          if (!n.missed && dt < -WINDOWS[2].ms / 1000) {
            n.missed = true;
            counts.漏掉++;
            combo = 0;
            judge = { label: '漏掉', color: '#9a93a8', at: now };
          }
          if (dt > TRAVEL || dt < -0.3) continue;
          blit(n.color === 'pink' ? notePink : noteBlue, pos(dt));
        }
        // 清掉已經過去很久的音符
        while (notes.length && notes[0].t + (notes[0].len ?? 0) < st - 1) notes.shift();
        // 剩餘秒數（跟手搖飲一樣顯示在按鈕上方）
        const left = songBarCount * BAR - st;
        const text = `⏱ ${Math.max(0, Math.ceil(Math.min(left, songBarCount * BAR)))} 秒`;
        if (info.textContent !== text) info.textContent = text;
        if (left < -0.8) finish();
      };

      const draw = (now: number) => {
        const c = char();
        const height = hasSprite(c) ? 168 : 128;
        const cx = (ROOM * ZOOM) / 2 - 24;
        const bottom = (ROOM - 7) * ZOOM;
        const beat = playing ? songTime() / (STEP * 4) : now / 500;
        rctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
        drawStage(rctx, beat);
        rctx.setTransform(1, 0, 0, 1, 0, 0);
        const motion: Motion = { t: now, hopAt, tapAt };
        drawCharacter(rctx, c, 'happy', cx, bottom, height, motion);
        // 克拉棒：平常跟著拍子輕輕晃，按粉往左揮、按藍往右揮並發光
        let angle = -0.15 + Math.sin(beat * Math.PI) * 0.12;
        let glow: Glow | undefined;
        if (lastPad && now - lastPad.at < 160) {
          glow = lastPad.color;
          angle = lastPad.color === 'pink' ? -0.55 : 0.35;
        }
        const bx = cx + height * 0.44;
        const by = bottom - height * 0.34;
        drawCaratBong(rctx, bx, by, cell, angle, glow);
        // 音符：從球頂往上飄、往揮的方向偏、淡出
        for (const s of sparks) {
          const p = (now - s.at) / 700;
          if (p < 0 || p >= 1) continue;
          const x = Math.round(bx + s.dx * (10 + p * 26) - 7);
          const y = Math.round(by - 52 - p * 40);
          rctx.globalAlpha = p > 0.6 ? (1 - p) / 0.4 : 1;
          rctx.fillStyle = s.color === 'pink' ? '#e87a96' : '#6f8fd0';
          NOTE.forEach((row, ny) => [...row].forEach((ch, nx) => ch === 'X' && rctx.fillRect(x + nx * 3, y + ny * 3, 3, 3)));
          rctx.globalAlpha = 1;
        }
        // 判定文字與 combo
        if (judge && now - judge.at < 500) {
          const p = (now - judge.at) / 500;
          rctx.globalAlpha = 1 - p * p;
          rctx.font = 'bold 26px "Noto Sans TC", system-ui, sans-serif';
          rctx.textAlign = 'center';
          rctx.lineWidth = 5;
          rctx.strokeStyle = INK;
          const y = 40 - p * 10;
          rctx.strokeText(judge.label, (ROOM * ZOOM) / 2, y);
          rctx.fillStyle = judge.color;
          rctx.fillText(judge.label, (ROOM * ZOOM) / 2, y);
          rctx.globalAlpha = 1;
        }
        if (playing && combo >= 2) {
          rctx.font = 'bold 15px "Noto Sans TC", system-ui, sans-serif';
          rctx.textAlign = 'right';
          rctx.lineWidth = 4;
          rctx.strokeStyle = '#fff';
          const s = `${combo} 連擊`;
          rctx.strokeText(s, ROOM * ZOOM - 10, 24);
          rctx.fillStyle = '#c2607a';
          rctx.fillText(s, ROOM * ZOOM - 10, 24);
        }
        // 倒數 3、2、1：畫在房間正中央
        if (playing) {
          const st = songTime();
          if (st < 0) {
            // 音訊剛啟動時時鐘可能還落後（st < −3），先停在 3
            const n = Math.min(COUNTDOWN, Math.ceil(-st));
            rctx.setTransform(ZOOM, 0, 0, ZOOM, 0, 0);
            drawCountdown(rctx, n, Math.max(0, n + st));
            rctx.setTransform(1, 0, 0, 1, 0, 0);
          }
        }
        drawLane(now);
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    },
    unmount() {
      stopTrack();
      cancelAnimationFrame(raf);
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    },
  };
}

