# mfx

Interactive CLI wizard to enable [Module Federation](https://module-federation.io/) in any **Vite + React + TypeScript** project.

Just run it and answer the questions — like `create-vite` or `shadcn init`.

```
  ╭─────────────────────────────────────────╮
  │  mfx  v1.0.0                      │
  │  Configure Module Federation             │
  │  for Vite + React + TypeScript           │
  ╰─────────────────────────────────────────╯

  Step 1  Project location
  Step 2  App role          (remote or host)
  Step 3  Federation name
  Step 4  Dev server port
  Step 5  Exposed modules / Remote apps
  Step 6  Review & confirm
```

## Install & Build

```bash
cd tools/setup-mfa
pnpm install
pnpm build
```

## Commands

| Command | Description |
| --- | --- |
| `mfx` | Full init wizard — set up Module Federation from scratch (default) |
| `mfx init` | Same as above (explicit) |
| `mfx expose` | Add, update, or remove exposed modules (remote apps) |
| `mfx remote` | Add, update, or remove remote applications (host apps) |
| `mfx config` | Create or edit `mfa.config.json` interactively |
| `mfx doctor` | Validate Module Federation setup health |
| `mfx remove` | Remove Module Federation from a project (clean reverse of init) |
| `mfx status` | Show current federation configuration (read-only) |
| `mfx workspace` | Set up multiple apps in a monorepo (batch mode) |
| `mfx dev` | Start all federated apps concurrently (remotes first) |
| `mfx upgrade` | Upgrade Module Federation packages to latest |
| `mfx gui` | Open web-based configuration GUI in your browser |

### `mfx` / `mfx init`

Full setup wizard. Walks you through everything step by step.

```bash
# Interactive wizard
node dist/cli.js

# During development (no build needed)
pnpm dev

# Preview without writing anything
node dist/cli.js --dry-run
```

#### Init flags (optional shortcuts)

Flags pre-fill answers so the wizard skips those questions. All are optional.

```bash
# Pre-fill project dir and role
node dist/cli.js -d ./my-remote -r remote

# Fully non-interactive (CI / scripting)
node dist/cli.js -d ./my-app -r remote -n myRemote -p 5001 -y
```

| Flag | Description |
| --- | --- |
| `-d, --project-dir <path>` | Skip the "project path" question |
| `-r, --role <role>` | Skip the "role" question (`remote` \| `host`) |
| `-n, --name <name>` | Skip the "federation name" question |
| `-p, --port <port>` | Skip the "port" question |
| `-y, --yes` | Auto-confirm all prompts (use defaults) |
| `--dry-run` | Preview generated files without writing |
| `--no-install` | Skip dependency installation (CI / air-gapped) |
| `--build-target <target>` | Vite build target (`chrome89` \| `esnext` \| `es2022` \| `es2021` \| `es2020`) |
| `--gui` | Open web-based GUI instead of CLI wizard |
| `-c, --config <path>` | Path to config file (auto-detected by default) |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

### `mfx expose`

Manage exposed modules on an existing **remote** app. Parses the current `vite.config.ts`, shows what's already exposed, and lets you add, update, or remove entries — all surgically, without regenerating the entire file.

```bash
# Interactive — shows current exposes, asks what to do
node dist/cli.js expose

# Target a specific project
node dist/cli.js expose -d ./my-remote

# Preview changes
node dist/cli.js expose -d ./my-remote --dry-run
```

**What it does:**

1. Reads the existing `vite.config.ts` and extracts the `exposes: { … }` block
2. Shows current exposed modules
3. Asks: **Add** / **Update** / **Remove**
4. Lets you define expose path and local file
5. Backs up and surgically updates the vite config

### `mfx remote`

Manage remote applications on an existing **host** app. Parses the current `vite.config.ts`, shows registered remotes, and lets you add, update, or remove them.

```bash
# Interactive — shows current remotes, asks what to do
node dist/cli.js remote

# Target a specific project
node dist/cli.js remote -d ./my-host

# Preview changes
node dist/cli.js remote -d ./my-host --dry-run
```

**What it does:**

1. Reads the existing `vite.config.ts` and extracts the `remotes: { … }` block
2. Shows current remote apps
3. Asks: **Add** / **Update** / **Remove**
4. For new remotes: optionally generates `.d.ts` type declarations and Tailwind `@source` directives
5. For removed remotes: optionally cleans up `.d.ts` files
6. Backs up and surgically updates the vite config

#### Shared flags for expose / remote

| Flag | Description |
| --- | --- |
| `-d, --project-dir <path>` | Skip the "project path" question |
| `-y, --yes` | Auto-confirm all yes/no prompts |
| `--dry-run` | Preview without writing files |

#### Safety guards

- Running `expose` on a **host** project shows an error and suggests `mfx remote`
- Running `remote` on a **remote** project shows an error and suggests `mfx expose`
- The original `vite.config.ts` is always backed up before any changes

### `mfx config`

Interactive editor for `mfa.config.json`. Create a new config from scratch, or load and edit an existing one. If no config file exists, the command infers current settings from your `vite.config.ts`.

```bash
# Interactive config editor
node dist/cli.js config

# Target a specific project
node dist/cli.js config -d ./my-remote
```

**Wizard flow:**

1. Loads existing `mfa.config.json`, or infers settings from `vite.config.ts`
2. Shows an interactive menu to edit any field:
   - **Role** — switch between remote and host (auto-cleans role-specific fields)
   - **Name** — federation name
   - **Port** — dev server port
   - **Exposes** — add / update / remove exposed modules (remote)
   - **Remotes** — add / update / remove remotes with types and tailwind paths (host)
3. Previews the generated JSON
4. Writes `mfa.config.json`
5. Optionally runs `mfx init` to apply the config immediately

| Flag | Description |
| --- | --- |
| `-d, --project-dir <path>` | Skip the "project path" question |
| `-y, --yes` | Auto-confirm file write prompts |

### `mfx doctor`

Validate your Module Federation setup. Checks dependencies, config, file paths, and more.

```bash
# Interactive
node dist/cli.js doctor

# Target a specific project
node dist/cli.js doctor -d ./my-app
```

**What it checks:**

1. `package.json` exists
2. Package manager detected
3. Vite config present and parseable
4. `@module-federation/vite` installed
5. `federation()` call found in config
6. Role detection (remote/host)
7. Exposed files exist (remotes) / Remote URLs valid (hosts)
8. Type declarations present
9. Config file valid
10. `.gitignore` includes `.__mf__temp`
11. Tailwind CSS v4 detected
12. Shared dependencies (react, react-dom)

### `mfx remove`

Clean reverse of `init` — removes Module Federation from a project.

```bash
# Interactive
node dist/cli.js remove

# Non-interactive
node dist/cli.js remove -d ./my-app -y

# Preview without removing
node dist/cli.js remove -d ./my-app --dry-run
```

**What it does:**

1. Removes `federation()` plugin call from `vite.config.ts`
2. Removes the `@module-federation/vite` import
3. Deletes auto-generated `.d.ts` type declarations
4. Optionally deletes `mfa.config.json` / `.mfarc.json`
5. Deletes `.__mf__temp/` directory
6. Optionally uninstalls `@module-federation/vite`
7. Creates a backup of `vite.config.ts` before changes

| Flag | Description |
| --- | --- |
| `-d, --project-dir <path>` | Skip the "project path" question |
| `-y, --yes` | Auto-confirm all prompts |
| `--dry-run` | Preview without making changes |

### Global flags

These flags work with any command:

| Flag | Description |
| --- | --- |
| `--verbose` | Show detailed output (debugging) |
| `--quiet` | Suppress non-essential output (CI pipelines) |

### `mfx status`

Show the current Module Federation configuration at a glance. Read-only — makes no changes.

```bash
# Pretty-printed summary
node dist/cli.js status -d ./my-app

# JSON output (for scripting / CI)
node dist/cli.js status -d ./my-app --json
```

| Flag | Description |
| --- | --- |
| `-d, --project-dir <path>` | Skip the "project path" question |
| `--json` | Output as JSON (for scripting) |

### `mfx workspace`

Set up Module Federation in multiple apps at once (monorepo batch mode).

```bash
# Interactive — discovers projects, lets you select
node dist/cli.js workspace

# From a workspace config file
node dist/cli.js workspace -w ./monorepo

# Fully non-interactive (CI)
node dist/cli.js workspace -w . -y --no-install --quiet
```

**Discovery modes:**

1. **Config file** — reads `mfa.workspace.json` from the workspace root
2. **Auto-discover** — scans `apps/`, `packages/`, `projects/`, `services/`, `modules/` for Vite projects

**Workspace config example** (`mfa.workspace.json`):

```json
{
  "apps": [
    { "dir": "apps/host",   "role": "host",   "name": "shell", "port": "5000" },
    { "dir": "apps/remote", "role": "remote", "name": "ui",    "port": "5001" },
    { "dir": "apps/auth",   "role": "remote", "name": "auth",  "port": "5002" }
  ],
  "shared": {
    "react-router-dom": true
  }
}
```

| Flag | Description |
| --- | --- |
| `-w, --workspace-dir <path>` | Workspace root directory |
| `-y, --yes` | Auto-confirm all prompts |
| `--dry-run` | Preview without making changes |
| `--no-install` | Skip dependency installation |

### `mfx gui`

Open a local web-based GUI in your browser for point-and-click configuration. A lightweight HTTP server starts on `localhost`, serves a modern form UI, and applies the configuration using the same engine as the CLI wizard.

```bash
# Open GUI with auto-assigned port
node dist/cli.js gui

# Or use the --gui flag on init
node dist/cli.js init --gui

# Specify a port for the GUI server
node dist/cli.js gui -p 4000

# Don't auto-open the browser
node dist/cli.js gui --no-open
```

**Two modes:**

- **Single Project** (default) — configure one app at a time
- **Workspace** — discover and configure all apps in a monorepo at once

**Single Project mode provides:**

1. **Project detection** — enter a path or use the file browser, click Detect to scan
2. **Role selection** — visual cards to pick Remote or Host
3. **Federation name & port** — pre-filled from existing config, live-validated as you type
4. **Build target** — dropdown to select Vite `build.target`
5. **Exposes / Remotes** — dynamic form fields with inline validation; component picker scans your project to auto-populate expose entries
6. **Review & config preview** — see the full generated config before applying
7. **One-click apply** — runs the full init wizard from the browser

**Workspace mode provides:**

1. **Root selection** — enter or browse to the monorepo root directory
2. **Auto-discovery** — finds all Vite projects in common monorepo directories (`apps/`, `packages/`, etc.)
3. **App cards** — each discovered app shown as an editable card with role, name, port, build target; checkbox to include/exclude
4. **Pre-filled settings** — detected role, port, and federation name are auto-populated from existing config
5. **Batch review** — table view of all selected apps with port conflict detection
6. **Batch apply** — applies configuration to all selected apps sequentially, showing per-app success/failure

| Flag | Description |
| --- | --- |
| `-p, --port <port>` | Port for the GUI server (auto-assigned by default) |
| `--no-open` | Don't auto-open the browser |

### `mfx dev`

Start all federated apps concurrently in a single terminal, with remotes starting before hosts so remote entries are available when the host boots.

```bash
# Start all apps from workspace root
node dist/cli.js dev

# Specify a workspace root
node dist/cli.js dev -w ../my-monorepo

# Only start specific apps
node dist/cli.js dev --filter mfa-remote mfa-host
```

Features:
- Reads `mfa.workspace.json` or auto-discovers Vite projects
- Starts remotes first (with a short delay), then hosts
- Color-coded, prefixed output per app
- Graceful shutdown with Ctrl+C (kills all child processes)
- Detects the correct package manager per app

| Flag | Description |
| --- | --- |
| `-w, --workspace-dir <path>` | Workspace root directory (default: cwd) |
| `-f, --filter <apps...>` | Only start specific apps (by name or directory) |

### `mfx upgrade`

Check for newer versions of Module Federation packages and upgrade them.

```bash
# Interactive upgrade
node dist/cli.js upgrade

# Specify project and auto-confirm
node dist/cli.js upgrade -d ./my-app -y

# Preview what would change
node dist/cli.js upgrade --dry-run
```

Features:
- Detects current `@module-federation/vite` version
- Checks npm registry for latest version
- Also upgrades related packages (`@module-federation/runtime`, etc.)
- Warns about major version changes with migration hints
- Supports `--dry-run` for safe previewing

| Flag | Description |
| --- | --- |
| `-d, --project-dir <path>` | Skip the project path question |
| `-y, --yes` | Auto-confirm all prompts |
| `--dry-run` | Show what would change without upgrading |

## Config File

You can pre-fill wizard answers by placing an `mfa.config.json` (or `.mfarc.json`) in your project root. The wizard auto-detects it — no flags needed.

**Priority order:** CLI flags > config file > interactive prompt

### JSON Schema

Add `$schema` for IDE autocompletion and validation:

```json
{
  "$schema": "./node_modules/mfx/mfa.config.schema.json",
  "role": "remote",
  "name": "myApp"
}
```

The schema is automatically added when you use `mfx config` to generate a config file.

### Remote example

```json
{
  "$schema": "./node_modules/mfx/mfa.config.schema.json",
  "role": "remote",
  "name": "sharedUI",
  "port": "5002",
  "buildTarget": "chrome89",
  "exposes": {
    "./components": "./src/components/index.ts",
    "./hooks": "./src/hooks/index.ts"
  }
}
```

### Host example

```json
{
  "role": "host",
  "name": "shell",
  "port": "5000",
  "remotes": {
    "sharedUI": {
      "entry": "http://localhost:5002/remoteEntry.js",
      "types": {
        "./components": ["Button", "Card", "Dialog"],
        "./hooks": ["useTheme", "useAuth"]
      },
      "tailwindSource": "../../mfa-remote/src"
    }
  }
}
```

### Config in package.json

Instead of a separate file, add a `"mfx"` key:

```json
{
  "name": "my-app",
  "mfx": {
    "role": "remote",
    "name": "myApp",
    "port": "5001"
  }
}
```

### Detection order

1. `--config <path>` flag (explicit)
2. `mfa.config.json` in project root
3. `.mfarc.json` in project root
4. `"mfx"` key in `package.json`

### Config fields

| Field | Type | Description |
| --- | --- | --- |
| `$schema` | `string` | JSON Schema path for IDE autocompletion |
| `$version` | `number` | Schema version for future migrations |
| `role` | `"remote"` \| `"host"` | App role in the federation |
| `name` | `string` | Unique federation name |
| `port` | `string` \| `number` | Dev server port (normalised to string) |
| `buildTarget` | `string` | Vite `build.target` — defaults to `"chrome89"` (recommended for MF) |
| `exposes` | `Record<string, string>` | *(Remote)* Expose path → local file |
| `remotes` | `Record<string, object>` | *(Host)* Remote name → config |
| `remotes.*.entry` | `string` | URL to remote's `remoteEntry.js` |
| `remotes.*.types` | `Record<string, string[]>` | Module path → exported component names |
| `remotes.*.tailwindSource` | `string` | Relative path to remote's `src/` for Tailwind `@source` |
| `shared` | `Record<string, SharedDep \| boolean>` | Extra shared deps (beyond default react stack) |

## Project Structure

```
tools/setup-mfa/
├── src/
│   ├── cli.ts              # Entry point — 13 commands, flags, error handling
│   ├── types.ts            # TypeScript interfaces & constants
│   ├── commands/
│   │   ├── init.ts         # Init wizard (3-mode: generate/inject/surgical)
│   │   ├── expose.ts       # Add/update/remove exposed modules
│   │   ├── remote.ts       # Add/update/remove remote apps
│   │   ├── config.ts       # Interactive mfa.config.json editor
│   │   ├── doctor.ts       # Setup health validation
│   │   ├── remove.ts       # Clean reverse of init
│   │   ├── status.ts       # Read-only config summary
│   │   ├── workspace.ts    # Monorepo batch mode
│   │   ├── dev.ts          # Start all federated apps concurrently
│   │   └── upgrade.ts      # Upgrade Module Federation packages
│   ├── gui/
│   │   ├── server.ts       # HTTP server with API endpoints
│   │   ├── html.ts         # Composes the GUI from template modules
│   │   └── templates/
│   │       ├── index.ts    # Barrel export for all templates
│   │       ├── styles.ts   # All CSS for the web GUI
│   │       ├── markup.ts   # HTML body (stepper, forms, modals)
│   │       └── scripts.ts  # Client-side JS (validation, API calls, state)
│   └── utils/
│       ├── config.ts       # Config file detection, loading & validation
│       ├── detect.ts       # Project detection (pkg manager, Vite, Tailwind)
│       ├── fs.ts           # Atomic file ops & timestamped backups
│       ├── generate.ts     # Code generators (vite config, .d.ts, CSS)
│       ├── log.ts          # Styled terminal output with log levels
│       ├── parse.ts        # Parse existing vite.config (exposes, remotes)
│       └── validators.ts   # Centralised input validation functions
├── biome.json              # Biome linter/formatter config
├── mfa.config.schema.json  # JSON Schema for mfa.config.json
├── dist/                   # Compiled output (git-ignored)
├── package.json
└── tsconfig.json
```

## Development

```bash
# Run without building
pnpm dev

# Type-check without emitting
pnpm typecheck

# Build
pnpm build

# Clean build output
pnpm clean

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Lint & format (Biome)
pnpm lint              # Check for lint issues
pnpm format            # Auto-format all files
pnpm format:check      # Check formatting without fixing
pnpm check             # Run all Biome checks (lint + format)
```

### Test suite

Comprehensive test suite covering utilities, commands, and E2E flows:

| Module | Tests | What's covered |
| --- | --- | --- |
| `validators` | 16 | Name, port, expose path, remote URL, local file path validation |
| `parse` | 23 | Exposes, remotes, role detection, federation call, comment/string resilience |
| `generate` | 20 | Remote/host config generation, snippets, type declarations, Tailwind injection, build targets |
| `config` | 17 | Loading, fallbacks, normalisation, validation, malformed JSON |
| `fs` | 9 | Atomic writes, backups, deletions, directory creation |
| `detect` | 41 | Package manager, Vite config, Tailwind, federation detection, project scanning |
| `gui/server` | 29 | sanitizePath, detectProjectInfo, browseDirectory, patchBuildTarget, scanSourceFiles |
| `workspace` | 18 | discoverApps helper, E2E batch mode, error paths, dry-run |
| `dev` | 6 | Workspace discovery, path escape prevention, filtering, error paths |
| `upgrade` | 7 | Version checking, dry-run, already-on-latest, network failure, successful upgrade |
| `e2e` | 12 | Init (remote/host/inject/surgical), remove, status, tailwind, build target |
| `commands` | 14 | Doctor, config error paths, expose/remote error paths, config file integration |

## CI / GitHub Actions

The CLI is fully scriptable for CI pipelines:

```yaml
# Single app
- name: Setup MFA
  run: |
    node tools/setup-mfa/dist/cli.js init \
      -d . -r remote -n myApp -p 5001 \
      -y --no-install --quiet

# Monorepo
- name: Setup all MFA apps
  run: |
    node tools/setup-mfa/dist/cli.js workspace \
      -w . -y --no-install --quiet

# Validate
- name: Validate setup
  run: node tools/setup-mfa/dist/cli.js doctor -d .

# Machine-readable status
- name: Get status
  run: node tools/setup-mfa/dist/cli.js status -d . --json
```

Key flags: `-y` (non-interactive), `--no-install` (CI handles deps), `--quiet` (clean logs), `--json` (machine output).

## Requirements

- Node.js >= 18
- Target project must use Vite + React

## License

MIT
