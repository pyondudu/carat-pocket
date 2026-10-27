// 應援的曲子：純資料＋把資料展開成音符的函式（不碰畫面、不碰聲音），之後手錶版照這份轉成 C 陣列
// 2026-10-27 起正式曲改用音檔〈To Be Free〉（Nck），程式合成的「克拉派對」留著當音檔載入失敗時的備用
// 曲子是原創的。2026-10-25 經過幾版：銅管＋方波（使用者覺得老氣）→ 編曲改 EDM → 旋律也嫌老氣，使用者說不用再參考〈Very Nice〉樂譜，
// 改照現在 EDM／K-pop 的寫法：小調、四和弦循環加 7／9 度、旋律只用小調五聲音階、副歌是「人聲切片」風格的短音切分＋八度跳躍

export type Level = 'easy' | 'normal' | 'hard';
export const LEVELS: Level[] = ['easy', 'normal', 'hard'];
export const LEVEL_LABEL: Record<Level, string> = { easy: '簡單', normal: '普通', hard: '困難' };
export const LEVEL_NOTE: Record<Level, string> = { easy: '音符少，跟著重拍按', normal: '一拍一個，偶爾連兩下', hard: '跟著旋律，快速交錯' };
/** 音符從軌道右邊流到判定圈的秒數：簡單慢一點比較好看清楚
 *  普通只用八分音符的位置、約 60 個音符（2026-10-25 使用者覺得普通比簡單難太多，原本 87 個還有十六分音符） */
export const LEVEL_TRAVEL: Record<Level, number> = { easy: 2, normal: 1.8, hard: 1.3 };

export type DrumStyle = 'intro' | 'verse' | 'build' | 'chorus' | 'chant' | 'end';

/** 譜面段落：音檔曲子只需要這些 */
export interface ChartSection {
  bars: number;
  /** 連打：[段落內第幾小節, 第幾格, 長幾格]，三種難度共用 */
  rolls?: [number, number, number][];
  /** 譜面：每小節 16 格，p＝粉、b＝藍、.＝空，小節用 | 分隔，不夠就重複 */
  chart: Record<Level, string>;
}

/** 程式合成曲子的段落：多了和弦、旋律、鼓 */
export interface Section extends ChartSection {
  /** 每小節一個和弦，空白分隔；「Bb/C」＝前半小節 Bb、後半 C */
  chords: string;
  /** 旋律：小節用 | 分隔，「A5:2」＝A5 長 2 個 16 分音符，「-:4」＝休息；小節數比 bars 少時從頭重複 */
  lead?: string;
  /** 撥弦和弦的位置（每小節 16 格，x＝短音、X＝拉長的厚和弦），小節用 | 分隔，不夠就重複 */
  pluck: string;
  drums: DrumStyle;
  /** 移調（半音） */
  transpose?: number;
}

export interface Song {
  id: string;
  title: string;
  bpm: number;
  sections: ChartSection[];
  /** 音檔曲子：src 相對網站根目錄，offset＝第一拍在檔案裡的秒數 */
  audio?: { src: string; offset: number };
}

export interface SynthSong extends Song {
  sections: Section[];
}

// 〈To Be Free〉by Nck 的 0:00～0:31（public/music/to-be-free.mp3），124 BPM、4/4、G 小調 house
// 授權：BreakingCopyright「Free To Use YouTube license」，使用者 2026-10-27 確認可以用在遊戲；要署名（rhythm.ts 說明視窗、intro.ts 玩法說明）
// 結構是 2026-10-27 用 onset 分析出來的：第 1 小節前奏漸強；第 2～9 小節主歌，切分和弦落在每小節第 2、4、8、11、14 格，
// 第 9 小節往副歌堆（後半放連打）；第 10～16 小節副歌，四拍大鼓＋反拍
export const TO_BE_FREE: Song = {
  id: 'tobefree',
  title: 'To Be Free',
  bpm: 124,
  audio: { src: 'music/to-be-free.mp3', offset: 0.115 },
  sections: [
    {
      // 前奏：聲音漸強，最後半小節才開始
      bars: 1,
      chart: {
        easy: '........p.......',
        normal: '........p.......',
        hard: '........p...b...',
      },
    },
    {
      // 主歌：跟著切分和弦；最後一小節後半連打，接副歌
      bars: 8,
      rolls: [[7, 6, 6]],
      chart: {
        easy: '....p...b.....p.|....b...p.....b.|....p...b.....p.|....b...p.....b.|....p...b.....p.|....b...p.....b.|....p...b.....p.|....p...........',
        normal: '..p.b...p.....b.|..b.p...b.....p.|..p.b...p.....b.|..b.p...b.....p.|..p.b...p.....b.|..b.p...b.....p.|..p.b...p.....b.|..p.b...........',
        hard: 'p.b.p...b..p..b.|b.p.b...p..b..p.|p.b.p...b..p..b.|b.p.b...p..b..p.|p.b.p...b..p..b.|b.p.b...p..b..p.|p.b.p...b..p..b.|p.b.p...........',
      },
    },
    {
      // 副歌：大鼓四拍＋反拍
      bars: 7,
      chart: {
        easy: 'p...b...p...b...',
        normal: 'p...b.b.p...b...|p...b...p.b.b...',
        hard: 'p.b.p...p.b.p.b.|p.b.p.b.p.b.b...',
      },
    },
  ],
};


