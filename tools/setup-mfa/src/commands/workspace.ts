import fs from "node:fs";
import path from "node:path";
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import type { MfaConfigRemoteEntry, Role, WorkspaceAppEntry, WorkspaceConfig } from "../types.js";
import { detectProject } from "../utils/detect.js";
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
import {
  validateExposePath,
  validateName,
  validatePort,
  validateRemoteUrl,
} from "../utils/validators.js";
import { runWizard } from "./init.js";

// ─── Constants ──────────────────────────────────────────────────────────────

const WORKSPACE_FILE = "mfa.workspace.json";

/**
 * Validate a local file path (must start with "./").
 * This is workspace-specific: it only checks syntax, not file existence,
 * since workspace apps may not have their files created yet.
 */
function validateLocalFilePath(v: string): string | true {
  return v.startsWith("./")
    ? true
    : 'Must be a relative path starting with "./" (e.g. ./src/App.tsx).';
}

// ─── Command ───────────────────────────────────────────────────────────────

export async function runWorkspace(
  opts: {
    workspaceDir?: string;
    yes?: boolean;
    dryRun?: boolean;
    noInstall?: boolean;
  },
  version: string,
): Promise<void> {
  const yes = opts.yes ?? false;

  intro(version);

  // ── Step 1: Workspace root ────────────────────────────────────────────

  step(1, "Workspace root");

  const workspaceDir =
    opts.workspaceDir ??
    (await input({
      message: "Where is your monorepo / workspace root?",
      default: ".",
    }));

  const rootDir = path.resolve(workspaceDir);
  verbose(`Resolved workspace root: ${rootDir}`);

  if (!fs.existsSync(rootDir)) {
    throw new Error(`Directory does not exist: ${rootDir}`);
  }

  // ── Step 2: Load or discover apps ─────────────────────────────────────

  step(2, "Discover apps");

  const workspacePath = path.join(rootDir, WORKSPACE_FILE);
  let config: WorkspaceConfig;

  if (fs.existsSync(workspacePath)) {
    // Load from mfa.workspace.json
    info(`Found ${WORKSPACE_FILE}`);
    verbose(`Loading: ${workspacePath}`);

    try {
      const raw = fs.readFileSync(workspacePath, "utf-8");
      config = JSON.parse(raw) as WorkspaceConfig;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse ${WORKSPACE_FILE}: ${msg}`);
    }

    if (!config.apps || !Array.isArray(config.apps) || config.apps.length === 0) {
      throw new Error(`${WORKSPACE_FILE} must contain a non-empty "apps" array.`);
    }

    // Validate each entry
    for (const app of config.apps) {
      if (!app.dir) {
        throw new Error(`Each app in ${WORKSPACE_FILE} must have a "dir" field.`);
      }
      const appDir = path.resolve(rootDir, app.dir);
      if (!fs.existsSync(appDir)) {
        throw new Error(`App directory not found: ${app.dir} (resolved: ${appDir})`);
      }
    }
  } else {
    // Auto-discover: scan for directories with package.json + vite.config
    info(`No ${WORKSPACE_FILE} found — scanning for projects...`);
    newline();

    const discovered = discoverApps(rootDir);

    if (discovered.length === 0) {
      warn("No Vite projects found in subdirectories.");
      hint("Create an mfa.workspace.json to configure apps manually.");
      return;
    }

    info(`Found ${discovered.length} Vite project(s):`);
    for (const app of discovered) {
      const project = detectProject(path.resolve(rootDir, app.dir));
      const fedStatus = project?.hasFederation ? " (already federated)" : "";
      label(`  ${app.dir}`, `${app.name ?? "unnamed"}${fedStatus}`);
    }

    if (!yes) {
      newline();
      const selected = await checkbox({
        message: "Select apps to configure:",
        choices: discovered.map((app) => ({
          value: app.dir,
          name: `${app.dir} (${app.name ?? "unnamed"})`,
          checked: true,
        })),
      });

      if (selected.length === 0) {
        info("No apps selected. Nothing to do.");
        return;
      }

      config = {
        apps: discovered.filter((app) => selected.includes(app.dir)),
      };
    } else {
      config = { apps: discovered };
    }
  }

  // ── Step 3: Configure each app ────────────────────────────────────────

  step(3, "Configure apps");
  hint("Set role, exposes, and remotes for each app.");
  newline();

  if (!yes) {
    for (let i = 0; i < config.apps.length; i++) {
      const app = config.apps[i];
      const appDir = path.resolve(rootDir, app.dir);

      banner(`[${i + 1}/${config.apps.length}] ${app.dir}`);

      // ── Role ──────────────────────────────────────────────────────
      if (!app.role) {
        app.role = await select<Role>({
          message: `Role for "${app.name ?? app.dir}"?`,
          choices: [
            {
              value: "remote" as Role,
              name: "Remote  — exposes components to other apps",
            },
            {
              value: "host" as Role,
              name: "Host    — consumes components from remote apps",
            },
          ],
        });
      } else {
        info(`Role: ${app.role} (from config)`);
      }

      // ── Name ──────────────────────────────────────────────────────
      if (!app.name) {
        app.name = await input({
          message: "Federation name?",
          default: path.basename(app.dir).replace(/[^a-zA-Z0-9_-]/g, ""),
          validate: validateName,
        });
      } else {
        info(`Name: ${app.name} (from config)`);
      }

      // ── Port ──────────────────────────────────────────────────────
      if (app.port == null) {
        const defaultPort = app.role === "host" ? "5000" : `${5001 + i}`;
        app.port = await input({
          message: "Dev server port?",
          default: defaultPort,
          validate: validatePort,
        });
      } else {
        info(`Port: ${app.port} (from config)`);
      }

      // ── Exposes (remote) ──────────────────────────────────────────
      if (app.role === "remote") {
        newline();
        hint("Define what this remote shares with host apps.");

        // Show existing exposes from config
        const existing = app.exposes ?? {};
        if (Object.keys(existing).length > 0) {
          info("Current exposes:");
          for (const [key, val] of Object.entries(existing)) {
            success(`  ${key} → ${val}`);
          }
          newline();
        }

        // Scan for suggestions
        const srcDir = detectSrcDir(appDir);
        const suggestions = scanExposablePaths(appDir, srcDir);

        const wantModify =
          Object.keys(existing).length > 0
            ? await confirm({
                message: "Modify exposed modules?",
                default: false,
              })
            : true;

        if (wantModify) {
          const exposes = { ...existing };
          await collectExposes(exposes, srcDir, suggestions);
          app.exposes = exposes;
        }

        if (!app.exposes || Object.keys(app.exposes).length === 0) {
          warn("No modules configured. Using default: ./components");
          app.exposes = {
            "./components": `./${srcDir}/components/index.ts`,
          };
        }

        // Clear remotes — not applicable for remote role
        delete app.remotes;
      }

      // ── Remotes (host) ────────────────────────────────────────────
      if (app.role === "host") {
        newline();
        hint("Declare the remote apps this host will consume.");

        // Show existing remotes from config
        const existing = app.remotes ?? {};
        if (Object.keys(existing).length > 0) {
          info("Current remotes:");
          for (const [name, cfg] of Object.entries(existing)) {
            success(`  ${name} → ${cfg.entry}`);
          }
          newline();
        }

        const wantModify =
          Object.keys(existing).length > 0
            ? await confirm({
                message: "Modify remote applications?",
                default: false,
              })
            : true;

        if (wantModify) {
          const remotes = { ...existing };
          await collectRemotes(remotes, config.apps, app);
          app.remotes = remotes;
        }

        if (!app.remotes || Object.keys(app.remotes).length === 0) {
          warn("No remotes configured. You can add them later via mfx init or mfa.config.json.");
        }

        // Clear exposes — not applicable for host role
        delete app.exposes;
      }

      newline();
      success(`Configured: ${app.dir} (${app.role})`);
    }
  } else {
    // --yes mode: ensure defaults for apps missing role
    for (let i = 0; i < config.apps.length; i++) {
      const app = config.apps[i];
      if (!app.role) {
        app.role = "remote";
        verbose(`${app.dir}: defaulting to remote role (--yes)`);
      }
      if (app.port == null) {
        app.port = app.role === "host" ? "5000" : `${5001 + i}`;
      }
    }
  }

  // ── Step 4: Save config ───────────────────────────────────────────────

  const shouldSave =
    yes ||
    (await confirm({
      message: `Save configuration to ${WORKSPACE_FILE}?`,
      default: true,
    }));

  if (shouldSave) {
    const output = `${JSON.stringify(config, null, 2)}\n`;
    fs.writeFileSync(workspacePath, output, "utf-8");
    success(`Written: ${WORKSPACE_FILE}`);
  }

  // ── Step 5: Review plan ───────────────────────────────────────────────

  step(4, "Configuration plan");
  newline();

  for (const app of config.apps) {
    const role = app.role ?? "?";
    const port = app.port != null ? String(app.port) : "?";
    const extras: string[] = [];

    if (app.role === "remote" && app.exposes) {
      const count = Object.keys(app.exposes).length;
      extras.push(`${count} expose${count !== 1 ? "s" : ""}`);
    }
    if (app.role === "host" && app.remotes) {
      const count = Object.keys(app.remotes).length;
      extras.push(`${count} remote${count !== 1 ? "s" : ""}`);
    }

    const suffix = extras.length > 0 ? ` · ${extras.join(", ")}` : "";
    label(app.dir, `${role} · port ${port} · name: ${app.name ?? "(auto)"}${suffix}`);
  }

  // Port conflict check
  const portMap = new Map<string, string[]>();
  for (const app of config.apps) {
    if (app.port != null) {
      const p = String(app.port);
      const dirs = portMap.get(p) ?? [];
      dirs.push(app.dir);
      portMap.set(p, dirs);
    }
  }
  for (const [port, dirs] of portMap) {
    if (dirs.length > 1) {
      newline();
      warn(`Port ${port} is used by multiple apps: ${dirs.join(", ")}`);
    }
  }

  if (opts.dryRun) {
    newline();
    info("Dry run — no changes will be made.");
    hint("Re-run without --dry-run to apply.");
    return;
  }

  newline();
  const proceed =
    yes ||
    (await confirm({
      message: `Set up Module Federation in ${config.apps.length} app(s)?`,
      default: true,
    }));

  if (!proceed) {
    info("Cancelled.");
    return;
  }

  // ── Step 5: Run init for each app ─────────────────────────────────────

  step(5, "Applying");
  newline();

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < config.apps.length; i++) {
    const app = config.apps[i];
    const appDir = path.resolve(rootDir, app.dir);

    banner(`[${i + 1}/${config.apps.length}] ${app.dir}`);

    try {
      // Build remotes in the format WizardOptions expects
      const wizardRemotes: Record<string, MfaConfigRemoteEntry> | undefined =
        app.remotes && Object.keys(app.remotes).length > 0 ? app.remotes : undefined;

      await runWizard(
        {
          projectDir: appDir,
          role: app.role,
          name: app.name,
          port: app.port != null ? String(app.port) : undefined,
          buildTarget: app.buildTarget,
          yes: true, // non-interactive per-app
          dryRun: false,
          noInstall: opts.noInstall,
          config: undefined, // each app can have its own mfa.config.json
          exposes: app.exposes,
          remotes: wizardRemotes,
        },
        version,
      );

      successCount++;
      success(`Done: ${app.dir}`);
    } catch (err) {
      failCount++;
      const msg = err instanceof Error ? err.message : String(err);
      warn(`Failed: ${app.dir} — ${msg}`);

      if (!yes) {
        const cont = await confirm({
          message: "Continue with remaining apps?",
          default: true,
        });
        if (!cont) {
          info("Stopped.");
          break;
        }
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────

  newline();
  banner("Workspace summary");
  newline();
  label("Total", `${config.apps.length}`);
  label("Succeeded", `${successCount}`);
  if (failCount > 0) {
    label("Failed", `${failCount}`);
  }

  if (failCount === 0) {
    outro([
      "All apps configured!",
      "",
      "Start your apps (remotes first, then hosts):",
      ...config.apps
        .sort((a, b) => {
          if (a.role === "remote" && b.role !== "remote") return -1;
          if (a.role !== "remote" && b.role === "remote") return 1;
          return 0;
        })
        .map((a) => `  cd ${a.dir} && pnpm dev`),
    ]);
  } else {
    newline();
    info(`${failCount} app(s) failed. Fix the issues and run again.`);
  }
}

// ─── Interactive Collectors ─────────────────────────────────────────────────

/**
 * Interactively collect exposed modules for a remote app.
 */
async function collectExposes(
  exposes: Record<string, string>,
  srcDir: string,
  suggestions: string[],
): Promise<void> {
  // If we have scan suggestions, offer to pick from them
  if (suggestions.length > 0) {
    info(`Found ${suggestions.length} exposable path(s) in source:`);
    for (const s of suggestions) {
      verbose(`  ${s}`);
    }

    const useSuggestions = await confirm({
      message: "Pick from discovered files?",
      default: true,
    });

    if (useSuggestions) {
      const selected = await checkbox({
        message: "Select files/directories to expose:",
        choices: suggestions.map((filePath) => {
          // Generate a sensible expose key from the file path
          const key = toExposeKey(filePath, srcDir);
          return {
            value: filePath,
            name: `${key}  →  ./${filePath}`,
            checked: false,
          };
        }),
      });

      for (const filePath of selected) {
        const key = toExposeKey(filePath, srcDir);
        exposes[key] = `./${filePath}`;
        success(`${key} → ./${filePath}`);
      }
    }
  }

  // Allow manual additions
  let addMore = await confirm({
    message:
      Object.keys(exposes).length > 0
        ? "Add more exposed modules manually?"
        : "Add an exposed module manually?",
    default: Object.keys(exposes).length === 0,
  });

  let idx = Object.keys(exposes).length + 1;

  while (addMore) {
    const defaultPath = idx === 1 ? "./components" : `./module${idx}`;

    const exposePath = await input({
      message: `Expose path #${idx}?`,
      default: defaultPath,
      validate: validateExposePath,
    });

    const defaultLocal = idx === 1 ? `./${srcDir}/components/index.ts` : `./${srcDir}/index.ts`;

    const localPath = await input({
      message: `Local file for "${exposePath}"?`,
      default: defaultLocal,
      validate: validateLocalFilePath,
    });

    if (localPath) {
      exposes[exposePath] = localPath;
      success(`${exposePath} → ${localPath}`);
      idx++;
    }

    addMore = await confirm({
      message: "Add another exposed module?",
      default: false,
    });
  }
}

