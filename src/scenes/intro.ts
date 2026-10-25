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
    step('💖', '選一個本命來養', '從 13 個角色選 1 個，選了就不能換'),
    step('🍙', '好好照顧他', '四項數值照真實時間下降，關掉也會'),
    step('🥤', '手搖飲賺金幣', '10 秒內拼命點，點越多越好喝'),
    step('🎵', '節奏應援賺金幣', '跟著歌曲按粉、藍按鈕，比較累但更開心'),
    step('🛍️', '商店', '買食物，存錢解鎖新角色'),
    step('🏠', '邀請孩子作客', '解鎖的角色可以來玩，還多一種原料'),
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
          h('img', { className: 'intro-logo', src: './icons/diamond-px.png', alt: '' }),
          howToPlay(),
          h('button', { className: 'primary start', textContent: '開始遊戲', onclick: () => go('select') }),
        ),
      );
    },
  };
}
