import { describe, expect, it } from "vitest";
import {
  generateFederationImport,
  generateFederationSnippet,
  generateHostViteConfig,
  generateRemoteViteConfig,
  generateTypeDeclaration,
  injectTailwindSource,
} from "../generate.js";

describe("generateRemoteViteConfig", () => {
  it("generates a valid remote config", () => {
    const result = generateRemoteViteConfig({
      name: "myRemote",
      port: "5001",
      exposes: { "./components": "./src/components/index.ts" },
      shared: { react: { singleton: true }, "react-dom": { singleton: true } },
      hasTailwind: false,
    });

    expect(result).toContain('name: "myRemote"');
    expect(result).toContain("port: 5001");
    expect(result).toContain('filename: "remoteEntry.js"');
    expect(result).toContain('"./components": "./src/components/index.ts"');
    expect(result).toContain("singleton: true");
    expect(result).toContain("@module-federation/vite");
    expect(result).toContain("defineConfig");
    expect(result).not.toContain("tailwindcss");
  });

  it("includes tailwind when hasTailwind is true", () => {
    const result = generateRemoteViteConfig({
      name: "myRemote",
      port: "5001",
      exposes: {},
      shared: { react: { singleton: true } },
      hasTailwind: true,
    });

    expect(result).toContain("tailwindcss");
    expect(result).toContain("@tailwindcss/vite");
  });

  it("includes server origin for remote", () => {
    const result = generateRemoteViteConfig({
      name: "r",
      port: "5001",
      exposes: {},
      shared: {},
      hasTailwind: false,
    });

    expect(result).toContain('origin: "http://localhost:5001"');
    expect(result).toContain("strictPort: true");
  });

  it("uses custom build target when specified", () => {
    const result = generateRemoteViteConfig({
      name: "r",
      port: "5001",
      exposes: {},
      shared: {},
      hasTailwind: false,
      buildTarget: "esnext",
    });
    expect(result).toContain('target: "esnext"');
    expect(result).not.toContain('target: "chrome89"');
  });

  it("defaults to chrome89 when buildTarget not specified", () => {
    const result = generateRemoteViteConfig({
      name: "r",
      port: "5001",
      exposes: {},
      shared: {},
      hasTailwind: false,
    });
    expect(result).toContain('target: "chrome89"');
  });

  it("does not produce duplicate dts keys", () => {
    const result = generateRemoteViteConfig({
      name: "r",
      port: "5001",
      exposes: {},
      shared: {},
      hasTailwind: false,
      dts: false,
    });
    const matches = result.match(/\bdts\s*:/g);
    expect(matches).toHaveLength(1);
  });

  it("does not produce duplicate dts keys when dts is true", () => {
    const result = generateRemoteViteConfig({
      name: "r",
      port: "5001",
      exposes: {},
      shared: {},
      hasTailwind: false,
      dts: true,
    });
    const matches = result.match(/\bdts\s*:/g);
    expect(matches).toHaveLength(1);
    expect(result).toContain("dts: true");
  });
});

describe("generateHostViteConfig", () => {
  it("generates a valid host config", () => {
    const result = generateHostViteConfig({
      name: "myHost",
      port: "5000",
      remotes: {
        remote1: {
          name: "remote1",
          entry: "http://localhost:5001/remoteEntry.js",
        },
      },
      shared: { react: { singleton: true } },
      hasTailwind: false,
    });

    expect(result).toContain('name: "myHost"');
    expect(result).toContain("port: 5000");
    expect(result).toContain("remote1");
    expect(result).toContain("http://localhost:5001/remoteEntry.js");
    expect(result).toContain('type: "module"');
    expect(result).not.toContain("origin:");
  });

  it("handles multiple remotes", () => {
    const result = generateHostViteConfig({
      name: "host",
      port: "5000",
      remotes: {
        r1: { name: "r1", entry: "http://localhost:5001/remoteEntry.js" },
        r2: { name: "r2", entry: "http://localhost:5002/remoteEntry.js" },
      },
      shared: {},
      hasTailwind: false,
    });

    expect(result).toContain("r1:");
    expect(result).toContain("r2:");
    expect(result).toContain(":5001");
    expect(result).toContain(":5002");
  });

  it("uses custom build target when specified", () => {
    const result = generateHostViteConfig({
      name: "h",
      port: "5000",
      remotes: {},
      shared: {},
      hasTailwind: false,
      buildTarget: "es2022",
    });
    expect(result).toContain('target: "es2022"');
    expect(result).not.toContain('target: "chrome89"');
  });

  it("defaults to chrome89 when buildTarget not specified", () => {
    const result = generateHostViteConfig({
      name: "h",
      port: "5000",
      remotes: {},
      shared: {},
      hasTailwind: false,
    });
    expect(result).toContain('target: "chrome89"');
  });

  it("does not produce duplicate dts keys", () => {
    const result = generateHostViteConfig({
      name: "h",
      port: "5000",
      remotes: {},
      shared: {},
      hasTailwind: false,
      dts: false,
    });
    const matches = result.match(/\bdts\s*:/g);
    expect(matches).toHaveLength(1);
  });
});

