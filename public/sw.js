// 快取程式：第一次打開後把網頁和角色圖存在手機裡，之後打開很快、沒網路也能玩
// 首頁先上網抓（才拿得到新版），抓不到才用快取；其他檔案先用快取、背景再更新
// 改快取規則時換名字，舊快取會在 activate 時刪掉
const CACHE = 'carat-pocket-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      // 同網域還有 PartTrail 等其他 App，只刪自己的舊快取
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('carat-pocket') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // 版本檔、App 資訊檔、主畫面圖示一律直接上網抓：安裝時 Chrome 和 Google 打包 App 的伺服器拿到的必須是同一份，
  // 用快取的舊圖示會對不上，Android 就會裝不起來（「無法開啟應用程式」）
  if (/version\.json$|manifest\.webmanifest$|\/icons\//.test(url.pathname)) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // 錯誤頁（404、500）不存，免得離線時打開看到錯誤頁
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? caches.match('./'))),
    );
    return;
  }
  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req).then((hit) => {
        const fresh = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit ?? fresh;
      }),
    ),
  );
});
