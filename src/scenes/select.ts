// 選角畫面：第一次可以從 13 個裡任選；之後換主角只能選已解鎖的

import { CHARACTERS, type Character } from '../data/characters';
import { characterCanvas } from '../draw';
import { go, type Scene } from '../router';
import { chooseMain, state } from '../state';
import { h, modal } from '../ui';

export function selectScene(): Scene {
  return {
    mount(root) {
      const firstTime = state.mainId === null;
      const header = h(
        'header',
        { className: 'bar' },
        !firstTime && h('button', { className: 'ghost', textContent: '← 返回', onclick: () => go('home') }),
        h('h1', { textContent: firstTime ? '選一個夥伴帶回家' : '換主角' }),
      );
      const hint = h('p', {
        className: 'hint',
        textContent: firstTime ? '選中的角色會成為主角，其他 12 個之後可以慢慢解鎖。' : '只能選已經解鎖的角色，數值各自保存。',
      });
      const grid = h('div', { className: 'grid' });
      for (const c of CHARACTERS) {
        const locked = !firstTime && !state.unlocked.includes(c.id);
        const tile = h(
          'button',
          { className: `tile${locked ? ' locked' : ''}${c.id === state.mainId ? ' current' : ''}` },
          characterCanvas(c),
          h('strong', { textContent: c.name }),
          h('small', { textContent: locked ? '🔒 未解鎖' : c.member }),
        );
        tile.style.setProperty('--c', c.color);
        tile.onclick = () => showDetail(c, locked);
        grid.append(tile);
      }
      root.append(h('div', { className: 'screen select' }, header, hint, grid));
    },
  };
}

function showDetail(c: Character, locked: boolean): void {
  const rows: [string, string | undefined][] = [
    ['設計成員', c.member],
    ['角色', c.animal],
    ['喜歡的食物', c.favoriteFood],
    ['MBTI', c.mbti],
    ['興趣', c.hobby],
    ['其他', c.extra],
    ['專屬原料', c.ingredient],
  ];
  const big = characterCanvas(c);
  big.classList.add('big');
  const isMain = c.id === state.mainId;
  const btn = h('button', {
    className: 'primary',
    textContent: locked ? '尚未解鎖（之後可以在商店解鎖）' : isMain ? '目前的主角' : `就決定是你了，${c.name}！`,
    disabled: locked || isMain,
  });
  const close = modal(
    big,
    h('h2', { textContent: c.name }),
    h('p', { className: 'ko', textContent: c.nameKo }),
    h(
      'dl',
      {},
      ...rows.filter(([, v]) => v).flatMap(([k, v]) => [h('dt', { textContent: k }), h('dd', { textContent: v })]),
    ),
    btn,
  );
  btn.onclick = () => {
    chooseMain(c.id);
    close();
    go('home');
  };
}
