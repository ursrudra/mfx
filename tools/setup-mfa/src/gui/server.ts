import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { runWizard } from "../commands/init.js";
import { discoverApps } from "../commands/workspace.js";
import type { BuildTarget, Role } from "../types.js";
import { loadConfig } from "../utils/config.js";
import { detectProject } from "../utils/detect.js";
import { detectRole, findFederationCall, parseExposes, parseRemotes } from "../utils/parse.js";
import { getHtml } from "./html.js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DetectResponse {
  success: boolean;
  project?: {
    name: string;
    packageManager: string;
    viteConfig: string | null;
    hasTailwind: boolean;
    hasFederation: boolean;
    srcDir: string;
    role: string | null;
    exposes: Record<string, string>;
    remotes: Record<string, string>;
    federationName: string | null;
    port: string | null;
  };
  config?: {
    filePath: string;
    role?: string;
    name?: string;
    port?: string;
  };
  error?: string;
}

interface ApplyConfig {
  projectDir: string;
  role: string;
  name: string;
  port: string;
  exposes?: Record<string, string>;
  remotes?: Array<{ name: string; port: string; entry: string }>;
  noInstall?: boolean;
  buildTarget?: string;
  // Advanced federation options
  manifest?: boolean;
  dts?: boolean;
  dev?: boolean;
  runtimePlugins?: string[];
  getPublicPath?: string;
}

// ─── Server ─────────────────────────────────────────────────────────────────

/** Start the local HTTP server that serves the web GUI on 127.0.0.1. */
export function startGuiServer(
  opts: { port?: number; open?: boolean },
  version: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handleRequest(req, res, version).catch((err) => {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      });
    });

    const port = opts.port ?? 0; // 0 = auto-assign

    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("Failed to start server"));
        return;
      }

      const url = `http://127.0.0.1:${addr.port}`;
      console.log(`\n  Module Federation Studio running at: ${url}\n`);
      console.log("  Press Ctrl+C to stop.\n");

      if (opts.open !== false) {
        openBrowser(url);
      }
    });

    server.on("error", reject);

    // Clean shutdown
    const shutdown = () => {
      console.log("\n  Shutting down GUI server...\n");
      server.close(() => resolve());
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });
}

// ─── Path safety ────────────────────────────────────────────────────────────

/** Resolve and validate a user-supplied path. Throws on null bytes or non-directories. */
export function sanitizePath(raw: string): string {
  const resolved = path.resolve(raw);

  // Block null bytes (potential exploit)
  if (raw.includes("\0")) {
    throw new Error("Invalid path: contains null bytes.");
  }

  // Verify the resolved path exists as a directory
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error(`Not a valid directory: ${resolved}`);
  }

  return resolved;
}

/**
 * Allowed root for all path-based API operations.
 * Defaults to the user's home directory.
 * All resolved paths must start with this prefix (defense-in-depth against path traversal).
 */
const ALLOWED_ROOT = os.homedir();

/**
 * Validate that a resolved path is under the allowed root.
 * Throws if the path escapes the root (e.g. /etc, C:\Windows).
 */
export function assertPathUnderRoot(resolved: string, root: string = ALLOWED_ROOT): void {
  const normalizedResolved = path.resolve(resolved) + path.sep;
  const normalizedRoot = path.resolve(root) + path.sep;
  if (!normalizedResolved.startsWith(normalizedRoot) && path.resolve(resolved) !== path.resolve(root)) {
    throw new Error(`Path "${resolved}" is outside the allowed root "${root}".`);
  }
}

/** Parse a JSON body safely. Returns the parsed object or throws a user-friendly error. */
function safeParseJson<T>(body: string): T {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("Invalid JSON in request body.");
  }
}

// ─── Request handler ────────────────────────────────────────────────────────

