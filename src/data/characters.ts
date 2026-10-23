// 13 個 MINITEEN 角色資料（整理自 參考資料/miniteen/ 的介紹頁）
// ingredient：搖飲料時的專屬原料（暫定）；unlockCoins：當夥伴時的解鎖金幣（暫定）

/** 佔位圖用的外型：決定耳朵/頭頂畫法，之後換成 sprite 就不需要 */
export type Shape = 'longEars' | 'pointyEars' | 'roundEars' | 'leaf' | 'tuft' | 'fluffy' | 'frog' | 'stack';

export interface Character {
  id: string;
  name: string;
  nameKo: string;
  member: string;
  animal: string;
  shape: Shape;
  color: string; // 主色
  accent: string; // 肚子/臉
  favoriteFood: string;
  mbti?: string;
  hobby?: string;
  /** 介紹頁上其他資訊，例如討厭的食物、喜歡的歌 */
  extra?: string;
  ingredient: string;
  unlockCoins: number;
}

export const CHARACTERS: Character[] = [
  {
    id: 'choitcherry', name: 'CHOITCHERRY', nameKo: '쵯체리', member: 'S.COUPS', animal: '兔子',
    shape: 'longEars', color: '#f4f2ef', accent: '#b0263a',
    favoriteFood: '生拌牛肉、香煎鮭魚排', mbti: 'ISFJ', hobby: '躺著一整天',
    ingredient: '櫻桃', unlockCoins: 300,
  },
  {
    id: 'jjongtoram', name: 'JJONGTORAM', nameKo: '쫑토람', member: 'JEONGHAN', animal: '天使兔裝寶寶',
    shape: 'longEars', color: '#f5b1c0', accent: '#fdeee0',
    favoriteFood: '部隊鍋', mbti: 'LOVE', hobby: '兜風、看海',
    ingredient: '草莓', unlockCoins: 300,
  },
  {
    id: 'shuasum', name: 'SHUASUM', nameKo: '샤슴이', member: 'JOSHUA', animal: '小鹿',
    shape: 'pointyEars', color: '#f6b77f', accent: '#fdf0cf',
    favoriteFood: '牛排、香草冰淇淋、柳橙', mbti: 'ENFJ', hobby: '烹飪、散步、滑雪、游泳、衝浪、調製香水',
    ingredient: '香草冰淇淋', unlockCoins: 300,
  },
  {
    id: 'ocl', name: 'O.C.L', nameKo: '문열어, 문닫아, 문잠가', member: 'JUN', animal: '三隻疊疊貓',
    shape: 'stack', color: '#c4c4c6', accent: '#f6f6f6',
    favoriteFood: '橘子、檸檬、桃子', hobby: '運動、讀書、吃火鍋',
    ingredient: '水蜜桃', unlockCoins: 300,
  },
  {
    id: 'tamtam', name: 'TAMTAM', nameKo: '탐탐', member: 'HOSHI', animal: '老虎',
    shape: 'roundEars', color: '#fbe07a', accent: '#8a6a52',
    favoriteFood: '泡菜、來自克拉的愛', mbti: 'INFP', hobby: '玩一二三木頭人',
    ingredient: '蜂蜜', unlockCoins: 300,
  },
  {
    id: 'foxdungee', name: 'FOXDUNGEE', nameKo: '폭덩이', member: 'WONWOO', animal: '狐狸',
    shape: 'pointyEars', color: '#b199c9', accent: '#ffffff',
    favoriteFood: '辣炒年糕', mbti: 'ROCK', hobby: '攝影、玩遊戲',
    ingredient: '葡萄', unlockCoins: 300,
  },
  {
    id: 'ppyopuli', name: 'PPYOPULI', nameKo: '뾰풀이', member: 'WOOZI', animal: '白飯糰',
    shape: 'fluffy', color: '#ffffff', accent: '#f7c9cf',
    favoriteFood: '紫菜', mbti: 'INFJ', hobby: '染頭髮',
    ingredient: '米漿', unlockCoins: 300,
  },
  {
    id: 'thepalee', name: 'THEpalee', nameKo: '디팔이', member: 'THE8', animal: '青蛙',
    shape: 'frog', color: '#9fcf6a', accent: '#ffffff',
    favoriteFood: '中國菜', mbti: 'IIFF', hobby: '畫畫、冥想、茶道',
    ingredient: '綠茶', unlockCoins: 300,
  },
  {
    id: 'kimja', name: 'KIMJA', nameKo: '김자', member: 'MINGYU', animal: '馬鈴薯',
    shape: 'tuft', color: '#e5bf7a', accent: '#c0894f',
    favoriteFood: '洋芋片', mbti: 'ENFJ',
    ingredient: '焦糖', unlockCoins: 300,
  },
  {
    id: 'doa', name: 'DOA', nameKo: '도아', member: 'DK', animal: '貴賓狗',
    shape: 'fluffy', color: '#f3dfbd', accent: '#f6a8b4',
    favoriteFood: '披薩', extra: '討厭的食物：茄子、香菜、芹菜｜喜歡的歌曲：HUG',
    ingredient: '鮮奶油', unlockCoins: 300,
  },
  {
    id: 'bboogyuli', name: 'BBOOGYULI', nameKo: '뿌귤이', member: 'SEUNGKWAN', animal: '橘子',
    shape: 'leaf', color: '#f6a84f', accent: '#4caf50',
    favoriteFood: '咖啡', hobby: '打羽毛球', extra: '討厭的食物：番茄、黃瓜',
    ingredient: '橘子', unlockCoins: 300,
  },
  {
    id: 'nonver', name: 'NONVER', nameKo: '논버', member: 'VERNON', animal: '熊帽 T 男孩',
    shape: 'roundEars', color: '#c5c5c8', accent: '#fde9d9',
    favoriteFood: '番茄燉蛋', hobby: '玩耍', extra: '討厭的事情：睡眠不足',
    ingredient: '蘇打', unlockCoins: 300,
  },
  {
    id: 'chandalee', name: 'CHANDALEE', nameKo: '찬달이', member: 'DINO', animal: '水獺',
    shape: 'roundEars', color: '#d4a582', accent: '#ffffff',
    favoriteFood: '馬鈴薯排骨湯', mbti: 'INFJ', hobby: '運動',
    ingredient: '巧克力', unlockCoins: 300,
  },
];

export function getCharacter(id: string): Character {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) throw new Error(`未知角色：${id}`);
  return c;
}
