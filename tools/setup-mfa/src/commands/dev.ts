import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import type { PackageManager, Role, WorkspaceAppEntry, WorkspaceConfig } from "../types.js";
import { loadConfig } from "../utils/config.js";
import { detectPackageManager, detectViteConfig, readPackageJson } from "../utils/detect.js";
import {
  banner,
  hint,
  info,
  intro,
  label,
  error as logError,
  newline,
  step,
  success,
  warn,
} from "../utils/log.js";
import { discoverApps } from "./workspace.js";

// ─── Types ──────────────────────────────────────────────────────────────────

type AppRole = Role | "unknown";

interface ResolvedApp {
  dir: string;
  name: string;
  role: AppRole;
  port: string | undefined;
  packageManager: PackageManager;
}

// ─── Color palette for per-app prefixes ─────────────────────────────────────

const COLORS = [
  pc.cyan,
  pc.magenta,
  pc.yellow,
  pc.green,
  pc.blue,
  pc.red,
  (s: string) => pc.bold(pc.cyan(s)),
  (s: string) => pc.bold(pc.magenta(s)),
];

// ─── Command ────────────────────────────────────────────────────────────────

export async function runDev(
  opts: {
    workspaceDir?: string;
    filter?: string[];
  },
  version: string,
): Promise<void> {
  intro(version);

  // ── Step 1: Resolve workspace root ─────────────────────────────────────

  step(1, "Workspace root");

  const rootDir = path.resolve(opts.workspaceDir ?? ".");
  info(`Root: ${rootDir}`);

  if (!fs.existsSync(rootDir)) {
    throw new Error(`Directory does not exist: ${rootDir}`);
  }

  // ── Step 2: Discover apps ──────────────────────────────────────────────

  step(2, "Discover apps");

  const workspacePath = path.join(rootDir, "mfa.workspace.json");
  let entries: WorkspaceAppEntry[];

  if (fs.existsSync(workspacePath)) {
    info("Found mfa.workspace.json");
    const raw = fs.readFileSync(workspacePath, "utf-8");
    const config = JSON.parse(raw) as WorkspaceConfig;
    entries = config.apps ?? [];
  } else {
    info("No mfa.workspace.json — auto-discovering apps...");
    entries = discoverApps(rootDir);
  }

  if (entries.length === 0) {
    warn("No apps found.");
    hint("Create an mfa.workspace.json or ensure apps have package.json + vite.config.");
    return;
  }

  // ── Step 3: Resolve app details ────────────────────────────────────────

  step(3, "Resolving app details");

  const resolved: ResolvedApp[] = [];

  for (const entry of entries) {
    const appDir = path.resolve(rootDir, entry.dir);

    // Security: ensure resolved path stays under the workspace root
    const relative = path.relative(rootDir, appDir);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      warn(`Skipping ${entry.dir} — path escapes workspace root`);
      continue;
    }

    if (!fs.existsSync(appDir)) {
      warn(`Skipping ${entry.dir} — directory not found`);
      continue;
    }

    // Detect package manager
    const pm = detectPackageManager(appDir);

    // Try to resolve role and port from workspace entry, then mfa.config.json, then vite.config
    let role: AppRole = entry.role ?? "unknown";
    let port = entry.port != null ? String(entry.port) : undefined;
    let name = entry.name ?? entry.dir;

    // Try mfa.config.json for missing details
    try {
      const cfg = loadConfig(appDir);
      if (cfg) {
        if (role === "unknown" && cfg.config.role) role = cfg.config.role;
        if (!port && cfg.config.port) port = String(cfg.config.port);
        if (cfg.config.name) name = cfg.config.name;
      }
    } catch {
      // Config loading failed — continue with defaults
    }

    // Try detecting from vite config content
    if (role === "unknown") {
      const viteConfig = detectViteConfig(appDir);
      if (viteConfig) {
        try {
          const content = fs.readFileSync(viteConfig.path, "utf-8");
          if (content.includes("exposes")) role = "remote";
          else if (content.includes("remotes")) role = "host";
        } catch {
          // Ignore read errors
        }
      }
    }

    resolved.push({ dir: entry.dir, name, role, port, packageManager: pm });
  }

  // Apply filter if provided
  let appsToRun = resolved;
  if (opts.filter && opts.filter.length > 0) {
    const filterSet = new Set(opts.filter.map((f) => f.toLowerCase()));
    appsToRun = resolved.filter(
      (app) => filterSet.has(app.name.toLowerCase()) || filterSet.has(app.dir.toLowerCase()),
    );

    if (appsToRun.length === 0) {
      logError(`No apps match filter: ${opts.filter.join(", ")}`);
      hint(`Available apps: ${resolved.map((a) => a.name).join(", ")}`);
      return;
    }
  }

  // Sort: remotes first, then hosts, then unknown
  appsToRun.sort((a, b) => {
    const order = { remote: 0, unknown: 1, host: 2 };
    return order[a.role] - order[b.role];
  });

  // ── Step 4: Summary ────────────────────────────────────────────────────

  step(4, "Start plan");
  newline();

  for (const app of appsToRun) {
    const roleTag =
      app.role === "remote"
        ? pc.magenta("remote")
        : app.role === "host"
          ? pc.cyan("host")
          : pc.dim("?");
    const portTag = app.port ? `:${app.port}` : "";
    label(
      app.dir,
      `${roleTag} ${pc.dim("·")} ${app.name}${portTag} ${pc.dim(`(${app.packageManager})`)}`,
    );
  }

  newline();
  info(`Starting ${appsToRun.length} app(s) — remotes first, then hosts...`);
  newline();

  // ── Step 5: Spawn processes ────────────────────────────────────────────

  const children: ChildProcess[] = [];
  let shuttingDown = false;

  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${pc.dim("Stopping all apps...")}`);

    for (const child of children) {
      if (child.pid && !child.killed) {
        // On Windows, use taskkill for tree kill; on Unix, signal the process group
        if (process.platform === "win32") {
          try {
            spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
              stdio: "ignore",
            });
          } catch {
            child.kill("SIGTERM");
          }
        } else {
          child.kill("SIGTERM");
        }
      }
    }

    // Force exit after a grace period
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Find the longest app name for aligned prefix
  const maxNameLen = Math.max(...appsToRun.map((a) => a.name.length), 5);

  // Stagger remote starts slightly before hosts
  const remotes = appsToRun.filter((a) => a.role === "remote" || a.role === "unknown");
  const hosts = appsToRun.filter((a) => a.role === "host");

  // Start remotes first
  for (let i = 0; i < remotes.length; i++) {
    children.push(spawnApp(remotes[i], i, maxNameLen, rootDir));
  }

  // Brief delay so remotes can start binding ports before hosts try to connect
  if (remotes.length > 0 && hosts.length > 0) {
    await sleep(1500);
  }

  // Start hosts
  for (let i = 0; i < hosts.length; i++) {
    children.push(spawnApp(hosts[i], remotes.length + i, maxNameLen, rootDir));
  }

  // Show a summary line once all are spawned
  newline();
  banner("All apps started");
  newline();

  for (const app of appsToRun) {
    const url = app.port ? `http://localhost:${app.port}` : "(port unknown)";
    success(`${app.name.padEnd(maxNameLen)} → ${pc.underline(url)}`);
  }

  newline();
  info(`Press ${pc.bold("Ctrl+C")} to stop all apps`);

  // Keep the process alive — the child processes will keep it running
  // Wait for all children to exit
  await Promise.all(
    children.map(
      (child) =>
        new Promise<void>((resolve) => {
          child.on("close", resolve);
          child.on("error", resolve);
        }),
    ),
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function spawnApp(
  app: ResolvedApp,
  colorIndex: number,
  maxNameLen: number,
  rootDir: string,
): ChildProcess {
  const color = COLORS[colorIndex % COLORS.length];
  const prefix = color(`[${app.name.padEnd(maxNameLen)}]`);
  const appDir = path.resolve(rootDir, app.dir);

  // Determine the dev command
  const devCmd = getDevCommand(app.packageManager, appDir);

  console.log(`${prefix} ${pc.dim(`cd ${app.dir} && ${devCmd}`)}`);

  // Use shell: true for cross-platform compatibility (npm/pnpm/yarn all need shell)
  const child = spawn(devCmd, {
    cwd: appDir,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });

  // Prefix stdout lines
  if (child.stdout) {
    child.stdout.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          console.log(`${prefix} ${line}`);
        }
      }
    });
  }

  // Prefix stderr lines
  if (child.stderr) {
    child.stderr.on("data", (data: Buffer) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (line.trim()) {
          console.log(`${prefix} ${pc.dim(line)}`);
        }
      }
    });
  }

  child.on("close", (code) => {
    if (code !== null && code !== 0) {
      console.log(`${prefix} ${pc.red(`exited with code ${code}`)}`);
    } else {
      console.log(`${prefix} ${pc.dim("stopped")}`);
    }
  });

  child.on("error", (err) => {
    console.log(`${prefix} ${pc.red(`error: ${err.message}`)}`);
  });

  return child;
}

function getDevCommand(pm: PackageManager, appDir: string): string {
  // Check if the project has a "dev" script
  const pkg = readPackageJson(appDir);
  const hasDevScript = pkg?.scripts && "dev" in (pkg.scripts as Record<string, unknown>);

  if (hasDevScript) {
    switch (pm) {
      case "pnpm":
        return "pnpm dev";
      case "yarn":
        return "yarn dev";
      case "bun":
        return "bun dev";
      default:
        return "npm run dev";
    }
  }

  // Fallback: try to run vite directly
  return "npx vite";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
