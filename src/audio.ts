// 應援用的電子音樂合成器（Web Audio）＋音檔播放（2026-10-27 起正式曲是音檔）；所有聲音都排在 AudioContext 的時間上，跟音符共用同一個時鐘
// 2026-10-25 從銅管＋方波（使用者覺得老氣）改成 EDM：supersaw、pluck、sidechain 和弦、riser

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let echo: GainNode | null = null; // 主旋律的回音（送到延遲線）

/** 取得（必要時建立）AudioContext；手機規定要在使用者按下按鈕時才能開始出聲 */
export function audio(): AudioContext {
  if (!ac) {
    ac = new AudioContext();
    master = ac.createGain();
    master.gain.value = 0.7;
    // 總輸出接壓縮器：大鼓、低音、和弦疊起來不會破音，整體也比較緊
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;
    master.connect(comp).connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 回音：延遲約一個附點八分音符，回授 0.28
    echo = ac.createGain();
    echo.gain.value = 0.3;
    const delay = ac.createDelay(1);
    delay.delayTime.value = 0.37;
    const fb = ac.createGain();
    fb.gain.value = 0.28;
    echo.connect(delay).connect(fb).connect(delay);
    delay.connect(master);
  }
  if (ac.state === 'suspended') void ac.resume();
  return ac;
}

const tracks = new Map<string, Promise<AudioBuffer>>();

