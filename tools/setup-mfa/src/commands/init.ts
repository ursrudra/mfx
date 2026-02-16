import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { confirm, input, select } from "@inquirer/prompts";
import type {
  BuildTarget,
  FederationOptions,
  FileOperation,
  MfaConfig,
  RemoteEntry,
  ResolvedShared,
  Role,
  SharedDep,
  WizardOptions,
} from "../types.js";
import { BUILD_TARGETS, DEFAULT_BUILD_TARGET, DEFAULT_SHARED as defaultShared } from "../types.js";
import { loadConfig, validateConfig } from "../utils/config.js";
import { detectProject, getInstallCommand } from "../utils/detect.js";
import { applyAndLog, createBackup } from "../utils/fs.js";
import {
  generateFederationImport,
  generateFederationSnippet,
  generateHostViteConfig,
  generateRemoteViteConfig,
  generateTypeDeclaration,
  injectTailwindSource,
} from "../utils/generate.js";
import {
  banner,
  hint,
  info,
  intro,
  label,
  newline,
  outro,
  step,
  success,
  verbose,
  warn,
} from "../utils/log.js";
import { findFederationCall, findPluginsArray } from "../utils/parse.js";
import { validateDirectory, validateName, validatePort } from "../utils/validators.js";

// ─── Shared deps helpers ────────────────────────────────────────────────────

/**
 * Resolve shared dependencies from config + defaults.
 */
function resolveShared(cfgShared?: Record<string, SharedDep | boolean>): ResolvedShared {
  // Start with defaults
  const resolved: ResolvedShared = { ...defaultShared };

  if (!cfgShared) return resolved;

  // Merge in config values
  for (const [pkg, cfg] of Object.entries(cfgShared)) {
    if (cfg === true) {
      resolved[pkg] = { singleton: true };
    } else if (cfg === false) {
      delete resolved[pkg];
    } else {
      resolved[pkg] = cfg;
    }
  }

  return resolved;
}

// ─── Well-known shareable packages ──────────────────────────────────────────

const WELL_KNOWN_SHAREABLE = [
  "react-router-dom",
  "react-router",
  "@tanstack/react-query",
  "zustand",
  "jotai",
  "recoil",
  "@reduxjs/toolkit",
  "react-redux",
  "react-hook-form",
  "date-fns",
  "@emotion/react",
  "@emotion/styled",
  "styled-components",
  "framer-motion",
  "i18next",
  "react-i18next",
  "axios",
  "swr",
];

/**
 * Detect which well-known shareable packages are installed.
 */
function detectShareableDeps(deps: Record<string, string>): string[] {
  return WELL_KNOWN_SHAREABLE.filter((pkg) => pkg in deps);
}

// ─── Wizard ────────────────────────────────────────────────────────────────

