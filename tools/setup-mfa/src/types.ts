// ─── CLI Option Types ──────────────────────────────────────────────────────

export type Role = "remote" | "host";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

// ─── Wizard Options (from Commander flags) ──────────────────────────────────

export type BuildTarget = "chrome89" | "esnext" | "es2022" | "es2021" | "es2020";

export const BUILD_TARGETS: readonly BuildTarget[] = [
  "chrome89",
  "esnext",
  "es2022",
  "es2021",
  "es2020",
] as const;

export const DEFAULT_BUILD_TARGET: BuildTarget = "chrome89";

export interface WizardOptions extends FederationOptions {
  projectDir?: string;
  role?: Role;
  name?: string;
  port?: string;
  buildTarget?: BuildTarget;
  yes?: boolean;
  dryRun?: boolean;
  noInstall?: boolean;
  config?: string; // explicit path to config file
  /** Pre-configured exposes (remote role). Overrides config file values. */
  exposes?: Record<string, string>;
  /** Pre-configured remotes (host role). Overrides config file values. */
  remotes?: Record<string, MfaConfigRemoteEntry>;
}

// ─── Config File (mfa.config.json) ──────────────────────────────────────────

export interface MfaConfigRemoteEntry {
  entry: string;
  types?: Record<string, string[]>; // e.g. { "./components": ["Card", "Form"] }
  tailwindSource?: string; // e.g. "../../my-remote/src"
}

/** Single shared-dependency declaration. */
export interface SharedDep {
  singleton?: boolean;
  requiredVersion?: string;
  eager?: boolean;
}

/** Federation plugin options that both roles share. */
export interface FederationOptions {
  /** Emit mf-manifest.json for preloading and devtools. */
  manifest?: boolean;
  /** Auto-generate/consume TypeScript types across remotes. */
  dts?: boolean;
  /** Control live reload and types hot-reload in dev mode. */
  dev?: boolean;
  /** Paths to MF runtime plugin files. */
  runtimePlugins?: string[];
  /** Dynamic publicPath expression for CDN deployments. */
  getPublicPath?: string;
}

export interface MfaConfig extends FederationOptions {
  $version?: number; // schema version for future migrations
  role?: Role;
  name?: string;
  port?: string | number; // accept both — normalised to string at load time
  buildTarget?: BuildTarget; // Vite build.target — defaults to "chrome89"
  // Remote-specific
  exposes?: Record<string, string>; // e.g. { "./components": "./src/components/index.ts" }
  // Host-specific
  remotes?: Record<string, MfaConfigRemoteEntry>;
  // Shared dependencies (both roles)
  shared?: Record<string, SharedDep | boolean>;
}

// ─── Detection Results ─────────────────────────────────────────────────────

export interface ViteConfigInfo {
  path: string;
  lang: "ts" | "js";
}

export interface ProjectInfo {
  targetDir: string;
  packageJson: PackageJson;
  packageManager: PackageManager;
  viteConfig: ViteConfigInfo | null;
  hasTailwind: boolean;
  srcDir: string;
  hasFederation: boolean;
}

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

// ─── Remote Configuration ──────────────────────────────────────────────────

export interface RemoteConfig extends FederationOptions {
  name: string;
  port: string;
  exposes: Record<string, string>;
  shared: ResolvedShared;
  hasTailwind: boolean;
  buildTarget?: BuildTarget;
}

// ─── Host Configuration ────────────────────────────────────────────────────

export interface RemoteEntry {
  name: string;
  entry: string;
}

export interface HostConfig extends FederationOptions {
  name: string;
  port: string;
  remotes: Record<string, RemoteEntry>;
  shared: ResolvedShared;
  hasTailwind: boolean;
  buildTarget?: BuildTarget;
}

// ─── Shared Dependencies (resolved) ────────────────────────────────────────

/**
 * Resolved shared dependencies map.
 * Key is the package name, value is its config.
 */
export type ResolvedShared = Record<string, SharedDep>;

/** Default shared dependencies — always included. */
export const DEFAULT_SHARED: ResolvedShared = {
  react: { singleton: true },
  "react-dom": { singleton: true },
  "react/": { singleton: true },
  "react-dom/": { singleton: true },
};

// ─── File Operations (discriminated union) ──────────────────────────────────

export type FileOperation =
  | { action: "write"; path: string; content: string; description: string }
  | { action: "delete"; path: string; description: string };

// ─── Workspace Configuration ────────────────────────────────────────────────

/**
 * A single app entry in a workspace config.
 */
export interface WorkspaceAppEntry extends MfaConfig {
  /** Relative directory path from the workspace root. */
  dir: string;
}

/**
 * Root workspace config file (mfa.workspace.json).
 *
 * Example:
 * ```json
 * {
 *   "apps": [
 *     { "dir": "apps/host",   "role": "host",   "name": "shell", "port": "5000" },
 *     { "dir": "apps/remote", "role": "remote", "name": "ui",    "port": "5001" }
 *   ]
 * }
 * ```
 */
export interface WorkspaceConfig {
  apps: WorkspaceAppEntry[];
  /** Shared dependencies applied to all apps (can be overridden per-app). */
  shared?: Record<string, SharedDep | boolean>;
}

// ─── Export Kind (for type declarations) ────────────────────────────────────

export type ExportKind = "component" | "hook" | "utility" | "type" | "constant";

export interface TypedExport {
  name: string;
  kind: ExportKind;
}