/** 下載並解碼音檔（同一個檔案只抓一次）；還沒按按鈕前也可以先解碼 */
export function loadTrack(url: string): Promise<AudioBuffer> {
  let p = tracks.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`音檔下載失敗：${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => audio().decodeAudioData(buf));
    p.catch(() => tracks.delete(url)); // 失敗的話下次重抓
    tracks.set(url, p);
  }
  return p;
}

/** 在音訊時間 at 播放音檔：從檔案的 offset 秒開始、播 dur 秒，最後 0.5 秒淡出；回傳停止的函式
 *  成品音樂直接接到輸出，不經過合成器用的壓縮器 */
export function playTrack(buf: AudioBuffer, at: number, offset: number, dur: number): () => void {
  const c = audio();
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  g.gain.value = 0.9;
  const fade = 0.5;
  g.gain.setValueAtTime(0.9, at + dur - fade);
  g.gain.linearRampToValueAtTime(0.0001, at + dur);
  src.connect(g).connect(c.destination);
  // 第一拍之前還有一點聲音（offset 秒）就一起播，所以提早 offset 秒開始
  const start = at - offset;
  if (start >= c.currentTime) src.start(start, 0, dur + offset);
  else src.start(c.currentTime, c.currentTime - start, dur + offset - (c.currentTime - start));
  return () => {
    try {
      src.stop();
    } catch {
      // 已經停了
    }
  };
}

/** 現在的音訊時間（秒），扣掉輸出延遲，讓畫面對到耳朵聽到的時間 */
export function heardTime(): number {
  if (!ac) return 0;
  return ac.currentTime - (ac.outputLatency || ac.baseLatency || 0);
}

function env(t: number, peak: number, decay: number): GainNode {
  const g = ac!.createGain();
  g.gain.setValueAtTime(peak, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  g.connect(master!);
  return g;
}

function noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number): void {
  const src = ac!.createBufferSource();
  src.buffer = noise;
  const f = ac!.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  src.connect(f).connect(env(t, peak, decay));
  src.start(t);
  src.stop(t + decay);
}

/** 大鼓：電子鼓，低沉的尾音＋起頭一點點「喀」 */
export function kick(t: number, peak = 0.9): void {
  const o = ac!.createOscillator();
  o.frequency.setValueAtTime(190, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
  o.connect(env(t, peak, 0.34));
  o.start(t);
  o.stop(t + 0.35);
  noiseHit(t, 'highpass', 3000, peak * 0.25, 0.012);
}

/** 小鼓 */
export function snare(t: number, peak = 0.45): void {
  noiseHit(t, 'highpass', 1200, peak, 0.13);
  tone(t, 190, 0.06, 'triangle', peak * 0.5);
}

/** 腳踏鈸 */
export function hat(t: number, peak = 0.12): void {
  noiseHit(t, 'highpass', 7000, peak, 0.04);
}

/** 單音：方波／三角波，dur 秒 */
export function tone(t: number, freq: number, dur: number, type: OscillatorType = 'square', peak = 0.08): void {
  const o = ac!.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.connect(env(t, peak, dur));
  o.start(t);
  o.stop(t + dur + 0.01);
}

/** 拍手：三下很快的雜訊疊在一起 */
export function clap(t: number, peak = 0.35): void {
  for (const d of [0, 0.011, 0.022]) noiseHit(t + d, 'bandpass', 1500, peak, d === 0.022 ? 0.12 : 0.02);
}

/** 開放的鈸（比腳踏鈸長） */
export function openHat(t: number, peak = 0.08): void {
  noiseHit(t, 'highpass', 6000, peak, 0.18);
}

/** 銅鈸：段落開頭的一聲 */
export function crash(t: number, peak = 0.18): void {
  noiseHit(t, 'highpass', 4500, peak, 1.2);
}

/** 幾個微微走音的鋸齒波疊在一起（supersaw），送進 dest */
function saws(t: number, freq: number, end: number, cents: number[], dest: AudioNode): void {
  for (const c of cents) {
    const o = ac!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = c;
    o.connect(dest);
    o.start(t);
    o.stop(end);
  }
}

function lowpass(t: number, from: number, to = from, dur = 0): BiquadFilterNode {
  const f = ac!.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(from, t);
  if (to !== from) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  return f;
}

/** 主旋律：supersaw，bright＝副歌（濾波開比較亮、比較大聲），同時送一份到回音 */
export function lead(t: number, freq: number, dur: number, bright = true, gain = 1): void {
  const peak = (bright ? 0.03 : 0.022) * gain;
  const g = ac!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.008);
  g.gain.setValueAtTime(peak, t + dur * 0.7);
  g.gain.linearRampToValueAtTime(0.0001, t + dur * 0.9);
  g.connect(master!);
  g.connect(echo!);
  const f = lowpass(t, bright ? 5200 : 2600);
  f.connect(g);
  saws(t, freq, t + dur, [-14, 0, 14], f);
  saws(t, freq * 2, t + dur, [7], f); // 高八度一點點，聲音比較亮
}

/** 合成低音（Disc Jockey 用）：鋸齒波＋高八度方波，濾波從亮很快變悶；手機喇叭放不出純低頻，所以要有泛音才聽得到 */
export function bassSynth(t: number, freq: number, dur: number, peak = 0.12): void {
  const g = ac!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.setValueAtTime(peak, t + dur * 0.6);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  g.connect(master!);
  const f = lowpass(t, 2400, 500, dur * 0.8);
  f.Q.value = 6;
  f.connect(g);
  const o = ac!.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = freq;
  o.connect(f);
  const o2 = ac!.createOscillator();
  o2.type = 'square';
  o2.frequency.value = freq * 2;
  const g2 = ac!.createGain();
  g2.gain.value = 0.35;
  o2.connect(g2).connect(f);
  for (const x of [o, o2]) {
    x.start(t);
    x.stop(t + dur + 0.02);
  }
}

/** 撥弦（pluck）和弦：鋸齒波，濾波很快從亮變悶 */
export function pluck(t: number, freqs: number[], peak = 0.022): void {
  const g = env(t, peak, 0.28);
  const f = lowpass(t, 5000, 380, 0.2);
  f.connect(g);
  for (const fr of freqs) saws(t, fr, t + 0.3, [-8, 8], f);
}

/** 厚和弦（pad）：supersaw；pump＝一拍的秒數時每拍跟著大鼓「吸一下」（sidechain）；cutoff 從 from 掃到 to */
export function pad(t: number, freqs: number[], dur: number, opts: { pump?: number; from?: number; to?: number; peak?: number } = {}): void {
  const peak = opts.peak ?? 0.016;
  const g = ac!.createGain();
  if (opts.pump) {
    for (let k = 0; k * opts.pump < dur - 0.01; k++) {
      const b = t + k * opts.pump;
      g.gain.setValueAtTime(peak * 0.08, b);
      g.gain.linearRampToValueAtTime(peak, b + opts.pump * 0.5);
    }
  } else {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.05);
  }
  g.gain.setValueAtTime(peak, t + dur - 0.03);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  g.connect(master!);
  const f = lowpass(t, opts.from ?? 3500, opts.to ?? opts.from ?? 3500, dur);
  f.connect(g);
  for (const fr of freqs) saws(t, fr, t + dur, [-12, 0, 12], f);
}

/** riser：噪音往上掃、越來越大聲（Build-up 用） */
export function riser(t: number, dur: number, peak = 0.16): void {
  const src = ac!.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ac!.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(7000, t + dur);
  const g = ac!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + dur);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.02);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.03);
}

/** 刷碟（Disc Jockey）：濾波噪音＋音高來回滑的「wicka-wicka」，dur 秒內來回 strokes 下（長刷） */
export function scratch(t: number, dur: number, strokes = 6): void {
  const d = dur / strokes;
  for (let k = 0; k < strokes; k++) {
    const s = t + k * d;
    const fwd = k % 2 === 0; // 往前推音高往上、往回拉音高往下
    const src = ac!.createBufferSource();
    src.buffer = noise;
    const f = ac!.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(fwd ? 500 : 2600, s);
    f.frequency.exponentialRampToValueAtTime(fwd ? 2600 : 500, s + d * 0.9);
    const g = ac!.createGain();
    g.gain.setValueAtTime(0.0001, s);
    g.gain.linearRampToValueAtTime(0.5, s + d * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, s + d * 0.95);
    src.connect(f).connect(g).connect(master!);
    src.start(s);
    src.stop(s + d);
    const o = ac!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(fwd ? 160 : 520, s);
    o.frequency.exponentialRampToValueAtTime(fwd ? 520 : 160, s + d * 0.9);
    const og = ac!.createGain();
    og.gain.setValueAtTime(0.0001, s);
    og.gain.linearRampToValueAtTime(0.05, s + d * 0.15);
    og.gain.exponentialRampToValueAtTime(0.0001, s + d * 0.95);
    o.connect(og).connect(master!);
    o.start(s);
    o.stop(s + d);
  }
}

/** 壓低其他聲音 dur 秒（刷碟時讓刷碟聲突出），之後回到原本音量 */
export function duck(t: number, dur: number, level = 0.35): void {
  const g = master!.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0.7 * level, t + 0.03);
  g.setValueAtTime(0.7 * level, t + dur);
  g.linearRampToValueAtTime(0.7, t + dur + 0.08);
}

/** 按鍵音：粉＝咚（低）、藍＝咔（高） */
export function padSound(color: 'pink' | 'blue'): void {
  const t = audio().currentTime;
  if (color === 'pink') {
    kick(t, 0.4);
    tone(t, 330, 0.08, 'triangle', 0.12);
  } else {
    tone(t, 1320, 0.05, 'square', 0.07);
    noiseHit(t, 'bandpass', 3000, 0.25, 0.05);
  }
}

/** MIDI 音高 → 頻率 */
export const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
