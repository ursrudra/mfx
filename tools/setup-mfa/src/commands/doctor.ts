import fs from "node:fs";
import path from "node:path";
import { input } from "@inquirer/prompts";
import { loadConfig, validateConfig } from "../utils/config.js";
import { detectProject } from "../utils/detect.js";
import {
  banner,
  info,
  intro,
  label,
  error as logError,
  newline,
  step,
  success,
  verbose,
  warn,
} from "../utils/log.js";
import { detectRole, findFederationCall, parseExposes, parseRemotes } from "../utils/parse.js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Check {
  name: string;
  status: "pass" | "warn" | "fail";
  message: string;
}

// ─── Command ───────────────────────────────────────────────────────────────

export async function runDoctor(opts: { projectDir?: string }, version: string): Promise<void> {
  intro(version);

  step(1, "Project location");

  const projectDir =
    opts.projectDir ??
    (await input({
      message: "Where is your project?",
      default: ".",
    }));

  const targetDir = path.resolve(projectDir);
  const checks: Check[] = [];

  // ── Check 1: package.json exists ──────────────────────────────────────

  step(2, "Running checks");
  verbose(`Target directory: ${targetDir}`);
  newline();

  const pkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    checks.push({
      name: "package.json",
      status: "fail",
      message: `Not found at ${targetDir}`,
    });
    printResults(checks);
    process.exitCode = 1;
    return;
  }
  checks.push({ name: "package.json", status: "pass", message: "Found" });

  // ── Check 2: Project detection ────────────────────────────────────────

  const project = detectProject(targetDir);
  if (!project) {
    checks.push({
      name: "Project detection",
      status: "fail",
      message: "Could not detect project",
    });
    printResults(checks);
    process.exitCode = 1;
    return;
  }
  checks.push({
    name: "Package manager",
    status: "pass",
    message: project.packageManager,
  });

  // ── Check 3: Vite config ──────────────────────────────────────────────

  if (!project.viteConfig) {
    checks.push({
      name: "Vite config",
      status: "fail",
      message: "No vite.config.ts or vite.config.js found",
    });
    printResults(checks);
    process.exitCode = 1;
    return;
  }
  checks.push({
    name: "Vite config",
    status: "pass",
    message: path.basename(project.viteConfig.path),
  });

  // ── Check 4: Module Federation installed ──────────────────────────────

  const allDeps = {
    ...project.packageJson.dependencies,
    ...project.packageJson.devDependencies,
  };

  if (allDeps["@module-federation/vite"]) {
    checks.push({
      name: "@module-federation/vite",
      status: "pass",
      message: `Installed (${allDeps["@module-federation/vite"]})`,
    });
  } else {
    checks.push({
      name: "@module-federation/vite",
      status: "fail",
      message: "Not installed — run `mfx init` or install manually",
    });
  }

  // ── Check 5: Federation configured in vite config ─────────────────────

  const configContent = fs.readFileSync(project.viteConfig.path, "utf-8");

  if (!project.hasFederation) {
    checks.push({
      name: "Federation config",
      status: "fail",
      message: "federation() not found in vite config — run `mfx init`",
    });
    printResults(checks);
    process.exitCode = 1;
    return;
  }

  const fedCall = findFederationCall(configContent);
  checks.push({
    name: "Federation config",
    status: fedCall ? "pass" : "warn",
    message: fedCall
      ? "federation() call found"
      : "Import found but federation() call not detected",
  });

  // ── Check 6: Role detection ───────────────────────────────────────────

  const role = detectRole(configContent);
  if (!role) {
    checks.push({
      name: "Role detection",
      status: "warn",
      message: "Could not detect role (no exposes or remotes block found)",
    });
  } else {
    checks.push({
      name: "Role",
      status: "pass",
      message: role,
    });
  }

  // ── Check 7: Role-specific checks ─────────────────────────────────────

  if (role === "remote") {
    // Check exposed modules exist
    const exposes = parseExposes(configContent);
    const exposedPaths = Object.entries(exposes);

    if (exposedPaths.length === 0) {
      checks.push({
        name: "Exposed modules",
        status: "warn",
        message: "No exposed modules found in exposes block",
      });
    } else {
      for (const [exposePath, localPath] of exposedPaths) {
        // Resolve the local path relative to the project
        const resolvedPath = path.resolve(targetDir, localPath);
        if (fs.existsSync(resolvedPath)) {
          checks.push({
            name: `Expose ${exposePath}`,
            status: "pass",
            message: localPath,
          });
        } else {
          checks.push({
            name: `Expose ${exposePath}`,
            status: "fail",
            message: `File not found: ${localPath}`,
          });
        }
      }
    }
  }

  if (role === "host") {
    const remotes = parseRemotes(configContent);
    const remoteEntries = Object.entries(remotes);

    if (remoteEntries.length === 0) {
      checks.push({
        name: "Remotes",
        status: "warn",
        message: "No remotes found in remotes block",
      });
    } else {
      for (const [remoteName, remote] of remoteEntries) {
        // Check if entry URL looks valid
        try {
          new URL(remote.entry);
          checks.push({
            name: `Remote "${remoteName}"`,
            status: "pass",
            message: remote.entry,
          });
        } catch {
          checks.push({
            name: `Remote "${remoteName}"`,
            status: "warn",
            message: `Invalid URL: ${remote.entry}`,
          });
        }

        // Check if type declarations exist
        const dtsPath = path.join(targetDir, project.srcDir, `${remoteName}.d.ts`);
        if (fs.existsSync(dtsPath)) {
          checks.push({
            name: `Types for "${remoteName}"`,
            status: "pass",
            message: `${project.srcDir}/${remoteName}.d.ts`,
          });
        } else {
          checks.push({
            name: `Types for "${remoteName}"`,
            status: "warn",
            message: `No .d.ts file — consider running \`mfx remote\` to generate`,
          });
        }
      }
    }
  }

  // ── Check 8: Config file ──────────────────────────────────────────────

  const configResult = loadConfig(targetDir);
  if (configResult) {
    try {
      validateConfig(configResult.config, configResult.filePath);
      checks.push({
        name: "Config file",
        status: "pass",
        message: path.basename(configResult.filePath),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      checks.push({
        name: "Config file",
        status: "fail",
        message: msg,
      });
    }
  } else {
    checks.push({
      name: "Config file",
      status: "pass",
      message: "None (optional)",
    });
  }

  // ── Check 9: .gitignore ───────────────────────────────────────────────

  const gitignorePath = path.join(targetDir, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, "utf-8");
    if (gitignore.includes(".__mf__temp")) {
      checks.push({
        name: ".gitignore",
        status: "pass",
        message: ".__mf__temp is ignored",
      });
    } else {
      checks.push({
        name: ".gitignore",
        status: "warn",
        message: ".__mf__temp not in .gitignore — temp files may be committed",
      });
    }
  }

  // ── Check 10: Tailwind CSS ────────────────────────────────────────────

  if (project.hasTailwind) {
    checks.push({
      name: "Tailwind CSS v4",
      status: "pass",
      message: "Detected (@tailwindcss/vite)",
    });
  }

  // ── Check 11: Shared dependencies ─────────────────────────────────────

  if (!allDeps.react) {
    checks.push({
      name: "react",
      status: "fail",
      message: "react is not installed — required for Module Federation shared deps",
    });
  }

  if (!allDeps["react-dom"]) {
    checks.push({
      name: "react-dom",
      status: "fail",
      message: "react-dom is not installed — required for Module Federation shared deps",
    });
  }

  // ── Check 12: Port conflict detection ─────────────────────────────────

  verbose("Scanning for port conflicts in sibling projects...");
  const portConflicts = detectPortConflicts(targetDir);
  if (portConflicts.length > 0) {
    for (const conflict of portConflicts) {
      checks.push({
        name: "Port conflict",
        status: "warn",
        message: conflict,
      });
    }
  } else {
    verbose("No port conflicts detected.");
  }

  // ── Print results ─────────────────────────────────────────────────────

  printResults(checks);

  // Set non-zero exit code if any checks failed
  if (checks.some((c) => c.status === "fail")) {
    process.exitCode = 1;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Scan sibling directories for vite.config files and check for port conflicts.
 * Looks for `server.port` or `port:` in `federation()` calls in peer projects.
 */
function detectPortConflicts(targetDir: string): string[] {
  const conflicts: string[] = [];
  const parentDir = path.dirname(targetDir);

  // Collect the port from this project's vite.config
  const thisPort = extractPort(targetDir);
  if (!thisPort) return conflicts;

  verbose(`This project uses port ${thisPort}`);

  // Scan sibling directories
  let siblings: string[];
  try {
    siblings = fs
      .readdirSync(parentDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== path.basename(targetDir))
      .map((d) => path.join(parentDir, d.name));
  } catch {
    return conflicts;
  }

  for (const siblingDir of siblings) {
    const siblingPort = extractPort(siblingDir);
    if (siblingPort && siblingPort === thisPort) {
      conflicts.push(`Port ${thisPort} is also used by ${path.basename(siblingDir)}`);
    }
  }

  return conflicts;
}

/**
 * Extract the dev server port from a project's vite.config (if it exists).
 */
function extractPort(projectDir: string): string | null {
  const configFiles = ["vite.config.ts", "vite.config.mts", "vite.config.js"];

  for (const name of configFiles) {
    const configPath = path.join(projectDir, name);
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");
        // Match: port: 5001 or port: "5001"
        const match = /port\s*:\s*(?:"?(\d+)"?)/m.exec(content);
        if (match) return match[1];
      } catch {
        // Ignore unreadable files
      }
    }
  }

  // Also check mfa.config.json
  const cfgPath = path.join(projectDir, "mfa.config.json");
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
      if (cfg.port) return String(cfg.port);
    } catch {
      // Ignore
    }
  }

  return null;
}

function printResults(checks: Check[]): void {
  banner("Results");
  newline();

  const passes = checks.filter((c) => c.status === "pass");
  const warns = checks.filter((c) => c.status === "warn");
  const fails = checks.filter((c) => c.status === "fail");

  for (const check of checks) {
    if (check.status === "pass") {
      success(`${check.name}: ${check.message}`);
    } else if (check.status === "warn") {
      warn(`${check.name}: ${check.message}`);
    } else {
      logError(`${check.name}: ${check.message}`);
    }
  }

  newline();
  label("Summary", `${passes.length} passed, ${warns.length} warnings, ${fails.length} failed`);

  if (fails.length > 0) {
    newline();
    info("Fix the errors above, then run `mfx doctor` again.");
  } else if (warns.length > 0) {
    newline();
    info("Setup looks good! Warnings are suggestions, not blockers.");
  } else {
    newline();
    success("Everything looks great! Your Module Federation setup is healthy.");
  }

  newline();
}
