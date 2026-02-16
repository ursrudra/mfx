/**
 * Tests for the upgrade command: project detection, version checking,
 * dry-run mode, package-not-installed path, and already-on-latest path.
 *
 * We mock execSync so no actual npm/pnpm/yarn commands are run.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock child_process at module level (hoisted) ───────────────────────────

vi.mock("node:child_process", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

// Use a broad Mock type since execSync has multiple overloads (string vs Buffer)
// and our tests return strings when the encoding overload is used.
const mockExecSync = execSync as unknown as ReturnType<typeof vi.fn>;

// We need a fresh import of runUpgrade after mocking
import { runUpgrade } from "../commands/upgrade.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfx-upgrade-"));
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/** Write a package.json to the tmp dir. */
function writePackageJson(deps?: Record<string, string>, devDeps?: Record<string, string>): void {
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify(
      {
        name: "test-project",
        private: true,
        dependencies: deps ?? {},
        devDependencies: devDeps ?? {},
      },
      null,
      2,
    ),
  );
}

/** Capture console.log output. */
function captureLog(): { getOutput: () => string; restore: () => void } {
  const spy = vi.spyOn(console, "log").mockImplementation(() => {});
  return {
    getOutput: () => spy.mock.calls.map((c) => c.join(" ")).join("\n"),
    restore: () => spy.mockRestore(),
  };
}

// ─── Error paths ────────────────────────────────────────────────────────────

describe("runUpgrade — error paths", () => {
  it("throws if project directory does not exist", async () => {
    await expect(
      runUpgrade({ projectDir: path.join(tmpDir, "nonexistent"), yes: true }, "1.0.0"),
    ).rejects.toThrow("does not exist");
  });

  it("throws if no package.json exists", async () => {
    await expect(runUpgrade({ projectDir: tmpDir, yes: true }, "1.0.0")).rejects.toThrow(
      "No package.json",
    );
  });
});

// ─── Package not installed ──────────────────────────────────────────────────

describe("runUpgrade — MF not installed", () => {
  it("warns when @module-federation/vite is not a dependency", async () => {
    writePackageJson({ react: "^19.0.0" }, { vite: "^6.0.0" });

    const log = captureLog();
    await runUpgrade({ projectDir: tmpDir, yes: true }, "1.0.0");

    expect(log.getOutput()).toContain("not installed");
    log.restore();
  });
});

// ─── Already on latest ─────────────────────────────────────────────────────

describe("runUpgrade — already on latest", () => {
  it("prints 'already on latest' and exits", async () => {
    writePackageJson({}, { "@module-federation/vite": "^1.5.0" });

    // getLatestVersion returns 1.5.0 — same as installed (after stripping ^)
    mockExecSync.mockReturnValue("1.5.0\n");

    const log = captureLog();
    await runUpgrade({ projectDir: tmpDir, yes: true }, "1.0.0");

    expect(log.getOutput()).toContain("Already on the latest");
    log.restore();
  });
});

// ─── Dry-run mode ──────────────────────────────────────────────────────────

describe("runUpgrade — dry-run", () => {
  it("shows what would change without actually upgrading", async () => {
    writePackageJson({}, { "@module-federation/vite": "^0.9.0" });

    // getLatestVersion returns 1.5.0 — different from 0.9.0
    mockExecSync.mockReturnValue("1.5.0\n");

    const log = captureLog();
    await runUpgrade({ projectDir: tmpDir, yes: true, dryRun: true }, "1.0.0");

    const output = log.getOutput();
    expect(output).toContain("Dry run");
    expect(output).toContain("@module-federation/vite");
    // Should NOT contain "Upgrade complete" since it's dry-run
    expect(output).not.toContain("Upgrade complete");
    log.restore();
  });
});

// ─── Version check failure ─────────────────────────────────────────────────

describe("runUpgrade — network failure", () => {
  it("warns when npm view fails", async () => {
    writePackageJson({}, { "@module-federation/vite": "^1.5.0" });

    mockExecSync.mockImplementation(() => {
      throw new Error("network timeout");
    });

    const log = captureLog();
    await runUpgrade({ projectDir: tmpDir, yes: true }, "1.0.0");

    expect(log.getOutput()).toContain("Could not check latest version");
    log.restore();
  });
});

// ─── Successful upgrade (with mocked execSync) ─────────────────────────────

describe("runUpgrade — successful upgrade", () => {
  it("runs install command and reports success", async () => {
    writePackageJson({}, { "@module-federation/vite": "^0.9.0" });

    // First call: getLatestVersion → returns "1.5.0"
    // Second call: the actual install command (execSync with stdio: 'inherit')
    let callCount = 0;
    mockExecSync.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // getLatestVersion
        return "1.5.0\n";
      }
      // install commands — update the package.json to simulate install
      fs.writeFileSync(
        path.join(tmpDir, "package.json"),
        JSON.stringify(
          {
            name: "test-project",
            private: true,
            dependencies: {},
            devDependencies: { "@module-federation/vite": "^1.5.0" },
          },
          null,
          2,
        ),
      );
      return "";
    });

    const log = captureLog();
    await runUpgrade({ projectDir: tmpDir, yes: true }, "1.0.0");

    const output = log.getOutput();
    expect(output).toContain("Upgrade complete");
    expect(output).toContain("successfully");
    log.restore();
  });
});
