import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["dist/**", "pnpm-lock.yaml"],
  sortImports: true,
  jsdoc: true,
});
