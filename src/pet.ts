// 寵物數值：0～100，依真實經過時間衰減

export interface PetStats {
  hunger: number; // 飽足
  mood: number; // 心情
  clean: number; // 清潔
  energy: number; // 體力
}

export interface PetState {
  stats: PetStats;
  sleeping: boolean;
}

export type Mood = 'happy' | 'sad' | 'sick' | 'sleep';

export const STAT_LABELS: Record<keyof PetStats, string> = {
  hunger: '飽足',
  mood: '心情',
  clean: '清潔',
  energy: '體力',
};

/** 每小時變化量 */
const DECAY_PER_HOUR: PetStats = { hunger: -8, mood: -6, clean: -4, energy: -5 };
const SLEEP_ENERGY_PER_HOUR = 50;

export function newPet(): PetState {
  return { stats: { hunger: 80, mood: 80, clean: 80, energy: 80 }, sleeping: false };
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** 依經過的毫秒數更新數值（直接修改 pet） */
export function applyElapsed(pet: PetState, ms: number): void {
  const h = ms / 3_600_000;
  const s = pet.stats;
  s.hunger = clamp(s.hunger + DECAY_PER_HOUR.hunger * h);
  s.mood = clamp(s.mood + DECAY_PER_HOUR.mood * h);
  s.clean = clamp(s.clean + DECAY_PER_HOUR.clean * h);
  s.energy = clamp(s.energy + (pet.sleeping ? SLEEP_ENERGY_PER_HOUR : DECAY_PER_HOUR.energy) * h);
  // 睡飽自動起床
  if (pet.sleeping && s.energy >= 100) pet.sleeping = false;
}

export function moodOf(pet: PetState): Mood {
  if (pet.sleeping) return 'sleep';
  const min = Math.min(...Object.values(pet.stats));
  if (min < 15) return 'sick';
  if (min < 40) return 'sad';
  return 'happy';
}

export type Action = 'feed' | 'play' | 'clean' | 'sleep';

/** 本命特殊食物：飽足 +40、心情 +30 */
export function feedSpecial(pet: PetState): void {
  pet.stats.hunger = clamp(pet.stats.hunger + 40);
  pet.stats.mood = clamp(pet.stats.mood + 30);
}

const SHAKE_ENERGY = 10;

/** 能不能搖飲料；不能的話回傳原因 */
export function shakeBlocked(pet: PetState): string | null {
  if (pet.sleeping) return '噓…正在睡覺，起床再來搖吧';
  if (pet.stats.energy < SHAKE_ENERGY) return '太累了，先睡一下再來搖吧';
  return null;
}

/** 邀請朋友來玩：心情 +20、體力 −15（使用者 2026-10-24 決定：朋友來很開心，但陪玩會累） */
export const INVITE_MOOD = 20;
export const INVITE_ENERGY = 15;

export function applyInvite(pet: PetState): void {
  pet.stats.mood = clamp(pet.stats.mood + INVITE_MOOD);
  pet.stats.energy = clamp(pet.stats.energy - INVITE_ENERGY);
}

/** 搖完一杯：體力 −10、心情 +5 */
export function applyShake(pet: PetState): void {
  pet.stats.energy = clamp(pet.stats.energy - SHAKE_ENERGY);
  pet.stats.mood = clamp(pet.stats.mood + 5);
}

/** 節奏應援：比手搖飲累但更開心，體力 −20、心情 +10（使用者 2026-10-26 決定） */
export const RHYTHM_ENERGY = 20;
export const RHYTHM_MOOD = 10;

/** 能不能玩節奏應援；不能的話回傳原因 */
export function rhythmBlocked(pet: PetState): string | null {
  if (pet.sleeping) return '噓…正在睡覺，起床再來應援吧';
  if (pet.stats.energy < RHYTHM_ENERGY) return '太累了，先睡一下再來應援吧';
  return null;
}

export function applyRhythm(pet: PetState): void {
  pet.stats.energy = clamp(pet.stats.energy - RHYTHM_ENERGY);
  pet.stats.mood = clamp(pet.stats.mood + RHYTHM_MOOD);
}

/** 執行動作，回傳要顯示的訊息 */
export function doAction(pet: PetState, action: Action): string {
  const s = pet.stats;
  if (pet.sleeping && action !== 'sleep') return '噓…正在睡覺';
  switch (action) {
    case 'feed':
      s.hunger = clamp(s.hunger + 30);
      return '好好吃！';
    case 'play':
      if (s.energy < 10) return '太累了，玩不動…';
      s.mood = clamp(s.mood + 25);
      s.energy = clamp(s.energy - 10);
      s.hunger = clamp(s.hunger - 5);
      return '好開心！';
    case 'clean':
      s.clean = 100;
      return '洗得香香的～';
    case 'sleep':
      pet.sleeping = !pet.sleeping;
      return pet.sleeping ? '晚安 zZ' : '起床囉！';
  }
}
