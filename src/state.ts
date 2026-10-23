// 遊戲狀態與存檔（localStorage），含離線時間補算

import { applyElapsed, newPet, STAT_LABELS, type PetState, type PetStats } from './pet';

const SAVE_KEY = 'carat-pocket-save';
const VERSION = 1;

export interface GameState {
  version: number;
  mainId: string | null; // 主角
  unlocked: string[]; // 已解鎖的角色（含主角）
  pets: Record<string, PetState>; // 每個角色各自保存數值
  coins: number;
  food: number;
  lastSeen: number;
}

function freshState(): GameState {
  return { version: VERSION, mainId: null, unlocked: [], pets: {}, coins: 50, food: 5, lastSeen: Date.now() };
}

export const state: GameState = load();

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as GameState;
      if (data.version === VERSION) return data;
    }
  } catch {
    // 存檔壞掉或無法讀取就重新開始
  }
  return freshState();
}

export function save(): void {
  state.lastSeen = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // 私密模式等情況寫不進去，忽略
  }
}

export function resetSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // 忽略
  }
  Object.assign(state, freshState());
}

export function mainPet(): PetState | null {
  return state.mainId ? state.pets[state.mainId] : null;
}

/** 選定主角；第一次選的角色自動解鎖 */
export function chooseMain(id: string): void {
  state.mainId = id;
  if (!state.unlocked.includes(id)) state.unlocked.push(id);
  state.pets[id] ??= newPet();
  save();
}

/** 把經過的時間套用到主角，回傳 [經過毫秒, 套用前數值] */
export function catchUp(now = Date.now()): { elapsed: number; before: PetStats } | null {
  const pet = mainPet();
  if (!pet) return null;
  const elapsed = Math.max(0, now - state.lastSeen);
  const before = { ...pet.stats };
  applyElapsed(pet, elapsed);
  state.lastSeen = now;
  return { elapsed, before };
}

/** 「你不在的時候發生了…」訊息；離開不到 10 分鐘就不顯示 */
export function awayMessage(elapsed: number, before: PetStats, after: PetStats): string | null {
  if (elapsed < 10 * 60_000) return null;
  const mins = Math.round(elapsed / 60_000);
  const time = mins < 60 ? `${mins} 分鐘` : `${Math.floor(mins / 60)} 小時 ${mins % 60} 分鐘`;
  const lines = (Object.keys(STAT_LABELS) as (keyof PetStats)[])
    .map((k) => {
      const d = Math.round(after[k] - before[k]);
      return d === 0 ? null : `${STAT_LABELS[k]} ${d > 0 ? '+' : ''}${d}`;
    })
    .filter(Boolean);
  return `你離開了 ${time}。\n${lines.join('、') || '一切都好～'}`;
}
