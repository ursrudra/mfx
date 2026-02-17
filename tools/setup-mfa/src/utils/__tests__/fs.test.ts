import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FileOperation } from "../../types.js";
import { applyOperations, createBackup, removeBackup } from "../fs.js";

// Use a temp directory for each test
let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfx-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("createBackup", () => {
  it("creates a timestamped backup of a file", () => {
    const filePath = path.join(tmpDir, "vite.config.ts");
    fs.writeFileSync(filePath, "original content");

    const backupPath = createBackup(filePath);

    expect(backupPath).not.toBeNull();
    expect(backupPath).toContain("vite.config.ts.backup-");
    expect(fs.existsSync(backupPath!)).toBe(true);
    expect(fs.readFileSync(backupPath!, "utf-8")).toBe("original content");
  });

  it("returns null for non-existent files", () => {
    const result = createBackup(path.join(tmpDir, "nope.ts"));
    expect(result).toBeNull();
  });

  it("preserves original file", () => {
    const filePath = path.join(tmpDir, "config.ts");
    fs.writeFileSync(filePath, "keep me");

    createBackup(filePath);

    expect(fs.readFileSync(filePath, "utf-8")).toBe("keep me");
  });
});

describe("removeBackup", () => {
  it("deletes an existing backup file", () => {
    const filePath = path.join(tmpDir, "vite.config.ts");
    fs.writeFileSync(filePath, "original");

    const backupPath = createBackup(filePath);
    expect(backupPath).not.toBeNull();
    expect(fs.existsSync(backupPath!)).toBe(true);

    removeBackup(backupPath);
    expect(fs.existsSync(backupPath!)).toBe(false);
  });

  it("does nothing for null", () => {
    expect(() => removeBackup(null)).not.toThrow();
  });

  it("does nothing for non-existent path", () => {
    expect(() => removeBackup(path.join(tmpDir, "ghost.backup-123"))).not.toThrow();
  });
});

describe("applyOperations", () => {
  it("writes files atomically", () => {
    const ops: FileOperation[] = [
      {
        action: "write",
        path: path.join(tmpDir, "a.txt"),
        content: "hello a",
        description: "file a",
      },
      {
        action: "write",
        path: path.join(tmpDir, "b.txt"),
        content: "hello b",
        description: "file b",
      },
    ];

    const result = applyOperations(ops, tmpDir);

    expect(result.errors).toEqual([]);
    expect(result.applied).toHaveLength(2);
    expect(fs.readFileSync(path.join(tmpDir, "a.txt"), "utf-8")).toBe("hello a");
    expect(fs.readFileSync(path.join(tmpDir, "b.txt"), "utf-8")).toBe("hello b");
  });

  it("creates parent directories if needed", () => {
    const ops: FileOperation[] = [
      {
        action: "write",
        path: path.join(tmpDir, "sub", "deep", "file.txt"),
        content: "nested",
        description: "nested file",
      },
    ];

    const result = applyOperations(ops, tmpDir);

    expect(result.errors).toEqual([]);
    expect(fs.readFileSync(path.join(tmpDir, "sub", "deep", "file.txt"), "utf-8")).toBe("nested");
  });

  it("deletes files", () => {
    const filePath = path.join(tmpDir, "delete-me.txt");
    fs.writeFileSync(filePath, "bye");

    const ops: FileOperation[] = [
      {
        action: "delete",
        path: filePath,
        description: "delete file",
      },
    ];

    const result = applyOperations(ops, tmpDir);

    expect(result.errors).toEqual([]);
    expect(result.applied).toHaveLength(1);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it("handles delete of non-existent file gracefully", () => {
    const ops: FileOperation[] = [
      {
        action: "delete",
        path: path.join(tmpDir, "ghost.txt"),
        description: "delete ghost",
      },
    ];

    const result = applyOperations(ops, tmpDir);
    expect(result.errors).toEqual([]);
  });

  it("handles mixed write and delete operations", () => {
    const existing = path.join(tmpDir, "old.txt");
    fs.writeFileSync(existing, "old");

    const ops: FileOperation[] = [
      {
        action: "write",
        path: path.join(tmpDir, "new.txt"),
        content: "new",
        description: "new file",
      },
      {
        action: "delete",
        path: existing,
        description: "remove old",
      },
    ];

    const result = applyOperations(ops, tmpDir);

    expect(result.errors).toEqual([]);
    expect(fs.existsSync(path.join(tmpDir, "new.txt"))).toBe(true);
    expect(fs.existsSync(existing)).toBe(false);
  });

  it("overwrites existing files", () => {
    const filePath = path.join(tmpDir, "overwrite.txt");
    fs.writeFileSync(filePath, "old content");

    const ops: FileOperation[] = [
      {
        action: "write",
        path: filePath,
        content: "new content",
        description: "overwrite",
      },
    ];

    const result = applyOperations(ops, tmpDir);

    expect(result.errors).toEqual([]);
    expect(fs.readFileSync(filePath, "utf-8")).toBe("new content");
  });
});