/**
 * Interactively collect remote applications for a host app.
 * Auto-suggests remotes discovered from other workspace apps.
 */
async function collectRemotes(
  remotes: Record<string, MfaConfigRemoteEntry>,
  allApps: WorkspaceAppEntry[],
  currentApp: WorkspaceAppEntry,
): Promise<void> {
  // Find workspace remotes that are already configured
  const workspaceRemotes = allApps.filter(
    (a) => a.role === "remote" && a.dir !== currentApp.dir && a.name,
  );

  // Offer to auto-link workspace remotes
  if (workspaceRemotes.length > 0) {
    info("Detected remote apps in this workspace:");
    for (const remote of workspaceRemotes) {
      label(`  ${remote.name ?? remote.dir}`, `port ${remote.port ?? "?"}`);
    }
    newline();

    const autoLink = await confirm({
      message: "Auto-link these workspace remotes?",
      default: true,
    });

    if (autoLink) {
      const selected = await checkbox({
        message: "Select remotes to link:",
        choices: workspaceRemotes.map((r) => ({
          value: r.name ?? r.dir,
          name: `${r.name ?? r.dir} (port ${r.port ?? "?"})`,
          checked: true,
        })),
      });

      for (const remoteName of selected) {
        const remote = workspaceRemotes.find((r) => (r.name ?? r.dir) === remoteName);
        if (remote) {
          const port = remote.port != null ? String(remote.port) : "5001";
          const entry = `http://localhost:${port}/remoteEntry.js`;
          remotes[remoteName] = { entry };
          success(`${remoteName} → ${entry}`);
        }
      }
    }
  }

  // Allow adding additional remotes manually
  let addManual =
    Object.keys(remotes).length === 0
      ? true
      : await confirm({
          message: "Add additional remotes manually?",
          default: false,
        });

  let idx = Object.keys(remotes).length + 1;

  while (addManual) {
    newline();
    info(`Remote #${idx}`);

    const remoteName = await input({
      message: "Remote name?",
      default: `remote${idx}`,
      validate: validateName,
    });

    const remotePort = await input({
      message: "Remote port?",
      default: `${5000 + idx}`,
      validate: validatePort,
    });

    const defaultEntry = `http://localhost:${remotePort}/remoteEntry.js`;

    const remoteEntry = await input({
      message: "Remote entry URL?",
      default: defaultEntry,
      validate: validateRemoteUrl,
    });

    remotes[remoteName] = { entry: remoteEntry };
    success(`${remoteName} → ${remoteEntry}`);
    idx++;

    addManual = await confirm({
      message: "Add another remote?",
      default: false,
    });
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Detect the source directory for a project (src/ or .).
 */
function detectSrcDir(appDir: string): string {
  return fs.existsSync(path.join(appDir, "src")) ? "src" : ".";
}

/**
 * Scan for exposable paths in a project's source directory.
 * Returns relative paths like "src/components/Button.tsx".
 */
function scanExposablePaths(appDir: string, srcDir: string): string[] {
  const results: string[] = [];
  const baseDir = path.join(appDir, srcDir);

  if (!fs.existsSync(baseDir)) return results;

  // Scan common exposable directories
  const exposableDirs = [
    "components",
    "sections",
    "hooks",
    "utils",
    "lib",
    "features",
    "pages",
    "views",
  ];

  for (const dir of exposableDirs) {
    const fullDir = path.join(baseDir, dir);
    if (!fs.existsSync(fullDir) || !fs.statSync(fullDir).isDirectory()) {
      continue;
    }

    // Check for index file (barrel export)
    const indexFiles = ["index.ts", "index.tsx", "index.js"];
    for (const idx of indexFiles) {
      if (fs.existsSync(path.join(fullDir, idx))) {
        results.push(path.join(srcDir, dir, idx).replace(/\\/g, "/"));
        break;
      }
    }

    // Also list individual component files (1 level deep)
    try {
      const entries = fs.readdirSync(fullDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (entry.name.startsWith(".") || entry.name.startsWith("index.")) {
          continue;
        }
        if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          results.push(path.join(srcDir, dir, entry.name).replace(/\\/g, "/"));
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  return results;
}

/**
 * Convert a file path to an expose key.
 * e.g. "src/components/Button.tsx" → "./components/Button"
 */
function toExposeKey(filePath: string, srcDir: string): string {
  let key = filePath;

  // Strip srcDir prefix
  if (srcDir !== "." && key.startsWith(`${srcDir}/`)) {
    key = key.slice(srcDir.length + 1);
  }

  // Strip file extension
  key = key.replace(/\.(tsx?|jsx?)$/, "");

  // Strip trailing /index
  key = key.replace(/\/index$/, "");

  return `./${key}`;
}

/**
 * Scan subdirectories (1 level deep + common patterns) for Vite projects.
 */
export function discoverApps(rootDir: string): WorkspaceAppEntry[] {
  const apps: WorkspaceAppEntry[] = [];
  const scanned = new Set<string>();

  // Common monorepo patterns to scan
  const searchDirs = [rootDir];
  const subdirPatterns = ["apps", "packages", "projects", "services", "modules"];

  for (const pattern of subdirPatterns) {
    const dir = path.join(rootDir, pattern);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      searchDirs.push(dir);
    }
  }

  for (const searchDir of searchDirs) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(searchDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      const appDir = path.join(searchDir, entry.name);
      const relDir = path.relative(rootDir, appDir);

      // Skip if already scanned (e.g. "apps" dir itself)
      if (scanned.has(appDir)) continue;
      scanned.add(appDir);

      // Check for package.json and vite.config
      const hasPkg = fs.existsSync(path.join(appDir, "package.json"));
      const hasVite =
        fs.existsSync(path.join(appDir, "vite.config.ts")) ||
        fs.existsSync(path.join(appDir, "vite.config.mts")) ||
        fs.existsSync(path.join(appDir, "vite.config.js"));

      if (hasPkg && hasVite) {
        // Try to read the package name
        let pkgName: string | undefined;
        try {
          const pkg = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf-8"));
          pkgName = pkg.name;
        } catch {
          // Ignore
        }

        const cleanName = (pkgName ?? entry.name).replace(/[^a-zA-Z0-9_-]/g, "");

        apps.push({
          dir: relDir.replace(/\\/g, "/"), // normalise to forward slashes
          name: cleanName,
        });
      }
    }
  }

  return apps;
}
