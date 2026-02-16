import fs from "node:fs";
import path from "node:path";

/** Validate a federation / remote name. */
export function validateName(value: string): string | true {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
    return "Must start with a letter; only letters, numbers, hyphens, underscores.";
  }
  return true;
}

/** Validate a dev-server port number (1024–65535). */
export function validatePort(value: string): string | true {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return "Port must be a number between 1024 and 65535.";
  }
  const n = parseInt(trimmed, 10);
  if (n < 1024 || n > 65535) {
    return "Port must be between 1024 and 65535.";
  }
  return true;
}

/** Validate a project directory (must exist, must contain package.json). */
export function validateDirectory(value: string): string | true {
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved)) {
    return `Directory does not exist: ${resolved}`;
  }
  if (!fs.existsSync(path.join(resolved, "package.json"))) {
    return `No package.json found in ${resolved}`;
  }
  return true;
}

/** Validate a Module Federation expose path (must start with "./" ). */
export function validateExposePath(value: string): string | true {
  if (!value.startsWith("./")) {
    return 'Must start with "./" (e.g. ./components)';
  }
  return true;
}

/** Validate a remote entry URL (must be a valid URL). */
export function validateRemoteUrl(value: string): string | true {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "URL must use http:// or https:// protocol.";
    }
    return true;
  } catch {
    return "Must be a valid URL (e.g. http://localhost:5001/remoteEntry.js)";
  }
}

/**
 * Validate that a local file path resolves to an existing file.
 * Returns true if valid, or an error message string.
 */
export function validateLocalFilePath(value: string, projectDir: string): string | true {
  const resolved = path.resolve(projectDir, value);
  if (!fs.existsSync(resolved)) {
    return `File not found: ${value} (resolved to ${resolved})`;
  }
  return true;
}
