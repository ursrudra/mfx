# Changelog

All notable changes to **mfx** (Module Federation Studio) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-14

### Added

- **CLI**: 13 interactive commands — `init`, `expose`, `remote`, `config`, `doctor`, `status`, `remove`, `upgrade`, `dev`, `workspace`, `gui`, `help`, `version`.
- **GUI**: Self-contained web-based configuration wizard with 4-step stepper, file browser, component picker, live validation, and config preview.
- **Workspace mode**: Batch-configure multiple apps in a monorepo via both CLI (`mfx workspace`) and GUI.
- **Config file support**: `mfa.config.json` / `.mfarc.json` / `package.json["mfx"]` with JSON Schema validation.
- **Three config modes**: generate (new vite config), inject (add federation to existing config), surgical (update in-place).
- **Atomic file operations**: All writes go through temp files with rename-into-place and automatic rollback on failure.
- **Backup system**: Timestamped backups before any destructive operation.
- **Light/dark theme toggle**: Persistent theme preference in GUI via `localStorage`.
- **Component picker**: Scan project source files, search by name/kind, and bulk-add exposed modules.
- **Auto-port assignment**: Workspace mode auto-assigns unique dev server ports to apps.
- **Dry-run mode**: Preview changes without writing files (`--dry-run`).
- **Doctor command**: Diagnose configuration issues and missing dependencies.
- **Upgrade command**: Detect and apply version upgrades to federation plugins.
- **TypeScript declarations**: Auto-generate `remote.d.ts` for type-safe remote imports.
- **Tailwind integration**: Automatic `@source` directive injection for shared component styles.
- **E2E test suite**: 212+ tests covering utils, commands, GUI server, workspace, and end-to-end flows.