export async function runWizard(opts: WizardOptions, version: string): Promise<void> {
  const yes = opts.yes ?? false;

  intro(version);

  // ── Step 1: Where is your project? ──────────────────────────────────────

  step(1, "Project location");

  const projectDir =
    opts.projectDir ??
    (await input({
      message: "Where is your project?",
      default: ".",
      validate: validateDirectory,
    }));

  const targetDir = path.resolve(projectDir);
  verbose(`Resolved project directory: ${targetDir}`);
  const project = detectProject(targetDir);

  if (!project) {
    throw new Error(`No package.json found in ${targetDir}`);
  }
  verbose(`Package manager: ${project.packageManager}`);

  const { packageJson, packageManager, viteConfig, hasTailwind, srcDir } = project;

  // ── Load config file (after we know the project dir) ───────────────────

  let cfg: MfaConfig = {};
  const configResult = loadConfig(targetDir, opts.config);

  if (configResult) {
    verbose(`Config file found at: ${configResult.filePath}`);
    validateConfig(configResult.config, configResult.filePath);
    cfg = configResult.config;
    label("Config file", path.basename(configResult.filePath));
  } else {
    verbose("No config file detected.");
  }

  // ── Override config with opts (workspace mode passes these) ──────────
  if (opts.exposes && Object.keys(opts.exposes).length > 0) {
    cfg.exposes = { ...cfg.exposes, ...opts.exposes };
    verbose("Exposes overridden from workspace options.");
  }
  if (opts.remotes && Object.keys(opts.remotes).length > 0) {
    cfg.remotes = { ...cfg.remotes, ...opts.remotes };
    verbose("Remotes overridden from workspace options.");
  }

  // ── Show detections ────────────────────────────────────────────────────

  newline();
  hint("Detected:");
  label("Project", packageJson.name ?? path.basename(targetDir));
  label("Package manager", packageManager);
  label("Vite config", viteConfig ? path.basename(viteConfig.path) : "not found");
  label("Tailwind CSS v4", hasTailwind ? "yes" : "no");
  label("Source directory", `${srcDir}/`);

  if (configResult) {
    label("Config", configResult.filePath);
  }

  // Detect if this is a re-init (federation already present)
  const isReInit = project.hasFederation;
  let existingConfigContent: string | null = null;

  if (isReInit && viteConfig) {
    existingConfigContent = fs.readFileSync(viteConfig.path, "utf-8");
    newline();
    warn("Module Federation is already configured in this project.");
    hint("Existing config will be updated surgically where possible.");
    const proceed =
      yes ||
      (await confirm({
        message: "Update existing configuration?",
        default: true,
      }));
    if (!proceed) {
      info("Cancelled. No changes made.");
      return;
    }
  }

  // ── Step 2: What role? ─────────────────────────────────────────────────

  step(2, "App role");

  const resolvedRole: Role =
    opts.role ??
    cfg.role ??
    (await select({
      message: "What role should this app play?",
      choices: [
        {
          value: "remote" as Role,
          name: "Remote  \u2014  exposes components to other apps",
        },
        {
          value: "host" as Role,
          name: "Host    \u2014  consumes components from remote apps",
        },
      ],
    }));

  if (opts.role ?? cfg.role) {
    info(`Using: ${resolvedRole} (from ${opts.role ? "flag" : "config"})`);
  }

  const isRemote = resolvedRole === "remote";

  // ── Step 3: Federation name ────────────────────────────────────────────

  step(3, "Federation name");
  hint("A unique identifier for this app in the federation.");

  const defaultName = (packageJson.name ?? path.basename(targetDir)).replace(/[^a-zA-Z0-9_-]/g, "");

  const fedName =
    opts.name ??
    cfg.name ??
    (await input({
      message: "Federation name?",
      default: defaultName,
      validate: validateName,
    }));

  if (opts.name ?? cfg.name) {
    info(`Using: ${fedName} (from ${opts.name ? "flag" : "config"})`);
  }

  // ── Step 4: Port ───────────────────────────────────────────────────────

  step(4, "Dev server port");

  const defaultPort = isRemote ? "5001" : "5000";
  const cfgPort = cfg.port ? String(cfg.port) : undefined;

  const port =
    opts.port ??
    cfgPort ??
    (await input({
      message: "Which port?",
      default: defaultPort,
      validate: validatePort,
    }));

  if (opts.port ?? cfgPort) {
    info(`Using: ${port} (from ${opts.port ? "flag" : "config"})`);
  }

  // ── Build target ──────────────────────────────────────────────────────

  const cfgBuildTarget = cfg.buildTarget as BuildTarget | undefined;

  const buildTarget: BuildTarget =
    opts.buildTarget ??
    cfgBuildTarget ??
    (yes
      ? DEFAULT_BUILD_TARGET
      : ((await select({
          message: "Build target?",
          choices: BUILD_TARGETS.map((t) => ({
            value: t,
            name: t === DEFAULT_BUILD_TARGET ? `${t} (recommended for Module Federation)` : t,
          })),
          default: DEFAULT_BUILD_TARGET,
        })) as BuildTarget));

  if (opts.buildTarget ?? cfgBuildTarget) {
    info(`Using: build.target = "${buildTarget}" (from ${opts.buildTarget ? "flag" : "config"})`);
  }

  // ── Advanced federation options ────────────────────────────────────────

  const advancedOpts: FederationOptions = {};

  // manifest
  const cfgManifest = opts.manifest ?? cfg.manifest;
  if (cfgManifest !== undefined) {
    advancedOpts.manifest = cfgManifest;
    info(
      `Using: manifest = ${cfgManifest} (from ${opts.manifest !== undefined ? "flag" : "config"})`,
    );
  } else if (!yes) {
    advancedOpts.manifest = await confirm({
      message: "Enable manifest for production preloading & devtools?",
      default: false,
    });
  } else {
    advancedOpts.manifest = false;
  }

  // dts
  const cfgDts = opts.dts ?? cfg.dts;
  if (cfgDts !== undefined) {
    advancedOpts.dts = cfgDts;
    info(`Using: dts = ${cfgDts} (from ${opts.dts !== undefined ? "flag" : "config"})`);
  } else if (!yes) {
    advancedOpts.dts = await confirm({
      message: "Enable automatic TypeScript type generation across remotes?",
      default: false,
    });
  } else {
    advancedOpts.dts = false;
  }

  // dev — defaults to true, only override from config/flag
  advancedOpts.dev = opts.dev ?? cfg.dev;

  // runtimePlugins — only from config/flag (too advanced for interactive)
  if (opts.runtimePlugins ?? cfg.runtimePlugins) {
    advancedOpts.runtimePlugins = opts.runtimePlugins ?? cfg.runtimePlugins;
    info(`Using: runtimePlugins = [${(advancedOpts.runtimePlugins ?? []).join(", ")}]`);
  }

  // getPublicPath — only from config/flag (CDN-specific)
  if (opts.getPublicPath ?? cfg.getPublicPath) {
    advancedOpts.getPublicPath = opts.getPublicPath ?? cfg.getPublicPath;
    info(`Using: getPublicPath = "${advancedOpts.getPublicPath}"`);
  }

  // ── Step 5: Shared dependencies ───────────────────────────────────────

  step(5, "Shared dependencies");
  hint("Libraries shared as singletons across the federation.");

  // Start with config or defaults
  const shared = resolveShared(cfg.shared);

  // Show defaults
  info("Default shared (always included):");
  for (const pkg of Object.keys(defaultShared)) {
    label("  ", pkg);
  }

  // Detect well-known packages
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const detected = detectShareableDeps(allDeps);

  if (detected.length > 0 && !yes) {
    newline();
    info("Detected shareable packages in your project:");
    for (const pkg of detected) {
      if (!(pkg in shared)) {
        label("  ", `${pkg} (not shared yet)`);
      }
    }

    const addDetected = await confirm({
      message: "Add detected packages as shared singletons?",
      default: true,
    });

    if (addDetected) {
      for (const pkg of detected) {
        shared[pkg] = { singleton: true };
        success(`Added: ${pkg}`);
      }
    }
  } else if (detected.length > 0 && yes) {
    // With --yes, auto-add detected shareable packages
    for (const pkg of detected) {
      if (!(pkg in shared)) {
        shared[pkg] = { singleton: true };
        success(`Auto-added: ${pkg}`);
      }
    }
  }

  // Offer to add custom shared deps
  if (!yes) {
    let addCustom = await confirm({
      message: "Add other shared packages?",
      default: false,
    });

    while (addCustom) {
      const pkg = await input({
        message: "Package name?",
      });

      if (pkg?.trim()) {
        shared[pkg.trim()] = { singleton: true };
        success(`Added: ${pkg.trim()}`);
      }

      addCustom = await confirm({
        message: "Add another?",
        default: false,
      });
    }
  }

  // ── Step 6: Role-specific config ───────────────────────────────────────

  const operations: FileOperation[] = [];
  const roleCtx: RoleConfigContext = {
    cfg,
    yes,
    targetDir,
    srcDir,
    viteConfig,
    isReInit,
    existingConfigContent,
    fedName,
    port,
    buildTarget,
    shared,
    hasTailwind,
    advancedOpts,
  };

  if (isRemote) {
    await configureRemoteRole(roleCtx, operations);
  } else {
    await configureHostRole(roleCtx, operations);
  }

  // ── gitignore ─────────────────────────────────────────────────────────

  const gitignorePath = path.join(targetDir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    let gitignore = fs.readFileSync(gitignorePath, "utf-8");
    if (!gitignore.includes(".__mf__temp")) {
      gitignore += "\n# Module Federation temp files\n.__mf__temp\n";
      operations.push({
        action: "write",
        path: gitignorePath,
        content: gitignore,
        description: "Add .__mf__temp to .gitignore",
      });
    }
  }

  // ── Step 7: Review ─────────────────────────────────────────────────────

  step(7, "Review");

  // Show advanced options summary if any are non-default
  if (
    advancedOpts.manifest ||
    advancedOpts.dts ||
    advancedOpts.dev === false ||
    (advancedOpts.runtimePlugins && advancedOpts.runtimePlugins.length > 0) ||
    advancedOpts.getPublicPath
  ) {
    hint("Advanced federation options:");
    if (advancedOpts.manifest) label("  Manifest", "enabled");
    if (advancedOpts.dts) label("  DTS", "enabled");
    if (advancedOpts.dev === false) label("  Dev mode", "disabled");
    if (advancedOpts.runtimePlugins && advancedOpts.runtimePlugins.length > 0) {
      label("  Runtime plugins", advancedOpts.runtimePlugins.join(", "));
    }
    if (advancedOpts.getPublicPath) label("  Public path", advancedOpts.getPublicPath);
    newline();
  }

  for (const op of operations) {
    if (op.action === "write") {
      const rel = path.relative(targetDir, op.path);
      if (rel.endsWith("vite.config.ts") || rel.endsWith("vite.config.js")) {
        banner("Generated vite.config");
        console.log(op.content);
      } else {
        console.log(`  ${op.description}`);
        console.log(`  ${rel}\n`);
      }
    }
  }

  if (opts.dryRun) {
    newline();
    info("Dry run — no changes were made.");
    hint("Re-run without --dry-run to apply.");
    return;
  }

  const proceed =
    yes ||
    (await confirm({
      message: "Look good? Apply these changes?",
      default: true,
    }));

  if (!proceed) {
    info("Cancelled. No changes made.");
    return;
  }

  // ── Apply ──────────────────────────────────────────────────────────────

  newline();

  // Install dependency (unless --no-install)
  if (!opts.noInstall) {
    const installCmd = getInstallCommand(packageManager, "@module-federation/vite");
    info(`Installing: ${installCmd}`);

    try {
      execSync(installCmd, {
        cwd: targetDir,
        stdio: ["inherit", "pipe", "pipe"],
      });
      success("@module-federation/vite installed");
    } catch {
      warn("Install failed \u2014 run manually:");
      warn(`  cd ${targetDir} && ${installCmd}`);
      const continueAnyway =
        yes ||
        (await confirm({
          message: "Continue with file changes anyway?",
          default: true,
        }));
      if (!continueAnyway) {
        info("Cancelled.");
        return;
      }
    }
  } else {
    info("Skipping install (--no-install).");
    hint(`Remember to install: ${getInstallCommand(packageManager, "@module-federation/vite")}`);
  }

  // Backup existing files before overwriting
  for (const op of operations) {
    if (op.action === "write" && fs.existsSync(op.path)) {
      const backupPath = createBackup(op.path);
      if (backupPath) {
        info(`Backed up: ${path.basename(op.path)} \u2192 ${path.basename(backupPath)}`);
      }
    }
  }

  // Apply all operations atomically
  verbose(`Applying ${operations.length} file operation(s)`);
  const ok = applyAndLog(operations, targetDir);
  if (!ok) {
    throw new Error("Some file operations failed. Check the output above.");
  }

  // ── Done ───────────────────────────────────────────────────────────────

  const relDir = path.relative(process.cwd(), targetDir) || ".";

  if (isRemote) {
    outro([
      `1. Ensure ${srcDir}/components/index.ts exists`,
      "",
      "2. Start the dev server:",
      `   cd ${relDir}`,
      `   ${packageManager} dev`,
      "",
      "3. Verify it works:",
      `   http://localhost:${port}/remoteEntry.js`,
    ]);
  } else {
    outro([
      "1. Start remote app(s) FIRST",
      "",
      "2. Then start this host:",
      `   cd ${relDir}`,
      `   ${packageManager} dev`,
      "",
      "3. Import remote components:",
      '   import("remote/components")',
    ]);
  }
}

