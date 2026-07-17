import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: currentDir,
  base: './',
  publicDir: false,
  build: {
    outDir: resolve(currentDir, '../web'),
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(currentDir, 'index.html'),
      output: {
        entryFileNames: 'assets/storefront-[hash].js',
        assetFileNames: 'assets/storefront-[hash][extname]'
      }
    }
  }
});
