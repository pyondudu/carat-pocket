// 商店：買一般食物、本命的特殊食物，用金幣解鎖夥伴（可以邀請來房間作客＋拿到專屬原料，養成只有本命）

import { CHARACTERS, getCharacter, type Character } from '../data/characters';
import { FOOD_PRICE, SPECIAL_FOOD_PRICE } from '../data/shop';
import { characterCanvas } from '../draw';
import { go, type Scene } from '../router';
import { save, state } from '../state';
import { h, modal, toast } from '../ui';

export function shopScene(): Scene {
  return {
    mount(root) {
      const main = getCharacter(state.mainId!);
      const coins = h('span');
      const owned = { food: h('small'), special: h('small') };
      const refresh = () => {
        coins.textContent = `🪙 ${state.coins}`;
        owned.food.textContent = `持有 ${state.food} 個`;
        owned.special.textContent = `持有 ${state.specialFood} 個`;
      };

      const pay = (price: number): boolean => {
        if (state.coins < price) {
          toast(`金幣不夠，還差 ${price - state.coins}，去搖飲料賺吧`);
          return false;
        }
        state.coins -= price;
        return true;
      };

      const item = (icon: string, name: string, note: string, price: number, count: HTMLElement, buy: () => void) =>
        h(
          'div',
          { className: 'shop-item' },
          h('span', { className: 'icon', textContent: icon }),
          h('div', { className: 'info' }, h('strong', { textContent: name }), h('small', { textContent: note }), count),
          h('button', { textContent: `${price} 🪙`, onclick: buy }),
        );

      const foods = h(
        'section',
        { className: 'shop-section' },
        h('h2', { textContent: '食物' }),
        item('🍙', '紫菜飯糰', '飽足 +30', FOOD_PRICE, owned.food, () => {
          if (!pay(FOOD_PRICE)) return;
          state.food++;
          save();
          refresh();
          toast('買了 1 個紫菜飯糰');
        }),
        item('⭐', main.specialFood, `${main.name} 最喜歡的！飽足 +40、心情 +30`, SPECIAL_FOOD_PRICE, owned.special, () => {
          if (!pay(SPECIAL_FOOD_PRICE)) return;
          state.specialFood++;
          save();
          refresh();
          toast(`買了 1 個${main.specialFood}`);
        }),
      );

      const partners = h('div', { className: 'grid' });
      const drawPartners = () =>
        partners.replaceChildren(...CHARACTERS.filter((c) => c.id !== main.id).map((c) => partnerTile(c)));
      const partnerTile = (c: Character) => {
        const unlocked = state.unlocked.includes(c.id);
        const tile = h(
          'button',
          { className: `tile${unlocked ? '' : ' locked'}` },
          characterCanvas(c),
          h('strong', { textContent: c.name }),
          h('small', { textContent: unlocked ? `✅ ${c.ingredient}` : `${c.unlockCoins} 🪙` }),
        );
        tile.style.setProperty('--c', c.color);
        tile.onclick = () => (unlocked ? toast(`已經解鎖了，可以邀請 ${c.name} 來作客，搖飲料可以用「${c.ingredient}」`) : confirmUnlock(c));
        return tile;
      };
      const confirmUnlock = (c: Character) => {
        const yes = h('button', { className: 'primary', textContent: `花 ${c.unlockCoins} 🪙 解鎖` });
        const close = modal(
          characterCanvas(c),
          h('h2', { textContent: `解鎖 ${c.name}？` }),
          h('p', { textContent: `解鎖後可以邀請 ${c.name} 來房間作客，並獲得專屬原料「${c.ingredient}」。` }),
          h('p', { className: 'hint', textContent: `目前有 ${state.coins} 🪙` }),
          yes,
        );
        yes.onclick = () => {
          if (!pay(c.unlockCoins)) return;
          state.unlocked.push(c.id);
          save();
          close();
          refresh();
          drawPartners();
          toast(`解鎖了 ${c.name}！可以邀請來作客，還多了原料「${c.ingredient}」`);
        };
      };
      drawPartners();

      root.append(
        h(
          'div',
          { className: 'screen shop' },
          h(
            'header',
            { className: 'bar' },
            h('button', { className: 'ghost', textContent: '← 房間', onclick: () => go('home') }),
            h('h1', { textContent: '商店' }),
            coins,
          ),
          foods,
          h(
            'section',
            { className: 'shop-section' },
            h('h2', { textContent: `解鎖新角色（解鎖每個新角色 ${CHARACTERS[0].unlockCoins} 🪙）` }),
            h('p', { className: 'hint', textContent: '解鎖後可以邀請孩子到房間作客，並獲得該角色專屬飲料原料。' }),
            partners,
          ),
        ),
      );
      refresh();
    },
  };
}
