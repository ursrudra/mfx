/** Workspace mode CSS: select bar, app cards, role accents, exposes/remotes, review, footer. */
export function getWorkspaceStyles(): string {
  return `
    /* ── Workspace: select bar ─────────────────── */
    .ws-select-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: var(--radius-medium);
      margin-bottom: 14px;
    }
    .ws-select-all {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 13px;
      color: var(--secondary-foreground);
      font-weight: 500;
    }
    .ws-selected-count {
      font-size: 12px;
      color: var(--muted-foreground);
      font-family: var(--font-mono);
    }

    /* ── Workspace: app cards ──────────────────── */
    .ws-app-cards {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }
    .ws-app-card {
      background: var(--background);
      border: 1.5px solid var(--border);
      border-radius: var(--radius-medium);
      padding: 16px;
      transition: all var(--transition);
      animation: fadeIn 0.2s ease;
    }
    .ws-app-card:hover { border-color: var(--input); }
    .ws-app-card.selected { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 4%, transparent); }
    .ws-app-card.disabled { opacity: 0.45; pointer-events: none; }

    /* ── Role-based card accents ──────── */
    .ws-app-card.ws-role-host {
      border-left: 3px solid var(--warning);
    }
    .ws-app-card.ws-role-host.selected {
      border-color: var(--warning);
      background: color-mix(in srgb, var(--warning) 4%, transparent);
    }
    .ws-app-card.ws-role-remote {
      border-left: 3px solid var(--ws-remote-accent);
    }
    .ws-app-card.ws-role-remote.selected {
      border-color: var(--ws-remote-accent);
      background: color-mix(in srgb, var(--ws-remote-accent) 4%, transparent);
    }
    /* ── Card header (clickable, two-line layout) ── */
    .ws-app-card-header {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      padding: 2px;
      margin: -2px;
      border-radius: var(--radius-small);
      transition: background var(--transition);
    }
    .ws-app-card-header:hover {
      background: color-mix(in srgb, var(--foreground) 3%, transparent);
    }
    .ws-app-card-header input[type="checkbox"] {
      margin-top: 3px;
      flex-shrink: 0;
    }
    .ws-app-card-title { flex: 1; min-width: 0; }
    .ws-app-card-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .ws-app-card-name { font-size: 14px; font-weight: 600; }
    .ws-role-pill {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.8px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }
    .ws-role-pill-host {
      background: color-mix(in srgb, var(--warning) 15%, transparent);
      color: var(--warning);
      border: 1px solid color-mix(in srgb, var(--warning) 30%, transparent);
    }
    .ws-role-pill-remote {
      background: color-mix(in srgb, var(--ws-remote-accent) 12%, transparent);
      color: var(--ws-remote-accent);
      border: 1px solid color-mix(in srgb, var(--ws-remote-accent) 25%, transparent);
    }
    .ws-app-card-dir {
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--muted-foreground);
      margin-top: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ws-app-card-badges { display: flex; gap: 6px; flex-wrap: wrap; }

    /* ── Collapse / expand ──────────────── */
    .ws-app-card-collapse {
      overflow: hidden;
      max-height: 2000px;
      opacity: 1;
      margin-top: 14px;
      transition: max-height 0.35s ease, opacity 0.2s ease, margin 0.25s ease;
    }
    .ws-app-card.collapsed .ws-app-card-collapse {
      max-height: 0;
      opacity: 0;
      margin-top: 0;
    }
    .ws-app-card.collapsed { opacity: 0.6; }
    .ws-app-card.collapsed:hover { opacity: 1; }
    .ws-card-chevron {
      flex-shrink: 0;
      margin-top: 4px;
      color: var(--muted-foreground);
      transition: transform 0.25s ease;
    }
    .ws-app-card.collapsed .ws-card-chevron {
      transform: rotate(-90deg);
    }

    /* ── Card validation indicator ──────── */
    .ws-card-error-dot {
      width: 18px; height: 18px;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--danger) 15%, transparent);
      color: var(--danger);
      font-size: 11px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      animation: fadeIn 0.15s ease;
      border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent);
    }

    /* ── Required field indicator ───────── */
    .ws-required { color: var(--danger); font-weight: 600; }

    /* ── Role field (prominent, full width) */
    .ws-field-role { grid-column: 1 / -1; }
    .ws-field-role select {
      border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
      font-weight: 500;
    }
    .ws-field-role select:focus {
      border-color: var(--primary);
    }

    /* ── Empty state for no apps ──────── */
    .ws-empty-state {
      text-align: center;
      padding: 48px 24px;
      border: 1.5px dashed var(--border);
      border-radius: var(--radius-medium);
      margin-bottom: 16px;
    }
    .ws-empty-state-icon {
      width: 56px; height: 56px;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .ws-empty-state h3 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--foreground);
    }
    .ws-empty-state p {
      font-size: 13px;
      color: var(--muted-foreground);
      line-height: 1.6;
      max-width: 360px;
      margin: 0 auto;
    }

    /* ── Card body ─────────────────────── */
    .ws-app-card-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .ws-app-card-body .ws-field { display: flex; flex-direction: column; gap: 4px; }
    .ws-app-card-body .ws-field-label {
      font-size: var(--text-8);
      font-weight: var(--font-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted-foreground);
    }
    .ws-app-card-body input,
    .ws-app-card-body select {
      padding: 7px 10px;
      font-size: 13px;
      height: 34px;
    }
    .ws-app-card-body .ws-field-full { grid-column: 1 / -1; }
    .ws-app-card-body input.ws-input-error,
    .ws-app-card-body select.ws-input-error {
      border-color: var(--danger);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--danger) 15%, transparent);
    }

    /* ── Workspace: expose/remote sections ──────── */
    .ws-role-section {
      margin: 6px 0 0;
      padding: 12px;
      background: color-mix(in srgb, var(--border) 30%, transparent);
      border-radius: var(--radius-medium);
      border: 1px solid var(--border);
    }
    .ws-role-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .ws-role-section-header .ws-field-label {
      font-size: var(--text-8);
      font-weight: var(--font-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted-foreground);
    }
    .ws-add-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 500;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
      border-radius: var(--radius-medium);
      cursor: pointer;
      transition: all 0.15s;
    }
    .ws-add-btn:hover {
      background: color-mix(in srgb, var(--primary) 20%, transparent);
      border-color: var(--primary);
    }
    .ws-entry-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .ws-entry-key {
      flex: 0 0 35%;
      width: auto;
      margin: 0;
      padding: 6px 8px;
      font-size: 12px;
      font-family: var(--font-mono);
      height: 32px;
    }
    .ws-entry-val {
      flex: 1;
      width: auto;
      margin: 0;
      padding: 6px 8px;
      font-size: 12px;
      font-family: var(--font-mono);
      height: 32px;
    }
    .ws-entry-url { font-size: var(--text-8); }
    .ws-entry-arrow {
      color: var(--muted-foreground);
      font-size: 13px;
      flex-shrink: 0;
    }
    .ws-remove-btn {
      flex-shrink: 0;
      width: 28px; height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-medium);
      border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
      background: color-mix(in srgb, var(--foreground) 4%, transparent);
      color: var(--muted-foreground);
      cursor: pointer;
      transition: all 0.18s ease;
    }
    .ws-remove-btn:hover {
      background: color-mix(in srgb, var(--danger) 18%, transparent);
      border-color: color-mix(in srgb, var(--danger) 40%, transparent);
      color: var(--danger);
      transform: scale(1.08);
    }
    .ws-remove-btn:active {
      transform: scale(0.95);
    }

    /* ── Inline empty state for expose/remote sections ── */
    .ws-empty-hint {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border: 1.5px dashed color-mix(in srgb, var(--border) 80%, transparent);
      border-radius: var(--radius-medium);
      background: color-mix(in srgb, var(--foreground) 2%, transparent);
      margin-top: 6px;
    }
    .ws-empty-hint-icon {
      width: 32px; height: 32px;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--primary) 8%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ws-empty-hint-text {
      font-size: 12px;
      color: var(--muted-foreground);
      line-height: 1.5;
    }
    .ws-empty-hint-text strong {
      color: var(--foreground);
      font-weight: 600;
    }
    .ws-auto-link-section { margin-top: 6px; }
    .ws-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 500;
      color: var(--success);
      background: color-mix(in srgb, var(--success) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--success) 25%, transparent);
      border-radius: var(--radius-medium);
      cursor: pointer;
      transition: all 0.15s;
    }
    .ws-link-btn:hover {
      background: color-mix(in srgb, var(--success) 18%, transparent);
      border-color: color-mix(in srgb, var(--success) 50%, transparent);
    }
    .ws-review-modules {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ws-review-module-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: color-mix(in srgb, var(--foreground) 3%, transparent);
      border-radius: var(--radius-small);
      border: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
      font-size: 11px;
      font-family: var(--font-mono);
      overflow: hidden;
    }
    .ws-review-module-key {
      color: var(--primary);
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    .ws-review-module-arrow {
      color: var(--muted-foreground);
      flex-shrink: 0;
      font-size: 10px;
    }
    .ws-review-module-val {
      color: var(--muted-foreground);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .ws-review-module-count {
      font-size: 10px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: var(--radius-full);
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .ws-review-count-expose {
      background: color-mix(in srgb, var(--ws-remote-accent) 12%, transparent);
      color: var(--ws-remote-accent);
      border: 1px solid color-mix(in srgb, var(--ws-remote-accent) 25%, transparent);
    }
    .ws-review-count-remote {
      background: color-mix(in srgb, var(--warning) 12%, transparent);
      color: var(--warning);
      border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
    }

    /* ── Delete confirmation overlay ── */
    .ws-confirm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.12s ease;
    }
    .ws-confirm-box {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: var(--radius-large);
      padding: 24px;
      max-width: 380px;
      width: 90%;
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      animation: slideIn 0.15s ease;
    }
    .ws-confirm-box h4 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--foreground);
    }
    .ws-confirm-box p {
      font-size: 13px;
      color: var(--muted-foreground);
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .ws-confirm-box code {
      background: color-mix(in srgb, var(--foreground) 6%, transparent);
      padding: 2px 6px;
      border-radius: var(--radius-small);
      font-size: 12px;
    }
    .ws-confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .ws-confirm-actions button {
      padding: 7px 16px;
      font-size: 13px;
      border-radius: var(--radius-medium);
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s;
    }
    .ws-confirm-cancel {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--foreground);
    }
    .ws-confirm-cancel:hover {
      background: color-mix(in srgb, var(--foreground) 5%, transparent);
    }
    .ws-confirm-delete {
      background: var(--danger);
      border: 1px solid var(--danger);
      color: white;
    }
    .ws-confirm-delete:hover {
      opacity: 0.9;
    }
    @keyframes slideIn {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* ── Workspace: results ─────────────────────── */
    .ws-results {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
      text-align: left;
    }
    .ws-result-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: var(--radius-medium);
      font-size: 13px;
    }
    .ws-result-item.success { border-color: color-mix(in srgb, var(--success) 30%, transparent); }
    .ws-result-item.failed  { border-color: color-mix(in srgb, var(--danger) 30%, transparent); }
    .ws-result-icon {
      width: 24px; height: 24px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .ws-result-item.success .ws-result-icon { background: color-mix(in srgb, var(--success) 12%, transparent); color: var(--success); }
    .ws-result-item.failed .ws-result-icon  { background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); }
    .ws-result-name { font-weight: 500; flex: 1; }
    .ws-result-error { font-size: 12px; color: var(--danger); }

    /* ── Workspace: status badges ───────────────── */
    .ws-app-card-status {
      font-size: 12px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }
    .ws-status-pending  { background: rgba(100,116,139,0.15); color: #94a3b8; }
    .ws-status-running  { background: color-mix(in srgb, var(--primary) 15%, transparent); color: #a5b4fc; }
    .ws-status-done     { background: color-mix(in srgb, var(--success) 12%, transparent); color: #86efac; }
    .ws-status-failed   { background: color-mix(in srgb, var(--danger) 12%, transparent); color: #fca5a5; }

    /* ── Footer ────────────────────────────────── */
    .mfx-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      color: var(--muted-foreground);
      font-size: 12px;
    }
`;
}
