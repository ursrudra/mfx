import type { RemoteEntry } from "../types.js";
import { escapeJsString } from "./generate.js";

// ─── String/comment-aware scanner ──────────────────────────────────────────

/**
 * Scan forward from `start`, skipping over string literals (single, double,
 * backtick) and comments (line and block). Returns the character index
 * after skipping, or the same index if not inside a string/comment.
 *
 * This prevents brace-counting from being fooled by:
 *   - `name: "my{app}"`
 *   - `entry: \`http://$\{host\}\``
 *   - `// TODO: add { more }`
 *   - `/* { comment } *​/`
 */
function skipNonCode(content: string, i: number): number {
  const ch = content[i];

  // Line comment: // …
  if (ch === "/" && content[i + 1] === "/") {
    const nl = content.indexOf("\n", i + 2);
    return nl === -1 ? content.length : nl + 1;
  }

  // Block comment: /* … */
  if (ch === "/" && content[i + 1] === "*") {
    const end = content.indexOf("*/", i + 2);
    return end === -1 ? content.length : end + 2;
  }

  // Double-quoted string
  if (ch === '"') {
    let j = i + 1;
    while (j < content.length) {
      if (content[j] === "\\") {
        j += 2;
        continue;
      }
      if (content[j] === '"') return j + 1;
      j++;
    }
    return content.length;
  }

  // Single-quoted string
  if (ch === "'") {
    let j = i + 1;
    while (j < content.length) {
      if (content[j] === "\\") {
        j += 2;
        continue;
      }
      if (content[j] === "'") return j + 1;
      j++;
    }
    return content.length;
  }

  // Template literal (backtick) — we skip the entire template,
  // including nested ${} expressions (with recursive depth tracking).
  if (ch === "`") {
    let j = i + 1;
    while (j < content.length) {
      if (content[j] === "\\") {
        j += 2;
        continue;
      }
      if (content[j] === "`") return j + 1;
      if (content[j] === "$" && content[j + 1] === "{") {
        // Skip the expression inside ${...}
        j += 2;
        let depth = 1;
        while (j < content.length && depth > 0) {
          if (content[j] === "{") depth++;
          else if (content[j] === "}") depth--;
          if (depth > 0) j++;
        }
        if (j < content.length) j++; // skip closing }
        continue;
      }
      j++;
    }
    return content.length;
  }

  // Not a string/comment — return same index
  return i;
}

// ─── Brace-matched block extraction ────────────────────────────────────────

interface Block {
  /** Character offset of the key start (e.g. the "e" in "exposes") */
  keyStart: number;
  /** Character offset one past the closing "}" */
  end: number;
  /** Raw text of the { … } block (including braces) */
  raw: string;
}

/**
 * Find a top-level key inside `federation({ … })` and return its { … } block.
 * Uses string/comment-aware brace-counting for resilience against
 * braces appearing in strings, template literals, or comments.
 */
function extractBlock(content: string, key: string): Block | null {
  // Match "key:" or "key :" with optional whitespace
  const regex = new RegExp(`(${key})\\s*:\\s*\\{`, "g");
  let match: RegExpExecArray | null;

  // Loop through all regex matches — skip those inside comments/strings
  while ((match = regex.exec(content)) !== null) {
    if (isInsideNonCode(content, match.index)) {
      continue; // this match is in a comment or string, skip it
    }

    const keyStart = match.index;
    const braceOpen = match.index + match[0].length - 1; // position of "{"
    let depth = 1;
    let i = braceOpen + 1;

    while (i < content.length && depth > 0) {
      // Try to skip strings/comments
      const skipped = skipNonCode(content, i);
      if (skipped !== i) {
        i = skipped;
        continue;
      }

      if (content[i] === "{") depth++;
      if (content[i] === "}") depth--;
      if (depth > 0) i++;
      else i++; // advance past closing brace
    }

    return {
      keyStart,
      end: i,
      raw: content.slice(braceOpen, i),
    };
  }

  return null;
}

/**
 * Check if a character position is inside a comment or string literal.
 * Scans from the start of the content up to `pos` using skipNonCode.
 */
