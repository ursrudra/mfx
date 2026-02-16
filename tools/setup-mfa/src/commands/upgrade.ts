import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { confirm, input } from "@inquirer/prompts";
import type { PackageManager } from "../types.js";
import { detectPackageManager, readPackageJson } from "../utils/detect.js";
import {
  banner,
  hint,
  info,
  intro,
  label,
  newline,
  step,
  success,
  verbose,
  warn,
} from "../utils/log.js";

// ─── Constants ──────────────────────────────────────────────────────────────

const MF_PACKAGE = "@module-federation/vite";

// ─── Command ────────────────────────────────────────────────────────────────

export async function runUpgrade(
  opts: {
    projectDir?: string;
    yes?: boolean;
    dryRun?: boolean;
  },
  version: string,
): Promise<void> {
  const yes = opts.yes ?? false;

  intro(version);

  // ── Step 1: Project directory ──────────────────────────────────────────

  step(1, "Project directory");

  const projectDir =
    opts.projectDir ??
    (await input({
      message: "Where is your project?",
      default: ".",
    }));

  const targetDir = path.resolve(projectDir);

  if (!fs.existsSync(targetDir)) {
    throw new Error(`Directory does not exist: ${targetDir}`);
  }

  verbose(`Resolved: ${targetDir}`);

  // ── Step 2: Detect current setup ──────────────────────────────────────

  step(2, "Detect current setup");

  const pkg = readPackageJson(targetDir);
  if (!pkg) {
    throw new Error("No package.json found. Is this a Node.js project?");
  }

  const pm = detectPackageManager(targetDir);
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const currentVersion = allDeps[MF_PACKAGE];

  if (!currentVersion) {
    warn(`${MF_PACKAGE} is not installed in this project.`);
    hint("Run mfx init to set up Module Federation first.");
    return;
  }

  newline();
  label("Package", MF_PACKAGE);
  label("Current version", currentVersion);
  label("Package manager", pm);

  // ── Step 3: Check for latest version ──────────────────────────────────

  step(3, "Check latest version");

  let latestVersion: string;
  try {
    latestVersion = getLatestVersion(MF_PACKAGE, pm);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warn(`Could not check latest version: ${msg}`);
    hint("Check your network connection and try again.");
    return;
  }

  newline();
  label("Latest version", latestVersion);

  // Clean current version for comparison (remove ^ or ~ prefix)
  const cleanCurrent = currentVersion.replace(/^[\^~>=<]+/, "");

  if (cleanCurrent === latestVersion) {
    newline();
    success(`Already on the latest version (${latestVersion}). Nothing to upgrade!`);
    return;
  }

  info(`Upgrade available: ${cleanCurrent} → ${latestVersion}`);

  // ── Step 4: Also check related packages ───────────────────────────────

  step(4, "Related packages");

  const relatedPackages = [
    "@module-federation/vite",
    "@module-federation/runtime",
    "@module-federation/enhanced",
    "@module-federation/utilities",
  ];

  const toUpgrade: Array<{ name: string; current: string; isDev: boolean }> = [];

  for (const pkgName of relatedPackages) {
    const inDeps = pkg.dependencies?.[pkgName];
    const inDevDeps = pkg.devDependencies?.[pkgName];

    if (inDeps) {
      toUpgrade.push({ name: pkgName, current: inDeps, isDev: false });
      label(pkgName, `${inDeps} (dependency)`);
    } else if (inDevDeps) {
      toUpgrade.push({ name: pkgName, current: inDevDeps, isDev: true });
      label(pkgName, `${inDevDeps} (devDependency)`);
    }
  }

  if (toUpgrade.length === 0) {
    warn("No Module Federation packages found to upgrade.");
    return;
  }

  // ── Step 5: Upgrade ──────────────────────────────────────────────────

  step(5, "Upgrade");

  if (opts.dryRun) {
    newline();
    info("Dry run — showing what would change:");
    newline();
    for (const u of toUpgrade) {
      label(`  ${u.name}`, `${u.current} → latest`);
    }
    hint("Re-run without --dry-run to apply.");
    return;
  }

  newline();
  const proceed =
    yes ||
    (await confirm({
      message: `Upgrade ${toUpgrade.length} package(s) to latest?`,
      default: true,
    }));

  if (!proceed) {
    info("Cancelled.");
    return;
  }

  newline();

  // Group by dev/prod
  const devPkgs = toUpgrade.filter((p) => p.isDev).map((p) => `${p.name}@latest`);
  const prodPkgs = toUpgrade.filter((p) => !p.isDev).map((p) => `${p.name}@latest`);

  try {
    if (prodPkgs.length > 0) {
      const cmd = getInstallCmd(pm, prodPkgs, false);
      info(`Running: ${cmd}`);
      execSync(cmd, { cwd: targetDir, stdio: "inherit" });
      success(`Upgraded ${prodPkgs.length} production package(s)`);
    }

    if (devPkgs.length > 0) {
      const cmd = getInstallCmd(pm, devPkgs, true);
      info(`Running: ${cmd}`);
      execSync(cmd, { cwd: targetDir, stdio: "inherit" });
      success(`Upgraded ${devPkgs.length} dev package(s)`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Upgrade failed: ${msg}`);
  }

  // ── Step 6: Post-upgrade checks ──────────────────────────────────────

  step(6, "Post-upgrade checks");

  // Re-read package.json to verify
  const updatedPkg = readPackageJson(targetDir);
  const updatedDeps = { ...updatedPkg?.dependencies, ...updatedPkg?.devDependencies };
  const newVersion = updatedDeps[MF_PACKAGE];

  if (newVersion) {
    label("New version", newVersion);
  }

  // Check for any migration notes
  checkMigrationNotes(cleanCurrent, latestVersion);

  newline();
  banner("Upgrade complete");
  newline();
  success("Module Federation packages upgraded successfully!");
  newline();
  hint("Run your dev server to verify everything works:");
  hint("  npm run dev");
  hint("");
  hint("If you encounter issues, check the migration guide:");
  hint("  https://module-federation.io/guide/migration");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLatestVersion(pkgName: string, pm: PackageManager): string {
  const commands: Record<PackageManager, string> = {
    npm: `npm view ${pkgName} version`,
    pnpm: `pnpm view ${pkgName} version`,
    yarn: `yarn info ${pkgName} version`,
    bun: `npm view ${pkgName} version`, // bun uses npm registry
  };

  const result = execSync(commands[pm], {
    encoding: "utf-8",
    timeout: 15000,
    stdio: ["pipe", "pipe", "pipe"],
  });

  return result.trim();
}

function getInstallCmd(pm: PackageManager, packages: string[], dev: boolean): string {
  const pkgList = packages.join(" ");

  switch (pm) {
    case "pnpm":
      return dev ? `pnpm add -D ${pkgList}` : `pnpm add ${pkgList}`;
    case "yarn":
      return dev ? `yarn add -D ${pkgList}` : `yarn add ${pkgList}`;
    case "bun":
      return dev ? `bun add -D ${pkgList}` : `bun add ${pkgList}`;
    default:
      return dev ? `npm install -D ${pkgList}` : `npm install ${pkgList}`;
  }
}

function checkMigrationNotes(fromVersion: string, toVersion: string): void {
  // Parse major versions for migration advice
  const fromMajor = parseMajor(fromVersion);
  const toMajor = parseMajor(toVersion);

  if (fromMajor !== null && toMajor !== null && toMajor > fromMajor) {
    newline();
    warn(`Major version upgrade detected (${fromMajor}.x → ${toMajor}.x)`);
    info("Major upgrades may include breaking changes. Please review:");
    hint(`  - Changelog: https://github.com/module-federation/vite/releases`);
    hint("  - Check your vite.config.ts for any deprecated options");
    hint("  - Run mfx doctor to validate your setup");
  }
}

function parseMajor(version: string): number | null {
  const match = version.match(/^(\d+)\./);
  return match ? parseInt(match[1], 10) : null;
}
