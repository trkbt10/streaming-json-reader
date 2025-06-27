import { defineConfig } from "vite";
import path from "path";
import dts from "vite-plugin-dts";
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "StreamingJsonReader",
      formats: ["es", "cjs"],
      fileName: (format) =>
        `[name].${
          {
            cjs: "cjs",
            es: "js",
          }[format]
        }`,
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ["src/**/*.ts"],
      exclude: ["node_modules", "dist"],
    }),
  ],
});
