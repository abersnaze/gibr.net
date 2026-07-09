import { defineConfig } from "vitest/config"

// Standalone config so tests run in plain node without the SvelteKit plugin.
// Transform logic under test is pure TypeScript with no DOM dependencies.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
})
