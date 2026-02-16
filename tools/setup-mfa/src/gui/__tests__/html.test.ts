import { describe, expect, it } from "vitest";
import { getHtml } from "../html.js";

/**
 * Smoke tests for the generated GUI HTML.
 *
 * These verify that the template concatenation produces valid,
 * well-formed HTML and that no template literal escaping errors
 * break the output silently.
 */
describe("getHtml — GUI template smoke tests", () => {
  const html = getHtml("1.0.0-test");

  it("returns a non-empty string", () => {
    expect(typeof html).toBe("string");
    expect(html.length).toBeGreaterThan(1000);
  });

  it("starts with a DOCTYPE and ends with </html>", () => {
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    expect(html.trimEnd()).toMatch(/<\/html>\s*$/);
  });

  it("has matching <html> / </html> tags", () => {
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("has matching <head> / </head> tags", () => {
    expect(html).toContain("<head>");
    expect(html).toContain("</head>");
  });

  it("has matching <body> / </body> tags", () => {
    expect(html).toContain("<body");
    expect(html).toContain("</body>");
  });

  it("body has data-theme attribute set to dark by default", () => {
    expect(html).toMatch(/<body[^>]*data-theme="dark"/);
  });

  it("contains the page title", () => {
    expect(html).toContain("<title>Module Federation Studio</title>");
  });

  it("contains inlined Oat UI CSS (style tag)", () => {
    // Oat UI CSS contains at least one known property
    expect(html).toContain("<style>");
    // There should be at least 2 style blocks (oat + custom)
    const styleCount = (html.match(/<style>/g) || []).length;
    expect(styleCount).toBeGreaterThanOrEqual(2);
  });

  it("contains inlined Oat UI JS (script tag)", () => {
    expect(html).toContain("<script>");
    const scriptCount = (html.match(/<script>/g) || []).length;
    expect(scriptCount).toBeGreaterThanOrEqual(2);
  });

  it("contains no unresolved template literals (${...} leaks)", () => {
    // In the output HTML, all template expressions should have been resolved.
    // A leaked ${...} indicates a broken template literal escape.
    // We look for "${" that isn't inside a JS string context.
    // The scripts section will legitimately contain ${} in its JS code,
    // so we only check the <head> section for leaks.
    const headSection = html.split("</head>")[0];
    // The head section should not contain raw ${
    expect(headSection).not.toMatch(/\$\{[^}]*\}/);
  });

  it("contains the version string passed to getHtml", () => {
    expect(html).toContain("1.0.0-test");
  });

  it("contains critical UI elements", () => {
    // Single project mode
    expect(html).toContain('id="singleMode"');
    expect(html).toContain('id="projectDir"');
    expect(html).toContain('id="detectBtn"');

    // Workspace mode
    expect(html).toContain('id="workspaceMode"');
    expect(html).toContain('id="wsRootDir"');

    // Dialogs
    expect(html).toContain('id="browserDialog"');
    expect(html).toContain('id="pickerDialog"');

    // Theme toggle
    expect(html).toContain('id="themeToggle"');
  });

  it("contains the global state object S", () => {
    // The JS code should define the state object
    expect(html).toContain("const S = {");
    expect(html).toContain("currentStep: 1");
  });

  it("contains workspace state object WS", () => {
    expect(html).toContain("const WS = {");
  });

  it("does not contain dangling backticks from broken template literals", () => {
    // A stray backtick in the output (outside of script tags) would indicate
    // a broken template literal. Count backticks — they should only appear
    // inside <script> blocks as part of JS template literals.
    const outsideScripts = html
      .replace(/<script>[\s\S]*?<\/script>/g, "")
      .replace(/<style>[\s\S]*?<\/style>/g, "");
    const backtickCount = (outsideScripts.match(/`/g) || []).length;
    expect(backtickCount).toBe(0);
  });

  it("CSS contains theme variable overrides", () => {
    expect(html).toContain("--background");
    expect(html).toContain("--foreground");
    expect(html).toContain("--primary");
  });

  it("JS contains all major function definitions", () => {
    const fns = [
      "function goStep(",
      "function detectProject(",
      "function selectRole(",
      "function applyConfig(",
      "function buildReview(",
      "function openBrowser(",
      "function openComponentPicker(",
      "function validateStep2(",
      "function showToast(",
      "function toggleTheme(",
      "function goWsStep(",
      "function discoverWorkspace(",
      "function renderAppCards(",
    ];
    for (const fn of fns) {
      expect(html).toContain(fn);
    }
  });
});