function isInsideNonCode(content: string, pos: number): boolean {
  let i = 0;
  while (i < pos) {
    const skipped = skipNonCode(content, i);
    if (skipped !== i) {
      // We're entering a non-code region (string/comment)
      if (pos >= i && pos < skipped) {
        return true; // pos falls inside this non-code region
      }
      i = skipped;
      continue;
    }
    i++;
  }
  return false;
}

// ─── Parse exposes ─────────────────────────────────────────────────────────

/**
 * Extract the `exposes: { … }` map from a vite.config file's content.
 *
 * Supports both single and double-quoted keys/values:
 *   `"./components": "./src/…"` and `'./components': './src/…'`
 *
 * Returns `{ "./components": "./src/components/index.ts", … }`
 */
export function parseExposes(content: string): Record<string, string> {
  const block = extractBlock(content, "exposes");
  if (!block) return {};

  const result: Record<string, string> = {};
  // Match both single- and double-quoted key: value pairs
  const regex = /(?:"([^"]+)"|'([^']+)')\s*:\s*(?:"([^"]+)"|'([^']+)')/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(block.raw)) !== null) {
    const key = m[1] ?? m[2];
    const val = m[3] ?? m[4];
    result[key] = val;
  }
  return result;
}

// ─── Parse remotes ─────────────────────────────────────────────────────────

/**
 * Extract the `remotes: { … }` map from a vite.config file's content.
 *
 * Supports both quoted and unquoted keys, single and double quotes for values.
 *
 * Returns `{ remote: { name: "remote", entry: "http://…" }, … }`
 */
export function parseRemotes(content: string): Record<string, RemoteEntry> {
  const block = extractBlock(content, "remotes");
  if (!block) return {};

  const result: Record<string, RemoteEntry> = {};

  // Match each remote block: `remoteName: { … name: "…", … entry: "…" … }`
  // The key can be an identifier (no quotes) or a quoted string.
  const remoteRegex = /(?:["']([^"']+)["']|([a-zA-Z_$][\w$]*))\s*:\s*\{/g;

  let m: RegExpExecArray | null;
  while ((m = remoteRegex.exec(block.raw)) !== null) {
    const remoteName = m[1] ?? m[2];

    // Skip known non-remote keys that appear inside the remotes block
    // (these are properties of individual remote entries, not remote names)
    if (["type", "name", "entry", "entryGlobalName", "shareScope"].includes(remoteName)) {
      continue;
    }

    // Find the matching closing brace for this remote's block
    const innerStart = m.index + m[0].length - 1;
    let depth = 1;
    let j = innerStart + 1;
    while (j < block.raw.length && depth > 0) {
      const skipped = skipNonCode(block.raw, j);
      if (skipped !== j) {
        j = skipped;
        continue;
      }
      if (block.raw[j] === "{") depth++;
      if (block.raw[j] === "}") depth--;
      if (depth > 0) j++;
      else j++;
    }
    const innerBlock = block.raw.slice(innerStart, j);

    // Extract name and entry from the inner block (single or double quotes)
    const nameMatch = /name\s*:\s*(?:"([^"]+)"|'([^']+)')/.exec(innerBlock);
    const entryMatch = /entry\s*:\s*(?:"([^"]+)"|'([^']+)')/.exec(innerBlock);

    if (nameMatch && entryMatch) {
      result[remoteName] = {
        name: nameMatch[1] ?? nameMatch[2],
        entry: entryMatch[1] ?? entryMatch[2],
      };
    }
  }

  return result;
}

// ─── Detect role from config content ───────────────────────────────────────

/**
 * Determine whether this config is for a "remote" or "host" app.
 * Uses string/comment-aware matching to avoid false positives from
 * patterns inside strings or comments.
 */
export function detectRole(content: string): "remote" | "host" | null {
  // Use extractBlock which is already string/comment-aware
  if (extractBlock(content, "exposes")) return "remote";
  if (extractBlock(content, "remotes")) return "host";
  return null;
}

// ─── Find the federation() call ────────────────────────────────────────────

