// 畫面切換：每個畫面掛到 #app，離開時呼叫 unmount 清掉計時器

export interface Scene {
  mount(root: HTMLElement): void;
  unmount?(): void;
}

export type SceneName = 'intro' | 'select' | 'home' | 'sheet' | 'shake' | 'shop' | 'rhythm' | 'dj' | 'watch';

const scenes = new Map<SceneName, () => Scene>();
let current: Scene | null = null;
let currentName: SceneName | null = null;

/** 目前在哪個畫面（存檔被別的視窗改過、要重新進入時用） */
export const currentScene = () => currentName;

export function register(name: SceneName, factory: () => Scene): void {
  scenes.set(name, factory);
}

export function go(name: SceneName): void {
  const root = document.getElementById('app')!;
  current?.unmount?.();
  root.replaceChildren();
  currentName = name;
  current = scenes.get(name)!();
  current.mount(root);
}
