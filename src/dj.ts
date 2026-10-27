// Disc Jockey 的點單與計分規則（不碰畫面、不碰聲音，之後搬到手錶照這份）
// 使用者 2026-10-27 定案：三軌（鼓／低音／旋律）照點單切換，和弦一直開；只有點單出現時才能刷碟；只做一種難度
// 同一天改版：拿掉水平點單軌道，開關下一拍就生效，每拍判定，點單剛換的頭 GRACE_BEATS 拍不判定（留時間反應）

import type { DjLayers } from './music';

/** 點單：從第 from 小節開始要的音軌組合（d＝鼓、b＝低音、l＝旋律），持續到下一張點單 */
export interface Order {
  from: number;
  mix: string;
}

/** 前 2 小節是前奏（只有和弦，不算分），之後每小節換一張（使用者 2026-10-27：原本 2 小節一張，撥好後等太久）；
 *  跟著克拉派對的段落：Drop A 2～7、Build-up 8～9、Drop B 10～14、第 15 小節收尾不算 */
export const ORDERS: Order[] = [
  // 每次只換一個音軌（使用者 2026-10-27 覺得有點趕，一次撥好幾顆最容易手忙腳亂）
  { from: 2, mix: 'd' },
  { from: 3, mix: 'db' },
  { from: 4, mix: 'dbl' },
  { from: 5, mix: 'bl' },
  { from: 6, mix: 'l' },
  { from: 7, mix: 'dl' },
  { from: 8, mix: 'd' },
  { from: 9, mix: 'db' },
  { from: 10, mix: 'dbl' },
  { from: 11, mix: 'bl' },
  { from: 12, mix: 'b' },
  { from: 13, mix: 'db' },
  { from: 14, mix: 'dbl' },
];

/** 刷碟點單：第幾格（16 分音符，從第一拍算）開始長刷，長 SCRATCH_STEPS 格（一小節，使用者 2026-10-27 嫌半小節太短）；都從小節後半開始 */
export const SCRATCHES = [7 * 16 + 8, 11 * 16 + 8, 15 * 16 + 8];
export const SCRATCH_STEPS = 16;

export const MIX_LABEL: Record<keyof DjLayers, string> = { drums: '鼓', bass: '低音', lead: '旋律' };

export function wanted(mix: string): DjLayers {
  return { drums: mix.includes('d'), bass: mix.includes('b'), lead: mix.includes('l') };
}

/** 第 bar 小節要的組合；前奏回傳 null（不算分） */
export function orderAt(bar: number): Order | null {
  let o: Order | null = null;
  for (const x of ORDERS) if (x.from <= bar) o = x;
  return o;
}

export const sameMix = (a: DjLayers, b: DjLayers) => a.drums === b.drums && a.bass === b.bass && a.lead === b.lead;

export type Judge = '完美' | '很好' | '還行';
export const SCRATCH_POINTS: Record<Judge, number> = { 完美: 300, 很好: 210, 還行: 120 };
export const MIX_POINT = 50; // 每一拍（點單每小節一張後，判定的拍數變少，從 25 調高，點單和刷碟的總分才差不多）
/** 點單剛換上的頭幾拍不判定 */
export const GRACE_BEATS = 2;
/** 金幣上限（全部做對時拿滿；暫定和節奏應援的普通一樣） */
export const DJ_COIN_CAP = 45;

export type Rank = 'S' | 'A' | 'B' | 'C';
export const DJ_RANK_LABEL: Record<Rank, string> = { S: '全場沸騰！', A: '超嗨的一場！', B: '不錯的演出！', C: '再練習一下！' };

export interface DjTally {
  mixOk: number; // 音軌組合對的拍數
  mixBeats: number; // 要判定的拍數
  scratch: Record<Judge | '漏掉', number>;
}

export function djScore(t: DjTally): { score: number; ratio: number; rank: Rank; coins: number } {
  const score = t.mixOk * MIX_POINT + (Object.keys(SCRATCH_POINTS) as Judge[]).reduce((n, k) => n + t.scratch[k] * SCRATCH_POINTS[k], 0);
  const max = t.mixBeats * MIX_POINT + SCRATCHES.length * SCRATCH_POINTS.完美;
  const ratio = max ? score / max : 0;
  const rank: Rank = ratio >= 0.95 ? 'S' : ratio >= 0.85 ? 'A' : ratio >= 0.7 ? 'B' : 'C';
  return { score, ratio, rank, coins: Math.round(DJ_COIN_CAP * ratio) };
}
