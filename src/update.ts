// PWA：註冊快取程式，並檢查網站有沒有新版本（建置時把 __BUILD_ID__ 寫進程式，同時產生 version.json，兩者不同就是有新版）

import { h } from './ui';

declare const __BUILD_ID__: string;

let shown = false;

async function checkUpdate(): Promise<void> {
  if (shown) return;
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { build } = (await res.json()) as { build: string };
    if (build !== __BUILD_ID__) showBanner();
  } catch {
    // 沒網路或不是正式網站（例如手機試玩的 Artifact），不用提示
  }
}

function showBanner(): void {
  shown = true;
  document.body.append(h('button', { className: 'update-banner', textContent: '✨ 有新版本，點這裡更新', onclick: applyUpdate }));
}

/** 繞過快取重抓首頁，再請快取程式更新，然後重新載入 */
async function applyUpdate(): Promise<void> {
  try {
    await fetch('./', { cache: 'reload' });
    const reg = await navigator.serviceWorker?.getRegistration();
    await reg?.update();
  } catch {
    // 重新載入一樣會拿新版
  }
  location.reload();
}

export function setupPwa(): void {
  if (!import.meta.env.PROD) return;
  navigator.serviceWorker?.register('./sw.js').catch(() => {});
  checkUpdate();
  // 從背景切回來時、以及每 30 分鐘檢查一次（手機的 App 常常一直開著不會重新載入）
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && checkUpdate());
  setInterval(checkUpdate, 30 * 60_000);
}
