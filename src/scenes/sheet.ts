// 角色總表（網址加 #sheet）：13 隻 × 每個表情排在一起，邊播呼吸、眨眼邊比對有沒有哪隻跑掉

import { CHARACTERS } from '../data/characters';
import { drawCharacter, hasRig, type Pose } from '../draw';
import type { Scene } from '../router';
import { h } from '../ui';

const POSES: [Pose, string][] = [['happy', '開心'], ['sad', '難過'], ['sick', '生病'], ['sleep', '睡覺'], ['shake', '搖飲料']];
const SIZE = 96;

export function sheetScene(): Scene {
  let raf = 0;
  return {
    mount(root) {
      let hopAt: number | undefined;
      const cells: { ctx: CanvasRenderingContext2D; id: string; pose: Pose }[] = [];
      const table = h(
        'table',
        { className: 'sheet' },
        h('tr', {}, h('th'), ...POSES.map(([, label]) => h('th', { textContent: label }))),
        ...CHARACTERS.map((c) =>
          h(
            'tr',
            {},
            h('th', { textContent: hasRig(c) ? `${c.name} ✦` : c.name }),
            ...POSES.map(([pose]) => {
              const cv = h('canvas', { className: 'art', width: SIZE * 2, height: SIZE * 2 });
              cells.push({ ctx: cv.getContext('2d')!, id: c.id, pose });
              return h('td', {}, cv);
            }),
          ),
        ),
      );
      root.append(
        h(
          'div',
          { className: 'screen' },
          h('header', { className: 'bar' }, h('h1', { textContent: '角色總表' }), h('button', { textContent: '全部跳一下', onclick: () => (hopAt = performance.now()) })),
          h('p', { className: 'hint', textContent: '✦＝無五官底圖＋程式畫五官（會呼吸、眨眼）；其他是各表情一張圖。' }),
          table,
        ),
      );
      const draw = (t: number) => {
        for (const { ctx, id, pose } of cells) {
          ctx.clearRect(0, 0, SIZE * 2, SIZE * 2);
          const c = CHARACTERS.find((x) => x.id === id)!;
          // 跳的高度要留空間，角色畫小一點
          drawCharacter(ctx, c, pose, SIZE, SIZE * 2 - 4, SIZE * 1.5, { t, hopAt });
        }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    },
    unmount() {
      cancelAnimationFrame(raf);
    },
  };
}
