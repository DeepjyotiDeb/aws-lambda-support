import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // .mjs extension tells Lambda this is ESM without needing a package.json in build/server/
  serverBuildFile: "index.mjs",
} satisfies Config;
