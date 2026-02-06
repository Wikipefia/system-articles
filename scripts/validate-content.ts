#!/usr/bin/env node
/**
 * validate-content.ts — Content validation script.
 *
 * DEPRECATED: This script is kept for reference. The validation is now
 * handled by @wikipefia/mdx-compiler which uses the exact same compilation
 * pipeline as the main Wikipefia site.
 *
 * Run instead:
 *   pnpm validate
 *   # or directly:
 *   npx wikipefia-mdx validate . --type system
 */

console.log("This script is deprecated. Use: pnpm validate");
console.log("Running @wikipefia/mdx-compiler...\n");

import { execSync } from "child_process";
try {
  execSync("npx wikipefia-mdx validate . --type system", { stdio: "inherit" });
} catch {
  process.exit(1);
}
