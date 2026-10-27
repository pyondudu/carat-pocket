// Disc Jockey 的曲子：用節奏應援的備用曲「克拉派對」（使用者 2026-10-27：另寫的 A 小調 loop 還是太老氣，換回克拉派對）
// 克拉派對剛好 16 小節（前奏 2、Drop A 6、Build-up 2、Drop B 5、結尾 1），沿用它的和弦和旋律（速度加快），用 DJ 的分層方式播

import type { DjBar } from '../music';
import { PARTY, songBars } from './songs';

/** 比節奏應援的克拉派對（128）快：使用者 2026-10-27 要求節奏快一點 */
export const DJ_BPM = 140;

export const DJ_SONG: DjBar[] = songBars(PARTY).map((b, i, all) => ({
  chords: b.chords,
  lead: b.lead,
  build: b.section.drums === 'build' && b.first,
  buildBars: b.section.bars,
  last: i === all.length - 1,
}));

export const DJ_BARS = DJ_SONG.length;
