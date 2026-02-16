import fs from "node:fs";
import path from "node:path";
import type { FileOperation } from "../types.js";
import { error as logError, success, warn } from "./log.js";

// ─── Timestamped backups ────────────────────────────────────────────────────

/**
 * Create a timestamped backup of a file.
 * Returns the backup path, or null if the file doesn't exist.
 *
 * Example: `vite.config.ts` → `vite.config.ts.backup-20260214T120000`
 */
export function createBackup(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+Z$/, "");

  const backupPath = `${filePath}.backup-${timestamp}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

// ─── Apply file operations ──────────────────────────────────────────────────

/**
 * Apply a list of file operations atomically.
 *
 * Strategy:
 * 1. Write all files to temp paths first.
 * 2. If all succeed, rename them into place.
 * 3. If any fail, clean up all temp files.
 *
 * For delete operations, the deletion happens in step 2.
 */
export function applyOperations(
  operations: FileOperation[],
  baseDir: string,
): { applied: string[]; errors: string[] } {
  const applied: string[] = [];
  const errors: string[] = [];

  // Phase 1: validate all write targets exist (parent dirs)
  for (const op of operations) {
    if (op.action === "write") {
      const dir = path.dirname(op.path);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  // Phase 2: write to temp files
  const tempFiles: { tmpPath: string; finalPath: string }[] = [];
  try {
    for (const op of operations) {
      if (op.action === "write") {
        const tmpPath = `${op.path}.tmp.${process.pid}`;
        fs.writeFileSync(tmpPath, op.content, "utf-8");
        tempFiles.push({ tmpPath, finalPath: op.path });
      }
    }
  } catch (err) {
    // Clean up all temp files on failure
    for (const { tmpPath } of tempFiles) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Write failed: ${msg}`);
    return { applied, errors };
  }

  // Phase 3: rename temp files into place + apply deletions
  for (const { tmpPath, finalPath } of tempFiles) {
    try {
      // On Windows, renameSync may fail with EEXIST/EPERM when the target exists.
      // Fall back to remove-then-rename, and finally to copy-then-unlink.
      try {
        fs.renameSync(tmpPath, finalPath);
      } catch (renameErr: unknown) {
        const code = (renameErr as NodeJS.ErrnoException).code;
        if (code === "EEXIST" || code === "EPERM") {
          try {
            fs.unlinkSync(finalPath);
          } catch {
            // Target may not exist; ignore
          }
          try {
            fs.renameSync(tmpPath, finalPath);
          } catch {
            // Cross-device or permission issue: fall back to copy + unlink
            fs.copyFileSync(tmpPath, finalPath);
            fs.unlinkSync(tmpPath);
          }
        } else {
          throw renameErr;
        }
      }
      applied.push(path.relative(baseDir, finalPath));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Rename failed for ${path.relative(baseDir, finalPath)}: ${msg}`);
      // Clean up orphaned temp file
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore
      }
    }
  }

  for (const op of operations) {
    if (op.action === "delete") {
      try {
        if (fs.existsSync(op.path)) {
          fs.unlinkSync(op.path);
          applied.push(`(deleted) ${path.relative(baseDir, op.path)}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Delete failed for ${path.relative(baseDir, op.path)}: ${msg}`);
      }
    }
  }

  return { applied, errors };
}

/**
 * Apply operations and log the results.
 */
export function applyAndLog(operations: FileOperation[], baseDir: string): boolean {
  const { applied, errors } = applyOperations(operations, baseDir);

  for (const file of applied) {
    if (file.startsWith("(deleted) ")) {
      success(`Deleted: ${file.slice(10)}`);
    } else {
      success(`Written: ${file}`);
    }
  }

  for (const err of errors) {
    logError(err);
  }

  if (errors.length > 0) {
    warn("Some operations failed. Check the errors above.");
    return false;
  }

  return true;
}
