// 應援用的 8-bit 合成器（Web Audio），不用音樂檔；所有聲音都排在 AudioContext 的時間上，跟音符共用同一個時鐘

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;

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

/** 按鍵音：粉＝咚（低）、藍＝咔（高） */
export function padSound(color: 'pink' | 'blue'): void {
  const t = audio().currentTime;
  if (color === 'pink') {
    kick(t, 0.6);
    tone(t, 330, 0.08, 'triangle', 0.15);
  } else {
    tone(t, 1320, 0.05, 'square', 0.07);
    noiseHit(t, 'bandpass', 3000, 0.25, 0.05);
  }
}

/** MIDI 音高 → 頻率 */
export const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
