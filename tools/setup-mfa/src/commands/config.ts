import fs from "node:fs";
import path from "node:path";
import { checkbox, confirm, input, select } from "@inquirer/prompts";
import type { MfaConfig, MfaConfigRemoteEntry, Role } from "../types.js";
import { loadConfig } from "../utils/config.js";
import { detectProject } from "../utils/detect.js";
import { banner, hint, info, intro, label, newline, outro, step, success } from "../utils/log.js";
import { detectRole, parseExposes, parseRemotes } from "../utils/parse.js";
import { validateExposePath, validateName, validatePort } from "../utils/validators.js";

// ─── Command ───────────────────────────────────────────────────────────────

export async function runConfig(
  opts: { projectDir?: string; yes?: boolean },
  version: string,
): Promise<void> {
  intro(version);

  // ── Step 1: Project location ───────────────────────────────────────────

  step(1, "Project location");

  const projectDir =
    opts.projectDir ??
    (await input({
      message: "Where is your project?",
      default: ".",
    }));

  const targetDir = path.resolve(projectDir);
  const project = detectProject(targetDir);

  if (!project) {
    throw new Error(`No package.json found in ${targetDir}`);
  }

  const { packageJson, viteConfig, hasTailwind, srcDir } = project;

  // ── Step 2: Load existing config ───────────────────────────────────────

  step(2, "Current configuration");

  const configResult = loadConfig(targetDir);
  let cfg: MfaConfig = {};
  let isNew = true;

  if (configResult) {
    cfg = { ...configResult.config };
    isNew = false;
    info(`Loaded from: ${configResult.filePath}`);
    newline();
    showConfig(cfg);
  } else {
    // Try to infer from existing vite.config
    if (viteConfig && project.hasFederation) {
      const content = fs.readFileSync(viteConfig.path, "utf-8");
      const role = detectRole(content);

      if (role === "remote") {
        const exposes = parseExposes(content);
        cfg = { role, exposes };
        info("No config file found. Inferred from vite.config:");
      } else if (role === "host") {
        const remotes = parseRemotes(content);
        const remotesConfig: Record<string, MfaConfigRemoteEntry> = {};
        for (const [key, val] of Object.entries(remotes)) {
          remotesConfig[key] = { entry: val.entry };
        }
        cfg = { role, remotes: remotesConfig };
        info("No config file found. Inferred from vite.config:");
      }

      if (cfg.role) {
        newline();
        showConfig(cfg);
      }
    } else {
      info("No existing config found. Starting fresh.");
    }
  }

  // ── Step 3: Edit ───────────────────────────────────────────────────────

  step(3, "Edit configuration");

  type EditTarget = "role" | "name" | "port" | "exposes" | "remotes" | "done";

  let editing = true;

  while (editing) {
    const isRemote = cfg.role === "remote";
    const isHost = cfg.role === "host";

    const choices: { value: EditTarget; name: string }[] = [
      {
        value: "role",
        name: `Role            ${cfg.role ? `(${cfg.role})` : "(not set)"}`,
      },
      {
        value: "name",
        name: `Name            ${cfg.name ? `(${cfg.name})` : "(not set)"}`,
      },
      {
        value: "port",
        name: `Port            ${cfg.port != null ? `(${cfg.port})` : "(not set)"}`,
      },
    ];

    if (isRemote || !cfg.role) {
      const count = cfg.exposes ? Object.keys(cfg.exposes).length : 0;
      choices.push({
        value: "exposes",
        name: `Exposes         (${count} module${count !== 1 ? "s" : ""})`,
      });
    }

    if (isHost || !cfg.role) {
      const count = cfg.remotes ? Object.keys(cfg.remotes).length : 0;
      choices.push({
        value: "remotes",
        name: `Remotes         (${count} app${count !== 1 ? "s" : ""})`,
      });
    }

    choices.push({
      value: "done",
      name: "\u2714  Done editing",
    });

    const target = await select({
      message: "What would you like to edit?",
      choices,
    });

    if (target === "done") {
      editing = false;
      continue;
    }

    if (target === "role") {
      const oldRole = cfg.role;
      cfg.role = await select({
        message: "App role?",
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
        default: cfg.role,
      });
      success(`Role: ${cfg.role}`);

      // Clean up role-specific fields when switching
      if (oldRole && oldRole !== cfg.role) {
        if (cfg.role === "remote") {
          delete cfg.remotes;
          hint("Cleared remotes (switched to remote role).");
        } else {
          delete cfg.exposes;
          hint("Cleared exposes (switched to host role).");
        }
      }
    } else if (target === "name") {
      const defaultName =
        cfg.name ?? (packageJson.name ?? path.basename(targetDir)).replace(/[^a-zA-Z0-9_-]/g, "");
      cfg.name = await input({
        message: "Federation name?",
        default: defaultName,
        validate: validateName,
      });
      success(`Name: ${cfg.name}`);
    } else if (target === "port") {
      const defaultPort =
        cfg.port != null ? String(cfg.port) : cfg.role === "remote" ? "5001" : "5000";
      cfg.port = await input({
        message: "Dev server port?",
        default: defaultPort,
        validate: validatePort,
      });
      success(`Port: ${cfg.port}`);
    } else if (target === "exposes") {
      cfg.exposes = await editExposes(cfg.exposes ?? {}, srcDir);
    } else if (target === "remotes") {
      cfg.remotes = await editRemotes(cfg.remotes ?? {}, hasTailwind);
    }

    newline();
  }

  // ── Step 4: Review ─────────────────────────────────────────────────────

  step(4, "Review");

  // Clean empty maps
  if (cfg.exposes && Object.keys(cfg.exposes).length === 0) {
    delete cfg.exposes;
  }
  if (cfg.remotes && Object.keys(cfg.remotes).length === 0) {
    delete cfg.remotes;
  }

  // Include $schema for IDE autocompletion
  const output: Record<string, unknown> = {
    $schema: "./node_modules/mfx/mfa.config.schema.json",
    ...cfg,
  };
  const jsonContent = `${JSON.stringify(output, null, 2)}\n`;

  banner("mfa.config.json");
  console.log(jsonContent);

  // ── Step 5: Write ──────────────────────────────────────────────────────

  step(5, "Save");

  const configPath = path.join(targetDir, "mfa.config.json");
  const yes = opts.yes ?? false;

  const shouldWrite =
    yes ||
    (await confirm({
      message: isNew
        ? `Create ${path.relative(process.cwd(), configPath)}?`
        : `Update ${path.relative(process.cwd(), configPath)}?`,
      default: true,
    }));

  if (!shouldWrite) {
    info("Cancelled. No changes made.");
    return;
  }

  fs.writeFileSync(configPath, jsonContent, "utf-8");
  success(`Written: ${path.relative(process.cwd(), configPath)}`);

  // ── Step 6: Apply ──────────────────────────────────────────────────────

  const shouldApply =
    yes ||
    (await confirm({
      message: "Apply config now? (runs mfx init)",
      default: true,
    }));

  if (shouldApply) {
    const { runWizard } = await import("./init.js");
    await runWizard(
      {
        projectDir: targetDir,
        yes: true,
        config: configPath,
      },
      version,
    );
  } else {
    outro([
      "Config saved! To apply it later, run:",
      "",
      `  mfx init -d ${path.relative(process.cwd(), targetDir) || "."}`,
      "",
      "The init wizard will auto-detect your",
      "mfa.config.json and pre-fill all values.",
    ]);
  }
}

