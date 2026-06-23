import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';


// https://vite.dev/config/ 
export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', '**/*.test.{js,jsx}'],
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/nutrition-api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nutrition-api/, ''),
      }
    },
  },
})