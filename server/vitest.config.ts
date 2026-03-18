import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      XML_FEED_URL: "https://test.example.com/feed.xml",
    },
  },
});
