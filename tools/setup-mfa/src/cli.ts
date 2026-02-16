#!/usr/bin/env node

/**
 * mfx — interactive wizard to enable Module Federation.
 *
 * Commands:
 *   mfx              Full init wizard (default)
 *   mfx init         Same as above (explicit)
 *   mfx expose       Add / update / remove exposed modules (remote apps)
 *   mfx remote       Add / update / remove remotes (host apps)
 *   mfx config       Create or edit mfa.config.json interactively
 *   mfx doctor       Validate setup health
 *   mfx remove       Remove Module Federation from a project
 *   mfx status       Show current configuration (read-only)
 *   mfx workspace    Set up multiple apps in a monorepo
 *   mfx dev           Start all federated apps (remotes first, then hosts)
 *   mfx upgrade       Upgrade Module Federation packages to latest
 *   mfx gui           Open web-based configuration GUI
 *
 * Global flags:
 *   --verbose              Show detailed output
 *   --quiet                Suppress non-essential output
 *
 * Flags are optional shortcuts for CI / scripting.
 */

import { createRequire } from "node:module";
import { Command } from "commander";
import { runConfig } from "./commands/config.js";
import { runDev } from "./commands/dev.js";
import { runDoctor } from "./commands/doctor.js";
import { runExpose } from "./commands/expose.js";
import { runWizard } from "./commands/init.js";
import { runRemote } from "./commands/remote.js";
import { runRemove } from "./commands/remove.js";
import { runStatus } from "./commands/status.js";
import { runUpgrade } from "./commands/upgrade.js";
import { runWorkspace } from "./commands/workspace.js";
import { startGuiServer } from "./gui/server.js";
import type { BuildTarget, Role } from "./types.js";
import { BUILD_TARGETS } from "./types.js";
import { error as logError, setLogLevel } from "./utils/log.js";

// ─── Read version from package.json ────────────────────────────────────────

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

// ─── Program ───────────────────────────────────────────────────────────────

const program = new Command();

program
  .name("mfx")
  .description("Configure Module Federation in any Vite + React project")
  .version(version, "-V, --version")
  .option("--verbose", "Show detailed output")
  .option("--quiet", "Suppress non-essential output");

// Apply log level from global flags before any command runs
program.hook("preAction", (_thisCmd, _actionCmd) => {
  // Global options live on the root command
  const globalOpts = program.opts<{ verbose?: boolean; quiet?: boolean }>();
  if (globalOpts.verbose) {
    setLogLevel("verbose");
  } else if (globalOpts.quiet) {
    setLogLevel("quiet");
  }
});

// ─── init (default command) ────────────────────────────────────────────────

program
  .command("init", { isDefault: true })
  .description("Initialize Module Federation in a project (default)")
  .option("-d, --project-dir <path>", "Skip the project path question")
  .option("-r, --role <role>", "Skip the role question (remote | host)")
  .option("-n, --name <name>", "Skip the federation name question")
  .option("-p, --port <port>", "Skip the port question")
  .option("-y, --yes", "Auto-confirm all yes/no prompts")
  .option("--dry-run", "Preview without writing files")
  .option("--no-install", "Skip dependency installation")
  .option("--build-target <target>", `Vite build target (${BUILD_TARGETS.join(" | ")})`)
  .option("-c, --config <path>", "Path to mfa.config.json (auto-detected by default)")
  .option("--gui", "Open web-based configuration GUI instead of CLI wizard")
  .action(
    async (opts: {
      projectDir?: string;
      role?: string;
      name?: string;
      port?: string;
      buildTarget?: string;
      yes?: boolean;
      dryRun?: boolean;
      noInstall?: boolean;
      config?: string;
      gui?: boolean;
    }) => {
      if (opts.gui) {
        await startGuiServer({ open: true }, version);
        return;
      }

      if (opts.role && opts.role !== "remote" && opts.role !== "host") {
        logError(`--role must be "remote" or "host", got "${opts.role}"`);
        process.exitCode = 1;
        return;
      }

      if (opts.buildTarget && !(BUILD_TARGETS as readonly string[]).includes(opts.buildTarget)) {
        logError(
          `--build-target must be one of: ${BUILD_TARGETS.join(", ")}. Got "${opts.buildTarget}"`,
        );
        process.exitCode = 1;
        return;
      }

      await runWizard(
        {
          projectDir: opts.projectDir,
          role: opts.role as Role | undefined,
          name: opts.name,
          port: opts.port,
          buildTarget: opts.buildTarget as BuildTarget | undefined,
          yes: opts.yes,
          dryRun: opts.dryRun,
          noInstall: opts.noInstall,
          config: opts.config,
        },
        version,
      );
    },
  );

// ─── expose ────────────────────────────────────────────────────────────────