async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  version: string,
): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  // CORS headers — intentionally permissive (`*`) because the GUI server
  // binds to 127.0.0.1 only and is meant for local development use.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve the HTML page
  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(getHtml(version));
    return;
  }

  // API: detect project
  if (req.method === "POST" && url.pathname === "/api/detect") {
    const body = await readBody(req);
    const { dir } = safeParseJson<{ dir: string }>(body);
    if (!dir || dir.includes("\0")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or missing path." }));
      return;
    }
    assertPathUnderRoot(path.resolve(dir));
    const result = detectProjectInfo(dir);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // API: browse directories
  if (req.method === "POST" && url.pathname === "/api/browse") {
    const body = await readBody(req);
    const { dir } = safeParseJson<{ dir?: string }>(body);
    if (dir?.includes("\0")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid path." }));
      return;
    }
    assertPathUnderRoot(path.resolve(dir || process.cwd()));
    const result = browseDirectory(dir);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // API: scan project source files for exposable modules
  if (req.method === "POST" && url.pathname === "/api/scan") {
    const body = await readBody(req);
    const { dir } = safeParseJson<{ dir: string }>(body);
    if (!dir || dir.includes("\0")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or missing path." }));
      return;
    }
    assertPathUnderRoot(path.resolve(dir));
    const result = scanSourceFiles(dir);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // API: apply configuration
  if (req.method === "POST" && url.pathname === "/api/apply") {
    const body = await readBody(req);
    const config = safeParseJson<ApplyConfig>(body);
    if (!config.projectDir || !config.role || !config.name) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing required fields: projectDir, role, name." }));
      return;
    }

    try {
      await applySingleProject(config, version);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: msg }));
    }
    return;
  }

  // API: workspace discover — find apps in a monorepo root
  if (req.method === "POST" && url.pathname === "/api/workspace/discover") {
    const body = await readBody(req);
    const { dir } = safeParseJson<{ dir: string }>(body);
    if (!dir || dir.includes("\0")) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid or missing path." }));
      return;
    }
    assertPathUnderRoot(path.resolve(dir));
    const result = discoverWorkspaceApps(dir);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
    return;
  }

  // API: workspace apply — apply config to multiple apps
  if (req.method === "POST" && url.pathname === "/api/workspace/apply") {
    const body = await readBody(req);
    const { apps, rootDir } = safeParseJson<{ apps: ApplyConfig[]; rootDir?: string }>(body);
    if (!Array.isArray(apps) || apps.length === 0) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing or empty apps array." }));
      return;
    }
    // Validate every app's projectDir is under the workspace root (or allowed root)
    const wsRoot = rootDir ? path.resolve(rootDir) : ALLOWED_ROOT;
    for (const app of apps) {
      if (!app.projectDir) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Each app must have a projectDir." }));
        return;
      }
      assertPathUnderRoot(path.resolve(app.projectDir), wsRoot);
    }
    const results = await applyWorkspaceApps(apps, version);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(results));
    return;
  }

  // 404
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Detect project type, existing MF config, and role from a directory. */
export function detectProjectInfo(dir: string): DetectResponse {
  try {
    const targetDir = path.resolve(dir);

    if (!fs.existsSync(targetDir)) {
      return { success: false, error: `Directory not found: ${targetDir}` };
    }

    const project = detectProject(targetDir);
    if (!project) {
      return { success: false, error: "No package.json found" };
    }

    let role: string | null = null;
    let exposes: Record<string, string> = {};
    const remotes: Record<string, string> = {};
    let federationName: string | null = null;
    let port: string | null = null;

    if (project.viteConfig && project.hasFederation) {
      const content = fs.readFileSync(project.viteConfig.path, "utf-8");
      role = detectRole(content);

      if (role === "remote") {
        exposes = parseExposes(content);
      } else if (role === "host") {
        const parsed = parseRemotes(content);
        for (const [name, entry] of Object.entries(parsed)) {
          remotes[name] = entry.entry;
        }
      }

      const fedCall = findFederationCall(content);
      if (fedCall) {
        const nameMatch = /name\s*:\s*["']([^"']+)["']/.exec(fedCall.inner);
        if (nameMatch) federationName = nameMatch[1];
      }

      const portMatch = /port\s*:\s*(\d+)/.exec(content);
      if (portMatch) port = portMatch[1];
    }

    // Check config file
    let configInfo: DetectResponse["config"];
    const cfgResult = loadConfig(targetDir);
    if (cfgResult) {
      configInfo = {
        filePath: cfgResult.filePath,
        role: cfgResult.config.role,
        name: cfgResult.config.name,
        port: cfgResult.config.port != null ? String(cfgResult.config.port) : undefined,
      };
    }

    return {
      success: true,
      project: {
        name: project.packageJson.name ?? path.basename(targetDir),
        packageManager: project.packageManager,
        viteConfig: project.viteConfig ? path.basename(project.viteConfig.path) : null,
        hasTailwind: project.hasTailwind,
        hasFederation: project.hasFederation,
        srcDir: project.srcDir,
        role,
        exposes,
        remotes,
        federationName,
        port,
      },
      config: configInfo,
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

interface BrowseEntry {
  name: string;
  isDir: boolean;
  hasPackageJson?: boolean;
}

interface BrowseResponse {
  success: boolean;
  current: string;
  parent: string | null;
  entries: BrowseEntry[];
  error?: string;
}

/** List directories under the given path (or OS home if empty) for the file browser modal. */
export function browseDirectory(dir?: string): BrowseResponse {
  try {
    // Default to CWD or home directory
    let targetDir: string;
    if (dir) {
      targetDir = path.resolve(dir);
    } else {
      targetDir = process.cwd();
    }

    if (!fs.existsSync(targetDir)) {
      return {
        success: false,
        current: targetDir,
        parent: null,
        entries: [],
        error: "Directory not found",
      };
    }

    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      return {
        success: false,
        current: targetDir,
        parent: null,
        entries: [],
        error: "Not a directory",
      };
    }

    const parentDir = path.dirname(targetDir);
    const entries: BrowseEntry[] = [];

    let items: string[];
    try {
      items = fs.readdirSync(targetDir);
    } catch {
      return {
        success: false,
        current: targetDir,
        parent: parentDir !== targetDir ? parentDir : null,
        entries: [],
        error: "Permission denied",
      };
    }

    for (const item of items) {
      // Skip hidden files/dirs and node_modules
      if (item.startsWith(".") || item === "node_modules" || item === "dist" || item === "build")
        continue;

      const fullPath = path.join(targetDir, item);
      try {
        const s = fs.statSync(fullPath);
        if (s.isDirectory()) {
          const hasPackageJson = fs.existsSync(path.join(fullPath, "package.json"));
          entries.push({ name: item, isDir: true, hasPackageJson });
        }
      } catch {
        // Skip unreadable entries
      }
    }

    // Sort: directories with package.json first, then alphabetical
    entries.sort((a, b) => {
      if (a.hasPackageJson && !b.hasPackageJson) return -1;
      if (!a.hasPackageJson && b.hasPackageJson) return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      success: true,
      current: targetDir,
      parent: parentDir !== targetDir ? parentDir : null,
      entries,
    };
  } catch (err) {
    return { success: false, current: dir || "", parent: null, entries: [], error: String(err) };
  }
}

// ─── Build target patch ─────────────────────────────────────────────────────

/** Patch `build.target` in vite.config.ts for an existing project. */
export function patchBuildTarget(projectDir: string, buildTarget: string): void {
  // Find the vite config file
  const candidates = ["vite.config.ts", "vite.config.mts", "vite.config.js"];
  let viteConfigPath: string | null = null;
  for (const c of candidates) {
    const p = path.join(projectDir, c);
    if (fs.existsSync(p)) {
      viteConfigPath = p;
      break;
    }
  }
  if (!viteConfigPath) return;

  let content = fs.readFileSync(viteConfigPath, "utf-8");

  // Case 1: build.target already exists → replace the value
  const targetRegex = /(\btarget\s*:\s*)(["'][^"']*["'])/;
  if (/\bbuild\s*:/.test(content) && targetRegex.test(content)) {
    content = content.replace(targetRegex, `$1"${buildTarget}"`);
    fs.writeFileSync(viteConfigPath, content, "utf-8");
    return;
  }

  // Case 2: build block exists but no target → add target inside it
  const buildBlockRegex = /(\bbuild\s*:\s*\{)/;
  if (buildBlockRegex.test(content)) {
    content = content.replace(buildBlockRegex, `$1\n    target: "${buildTarget}",`);
    fs.writeFileSync(viteConfigPath, content, "utf-8");
    return;
  }

  // Case 3: no build block at all → add one before the closing })
  const lastClose = content.lastIndexOf("})");
  if (lastClose > 0) {
    const buildBlock = `  build: {\n    target: "${buildTarget}",\n  },\n`;
    content = content.slice(0, lastClose) + buildBlock + content.slice(lastClose);
    fs.writeFileSync(viteConfigPath, content, "utf-8");
  }
}

// ─── Source scanner ─────────────────────────────────────────────────────────

interface ScannedFile {
  /** Relative path from project root, e.g. "./src/components/Button.tsx" */
  relativePath: string;
  /** Suggested expose key, e.g. "./Button" */
  suggestedKey: string;
  /** File type category */
  kind: "component" | "hook" | "util" | "page" | "index" | "other";
  /** Named exports found in the file */
  exports: string[];
}

/** Scan a project's `src/` directory for exposable modules (components, hooks, utils). */
export function scanSourceFiles(dir: string): {
  success: boolean;
  files: ScannedFile[];
  error?: string;
} {
  try {
    const projectDir = path.resolve(dir);
    if (!fs.existsSync(projectDir)) {
      return { success: false, files: [], error: "Directory not found" };
    }

    // Determine src dir
    const srcDir = fs.existsSync(path.join(projectDir, "src"))
      ? path.join(projectDir, "src")
      : fs.existsSync(path.join(projectDir, "app"))
        ? path.join(projectDir, "app")
        : projectDir;

    const files: ScannedFile[] = [];
    const extensions = new Set([".tsx", ".ts", ".jsx", ".js"]);
    const skipDirs = new Set([
      "node_modules",
      "dist",
      "build",
      ".__mf__temp",
      ".git",
      "__tests__",
      "__mocks__",
    ]);

    function walk(currentDir: string): void {
      let items: string[];
      try {
        items = fs.readdirSync(currentDir);
      } catch {
        return;
      }

      for (const item of items) {
        if (item.startsWith(".")) continue;
        const fullPath = path.join(currentDir, item);

        let stat: fs.Stats;
        try {
          stat = fs.lstatSync(fullPath);
        } catch {
          continue;
        }

        // Skip symlinks to prevent traversal outside the project
        if (stat.isSymbolicLink()) continue;

        if (stat.isDirectory()) {
          if (!skipDirs.has(item)) walk(fullPath);
          continue;
        }

        const ext = path.extname(item);
        if (!extensions.has(ext)) continue;

        // Skip test/spec files and type declaration files
        const lower = item.toLowerCase();
        if (lower.includes(".test.") || lower.includes(".spec.") || lower.endsWith(".d.ts"))
          continue;

        const relativePath = `./${path.relative(projectDir, fullPath).replace(/\\/g, "/")}`;
        const baseName = path.basename(item, ext);

        // Determine kind
        let kind: ScannedFile["kind"] = "other";
        const dirName = path.basename(currentDir).toLowerCase();
        if (baseName === "index") {
          kind = "index";
        } else if (baseName.startsWith("use") || dirName === "hooks") {
          kind = "hook";
        } else if (dirName === "components" || dirName === "ui" || /^[A-Z]/.test(baseName)) {
          kind = "component";
        } else if (dirName === "utils" || dirName === "lib" || dirName === "helpers") {
          kind = "util";
        } else if (dirName === "pages" || dirName === "routes" || dirName === "views") {
          kind = "page";
        }

        // Quick export scan
        const exports = extractExportNames(fullPath);

        // Suggest expose key
        let suggestedKey: string;
        if (baseName === "index") {
          // Use parent folder name
          const parentFolder = path.basename(currentDir);
          suggestedKey = `./${parentFolder}`;
        } else {
          suggestedKey = `./${baseName}`;
        }

        files.push({ relativePath, suggestedKey, kind, exports });
      }
    }

    walk(srcDir);

    // Sort: components first, then hooks, utils, pages, index, other
    const kindOrder: Record<string, number> = {
      component: 0,
      hook: 1,
      util: 2,
      page: 3,
      index: 4,
      other: 5,
    };
    files.sort(
      (a, b) =>
        (kindOrder[a.kind] ?? 5) - (kindOrder[b.kind] ?? 5) ||
        a.relativePath.localeCompare(b.relativePath),
    );

    return { success: true, files };
  } catch (err) {
    return { success: false, files: [], error: String(err) };
  }
}

function extractExportNames(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const exports: string[] = [];

    // Match: export function Name / export const Name / export class Name / export default function Name
    const patterns = [
      /export\s+(?:default\s+)?function\s+([A-Z][a-zA-Z0-9]*)/g,
      /export\s+(?:default\s+)?class\s+([A-Z][a-zA-Z0-9]*)/g,
      /export\s+const\s+([A-Za-z][a-zA-Z0-9]*)/g,
      /export\s+default\s+([A-Z][a-zA-Z0-9]*)\s*;/g,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        if (!exports.includes(match[1])) {
          exports.push(match[1]);
        }
      }
    }

    return exports.slice(0, 10); // Cap at 10 exports per file
  } catch {
    return [];
  }
}

// ─── Apply helper (shared by single + workspace) ────────────────────────────

async function applySingleProject(config: ApplyConfig, version: string): Promise<void> {
  const projectDir = sanitizePath(config.projectDir);
  const buildTarget = config.buildTarget || "chrome89";

  // Write mfa.config.json so the wizard reads exposes/remotes from it
  const mfaConfig: Record<string, unknown> = {
    role: config.role,
    name: config.name,
    port: config.port,
    buildTarget,
  };

  if (config.role === "remote" && config.exposes && Object.keys(config.exposes).length > 0) {
    mfaConfig.exposes = config.exposes;
  }

  if (config.role === "host" && config.remotes && config.remotes.length > 0) {
    const remotesObj: Record<string, { entry: string }> = {};
    for (const r of config.remotes) {
      const entry = r.entry || `http://localhost:${r.port}/remoteEntry.js`;
      remotesObj[r.name] = { entry };
    }
    mfaConfig.remotes = remotesObj;
  }

  // Advanced federation options → write to config file so the wizard picks them up
  if (config.manifest) mfaConfig.manifest = true;
  if (config.dts) mfaConfig.dts = true;
  if (config.dev === false) mfaConfig.dev = false;
  if (config.runtimePlugins && config.runtimePlugins.length > 0) {
    mfaConfig.runtimePlugins = config.runtimePlugins;
  }
  if (config.getPublicPath) mfaConfig.getPublicPath = config.getPublicPath;

  const configPath = path.join(projectDir, "mfa.config.json");
  fs.writeFileSync(configPath, `${JSON.stringify(mfaConfig, null, 2)}\n`, "utf-8");

  await runWizard(
    {
      projectDir,
      role: config.role as Role,
      name: config.name,
      port: config.port,
      buildTarget: buildTarget as BuildTarget,
      yes: true,
      noInstall: config.noInstall ?? false,
      config: configPath,
      // Pass advanced federation options directly so they override
      manifest: config.manifest,
      dts: config.dts,
      dev: config.dev,
      runtimePlugins: config.runtimePlugins,
      getPublicPath: config.getPublicPath,
    },
    version,
  );

  // Post-process: ensure build.target matches user's selection
  patchBuildTarget(projectDir, buildTarget);
}

// ─── Workspace discover ─────────────────────────────────────────────────────

interface DiscoveredApp {
  dir: string;
  name: string;
  role: string | null;
  port: string | null;
  federationName: string | null;
  hasFederation: boolean;
  packageManager: string;
  exposes: Record<string, string>;
  remotes: Record<string, string>;
}

/** Discover all Vite apps in a monorepo root and return their detected settings. */
export function discoverWorkspaceApps(dir: string): {
  success: boolean;
  rootDir: string;
  apps: DiscoveredApp[];
  error?: string;
} {
  try {
    const rootDir = path.resolve(dir);
    if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
      return { success: false, rootDir, apps: [], error: "Not a valid directory" };
    }

    const entries = discoverApps(rootDir);
    if (entries.length === 0) {
      return { success: false, rootDir, apps: [], error: "No Vite apps found in this workspace" };
    }

    const apps: DiscoveredApp[] = [];
    for (const entry of entries) {
      const appDir = path.resolve(rootDir, entry.dir);
      const info = detectProjectInfo(appDir);

      apps.push({
        dir: entry.dir,
        name: entry.name || (info.project?.name ?? entry.dir),
        role: info.config?.role ?? info.project?.role ?? null,
        port: info.config?.port ?? info.project?.port ?? null,
        federationName: info.project?.federationName ?? null,
        hasFederation: info.project?.hasFederation ?? false,
        packageManager: info.project?.packageManager ?? "npm",
        exposes: info.project?.exposes ?? {},
        remotes: info.project?.remotes ?? {},
      });
    }

    return { success: true, rootDir, apps };
  } catch (err) {
    return { success: false, rootDir: dir, apps: [], error: String(err) };
  }
}

// ─── Workspace batch apply ──────────────────────────────────────────────────

async function applyWorkspaceApps(
  apps: ApplyConfig[],
  version: string,
): Promise<{
  success: boolean;
  results: Array<{ dir: string; name: string; success: boolean; error?: string }>;
}> {
  const results: Array<{ dir: string; name: string; success: boolean; error?: string }> = [];

  for (const app of apps) {
    try {
      await applySingleProject(app, version);
      results.push({ dir: app.projectDir, name: app.name, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ dir: app.projectDir, name: app.name, success: false, error: msg });
    }
  }

  const allOk = results.every((r) => r.success);
  return { success: allOk, results };
}

// ─── Body reader ────────────────────────────────────────────────────────────

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    let length = 0;
    req.on("data", (chunk: Buffer | string) => {
      length += typeof chunk === "string" ? chunk.length : chunk.byteLength;
      if (length > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function openBrowser(url: string): void {
  import("node:child_process").then(({ exec }) => {
    const cmd =
      process.platform === "win32"
        ? `start "" "${url}"`
        : process.platform === "darwin"
          ? `open "${url}"`
          : `xdg-open "${url}"`;

    exec(cmd, (err) => {
      if (err) {
        console.log(`  Could not open browser. Visit: ${url}`);
      }
    });
  });
}
