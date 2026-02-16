/**
 * Tests for the workspace command: discoverApps helper + E2E batch mode.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discoverApps, runWorkspace } from "../commands/workspace.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfx-ws-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Create a minimal Vite project in tmpDir/<name>. */
function createViteProject(
  name: string,
  opts?: { pkgName?: string; noVite?: boolean; noPkg?: boolean },
): string {
  const dir = path.join(tmpDir, name);
  fs.mkdirSync(dir, { recursive: true });

  if (!opts?.noPkg) {
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify(
        {
          name: opts?.pkgName ?? name,
          private: true,
          dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
          devDependencies: { vite: "^6.0.0", "@vitejs/plugin-react": "^4.0.0" },
        },
        null,
        2,
      ),
    );
  }

  if (!opts?.noVite) {
    fs.writeFileSync(
      path.join(dir, "vite.config.ts"),
      `import { defineConfig } from "vite"\nexport default defineConfig({ plugins: [] })\n`,
    );
  }

  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src", "main.ts"), 'console.log("hello")\n');

  return dir;
}

// ─── discoverApps ────────────────────────────────────────────────────────────

describe("discoverApps", () => {
  it("finds Vite projects in root-level subdirectories", () => {
    createViteProject("app-a");
    createViteProject("app-b");

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(2);
    const dirs = apps.map((a) => a.dir);
    expect(dirs).toContain("app-a");
    expect(dirs).toContain("app-b");
  });

  it("ignores directories without package.json", () => {
    createViteProject("has-both");
    createViteProject("no-pkg", { noPkg: true });

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(1);
    expect(apps[0].dir).toBe("has-both");
  });

  it("ignores directories without vite.config", () => {
    createViteProject("has-both");
    createViteProject("no-vite", { noVite: true });

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(1);
    expect(apps[0].dir).toBe("has-both");
  });

  it("skips hidden directories and node_modules", () => {
    createViteProject("valid-app");

    // Create hidden dir and node_modules with matching structure
    const hidden = path.join(tmpDir, ".hidden-app");
    fs.mkdirSync(hidden, { recursive: true });
    fs.writeFileSync(path.join(hidden, "package.json"), "{}");
    fs.writeFileSync(path.join(hidden, "vite.config.ts"), "export default {}");

    const nm = path.join(tmpDir, "node_modules", "some-pkg");
    fs.mkdirSync(nm, { recursive: true });
    fs.writeFileSync(path.join(nm, "package.json"), "{}");
    fs.writeFileSync(path.join(nm, "vite.config.ts"), "export default {}");

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(1);
    expect(apps[0].dir).toBe("valid-app");
  });

  it("discovers apps inside common monorepo pattern directories (apps/, packages/)", () => {
    // Create apps/ subdirectory with projects
    const appsDir = path.join(tmpDir, "apps");
    fs.mkdirSync(appsDir, { recursive: true });

    const appA = path.join(appsDir, "frontend");
    fs.mkdirSync(appA, { recursive: true });
    fs.writeFileSync(path.join(appA, "package.json"), JSON.stringify({ name: "frontend" }));
    fs.writeFileSync(path.join(appA, "vite.config.ts"), "export default {}");

    // Create packages/ subdirectory
    const pkgsDir = path.join(tmpDir, "packages");
    fs.mkdirSync(pkgsDir, { recursive: true });

    const pkgA = path.join(pkgsDir, "shared-ui");
    fs.mkdirSync(pkgA, { recursive: true });
    fs.writeFileSync(path.join(pkgA, "package.json"), JSON.stringify({ name: "@myorg/shared-ui" }));
    fs.writeFileSync(path.join(pkgA, "vite.config.ts"), "export default {}");

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(2);
    const dirs = apps.map((a) => a.dir);
    expect(dirs).toContain("apps/frontend");
    expect(dirs).toContain("packages/shared-ui");
  });

  it("uses package.json name if available, cleans special chars", () => {
    createViteProject("my-app", { pkgName: "@scope/my-app" });

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(1);
    // @ and / are stripped, so name should be "scopemy-app"
    expect(apps[0].name).toBe("scopemy-app");
  });

  it("uses directory name when package.json has no name field", () => {
    const dir = path.join(tmpDir, "unnamed-proj");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ private: true }));
    fs.writeFileSync(path.join(dir, "vite.config.ts"), "export default {}");

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(1);
    expect(apps[0].name).toBe("unnamed-proj");
  });

  it("normalises dir paths to forward slashes", () => {
    const appsDir = path.join(tmpDir, "apps");
    fs.mkdirSync(appsDir, { recursive: true });

    const nested = path.join(appsDir, "web");
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, "package.json"), JSON.stringify({ name: "web" }));
    fs.writeFileSync(path.join(nested, "vite.config.ts"), "export default {}");

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(1);
    expect(apps[0].dir).toBe("apps/web");
    expect(apps[0].dir).not.toContain("\\");
  });

  it("returns empty array when no projects exist", () => {
    // tmpDir exists but has no project subdirs
    const apps = discoverApps(tmpDir);
    expect(apps).toEqual([]);
  });

  it("detects vite.config.js and vite.config.mts variants", () => {
    // .js variant
    const jsDir = path.join(tmpDir, "js-project");
    fs.mkdirSync(jsDir, { recursive: true });
    fs.writeFileSync(path.join(jsDir, "package.json"), JSON.stringify({ name: "js-proj" }));
    fs.writeFileSync(path.join(jsDir, "vite.config.js"), "export default {}");

    // .mts variant
    const mtsDir = path.join(tmpDir, "mts-project");
    fs.mkdirSync(mtsDir, { recursive: true });
    fs.writeFileSync(path.join(mtsDir, "package.json"), JSON.stringify({ name: "mts-proj" }));
    fs.writeFileSync(path.join(mtsDir, "vite.config.mts"), "export default {}");

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(2);
    const dirs = apps.map((a) => a.dir);
    expect(dirs).toContain("js-project");
    expect(dirs).toContain("mts-project");
  });
});

