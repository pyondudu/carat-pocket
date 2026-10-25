// 應援的曲子：純資料＋把資料展開成音符的函式（不碰畫面、不碰聲音），之後手錶版照這份轉成 C 陣列
// 曲子是原創的；使用者 2026-10-25 指定參考 SEVENTEEN〈Very Nice〉的「感覺」，並給了鋼琴譜（參考資料/，不進 git）。
// 只取風格：降 A 大調、同音連打的喊聲式旋律；不抄原曲的音高和節奏。
// 編曲 2026-10-25 從銅管（使用者覺得老氣）改成 EDM：128 BPM、supersaw、主歌 pluck、副歌 sidechain 和弦、預備段 Build-up

export type Level = 'easy' | 'normal' | 'hard';
export const LEVELS: Level[] = ['easy', 'normal', 'hard'];
export const LEVEL_LABEL: Record<Level, string> = { easy: '簡單', normal: '普通', hard: '困難' };
export const LEVEL_NOTE: Record<Level, string> = { easy: '音符少，跟著重拍按', normal: '粉藍交替，跟著銅管按', hard: '切分音和快速交錯' };
/** 音符從軌道右邊流到判定圈的秒數：簡單慢一點比較好看清楚 */
export const LEVEL_TRAVEL: Record<Level, number> = { easy: 2, normal: 1.6, hard: 1.3 };

export type DrumStyle = 'intro' | 'verse' | 'build' | 'chorus' | 'chant' | 'end';

export interface Section {
  bars: number;
  /** 每小節一個和弦，空白分隔；「Bb/C」＝前半小節 Bb、後半 C */
  chords: string;
  /** 旋律：小節用 | 分隔，「A5:2」＝A5 長 2 個 16 分音符，「-:4」＝休息；小節數比 bars 少時從頭重複 */
  lead?: string;
  /** 撥弦和弦的位置（每小節 16 格，x＝短音、X＝拉長的厚和弦），小節用 | 分隔，不夠就重複 */
  pluck: string;
  drums: DrumStyle;
  /** 移調（半音） */
  transpose?: number;
  /** 連打：[段落內第幾小節, 第幾格, 長幾格]，三種難度共用 */
  rolls?: [number, number, number][];
  /** 譜面：每小節 16 格，p＝粉、b＝藍、.＝空，小節用 | 分隔，不夠就重複 */
  chart: Record<Level, string>;
}

export interface Song {
  id: string;
  title: string;
  bpm: number;
  sections: Section[];
}

