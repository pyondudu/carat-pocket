// 搖飲料的原料與飲料（使用者 2026-10-24 指定的原料與招牌飲名稱）
// 原料 id：基本原料用英文；角色專屬原料直接用角色 id（名稱取 characters.ts 的 ingredient）

import { CHARACTERS } from './characters';

export interface Ingredient {
  id: string;
  name: string;
  color: string;
  owner?: string; // 專屬原料屬於哪個角色
}

const BASIC: Ingredient[] = [
  { id: 'milk', name: '牛奶', color: '#fbf8f0' },
  { id: 'blacktea', name: '紅茶', color: '#a8552a' },
  { id: 'greentea', name: '綠茶', color: '#b8c95a' },
  { id: 'ice', name: '冰塊', color: '#cfe9f7' },
  { id: 'fructose', name: '果糖', color: '#f6e7a0' },
];

/** 專屬原料的顏色（名稱在 characters.ts） */
const SPECIAL_COLORS: Record<string, string> = {
  choitcherry: '#c8283c', jjongtoram: '#6b4226', shuasumi: '#8a5a3c', ocl: '#f7b0a0',
  tamtam: '#4a2a14', foxdungee: '#4a4fa0', ppyopuli: '#e8d2a8', thepalee: '#7fa34a',
  kimja: '#fff4dc', doa: '#f5c542', bboogyuli: '#f39a2b', nonver: '#8fe3c8', chandalee: '#dfeef5',
};

export const INGREDIENTS: Ingredient[] = [
  ...BASIC,
  ...CHARACTERS.map((c) => ({ id: c.id, name: c.ingredient, color: SPECIAL_COLORS[c.id], owner: c.id })),
];

export function getIngredient(id: string): Ingredient {
  return INGREDIENTS.find((x) => x.id === id)!;
}

/** 杯子上的配料：冰塊、奶泡、厚奶蓋、水果、底層、葉子 */
export type Topping = 'ice' | 'foam' | 'cap' | 'fruit' | 'layer' | 'leaf';

export interface Drink {
  id: string;
  name: string;
  recipe: [string, string];
  owner?: string; // 角色招牌飲
  color: string; // 飲料顏色
  topping?: Topping;
  extra?: string; // 配料顏色
}

// 同時符合多杯時，招牌飲優先，其次照這個順序
export const DRINKS: Drink[] = [
  { id: 'milktea', name: '奶茶', recipe: ['milk', 'blacktea'], color: '#c99a6b' },
  { id: 'icedblacktea', name: '冰紅茶', recipe: ['blacktea', 'ice'], color: '#b5562a', topping: 'ice' },
  { id: 'greenmilktea', name: '綠奶茶', recipe: ['milk', 'greentea'], color: '#d9dca0' },
  { id: 'icedgreentea', name: '冰綠茶', recipe: ['greentea', 'ice'], color: '#c4cf5a', topping: 'ice' },
  { id: 'icedmilk', name: '冰牛奶', recipe: ['milk', 'ice'], color: '#fbf8f0', topping: 'ice' },
  { id: 'oldblacktea', name: '古早味紅茶', recipe: ['blacktea', 'fructose'], color: '#9c4a22' },
  { id: 'cherrysmoothie', name: '櫻桃冰沙', recipe: ['choitcherry', 'ice'], owner: 'choitcherry', color: '#e0566a', topping: 'fruit', extra: '#c8283c' },
  { id: 'latte', name: '拿鐵', recipe: ['jjongtoram', 'milk'], owner: 'jjongtoram', color: '#c8a07a', topping: 'foam', extra: '#fbf4e6' },
  { id: 'earlgrey', name: '伯爵鮮奶茶', recipe: ['shuasumi', 'milk'], owner: 'shuasumi', color: '#c7a487', topping: 'foam', extra: '#f4e8d8' },
  { id: 'peachtea', name: '水蜜桃紅茶', recipe: ['ocl', 'blacktea'], owner: 'ocl', color: '#c8703a', topping: 'fruit', extra: '#f7b0a0' },
  { id: 'brownsugar', name: '黑糖鮮奶', recipe: ['tamtam', 'milk'], owner: 'tamtam', color: '#f3e6d2', topping: 'layer', extra: '#5a3018' },
  { id: 'blueberry', name: '藍莓優格奶綠', recipe: ['foxdungee', 'greentea'], owner: 'foxdungee', color: '#d9d2e6', topping: 'fruit', extra: '#4a4fa0' },
  { id: 'ricemilk', name: '米漿紅茶', recipe: ['ppyopuli', 'blacktea'], owner: 'ppyopuli', color: '#c69466', topping: 'layer', extra: '#e8d2a8' },
  { id: 'matcha', name: '抹茶拿鐵', recipe: ['thepalee', 'milk'], owner: 'thepalee', color: '#a9c46c', topping: 'foam', extra: '#f6f3e4' },
  { id: 'milkcap', name: '奶蓋綠茶', recipe: ['kimja', 'greentea'], owner: 'kimja', color: '#c4cf5a', topping: 'cap', extra: '#fff4dc' },
  { id: 'cheesemilk', name: '起司牛奶', recipe: ['doa', 'milk'], owner: 'doa', color: '#fbf0c8', topping: 'cap', extra: '#f5c542' },
  { id: 'citrus', name: '柑橘綠茶', recipe: ['bboogyuli', 'greentea'], owner: 'bboogyuli', color: '#e9c24a', topping: 'fruit', extra: '#f39a2b' },
  { id: 'mint', name: '薄荷綠茶', recipe: ['nonver', 'greentea'], owner: 'nonver', color: '#a8e0b0', topping: 'leaf', extra: '#3f9a5c' },
  { id: 'seasalt', name: '海鹽紅茶', recipe: ['chandalee', 'blacktea'], owner: 'chandalee', color: '#b5562a', topping: 'cap', extra: '#eef6fa' },
];

/** 配方都對不上時做出來的（不進圖鑑） */
export const MYSTERY: Drink = { id: 'mystery', name: '神秘特調', recipe: ['', ''], color: '#8b7d9b', topping: 'layer', extra: '#5d4f6e' };
