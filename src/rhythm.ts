// 節奏應援的計分規則（不碰畫面，之後搬到手錶照這份）

import type { Level } from './data/songs';

export type Judge = '完美' | '很好' | '還行';
export const POINTS: Record<Judge, number> = { 完美: 100, 很好: 70, 還行: 40 };
/** 連打每按一下的分數（只加分數，不影響評級和金幣） */
export const ROLL_POINT = 10;
/** 金幣上限：全部「完美」時拿滿（使用者 2026-10-26 照計畫定案） */
export const COIN_CAP: Record<Level, number> = { easy: 30, normal: 45, hard: 60 };

export type Rank = 'S' | 'A' | 'B' | 'C';
export const RANK_LABEL: Record<Rank, string> = { S: '完美應援！', A: '超棒的應援！', B: '不錯的應援！', C: '再練習一下！' };

export interface Tally {
  完美: number;
  很好: number;
  還行: number;
  漏掉: number;
  連打: number;
}

export interface Score {
  score: number;
  /** 0～1：一般音符拿到的分數 ÷ 全部完美的分數 */
  ratio: number;
  rank: Rank;
  coins: number;
}

export function scoreOf(t: Tally, totalNotes: number, level: Level): Score {
  const notePoints = t.完美 * POINTS.完美 + t.很好 * POINTS.很好 + t.還行 * POINTS.還行;
  const ratio = totalNotes ? notePoints / (totalNotes * POINTS.完美) : 0;
  const rank: Rank = ratio >= 0.95 ? 'S' : ratio >= 0.85 ? 'A' : ratio >= 0.7 ? 'B' : 'C';
  return { score: notePoints + t.連打 * ROLL_POINT, ratio, rank, coins: Math.round(COIN_CAP[level] * ratio) };
}
