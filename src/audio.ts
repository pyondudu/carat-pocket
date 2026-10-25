// 應援用的 8-bit 合成器（Web Audio），不用音樂檔；所有聲音都排在 AudioContext 的時間上，跟音符共用同一個時鐘

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let pulse25: PeriodicWave | null = null;
let echo: GainNode | null = null; // 主旋律的回音（送到延遲線）

/** 取得（必要時建立）AudioContext；手機規定要在使用者按下按鈕時才能開始出聲 */
export function audio(): AudioContext {
  if (!ac) {
    ac = new AudioContext();
    master = ac.createGain();
    master.gain.value = 0.7;
    master.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 25% 方波：紅白機主旋律那種比較亮、比較尖的聲音
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 * Math.sin(Math.PI * k * 0.25)) / (Math.PI * k);
    pulse25 = ac.createPeriodicWave(real, imag);
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

/** 大鼓 */
export function kick(t: number, peak = 0.9): void {
  const o = ac!.createOscillator();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  o.connect(env(t, peak, 0.16));
  o.start(t);
  o.stop(t + 0.17);
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

/** 主旋律：25% 方波、起音快、長音（0.3 秒以上）加一點抖音，同時送一份到回音 */
export function lead(t: number, freq: number, dur: number, peak = 0.04): void {
  const o = ac!.createOscillator();
  o.setPeriodicWave(pulse25!);
  o.frequency.value = freq;
  if (dur >= 0.3) {
    const lfo = ac!.createOscillator();
    lfo.frequency.value = 6;
    const depth = ac!.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(freq * 0.012, t + dur * 0.9);
    lfo.connect(depth).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur);
  }
  const g = ac!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.006);
  g.gain.setValueAtTime(peak, t + dur * 0.75);
  g.gain.linearRampToValueAtTime(0.0001, t + dur * 0.92);
  g.connect(master!);
  g.connect(echo!);
  o.connect(g);
  o.start(t);
  o.stop(t + dur);
}

/** 和弦連打：很短的方波和弦（學鋼琴右手的十六分音符和弦） */
export function stab(t: number, freqs: number[], peak = 0.018): void {
  for (const f of freqs) tone(t, f, 0.07, 'square', peak);
}

/** 銅管齊奏：鋸齒波和弦經過低通，短促有力 */
export function brass(t: number, freqs: number[], dur = 0.14, peak = 0.035): void {
  const f = ac!.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(3200, t);
  f.frequency.exponentialRampToValueAtTime(900, t + dur);
  const g = ac!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.01);
  g.gain.setValueAtTime(peak, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  f.connect(g).connect(master!);
  for (const fr of freqs) {
    const o = ac!.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = fr;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.01);
  }
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
