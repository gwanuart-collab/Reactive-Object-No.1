import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  root: '.',
  // GitHub Pages는 저장소 이름 하위 경로로 서비스됨 (예: /Reactive-Object-No.1/)
  base: mode === 'production' ? '/Reactive-Object-No.1/' : '/',
  publicDir: 'public',
  server: {
    port: 5173,
  },
}))
