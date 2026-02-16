import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  browseDirectory,
  detectProjectInfo,
  patchBuildTarget,
  sanitizePath,
  scanSourceFiles,
} from "../server.js";

let tmpDir: string;

function scaffoldProject(dir: string, name: string): string {
  const projectDir = path.join(dir, name);
  fs.mkdirSync(path.join(projectDir, "src", "components"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, "package.json"),
    JSON.stringify(
      {
        name,
        private: true,
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
        devDependencies: {
          vite: "^6.0.0",
          "@vitejs/plugin-react": "^4.0.0",
        },
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(projectDir, "vite.config.ts"),
    `import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
})
`,
  );
  fs.writeFileSync(
    path.join(projectDir, "src", "components", "index.ts"),
    'export const Button = () => "Button"\n',
  );
  fs.writeFileSync(path.join(projectDir, ".gitignore"), "node_modules\ndist\n");
  return projectDir;
}

describe("detectProjectInfo", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfa-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns project info for valid project", () => {
    const projectDir = scaffoldProject(tmpDir, "my-app");
    const result = detectProjectInfo(projectDir);

    expect(result.success).toBe(true);
    expect(result.project).toBeDefined();
    expect(result.project!.name).toBe("my-app");
    expect(result.project!.packageManager).toBeDefined();
    expect(result.project!.viteConfig).toBe("vite.config.ts");
    expect(result.project!.hasTailwind).toBe(false);
    expect(result.project!.hasFederation).toBe(false);
    expect(result.project!.srcDir).toContain("src");
  });

  it("returns error for non-existent directory", () => {
    const fakePath = path.join(tmpDir, "does-not-exist-xyz");
    const result = detectProjectInfo(fakePath);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Directory not found");
  });

  it("detects federation after init (simulated with manual config)", () => {
    const projectDir = scaffoldProject(tmpDir, "federation-app");
    const viteConfigPath = path.join(projectDir, "vite.config.ts");

    // Simulate post-init: inject federation config like runWizard would
    const configWithFederation = `import react from "@vitejs/plugin-react"
import { federation } from "@module-federation/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "federation-app",
      filename: "remoteEntry.js",
      exposes: {
        "./Button": "./src/components/Button.tsx",
      },
      shared: { react: { singleton: true } },
    }),
  ],
  server: { port: 5001 },
})
`;
    fs.writeFileSync(viteConfigPath, configWithFederation);

    const result = detectProjectInfo(projectDir);

    expect(result.success).toBe(true);
    expect(result.project!.hasFederation).toBe(true);
    expect(result.project!.role).toBe("remote");
    expect(result.project!.federationName).toBe("federation-app");
    expect(result.project!.exposes).toHaveProperty("./Button");
    expect(result.project!.port).toBe("5001");
  });
});

describe("browseDirectory", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfa-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("lists directory contents", () => {
    const subDirA = path.join(tmpDir, "folder-a");
    const subDirB = path.join(tmpDir, "folder-b");
    fs.mkdirSync(subDirA, { recursive: true });
    fs.mkdirSync(subDirB, { recursive: true });
    fs.writeFileSync(path.join(subDirA, "package.json"), "{}");

    const result = browseDirectory(tmpDir);

    expect(result.success).toBe(true);
    expect(result.current).toBe(tmpDir);
    expect(result.entries.length).toBeGreaterThanOrEqual(2);
    const names = result.entries.map((e) => e.name);
    expect(names).toContain("folder-a");
    expect(names).toContain("folder-b");
    const folderA = result.entries.find((e) => e.name === "folder-a");
    expect(folderA!.hasPackageJson).toBe(true);
    expect(folderA!.isDir).toBe(true);
  });

  it("returns error for non-existent directory", () => {
    const fakePath = path.join(tmpDir, "nonexistent-xyz-123");
    const result = browseDirectory(fakePath);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Directory not found");
    expect(result.entries).toEqual([]);
  });
});

