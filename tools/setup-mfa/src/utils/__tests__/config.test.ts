import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig, validateConfig } from "../config.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mfx-config-test-"));
  // Create a minimal package.json so loadConfig doesn't skip the dir
  fs.writeFileSync(path.join(tmpDir, "package.json"), JSON.stringify({ name: "test" }));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("loads mfa.config.json", () => {
    const cfg = { role: "remote", name: "myApp", port: "5001" };
    fs.writeFileSync(path.join(tmpDir, "mfa.config.json"), JSON.stringify(cfg));

    const result = loadConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.config.role).toBe("remote");
    expect(result!.config.name).toBe("myApp");
    expect(result!.config.port).toBe("5001");
  });

  it("loads .mfarc.json as fallback", () => {
    const cfg = { role: "host", name: "shell" };
    fs.writeFileSync(path.join(tmpDir, ".mfarc.json"), JSON.stringify(cfg));

    const result = loadConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.config.role).toBe("host");
  });

  it("prefers mfa.config.json over .mfarc.json", () => {
    fs.writeFileSync(path.join(tmpDir, "mfa.config.json"), JSON.stringify({ name: "primary" }));
    fs.writeFileSync(path.join(tmpDir, ".mfarc.json"), JSON.stringify({ name: "fallback" }));

    const result = loadConfig(tmpDir);
    expect(result!.config.name).toBe("primary");
  });

  it("loads from package.json mfx key", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test",
        mfx: { role: "remote", name: "fromPkg" },
      }),
    );

    const result = loadConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result!.config.name).toBe("fromPkg");
  });

  it("returns null when no config found", () => {
    const result = loadConfig(tmpDir);
    expect(result).toBeNull();
  });

  it("normalises numeric port to string", () => {
    fs.writeFileSync(path.join(tmpDir, "mfa.config.json"), JSON.stringify({ port: 5001 }));

    const result = loadConfig(tmpDir);
    expect(result!.config.port).toBe("5001");
  });

  it("normalises numeric port from package.json", () => {
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test",
        mfx: { port: 3000 },
      }),
    );

    const result = loadConfig(tmpDir);
    expect(result!.config.port).toBe("3000");
  });

  it("loads explicit config path", () => {
    const customPath = path.join(tmpDir, "custom.json");
    fs.writeFileSync(customPath, JSON.stringify({ name: "custom" }));

    const result = loadConfig(tmpDir, customPath);
    expect(result!.config.name).toBe("custom");
  });

  it("throws for non-existent explicit config path", () => {
    expect(() => {
      loadConfig(tmpDir, path.join(tmpDir, "nope.json"));
    }).toThrow(/Config file not found/);
  });

  it("throws for malformed JSON", () => {
    fs.writeFileSync(path.join(tmpDir, "mfa.config.json"), "not json {{{");

    expect(() => loadConfig(tmpDir)).toThrow(/Failed to parse/);
  });
});

describe("validateConfig", () => {
  it("accepts a valid config", () => {
    expect(() =>
      validateConfig({ role: "remote", name: "myApp", port: "5001" }, "test.json"),
    ).not.toThrow();
  });

  it("rejects invalid role", () => {
    expect(() => validateConfig({ role: "worker" as any }, "test.json")).toThrow(/Invalid "role"/);
  });

  it("rejects invalid port", () => {
    expect(() => validateConfig({ port: "abc" }, "test.json")).toThrow(/Invalid "port"/);

    expect(() => validateConfig({ port: "80" }, "test.json")).toThrow(/Invalid "port"/);
  });

  it("rejects invalid name", () => {
    expect(() => validateConfig({ name: "123bad" }, "test.json")).toThrow(/Invalid "name"/);
  });

  it("rejects non-object exposes", () => {
    expect(() => validateConfig({ exposes: "bad" as any }, "test.json")).toThrow(
      /Invalid "exposes"/,
    );
  });

  it("rejects non-object remotes", () => {
    expect(() => validateConfig({ remotes: "bad" as any }, "test.json")).toThrow(
      /Invalid "remotes"/,
    );
  });

  it("accepts empty config", () => {
    expect(() => validateConfig({}, "test.json")).not.toThrow();
  });
});
