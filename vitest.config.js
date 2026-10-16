import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    // Las pruebas nunca deben llegar a un API real.
    env: { VITE_API_BASE_URL: 'http://api.invalid/api' },
  },
}))