describe("patchBuildTarget", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfa-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("adds build block when missing", () => {
    const projectDir = scaffoldProject(tmpDir, "no-build");
    const viteConfigPath = path.join(projectDir, "vite.config.ts");
    const configWithoutBuild = `import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
})
`;
    fs.writeFileSync(viteConfigPath, configWithoutBuild);

    patchBuildTarget(projectDir, "esnext");

    const content = fs.readFileSync(viteConfigPath, "utf-8");
    expect(content).toMatch(/build:\s*\{/);
    expect(content).toMatch(/target:\s*"esnext"/);
  });

  it("replaces existing target", () => {
    const projectDir = scaffoldProject(tmpDir, "has-target");
    const viteConfigPath = path.join(projectDir, "vite.config.ts");
    const configWithTarget = `import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  build: {
    target: "chrome89",
    outDir: "dist",
  },
})
`;
    fs.writeFileSync(viteConfigPath, configWithTarget);

    patchBuildTarget(projectDir, "es2022");

    const content = fs.readFileSync(viteConfigPath, "utf-8");
    expect(content).toMatch(/target:\s*"es2022"/);
    expect(content).not.toMatch(/target:\s*"chrome89"/);
    expect(content).toMatch(/outDir:\s*"dist"/);
  });

  it("adds target to existing build block", () => {
    const projectDir = scaffoldProject(tmpDir, "build-empty");
    const viteConfigPath = path.join(projectDir, "vite.config.ts");
    const configWithEmptyBuild = `import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  build: {},
})
`;
    fs.writeFileSync(viteConfigPath, configWithEmptyBuild);

    patchBuildTarget(projectDir, "chrome100");

    const content = fs.readFileSync(viteConfigPath, "utf-8");
    expect(content).toMatch(/build:\s*\{/);
    expect(content).toMatch(/target:\s*"chrome100"/);
  });
});

describe("scanSourceFiles", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfa-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("finds components", () => {
    const projectDir = scaffoldProject(tmpDir, "scan-app");
    fs.writeFileSync(
      path.join(projectDir, "src", "components", "Button.tsx"),
      "export const Button = () => <button>Click</button>\n",
    );
    fs.writeFileSync(
      path.join(projectDir, "src", "components", "Card.tsx"),
      "export const Card = () => <div>Card</div>\n",
    );

    const result = scanSourceFiles(projectDir);

    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThanOrEqual(2);
    const buttonFile = result.files.find((f) => f.relativePath.includes("Button"));
    const cardFile = result.files.find((f) => f.relativePath.includes("Card"));
    expect(buttonFile).toBeDefined();
    expect(cardFile).toBeDefined();
    expect(buttonFile!.kind).toBe("component");
    expect(buttonFile!.suggestedKey).toBe("./Button");
    expect(buttonFile!.exports).toContain("Button");
  });

  it("returns error for non-existent directory", () => {
    const fakePath = path.join(tmpDir, "nonexistent-dir-xyz");
    const result = scanSourceFiles(fakePath);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Directory not found");
    expect(result.files).toEqual([]);
  });

  it("extracts multiple export names", () => {
    const projectDir = scaffoldProject(tmpDir, "export-test");
    fs.writeFileSync(
      path.join(projectDir, "src", "components", "Multi.tsx"),
      "export const Foo = () => <div />\nexport function Bar() { return null }\nexport class Baz {}\n",
    );

    const result = scanSourceFiles(projectDir);
    const multi = result.files.find((f) => f.relativePath.includes("Multi"));
    expect(multi).toBeDefined();
    expect(multi!.exports).toContain("Foo");
    expect(multi!.exports).toContain("Bar");
    expect(multi!.exports).toContain("Baz");
  });

  it("skips test and spec files", () => {
    const projectDir = scaffoldProject(tmpDir, "skip-tests");
    fs.writeFileSync(
      path.join(projectDir, "src", "components", "Real.tsx"),
      "export const Real = () => <div />\n",
    );
    fs.writeFileSync(
      path.join(projectDir, "src", "components", "Real.test.tsx"),
      'test("renders", () => {})\n',
    );
    fs.writeFileSync(
      path.join(projectDir, "src", "components", "Real.spec.tsx"),
      'test("renders", () => {})\n',
    );

    const result = scanSourceFiles(projectDir);
    const paths = result.files.map((f) => f.relativePath);
    expect(paths.some((p) => p.includes(".test."))).toBe(false);
    expect(paths.some((p) => p.includes(".spec."))).toBe(false);
    expect(paths.some((p) => p.includes("Real.tsx"))).toBe(true);
  });

  it("skips __tests__ and __mocks__ directories", () => {
    const projectDir = path.join(tmpDir, "skip-dirs");
    fs.mkdirSync(path.join(projectDir, "src", "__tests__"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src", "__mocks__"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src", "components"), { recursive: true });

    fs.writeFileSync(
      path.join(projectDir, "src", "__tests__", "app.test.ts"),
      'test("a", () => {})',
    );
    fs.writeFileSync(path.join(projectDir, "src", "__mocks__", "api.ts"), "export const mock = {}");
    fs.writeFileSync(
      path.join(projectDir, "src", "components", "Real.tsx"),
      "export const Real = () => <div />",
    );

    const result = scanSourceFiles(projectDir);
    const paths = result.files.map((f) => f.relativePath);
    expect(paths.some((p) => p.includes("__tests__"))).toBe(false);
    expect(paths.some((p) => p.includes("__mocks__"))).toBe(false);
    expect(paths.some((p) => p.includes("Real.tsx"))).toBe(true);
  });

  it("sorts files by kind: component > hook > util > index > other", () => {
    const projectDir = scaffoldProject(tmpDir, "sort-test");
    fs.mkdirSync(path.join(projectDir, "src", "hooks"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "src", "utils"), { recursive: true });

    fs.writeFileSync(
      path.join(projectDir, "src", "hooks", "useAuth.ts"),
      "export const useAuth = () => ({})\n",
    );
    fs.writeFileSync(
      path.join(projectDir, "src", "utils", "format.ts"),
      "export const formatDate = (d: Date) => d.toISOString()\n",
    );

    const result = scanSourceFiles(projectDir);
    const kindOrder: Record<string, number> = {
      component: 0,
      hook: 1,
      util: 2,
      page: 3,
      index: 4,
      other: 5,
    };

    for (let i = 1; i < result.files.length; i++) {
      const prev = kindOrder[result.files[i - 1].kind] ?? 5;
      const curr = kindOrder[result.files[i].kind] ?? 5;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("uses parent folder name as key for index files", () => {
    const projectDir = scaffoldProject(tmpDir, "index-key");

    const result = scanSourceFiles(projectDir);
    const indexFile = result.files.find((f) => f.relativePath.includes("components/index.ts"));
    expect(indexFile).toBeDefined();
    expect(indexFile!.suggestedKey).toBe("./components");
    expect(indexFile!.kind).toBe("index");
  });

  it("handles empty src directory", () => {
    const projectDir = path.join(tmpDir, "empty-src");
    fs.mkdirSync(path.join(projectDir, "src"), { recursive: true });

    const result = scanSourceFiles(projectDir);
    expect(result.success).toBe(true);
    expect(result.files).toEqual([]);
  });
});

// ─── sanitizePath ────────────────────────────────────────────────────────────

describe("sanitizePath", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfa-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("resolves and returns a valid directory path", () => {
    const result = sanitizePath(tmpDir);
    expect(result).toBe(path.resolve(tmpDir));
  });

  it("throws on null bytes", () => {
    expect(() => sanitizePath(`${tmpDir}\0malicious`)).toThrow(/null bytes/i);
  });

  it("throws on nonexistent path", () => {
    expect(() => sanitizePath(path.join(tmpDir, "does-not-exist"))).toThrow(
      /not a valid directory/i,
    );
  });

  it("throws when path is a file, not a directory", () => {
    const file = path.join(tmpDir, "somefile.txt");
    fs.writeFileSync(file, "hello");
    expect(() => sanitizePath(file)).toThrow(/not a valid directory/i);
  });
});

// ─── browseDirectory (additional edge cases) ─────────────────────────────────

describe("browseDirectory edge cases", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfa-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("skips hidden dirs, node_modules, dist, build", () => {
    fs.mkdirSync(path.join(tmpDir, ".hidden"));
    fs.mkdirSync(path.join(tmpDir, "node_modules"));
    fs.mkdirSync(path.join(tmpDir, "dist"));
    fs.mkdirSync(path.join(tmpDir, "build"));
    fs.mkdirSync(path.join(tmpDir, "src"));

    const result = browseDirectory(tmpDir);
    expect(result.success).toBe(true);
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].name).toBe("src");
  });

  it("returns not-a-directory error when path is a file", () => {
    const file = path.join(tmpDir, "file.txt");
    fs.writeFileSync(file, "hi");
    const result = browseDirectory(file);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not a directory/i);
  });

  it("defaults to CWD when no dir provided", () => {
    const result = browseDirectory();
    expect(result.success).toBe(true);
    expect(result.current).toBe(path.resolve(process.cwd()));
  });

  it("sorts: package.json dirs first, then alphabetical", () => {
    fs.mkdirSync(path.join(tmpDir, "z-dir"));
    const proj = path.join(tmpDir, "a-project");
    fs.mkdirSync(proj);
    fs.writeFileSync(path.join(proj, "package.json"), "{}");
    fs.mkdirSync(path.join(tmpDir, "m-dir"));

    const result = browseDirectory(tmpDir);
    expect(result.entries[0].name).toBe("a-project");
    expect(result.entries[0].hasPackageJson).toBe(true);
  });

  it("provides parent directory", () => {
    const sub = path.join(tmpDir, "sub");
    fs.mkdirSync(sub);

    const result = browseDirectory(sub);
    expect(result.parent).toBe(tmpDir);
  });
});

