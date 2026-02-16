import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PackageJson } from "../../types.js";
import {
  detectPackageManager,
  detectProject,
  detectSrcDir,
  detectTailwindV4,
  detectViteConfig,
  getInstallCommand,
  hasFederationAlready,
  readPackageJson,
} from "../detect.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfx-detect-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("detectPackageManager", () => {
  it("returns pnpm when pnpm-lock.yaml exists", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "");
    expect(detectPackageManager(tmpDir)).toBe("pnpm");
  });

  it("returns yarn when yarn.lock exists", () => {
    fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
    expect(detectPackageManager(tmpDir)).toBe("yarn");
  });

  it("returns bun when bun.lockb exists", () => {
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    expect(detectPackageManager(tmpDir)).toBe("bun");
  });

  it("returns npm when no lock file exists", () => {
    expect(detectPackageManager(tmpDir)).toBe("npm");
  });

  it("prefers pnpm over yarn when both exist", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "");
    fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
    expect(detectPackageManager(tmpDir)).toBe("pnpm");
  });

  it("prefers pnpm over bun when both exist", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "");
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    expect(detectPackageManager(tmpDir)).toBe("pnpm");
  });

  it("prefers yarn over bun when both exist", () => {
    fs.writeFileSync(path.join(tmpDir, "yarn.lock"), "");
    fs.writeFileSync(path.join(tmpDir, "bun.lockb"), "");
    expect(detectPackageManager(tmpDir)).toBe("yarn");
  });
});

describe("detectViteConfig", () => {
  it("returns ts config when vite.config.ts exists", () => {
    const configPath = path.join(tmpDir, "vite.config.ts");
    fs.writeFileSync(configPath, "export default {}");
    const result = detectViteConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.path).toBe(configPath);
    expect(result!.lang).toBe("ts");
  });

  it("returns mts config when vite.config.mts exists", () => {
    const configPath = path.join(tmpDir, "vite.config.mts");
    fs.writeFileSync(configPath, "export default {}");
    const result = detectViteConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.path).toBe(configPath);
    expect(result!.lang).toBe("ts");
  });

  it("returns js config when vite.config.js exists", () => {
    const configPath = path.join(tmpDir, "vite.config.js");
    fs.writeFileSync(configPath, "export default {}");
    const result = detectViteConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.path).toBe(configPath);
    expect(result!.lang).toBe("js");
  });

  it("prefers .ts over .mts when both exist", () => {
    fs.writeFileSync(path.join(tmpDir, "vite.config.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "vite.config.mts"), "");
    const result = detectViteConfig(tmpDir);
    expect(result!.path).toContain("vite.config.ts");
  });

  it("prefers .ts over .js when both exist", () => {
    fs.writeFileSync(path.join(tmpDir, "vite.config.ts"), "");
    fs.writeFileSync(path.join(tmpDir, "vite.config.js"), "");
    const result = detectViteConfig(tmpDir);
    expect(result!.path).toContain("vite.config.ts");
  });

  it("prefers .mts over .js when both exist", () => {
    fs.writeFileSync(path.join(tmpDir, "vite.config.mts"), "");
    fs.writeFileSync(path.join(tmpDir, "vite.config.js"), "");
    const result = detectViteConfig(tmpDir);
    expect(result!.path).toContain("vite.config.mts");
  });

  it("returns null when no vite config exists", () => {
    expect(detectViteConfig(tmpDir)).toBeNull();
  });
});

describe("detectTailwindV4", () => {
  it("returns true when @tailwindcss/vite is in dependencies", () => {
    const pkg: PackageJson = {
      name: "test",
      dependencies: { "@tailwindcss/vite": "^4.0.0" },
    };
    expect(detectTailwindV4(pkg)).toBe(true);
  });

  it("returns true when @tailwindcss/vite is in devDependencies", () => {
    const pkg: PackageJson = {
      name: "test",
      devDependencies: { "@tailwindcss/vite": "^4.0.0" },
    };
    expect(detectTailwindV4(pkg)).toBe(true);
  });

  it("returns false when @tailwindcss/vite is not present", () => {
    const pkg: PackageJson = {
      name: "test",
      dependencies: { tailwindcss: "^3.0.0" },
    };
    expect(detectTailwindV4(pkg)).toBe(false);
  });

  it("returns false when dependencies are empty", () => {
    const pkg: PackageJson = { name: "test" };
    expect(detectTailwindV4(pkg)).toBe(false);
  });
});

describe("hasFederationAlready", () => {
  it("returns true when config contains @module-federation/vite import", () => {
    const content = `import { federation } from "@module-federation/vite"
export default defineConfig({ plugins: [] });`;
    expect(hasFederationAlready(content)).toBe(true);
  });

  it("returns true when config contains federation( function call", () => {
    const content = `plugins: [ federation({ name: "app" }) ]`;
    expect(hasFederationAlready(content)).toBe(true);
  });

  it("returns false when neither import nor function call present", () => {
    const content = `import { defineConfig } from "vite"
export default defineConfig({ plugins: [react()] });`;
    expect(hasFederationAlready(content)).toBe(false);
  });
});

