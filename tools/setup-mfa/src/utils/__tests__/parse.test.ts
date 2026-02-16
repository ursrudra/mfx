import { describe, expect, it } from "vitest";
import {
  detectRole,
  findFederationCall,
  findPluginsArray,
  parseExposes,
  parseRemotes,
  replaceExposesBlock,
  replaceRemotesBlock,
} from "../parse.js";

// ─── Sample configs ─────────────────────────────────────────────────────────

const REMOTE_CONFIG = `
import { federation } from "@module-federation/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "remote",
      filename: "remoteEntry.js",
      exposes: {
        "./components": "./src/components/index.ts",
        "./hooks": "./src/hooks/index.ts",
      },
      shared: {
        react: { singleton: true },
      },
    }),
  ],
})
`;

const HOST_CONFIG = `
import { federation } from "@module-federation/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "host",
      remotes: {
        remote1: {
          type: "module",
          name: "remote1",
          entry: "http://localhost:5001/remoteEntry.js",
          entryGlobalName: "remote1",
          shareScope: "default",
        },
        remote2: {
          type: "module",
          name: "remote2",
          entry: "http://localhost:5002/remoteEntry.js",
          entryGlobalName: "remote2",
          shareScope: "default",
        },
      },
      shared: {
        react: { singleton: true },
      },
    }),
  ],
})
`;

const SINGLE_QUOTE_CONFIG = `
import { federation } from '@module-federation/vite'

export default defineConfig({
  plugins: [
    federation({
      name: 'remote',
      exposes: {
        './components': './src/components/index.ts',
        './hooks': './src/hooks/index.ts',
      },
    }),
  ],
})
`;

const CONFIG_WITH_STRINGS_IN_BRACES = `
import { federation } from "@module-federation/vite"

export default defineConfig({
  plugins: [
    federation({
      name: "my{app}",
      exposes: {
        "./components": "./src/components/index.ts",
      },
      shared: {
        react: { singleton: true },
      },
    }),
  ],
})
`;

const CONFIG_WITH_COMMENTS = `
import { federation } from "@module-federation/vite"

export default defineConfig({
  plugins: [
    federation({
      name: "remote",
      // exposes: { "./old": "./old.ts" }
      exposes: {
        "./components": "./src/components/index.ts",
      },
      /* shared: {
        react: { singleton: false },
      } */
      shared: {
        react: { singleton: true },
      },
    }),
  ],
})
`;

const NO_FEDERATION_CONFIG = `
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
})
`;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("parseExposes", () => {
  it("extracts double-quoted expose entries", () => {
    const result = parseExposes(REMOTE_CONFIG);
    expect(result).toEqual({
      "./components": "./src/components/index.ts",
      "./hooks": "./src/hooks/index.ts",
    });
  });

  it("extracts single-quoted expose entries", () => {
    const result = parseExposes(SINGLE_QUOTE_CONFIG);
    expect(result).toEqual({
      "./components": "./src/components/index.ts",
      "./hooks": "./src/hooks/index.ts",
    });
  });

  it("returns empty object when no exposes block", () => {
    const result = parseExposes(HOST_CONFIG);
    expect(result).toEqual({});
  });

  it("returns empty object for config without federation", () => {
    const result = parseExposes(NO_FEDERATION_CONFIG);
    expect(result).toEqual({});
  });

  it("handles braces inside string values", () => {
    const result = parseExposes(CONFIG_WITH_STRINGS_IN_BRACES);
    expect(result).toEqual({
      "./components": "./src/components/index.ts",
    });
  });

  it("ignores exposes in comments", () => {
    const result = parseExposes(CONFIG_WITH_COMMENTS);
    expect(result).toEqual({
      "./components": "./src/components/index.ts",
    });
  });
});

