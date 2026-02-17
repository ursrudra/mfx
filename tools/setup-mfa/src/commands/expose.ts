import fs from "node:fs";
import path from "node:path";
import { confirm, input, select } from "@inquirer/prompts";
import type { FileOperation } from "../types.js";
import { detectProject } from "../utils/detect.js";
import { applyAndLog, createBackup, removeBackup } from "../utils/fs.js";
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
import { detectRole, parseExposes, replaceExposesBlock } from "../utils/parse.js";
import { validateExposePath } from "../utils/validators.js";

// ─── Command ───────────────────────────────────────────────────────────────

export async function runExpose(
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

  if (role !== "remote") {
    throw new Error(
      'This project is configured as a "host". Use `mfx remote` to manage remotes instead.',
    );
  }

  // ── Step 2: Current exposes ────────────────────────────────────────────

  step(2, "Current exposed modules");

  const exposes = parseExposes(configContent);
  const entries = Object.entries(exposes);

  if (entries.length === 0) {
    warn("No exposed modules found in vite.config.");
  } else {
    for (const [key, val] of entries) {
      label(key, val);
    }
  }

  // ── Step 3: Action ─────────────────────────────────────────────────────

  step(3, "What would you like to do?");

  type Action = "add" | "update" | "remove";

  const action: Action = await select({
    message: "Choose an action",
    choices: [
      { value: "add" as Action, name: "Add a new exposed module" },
      ...(entries.length > 0
        ? [
            {
              value: "update" as Action,
              name: "Update an existing module",
            },
            { value: "remove" as Action, name: "Remove a module" },
          ]
        : []),
    ],
  });

  const updated = { ...exposes };

  if (action === "add") {
    let addMore = true;
    while (addMore) {
      const exposePath = await input({
        message: "Expose path?",
        default: "./components",
        validate: validateExposePath,
      });

      if (updated[exposePath]) {
        warn(`"${exposePath}" already exists. It will be overwritten.`);
        const proceed =
          yes ||
          (await confirm({
            message: "Continue?",
            default: true,
          }));
        if (!proceed) {
          addMore = yes
            ? false
            : await confirm({ message: "Add a different module?", default: false });
          continue;
        }
      }

      const localPath = await input({
        message: `Local file for "${exposePath}"?`,
        default: `./${project.srcDir}/components/index.ts`,
      });

      updated[exposePath] = localPath;
      success(`${exposePath} \u2192 ${localPath}`);

      addMore = yes ? false : await confirm({ message: "Add another?", default: false });
    }
  } else if (action === "update") {
    const moduleToUpdate = await select({
      message: "Which module to update?",
      choices: entries.map(([key, val]) => ({
        value: key,
        name: `${key} \u2192 ${val}`,
      })),
    });

    const newPath = await input({
      message: `New local file for "${moduleToUpdate}"?`,
      default: updated[moduleToUpdate],
    });

    updated[moduleToUpdate] = newPath;
    success(`Updated: ${moduleToUpdate} \u2192 ${newPath}`);
  } else if (action === "remove") {
    const moduleToRemove = await select({
      message: "Which module to remove?",
      choices: entries.map(([key, val]) => ({
        value: key,
        name: `${key} \u2192 ${val}`,
      })),
    });

    delete updated[moduleToRemove];
    success(`Removed: ${moduleToRemove}`);
  }

  // ── Step 4: Review & apply ─────────────────────────────────────────────

  step(4, "Review");

  newline();
  hint("Updated exposed modules:");
  for (const [key, val] of Object.entries(updated)) {
    label(key, val);
  }

  if (Object.keys(updated).length === 0) {
    warn("All exposed modules will be removed.");
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
      message: "Apply changes to vite.config?",
      default: true,
    }));

  if (!proceed) {
    info("Cancelled. No changes made.");
    return;
  }

  // Build the new config content
  const newContent = replaceExposesBlock(configContent, updated);
  if (!newContent) {
    throw new Error("Failed to locate exposes block in vite.config.");
  }

  // Backup
  const backupPath = createBackup(configPath);
  if (backupPath) {
    info(`Backed up to ${path.basename(backupPath)}`);
  }

  // Apply atomically
  const operations: FileOperation[] = [
    {
      action: "write",
      path: configPath,
      content: newContent,
      description: `Updated vite.config`,
    },
  ];

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
