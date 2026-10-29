// 開頭說明：第一次打開（還沒選本命）時出現，按「開始遊戲」進入選本命；房間的「📖 玩法說明」也會顯示同一份說明

import { go, type Scene } from '../router';
import { h } from '../ui';

/** 文宣圖（public/promo/，從共用資料夾的文宣 PNG 縮成寬 720 的 WebP；使用者 2026-10-29 決定用文宣取代文字說明） */
const PROMO_PAGES = ['封面', '養成', '手搖飲', '節奏應援', 'DJ'];

/** 玩法說明（開頭畫面與房間的「📖 玩法說明」共用）：文宣圖左右滑動翻頁，下面是頁碼點 */
export function howToPlay(): HTMLElement {
  const track = h(
    'div',
    { className: 'promo-track' },
    ...PROMO_PAGES.map((alt, i) => h('img', { src: `./promo/${i}.webp`, alt, loading: i === 0 ? 'eager' : 'lazy', draggable: false })),
  );
  const dots = PROMO_PAGES.map((alt, i) =>
    h('button', { className: 'promo-dot', ariaLabel: alt, onclick: () => track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }) }),
  );
  const update = () => {
    const page = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    dots.forEach((d, i) => d.classList.toggle('on', i === page));
  };
  track.addEventListener('scroll', update, { passive: true });
  update();
  return h('div', { className: 'promo' }, track, h('div', { className: 'promo-dots' }, ...dots));
}

/** 節奏應援音樂的署名（BreakingCopyright 要求寫曲名、作者、授權與連結） */
export function musicCredit(): HTMLElement {
  return h(
    'p',
    { className: 'credit' },
    '節奏應援音樂：To Be Free – Nck\nLicense: Free To Use YouTube license\nMusic powered by ',
    h('a', { href: 'https://breakingcopyright.com/song/nck-to-be-free', target: '_blank', rel: 'noopener', textContent: 'BreakingCopyright' }),
  );
}

export function introScene(): Scene {
  return {
    mount(root) {
      // 文宣封面已有標題和鑽石，這裡不再放
      root.append(
        h(
          'div',
          { className: 'screen intro' },
          howToPlay(),
          h('button', { className: 'primary start', textContent: '開始遊戲', onclick: () => go('select') }),
          h('p', { className: 'disclaimer', textContent: '存檔只在你自己的瀏覽器裡' }),
          musicCredit(),
        ),
      );
    },
  };
}