describe("parseRemotes", () => {
  it("extracts remote entries with name and entry", () => {
    const result = parseRemotes(HOST_CONFIG);
    expect(result).toEqual({
      remote1: {
        name: "remote1",
        entry: "http://localhost:5001/remoteEntry.js",
      },
      remote2: {
        name: "remote2",
        entry: "http://localhost:5002/remoteEntry.js",
      },
    });
  });

  it("returns empty object when no remotes block", () => {
    const result = parseRemotes(REMOTE_CONFIG);
    expect(result).toEqual({});
  });

  it("returns empty object for config without federation", () => {
    const result = parseRemotes(NO_FEDERATION_CONFIG);
    expect(result).toEqual({});
  });
});

describe("detectRole", () => {
  it("detects remote role from exposes block", () => {
    expect(detectRole(REMOTE_CONFIG)).toBe("remote");
  });

  it("detects host role from remotes block", () => {
    expect(detectRole(HOST_CONFIG)).toBe("host");
  });

  it("returns null when no federation config", () => {
    expect(detectRole(NO_FEDERATION_CONFIG)).toBeNull();
  });
});

describe("findFederationCall", () => {
  it("finds federation() call in remote config", () => {
    const result = findFederationCall(REMOTE_CONFIG);
    expect(result).not.toBeNull();
    expect(result!.raw).toContain("federation(");
    expect(result!.raw).toContain('name: "remote"');
    expect(result!.inner).toContain("exposes");
  });

  it("finds federation() call in host config", () => {
    const result = findFederationCall(HOST_CONFIG);
    expect(result).not.toBeNull();
    expect(result!.raw).toContain('name: "host"');
    expect(result!.inner).toContain("remotes");
  });

  it("returns null when no federation call", () => {
    expect(findFederationCall(NO_FEDERATION_CONFIG)).toBeNull();
  });

  it("correctly handles braces in strings", () => {
    const result = findFederationCall(CONFIG_WITH_STRINGS_IN_BRACES);
    expect(result).not.toBeNull();
    expect(result!.raw).toContain('name: "my{app}"');
  });

  it("correctly handles comments with braces", () => {
    const result = findFederationCall(CONFIG_WITH_COMMENTS);
    expect(result).not.toBeNull();
    expect(result!.inner).toContain("./components");
  });
});

describe("findPluginsArray", () => {
  it("finds plugins array", () => {
    const result = findPluginsArray(REMOTE_CONFIG);
    expect(result).not.toBeNull();
    expect(result!.raw).toContain("react()");
    expect(result!.raw).toContain("federation(");
  });

  it("returns null when no plugins array", () => {
    const result = findPluginsArray("export default defineConfig({})");
    expect(result).toBeNull();
  });
});

describe("replaceExposesBlock", () => {
  it("replaces existing exposes block", () => {
    const result = replaceExposesBlock(REMOTE_CONFIG, {
      "./utils": "./src/utils/index.ts",
    });
    expect(result).not.toBeNull();
    expect(result).toContain('"./utils": "./src/utils/index.ts"');
    expect(result).not.toContain("./hooks");
  });

  it("returns null when no exposes block", () => {
    const result = replaceExposesBlock(HOST_CONFIG, {
      "./components": "./src/components/index.ts",
    });
    expect(result).toBeNull();
  });
});

describe("replaceRemotesBlock", () => {
  it("replaces existing remotes block", () => {
    const result = replaceRemotesBlock(HOST_CONFIG, {
      newRemote: {
        name: "newRemote",
        entry: "http://localhost:9999/remoteEntry.js",
      },
    });
    expect(result).not.toBeNull();
    expect(result).toContain("newRemote");
    expect(result).toContain("http://localhost:9999/remoteEntry.js");
    expect(result).not.toContain("remote2");
  });

  it("returns null when no remotes block", () => {
    const result = replaceRemotesBlock(REMOTE_CONFIG, {
      r: { name: "r", entry: "http://localhost:5001/remoteEntry.js" },
    });
    expect(result).toBeNull();
  });
});
