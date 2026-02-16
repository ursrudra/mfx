import fs from "node:fs";
import path from "node:path";
import { BUILD_TARGETS, type MfaConfig } from "../types.js";

/** File names we look for, in priority order. */
const CONFIG_FILES = ["mfa.config.json", ".mfarc.json"] as const;

/**
 * Locate the config file.
 *
 * Resolution order:
 * 1. Explicit `--config <path>` flag (errors if not found)
 * 2. `mfa.config.json` in the project directory
 * 3. `.mfarc.json` in the project directory
 * 4. `"mfx"` key in `package.json`
 *
 * Returns `{ path, config }` or `null` if nothing found.
 */
export function loadConfig(
  projectDir: string,
  explicitPath?: string,
): { filePath: string; config: MfaConfig } | null {
  // 1. Explicit path
  if (explicitPath) {
    const resolved = path.resolve(projectDir, explicitPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Config file not found: ${resolved}`);
    }
    return { filePath: resolved, config: readJsonFile(resolved) };
  }

  // 2–3. Convention files in project dir
  for (const name of CONFIG_FILES) {
    const filePath = path.join(projectDir, name);
    if (fs.existsSync(filePath)) {
      return { filePath, config: readJsonFile(filePath) };
    }
  }

  // 4. "mfx" key in package.json
  const pkgPath = path.join(projectDir, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
    if (pkg["mfx"] && typeof pkg["mfx"] === "object") {
      return {
        filePath: `${pkgPath} → "mfx"`,
        config: normalizeConfig(pkg["mfx"] as MfaConfig),
      };
    }
  }

  return null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function readJsonFile(filePath: string): MfaConfig {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as MfaConfig;
    return normalizeConfig(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse ${filePath}: ${message}`);
  }
}

/**
 * Normalize config values (e.g. port from number to string).
 * Returns a new object — does not mutate the input.
 */
function normalizeConfig(config: MfaConfig): MfaConfig {
  return {
    ...config,
    ...(config.port != null ? { port: String(config.port) } : {}),
  };
}

/**
 * Validate config values (light-touch — just catches obvious mistakes).
 * Throws on invalid values.
 */
export function validateConfig(config: MfaConfig, filePath: string): void {
  if (config.role && config.role !== "remote" && config.role !== "host") {
    throw new Error(
      `Invalid "role" in ${filePath}: expected "remote" or "host", got "${config.role}"`,
    );
  }

  if (config.port) {
    const portStr = String(config.port).trim();
    if (!/^\d+$/.test(portStr)) {
      throw new Error(`Invalid "port" in ${filePath}: must be a number between 1024 and 65535`);
    }
    const n = parseInt(portStr, 10);
    if (n < 1024 || n > 65535) {
      throw new Error(`Invalid "port" in ${filePath}: must be between 1024 and 65535`);
    }
  }

  if (config.name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(config.name)) {
    throw new Error(
      `Invalid "name" in ${filePath}: must start with a letter; only letters, numbers, hyphens, underscores`,
    );
  }

  if (
    config.buildTarget &&
    !(BUILD_TARGETS as readonly string[]).includes(config.buildTarget)
  ) {
    throw new Error(
      `Invalid "buildTarget" in ${filePath}: expected one of ${BUILD_TARGETS.join(", ")}, got "${config.buildTarget}"`,
    );
  }

  if (config.exposes != null) {
    if (
      typeof config.exposes !== "object" ||
      Array.isArray(config.exposes)
    ) {
      throw new Error(`Invalid "exposes" in ${filePath}: must be a plain object`);
    }
    for (const [key, val] of Object.entries(config.exposes)) {
      if (typeof val !== "string") {
        throw new Error(
          `Invalid "exposes" in ${filePath}: value for key "${key}" must be a string`,
        );
      }
    }
  }

  if (config.remotes != null) {
    if (
      typeof config.remotes !== "object" ||
      Array.isArray(config.remotes)
    ) {
      throw new Error(`Invalid "remotes" in ${filePath}: must be a plain object`);
    }
    for (const [key, val] of Object.entries(config.remotes)) {
      if (typeof val !== "object" || val === null || Array.isArray(val)) {
        throw new Error(
          `Invalid "remotes" in ${filePath}: value for key "${key}" must be a RemoteEntry object`,
        );
      }
      if (typeof val.entry !== "string" || val.entry.length === 0) {
        throw new Error(
          `Invalid "remotes" in ${filePath}: remote "${key}" is missing a valid "entry" URL`,
        );
      }
    }
  }
}
