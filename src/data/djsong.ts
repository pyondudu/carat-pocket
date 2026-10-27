// Disc Jockey 的曲子：原創 16 小節 house loop（使用者 2026-10-27：另外寫一段，不合適再改用克拉派對）
// 沿用克拉派對的 EDM 音色；A 小調、124 BPM，和弦循環 Am9 → Fmaj7 → C(add9) → G，
// 旋律只用小調五聲音階、3-3-2 切分＋八度跳躍（使用者喜歡克拉派對 Drop 的這種寫法，不要大調、不要音階一格一格走）

import type { DjBar } from '../music';
import { parseChord, parsePitch, type LeadNote } from './songs';

export const DJ_BPM = 124;
export const DJ_BARS = 16;

const CHORDS = ['Am9', 'Fmaj7', 'Cadd9', 'G'];
/** 主旋律 4 小節，「A5:2」＝A5 長 2 個 16 分音符、「-:2」＝休息 */
const HOOK = [
  'E5:1 -:2 G5:1 -:2 A5:2 C6:1 -:1 A5:1 G5:1 -:2 E5:2',
  'A5:1 -:2 C6:1 -:2 E6:2 D6:1 -:1 C6:1 A5:1 -:2 G5:2',
  'E5:1 -:2 G5:1 -:2 A5:2 C6:1 -:1 E6:1 G6:1 -:2 E6:2',
  'D6:2 -:1 C6:2 -:1 A5:2 -:4 G5:1 A5:1 -:2',
];

function parseLead(s: string): LeadNote[] {
  const notes: LeadNote[] = [];
  let step = 0;
  for (const tok of s.trim().split(/\s+/)) {
    const [p, l] = tok.split(':');
    const len = Number(l);
    if (p !== '-') notes.push({ step, len, midi: parsePitch(p) });
    step += len;
  }
  if (step !== 16) console.warn(`Disc Jockey 旋律長度是 ${step} 格，不是 16`);
  return notes;
}

export const DJ_SONG: DjBar[] = Array.from({ length: DJ_BARS }, (_, i) => ({
  chord: parseChord(CHORDS[i % 4]),
  lead: parseLead(HOOK[i % 4]),
  first: i === 0,
  last: i === DJ_BARS - 1,
}));
