import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), reactRouter()],
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
        },
      },
    },
  },
}));
