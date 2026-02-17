import type {
  ExportKind,
  FederationOptions,
  HostConfig,
  RemoteConfig,
  ResolvedShared,
  TypedExport,
} from "../types.js";
import { DEFAULT_BUILD_TARGET } from "../types.js";

// ─── String escaping ────────────────────────────────────────────────────────

/**
 * Escape a value for safe embedding in a double-quoted JS string literal.
 * Handles backslashes, double quotes, newlines, and template literal chars.
 */
export function escapeJsString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

// ─── Shared dependency serialisation ────────────────────────────────────────

function renderShared(shared: ResolvedShared): string {
  return Object.entries(shared)
    .map(([pkg, cfg]) => {
      // Include all non-undefined props (singleton, requiredVersion, eager)
      const props = Object.entries(cfg)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ");
      return `        "${escapeJsString(pkg)}": { ${props} },`;
    })
    .join("\n");
}

/**
 * Render the advanced federation options (manifest, dts, dev, runtimePlugins, getPublicPath)
 * as additional lines in the federation() plugin call.
 * Returns an empty string if no advanced options are set.
 */
function renderFederationAdvanced(opts: FederationOptions | undefined): string {
  if (!opts) return "";
  const lines: string[] = [];

  if (opts.manifest === true) {
    lines.push(`      manifest: true,`);
  }
  // Note: dts is handled inline by each template/snippet — not emitted here to avoid duplicates.
  if (opts.dev === false) {
    lines.push(`      dev: false,`);
  }
  if (opts.runtimePlugins && opts.runtimePlugins.length > 0) {
    const items = opts.runtimePlugins.map((p) => `"${escapeJsString(p)}"`).join(", ");
    lines.push(`      runtimePlugins: [${items}],`);
  }
  if (opts.getPublicPath) {
    lines.push(`      getPublicPath: "${escapeJsString(opts.getPublicPath)}",`);
  }
  return lines.length ? "\n" + lines.join("\n") : "";
}

// ─── Full config generators (used only for brand-new projects) ──────────────

/**
 * Generate a complete vite.config.ts for a **remote** app.
 */
export function generateRemoteViteConfig(config: RemoteConfig): string {
  const { name, port, exposes, shared, hasTailwind, buildTarget = DEFAULT_BUILD_TARGET } = config;

  const exposesStr = Object.entries(exposes)
    .map(([key, val]) => `        "${escapeJsString(key)}": "${escapeJsString(val)}",`)
    .join("\n");

  const sharedStr = renderShared(shared);
  const advancedStr = renderFederationAdvanced(config);

  // Use explicit dts value from advanced options, fallback to false
  const dtsValue = config.dts === true ? "true" : "false";

  const tailwindImport = hasTailwind ? `import tailwindcss from "@tailwindcss/vite"\n` : "";
  const tailwindPlugin = hasTailwind ? "    tailwindcss(),\n" : "";

  return `\
import path from "path"
${tailwindImport}import react from "@vitejs/plugin-react"
import { federation } from "@module-federation/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
${tailwindPlugin}    federation({
      name: "${escapeJsString(name)}",
      filename: "remoteEntry.js",
      dts: ${dtsValue},
      exposes: {
${exposesStr}
      },
      shared: {
${sharedStr}
      },${advancedStr}
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: ${port},
    strictPort: true,
    origin: "http://localhost:${port}",
  },
  build: {
    target: "${escapeJsString(buildTarget)}",
  },
})
`;
}

/**
 * Generate a complete vite.config.ts for a **host** app.
 */
export function generateHostViteConfig(config: HostConfig): string {
  const { name, port, remotes, shared, hasTailwind, buildTarget = DEFAULT_BUILD_TARGET } = config;

  const remotesStr = Object.entries(remotes)
    .map(
      ([key, val]) => `        ${escapeJsString(key)}: {
          type: "module",
          name: "${escapeJsString(val.name)}",
          entry: "${escapeJsString(val.entry)}",
          entryGlobalName: "${escapeJsString(val.name)}",
          shareScope: "default",
        },`,
    )
    .join("\n");

  const sharedStr = renderShared(shared);
  const advancedStr = renderFederationAdvanced(config);

  const dtsValue = config.dts === true ? "true" : "false";

  const tailwindImport = hasTailwind ? `import tailwindcss from "@tailwindcss/vite"\n` : "";
  const tailwindPlugin = hasTailwind ? "    tailwindcss(),\n" : "";

  return `\
import path from "path"
${tailwindImport}import react from "@vitejs/plugin-react"
import { federation } from "@module-federation/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    react(),
${tailwindPlugin}    federation({
      name: "${escapeJsString(name)}",
      remotes: {
${remotesStr}
      },
      filename: "remoteEntry.js",
      dts: ${dtsValue},
      shared: {
${sharedStr}
      },${advancedStr}
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: ${port},
    strictPort: true,
  },
  build: {
    target: "${escapeJsString(buildTarget)}",
  },
})
`;
}

