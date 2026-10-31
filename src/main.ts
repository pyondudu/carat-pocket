import './style.css';
import { loadSprites } from './draw';
import { currentScene, go, register } from './router';
import { homeScene } from './scenes/home';
import { introScene } from './scenes/intro';
import { selectScene } from './scenes/select';
import { rhythmScene } from './scenes/rhythm';
import { djScene } from './scenes/dj';
import { shakeScene } from './scenes/shake';
import { shopScene } from './scenes/shop';
import { sheetScene } from './scenes/sheet';
import { watchScene } from './scenes/watch';
import { setupPwa, showBanner } from './update';
import { awayMessage, catchUp, dailyFoodMessage, mainPet, reloadIfChanged, save, saveBlocked, state } from './state';
import { getCharacter } from './data/characters';
import { h, modal, toast } from './ui';

register('intro', introScene);
register('select', selectScene);
register('home', homeScene);
register('sheet', sheetScene);
register('shake', shakeScene);
register('shop', shopScene);
register('rhythm', rhythmScene);
register('dj', djScene);
register('watch', watchScene);

/** 補算離開期間的時間，離開夠久就顯示「你不在的時候…」 */
function welcomeBack(): void {
  const result = catchUp();
  const pet = mainPet();
  if (!result || !pet) return;
  save();
  const msg = awayMessage(result.elapsed, result.before, pet.stats, result.guestLeft);
  const daily = result.dailyFood === null ? null : dailyFoodMessage(result.dailyFood);
  // 有「你不在的時候…」視窗就把發放訊息寫進視窗，免得 toast 一閃就錯過
  if (msg) modal(h('h2', { textContent: '你不在的時候…' }), h('p', { className: 'away', textContent: daily ? `${msg}\n${daily}` : msg }));
  else if (result.guestLeft) toast(`${getCharacter(result.guestLeft).name} 回家了，下次再來玩～`);
  if (daily && !msg) toast(daily);
}

// 讀取畫面的進度條（index.html 裡的 #loading-fill）
const fill = document.getElementById('loading-fill');
const loadingText = document.getElementById('loading-text');
loadSprites((done, total) => {
  const pct = Math.round((done / total) * 100);
  if (fill) fill.style.width = `${Math.max(4, pct)}%`;
  if (loadingText) loadingText.textContent = `載入中… ${pct}%`;
}, location.hash === '#sheet').then(() => {
  // #sheet：角色總表，檢查表情與比例用
  if (location.hash === '#sheet') return go('sheet');
  // #watch：手錶版 Pocket 畫面預覽＋輸出手錶用的圖（工具頁）
  if (location.hash.startsWith('#watch')) return go('watch');
  // #rhythm：應援預覽（還沒選本命也能看）
  if (location.hash === '#rhythm') return go('rhythm');
  // #dj：DJ 預覽（製作中）
  if (location.hash === '#dj') return go('dj');
  welcomeBack();
  go(state.mainId ? 'home' : 'intro');
});

/** 別的視窗（另一個分頁或安裝的 App）改過存檔：重新讀進來，才不會拿舊資料蓋回去；本命換了才重新進入畫面 */
function syncFromOtherWindow(): void {
  const mainChanged = reloadIfChanged();
  if (saveBlocked()) showBanner(); // 別的視窗是新版，這裡停止存檔
  if (!mainChanged) return;
  if (!currentScene() || currentScene() === 'sheet' || currentScene() === 'watch') return;
  document.querySelectorAll('.backdrop').forEach((el) => el.remove());
  go(state.mainId ? 'home' : 'intro');
}

window.addEventListener('storage', (e) => {
  if (e.key === null || e.key === 'carat-pocket-save') syncFromOtherWindow();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
  else {
    syncFromOtherWindow();
    welcomeBack();
  }
});

// 存檔是比較新的版本存的（這裡是還沒更新的舊版）：不存檔，請玩家更新
if (saveBlocked()) showBanner();

setupPwa();
