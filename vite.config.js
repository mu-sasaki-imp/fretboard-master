import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // GitHub Pagesにデプロイする場合、baseを設定
  // 例: https://<username>.github.io/FretboardMaster/
  base: './', // 相対パスで設定すると柔軟に対応できる
})