program
  .command("expose")
  .description("Add, update, or remove exposed modules (remote apps)")
  .option("-d, --project-dir <path>", "Skip the project path question")
  .option("-y, --yes", "Auto-confirm all yes/no prompts")
  .option("--dry-run", "Preview without writing files")
  .action(async (opts: { projectDir?: string; yes?: boolean; dryRun?: boolean }) => {
    await runExpose(opts, version);
  });

// ─── remote ────────────────────────────────────────────────────────────────

program
  .command("remote")
  .description("Add, update, or remove remote applications (host apps)")
  .option("-d, --project-dir <path>", "Skip the project path question")
  .option("-y, --yes", "Auto-confirm all yes/no prompts")
  .option("--dry-run", "Preview without writing files")
  .action(async (opts: { projectDir?: string; yes?: boolean; dryRun?: boolean }) => {
    await runRemote(opts, version);
  });

// ─── config ────────────────────────────────────────────────────────────────

program
  .command("config")
  .description("Create or edit mfa.config.json interactively")
  .option("-d, --project-dir <path>", "Skip the project path question")
  .option("-y, --yes", "Auto-confirm file write prompts")
  .action(async (opts: { projectDir?: string; yes?: boolean }) => {
    await runConfig(opts, version);
  });

// ─── doctor ──────────────────────────────────────────────────────────────

program
  .command("doctor")
  .description("Validate Module Federation setup health")
  .option("-d, --project-dir <path>", "Skip the project path question")
  .action(async (opts: { projectDir?: string }) => {
    await runDoctor(opts, version);
  });

// ─── remove ──────────────────────────────────────────────────────────────

program
  .command("remove")
  .description("Remove Module Federation from a project (clean reverse of init)")
  .option("-d, --project-dir <path>", "Skip the project path question")
  .option("-y, --yes", "Auto-confirm all prompts")
  .option("--dry-run", "Preview without making changes")
  .action(async (opts: { projectDir?: string; yes?: boolean; dryRun?: boolean }) => {
    await runRemove(opts, version);
  });

// ─── status ──────────────────────────────────────────────────────────────

program
  .command("status")
  .description("Show current Module Federation configuration (read-only)")
  .option("-d, --project-dir <path>", "Skip the project path question")
  .option("--json", "Output as JSON (for scripting)")
  .action(async (opts: { projectDir?: string; json?: boolean }) => {
    await runStatus(opts, version);
  });

// ─── workspace ───────────────────────────────────────────────────────────

program
  .command("workspace")
  .description("Set up Module Federation in multiple apps (monorepo batch mode)")
  .option("-w, --workspace-dir <path>", "Workspace root directory")
  .option("-y, --yes", "Auto-confirm all prompts")
  .option("--dry-run", "Preview without making changes")
  .option("--no-install", "Skip dependency installation")
  .action(
    async (opts: {
      workspaceDir?: string;
      yes?: boolean;
      dryRun?: boolean;
      noInstall?: boolean;
    }) => {
      await runWorkspace(opts, version);
    },
  );

// ─── gui ────────────────────────────────────────────────────────────────

program
  .command("gui")
  .description("Open web-based configuration GUI in your browser")
  .option("-p, --port <port>", "Port for the GUI server (auto-assigned by default)")
  .option("--no-open", "Don't auto-open the browser")
  .action(async (opts: { port?: string; open?: boolean }) => {
    let port: number | undefined;
    if (opts.port) {
      port = parseInt(opts.port, 10);
      if (Number.isNaN(port) || port < 0 || port > 65535) {
        logError(`Invalid port: ${opts.port} (must be 0–65535)`);
        process.exitCode = 1;
        return;
      }
    }
    await startGuiServer(
      {
        port,
        open: opts.open,
      },
      version,
    );
  });

// ─── upgrade ────────────────────────────────────────────────────────────

program
  .command("upgrade")
  .description("Upgrade @module-federation/vite and related packages to latest")
  .option("-d, --project-dir <path>", "Skip the project path question")
  .option("-y, --yes", "Auto-confirm all prompts")
  .option("--dry-run", "Show what would be upgraded without making changes")
  .action(async (opts: { projectDir?: string; yes?: boolean; dryRun?: boolean }) => {
    await runUpgrade(opts, version);
  });

// ─── dev ────────────────────────────────────────────────────────────────

program
  .command("dev")
  .description("Start all federated apps concurrently (remotes first, then hosts)")
  .option("-w, --workspace-dir <path>", "Workspace root directory (default: cwd)")
  .option("-f, --filter <apps...>", "Only start specific apps (by name or directory)")
  .action(async (opts: { workspaceDir?: string; filter?: string[] }) => {
    await runDev(opts, version);
  });

// ─── Run ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await program.parseAsync(process.argv);
  } catch (err: unknown) {
    // @inquirer/prompts throws ExitPromptError on Ctrl+C
    if (err instanceof Error && err.constructor.name === "ExitPromptError") {
      console.log("\n");
      process.exitCode = 130;
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    logError(message);
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => {
  console.log("\n");
  process.exit(130);
});

main();