// ─── Sub-editors ───────────────────────────────────────────────────────────

async function editExposes(
  current: Record<string, string>,
  srcDir: string,
): Promise<Record<string, string>> {
  const exposes = { ...current };

  type Action = "add" | "update" | "remove" | "back";
  const entries = Object.entries(exposes);

  if (entries.length > 0) {
    hint("Current exposes:");
    for (const [key, val] of entries) {
      label(key, val);
    }
    newline();
  }

  let editing = true;
  while (editing) {
    const action: Action = await select({
      message: "Exposes:",
      choices: [
        { value: "add" as Action, name: "Add a new module" },
        ...(Object.keys(exposes).length > 0
          ? [
              { value: "update" as Action, name: "Update a module" },
              { value: "remove" as Action, name: "Remove a module" },
            ]
          : []),
        { value: "back" as Action, name: "\u2190  Back" },
      ],
    });

    if (action === "back") {
      editing = false;
      continue;
    }

    if (action === "add") {
      const exposePath = await input({
        message: "Expose path?",
        default: "./components",
        validate: validateExposePath,
      });
      const localPath = await input({
        message: `Local file for "${exposePath}"?`,
        default: `./${srcDir}/components/index.ts`,
      });
      exposes[exposePath] = localPath;
      success(`Added: ${exposePath} \u2192 ${localPath}`);
    } else if (action === "update") {
      const key = await select({
        message: "Which module?",
        choices: Object.entries(exposes).map(([k, v]) => ({
          value: k,
          name: `${k} \u2192 ${v}`,
        })),
      });
      const newVal = await input({
        message: `New local file for "${key}"?`,
        default: exposes[key],
      });
      exposes[key] = newVal;
      success(`Updated: ${key} \u2192 ${newVal}`);
    } else if (action === "remove") {
      const keys = Object.keys(exposes);
      const toRemove = await checkbox({
        message: "Select modules to remove:",
        choices: keys.map((k) => ({ value: k, name: `${k} \u2192 ${exposes[k]}` })),
      });
      for (const k of toRemove) {
        delete exposes[k];
        success(`Removed: ${k}`);
      }
    }
  }

  return exposes;
}

