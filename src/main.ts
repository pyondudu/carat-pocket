import './style.css';
import { loadSprites } from './draw';
import { go, register } from './router';
import { homeScene } from './scenes/home';
import { introScene } from './scenes/intro';
import { selectScene } from './scenes/select';
import { rhythmScene } from './scenes/rhythm';
import { djScene } from './scenes/dj';
import { shakeScene } from './scenes/shake';
import { shopScene } from './scenes/shop';
import { sheetScene } from './scenes/sheet';
import { setupPwa } from './update';
import { awayMessage, catchUp, dailyFoodMessage, mainPet, save, state } from './state';
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

/** 補算離開期間的時間，離開夠久就顯示「你不在的時候…」 */
function welcomeBack(): void {
  const result = catchUp();
  const pet = mainPet();
  if (!result || !pet) return;
  save();
  const msg = awayMessage(result.elapsed, result.before, pet.stats, result.guestLeft);
  if (msg) modal(h('h2', { textContent: '你不在的時候…' }), h('p', { className: 'away', textContent: msg }));
  else if (result.guestLeft) toast(`${getCharacter(result.guestLeft).name} 回家了，下次再來玩～`);
  if (result.dailyFood) toast(dailyFoodMessage(result.dailyFood));
}

// 讀取畫面的進度條（index.html 裡的 #loading-fill）
const fill = document.getElementById('loading-fill');
const loadingText = document.getElementById('loading-text');
loadSprites((done, total) => {
  const pct = Math.round((done / total) * 100);
  if (fill) fill.style.width = `${Math.max(4, pct)}%`;
  if (loadingText) loadingText.textContent = `載入中… ${pct}%`;
}).then(() => {
  // #sheet：角色總表，檢查表情與比例用
  if (location.hash === '#sheet') return go('sheet');
  // #rhythm：應援預覽（還沒選本命也能看）
  if (location.hash === '#rhythm') return go('rhythm');
  // #dj：DJ 預覽（製作中）
  if (location.hash === '#dj') return go('dj');
  welcomeBack();
  go(state.mainId ? 'home' : 'intro');
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
  else welcomeBack();
});

setupPwa();
