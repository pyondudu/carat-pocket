import './style.css';
import { loadSprites } from './draw';
import { go, register } from './router';
import { homeScene } from './scenes/home';
import { selectScene } from './scenes/select';
import { awayMessage, catchUp, mainPet, save, state } from './state';
import { h, modal } from './ui';

register('select', selectScene);
register('home', homeScene);

/** 補算離開期間的時間，離開夠久就顯示「你不在的時候…」 */
function welcomeBack(): void {
  const result = catchUp();
  const pet = mainPet();
  if (!result || !pet) return;
  save();
  const msg = awayMessage(result.elapsed, result.before, pet.stats);
  if (msg) modal(h('h2', { textContent: '你不在的時候…' }), h('p', { className: 'away', textContent: msg }));
}

loadSprites().then(() => {
  welcomeBack();
  go(state.mainId ? 'home' : 'select');
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
  else welcomeBack();
});
