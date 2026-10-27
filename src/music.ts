// 編曲：把 songs.ts 的一個小節排成聲音（鼓、低音、和弦、主旋律），時間都排在 AudioContext 上
// EDM 風格（2026-10-25 使用者覺得銅管老氣）：四拍大鼓、反拍低音、sidechain 和弦、Build-up 接 Drop

import { bassSynth, clap, crash, hat, kick, lead, midi, openHat, pad, pluck, riser, snare, tone } from './audio';
import type { Bar, Chord, DrumStyle, LeadNote } from './data/songs';

/** 鼓與低音的節奏型（16 格，x＝打）：kick 大鼓、clap 拍手、hat 腳踏鈸、open 開放鈸；bass 的 R＝根音 */
const DRUMS: Record<DrumStyle, { kick: string; clap: string; hat: string; open: string; bass: string }> = {
  intro: { kick: 'x...x...x...x...', clap: '', hat: '', open: '..x...x...x...x.', bass: '' },
  verse: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', open: '', bass: 'R.......R.......' },
  build: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '', bass: 'R.R.R.R.R.R.R.R.' },
  chorus: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', open: '..x...x...x...x.', bass: '..R...R...R...R.' },
  chant: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '', open: '..x...x...x...x.', bass: '..R...R...R...R.' },
  end: { kick: '', clap: '', hat: '', open: '', bass: '' },
};

/** 和弦的組成音（MIDI），排在 G#3～G#4 附近 */
function voicing(c: Chord): number[] {
  const ext = { '': [], '7': [10], maj7: [11], '9': [10, 14], add9: [14] }[c.ext];
  const ivs = [0, c.minor ? 3 : 4, 7, ...ext];
  return ivs.map((iv) => {
    let n = 48 + c.root + iv;
    while (n < 56) n += 12;
    return n;
  });
}

const bassNote = (c: Chord) => 36 + c.root + (c.root < 4 ? 12 : 0);

/** 排一個小節：at＝這小節第一拍的音訊時間，step＝16 分音符的秒數 */
export function playBar(bar: Bar, at: number, step: number): void {
  const style = bar.section.drums;
  const d = DRUMS[style];
  const chordAt = (s: number) => bar.chords[s < 8 ? 0 : 1];
  const on = (pat: string, s: number) => pat[s] === 'x';
  const t = (s: number) => at + s * step;
  const beat = step * 4;
  // Build-up 的最後一小節：連打開始後其他樂器抽掉，只剩小鼓滾奏
  const cut = style === 'build' && bar.last ? (bar.rolls[0]?.[0] ?? 16) : 16;

  if (style === 'end') {
    kick(at, 1);
    crash(at, 0.25);
    pad(at, [...voicing(bar.chords[0]), voicing(bar.chords[0])[0] + 12].map(midi), step * 14, { from: 4000, to: 800, peak: 0.02 });
    tone(at, midi(bassNote(bar.chords[0])), step * 12, 'triangle', 0.3);
  }
  // Drop：副歌第一拍大鼓加重＋銅鈸
  if (bar.first && style === 'chorus') crash(at, 0.22);
  // Build-up：riser 從段落開頭掃到 Drop 前
  if (bar.first && style === 'build') riser(at, bar.section.bars * 16 * step);

  for (let s = 0; s < cut; s++) {
    if (on(d.kick, s)) kick(t(s), style === 'intro' ? 0.5 : style === 'chorus' ? 0.95 : 0.8);
    if (on(d.clap, s)) {
      clap(t(s), 0.3);
      if (style === 'chorus') snare(t(s), 0.2);
    }
    if (on(d.hat, s)) hat(t(s), s % 2 ? 0.025 : 0.05);
    if (on(d.open, s)) openHat(t(s), style === 'intro' ? 0.04 : 0.07);
    if (d.bass[s] === 'R') tone(t(s), midi(bassNote(chordAt(s))), step * (style === 'verse' ? 7 : 1.7), 'triangle', 0.3);
  }
  // 和弦：前奏悶悶的 pad、Build-up 慢慢變亮、副歌跟著大鼓吸（sidechain）
  for (const half of [0, 8]) {
    if (half >= cut) continue;
    const notes = [...voicing(chordAt(half)), voicing(chordAt(half))[0] + 12].map(midi);
    const len = Math.min(8, cut - half) * step;
    if (style === 'intro') pad(t(half), notes, len, { from: 700, peak: 0.012 });
    if (style === 'build') {
      const p0 = (bar.inSection * 16 + half) / (bar.section.bars * 16);
      const p1 = (bar.inSection * 16 + half + 8) / (bar.section.bars * 16);
      pad(t(half), notes, len, { from: 500 * 10 ** p0, to: 500 * 10 ** p1, peak: 0.014 });
    }
    if (style === 'chorus') pad(t(half), notes, len, { pump: beat, from: 3800, peak: 0.02 });
  }
  [...bar.pluck].forEach((ch, s) => s < cut && ch === 'x' && pluck(t(s), voicing(chordAt(s)).map((n) => midi(n + 12))));
  for (const n of bar.lead) if (n.step < cut) lead(t(n.step), midi(n.midi), n.len * step, style === 'chorus' || style === 'end');
  // 連打：小鼓滾奏越來越大聲，提示要一直按
  for (const [s, len] of bar.rolls) for (let k = 0; k < len; k++) snare(t(s + k), 0.12 + (k / len) * 0.25);
  // 過門：段落最後一小節的最後一拍，小鼓十六分音符漸強（有連打或結尾的段落不加）
  if (bar.last && !bar.rolls.length && style !== 'end') for (let s = 12; s < 16; s++) snare(t(s), 0.12 + (s - 12) * 0.06);
}

