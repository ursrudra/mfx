/**
 * Tests for the dev command: workspace discovery, app resolution, filtering,
 * sorting, and path-escape prevention.
 *
 * Note: we do NOT actually spawn child processes in tests. We test the logic
 * that leads up to the spawn (discovery, resolution, filtering, security).
 * The spawn itself would be an integration test requiring actual apps.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runDev } from "../commands/dev.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfx-dev-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Create a minimal Vite project in tmpDir/<name>. */
function createViteProject(
  name: string,
  opts?: {
    pkgName?: string;
    role?: "remote" | "host";
    port?: number;
    hasMfaConfig?: boolean;
    hasDevScript?: boolean;
  },
): string {
  const dir = path.join(tmpDir, name);
  fs.mkdirSync(dir, { recursive: true });

  const scripts: Record<string, string> = {};
  if (opts?.hasDevScript !== false) {
    scripts.dev = "vite";
  }

  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: opts?.pkgName ?? name,
        private: true,
        scripts,
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: { vite: "^6.0.0" },
      },
      null,
      2,
    ),
  );

  // Create a vite.config.ts that optionally includes federation hints
  let viteContent = `import { defineConfig } from "vite"\nexport default defineConfig({ plugins: [] })\n`;
  if (opts?.role === "remote") {
    viteContent = `import { defineConfig } from "vite"\nimport { federation } from "@module-federation/vite"\nexport default defineConfig({ plugins: [federation({ name: "${name}", exposes: {} })] })\n`;
  } else if (opts?.role === "host") {
    viteContent = `import { defineConfig } from "vite"\nimport { federation } from "@module-federation/vite"\nexport default defineConfig({ plugins: [federation({ name: "${name}", remotes: {} })] })\n`;
  }

  fs.writeFileSync(path.join(dir, "vite.config.ts"), viteContent);

  // Optional mfa.config.json
  if (opts?.hasMfaConfig) {
    fs.writeFileSync(
      path.join(dir, "mfa.config.json"),
      JSON.stringify(
        { role: opts.role ?? "remote", name, port: opts.port ?? 5001 },
        null,
        2,
      ),
    );
  }

  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src", "main.ts"), 'console.log("hello")\n');

  return dir;
}

/** Create mfa.workspace.json in tmpDir. */
function writeWorkspaceConfig(
  apps: Array<{ dir: string; name?: string; role?: string; port?: number }>,
): void {
  fs.writeFileSync(
    path.join(tmpDir, "mfa.workspace.json"),
    JSON.stringify({ apps }, null, 2),
  );
}

// ─── Error paths ────────────────────────────────────────────────────────────

describe("runDev — error paths", () => {
  it("throws if workspace directory does not exist", async () => {
    await expect(
      runDev({ workspaceDir: path.join(tmpDir, "nonexistent") }, "1.0.0"),
    ).rejects.toThrow("does not exist");
  });

  it("returns early when no apps are found", async () => {
    // Empty dir — no mfa.workspace.json and no discoverable apps
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runDev({ workspaceDir: tmpDir }, "1.0.0");
    const output = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No apps found");
    spy.mockRestore();
  });
});

// ─── Workspace discovery via mfa.workspace.json ─────────────────────────────

describe("runDev — workspace.json discovery", () => {
  it("skips entries whose directory does not exist", async () => {
    writeWorkspaceConfig([
      { dir: "ghost-app", name: "ghost", role: "remote", port: 5001 },
    ]);

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runDev({ workspaceDir: tmpDir }, "1.0.0");
    const output = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("directory not found");
    spy.mockRestore();
  });

  it("skips entries that escape the workspace root", async () => {
    writeWorkspaceConfig([
      { dir: "../../../etc", name: "escape", role: "remote", port: 5001 },
    ]);

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await runDev({ workspaceDir: tmpDir }, "1.0.0");
    const output = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("escapes workspace root");
    spy.mockRestore();
  });
});

// ─── Filter ─────────────────────────────────────────────────────────────────

describe("runDev — filter", () => {
  it("reports error when filter matches nothing", async () => {
    createViteProject("app-a", { role: "remote", hasMfaConfig: true, port: 5001 });
    writeWorkspaceConfig([{ dir: "app-a", name: "app-a", role: "remote", port: 5001 }]);

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    // We can't easily stop the spawn, so we mock spawn to no-op
    vi.mock("node:child_process", async (importOriginal) => {
      const actual = (await importOriginal()) as Record<string, unknown>;
      return {
        ...actual,
        spawn: vi.fn().mockReturnValue({
          pid: 12345,
          killed: false,
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
            if (event === "close") setTimeout(() => cb(0), 10);
          }),
          kill: vi.fn(),
        }),
      };
    });

    // Run with a filter that doesn't match
    await runDev({ workspaceDir: tmpDir, filter: ["nonexistent-app"] }, "1.0.0");
    const output = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(output).toContain("No apps match filter");

    spy.mockRestore();
    vi.restoreAllMocks();
  });
});

// ─── Auto-discovery (no mfa.workspace.json) ─────────────────────────────────

describe("runDev — auto-discovery", () => {
  it("discovers apps at workspace root level", async () => {
    createViteProject("remote-1", { role: "remote" });
    createViteProject("host-1", { role: "host" });

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Mock spawn so we don't actually start dev servers
    vi.mock("node:child_process", async (importOriginal) => {
      const actual = (await importOriginal()) as Record<string, unknown>;
      return {
        ...actual,
        spawn: vi.fn().mockReturnValue({
          pid: 12345,
          killed: false,
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
            if (event === "close") setTimeout(() => cb(0), 10);
          }),
          kill: vi.fn(),
        }),
      };
    });

    await runDev({ workspaceDir: tmpDir }, "1.0.0");
    const output = spy.mock.calls.map((c) => c.join(" ")).join("\n");
    // Should find both apps
    expect(output).toContain("remote-1");
    expect(output).toContain("host-1");

    spy.mockRestore();
    vi.restoreAllMocks();
  });
});
