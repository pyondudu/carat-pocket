// 搖飲料的規則（不碰畫面，之後搬到手錶也照這份）

import { DRINKS, INGREDIENTS, MYSTERY, type Drink, type Ingredient } from './data/drinks';

export const SHAKE_SECONDS = 10;
export const MIN_PICK = 2;
export const MAX_PICK = 3;

export type Quality = 1 | 2 | 3; // 普通、好喝、完美
export const QUALITY_LABELS: Record<Quality, string> = { 1: '普通', 2: '好喝', 3: '完美' };

const PRICE = { basic: 15, signature: 30, mystery: 5 };
const QUALITY_RATE: Record<Quality, number> = { 1: 1, 2: 1.5, 3: 2 };
const NEW_BONUS = 20;

/** 可以用的原料：基本原料＋已解鎖角色的專屬原料 */
export function availableIngredients(unlocked: string[]): Ingredient[] {
  return INGREDIENTS.filter((i) => !i.owner || unlocked.includes(i.owner));
}

/** 選的原料包含整個配方就做出那杯；招牌飲優先，其次照清單順序 */
export function makeDrink(picked: string[]): Drink {
  const ok = DRINKS.filter((d) => d.recipe.every((r) => picked.includes(r)));
  return ok.find((d) => d.owner) ?? ok[0] ?? MYSTERY;
}

/** 點擊次數決定品質；配方以外多加果糖升一級 */
export function qualityOf(taps: number, picked: string[], drink: Drink): Quality {
  let q: number = taps >= 55 ? 3 : taps >= 30 ? 2 : 1;
  if (picked.includes('fructose') && !drink.recipe.includes('fructose')) q++;
  return Math.min(3, q) as Quality;
}

export function coinsFor(drink: Drink, quality: Quality, isNew: boolean): number {
  const base = drink === MYSTERY ? PRICE.mystery : drink.owner ? PRICE.signature : PRICE.basic;
  return Math.round(base * QUALITY_RATE[quality]) + (isNew ? NEW_BONUS : 0);
}