// ─── Role-specific configuration (extracted from runWizard Step 6) ───────────

/** Shared context passed to role-specific configuration functions. */
interface RoleConfigContext {
  cfg: MfaConfig;
  yes: boolean;
  targetDir: string;
  srcDir: string;
  viteConfig: { path: string; lang: "ts" | "js" } | null;
  isReInit: boolean;
  existingConfigContent: string | null;
  fedName: string;
  port: string;
  buildTarget: BuildTarget;
  shared: ResolvedShared;
  hasTailwind: boolean;
  advancedOpts: FederationOptions;
}

/**
 * Step 6 for remote role: collect exposed modules and generate vite config.
 */
async function configureRemoteRole(
  ctx: RoleConfigContext,
  operations: FileOperation[],
): Promise<void> {
  const {
    cfg,
    yes,
    targetDir,
    srcDir,
    viteConfig,
    isReInit,
    existingConfigContent,
    fedName,
    port,
    buildTarget,
    shared,
    hasTailwind,
    advancedOpts,
  } = ctx;

  step(6, "Exposed modules");
  hint("Define what this remote shares with host apps.");

  const exposes: Record<string, string> = {};

  // Pre-fill from config file
  if (cfg.exposes && Object.keys(cfg.exposes).length > 0) {
    info("Pre-filled from config file:");
    for (const [key, val] of Object.entries(cfg.exposes)) {
      exposes[key] = val;
      success(`${key} \u2192 ${val}`);
    }

    const addMore = yes
      ? false
      : await confirm({ message: "Add more exposed modules?", default: false });

    if (addMore) {
      await collectExposes(exposes, srcDir, yes, Object.keys(cfg.exposes).length + 1);
    }
  } else {
    await collectExposes(exposes, srcDir, yes, 1);
  }

  if (Object.keys(exposes).length === 0) {
    warn("No modules configured. Using default: ./components");
    exposes["./components"] = `./${srcDir}/components/index.ts`;
  }

  // Decide: surgical inject vs full generate
  const configPath = viteConfig ? viteConfig.path : path.join(targetDir, "vite.config.ts");

  const buildMode = isReInit ? "surgical" : viteConfig ? "inject" : "generate";
  verbose(`Vite config strategy: ${buildMode}`);

  const viteConfigContent = buildViteConfig({
    mode: buildMode,
    existingContent:
      existingConfigContent ?? (viteConfig ? fs.readFileSync(viteConfig.path, "utf-8") : null),
    role: "remote",
    name: fedName,
    port,
    buildTarget,
    exposes,
    shared,
    hasTailwind,
    ...advancedOpts,
  });

  operations.push({
    action: "write",
    path: configPath,
    content: viteConfigContent,
    description: "Vite config with Module Federation",
  });
}

