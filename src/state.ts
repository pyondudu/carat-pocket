// 遊戲狀態與存檔（localStorage），含離線時間補算

import { getCharacter } from './data/characters';
import { applyElapsed, newPet, STAT_LABELS, type PetState, type PetStats } from './pet';

const SAVE_KEY = 'carat-pocket-save';
const VERSION = 4; // 2：加入飲料圖鑑 codex；3：加入本命特殊食物 specialFood；4：加入作客的夥伴 guest
/** 改過的角色 id：舊存檔讀進來時換成新的 */
const RENAMED_IDS: Record<string, string> = { shuasum: 'shuasumi' };

export interface GameState {
  version: number;
  mainId: string | null; // 主角
  unlocked: string[]; // 已解鎖的角色（含主角）
  pets: Record<string, PetState>; // 每個角色各自保存數值
  coins: number;
  food: number;
  /** 自動補食物的累積進度（0～1 個）；舊存檔沒有這個欄位 */
  foodProgress?: number;
  /** 飲料圖鑑：做過幾次、最好的品質（1～3） */
  codex: Record<string, { count: number; best: number }>;
  /** 持有的本命特殊食物數量 */
  specialFood: number;
  /** 來房間作客的夥伴；until 是回家的時間 */
  guest: { id: string; until: number } | null;
  lastSeen: number;
}

function freshState(): GameState {
  return { version: VERSION, mainId: null, unlocked: [], pets: {}, coins: 50, food: 20, codex: {}, specialFood: 0, guest: null, lastSeen: Date.now() };
}

export const state: GameState = load();

function load(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as GameState;
      if (data.version === 1) {
        // 版本 1 沒有圖鑑，補上空的，其他資料保留
        data.codex = {};
        data.version = 2;
      }
      if (data.version === 2) {
        // 版本 3：螺螄粉紅茶、火雞麵冰沙改成水蜜桃紅茶、藍莓優格奶綠，舊紀錄拿掉
        delete data.codex.luosifen;
        delete data.codex.buldak;
        data.specialFood = 0;
        data.version = 3;
      }
      if (data.version === 3) {
        data.guest = null;
        data.version = 4;
      }
      if (data.version === VERSION) return renameIds(data);
    }
  } catch {
    // 存檔壞掉或無法讀取就重新開始
  }
  return freshState();
}

function renameIds(data: GameState): GameState {
  for (const [from, to] of Object.entries(RENAMED_IDS)) {
    if (data.mainId === from) data.mainId = to;
    data.unlocked = data.unlocked.map((id) => (id === from ? to : id));
    if (data.pets[from]) {
      data.pets[to] = data.pets[from];
      delete data.pets[from];
    }
  }
  return data;
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

/** 自動補食物：每 4 小時 1 個，最多存到 3 個（避免沒食物又沒體力搖飲料時卡住） */
const FOOD_REGEN_HOURS = 4;
const FOOD_REGEN_CAP = 3;

/** 作客停留多久 */
export const GUEST_HOURS = 2;

/** 經過 ms 毫秒（到現在為止）：主角數值衰減＋自動補食物；有客人的那段時間心情掉一半 */
export function passTime(ms: number, now = Date.now()): void {
  const pet = mainPet();
  if (pet) {
    const withGuest = state.guest ? Math.min(ms, Math.max(0, state.guest.until - (now - ms))) : 0;
    applyElapsed(pet, withGuest, 0.5);
    applyElapsed(pet, ms - withGuest);
  }
  if (state.food >= FOOD_REGEN_CAP) {
    state.foodProgress = 0;
    return;
  }
  const total = (state.foodProgress ?? 0) + ms / 3_600_000 / FOOD_REGEN_HOURS;
  const gained = Math.floor(total);
  state.food = Math.min(FOOD_REGEN_CAP, state.food + gained);
  state.foodProgress = total - gained;
}

/** 把經過的時間套用到主角，回傳 [經過毫秒, 套用前數值] */
export function catchUp(now = Date.now()): { elapsed: number; before: PetStats; guestLeft: string | null } | null {
  const pet = mainPet();
  if (!pet) return null;
  const elapsed = Math.max(0, now - state.lastSeen);
  const before = { ...pet.stats };
  passTime(elapsed, now);
  state.lastSeen = now;
  return { elapsed, before, guestLeft: sendGuestHome(now) };
}

/** 客人時間到了就回家，回傳回家的是誰 */
export function sendGuestHome(now = Date.now()): string | null {
  if (!state.guest || state.guest.until > now) return null;
  const id = state.guest.id;
  state.guest = null;
  return id;
}

/** 「你不在的時候發生了…」訊息；離開不到 10 分鐘就不顯示 */
export function awayMessage(elapsed: number, before: PetStats, after: PetStats, guestLeft: string | null = null): string | null {
  if (elapsed < 10 * 60_000) return null;
  const mins = Math.round(elapsed / 60_000);
  const time = mins < 60 ? `${mins} 分鐘` : `${Math.floor(mins / 60)} 小時 ${mins % 60} 分鐘`;
  const lines = (Object.keys(STAT_LABELS) as (keyof PetStats)[])
    .map((k) => {
      const d = Math.round(after[k] - before[k]);
      return d === 0 ? null : `${STAT_LABELS[k]} ${d > 0 ? '+' : ''}${d}`;
    })
    .filter(Boolean);
  const guest = guestLeft ? `\n${getCharacter(guestLeft).name} 來玩過，已經回家了。` : '';
  return `你離開了 ${time}。\n${lines.join('、') || '一切都好～'}${guest}`;
}