describe("generateFederationSnippet", () => {
  it("generates a remote snippet", () => {
    const result = generateFederationSnippet({
      name: "r",
      role: "remote",
      port: "5001",
      exposes: { "./components": "./src/components/index.ts" },
      shared: { react: { singleton: true } },
    });

    expect(result).toMatch(/^federation\(/);
    expect(result).toContain('name: "r"');
    expect(result).toContain("exposes:");
    expect(result).toContain("./components");
    expect(result).not.toContain("remotes:");
  });

  it("generates a host snippet", () => {
    const result = generateFederationSnippet({
      name: "h",
      role: "host",
      port: "5000",
      remotes: {
        r: { name: "r", entry: "http://localhost:5001/remoteEntry.js" },
      },
      shared: {},
    });

    expect(result).toMatch(/^federation\(/);
    expect(result).toContain('name: "h"');
    expect(result).toContain("remotes:");
    expect(result).not.toContain("exposes:");
  });

  it("does not produce duplicate dts keys in remote snippet", () => {
    const result = generateFederationSnippet({
      name: "r",
      role: "remote",
      port: "5001",
      exposes: { "./App": "./src/App.tsx" },
      shared: {},
      dts: false,
    });
    const matches = result.match(/\bdts\s*:/g);
    expect(matches).toHaveLength(1);
  });

  it("does not produce duplicate dts keys in host snippet", () => {
    const result = generateFederationSnippet({
      name: "h",
      role: "host",
      port: "5000",
      remotes: { r: { name: "r", entry: "http://localhost:5001/remoteEntry.js" } },
      shared: {},
      dts: true,
    });
    const matches = result.match(/\bdts\s*:/g);
    expect(matches).toHaveLength(1);
    expect(result).toContain("dts: true");
  });
});

describe("generateFederationImport", () => {
  it("generates the correct import statement", () => {
    const result = generateFederationImport();
    expect(result).toBe('import { federation } from "@module-federation/vite"');
  });
});

describe("generateTypeDeclaration", () => {
  it("generates type declarations for string exports (legacy)", () => {
    const result = generateTypeDeclaration("remote", {
      "./components": ["Button", "Card"],
    });

    expect(result).toContain('declare module "remote/components"');
    expect(result).toContain("export const Button: FC");
    expect(result).toContain("export const Card: FC");
    expect(result).toContain('import type { FC } from "react"');
    expect(result).toContain("Auto-generated by mfx");
  });

  it("generates type declarations for typed exports", () => {
    const result = generateTypeDeclaration("remote", {
      "./hooks": [
        { name: "useAuth", kind: "hook" },
        { name: "AuthContext", kind: "type" },
        { name: "API_URL", kind: "constant" },
      ],
    });

    expect(result).toContain('declare module "remote/hooks"');
    expect(result).toContain("export function useAuth(");
    expect(result).toContain("export type AuthContext =");
    expect(result).toContain("export const API_URL:");
    // No FC import needed for hooks/types/constants
    expect(result).not.toContain("import type { FC }");
  });

  it("handles mixed string and typed exports", () => {
    const result = generateTypeDeclaration("remote", {
      "./components": ["Button", { name: "useToggle", kind: "hook" }],
    });

    expect(result).toContain("export const Button: FC");
    expect(result).toContain("export function useToggle(");
    expect(result).toContain("import type { FC }");
  });

  it("generates multiple module declarations", () => {
    const result = generateTypeDeclaration("remote", {
      "./components": ["Button"],
      "./utils": [{ name: "formatDate", kind: "utility" }],
    });

    expect(result).toContain('declare module "remote/components"');
    expect(result).toContain('declare module "remote/utils"');
  });
});

describe("injectTailwindSource", () => {
  it("injects @source after last @import", () => {
    const css = `@import "tailwindcss";\n\n.foo { color: red; }`;
    const result = injectTailwindSource(css, "remote", "../../remote/src");

    expect(result).not.toBeNull();
    expect(result).toContain('@source "../../remote/src"');
    expect(result).toContain("/* Scan remote source files");
  });

  it("returns null if directive already exists", () => {
    const css = `@import "tailwindcss";\n@source "../../remote/src";\n`;
    const result = injectTailwindSource(css, "remote", "../../remote/src");

    expect(result).toBeNull();
  });

  it("injects at the top if no @import found", () => {
    const css = `.foo { color: red; }`;
    const result = injectTailwindSource(css, "remote", "../../remote/src");

    expect(result).not.toBeNull();
    expect(result!.indexOf("@source")).toBeLessThan(result!.indexOf(".foo"));
  });

  it("injects after @source if that's the last directive", () => {
    const css = `@import "tailwindcss";\n@source "../other/src";\n\n.foo {}`;
    const result = injectTailwindSource(css, "remote", "../../remote/src");

    expect(result).not.toBeNull();
    expect(result).toContain('@source "../../remote/src"');
  });
});
