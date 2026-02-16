/** Dialog, file browser, component picker, help panel, and mode toggle styles. */
export function getDialogStyles(): string {
  return `
    /* ── Dialog overrides ──────────────────────── */
    dialog { max-width: 560px; }
    dialog.wide { max-width: 620px; }
    dialog > header { display: flex; align-items: center; gap: 10px; }
    dialog > header h3 { flex: 1; margin: 0; }
    dialog > footer { display: flex; align-items: center; gap: 10px; }
    dialog > footer .selected-path {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--muted-foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── File browser (inside dialog) ──────────── */
    .browser-path-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      background: var(--background);
    }
    .browser-path-bar input {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 12px;
    }
    .browser-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
      min-height: 200px;
      max-height: 400px;
    }
    .browser-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 20px;
      cursor: pointer;
      transition: background var(--transition);
      font-size: 14px;
      border: none;
      background: none;
      color: var(--foreground);
      width: 100%;
      text-align: left;
      outline: none;
    }
    .browser-item:hover, .browser-item:focus-visible {
      background: var(--accent);
    }
    .browser-item.has-pkg { color: var(--primary); }
    .browser-item .item-icon {
      width: 20px; height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .browser-item .item-name { flex: 1; }
    .browser-item .item-badge {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      color: #a5b4fc;
      font-weight: 500;
    }
    .browser-item.parent-item {
      color: var(--muted-foreground);
      font-weight: 500;
      border-bottom: 1px solid var(--border);
    }
    .browser-empty, .browser-loading {
      text-align: center;
      padding: 40px 20px;
      color: var(--muted-foreground);
      font-size: 13px;
    }

    /* ── Component picker (inside dialog) ──────── */
    .picker-search {
      padding: 12px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 8px;
      align-items: center;
      background: var(--background);
    }
    .picker-search svg { flex-shrink: 0; color: var(--muted-foreground); }
    .picker-search input {
      flex: 1;
      background: none;
      border: none;
      color: var(--foreground);
      font-size: 14px;
      outline: none;
      margin: 0;
      padding: 0;
    }
    .picker-list {
      flex: 1;
      overflow-y: auto;
      min-height: 200px;
      max-height: 400px;
    }
    .picker-group-label {
      padding: 10px 20px 4px;
      font-size: var(--text-8);
      font-weight: var(--font-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted-foreground);
      position: sticky;
      top: 0;
      background: var(--card);
      z-index: 1;
    }
    .picker-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 20px;
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      color: var(--foreground);
      font-size: 13px;
      cursor: pointer;
      transition: background var(--transition);
      outline: none;
    }
    .picker-item:hover, .picker-item:focus-visible { background: var(--accent); }
    .picker-item[aria-selected="true"] {
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }
    .picker-item[aria-selected="true"] .picker-check { opacity: 1; }
    .picker-check {
      width: 18px; height: 18px;
      border-radius: var(--radius-small);
      border: 1.5px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: 0.5;
      transition: all var(--transition);
    }
    .picker-item[aria-selected="true"] .picker-check {
      background: var(--primary);
      border-color: var(--primary);
      opacity: 1;
    }
    .picker-info { flex: 1; min-width: 0; }
    .picker-file {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--secondary-foreground);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .picker-exports {
      font-size: var(--text-8);
      color: var(--muted-foreground);
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .picker-kind {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: var(--radius-full);
      font-weight: 500;
      flex-shrink: 0;
    }
    .picker-kind[data-kind="component"] { background: rgba(139,92,246,0.15); color: #c4b5fd; }
    .picker-kind[data-kind="hook"]      { background: rgba(6,182,212,0.15); color: #67e8f9; }
    .picker-kind[data-kind="util"]      { background: rgba(245,158,11,0.15); color: #fcd34d; }
    .picker-kind[data-kind="page"]      { background: rgba(239,68,68,0.15); color: #fca5a5; }
    .picker-kind[data-kind="index"]     { background: rgba(34,197,94,0.15); color: #86efac; }
    .picker-kind[data-kind="other"]     { background: rgba(100,116,139,0.15); color: #94a3b8; }
    .picker-footer-count {
      font-size: 13px;
      color: var(--muted-foreground);
      flex: 1;
    }

    /* ── Help button ───────────────────────────── */
    .help-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-full);
      background: var(--primary);
      color: var(--primary-foreground);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px color-mix(in srgb, var(--primary) 40%, transparent);
      transition: all var(--transition);
      z-index: 1500;
      font-size: 18px;
      font-weight: 700;
    }
    .help-btn:hover { transform: scale(1.1); }

    /* ── Help panel ────────────────────────────── */
    .help-panel {
      position: fixed;
      top: 0;
      right: -480px;
      width: 460px;
      max-width: 90vw;
      height: 100vh;
      background: var(--card);
      border-left: 1px solid var(--border);
      box-shadow: -8px 0 32px rgba(0,0,0,0.3);
      z-index: 2500;
      display: flex;
      flex-direction: column;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }
    .help-panel.open { right: 0; }
    .help-panel-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .help-panel-header h3 { flex: 1; font-size: 16px; font-weight: 600; margin: 0; }
    .help-panel-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px 40px;
    }
    .help-section { margin-bottom: 28px; }
    .help-section h4 {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--primary);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .help-section h4 svg { flex-shrink: 0; }
    .help-section p {
      font-size: 13px;
      color: var(--secondary-foreground);
      line-height: 1.7;
      margin-bottom: 8px;
    }
    .help-term {
      display: flex;
      gap: 12px;
      padding: 10px 14px;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: var(--radius-medium);
      margin-bottom: 8px;
    }
    .help-term-icon {
      flex-shrink: 0;
      width: 32px; height: 32px;
      border-radius: var(--radius-medium);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .help-term-text { flex: 1; }
    .help-term-text strong { display: block; font-size: 13px; font-weight: 600; margin-bottom: 2px; }
    .help-term-text span { font-size: 12px; color: var(--muted-foreground); line-height: 1.5; }
    .help-shortcut {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
    }
    .help-shortcut:last-child { border-bottom: none; }
    .help-shortcut .key {
      font-family: var(--font-mono);
      font-size: var(--text-8);
      background: var(--background);
      border: 1px solid var(--border);
      padding: 2px 8px;
      border-radius: var(--radius-small);
      color: var(--muted-foreground);
    }
    .help-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 2400;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }
    .help-backdrop.open { opacity: 1; pointer-events: auto; }

    /* ── Mode toggle (Oat tabs override) ───────── */
    .mfx-mode-tabs [role="tablist"] {
      max-width: 380px;
      margin: 0 auto 28px;
      width: 100%;
      display: flex;
    }
    .mfx-mode-tabs [role="tab"] {
      flex: 1;
      gap: 8px;
    }

`;
}
