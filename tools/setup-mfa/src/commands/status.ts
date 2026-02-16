import fs from "node:fs";
import path from "node:path";
import { input } from "@inquirer/prompts";
import pc from "picocolors";
import { loadConfig } from "../utils/config.js";
import { detectProject } from "../utils/detect.js";
import { banner, hint, info, intro, label, newline, step, verbose, warn } from "../utils/log.js";
import { detectRole, findFederationCall, parseExposes, parseRemotes } from "../utils/parse.js";

// ─── Command ───────────────────────────────────────────────────────────────

export async function runStatus(
  opts: { projectDir?: string; json?: boolean },
  version: string,
): Promise<void> {
  const jsonOutput = opts.json ?? false;

  if (!jsonOutput) {
    intro(version);
    step(1, "Status");
  }

  const projectDir =
    opts.projectDir ??
    (jsonOutput
      ? "."
      : await input({
          message: "Where is your project?",
          default: ".",
        }));

  const targetDir = path.resolve(projectDir);
  verbose(`Target directory: ${targetDir}`);

  const project = detectProject(targetDir);

  if (!project) {
    if (jsonOutput) {
      console.log(JSON.stringify({ error: "No package.json found" }, null, 2));
    } else {
      warn(`No package.json found in ${targetDir}`);
    }
    process.exitCode = 1;
    return;
  }

  // ── Gather status info ────────────────────────────────────────────────

  const status: StatusInfo = {
    project: project.packageJson.name ?? path.basename(targetDir),
    directory: targetDir,
    packageManager: project.packageManager,
    viteConfig: project.viteConfig ? path.basename(project.viteConfig.path) : null,
    tailwind: project.hasTailwind,
    federation: {
      configured: project.hasFederation,
      role: null,
      name: null,
      port: null,
      exposes: {},
      remotes: {},
    },
    configFile: null,
    dependencies: {
      "@module-federation/vite": null,
      react: null,
      "react-dom": null,
    },
  };

  const allDeps = {
    ...project.packageJson.dependencies,
    ...project.packageJson.devDependencies,
  };

  status.dependencies["@module-federation/vite"] = allDeps["@module-federation/vite"] ?? null;
  status.dependencies.react = allDeps.react ?? null;
  status.dependencies["react-dom"] = allDeps["react-dom"] ?? null;

  // Parse vite config if federation is present
  if (project.hasFederation && project.viteConfig) {
    const configContent = fs.readFileSync(project.viteConfig.path, "utf-8");
    status.federation.role = detectRole(configContent);

    if (status.federation.role === "remote") {
      status.federation.exposes = parseExposes(configContent);
    } else if (status.federation.role === "host") {
      const remotes = parseRemotes(configContent);
      for (const [name, entry] of Object.entries(remotes)) {
        status.federation.remotes[name] = entry.entry;
      }
    }

    // Try to extract name and port from federation call
    const fedCall = findFederationCall(configContent);
    if (fedCall) {
      const nameMatch = /name\s*:\s*["']([^"']+)["']/.exec(fedCall.inner);
      if (nameMatch) status.federation.name = nameMatch[1];
    }

    // Extract port from server config
    const portMatch = /port\s*:\s*(\d+)/.exec(configContent);
    if (portMatch) status.federation.port = portMatch[1];
  }

  // Config file
  const configResult = loadConfig(targetDir);
  if (configResult) {
    status.configFile = path.basename(configResult.filePath);
  }

  // ── Output ────────────────────────────────────────────────────────────

  if (jsonOutput) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  // Pretty print
  newline();
  banner("Project");
  newline();
  label("Name", status.project);
  label("Directory", status.directory);
  label("Package manager", status.packageManager);
  label("Vite config", status.viteConfig ?? pc.dim("not found"));
  label("Tailwind CSS v4", status.tailwind ? "yes" : "no");
  if (status.configFile) {
    label("Config file", status.configFile);
  }

  banner("Dependencies");
  newline();
  for (const [dep, ver] of Object.entries(status.dependencies)) {
    if (ver) {
      label(dep, ver);
    } else {
      label(dep, pc.dim("not installed"));
    }
  }

  banner("Module Federation");
  newline();

  if (!status.federation.configured) {
    info("Not configured. Run `mfx init` to get started.");
    newline();
    return;
  }

  label("Status", pc.green("configured"));
  label("Role", status.federation.role ?? pc.dim("unknown"));
  label("Name", status.federation.name ?? pc.dim("unknown"));
  label("Port", status.federation.port ?? pc.dim("unknown"));

  if (status.federation.role === "remote") {
    const exposesCount = Object.keys(status.federation.exposes).length;
    newline();
    label("Exposed modules", `${exposesCount}`);
    for (const [exposePath, localPath] of Object.entries(status.federation.exposes)) {
      hint(`  ${exposePath} → ${localPath}`);
    }
  }

  if (status.federation.role === "host") {
    const remotesCount = Object.keys(status.federation.remotes).length;
    newline();
    label("Remotes", `${remotesCount}`);
    for (const [remoteName, entry] of Object.entries(status.federation.remotes)) {
      hint(`  ${remoteName} → ${entry}`);
    }
  }

  newline();
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface StatusInfo {
  project: string;
  directory: string;
  packageManager: string;
  viteConfig: string | null;
  tailwind: boolean;
  federation: {
    configured: boolean;
    role: string | null;
    name: string | null;
    port: string | null;
    exposes: Record<string, string>;
    remotes: Record<string, string>;
  };
  configFile: string | null;
  dependencies: Record<string, string | null>;
}
