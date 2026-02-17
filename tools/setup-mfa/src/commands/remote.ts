import fs from "node:fs";
import path from "node:path";
import { confirm, input, select } from "@inquirer/prompts";
import type { FileOperation } from "../types.js";
import { detectProject } from "../utils/detect.js";
import { applyAndLog, createBackup, removeBackup } from "../utils/fs.js";
import { generateTypeDeclaration, injectTailwindSource } from "../utils/generate.js";
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
import { detectRole, parseRemotes, replaceRemotesBlock } from "../utils/parse.js";
import { validateName, validatePort, validateRemoteUrl } from "../utils/validators.js";

// ─── Command ───────────────────────────────────────────────────────────────

export async function runRemote(
  opts: { projectDir?: string; yes?: boolean; dryRun?: boolean },
  version: string,
): Promise<void> {
  const yes = opts.yes ?? false;

  intro(version);

  // ── Step 1: Project ────────────────────────────────────────────────────

  step(1, "Project location");

  const projectDir =
    opts.projectDir ??
    (await input({
      message: "Where is your project?",
      default: ".",
    }));

  const targetDir = path.resolve(projectDir);
  verbose(`Resolved project directory: ${targetDir}`);
  const project = detectProject(targetDir);

  if (!project) {
    throw new Error(`No package.json found in ${targetDir}`);
  }

  if (!project.viteConfig) {
    throw new Error("No vite.config found. Run `mfx init` first to initialize.");
  }

  verbose(`Vite config: ${project.viteConfig.path}`);

  if (!project.hasFederation) {
    throw new Error("Module Federation is not configured. Run `mfx init` first to initialize.");
  }

  const configPath = project.viteConfig.path;
  const configContent = fs.readFileSync(configPath, "utf-8");
  const role = detectRole(configContent);

  if (role !== "host") {
    throw new Error(
      'This project is configured as a "remote". Use `mfx expose` to manage exposes instead.',
    );
  }

  // ── Step 2: Current remotes ────────────────────────────────────────────

  step(2, "Current remotes");

  const remotes = parseRemotes(configContent);
  const entries = Object.entries(remotes);

  if (entries.length === 0) {
    warn("No remotes found in vite.config.");
  } else {
    for (const [key, val] of entries) {
      label(key, val.entry);
    }
  }

  // ── Step 3: Action ─────────────────────────────────────────────────────

  step(3, "What would you like to do?");

  type Action = "add" | "update" | "remove";

  const action: Action = await select({
    message: "Choose an action",
    choices: [
      { value: "add" as Action, name: "Add a new remote" },
      ...(entries.length > 0
        ? [
            { value: "update" as Action, name: "Update an existing remote" },
            { value: "remove" as Action, name: "Remove a remote" },
          ]
        : []),
    ],
  });

  const updated = { ...remotes };
  const operations: FileOperation[] = [];

  if (action === "add") {
    let addMore = true;
    while (addMore) {
      const remoteName = await input({
        message: "Remote name?",
        default: `remote${entries.length + 1}`,
        validate: validateName,
      });

      if (updated[remoteName]) {
        warn(`"${remoteName}" already exists. It will be overwritten.`);
        const proceed =
          yes ||
          (await confirm({
            message: "Continue?",
            default: true,
          }));
        if (!proceed) {
          addMore = yes
            ? false
            : await confirm({ message: "Add a different remote?", default: false });
          continue;
        }
      }

      const remotePort = await input({
        message: "Remote port?",
        default: `${5001 + entries.length}`,
        validate: validatePort,
      });

      const entryUrl = await input({
        message: "Remote entry URL?",
        default: `http://localhost:${remotePort}/remoteEntry.js`,
        validate: validateRemoteUrl,
      });

      updated[remoteName] = { name: remoteName, entry: entryUrl };
      success(`${remoteName} \u2192 ${entryUrl}`);

      // Optional: type declarations
      const wantTypes =
        yes ||
        (await confirm({
          message: `Generate type declarations for "${remoteName}"?`,
          default: true,
        }));

      if (wantTypes) {
        await collectTypesForRemote(remoteName, operations, targetDir, project.srcDir, yes);
      }

      // Optional: Tailwind @source
      if (project.hasTailwind) {
        const wantSource =
          yes ||
          (await confirm({
            message: `Add Tailwind @source for "${remoteName}"?`,
            default: true,
          }));

        if (wantSource) {
          await collectTailwindSource(remoteName, operations, targetDir, project.srcDir, yes);
        }
      }

      addMore = yes ? false : await confirm({ message: "Add another remote?", default: false });
    }
  } else if (action === "update") {
    const remoteToUpdate = await select({
      message: "Which remote to update?",
      choices: entries.map(([key, val]) => ({
        value: key,
        name: `${key} \u2192 ${val.entry}`,
      })),
    });

    const current = updated[remoteToUpdate];

    const newName = await input({
      message: "Federation name?",
      default: current.name,
      validate: validateName,
    });

    const newEntry = await input({
      message: "Entry URL?",
      default: current.entry,
      validate: validateRemoteUrl,
    });

    // If the name changed, update the key in the map as well
    if (newName !== remoteToUpdate) {
      delete updated[remoteToUpdate];
    }
    updated[newName] = { name: newName, entry: newEntry };
    success(`Updated: ${newName} \u2192 ${newEntry}`);

    // Offer to regenerate type declarations
    const wantTypes = await confirm({
      message: `Regenerate type declarations for "${remoteToUpdate}"?`,
      default: false,
    });

    if (wantTypes) {
      await collectTypesForRemote(remoteToUpdate, operations, targetDir, project.srcDir, yes);
    }
  } else if (action === "remove") {
    const remoteToRemove = await select({
      message: "Which remote to remove?",
      choices: entries.map(([key, val]) => ({
        value: key,
        name: `${key} \u2192 ${val.entry}`,
      })),
    });

    delete updated[remoteToRemove];
    success(`Removed: ${remoteToRemove}`);

    // Offer to clean up type declarations
    const dtsPath = path.join(targetDir, project.srcDir, `${remoteToRemove}.d.ts`);
    if (fs.existsSync(dtsPath)) {
      const removeDts =
        yes ||
        (await confirm({
          message: `Delete type declarations file (${remoteToRemove}.d.ts)?`,
          default: true,
        }));
      if (removeDts) {
        operations.push({
          action: "delete",
          path: dtsPath,
          description: `Delete ${remoteToRemove}.d.ts`,
        });
      }
    }
  }

  // ── Step 4: Review & apply ─────────────────────────────────────────────

  step(4, "Review");

  newline();
  hint("Updated remotes:");
  for (const [key, val] of Object.entries(updated)) {
    label(key, val.entry);
  }

  if (Object.keys(updated).length === 0) {
    warn("All remotes will be removed.");
  }

  if (operations.length > 0) {
    newline();
    hint("Additional file changes:");
    for (const op of operations) {
      info(op.description);
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
      message: "Apply changes?",
      default: true,
    }));

  if (!proceed) {
    info("Cancelled. No changes made.");
    return;
  }

  // Build the new vite config content
  const newContent = replaceRemotesBlock(configContent, updated);
  if (!newContent) {
    throw new Error("Failed to locate remotes block in vite.config.");
  }

  // Backup the vite config
  const backupPath = createBackup(configPath);
  if (backupPath) {
    info(`Backed up to ${path.basename(backupPath)}`);
  }

  // Add vite config write to operations
  operations.unshift({
    action: "write",
    path: configPath,
    content: newContent,
    description: `Updated vite.config`,
  });

  // Apply all operations atomically
  const ok = applyAndLog(operations, targetDir);
  if (!ok) {
    throw new Error("Some file operations failed. Check the errors above.");
  }

  // Clean up backup after successful apply
  removeBackup(backupPath);

  newline();
  banner("Done");
  info("Restart your dev server to pick up the changes.");
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function collectTypesForRemote(
  remoteName: string,
  operations: FileOperation[],
  targetDir: string,
  srcDir: string,
  yes: boolean,
): Promise<void> {
  const modules: Record<string, string[]> = {};
  let addModules = true;

  while (addModules) {
    const modPath = yes
      ? "./components"
      : await input({
          message: "Exposed module path?",
          default: "./components",
        });

    const exportsRaw = yes
      ? "CardExample, FormExample"
      : await input({
          message: "Component names? (comma-separated)",
          default: "CardExample, FormExample",
        });

    const exportNames = exportsRaw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (exportNames.length > 0) {
      modules[modPath] = exportNames;
      success(`${remoteName}/${modPath.replace("./", "")} \u2192 { ${exportNames.join(", ")} }`);
    }

    addModules = yes
      ? false
      : await confirm({
          message: "Add another module from this remote?",
          default: false,
        });
  }

  if (Object.keys(modules).length > 0) {
    const dtsContent = generateTypeDeclaration(remoteName, modules);
    const dtsPath = path.join(targetDir, srcDir, `${remoteName}.d.ts`);
    operations.push({
      action: "write",
      path: dtsPath,
      content: dtsContent,
      description: `Type declarations for "${remoteName}" (${srcDir}/${remoteName}.d.ts)`,
    });
  }
}

async function collectTailwindSource(
  remoteName: string,
  operations: FileOperation[],
  targetDir: string,
  srcDir: string,
  yes: boolean,
): Promise<void> {
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
  if (!fs.existsSync(cssPath)) {
    warn("index.css not found \u2014 skipping @source.");
    return;
  }

  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const modified = injectTailwindSource(cssContent, remoteName, remoteSrcPath);

  if (modified) {
    operations.push({
      action: "write",
      path: cssPath,
      content: modified,
      description: `Tailwind @source for "${remoteName}"`,
    });
    success(`Will add @source directive for "${remoteName}"`);
  } else {
    info(`@source for "${remoteName}" already present in index.css`);
  }
}
