// 共用 DOM 小工具：建立元素、提示訊息、彈出視窗

type Child = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & { className?: string } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = Object.assign(document.createElement(tag), props);
  for (const c of children) if (c) el.append(c);
  return el;
}

let toastTimer = 0;

export function toast(msg: string): void {
  let el = document.querySelector<HTMLDivElement>('.toast');
  if (!el) {
    el = h('div', { className: 'toast' });
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el!.classList.remove('show'), 1800);
}

/** 顯示彈出視窗，回傳關閉函式；點背景也會關閉 */
export function modal(...content: Child[]): () => void {
  const x = h('button', { className: 'close', textContent: '✕', ariaLabel: '關閉' });
  const box = h('div', { className: 'modal' }, x, ...content);
  const backdrop = h('div', { className: 'backdrop' }, box);
  const close = () => backdrop.remove();
  x.onclick = close;
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.body.append(backdrop);
  return close;
}