interface FederationBlock {
  /** Start of `federation(` in the source */
  start: number;
  /** End of the closing `)` */
  end: number;
  /** The full text `federation({ … })` */
  raw: string;
  /** The inner config object `{ … }` text */
  inner: string;
}

/**
 * Find the `federation({ … })` call in a vite config.
 * Skips matches inside strings or comments.
 */
export function findFederationCall(content: string): FederationBlock | null {
  const regex = /federation\s*\(\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (isInsideNonCode(content, match.index)) continue;
    break;
  }
  if (!match) return null;

  const start = match.index;
  // Find the opening { of the config object
  const braceOpen = match.index + match[0].length - 1;
  let depth = 1;
  let i = braceOpen + 1;

  while (i < content.length && depth > 0) {
    const skipped = skipNonCode(content, i);
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    if (content[i] === "{") depth++;
    if (content[i] === "}") depth--;
    if (depth > 0) i++;
    else i++;
  }

  // Now find the closing ) after the }
  let j = i;
  while (j < content.length && content[j] !== ")") j++;
  if (j < content.length) j++; // include the )

  return {
    start,
    end: j,
    raw: content.slice(start, j),
    inner: content.slice(braceOpen, i),
  };
}

// ─── Find the plugins array ────────────────────────────────────────────────

interface PluginsBlock {
  /** Start of `plugins:` */
  keyStart: number;
  /** End of the closing `]` */
  end: number;
  /** Position right after the opening `[` */
  insertionPoint: number;
  /** The full `[ … ]` text */
  raw: string;
}

/**
 * Find the `plugins: [ … ]` array in a Vite config.
 * Skips matches inside strings or comments.
 */
export function findPluginsArray(content: string): PluginsBlock | null {
  const regex = /plugins\s*:\s*\[/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (isInsideNonCode(content, match.index)) continue;
    break;
  }
  if (!match) return null;

  const keyStart = match.index;
  const bracketOpen = match.index + match[0].length - 1;
  let depth = 1;
  let i = bracketOpen + 1;

  while (i < content.length && depth > 0) {
    const skipped = skipNonCode(content, i);
    if (skipped !== i) {
      i = skipped;
      continue;
    }
    if (content[i] === "[") depth++;
    if (content[i] === "]") depth--;
    if (depth > 0) i++;
    else i++;
  }

  return {
    keyStart,
    end: i,
    insertionPoint: bracketOpen + 1,
    raw: content.slice(bracketOpen, i),
  };
}

// ─── Surgical replacement helpers ──────────────────────────────────────────

/**
 * Replace the `exposes: { … }` block in a vite.config with a new set of entries.
 * Returns the modified file content, or null if no exposes block was found.
 */
export function replaceExposesBlock(
  content: string,
  exposes: Record<string, string>,
): string | null {
  const block = extractBlock(content, "exposes");
  if (!block) return null;

  const entries = Object.entries(exposes)
    .map(([key, val]) => `        "${escapeJsString(key)}": "${escapeJsString(val)}",`)
    .join("\n");

  const newBlock = `exposes: {\n${entries}\n      }`;
  return content.slice(0, block.keyStart) + newBlock + content.slice(block.end);
}

/**
 * Replace the `remotes: { … }` block in a vite.config with a new set of entries.
 * Returns the modified file content, or null if no remotes block was found.
 */
export function replaceRemotesBlock(
  content: string,
  remotes: Record<string, RemoteEntry>,
): string | null {
  const block = extractBlock(content, "remotes");
  if (!block) return null;

  const entries = Object.entries(remotes)
    .map(
      ([key, val]) =>
        `        ${escapeJsString(key)}: {\n          type: "module",\n          name: "${escapeJsString(val.name)}",\n          entry: "${escapeJsString(val.entry)}",\n          entryGlobalName: "${escapeJsString(val.name)}",\n          shareScope: "default",\n        },`,
    )
    .join("\n");

  const newBlock = `remotes: {\n${entries}\n      }`;
  return content.slice(0, block.keyStart) + newBlock + content.slice(block.end);
}