describe("detectSrcDir", () => {
  it("returns src when src/ directory exists", () => {
    fs.mkdirSync(path.join(tmpDir, "src"));
    expect(detectSrcDir(tmpDir)).toBe("src");
  });

  it("returns app when app/ directory exists", () => {
    fs.mkdirSync(path.join(tmpDir, "app"));
    expect(detectSrcDir(tmpDir)).toBe("app");
  });

  it("prefers src over app when both exist", () => {
    fs.mkdirSync(path.join(tmpDir, "src"));
    fs.mkdirSync(path.join(tmpDir, "app"));
    expect(detectSrcDir(tmpDir)).toBe("src");
  });

  it("returns src as default when neither exists", () => {
    expect(detectSrcDir(tmpDir)).toBe("src");
  });
});

describe("readPackageJson", () => {
  it("returns parsed package.json for valid JSON", () => {
    const pkg = { name: "my-app", version: "1.0.0" };
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify(pkg));
    const result = readPackageJson(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("my-app");
    expect(result!.version).toBe("1.0.0");
  });

  it("returns null when package.json does not exist", () => {
    expect(readPackageJson(tmpDir)).toBeNull();
  });
});

describe("detectProject", () => {
  it("returns null when no package.json exists", () => {
    expect(detectProject(tmpDir)).toBeNull();
  });

  it("returns full ProjectInfo for a valid project", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "my-app",
        dependencies: { react: "^18.0.0" },
      }),
    );
    fs.writeFileSync(path.join(tmpDir, "vite.config.ts"), "export default {}");
    fs.mkdirSync(path.join(tmpDir, "src"));

    const result = detectProject(tmpDir);

    expect(result).not.toBeNull();
    expect(result!.targetDir).toBe(tmpDir);
    expect(result!.packageJson.name).toBe("my-app");
    expect(result!.packageManager).toBe("npm");
    expect(result!.viteConfig).not.toBeNull();
    expect(result!.viteConfig!.lang).toBe("ts");
    expect(result!.hasTailwind).toBe(false);
    expect(result!.srcDir).toBe("src");
    expect(result!.hasFederation).toBe(false);
  });

  it("detects hasFederation when vite config contains federation", () => {
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "fed-app" }));
    fs.writeFileSync(
      path.join(tmpDir, "vite.config.ts"),
      'import { federation } from "@module-federation/vite"\nexport default defineConfig({ plugins: [federation({})] })',
    );

    const result = detectProject(tmpDir);

    expect(result).not.toBeNull();
    expect(result!.hasFederation).toBe(true);
  });

  it("detects hasTailwind when @tailwindcss/vite is in package.json", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "tw-app",
        devDependencies: { "@tailwindcss/vite": "^4.0.0" },
      }),
    );

    const result = detectProject(tmpDir);

    expect(result).not.toBeNull();
    expect(result!.hasTailwind).toBe(true);
  });

  it("detects package manager from lock file", () => {
    fs.writeFileSync(path.join(tmpDir, "pnpm-lock.yaml"), "");
    fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "pnpm-app" }));

    const result = detectProject(tmpDir);

    expect(result).not.toBeNull();
    expect(result!.packageManager).toBe("pnpm");
  });
});

describe("getInstallCommand", () => {
  it("returns pnpm dev install command", () => {
    expect(getInstallCommand("pnpm", "@module-federation/vite", true)).toBe(
      "pnpm add -D @module-federation/vite",
    );
  });

  it("returns pnpm prod install command", () => {
    expect(getInstallCommand("pnpm", "react", false)).toBe("pnpm add react");
  });

  it("returns yarn dev install command", () => {
    expect(getInstallCommand("yarn", "@module-federation/vite", true)).toBe(
      "yarn add -D @module-federation/vite",
    );
  });

  it("returns yarn prod install command", () => {
    expect(getInstallCommand("yarn", "react", false)).toBe("yarn add react");
  });

  it("returns bun dev install command", () => {
    expect(getInstallCommand("bun", "@module-federation/vite", true)).toBe(
      "bun add -D @module-federation/vite",
    );
  });

  it("returns bun prod install command", () => {
    expect(getInstallCommand("bun", "react", false)).toBe("bun add react");
  });

  it("returns npm dev install command", () => {
    expect(getInstallCommand("npm", "@module-federation/vite", true)).toBe(
      "npm install -D @module-federation/vite",
    );
  });

  it("returns npm prod install command", () => {
    expect(getInstallCommand("npm", "react", false)).toBe("npm install react");
  });

  it("defaults to dev when third param omitted", () => {
    expect(getInstallCommand("npm", "pkg")).toBe("npm install -D pkg");
  });
});
