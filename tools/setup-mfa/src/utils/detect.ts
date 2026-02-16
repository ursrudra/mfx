import fs from "node:fs";
import path from "node:path";
import type { PackageJson, PackageManager, ProjectInfo, ViteConfigInfo } from "../types.js";

/**
 * Detect which package manager is used in the project
 * by checking for lock files.
 */
export function detectPackageManager(projectDir: string): PackageManager {
  if (fs.existsSync(path.join(projectDir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectDir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(projectDir, "bun.lockb"))) return "bun";
  return "npm";
}

/**
 * Find the existing Vite config file (TypeScript or JavaScript).
 * Checks all formats Vite supports, in priority order.
 */
export function detectViteConfig(projectDir: string): ViteConfigInfo | null {
  const candidates: Array<{ file: string; lang: ViteConfigInfo["lang"] }> = [
    { file: "vite.config.ts", lang: "ts" },
    { file: "vite.config.mts", lang: "ts" },
    { file: "vite.config.js", lang: "js" },
    { file: "vite.config.mjs", lang: "js" },
    { file: "vite.config.cjs", lang: "js" },
  ];

  for (const { file, lang } of candidates) {
    const fullPath = path.join(projectDir, file);
    if (fs.existsSync(fullPath)) return { path: fullPath, lang };
  }
  return null;
}

/**
 * Detect whether Tailwind CSS v4 (with @tailwindcss/vite plugin) is installed.
 */
export function detectTailwindV4(pkg: PackageJson): boolean {
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  return !!allDeps["@tailwindcss/vite"];
}

/**
 * Check whether Module Federation is already configured in the Vite config.
 */
export function hasFederationAlready(configContent: string): boolean {
  return configContent.includes("@module-federation/vite") || configContent.includes("federation(");
}

/**
 * Detect the primary source directory (src/ or app/).
 */
export function detectSrcDir(projectDir: string): string {
  if (fs.existsSync(path.join(projectDir, "src"))) return "src";
  if (fs.existsSync(path.join(projectDir, "app"))) return "app";
  return "src";
}

/**
 * Read and parse the project's package.json.
 * Returns null if not found or if the file contains invalid JSON.
 */
export function readPackageJson(projectDir: string): PackageJson | null {
  const pkgPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as PackageJson;
  } catch {
    // Malformed JSON — treat as if the file doesn't exist
    return null;
  }
}

/**
 * Gather all project detection info in one pass.
 */
export function detectProject(targetDir: string): ProjectInfo | null {
  const packageJson = readPackageJson(targetDir);
  if (!packageJson) return null;

  const viteConfig = detectViteConfig(targetDir);
  let hasFederation = false;

  if (viteConfig) {
    const content = fs.readFileSync(viteConfig.path, "utf-8");
    hasFederation = hasFederationAlready(content);
  }

  return {
    targetDir,
    packageJson,
    packageManager: detectPackageManager(targetDir),
    viteConfig,
    hasTailwind: detectTailwindV4(packageJson),
    srcDir: detectSrcDir(targetDir),
    hasFederation,
  };
}

/**
 * Get the install command for a given package manager.
 */
export function getInstallCommand(pkgManager: PackageManager, pkg: string, dev = true): string {
  const commands: Record<PackageManager, string> = {
    pnpm: dev ? `pnpm add -D ${pkg}` : `pnpm add ${pkg}`,
    yarn: dev ? `yarn add -D ${pkg}` : `yarn add ${pkg}`,
    bun: dev ? `bun add -D ${pkg}` : `bun add ${pkg}`,
    npm: dev ? `npm install -D ${pkg}` : `npm install ${pkg}`,
  };
  return commands[pkgManager];
}
