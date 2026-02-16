#!/usr/bin/env node

/**
 * Refresh the vendored Oat UI CSS and JS in vendor.ts.
 *
 * Usage:
 *   node scripts/refresh-vendor.mjs
 *
 * What it does:
 *   1. Fetches the latest minified CSS and JS from the Oat UI CDN
 *   2. Rewrites src/gui/templates/vendor.ts with the new content
 *   3. Prints the size of each asset
 *
 * After running, verify the GUI still works:
 *   npm run build && npx mfx gui
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENDOR_PATH = path.join(__dirname, "..", "src", "gui", "templates", "vendor.ts");

const CSS_URL = "https://unpkg.com/@nicedoc/oat@latest/dist/oat.min.css";
const JS_URL = "https://unpkg.com/@nicedoc/oat@latest/dist/oat.min.js";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.text();
}

async function main() {
  console.log("Fetching Oat UI assets...");

  const [css, js] = await Promise.all([fetchText(CSS_URL), fetchText(JS_URL)]);

  console.log(`  CSS: ${(css.length / 1024).toFixed(1)} KB`);
  console.log(`  JS:  ${(js.length / 1024).toFixed(1)} KB`);

  // Escape backticks and ${} in the fetched content for safe embedding in template literals
  const escapeCss = css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const escapeJs = js.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

  const today = new Date().toISOString().slice(0, 7); // e.g. "2026-02"

  const output = `/**
 * Oat UI — Ultra-lightweight, semantic, zero-dependency HTML UI component library.
 *
 * Source:  https://github.com/knadh/oat
 * Website: https://oat.ink/
 * License: MIT
 * Version: latest (fetched ${today})
 *
 * CDN URLs used:
 *   CSS: ${CSS_URL}
 *   JS:  ${JS_URL}
 *
 * The minified CSS (~${(css.length / 1024).toFixed(0)} KB) and JS (~${(js.length / 1024).toFixed(1)} KB) are embedded as string constants
 * so the mfx GUI can be served as a single self-contained HTML file with
 * zero external runtime dependencies.
 *
 * To refresh the vendored code, run:
 *   node scripts/refresh-vendor.mjs
 */

/* eslint-disable max-len */

/** Oat UI minified CSS. */
export function getOatCss(): string {
  return \`${escapeCss}\`;
}

/** Oat UI minified JS. */
export function getOatJs(): string {
  return \`${escapeJs}\`;
}
`;

  fs.writeFileSync(VENDOR_PATH, output, "utf-8");
  console.log(`\nUpdated: ${path.relative(process.cwd(), VENDOR_PATH)}`);
  console.log("Done! Run 'npm run build' and test the GUI to verify.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
