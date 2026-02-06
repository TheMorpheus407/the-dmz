import { resolve } from "node:path";

import adapter from "@sveltejs/adapter-node";

const config = {
  kit: {
    adapter: adapter(),
    alias: {
      $lib: resolve("./src/lib"),
      $api: resolve("./src/lib/api"),
      $ui: resolve("./src/lib/ui"),
      $stores: resolve("./src/lib/stores"),
      $utils: resolve("./src/lib/utils"),
      $game: resolve("./src/lib/game"),
    },
  },
};

export default config;