/**
 * Step 6 for host role: collect remote applications and generate vite config.
 */
async function configureHostRole(
  ctx: RoleConfigContext,
  operations: FileOperation[],
): Promise<void> {
  const {
    cfg,
    yes,
    targetDir,
    srcDir,
    viteConfig,
    isReInit,
    existingConfigContent,
    fedName,
    port,
    buildTarget,
    shared,
    hasTailwind,
    advancedOpts,
  } = ctx;

  step(6, "Remote applications");
  hint("Declare the remote apps this host will consume.");

  const remotes: Record<string, RemoteEntry> = {};

  // Pre-fill from config file
  if (cfg.remotes && Object.keys(cfg.remotes).length > 0) {
    info("Pre-filled from config file:");

    for (const [remoteName, remoteCfg] of Object.entries(cfg.remotes)) {
      remotes[remoteName] = { name: remoteName, entry: remoteCfg.entry };
      success(`${remoteName} \u2192 ${remoteCfg.entry}`);

      // Type declarations from config
      if (remoteCfg.types && Object.keys(remoteCfg.types).length > 0) {
        const dtsContent = generateTypeDeclaration(remoteName, remoteCfg.types);
        const dtsPath = path.join(targetDir, srcDir, `${remoteName}.d.ts`);
        operations.push({
          action: "write",
          path: dtsPath,
          content: dtsContent,
          description: `Type declarations for "${remoteName}"`,
        });
        success(`Types configured for "${remoteName}"`);
      }

      // Tailwind @source from config
      if (hasTailwind && remoteCfg.tailwindSource) {
        const cssPath = path.join(targetDir, srcDir, "index.css");
        if (fs.existsSync(cssPath)) {
          const cssContent = fs.readFileSync(cssPath, "utf-8");
          const modified = injectTailwindSource(cssContent, remoteName, remoteCfg.tailwindSource);
          if (modified) {
            operations.push({
              action: "write",
              path: cssPath,
              content: modified,
              description: `Tailwind @source for "${remoteName}"`,
            });
            success(`Tailwind @source for "${remoteName}"`);
          } else {
            info(`@source for "${remoteName}" already present`);
          }
        }
      }
    }

    const addMore = yes ? false : await confirm({ message: "Add more remotes?", default: false });

    if (addMore) {
      await collectRemotes(
        remotes,
        operations,
        targetDir,
        srcDir,
        hasTailwind,
        yes,
        Object.keys(cfg.remotes).length + 1,
      );
    }
  } else {
    await collectRemotes(remotes, operations, targetDir, srcDir, hasTailwind, yes, 1);
  }

  // Decide: surgical inject vs full generate
  const configPath = viteConfig ? viteConfig.path : path.join(targetDir, "vite.config.ts");

  const hostBuildMode = isReInit ? "surgical" : viteConfig ? "inject" : "generate";
  verbose(`Vite config strategy: ${hostBuildMode}`);

  const viteConfigContent = buildViteConfig({
    mode: hostBuildMode,
    existingContent:
      existingConfigContent ?? (viteConfig ? fs.readFileSync(viteConfig.path, "utf-8") : null),
    role: "host",
    name: fedName,
    port,
    buildTarget,
    remotes,
    shared,
    hasTailwind,
    ...advancedOpts,
  });

  operations.push({
    action: "write",
    path: configPath,
    content: viteConfigContent,
    description: "Vite config with Module Federation",
  });
}