async function editRemotes(
  current: Record<string, MfaConfigRemoteEntry>,
  hasTailwind: boolean,
): Promise<Record<string, MfaConfigRemoteEntry>> {
  const remotes = { ...current };

  type Action = "add" | "update" | "remove" | "back";
  const entries = Object.entries(remotes);

  if (entries.length > 0) {
    hint("Current remotes:");
    for (const [key, val] of entries) {
      label(key, val.entry);
    }
    newline();
  }

  let editing = true;
  while (editing) {
    const action: Action = await select({
      message: "Remotes:",
      choices: [
        { value: "add" as Action, name: "Add a new remote" },
        ...(Object.keys(remotes).length > 0
          ? [
              { value: "update" as Action, name: "Update a remote" },
              { value: "remove" as Action, name: "Remove a remote" },
            ]
          : []),
        { value: "back" as Action, name: "\u2190  Back" },
      ],
    });

    if (action === "back") {
      editing = false;
      continue;
    }

    if (action === "add") {
      const remoteName = await input({
        message: "Remote name?",
        default: `remote${Object.keys(remotes).length + 1}`,
        validate: validateName,
      });
      const port = await input({
        message: "Remote port?",
        default: `${5001 + Object.keys(remotes).length}`,
        validate: validatePort,
      });
      const entry = await input({
        message: "Entry URL?",
        default: `http://localhost:${port}/remoteEntry.js`,
      });

      const remote: MfaConfigRemoteEntry = { entry };

      // Types
      const wantTypes = await confirm({
        message: "Configure type declarations?",
        default: true,
      });
      if (wantTypes) {
        remote.types = await editTypes({});
      }

      // Tailwind
      if (hasTailwind) {
        const wantTailwind = await confirm({
          message: "Add Tailwind @source path?",
          default: true,
        });
        if (wantTailwind) {
          remote.tailwindSource = await input({
            message: "Relative path to remote src/?",
            default: `../../${remoteName
              .replace(/([A-Z])/g, "-$1")
              .toLowerCase()
              .replace(/^-/, "")}/src`,
          });
        }
      }

      remotes[remoteName] = remote;
      success(`Added: ${remoteName} \u2192 ${entry}`);
    } else if (action === "update") {
      const key = await select({
        message: "Which remote?",
        choices: Object.entries(remotes).map(([k, v]) => ({
          value: k,
          name: `${k} \u2192 ${v.entry}`,
        })),
      });

      const current = remotes[key];

      type Field = "entry" | "types" | "tailwind" | "back";
      let editingRemote = true;

      while (editingRemote) {
        const field: Field = await select({
          message: `Edit "${key}":`,
          choices: [
            {
              value: "entry" as Field,
              name: `Entry URL      (${current.entry})`,
            },
            {
              value: "types" as Field,
              name: `Types          (${current.types ? `${Object.keys(current.types).length} module(s)` : "none"})`,
            },
            ...(hasTailwind
              ? [
                  {
                    value: "tailwind" as Field,
                    name: `Tailwind src   (${current.tailwindSource ?? "not set"})`,
                  },
                ]
              : []),
            { value: "back" as Field, name: "\u2190  Back" },
          ],
        });

        if (field === "back") {
          editingRemote = false;
        } else if (field === "entry") {
          current.entry = await input({
            message: "Entry URL?",
            default: current.entry,
          });
          success(`Updated entry: ${current.entry}`);
        } else if (field === "types") {
          current.types = await editTypes(current.types ?? {});
        } else if (field === "tailwind") {
          current.tailwindSource = await input({
            message: "Relative path to remote src/?",
            default: current.tailwindSource ?? `../../${key}/src`,
          });
          success(`Updated tailwindSource: ${current.tailwindSource}`);
        }
      }

      remotes[key] = current;
    } else if (action === "remove") {
      const keys = Object.keys(remotes);
      const toRemove = await checkbox({
        message: "Select remotes to remove:",
        choices: keys.map((k) => ({
          value: k,
          name: `${k} \u2192 ${remotes[k].entry}`,
        })),
      });
      for (const k of toRemove) {
        delete remotes[k];
        success(`Removed: ${k}`);
      }
    }
  }

  return remotes;
}

