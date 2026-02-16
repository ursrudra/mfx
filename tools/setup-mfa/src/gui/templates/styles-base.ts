/** Base CSS: theme variable overrides, layout, header, stepper, cards, forms, entries, badges, review, code preview, buttons. */
export function getBaseStyles(): string {
  return `
    /* ══════════════════════════════════════════════
       Theme: Override Oat dark-theme variables
       ══════════════════════════════════════════════ */
    [data-theme="dark"] {
      --background: #0a0e1a;
      --foreground: #e2e8f0;
      --card: #111827;
      --card-foreground: #e2e8f0;
      --primary: #6366f1;
      --primary-foreground: #fff;
      --secondary: #1e293b;
      --secondary-foreground: #cbd5e1;
      --muted: #151c2c;
      --muted-foreground: #64748b;
      --faint: #0d1117;
      --accent: #1a2235;
      --accent-foreground: #e2e8f0;
      --danger: #ef4444;
      --danger-foreground: #fff;
      --success: #22c55e;
      --success-foreground: #fff;
      --warning: #f59e0b;
      --warning-foreground: #0a0e1a;
      --border: #1e293b;
      --input: #1e293b;
      --ring: #6366f1;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
      --font-mono: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
      --icon-accent: #818cf8;
      --icon-success: #22c55e;
      --ws-remote-accent: #38bdf8;
      --ws-host-accent: #f59e0b;
      --header-gradient: linear-gradient(135deg, #818cf8, #a78bfa, #c084fc);
    }

    /* ══════════════════════════════════════════════
       Theme: Light mode overrides
       ══════════════════════════════════════════════ */
    [data-theme="light"] {
      --background: #f8fafc;
      --foreground: #0f172a;
      --card: #ffffff;
      --card-foreground: #0f172a;
      --primary: #4f46e5;
      --primary-foreground: #fff;
      --secondary: #f1f5f9;
      --secondary-foreground: #334155;
      --muted: #f1f5f9;
      --muted-foreground: #64748b;
      --faint: #f8fafc;
      --accent: #e0e7ff;
      --accent-foreground: #1e293b;
      --danger: #dc2626;
      --danger-foreground: #fff;
      --success: #16a34a;
      --success-foreground: #fff;
      --warning: #d97706;
      --warning-foreground: #fff;
      --border: #e2e8f0;
      --input: #e2e8f0;
      --ring: #4f46e5;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
      --font-mono: 'Cascadia Code', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
      --icon-accent: #6366f1;
      --icon-success: #16a34a;
      --ws-remote-accent: #2563eb;
      --ws-host-accent: #d97706;
      --header-gradient: linear-gradient(135deg, #4f46e5, #7c3aed, #9333ea);
    }
    [data-theme="light"] .mfx-header h1 {
      background: var(--header-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    [data-theme="light"] .card {
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    }
    [data-theme="light"] .ws-app-card.ws-role-host.selected {
      background: color-mix(in srgb, var(--warning) 6%, transparent);
    }
    [data-theme="light"] .ws-app-card.ws-role-remote.selected {
      background: color-mix(in srgb, var(--ws-remote-accent) 5%, transparent);
    }
    [data-theme="light"] .ws-role-pill-remote {
      color: var(--ws-remote-accent);
      background: color-mix(in srgb, var(--ws-remote-accent) 10%, transparent);
      border-color: color-mix(in srgb, var(--ws-remote-accent) 25%, transparent);
    }
    [data-theme="light"] .ws-app-card.ws-role-remote {
      border-left-color: var(--ws-remote-accent);
    }
    [data-theme="light"] .ws-confirm-overlay {
      background: rgba(0,0,0,0.3);
    }

    /* ── Theme toggle button (fixed top-right) ── */
    button.theme-toggle {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 100;
      width: 38px;
      height: 38px;
      min-width: 38px;
      min-height: 38px;
      padding: 0;
      margin: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--foreground);
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    button.theme-toggle:hover {
      background: var(--primary);
      border-color: var(--primary);
      color: var(--primary-foreground);
      transform: rotate(20deg);
    }
    button.theme-toggle:active {
      transform: rotate(20deg) scale(0.9);
    }
    button.theme-toggle svg {
      display: block;
      pointer-events: none;
    }

    /* ── Layout ────────────────────────────────── */
    .mfx-container {
      max-width: 740px;
      margin: 0 auto;
      padding: 32px 24px 100px;
    }

    /* ── Header ────────────────────────────────── */
    .mfx-header {
      text-align: center;
      margin-bottom: 36px;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--border);
    }
    .mfx-header-logo {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .mfx-header-logo svg { flex-shrink: 0; }
    .mfx-header h1 {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: var(--header-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
    }
    .mfx-header p {
      color: var(--muted-foreground);
      margin-top: 10px;
      font-size: 14px;
    }

    /* ── Stepper ───────────────────────────────── */
    .stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 32px;
      padding: 0 20px;
    }
    .step-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: default;
      user-select: none;
    }
    .step-circle {
      width: 32px; height: 32px;
      border-radius: var(--radius-full);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      border: 2px solid var(--border);
      color: var(--muted-foreground);
      background: var(--card);
      transition: all var(--transition);
      flex-shrink: 0;
    }
    .step-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--muted-foreground);
      transition: color var(--transition);
      white-space: nowrap;
    }
    .step-line {
      width: 40px;
      height: 2px;
      background: var(--border);
      margin: 0 8px;
      flex-shrink: 0;
      transition: background var(--transition);
    }
    .step-item.active .step-circle {
      border-color: var(--primary);
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .step-item.active .step-label { color: var(--foreground); }
    .step-item.done .step-circle {
      border-color: var(--success);
      background: var(--success);
      color: var(--success-foreground);
    }
    .step-item.done .step-label { color: var(--secondary-foreground); }
    .step-line.done { background: var(--success); }
    .step-line.active { background: var(--primary); }

    /* ── Step panels ───────────────────────────── */
    .step-panel { display: none; }
    .step-panel.active { display: block; }

    /* ── Card enhancements ─────────────────────── */
    .card {
      animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
    }
    .card-icon {
      width: 36px; height: 36px;
      border-radius: var(--radius-medium);
      display: flex;
      align-items: center;
      justify-content: center;
      background: color-mix(in srgb, var(--primary) 15%, transparent);
      flex-shrink: 0;
    }
    .card-icon svg { width: 18px; height: 18px; }
    .card-header-text h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }
    .card-header-text p {
      font-size: 13px;
      color: var(--muted-foreground);
      margin-top: 1px;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Form extras ───────────────────────────── */
    input.input-error { border-color: var(--danger) !important; }
    input.input-error:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger) 20%, transparent) !important; }
    input.input-valid { border-color: var(--success) !important; }
    input.input-valid:focus { box-shadow: 0 0 0 2px color-mix(in srgb, var(--success) 20%, transparent) !important; }
    input.mono { font-family: var(--font-mono); font-size: 13px; }
    .form-error {
      font-size: var(--text-8);
      color: var(--danger);
      margin-top: var(--space-1);
      display: none;
    }
    .form-error.visible { display: block; }
    .form-success {
      font-size: var(--text-8);
      color: var(--success);
      margin-top: var(--space-1);
      display: none;
    }
    .form-success.visible { display: block; }
    .input-row {
      display: flex;
      gap: 10px;
      align-items: flex-start;
    }
    .input-row input { flex: 1; }
    .input-row button { flex-shrink: 0; margin-top: 0; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    /* ── Role selection ────────────────────────── */
    .role-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .role-card {
      background: var(--background);
      border: 2px solid var(--border);
      border-radius: var(--radius-large);
      padding: 22px 18px;
      cursor: pointer;
      transition: all var(--transition);
      text-align: center;
      position: relative;
      outline: none;
    }
    .role-card:hover { border-color: var(--input); background: var(--accent); }
    .role-card:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
    .role-card[aria-checked="true"] {
      border-color: var(--primary);
      background: color-mix(in srgb, var(--primary) 10%, transparent);
    }
    .role-card[aria-checked="true"]::after {
      content: '';
      position: absolute;
      top: 10px; right: 10px;
      width: 20px; height: 20px;
      border-radius: var(--radius-full);
      background: var(--primary);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='white'%3E%3Cpath d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      background-size: 14px;
    }
    .role-icon {
      width: 48px; height: 48px;
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-large);
    }
    .role-card[data-role="remote"] .role-icon { background: rgba(139,92,246,0.15); }
    .role-card[data-role="host"] .role-icon { background: rgba(6,182,212,0.15); }
    .role-name { font-size: 15px; font-weight: 600; }
    .role-desc { font-size: 12px; color: var(--muted-foreground); margin-top: 4px; line-height: 1.4; }

    /* ── Dynamic entries ───────────────────────── */
    .entries-header {
      display: flex;
      gap: 8px;
      padding: 0 0 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 10px;
    }
    .entries-header span {
      font-size: var(--text-8);
      font-weight: var(--font-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted-foreground);
    }
    .entries-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .entry-row {
      display: flex;
      gap: 8px;
      align-items: center;
      animation: fadeIn 0.15s ease;
    }
    .entry-row input {
      flex: 1;
      font-family: var(--font-mono);
      font-size: 13px;
      padding: 8px 12px;
      height: 38px;
    }
    .entry-empty {
      text-align: center;
      padding: 20px;
      color: var(--muted-foreground);
      font-size: 13px;
      border: 1.5px dashed var(--border);
      border-radius: var(--radius-medium);
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Badge row ─────────────────────────────── */
    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
    }

    /* ── Review panel ──────────────────────────── */
    .review-section {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: var(--radius-medium);
      padding: 16px 18px;
      margin-bottom: 14px;
    }
    .review-section h3 {
      font-size: var(--text-8);
      font-weight: var(--font-semibold);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--muted-foreground);
      margin-bottom: 10px;
    }
    .review-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
      font-size: 14px;
    }
    .review-row:last-child { border-bottom: none; }
    .review-key { color: var(--muted-foreground); }
    .review-val { color: var(--foreground); font-weight: 500; font-family: var(--font-mono); font-size: 13px; }
    .review-entries {
      margin-top: 8px;
      font-family: var(--font-mono);
      font-size: 13px;
      color: var(--secondary-foreground);
      line-height: 1.8;
    }

    /* ── Code preview ──────────────────────────── */
    .code-preview {
      background: #0d1117;
      border: 1px solid var(--border);
      border-radius: var(--radius-medium);
      padding: 16px 18px;
      font-family: var(--font-mono);
      font-size: 12px;
      line-height: 1.7;
      color: #c9d1d9;
      overflow-x: auto;
      white-space: pre;
      max-height: 280px;
      overflow-y: auto;
    }
    .code-preview .ck { color: #7ee787; }
    .code-preview .cv { color: #a5d6ff; }
    .code-preview .cc { color: #8b949e; }
    .code-preview .cp { color: #d2a8ff; }

    /* ── Success screen ────────────────────────── */
    .success-screen {
      text-align: center;
      padding: 40px 20px;
    }
    .success-icon {
      width: 64px; height: 64px;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--success) 12%, transparent);
      border: 2px solid color-mix(in srgb, var(--success) 30%, transparent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes scaleIn {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }
    .success-screen h2 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .success-screen p {
      color: var(--muted-foreground);
      font-size: 14px;
      margin-bottom: 20px;
    }
    .next-steps {
      text-align: left;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: var(--radius-medium);
      padding: 18px 20px;
      margin-top: 20px;
    }
    .next-steps h3 {
      font-size: 13px;
      font-weight: 600;
      color: var(--muted-foreground);
      margin-bottom: 10px;
    }
    .next-steps code {
      display: block;
      font-family: var(--font-mono);
      font-size: 13px;
      padding: 6px 0;
      color: var(--secondary-foreground);
      background: none;
    }
    .next-steps code::before {
      content: '$ ';
      color: var(--muted-foreground);
    }

    /* ── Button extras ─────────────────────────── */
    .btn-bar {
      display: flex;
      gap: 10px;
      margin-top: 24px;
    }
    .btn-bar .spacer { flex: 1; }
    button.success {
      background-color: var(--success);
      color: var(--success-foreground);
    }
    button.success:hover:not(:disabled) {
      background-color: color-mix(in srgb, var(--success), black 15%);
    }
    .btn-icon {
      width: 34px; height: 34px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      color: var(--muted-foreground);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-medium);
      transition: all var(--transition);
    }
    .btn-icon:hover { background: color-mix(in srgb, var(--danger) 12%, transparent); color: var(--danger); border-color: color-mix(in srgb, var(--danger) 20%, transparent); }
    .mt-sm { margin-top: 10px; }

    /* ── Accent color utilities for inline SVGs ── */
    .icon-accent { color: var(--icon-accent); }
    .icon-success { color: var(--icon-success); }

    /* ── Advanced Options (collapsible) ───────────── */
    .advanced-options {
      margin-top: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius-medium);
      background: var(--background);
      overflow: hidden;
    }
    .advanced-options summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      cursor: pointer;
      font-weight: 500;
      font-size: 14px;
      color: var(--muted-foreground);
      user-select: none;
      transition: color var(--transition);
    }
    .advanced-options summary:hover { color: var(--foreground); }
    .advanced-options summary::marker,
    .advanced-options summary::-webkit-details-marker { display: none; }
    .advanced-options summary svg {
      transition: transform 0.2s ease;
    }
    .advanced-options[open] summary svg {
      transform: rotate(90deg);
    }
    .advanced-options-body {
      padding: 4px 14px 14px;
    }

`;
}