// ─── Vite config builder (generation strategy) ─────────────────────────────

interface BuildViteConfigOpts extends FederationOptions {
  /** "generate" = new file, "inject" = add federation to existing, "surgical" = update existing federation */
  mode: "generate" | "inject" | "surgical";
  existingContent: string | null;
  role: "remote" | "host";
  name: string;
  port: string;
  buildTarget: BuildTarget;
  exposes?: Record<string, string>;
  remotes?: Record<string, RemoteEntry>;
  shared: ResolvedShared;
  hasTailwind: boolean;
}

function buildViteConfig(opts: BuildViteConfigOpts): string {
  const {
    mode,
    existingContent,
    role,
    name,
    port,
    buildTarget,
    exposes,
    remotes,
    shared,
    hasTailwind,
    manifest,
    dts,
    dev,
    runtimePlugins,
    getPublicPath,
  } = opts;

  /** Federation advanced options to pass through to generators. */
  const fedOpts: FederationOptions = { manifest, dts, dev, runtimePlugins, getPublicPath };

  // Mode 1: Generate a brand-new config from template
  // Templates already include server + build blocks, so return directly.
  if (mode === "generate" || !existingContent) {
    if (role === "remote") {
      return generateRemoteViteConfig({
        name,
        port,
        exposes: exposes ?? {},
        shared,
        hasTailwind,
        buildTarget,
        ...fedOpts,
      });
    } else {
      return generateHostViteConfig({
        name,
        port,
        remotes: remotes ?? {},
        shared,
        hasTailwind,
        buildTarget,
        ...fedOpts,
      });
    }
  }

  let content = existingContent;

  // Mode 2: Surgical update — replace existing federation call in-place
  if (mode === "surgical") {
    const fedCall = findFederationCall(content);
    if (fedCall) {
      const snippet = generateFederationSnippet({
        name,
        role,
        port,
        exposes: role === "remote" ? exposes : undefined,
        remotes: role === "host" ? remotes : undefined,
        shared,
        ...fedOpts,
      });

      content = content.slice(0, fedCall.start) + snippet + content.slice(fedCall.end);
    }
    // If federation() call not found, fall through to inject mode below
    else {
      content = injectFederationPlugin(content, {
        name,
        role,
        port,
        exposes,
        remotes,
        shared,
        hasTailwind,
        ...fedOpts,
      });
    }
  }

  // Mode 3: Inject — add federation plugin to existing config
  if (mode === "inject") {
    content = injectFederationPlugin(content, {
      name,
      role,
      port,
      exposes,
      remotes,
      shared,
      hasTailwind,
      ...fedOpts,
    });
  }

  // ── Post-processing: ensure server + build blocks exist (all modes) ───

  // Add server block if not already present
  if (!/\bserver\s*:/.test(content)) {
    const serverBlock =
      `  server: {\n` +
      `    port: ${port},\n` +
      `    strictPort: true,\n` +
      `    origin: "http://localhost:${port}",\n` +
      `  },\n`;

    const lastClose = content.lastIndexOf("})");
    if (lastClose > 0) {
      content = content.slice(0, lastClose) + serverBlock + content.slice(lastClose);
    }
  }

  // Add build.target block if not already present
  if (!/\bbuild\s*:/.test(content)) {
    const buildBlock = `  build: {\n    target: "${buildTarget}",\n  },\n`;

    const lastClose = content.lastIndexOf("})");
    if (lastClose > 0) {
      content = content.slice(0, lastClose) + buildBlock + content.slice(lastClose);
    }
  }

  return content;
}

