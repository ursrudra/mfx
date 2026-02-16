/**
 * All client-side JavaScript for the Module Federation Studio GUI.
 *
 * Split into logical modules for maintainability:
 *   - scripts-core.ts       — State, theme, stepper, single-project wizard (steps 1-4), toast, reset
 *   - scripts-browser.ts    — File browser dialog
 *   - scripts-picker.ts     — Component picker dialog
 *   - scripts-validation.ts — Live field validation, helpers, help panel
 *   - scripts-workspace.ts  — Workspace mode (discovery, app cards, review, apply)
 */
import { getCoreScripts } from "./scripts-core.js";
import { getBrowserScripts } from "./scripts-browser.js";
import { getPickerScripts } from "./scripts-picker.js";
import { getValidationScripts } from "./scripts-validation.js";
import { getWorkspaceScripts } from "./scripts-workspace.js";

export function getScripts(): string {
  return (
    getCoreScripts() +
    getBrowserScripts() +
    getPickerScripts() +
    getValidationScripts() +
    getWorkspaceScripts()
  );
}
