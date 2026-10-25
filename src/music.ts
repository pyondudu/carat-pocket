// 編曲：把 songs.ts 的一個小節排成聲音（鼓、低音、銅管、主旋律），時間都排在 AudioContext 上

import { brass, clap, crash, hat, hold, kick, midi, openHat, snare, tone } from './audio';
import type { Bar, Chord, DrumStyle } from './data/songs';

const LEAD_SHIFT = -12; // 樂譜寫高一個八度比較好讀，實際降一個八度，方波才不會太刺耳

/** 鼓的節奏型（16 格，x＝打）：kick 大鼓、clap 拍手、hat 腳踏鈸、open 開放鈸 */
const DRUMS: Record<DrumStyle, { kick: string; clap: string; hat: string; open: string; bass: string }> = {
  intro: { kick: 'x.......x.......', clap: '............x...', hat: '', open: '', bass: 'R.......R.......' },
  verse: { kick: 'x.....x.x.......', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '', bass: 'R.rR..r.R.rR..r.' },
  build: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '', bass: 'R.R.R.R.R.R.R.R.' },
  chorus: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '..x...x...x...x.', bass: 'R.rR..r.R.rR..r.' },
  chant: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '', open: '..x...x...x...x.', bass: 'R...R...R...R...' },
  end: { kick: 'x..x..x.........', clap: '', hat: '', open: '', bass: 'R..R..R.........' },
};

/** 和弦的組成音（MIDI），排在 G3～G4 附近 */
function voicing(c: Chord): number[] {
  const ivs = [0, c.minor ? 3 : 4, 7, ...(c.seventh ? [10] : [])];
  return ivs.map((iv) => {
    let n = 48 + c.root + iv;
    while (n < 56) n += 12;
    return n;
  });
}

/** 排一個小節：at＝這小節第一拍的音訊時間，step＝16 分音符的秒數 */
export function playBar(bar: Bar, at: number, step: number): void {
  const style = bar.section.drums;
  const d = DRUMS[style];
  const chordAt = (s: number) => bar.chords[s < 8 ? 0 : 1];
  const last = style === 'end' && bar.inSection === bar.section.bars - 1; // 最後一小節：只打一聲
  const on = (pat: string, s: number) => pat[s] === 'x';
  const t = (s: number) => at + s * step;

  if (bar.first && (style === 'chorus' || style === 'chant')) crash(at);
  if (last) {
    kick(at, 0.9);
    crash(at, 0.25);
  }
  for (let s = 0; s < 16 && !last; s++) {
    if (on(d.kick, s)) kick(t(s), 0.8);
    // 預備段後半拍手變八分音符，越來越緊
    if (on(d.clap, s) || (style === 'build' && bar.inSection >= 2 && s % 2 === 0)) clap(t(s), style === 'build' && bar.inSection >= 2 ? 0.2 + s * 0.01 : 0.35);
    if (on(d.hat, s)) hat(t(s), s % 4 === 2 ? 0.07 : 0.04);
    if (on(d.open, s)) openHat(t(s));
    // 低音：R＝根音、r＝高八度
    const b = d.bass[s];
    if (b === 'R' || b === 'r') {
      const root = 36 + chordAt(s).root + (chordAt(s).root < 4 ? 12 : 0);
      tone(t(s), midi(root + (b === 'r' ? 12 : 0)), step * (style === 'intro' ? 6 : 1.6), 'triangle', 0.22);
    }
  }
  if (last) tone(at, midi(36 + bar.chords[0].root + (bar.chords[0].root < 4 ? 12 : 0)), step * 12, 'triangle', 0.25);
  // 銅管：x＝短音、X＝長音
  [...bar.brass].forEach((ch, s) => {
    if (ch === 'x') brass(t(s), voicing(chordAt(s)).map(midi));
    if (ch === 'X') brass(t(s), voicing(chordAt(s)).map(midi), step * 12, 0.04);
  });
  for (const n of bar.lead) hold(t(n.step), midi(n.midi + LEAD_SHIFT), n.len * step, 'square', 0.045);
  // 連打：小鼓滾奏越來越大聲，提示要一直按
  for (const [s, len] of bar.rolls) for (let k = 0; k < len; k++) snare(t(s + k), 0.1 + (k / len) * 0.22);
}
