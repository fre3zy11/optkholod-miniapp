import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, unlink } from 'node:fs/promises';

const currentDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = resolve(currentDir, '../web');
const outputAssetsDir = resolve(outputDir, 'assets');

const generatedAssetPattern = /^(?:storefront-[\w-]+\.(?:js|css)(?:\.map)?|(?:success-animation|rive-logo)-[\w-]+\.js(?:\.map)?|chunk-[\w-]+\.js(?:\.map)?)$/;

function cleanGeneratedAssets() {
  return {
    name: 'clean-generated-storefront-assets',
    apply: 'build' as const,
    async buildStart() {
      let entries;

      try {
        entries = await readdir(outputAssetsDir, { withFileTypes: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }

      await Promise.all(
        entries
          .filter((entry) => entry.isFile() && generatedAssetPattern.test(entry.name))
          .map((entry) => unlink(resolve(outputAssetsDir, entry.name)))
      );
    }
  };
}

export default defineConfig({
  root: currentDir,
  base: './',
  publicDir: false,
  plugins: [cleanGeneratedAssets()],
  build: {
    outDir: outputDir,
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve(currentDir, 'index.html'),
      output: {
        entryFileNames: 'assets/storefront-[hash].js',
        chunkFileNames: 'assets/chunk-[name]-[hash].js',
        assetFileNames: 'assets/storefront-[hash][extname]'
      }
    }
  }
});
