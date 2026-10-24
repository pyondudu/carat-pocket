import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// 每次建置的版本號：同時寫進程式和 version.json，App 比對兩者就知道網站有沒有新版
const BUILD_ID = new Date().toISOString();

// 手機測試相機與搖晃感測需要 HTTPS
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [
    basicSsl(),
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
      },
    },
  ],
});
