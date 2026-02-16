/**
 * E2E tests for mfx commands: doctor, expose, remote.
 *
 * - runDoctor is non-interactive when projectDir is passed — full coverage.
 * - runExpose and runRemote require interactive prompts; we test error paths only
 *   (missing project, wrong role, no federation).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runConfig } from "../commands/config.js";
import { runDoctor } from "../commands/doctor.js";
import { runExpose } from "../commands/expose.js";
import { runWizard } from "../commands/init.js";
import { runRemote } from "../commands/remote.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

let tmpDir: string;

function scaffoldProject(name: string, opts?: { hasTailwind?: boolean }): string {
  const projectDir = path.join(tmpDir, name);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.mkdirSync(path.join(projectDir, "src", "components"), { recursive: true });

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

  fs.writeFileSync(
    path.join(projectDir, "src", "components", "index.ts"),
    'export const Button = () => "Button"\n',
  );
  fs.writeFileSync(path.join(projectDir, ".gitignore"), "node_modules\ndist\n");

  if (opts?.hasTailwind) {
    fs.writeFileSync(path.join(projectDir, "src", "index.css"), '@import "tailwindcss";\n');
  }

  return projectDir;
}

/** Add @module-federation/vite to package.json (wizard with --no-install skips npm install). */
function addFederationDep(projectDir: string): void {
  const pkgPath = path.join(projectDir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  pkg.devDependencies = pkg.devDependencies || {};
  pkg.devDependencies["@module-federation/vite"] = "^2.0.0";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

async function captureConsoleLog<T>(fn: () => Promise<T>): Promise<{ result: T; logs: string[] }> {
  const logs: string[] = [];
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    const result = await fn();
    return { result, logs };
  } finally {
    console.log = origLog;
  }
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfx-cmd-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── Doctor tests ────────────────────────────────────────────────────────────

describe("Doctor on unconfigured project", () => {
  it("reports failures for missing federation", async () => {
    const projectDir = scaffoldProject("unconfigured");

    const { logs } = await captureConsoleLog(async () => {
      await runDoctor({ projectDir }, "1.0.0-test");
    });

    const output = logs.join("\n");

    // Should report package.json pass (exists)
    expect(output).toMatch(/package\.json/i);

    // Should fail on federation / @module-federation/vite
    expect(
      output.includes("@module-federation/vite") ||
        output.includes("Federation") ||
        output.includes("federation"),
    ).toBe(true);

    // Should have some failure messaging
    expect(
      output.includes("Not installed") ||
        output.includes("not found") ||
        output.includes("run") ||
        output.includes("init"),
    ).toBe(true);
  });
});

describe("Doctor on configured remote project", () => {
  it("passes for package.json, vite config, federation, role=remote, exposed files", async () => {
    const projectDir = scaffoldProject("remote-configured");

    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "myRemote",
        port: "5001",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );
    addFederationDep(projectDir);

    const { logs } = await captureConsoleLog(async () => {
      await runDoctor({ projectDir }, "1.0.0-test");
    });

    const output = logs.join("\n");

    expect(output).toMatch(/package\.json/i);
    expect(output).toMatch(/Vite config|vite\.config/i);
    expect(output).toMatch(/Federation|@module-federation/i);
    expect(output).toMatch(/remote/i);
    expect(output).toMatch(/Expose|exposed|\.\/components/i);

    // Summary should show passed
    expect(output).toMatch(/passed/i);
  });
});

describe("Doctor on configured host project", () => {
  it("passes for role=host, remotes", async () => {
    const projectDir = scaffoldProject("host-configured");

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
    addFederationDep(projectDir);

    const { logs } = await captureConsoleLog(async () => {
      await runDoctor({ projectDir }, "1.0.0-test");
    });

    const output = logs.join("\n");

    expect(output).toMatch(/package\.json/i);
    expect(output).toMatch(/host/i);
    expect(output).toMatch(/Remote|remotes/i);
  });
});

describe("Doctor on missing project", () => {
  it("reports package.json fail for non-existent path", async () => {
    const nonExistent = path.join(tmpDir, "does-not-exist");

    const { logs } = await captureConsoleLog(async () => {
      await runDoctor({ projectDir: nonExistent }, "1.0.0-test");
    });

    const output = logs.join("\n");

    expect(output).toMatch(/package\.json/i);
    expect(
      output.includes("Not found") || output.includes("fail") || output.includes("failed"),
    ).toBe(true);
  });
});

// ─── Expose error-path tests ──────────────────────────────────────────────────

describe("Expose on non-configured project", () => {
  it("throws about federation not configured", async () => {
    const projectDir = scaffoldProject("no-federation");

    await expect(runExpose({ projectDir }, "1.0.0-test")).rejects.toThrow(
      /Module Federation is not configured|Run `mfx`/i,
    );
  });
});

describe("Expose on host project", () => {
  it("throws about host and suggests mfx remote", async () => {
    const projectDir = scaffoldProject("host-for-expose");

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

    await expect(runExpose({ projectDir }, "1.0.0-test")).rejects.toThrow(
      /host.*mfx remote|Use `mfx remote`/i,
    );
  });
});

// ─── Remote error-path tests ──────────────────────────────────────────────────

describe("Remote on non-configured project", () => {
  it("throws about federation not configured", async () => {
    const projectDir = scaffoldProject("no-federation-remote");

    await expect(runRemote({ projectDir }, "1.0.0-test")).rejects.toThrow(
      /Module Federation is not configured|Run `mfx`/i,
    );
  });
});

describe("Remote on remote project", () => {
  it("throws about remote and suggests mfx expose", async () => {
    const projectDir = scaffoldProject("remote-for-remote");

    await runWizard(
      {
        projectDir,
        role: "remote",
        name: "myRemote",
        port: "5001",
        yes: true,
        noInstall: true,
      },
      "1.0.0-test",
    );

    await expect(runRemote({ projectDir }, "1.0.0-test")).rejects.toThrow(
      /remote.*mfx expose|Use `mfx expose`/i,
    );
  });
});

// ─── Config: runConfig error paths ───────────────────────────────────────────

describe("Config on missing project", () => {
  it("throws when no package.json found", async () => {
    const emptyDir = path.join(tmpDir, "empty-no-pkg");
    fs.mkdirSync(emptyDir, { recursive: true });

    await expect(runConfig({ projectDir: emptyDir, yes: true }, "1.0.0-test")).rejects.toThrow(
      /No package\.json found|No package.json/i,
    );
  });

  it("throws when project directory does not exist at all", async () => {
    const nonExistent = path.join(tmpDir, "totally-missing");

    await expect(runConfig({ projectDir: nonExistent, yes: true }, "1.0.0-test")).rejects.toThrow(
      /No package\.json found|not found/i,
    );
  });
});

// ─── E2E: config file integration ───────────────────────────────────────────

describe("E2E: config file integration", () => {
  it("runWizard consumes mfa.config.json with role, name, port, exposes", async () => {
    const projectDir = scaffoldProject("config-remote");

    const configPath = path.join(projectDir, "mfa.config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          role: "remote",
          name: "myRemoteFromConfig",
          port: "5002",
          exposes: {
            "./components": "./src/components/index.ts",
            "./utils": "./src/utils.ts",
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    // Create utils file so the expose path exists
    fs.writeFileSync(path.join(projectDir, "src", "utils.ts"), "export const util = 1\n");

    await captureConsoleLog(async () => {
      await runWizard(
        {
          projectDir,
          config: configPath,
          yes: true,
          noInstall: true,
        },
        "1.0.0-test",
      );
    });

    const viteConfigPath = path.join(projectDir, "vite.config.ts");
    const viteContent = fs.readFileSync(viteConfigPath, "utf-8");

    expect(viteContent).toMatch(/myRemoteFromConfig/);
    expect(viteContent).toMatch(/5002/);
    expect(viteContent).toMatch(/\.\/components.*\.\/src\/components\/index\.ts/);
    expect(viteContent).toMatch(/\.\/utils.*\.\/src\/utils\.ts/);
  });

  it("runWizard consumes host config with remotes", async () => {
    const projectDir = scaffoldProject("config-host");

    const configPath = path.join(projectDir, "mfa.config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          role: "host",
          name: "myHostFromConfig",
          port: "5000",
          remotes: {
            remote1: { entry: "http://localhost:5001/remoteEntry.js" },
            remote2: { entry: "http://localhost:5002/remoteEntry.js" },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    await captureConsoleLog(async () => {
      await runWizard(
        {
          projectDir,
          config: configPath,
          yes: true,
          noInstall: true,
        },
        "1.0.0-test",
      );
    });

    const viteConfigPath = path.join(projectDir, "vite.config.ts");
    const viteContent = fs.readFileSync(viteConfigPath, "utf-8");

    expect(viteContent).toMatch(/myHostFromConfig/);
    expect(viteContent).toMatch(/remote1/);
    expect(viteContent).toMatch(/remote2/);
    expect(viteContent).toMatch(/http:\/\/localhost:5001\/remoteEntry\.js/);
    expect(viteContent).toMatch(/http:\/\/localhost:5002\/remoteEntry\.js/);
  });

  it("runWizard reads buildTarget from mfa.config.json", async () => {
    const projectDir = scaffoldProject("config-buildtarget");

    const configPath = path.join(projectDir, "mfa.config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          role: "remote",
          name: "remoteApp",
          port: "5001",
          buildTarget: "esnext",
        },
        null,
        2,
      ),
      "utf-8",
    );

    await captureConsoleLog(async () => {
      await runWizard(
        {
          projectDir,
          config: configPath,
          yes: true,
          noInstall: true,
        },
        "1.0.0-test",
      );
    });

    const viteConfigPath = path.join(projectDir, "vite.config.ts");
    const viteContent = fs.readFileSync(viteConfigPath, "utf-8");

    expect(viteContent).toMatch(/target:\s*["']esnext["']/);
  });

  it("config file with shared dependencies is consumed", async () => {
    const projectDir = scaffoldProject("config-shared");

    const configPath = path.join(projectDir, "mfa.config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          role: "remote",
          name: "remoteWithShared",
          port: "5001",
          shared: {
            "react-router-dom": { singleton: true },
          },
        },
        null,
        2,
      ),
      "utf-8",
    );

    await captureConsoleLog(async () => {
      await runWizard(
        {
          projectDir,
          config: configPath,
          yes: true,
          noInstall: true,
        },
        "1.0.0-test",
      );
    });

    const viteConfigPath = path.join(projectDir, "vite.config.ts");
    const viteContent = fs.readFileSync(viteConfigPath, "utf-8");

    expect(viteContent).toMatch(/"react-router-dom"/);
    expect(viteContent).toMatch(/singleton:\s*true/);
  });
});