async function editTypes(current: Record<string, string[]>): Promise<Record<string, string[]>> {
  const types = { ...current };

  type Action = "add" | "remove" | "back";

  if (Object.keys(types).length > 0) {
    hint("Current types:");
    for (const [mod, exports] of Object.entries(types)) {
      label(mod, exports.join(", "));
    }
    newline();
  }

  let editing = true;
  while (editing) {
    const action: Action = await select({
      message: "Types:",
      choices: [
        { value: "add" as Action, name: "Add module types" },
        ...(Object.keys(types).length > 0
          ? [{ value: "remove" as Action, name: "Remove module types" }]
          : []),
        { value: "back" as Action, name: "\u2190  Back" },
      ],
    });

    if (action === "back") {
      editing = false;
    } else if (action === "add") {
      const modPath = await input({
        message: "Module path?",
        default: "./components",
        validate: validateExposePath,
      });
      const exportsRaw = await input({
        message: "Exported names? (comma-separated)",
        default: "Button, Card",
      });
      types[modPath] = exportsRaw
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      success(`Added types: ${modPath} \u2192 [${types[modPath].join(", ")}]`);
    } else if (action === "remove") {
      const keys = Object.keys(types);
      const toRemove = await checkbox({
        message: "Select to remove:",
        choices: keys.map((k) => ({
          value: k,
          name: `${k} \u2192 [${types[k].join(", ")}]`,
        })),
      });
      for (const k of toRemove) {
        delete types[k];
        success(`Removed: ${k}`);
      }
    }
  }

  return types;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function showConfig(cfg: MfaConfig): void {
  if (cfg.role) label("Role", cfg.role);
  if (cfg.name) label("Name", cfg.name);
  if (cfg.port != null) label("Port", String(cfg.port));

  if (cfg.exposes) {
    const count = Object.keys(cfg.exposes).length;
    label("Exposes", `${count} module${count !== 1 ? "s" : ""}`);
    for (const [key, val] of Object.entries(cfg.exposes)) {
      hint(`  ${key} \u2192 ${val}`);
    }
  }

  if (cfg.remotes) {
    const count = Object.keys(cfg.remotes).length;
    label("Remotes", `${count} app${count !== 1 ? "s" : ""}`);
    for (const [key, val] of Object.entries(cfg.remotes)) {
      hint(`  ${key} \u2192 ${val.entry}`);
    }
  }
}
