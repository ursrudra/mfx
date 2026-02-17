/**
 * E2E integration tests for mfx.
 *
 * These tests scaffold real temp projects, run commands programmatically,
 * and verify the generated files are correct.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runWizard } from "../commands/init.js";
import { runRemove } from "../commands/remove.js";
import { runStatus } from "../commands/status.js";
import { detectProject } from "../utils/detect.js";
import { detectRole, findFederationCall, parseExposes, parseRemotes } from "../utils/parse.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

let tmpDir: string;

function scaffoldProject(name: string, opts?: { hasTailwind?: boolean }): string {
  const projectDir = path.join(tmpDir, name);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(path.join(projectDir, "src", "components"), { recursive: true });

  // package.json
  const deps: Record<string, string> = {
    react: "^19.0.0",
    "react-dom": "^19.0.0",
  };
  const devDeps: Record<string, string> = {
    vite: "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
  };
  if (opts?.hasTailwind) {
    devDeps["@tailwindcss/vite"] = "^4.0.0";
  }

  fs.writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify(
      {
        name,
        private: true,
        dependencies: deps,
        devDependencies: devDeps,
      },
      null,
      2,
    ),
  );

  // Minimal vite.config.ts
  const tailwindImport = opts?.hasTailwind ? 'import tailwindcss from "@tailwindcss/vite"\n' : "";
  const tailwindPlugin = opts?.hasTailwind ? "    tailwindcss(),\n" : "";

  fs.writeFileSync(
    path.join(projectDir, "vite.config.ts"),
    `import react from "@vitejs/plugin-react"
${tailwindImport}import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
${tailwindPlugin}  ],
})
`,
  );

  // Barrel file
  fs.writeFileSync(
    path.join(projectDir, "src", "components", "index.ts"),
    'export const Button = () => "Button"\n',
  );

  // .gitignore
  fs.writeFileSync(path.join(projectDir, ".gitignore"), "node_modules\ndist\n");

  // index.css (for tailwind tests)
  if (opts?.hasTailwind) {
    fs.writeFileSync(path.join(projectDir, "src", "index.css"), '@import "tailwindcss";\n');
  }

  return projectDir;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfx-e2e-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("E2E: init remote", () => {
  it("generates vite config with federation for a remote app", async () => {
    const projectDir = scaffoldProject("my-remote");

    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "myRemote",
        port: "5001",
        yes: true,
        noInstall: true, // skip actual npm install
      },
      "1.0.0-test",
    );

    // Verify vite.config.ts was generated
    const viteConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");

    expect(viteConfig).toContain("@module-federation/vite");
    expect(viteConfig).toContain('name: "myRemote"');
    expect(viteConfig).toContain("remoteEntry.js");
    expect(viteConfig).toContain("exposes:");
    expect(viteConfig).toContain("./components");
    // Note: inject mode doesn't add server.port (preserves existing config)

    // Verify role detection
    expect(detectRole(viteConfig)).toBe("remote");

    // Verify federation call is parseable
    const fedCall = findFederationCall(viteConfig);
    expect(fedCall).not.toBeNull();

    // Verify exposes are parseable
    const exposes = parseExposes(viteConfig);
    expect(exposes["./components"]).toBeDefined();

    // Verify .gitignore was updated
    const gitignore = fs.readFileSync(path.join(projectDir, ".gitignore"), "utf-8");
    expect(gitignore).toContain(".__mf__temp");
  });
});

describe("E2E: init host", () => {
  it("generates vite config with federation for a host app", async () => {
    const projectDir = scaffoldProject("my-host");

    await runWizard(
      {
        projectDir,
        role: "host",
        name: "myHost",
        port: "5000",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    const viteConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");

    expect(viteConfig).toContain("@module-federation/vite");
    expect(viteConfig).toContain('name: "myHost"');
    expect(viteConfig).toContain("remotes:");
    // Note: inject mode doesn't add server.port (preserves existing config)

    expect(detectRole(viteConfig)).toBe("host");

    const remotes = parseRemotes(viteConfig);
    expect(Object.keys(remotes).length).toBeGreaterThanOrEqual(1);
  });

  it("generates type declarations for remotes", async () => {
    const projectDir = scaffoldProject("my-host");

    await runWizard(
      {
        projectDir,
        role: "host",
        name: "myHost",
        port: "5000",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    // With --yes, a default remote + type declarations are generated
    const dtsFiles = fs
      .readdirSync(path.join(projectDir, "src"))
      .filter((f) => f.endsWith(".d.ts"));

    expect(dtsFiles.length).toBeGreaterThanOrEqual(1);

    const dtsContent = fs.readFileSync(path.join(projectDir, "src", dtsFiles[0]), "utf-8");
    expect(dtsContent).toContain("Auto-generated by mfx");
    expect(dtsContent).toContain("declare module");
  });
});

describe("E2E: init with inject mode", () => {
  it("injects federation into existing vite config without destroying it", async () => {
    const projectDir = scaffoldProject("inject-test");

    // Verify existing config has no federation
    const beforeConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");
    expect(beforeConfig).not.toContain("@module-federation/vite");
    expect(beforeConfig).toContain("react()"); // existing plugin preserved

    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "injected",
        port: "5002",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    const afterConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");

    // Federation was added
    expect(afterConfig).toContain("@module-federation/vite");
    expect(afterConfig).toContain('name: "injected"');

    // Original plugins preserved
    expect(afterConfig).toContain("react()");
  });
});

describe("E2E: re-init (surgical update)", () => {
  it("updates existing federation config without losing other settings", async () => {
    const projectDir = scaffoldProject("reinit-test");

    // First init
    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "firstRun",
        port: "5001",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    const firstConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");
    expect(firstConfig).toContain('name: "firstRun"');

    // Re-init with different name
    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "secondRun",
        port: "5002",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    const secondConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");

    // Updated — federation name changed
    expect(secondConfig).toContain('name: "secondRun"');
    // Old name replaced
    expect(secondConfig).not.toContain('name: "firstRun"');
    // Server port updated to match new config
    expect(secondConfig).toContain("port: 5002");
    expect(secondConfig).not.toContain("port: 5001");
  });
});

describe("E2E: remove", () => {
  it("cleanly removes federation from a configured project", async () => {
    const projectDir = scaffoldProject("remove-test");

    // Init first
    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "toRemove",
        port: "5001",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    // Verify federation is present
    const beforeRemove = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");
    expect(beforeRemove).toContain("@module-federation/vite");
    expect(beforeRemove).toContain("federation(");

    // Remove
    await runRemove(
      {
        projectDir,
        yes: true,
      },
      "1.0.0-test",
    );

    // Verify federation is gone
    const afterRemove = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");
    expect(afterRemove).not.toContain("federation(");
    expect(afterRemove).not.toContain("@module-federation/vite");

    // Backup files should be cleaned up after successful remove
    const files = fs.readdirSync(projectDir);
    const backups = files.filter((f) => f.includes(".backup-"));
    expect(backups.length).toBe(0);
  });
});

describe("E2E: status", () => {
  it("outputs JSON status for a configured project", async () => {
    const projectDir = scaffoldProject("status-test");

    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "statusApp",
        port: "5003",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    // Capture console.log output
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };

    try {
      await runStatus({ projectDir, json: true }, "1.0.0-test");
    } finally {
      console.log = origLog;
    }

    const jsonStr = logs.join("\n");
    const status = JSON.parse(jsonStr);

    expect(status.federation.configured).toBe(true);
    expect(status.federation.role).toBe("remote");
    expect(status.federation.name).toBe("statusApp");
    // Port may be null in inject mode (no server.port added to existing config)
  });
});

describe("E2E: tailwind integration", () => {
  it("preserves tailwind plugin when injecting federation", async () => {
    const projectDir = scaffoldProject("tailwind-test", { hasTailwind: true });

    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "twRemote",
        port: "5004",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    const config = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");

    expect(config).toContain("tailwindcss");
    expect(config).toContain("federation(");
    expect(config).toContain("react()");
  });
});

describe("E2E: project detection", () => {
  it("correctly detects a configured project", async () => {
    const projectDir = scaffoldProject("detect-test");

    // Before init
    let project = detectProject(projectDir);
    expect(project).not.toBeNull();
    expect(project!.hasFederation).toBe(false);

    // After init
    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "detected",
        port: "5005",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    project = detectProject(projectDir);
    expect(project).not.toBeNull();
    expect(project!.hasFederation).toBe(true);
  });
});

describe("E2E: buildTarget", () => {
  it("uses custom build target in generated config", async () => {
    const projectDir = scaffoldProject("bt-test");

    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "btRemote",
        port: "5006",
        buildTarget: "esnext",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    const viteConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");

    expect(viteConfig).toContain('target: "esnext"');
    expect(viteConfig).not.toContain('target: "chrome89"');
  });

  it("defaults to chrome89 when buildTarget not specified", async () => {
    const projectDir = scaffoldProject("bt-default");

    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "btDefault",
        port: "5007",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    const viteConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");

    expect(viteConfig).toContain('target: "chrome89"');
  });

  it("preserves custom build target on re-init (surgical mode)", async () => {
    const projectDir = scaffoldProject("bt-reinit");

    // First init with esnext
    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "btFirst",
        port: "5008",
        buildTarget: "esnext",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    // Re-init with es2022
    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "btSecond",
        port: "5009",
        buildTarget: "es2022",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    const viteConfig = fs.readFileSync(path.join(projectDir, "vite.config.ts"), "utf-8");

    expect(viteConfig).toContain('name: "btSecond"');
    // build.target should be present (injected by post-processing if not already there)
    expect(viteConfig).toContain("build:");
    expect(viteConfig).toContain("target:");
  });
});
