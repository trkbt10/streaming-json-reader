import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'IncrementalJsonParser',
      fileName: (format) => `incremental-json-parser.${format}.js`,
    },
  },
  test: {
    environment: 'node',
  },
});
