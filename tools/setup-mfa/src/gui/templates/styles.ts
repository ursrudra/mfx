/**
 * Custom CSS overrides for the Module Federation Studio GUI.
 *
 * Base styles (buttons, forms, cards, tables, badges, toasts, dialogs,
 * tabs, spinner, grid) are provided by Oat UI (vendor.ts).
 * This file only contains theme overrides and app-specific components.
 *
 * Split into logical modules for maintainability:
 *   - styles-base.ts      — Theme variables, layout, header, stepper, cards, forms, review, buttons
 *   - styles-dialog.ts    — Dialog overrides, file browser, component picker, help panel, mode toggle
 *   - styles-workspace.ts — Workspace mode styles, footer
 */
import { getBaseStyles } from "./styles-base.js";
import { getDialogStyles } from "./styles-dialog.js";
import { getWorkspaceStyles } from "./styles-workspace.js";

export function getStyles(): string {
  return getBaseStyles() + getDialogStyles() + getWorkspaceStyles();
}