/**
 * Inject the federation import + plugin call into an existing vite config.
 * Used by both "inject" mode and as a fallback when surgical mode can't find federation().
 */
function injectFederationPlugin(
  content: string,
  opts: {
    name: string;
    role: Role;
    port: string;
    exposes?: Record<string, string>;
    remotes?: Record<string, RemoteEntry>;
    shared: ResolvedShared;
    hasTailwind: boolean;
  } & FederationOptions,
): string {
  const {
    name,
    role,
    port,
    exposes,
    remotes,
    shared,
    hasTailwind,
    manifest,
    dts,
    dev,
    runtimePlugins,
    getPublicPath,
  } = opts;

  const federationImport = generateFederationImport();
  const snippet = generateFederationSnippet({
    name,
    role,
    port,
    exposes: role === "remote" ? exposes : undefined,
    remotes: role === "host" ? remotes : undefined,
    shared,
    manifest,
    dts,
    dev,
    runtimePlugins,
    getPublicPath,
  });

  let result = content;

  // Add the import statement if not already present
  if (!result.includes("@module-federation/vite")) {
    const importLines = result.split("\n");
    let lastImportIdx = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith("import ")) {
        lastImportIdx = i;
      }
    }

    if (lastImportIdx >= 0) {
      importLines.splice(lastImportIdx + 1, 0, federationImport);
    } else {
      importLines.unshift(federationImport);
    }
    result = importLines.join("\n");
  }

  // Add federation() to the plugins array
  const pluginsBlock = findPluginsArray(result);
  if (pluginsBlock) {
    const closingBracket = pluginsBlock.end - 1;
    result = `${result.slice(0, closingBracket)}    ${snippet},\n  ${result.slice(closingBracket)}`;
  } else {
    // No plugins array found — cannot inject safely, fall back to generate
    warn("Could not find plugins array in existing config. Generating a new config instead.");
    const fedFallback: FederationOptions = { manifest, dts, dev, runtimePlugins, getPublicPath };
    if (role === "remote") {
      return generateRemoteViteConfig({
        name,
        port,
        exposes: exposes ?? {},
        shared,
        hasTailwind,
        ...fedFallback,
      });
    } else {
      return generateHostViteConfig({
        name,
        port,
        remotes: remotes ?? {},
        shared,
        hasTailwind,
        ...fedFallback,
      });
    }
  }

  return result;
}

