/**
 * Returns the full HTML page for the mfx GUI.
 *
 * The page is composed from four template modules:
 *   - vendor.ts  — Oat UI CSS + JS (inlined, ~8KB total)
 *   - styles.ts  — Custom theme overrides and app-specific CSS
 *   - markup.ts  — HTML body (stepper, forms, dialogs)
 *   - scripts.ts — Client-side JavaScript logic
 *
 * Design principles:
 *   - Uses Oat UI for semantic, accessible base components
 *   - Dark theme by default via data-theme="dark"
 *   - Progressive disclosure via a 4-step stepper
 *   - Inline validation with helpful error messages
 *   - Keyboard-navigable (Enter to detect, Tab through fields)
 *   - ARIA roles for screen readers
 *   - Review step with live config preview before applying
 *   - SVG icons for cross-platform consistency
 */
import { getMarkup } from "./templates/markup.js";
import { getScripts } from "./templates/scripts.js";
import { getStyles } from "./templates/styles.js";
import { getOatCss, getOatJs } from "./templates/vendor.js";

export function getHtml(version: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Module Federation Studio</title>
  <style>${getOatCss()}</style>
  <style>${getStyles()}</style>
</head>
<body data-theme="dark">
${getMarkup(version)}
<script>${getOatJs()}</script>
<script>${getScripts()}</script>
</body>
</html>`;
}