// 一局約 30 秒（使用者 2026-10-25 選的）：前奏 2 → Drop A 6 → Build-up 2 → Drop B 5 → 結尾 1，共 16 小節
// 使用者只喜歡 Drop（副歌），前面的傳統主歌、往上爬的音階都嫌老氣，所以整首都用 Drop 的切片主題，不放傳統主歌
// F 小調，和弦循環 Fm9 → Dbmaj7 → Ab(add9) → Eb；難度：簡單 OK，普通只用八分音符位置（使用者覺得原本普通跳太難）
const HOOK = ['F5:1 -:2 Ab5:1 -:2 C6:2 Eb6:1 -:1 C6:1 Bb5:1 -:2 Ab5:2', 'F6:1 -:2 Eb6:1 -:2 C6:2 Bb5:1 -:1 Ab5:1 Bb5:1 -:2 C6:2', 'F5:1 -:2 Ab5:1 -:2 C6:2 Eb6:1 -:1 F6:1 Ab6:1 -:2 F6:2', 'Eb6:2 -:1 C6:2 -:1 Bb5:2 -:4 C6:1 Eb6:1 -:2'];

export const PARTY: SynthSong = {
  id: 'party',
  title: '克拉派對', // 暫定曲名，使用者可以改
  bpm: 128,
  sections: [
    {
      // 前奏：主題先「悶著」放一次（濾波關小），像隔著牆聽到
      bars: 2,
      chords: 'Fm9 Dbmaj7',
      lead: `${HOOK[0]}|${HOOK[1]}`,
      pluck: '',
      drums: 'intro',
      chart: {
        easy: 'p.......p.......|p...b...p...b...',
        normal: 'p...b...p...b...|p...b...p.b...b.',
        hard: 'p..b..p.p.bp..b.|p..b..p.p.bp..b.',
      },
    },
    {
      // Drop A：人聲切片風格的短音主題，3-3-2 切分、八度跳躍；supersaw 和弦跟著大鼓吸
      bars: 6,
      chords: 'Fm9 Dbmaj7 Abadd9 Eb Fm9 Dbmaj7',
      lead: HOOK.join('|'),
      pluck: '',
      drums: 'chorus',
      chart: {
        easy: 'p...b...p...b...|p.......b.......',
        normal: 'p...b...p.b...b.|p...b...p.b...b.|p...b...p.b...b.|p.....b.....b...',
        hard: 'p..b..p.p.bp..b.|p..b..p.p.bp..b.|p..b..p.p.bp..b.|p..b..p.....bb..',
      },
    },
    {
      // Build-up：同一個音的切片越打越快（八分 → 十六分）、riser 往上掃，第二小節後半連打，其他樂器抽掉
      bars: 2,
      chords: 'Dbmaj7 Eb',
      lead: 'C6:2 C6:2 C6:2 C6:2 Eb6:1 Eb6:1 Eb6:1 Eb6:1 F6:1 F6:1 F6:1 F6:1|F6:4 -:12',
      pluck: '',
      drums: 'build',
      rolls: [[1, 4, 8]],
      chart: {
        easy: 'p...p...p...p...|p...............',
        normal: 'p.p.p.p.b.b.b.b.|p...............',
        hard: 'p.p.p.p.bbbbbbbb|p...............',
      },
    },
    {
      // Drop B：從較高的變奏開始，最後收在 Dbmaj7/Eb 準備回主和弦
      bars: 5,
      chords: 'Abadd9 Eb Fm9 Dbmaj7 Dbmaj7/Eb',
      lead: `${HOOK[2]}|${HOOK[3]}|${HOOK[0]}|${HOOK[1]}|F6:1 -:2 Eb6:1 -:2 C6:2 Eb6:2 F6:4 -:2`,
      pluck: '',
      drums: 'chorus',
      chart: {
        easy: 'p...b...p...b...|p.......b.......',
        normal: 'p...b...p.b...b.|p.....b.....b...|p...b...p.b...b.|p...b...p.b...b.|p...b...p.b.....',
        hard: 'p..b..p.p.bp..b.|p..b..p.....bb..|p..b..p.p.bp..b.|p..b..p.p.bp..b.|p..b..p.p.b.p...',
      },
    },
    {
      // 結尾：最後一聲
      bars: 1,
      chords: 'Fm9',
      lead: 'F6:8 -:8',
      pluck: 'X...............',
      drums: 'end',
      chart: { easy: 'p...............', normal: 'p...............', hard: 'p...............' },
    },
  ],
};

