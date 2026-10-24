// 開頭說明：第一次打開（還沒選本命）時出現，按「開始遊戲」進入選本命；房間的「？」也會顯示同一份說明

import { go, type Scene } from '../router';
import { h } from '../ui';

/** 玩法說明（開頭畫面與房間的「？」共用） */
export function howToPlay(): HTMLElement {
  const step = (icon: string, title: string, text: string) =>
    h('li', {}, h('span', { className: 'icon', textContent: icon }), h('div', {}, h('strong', { textContent: title }), h('small', { textContent: text })));
  return h(
    'ul',
    { className: 'howto' },
    step('💖', '選一隻本命來養', '從 13 隻 MINITEEN 選 1 隻，選了就不能換。'),
    step('🍙', '好好照顧牠', '飽足、心情、清潔、體力會照真實時間慢慢下降，關掉也一樣，記得常回來看看。'),
    step('🥤', '搖飲料賺金幣', '選原料、10 秒內拼命點，點越多杯越好喝，金幣越多。'),
    step('🛍️', '商店', '買食物、買本命最愛的特殊食物，存錢解鎖其他夥伴。'),
    step('🏠', '邀請夥伴作客', '解鎖的夥伴可以邀請來房間玩，還會多一種搖飲料的專屬原料。'),
  );
}

export function introScene(): Scene {
  return {
    mount(root) {
      root.append(
        h(
          'div',
          { className: 'screen intro' },
          h('h1', { className: 'intro-title', textContent: 'Carat Pocket' }),
          h('p', { className: 'hint', textContent: '口袋裡的 MINITEEN 電子雞' }),
          h('p', { className: 'disclaimer', textContent: '（SEVENTEEN MINITEEN 粉絲二創，非官方、非營利）\n存檔只在你自己的瀏覽器裡' }),
          h('img', { className: 'intro-logo', src: './icons/diamond.png', alt: '' }),
          howToPlay(),
          h('button', { className: 'primary start', textContent: '開始遊戲', onclick: () => go('select') }),
        ),
      );
    },
  };
}
