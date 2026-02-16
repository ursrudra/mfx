import pc from "picocolors";

// ─── Log Level ──────────────────────────────────────────────────────────────

export type LogLevel = "quiet" | "normal" | "verbose";

let currentLevel: LogLevel = "normal";

/** Set the global log level. */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/** Get the current log level. */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

const LINE = "\u2500".repeat(60);

/** Print a branded intro box — the first thing the user sees. */
export function intro(version: string): void {
  const border = pc.dim;
  console.log();
  console.log(
    border(
      "  \u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E",
    ),
  );
  console.log(
    `${border("  \u2502")}  ${pc.bold(pc.cyan("mfx"))}  ${pc.dim(`v${version}`)}                        ${border("\u2502")}`,
  );
  console.log(
    `${border("  \u2502")}  ${pc.dim("Configure Module Federation")}             ${border("\u2502")}`,
  );
  console.log(
    `${border("  \u2502")}  ${pc.dim("for Vite + React + TypeScript")}           ${border("\u2502")}`,
  );
  console.log(
    border(
      "  \u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F",
    ),
  );
  console.log();
}

/** Print a section heading. */
export function step(num: number, text: string): void {
  console.log(`\n  ${pc.bold(pc.cyan(`Step ${num}`))} ${pc.bold(text)}`);
  console.log(pc.dim(`  ${LINE.slice(0, 50)}`));
}

/** Print a section banner with a horizontal rule. */
export function banner(text: string): void {
  console.log(`\n${pc.dim(LINE)}`);
  console.log(`  ${pc.bold(pc.cyan(text))}`);
  console.log(pc.dim(LINE));
}

/** Print a success message with a green checkmark. */
export function success(text: string): void {
  console.log(`  ${pc.green("\u2714")} ${text}`);
}

/** Print a warning message with a yellow icon. */
export function warn(text: string): void {
  console.log(`  ${pc.yellow("\u26A0")} ${pc.yellow(text)}`);
}

/** Print an informational message with a blue icon. */
export function info(text: string): void {
  console.log(`  ${pc.blue("\u2139")} ${text}`);
}

/** Print an error message with a red cross. */
export function error(text: string): void {
  console.log(`  ${pc.red("\u2718")} ${pc.red(text)}`);
}

/** Print a key: value detection label. */
export function label(key: string, value: string): void {
  console.log(`  ${pc.dim(key.padEnd(18, " "))} ${value}`);
}

/** Print a blank line. */
export function newline(): void {
  console.log();
}

/** Print a dimmed hint below a prompt. Suppressed in quiet mode. */
export function hint(text: string): void {
  if (currentLevel === "quiet") return;
  console.log(`  ${pc.dim(text)}`);
}

/** Print a verbose message — only shown with --verbose. */
export function verbose(text: string): void {
  if (currentLevel !== "verbose") return;
  console.log(`  ${pc.dim(`[verbose]`)} ${pc.dim(text)}`);
}

/** Print the next-steps box at the end. */
export function outro(lines: string[]): void {
  console.log();
  console.log(
    pc.dim(
      "  \u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E",
    ),
  );
  console.log(
    `${pc.dim("  \u2502")}  ${pc.bold(pc.green("Next steps"))}                                     ${pc.dim("\u2502")}`,
  );
  console.log(
    `${pc.dim("  \u2502")}                                                ${pc.dim("\u2502")}`,
  );
  for (const line of lines) {
    const padded = line.padEnd(46, " ");
    console.log(`${pc.dim("  \u2502")}  ${padded}${pc.dim("\u2502")}`);
  }
  console.log(
    `${pc.dim("  \u2502")}                                                ${pc.dim("\u2502")}`,
  );
  console.log(
    pc.dim(
      "  \u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F",
    ),
  );
  console.log();
}
