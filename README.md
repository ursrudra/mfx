# mfx

Module Federation CLI for Vite + React. Interactive wizard, web GUI studio, workspace batch mode, and diagnostics — from zero to federated in 60 seconds.

```
npx mfx init
```

## What is mfx?

**mfx** is an open-source CLI toolkit that takes the pain out of setting up and managing [Module Federation](https://module-federation.io/) in Vite + React + TypeScript projects. Instead of manually wiring federation plugins, shared dependencies, and remote entries, just run the wizard and answer a few questions.

### Key Features

- **Interactive CLI Wizard** — step-by-step setup like `create-vite` or `shadcn init`
- **Web GUI Studio** — browser-based visual configuration (`mfx gui`)
- **Workspace Batch Mode** — configure multiple apps in a monorepo at once (`mfx workspace`)
- **Doctor Diagnostics** — validate your federation setup and catch misconfigurations (`mfx doctor`)
- **Config File Driven** — `mfa.config.json` as the single source of truth
- **Zero Lock-in** — generates standard Vite config; eject anytime

## Quick Start

```bash
# Scaffold a new federated remote
npx mfx init -r remote

# Scaffold a new federated host
npx mfx init -r host

# Open the visual GUI
npx mfx gui
```

## Commands

| Command | Description |
| --- | --- |
| `mfx init` | Full setup wizard — configure Module Federation from scratch |
| `mfx expose` | Add, update, or remove exposed modules (remote apps) |
| `mfx remote` | Add, update, or remove remote applications (host apps) |
| `mfx config` | Create or edit `mfa.config.json` interactively |
| `mfx doctor` | Validate Module Federation setup health |
| `mfx remove` | Remove Module Federation from a project |
| `mfx status` | Show current federation configuration |
| `mfx workspace` | Set up multiple apps in a monorepo (batch mode) |
| `mfx dev` | Start all federated apps concurrently |
| `mfx upgrade` | Upgrade Module Federation packages to latest |
| `mfx gui` | Open web-based configuration GUI |

## Repository Structure

```
mfx/
├── tools/setup-mfa/     # CLI source code (TypeScript)
├── mfa-host/            # Demo host app (Vite + React)
├── mfa-remote/          # Demo remote app / product landing page
├── mfa-ui/              # Demo UI remote app
├── mfa.workspace.json   # Workspace config for mfx workspace
└── .github/workflows/   # CI + npm publish workflows
```

| Directory | Description |
| --- | --- |
| `tools/setup-mfa` | The `mfx` CLI package — published to npm |
| `mfa-host` | Host app that consumes remote micro-frontends |
| `mfa-remote` | Remote app exposing landing page sections |
| `mfa-ui` | Remote app exposing shared UI components |

## Development

### Prerequisites

- Node.js >= 18
- pnpm

### Build the CLI

```bash
cd tools/setup-mfa
pnpm install
pnpm build
```

### Run the Demo Apps

```bash
# Start all apps concurrently (remotes first, then host)
cd tools/setup-mfa
node dist/cli.js dev

# Or start individually
cd mfa-remote && pnpm dev   # http://localhost:5001
cd mfa-ui && pnpm dev       # http://localhost:5002
cd mfa-host && pnpm dev     # http://localhost:5000
```

### Run Tests

```bash
cd tools/setup-mfa
pnpm test
```

### Lint & Format

```bash
cd tools/setup-mfa
pnpm check    # Biome lint + format
pnpm typecheck
```

## Tech Stack

- **CLI**: TypeScript, Commander, Inquirer
- **Demo Apps**: Vite 7, React 19, Tailwind CSS, shadcn/ui
- **Federation**: `@module-federation/vite`
- **Testing**: Vitest
- **Linting**: Biome

## License

[MIT](tools/setup-mfa/LICENSE)