export const SONGS: Song[] = [TO_BE_FREE, PARTY];

// ---- 展開 ----

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface Chord {
  root: number; // 0～11（C＝0）
  minor: boolean;
  /** 延伸音：7＝小七度、maj7＝大七度、9＝小七度＋九度、add9＝只加九度 */
  ext: '' | '7' | 'maj7' | '9' | 'add9';
}

function parseChord(s: string, transpose: number): Chord {
  const m = /^([A-G])([b#]?)(m?)(maj7|7|9|add9)?$/.exec(s);
  if (!m) throw new Error(`看不懂的和弦：${s}`);
  const root = (NAMES[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + transpose + 24) % 12;
  return { root, minor: m[3] === 'm', ext: (m[4] ?? '') as Chord['ext'] };
}

/** 音名 → MIDI 音高（C4＝60） */
function parsePitch(s: string): number {
  const m = /^([A-G])([b#]?)(\d)$/.exec(s);
  if (!m) throw new Error(`看不懂的音：${s}`);
  return NAMES[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + (Number(m[3]) + 1) * 12;
}

const cycle = (s: string, i: number) => {
  const parts = s.split('|');
  return parts[i % parts.length];
};

export interface LeadNote {
  step: number; // 小節內第幾格
  len: number; // 幾格
  midi: number;
}

/** 一個小節展開後的內容（給 music.ts 排聲音） */
export interface Bar {
  section: Section;
  inSection: number; // 段落內第幾小節
  first: boolean; // 段落的第一小節
  chords: [Chord, Chord]; // 前半、後半小節
  lead: LeadNote[];
  last: boolean; // 段落的最後一小節（加鼓的過門）
  pluck: string;
  rolls: [number, number][]; // 這小節裡的連打 [第幾格, 長幾格]
}

export function songBars(song: SynthSong): Bar[] {
  const bars: Bar[] = [];
  for (const sec of song.sections) {
    const tp = sec.transpose ?? 0;
    const chordNames = sec.chords.split(' ');
    for (let i = 0; i < sec.bars; i++) {
      const [a, b = a] = chordNames[i % chordNames.length].split('/');
      const lead: LeadNote[] = [];
      if (sec.lead) {
        let step = 0;
        for (const tok of cycle(sec.lead, i).trim().split(/\s+/)) {
          const [p, l] = tok.split(':');
          const len = Number(l);
          if (p !== '-') lead.push({ step, len, midi: parsePitch(p) + tp });
          step += len;
        }
        if (step !== 16) console.warn(`旋律第 ${bars.length + 1} 小節長度是 ${step} 格，不是 16`);
      }
      bars.push({
        section: sec,
        inSection: i,
        first: i === 0,
        chords: [parseChord(a, tp), parseChord(b, tp)],
        lead,
        last: i === sec.bars - 1,
        pluck: cycle(sec.pluck, i),
        rolls: (sec.rolls ?? []).filter(([bar]) => bar === i).map(([, s, n]) => [s, n]),
      });
    }
  }
  return bars;
}

export interface ChartNote {
  step: number; // 從第一拍算第幾格（16 分音符）
  color: 'pink' | 'blue' | 'roll';
  steps?: number; // 連打長幾格
}

/** 連打結束後空一拍（4 格）才接下一個音符，不然來不及從狂按切回看顏色（使用者 2026-10-25 回報） */
const ROLL_GAP = 4;

/** 把譜面展開成音符；連打期間和連打後一拍內的音符會拿掉 */
export function expandChart(song: Song, level: Level): ChartNote[] {
  const notes: ChartNote[] = [];
  const blocked: [number, number][] = [];
  let base = 0;
  for (const sec of song.sections) {
    for (let i = 0; i < sec.bars; i++) {
      const row = cycle(sec.chart[level], i);
      if (row.length !== 16) console.warn(`譜面（${level}）第 ${base / 16 + 1} 小節是 ${row.length} 格，不是 16`);
      [...row].forEach((ch, s) => {
        if (ch === 'p') notes.push({ step: base + s, color: 'pink' });
        if (ch === 'b') notes.push({ step: base + s, color: 'blue' });
      });
      for (const [bar, s, n] of sec.rolls ?? []) {
        if (bar !== i) continue;
        notes.push({ step: base + s, color: 'roll', steps: n });
        blocked.push([base + s, base + s + n + ROLL_GAP]);
      }
      base += 16;
    }
  }
  return notes
    .filter((n) => n.color === 'roll' || !blocked.some(([a, b]) => n.step >= a && n.step < b))
    .sort((a, b) => a.step - b.step);
}

export const totalBars = (song: Song) => song.sections.reduce((n, s) => n + s.bars, 0);