// ---- Disc Jockey：分層編曲，鼓／低音／旋律可以各自開關，和弦一直開著當底（使用者 2026-10-27 定案） ----

export interface DjLayers {
  drums: boolean;
  bass: boolean;
  lead: boolean;
}

export interface DjBar {
  chords: [Chord, Chord]; // 前半、後半小節
  lead: LeadNote[];
  build: boolean; // Build-up 第一小節：riser 一直開著（不屬於任何一軌）
  buildBars: number;
  last: boolean; // 最後一小節
}

/** 排一拍（beat＝這小節第幾拍 0～3，at＝這一拍開始的時間）：house 四拍大鼓、反拍低音、跟著大鼓吸的和弦
 *  一拍一拍排，Disc Jockey 的開關下一拍就生效；和弦半小節一起排（每拍重排會一直重新起音） */
export function playDjBeat(bar: DjBar, beat: number, at: number, step: number, on: DjLayers): void {
  const t = (s: number) => at + (s - beat * 4) * step;
  const chord = bar.chords[beat < 2 ? 0 : 1];
  if (bar.build && beat === 0) riser(at, bar.buildBars * 16 * step);
  if (beat % 2 === 0) {
    const notes = [...voicing(chord), voicing(chord)[0] + 12].map(midi);
    // 和弦：一直開著當底，小聲一點，開關三軌的差別才聽得出來（使用者 2026-10-27 反映疊音軌聽不出混音感）；鼓沒開時不吸
    pad(at, notes, step * 8, on.drums ? { pump: step * 4, from: 2600, peak: 0.011 } : { from: 1600, peak: 0.009 });
  }
  if (bar.last) {
    if (beat > 0) return;
    crash(at, 0.25);
    kick(at, 1);
    bassSynth(at, midi(bassNote(chord)), step * 8, 0.3);
    return;
  }
  for (let s = beat * 4; s < beat * 4 + 4; s++) {
    if (on.drums) {
      if (s % 4 === 0) kick(t(s), 1);
      if (s === 4 || s === 12) {
        clap(t(s), 0.5);
        snare(t(s), 0.25);
      }
      if (s % 4 === 2) openHat(t(s), 0.13);
      else hat(t(s), s % 2 ? 0.05 : 0.08);
    }
    // 低音：避開大鼓，16 分音符「低－高八度－低」跳著走，節奏感明顯，開關前後一聽就知道
    if (on.bass && s % 4 !== 0) {
      const up = s % 4 === 2 ? 12 : 0;
      bassSynth(t(s), midi(bassNote(chord) + up), step * 0.85, up ? 0.3 : 0.25);
    }
  }
  if (on.lead) for (const n of bar.lead) if (Math.floor(n.step / 4) === beat) lead(t(n.step), midi(n.midi), n.len * step, true, 1.8);
}
