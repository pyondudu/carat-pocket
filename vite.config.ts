import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// 手機測試相機與搖晃感測需要 HTTPS
export default defineConfig({
  base: './',
  plugins: [basicSsl()],
});