// ─── detectProjectInfo (additional edge cases) ──────────────────────────────

describe("detectProjectInfo edge cases", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfa-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns error for directory without package.json", () => {
    const dir = path.join(tmpDir, "no-pkg");
    fs.mkdirSync(dir);
    const result = detectProjectInfo(dir);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/package\.json/i);
  });

  it("detects config file when present", () => {
    const dir = scaffoldProject(tmpDir, "with-config");
    fs.writeFileSync(
      path.join(dir, "mfa.config.json"),
      JSON.stringify({ role: "remote", name: "myRemote", port: "5001" }),
    );

    const result = detectProjectInfo(dir);
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config!.role).toBe("remote");
    expect(result.config!.name).toBe("myRemote");
    expect(result.config!.port).toBe("5001");
  });
});

// ─── patchBuildTarget (additional edge cases) ────────────────────────────────

describe("patchBuildTarget edge cases", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfa-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("does nothing when no vite config exists", () => {
    const dir = path.join(tmpDir, "no-config");
    fs.mkdirSync(dir);
    // Should not throw
    patchBuildTarget(dir, "esnext");
  });

  it("works with vite.config.js variant", () => {
    const dir = path.join(tmpDir, "js-variant");
    fs.mkdirSync(dir);
    fs.writeFileSync(
      path.join(dir, "vite.config.js"),
      "export default defineConfig({\n  plugins: [],\n})\n",
    );

    patchBuildTarget(dir, "es2021");

    const content = fs.readFileSync(path.join(dir, "vite.config.js"), "utf-8");
    expect(content).toMatch(/target:\s*"es2021"/);
  });
});
