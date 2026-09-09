import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}", "**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      exclude: [
        "node_modules",
        ".next",
        "coverage",
        "**/*.json",
        "**/*.d.ts",
        // shadcn vendor primitives: exercised at import/render, not owned logic.
        "components/ui/**",
        // Next.js shell (next/font + metadata): verified via `next build`, not jsdom.
        "app/layout.tsx",
      ],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 89,
      },
    },
  },
});
