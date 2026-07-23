import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ht-gen7-superagent/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