// ─── runWorkspace E2E ────────────────────────────────────────────────────────

describe("runWorkspace E2E", () => {
  it("throws when workspace directory does not exist", async () => {
    await expect(
      runWorkspace({ workspaceDir: path.join(tmpDir, "nonexistent"), yes: true }, "1.0.0-test"),
    ).rejects.toThrow(/does not exist/i);
  });

  it("throws when mfa.workspace.json has invalid JSON", async () => {
    fs.writeFileSync(path.join(tmpDir, "mfa.workspace.json"), "not json!", "utf-8");

    await expect(runWorkspace({ workspaceDir: tmpDir, yes: true }, "1.0.0-test")).rejects.toThrow(
      /parse.*mfa\.workspace\.json/i,
    );
  });

  it("throws when mfa.workspace.json has empty apps array", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "mfa.workspace.json"),
      JSON.stringify({ apps: [] }),
      "utf-8",
    );

    await expect(runWorkspace({ workspaceDir: tmpDir, yes: true }, "1.0.0-test")).rejects.toThrow(
      /non-empty.*apps/i,
    );
  });

  it("throws when mfa.workspace.json references missing directory", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "mfa.workspace.json"),
      JSON.stringify({
        apps: [{ dir: "does-not-exist", role: "remote", name: "foo", port: "5001" }],
      }),
      "utf-8",
    );

    await expect(runWorkspace({ workspaceDir: tmpDir, yes: true }, "1.0.0-test")).rejects.toThrow(
      /not found.*does-not-exist/i,
    );
  });

  it("throws when app entry is missing dir field", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "mfa.workspace.json"),
      JSON.stringify({
        apps: [{ role: "remote", name: "foo", port: "5001" }],
      }),
      "utf-8",
    );

    await expect(runWorkspace({ workspaceDir: tmpDir, yes: true }, "1.0.0-test")).rejects.toThrow(
      /dir/i,
    );
  });

  it("configures multiple apps from mfa.workspace.json with --yes", async () => {
    // Create two Vite projects
    const remoteDir = createViteProject("remote-app");
    const hostDir = createViteProject("host-app");

    // Create workspace config
    fs.writeFileSync(
      path.join(tmpDir, "mfa.workspace.json"),
      JSON.stringify(
        {
          apps: [
            { dir: "remote-app", role: "remote", name: "myRemote", port: "5001" },
            { dir: "host-app", role: "host", name: "myHost", port: "5000" },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );

    // Silence console output
    const origLog = console.log;
    console.log = () => {};
    try {
      await runWorkspace({ workspaceDir: tmpDir, yes: true, noInstall: true }, "1.0.0-test");
    } finally {
      console.log = origLog;
    }

    // Verify remote was configured
    const remoteVite = fs.readFileSync(path.join(remoteDir, "vite.config.ts"), "utf-8");
    expect(remoteVite).toMatch(/myRemote/);
    expect(remoteVite).toMatch(/5001/);

    // Verify host was configured
    const hostVite = fs.readFileSync(path.join(hostDir, "vite.config.ts"), "utf-8");
    expect(hostVite).toMatch(/myHost/);
    expect(hostVite).toMatch(/5000/);
  });

  it("dry-run mode does not modify files", async () => {
    createViteProject("dry-app");

    fs.writeFileSync(
      path.join(tmpDir, "mfa.workspace.json"),
      JSON.stringify({
        apps: [{ dir: "dry-app", role: "remote", name: "dryRemote", port: "5001" }],
      }),
      "utf-8",
    );

    const origVite = fs.readFileSync(path.join(tmpDir, "dry-app", "vite.config.ts"), "utf-8");

    const origLog = console.log;
    console.log = () => {};
    try {
      await runWorkspace({ workspaceDir: tmpDir, yes: true, dryRun: true }, "1.0.0-test");
    } finally {
      console.log = origLog;
    }

    const afterVite = fs.readFileSync(path.join(tmpDir, "dry-app", "vite.config.ts"), "utf-8");
    expect(afterVite).toBe(origVite);
  });

  it("discoverApps finds apps that runWorkspace would auto-discover", () => {
    // auto-discover (without workspace file) is tested via the discoverApps
    // unit tests above. runWorkspace with auto-discovered apps (no role set)
    // would still prompt for each app's role interactively, so we verify
    // discovery only.
    createViteProject("auto-remote");
    createViteProject("auto-host");

    const apps = discoverApps(tmpDir);

    expect(apps.length).toBe(2);
    const dirs = apps.map((a) => a.dir);
    expect(dirs).toContain("auto-remote");
    expect(dirs).toContain("auto-host");
  });
});
