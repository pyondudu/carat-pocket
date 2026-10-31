import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 每次建置的版本號：同時寫進程式和 version.json，App 比對兩者就知道網站有沒有新版
const BUILD_ID = new Date().toISOString();

// 手機測試相機與搖晃感測需要 HTTPS
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    basicSsl(),
    {
      // #watch 頁按「輸出給手錶」時把圖存到 watch/（只在 npm run dev 有，不會部署）
      name: 'watch-export',
      apply: 'serve',
      configureServer(server) {
        const root = fileURLToPath(new URL('./watch', import.meta.url));
        server.middlewares.use('/__watch-export', (req, res) => {
          const path = decodeURIComponent((req.url ?? '').replace(/^\//, '').split('?')[0]);
          if (req.method !== 'POST' || !/^[a-z0-9_]+(\/[a-z0-9_]+)*\.(png|json)$/.test(path)) {
            res.statusCode = 400;
            return res.end('bad path');
          }
          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => {
            const file = join(root, path);
            mkdirSync(dirname(file), { recursive: true });
            writeFileSync(file, Buffer.concat(chunks));
            res.end('ok');
          });
        });
      },
    },
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
      },
    },
  ],
});