// ─── Interactive collectors ────────────────────────────────────────────────

async function collectExposes(
  exposes: Record<string, string>,
  srcDir: string,
  yes: boolean,
  startIdx: number,
): Promise<void> {
  let idx = startIdx;
  let addMore = true;

  while (addMore) {
    const defaultPath = idx === 1 ? "./components" : `./module${idx}`;

    const exposePath =
      yes && idx === 1
        ? defaultPath
        : await input({ message: `Expose path #${idx}?`, default: defaultPath });

    const defaultLocal = `./${srcDir}/components/index.ts`;

    const localPath =
      yes && idx === 1
        ? defaultLocal
        : await input({
            message: `Local file for "${exposePath}"?`,
            default: idx === 1 ? defaultLocal : undefined,
          });

    if (localPath) {
      exposes[exposePath] = localPath;
      success(`${exposePath} \u2192 ${localPath}`);
      idx++;
    }

    addMore = yes
      ? false
      : await confirm({ message: "Add another exposed module?", default: false });
  }
}

async function collectRemotes(
  remotes: Record<string, RemoteEntry>,
  operations: FileOperation[],
  targetDir: string,
  srcDir: string,
  hasTailwind: boolean,
  yes: boolean,
  startIdx: number,
): Promise<void> {
  let idx = startIdx;
  let addMore = true;

  while (addMore) {
    newline();
    info(`Remote #${idx}`);

    const defaultRemoteName = idx === 1 ? "remote" : `remote${idx}`;
    const defaultRemotePort = `${5000 + idx}`;

    const remoteName =
      yes && idx === 1
        ? defaultRemoteName
        : await input({
            message: "Remote name?",
            default: defaultRemoteName,
            validate: validateName,
          });

    const remotePort =
      yes && idx === 1
        ? defaultRemotePort
        : await input({
            message: "Remote port?",
            default: defaultRemotePort,
            validate: validatePort,
          });

    const defaultEntry = `http://localhost:${remotePort}/remoteEntry.js`;

    const remoteEntry =
      yes && idx === 1
        ? defaultEntry
        : await input({
            message: "Remote entry URL?",
            default: defaultEntry,
          });

    remotes[remoteName] = { name: remoteName, entry: remoteEntry };
    success(`${remoteName} \u2192 ${remoteEntry}`);

    // Type declarations
    const wantTypes =
      yes ||
      (await confirm({
        message: `Generate type declarations for "${remoteName}"?`,
        default: true,
      }));

    if (wantTypes) {
      const modules: Record<string, string[]> = {};
      let addModules = true;

      while (addModules) {
        const defaultMod = "./components";
        const defaultExports = "CardExample, FormExample";

        const modPath = yes
          ? defaultMod
          : await input({ message: "Exposed module path?", default: defaultMod });

        const exportsRaw = yes
          ? defaultExports
          : await input({
              message: "Component names? (comma-separated)",
              default: defaultExports,
            });

        const exportNames = exportsRaw
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);

        if (exportNames.length > 0) {
          modules[modPath] = exportNames;
          success(
            `${remoteName}/${modPath.replace("./", "")} \u2192 { ${exportNames.join(", ")} }`,
          );
        }

        addModules = yes
          ? false
          : await confirm({ message: "Add another module from this remote?", default: false });
      }

      if (Object.keys(modules).length > 0) {
        const dtsContent = generateTypeDeclaration(remoteName, modules);
        const dtsPath = path.join(targetDir, srcDir, `${remoteName}.d.ts`);
        operations.push({
          action: "write",
          path: dtsPath,
          content: dtsContent,
          description: `Type declarations for "${remoteName}"`,
        });
      }
    }

    // Tailwind @source
    if (hasTailwind) {
      const wantSource =
        yes ||
        (await confirm({
          message: `Add Tailwind @source for "${remoteName}"?`,
          default: true,
        }));

      if (wantSource) {
        const defaultSrc = `../../${remoteName
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .replace(/^-/, "")}/src`;

        const remoteSrcPath = yes
          ? defaultSrc
          : await input({
              message: "Relative path to remote's src/?",
              default: defaultSrc,
            });

        const cssPath = path.join(targetDir, srcDir, "index.css");
        if (fs.existsSync(cssPath)) {
          const cssContent = fs.readFileSync(cssPath, "utf-8");
          const modified = injectTailwindSource(cssContent, remoteName, remoteSrcPath);

          if (modified) {
            operations.push({
              action: "write",
              path: cssPath,
              content: modified,
              description: `Tailwind @source for "${remoteName}"`,
            });
            success("Will add @source directive to index.css");
          } else {
            info("@source already present in index.css");
          }
        } else {
          warn("index.css not found \u2014 skipping @source.");
        }
      }
    }

    idx++;
    addMore = yes ? false : await confirm({ message: "Add another remote?", default: false });
  }
}
