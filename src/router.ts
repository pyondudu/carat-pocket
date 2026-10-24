// 畫面切換：每個畫面掛到 #app，離開時呼叫 unmount 清掉計時器

export interface Scene {
  mount(root: HTMLElement): void;
  unmount?(): void;
}

export type SceneName = 'select' | 'home' | 'sheet' | 'shake';

const scenes = new Map<SceneName, () => Scene>();
let current: Scene | null = null;

export function register(name: SceneName, factory: () => Scene): void {
  scenes.set(name, factory);
}

export function go(name: SceneName): void {
  const root = document.getElementById('app')!;
  current?.unmount?.();
  root.replaceChildren();
  current = scenes.get(name)!();
  current.mount(root);
}
