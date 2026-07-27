import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds src/shader-bg/main.jsx into a single self-contained script
// (js/shader-bg.bundle.js) that index.html loads directly — no dev
// server or module resolution needed in production, since the rest of
// the site is plain static HTML/CSS/JS.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'js',
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/shader-bg/main.jsx',
      output: {
        entryFileNames: 'shader-bg.bundle.js',
        format: 'iife',
      },
    },
  },
});