// ─── Surgical injection (for existing configs) ─────────────────────────────

/**
 * Generate the `federation({ … })` plugin call as a string snippet,
 * suitable for injection into an existing plugins array.
 */
export function generateFederationSnippet(
  opts: {
    name: string;
    role: "remote" | "host";
    port: string;
    exposes?: Record<string, string>;
    remotes?: Record<string, { name: string; entry: string }>;
    shared: ResolvedShared;
  } & FederationOptions,
): string {
  const sharedStr = renderShared(opts.shared);
  const advancedStr = renderFederationAdvanced(opts);
  const dtsValue = opts.dts === true ? "true" : "false";
  let roleBlock: string;

  if (opts.role === "remote") {
    const exposesStr = Object.entries(opts.exposes ?? {})
      .map(([key, val]) => `        "${escapeJsString(key)}": "${escapeJsString(val)}",`)
      .join("\n");

    roleBlock = `      filename: "remoteEntry.js",
      dts: ${dtsValue},
      exposes: {
${exposesStr}
      },`;
  } else {
    const remotesStr = Object.entries(opts.remotes ?? {})
      .map(
        ([key, val]) =>
          `        ${escapeJsString(key)}: {\n          type: "module",\n          name: "${escapeJsString(val.name)}",\n          entry: "${escapeJsString(val.entry)}",\n          entryGlobalName: "${escapeJsString(val.name)}",\n          shareScope: "default",\n        },`,
      )
      .join("\n");

    roleBlock = `      remotes: {
${remotesStr}
      },
      filename: "remoteEntry.js",
      dts: ${dtsValue},`;
  }

  return `federation({
      name: "${escapeJsString(opts.name)}",
${roleBlock}
      shared: {
${sharedStr}
      },${advancedStr}
    })`;
}

/**
 * Generate the import statement for Module Federation.
 */
export function generateFederationImport(): string {
  return 'import { federation } from "@module-federation/vite"';
}

// ─── Type declarations ─────────────────────────────────────────────────────

const KIND_TEMPLATES: Record<ExportKind, (name: string) => string> = {
  component: (n) => `  export const ${n}: FC<Record<string, unknown>>`,
  hook: (n) => `  export function ${n}(...args: unknown[]): unknown`,
  utility: (n) => `  export function ${n}(...args: unknown[]): unknown`,
  type: (n) => `  export type ${n} = Record<string, unknown>`,
  constant: (n) => `  export const ${n}: unknown`,
};

/**
 * Generate TypeScript type declarations for remote module imports.
 *
 * Supports typed exports — each export can be annotated with a kind
 * (component, hook, utility, type, constant) for more accurate types.
 *
 * Falls back to `FC` for backwards compatibility with string[] exports.
 */
export function generateTypeDeclaration(
  remoteName: string,
  exposedModules: Record<string, (string | TypedExport)[]>,
): string {
  let content = "";
  let needsFCImport = false;

  for (const [exposePath, exports] of Object.entries(exposedModules)) {
    const moduleName = `${remoteName}/${exposePath.replace("./", "")}`;

    const exportLines = exports.map((e) => {
      if (typeof e === "string") {
        // Legacy: plain string → assume component
        needsFCImport = true;
        return KIND_TEMPLATES.component(e);
      }
      if (e.kind === "component") needsFCImport = true;
      return KIND_TEMPLATES[e.kind](e.name);
    });

    const importLine = needsFCImport ? '  import type { FC } from "react"\n' : "";

    content += `declare module "${moduleName}" {\n${importLine}${exportLines.join("\n")}\n}\n\n`;
    needsFCImport = false;
  }

  // Add a leading comment for discoverability
  return `// Auto-generated by mfx — edit the types below to match your actual exports\n\n${content}`;
}

// ─── Tailwind @source injection ─────────────────────────────────────────────

/**
 * Inject a Tailwind @source directive into an existing CSS file content.
 * Inserts after the last @import or @source line.
 * Returns the modified content, or null if the directive already exists.
 */
export function injectTailwindSource(
  cssContent: string,
  remoteName: string,
  remoteSrcPath: string,
): string | null {
  const sourceDirective = `@source "${remoteSrcPath}";`;

  if (cssContent.includes(sourceDirective)) {
    return null; // Already exists
  }

  const lines = cssContent.split("\n");
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("@import") || trimmed.startsWith("@source")) {
      lastImportIndex = i;
    }
  }

  const insertBlock = `\n/* Scan ${remoteName} source files for Tailwind classes */\n${sourceDirective}`;

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, insertBlock);
  } else {
    lines.unshift(insertBlock);
  }

  return lines.join("\n");
}