// 一局約 30 秒（使用者 2026-10-25 選約 30 秒；原本 71 秒太長）：前奏 2 → 主歌 4 → 預備段 2 → 副歌 7 → 結尾 1，共 16 小節
// 副歌主題是「噠噠・噠・噠 噠—」的同音動機，每次跟著和弦往上移（使用者覺得第一版不夠吸引人，2026-10-25 重寫）
export const SONGS: Song[] = [
  {
    id: 'party',
    title: '克拉派對', // 暫定曲名，使用者可以改
    bpm: 128,
    sections: [
      {
        // 前奏：先露一下副歌主題，pluck 在反拍
        bars: 2,
        chords: 'Ab Eb',
        lead: 'Ab5:1 Ab5:1 -:1 Ab5:1 -:1 Ab5:1 Bb5:2 C6:4 -:4|-:16',
        pluck: '..x...x...x...x.|..x...x...x.x.x.',
        drums: 'intro',
        chart: {
          easy: 'p.......p.......|p...b...p...b...',
          normal: 'p..b.bp.p...b.b.|p...b...p...b.b.',
          hard: 'pp.b.bp.p...b.bb|p.b.b.p.p.b.bbbb',
        },
      },
      {
        // 主歌：低一點、像在念的同音節奏，pluck 和弦用 3-3-2 切分
        bars: 4,
        chords: 'Ab Fm Db Eb',
        lead: 'Eb5:1 Eb5:1 Eb5:1 -:1 C5:2 Eb5:2 F5:1 Eb5:1 C5:2 Ab4:4|C5:1 C5:1 C5:1 -:1 Ab4:2 C5:2 Db5:1 C5:1 Ab4:2 F4:4|F5:1 F5:1 F5:1 -:1 Db5:2 F5:2 Ab5:2 F5:2 Eb5:2 Db5:2|Eb5:2 -:2 Eb5:2 G5:2 Bb5:4 -:4',
        pluck: 'x..x..x...x..x..',
        drums: 'verse',
        chart: {
          easy: 'p.......b.......',
          normal: 'p...b.p.p...b...|p...b.p.p...b...|p.p.b.b.p.b.p.b.|p...b.p.b...b...',
          hard: 'ppp.b.b.pbb.p...|ppp.b.b.pbb.p...|ppp.b.b.p.b.p.b.|p...b.p.b.b.bbbb',
        },
      },
      {
        // 預備段（Build-up）：一路爬上去、riser 往上掃，第二小節後半連打，其他樂器抽掉
        bars: 2,
        chords: 'Fm Eb',
        lead: 'C5:2 Eb5:2 F5:2 Ab5:2 C6:2 Eb6:2 F6:4|G6:4 -:12',
        pluck: 'x.x.x.x.x.x.x.x.|x.x.............',
        drums: 'build',
        rolls: [[1, 4, 8]],
        chart: {
          easy: 'p...p...p...p...|p...............',
          normal: 'p.b.p.b.p.b.p...|p...............',
          hard: 'p.b.p.b.p.b.pbpb|p...............',
        },
      },
      {
        // 副歌（Drop）：同音動機 Db → Eb → Cm → Fm，再來一次後收在 Db/Eb；supersaw 和弦跟著大鼓吸
        bars: 7,
        chords: 'Db Eb Cm Fm Db Eb Db/Eb',
        lead:
          'Ab5:1 Ab5:1 -:1 Ab5:1 -:1 Ab5:1 Bb5:2 C6:2 Bb5:1 Ab5:1 -:2 Eb5:2|G5:1 G5:1 -:1 G5:1 -:1 G5:1 Ab5:2 Bb5:4 -:2 Eb6:2|Eb6:1 Eb6:1 -:1 Eb6:1 -:1 Eb6:1 F6:2 Eb6:2 C6:2 Bb5:2 C6:2|Ab5:3 G5:1 Ab5:2 C6:2 -:2 Bb5:2 Ab5:2 G5:2|' +
          'Ab5:1 Ab5:1 -:1 Ab5:1 -:1 Ab5:1 Bb5:2 C6:2 Bb5:1 Ab5:1 -:2 Eb5:2|G5:1 G5:1 -:1 G5:1 -:1 G5:1 Ab5:2 Bb5:4 -:2 Eb6:2|Eb6:1 Eb6:1 -:1 Eb6:1 -:1 F6:1 Eb6:2 Db6:2 C6:2 Bb5:2 Eb6:2',
        pluck: '',
        drums: 'chorus',
        chart: {
          easy: 'p...b...p...b...',
          normal: 'p..b.b..p.b...b.|p..b.bp.p.....b.|p..b.b..p.b...b.|p..bp.b...b.p.b.',
          hard: 'pp.b.bp.p.bb..b.|pp.b.bp.p...p.b.|pp.b.bp.p.bb..b.|p..bp.b.b.b.pbb.',
        },
      },
      {
        // 結尾：最後一聲
        bars: 1,
        chords: 'Ab',
        lead: 'Ab5:8 -:8',
        pluck: 'X...............',
        drums: 'end',
        chart: { easy: 'p...............', normal: 'p...............', hard: 'p...............' },
      },
    ],
  },
];

// ---- 展開 ----

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface Chord {
  root: number; // 0～11（C＝0）
  minor: boolean;
  seventh: boolean;
}

function parseChord(s: string, transpose: number): Chord {
  const m = /^([A-G])([b#]?)(m?)(7?)$/.exec(s);
  if (!m) throw new Error(`看不懂的和弦：${s}`);
  const root = (NAMES[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + transpose + 24) % 12;
  return { root, minor: m[3] === 'm', seventh: m[4] === '7' };
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

export function songBars(song: Song): Bar[] {
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
