import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    reactRouter(),
    visualizer({
      open: false, // Automatically opens the report in your browser
      filename: "bundle-analysis.html",
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  ssr: {
    // Bundle all deps into the server output for Lambda — only needed for production builds
    noExternal: command === "build" ? true : undefined,
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          // Use the Lambda handler as the server entry so build/server/index.mjs exports `handler`
          input: "app/server/index.ts",
          output: {
            // Force .mjs so Lambda always treats chunks as ESM regardless of package.json
            chunkFileNames: "assets/[name]-[hash].mjs",
          },
        },
      },
    },
  },
}));
