import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  base: '/NHK-N3-1/',
  plugins: [vue()],
  test: { environment: 'happy-dom', include: ['src/**/*.test.ts'] },
})
