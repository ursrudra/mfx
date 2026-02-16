import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  validateExposePath,
  validateLocalFilePath,
  validateName,
  validatePort,
  validateRemoteUrl,
} from "../validators.js";

describe("validateName", () => {
  it("accepts valid names", () => {
    expect(validateName("myApp")).toBe(true);
    expect(validateName("remote1")).toBe(true);
    expect(validateName("shared-ui")).toBe(true);
    expect(validateName("my_app")).toBe(true);
    expect(validateName("A")).toBe(true);
    expect(validateName("camelCase")).toBe(true);
    expect(validateName("PascalCase")).toBe(true);
  });

  it("rejects names starting with a number", () => {
    expect(validateName("1app")).not.toBe(true);
    expect(validateName("123")).not.toBe(true);
  });

  it("rejects names starting with special characters", () => {
    expect(validateName("-app")).not.toBe(true);
    expect(validateName("_app")).not.toBe(true);
    expect(validateName(".app")).not.toBe(true);
    expect(validateName("@app")).not.toBe(true);
  });

  it("rejects names with invalid characters", () => {
    expect(validateName("my app")).not.toBe(true);
    expect(validateName("my.app")).not.toBe(true);
    expect(validateName("my@app")).not.toBe(true);
    expect(validateName("my/app")).not.toBe(true);
  });

  it("rejects empty string", () => {
    expect(validateName("")).not.toBe(true);
  });
});

describe("validatePort", () => {
  it("accepts valid ports", () => {
    expect(validatePort("1024")).toBe(true);
    expect(validatePort("3000")).toBe(true);
    expect(validatePort("5000")).toBe(true);
    expect(validatePort("5001")).toBe(true);
    expect(validatePort("8080")).toBe(true);
    expect(validatePort("65535")).toBe(true);
  });

  it("rejects ports below 1024", () => {
    expect(validatePort("0")).not.toBe(true);
    expect(validatePort("80")).not.toBe(true);
    expect(validatePort("443")).not.toBe(true);
    expect(validatePort("1023")).not.toBe(true);
  });

  it("rejects ports above 65535", () => {
    expect(validatePort("65536")).not.toBe(true);
    expect(validatePort("70000")).not.toBe(true);
  });

  it("rejects non-numeric values", () => {
    expect(validatePort("abc")).not.toBe(true);
    expect(validatePort("")).not.toBe(true);
    expect(validatePort("3.14")).not.toBe(true);
  });
});

describe("validateExposePath", () => {
  it("accepts paths starting with ./", () => {
    expect(validateExposePath("./components")).toBe(true);
    expect(validateExposePath("./hooks")).toBe(true);
    expect(validateExposePath("./utils/helpers")).toBe(true);
    expect(validateExposePath("./")).toBe(true);
  });

  it("rejects paths not starting with ./", () => {
    expect(validateExposePath("components")).not.toBe(true);
    expect(validateExposePath("/components")).not.toBe(true);
    expect(validateExposePath("../components")).not.toBe(true);
  });
});

describe("validateRemoteUrl", () => {
  it("accepts valid http URLs", () => {
    expect(validateRemoteUrl("http://localhost:5001/remoteEntry.js")).toBe(true);
    expect(validateRemoteUrl("https://cdn.example.com/remoteEntry.js")).toBe(true);
    expect(validateRemoteUrl("http://192.168.1.1:3000/remoteEntry.js")).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(validateRemoteUrl("ftp://example.com/entry.js")).not.toBe(true);
    expect(validateRemoteUrl("file:///path/to/entry.js")).not.toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(validateRemoteUrl("not-a-url")).not.toBe(true);
    expect(validateRemoteUrl("")).not.toBe(true);
    expect(validateRemoteUrl("localhost:5001")).not.toBe(true);
  });
});

describe("validateLocalFilePath", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("accepts an existing file", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "val-"));
    fs.writeFileSync(path.join(tmpDir, "index.ts"), "export {}");
    expect(validateLocalFilePath("./index.ts", tmpDir)).toBe(true);
  });

  it("rejects a missing file", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "val-"));
    const result = validateLocalFilePath("./nonexistent.ts", tmpDir);
    expect(result).not.toBe(true);
    expect(result).toContain("File not found");
  });
});
