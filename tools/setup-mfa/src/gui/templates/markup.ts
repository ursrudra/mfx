function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** All HTML markup (body content) for the Module Federation Studio GUI. */
export function getMarkup(version: string): string {
  const safeVersion = escHtml(version);
  return `
<div class="mfx-container">

  <!-- Theme toggle (fixed top-right) -->
  <button id="themeToggle" class="theme-toggle" type="button" onclick="toggleTheme()" aria-label="Toggle light/dark mode" title="Switch to light mode">
    <svg id="themeIconSun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
    <svg id="themeIconMoon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  </button>

  <!-- Header -->
  <header class="mfx-header" role="banner">
    <div class="mfx-header-logo">
      <svg class="icon-accent" width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="var(--primary)" fill-opacity="0.15"/>
        <path d="M16 6L26 12V20L16 26L6 20V12L16 6Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M16 14L21 17V23L16 26L11 23V17L16 14Z" fill="var(--primary)" fill-opacity="0.4"/>
        <circle cx="16" cy="16" r="3" fill="currentColor"/>
      </svg>
      <h1>Module Federation Studio</h1>
      <span class="badge outline" style="font-family:var(--font-mono);">v${safeVersion}</span>
    </div>
    <p>Configure Module Federation for your Vite + React project</p>
  </header>

  <!-- Mode Toggle (Oat tabs) -->
  <ot-tabs class="mfx-mode-tabs">
    <div role="tablist" aria-label="Configuration mode">
      <button role="tab" aria-selected="true" id="tabSingle">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
        Single Project
      </button>
      <button role="tab" aria-selected="false" id="tabWorkspace">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
        Workspace
      </button>
    </div>

    <!-- ═══════════════════════════ SINGLE PROJECT MODE ═══════════════════════ -->
    <div role="tabpanel" id="singleMode">

    <!-- Stepper -->
    <nav class="stepper" role="navigation" aria-label="Setup steps">
      <div class="step-item active" data-step="1">
        <div class="step-circle">1</div>
        <span class="step-label">Project</span>
      </div>
      <div class="step-line" data-line="1"></div>
      <div class="step-item" data-step="2">
        <div class="step-circle">2</div>
        <span class="step-label">Configure</span>
      </div>
      <div class="step-line" data-line="2"></div>
      <div class="step-item" data-step="3">
        <div class="step-circle">3</div>
        <span class="step-label">Review</span>
      </div>
      <div class="step-line" data-line="3"></div>
      <div class="step-item" data-step="4">
        <div class="step-circle">4</div>
        <span class="step-label">Done</span>
      </div>
    </nav>

    <!-- ═══════════════════════════════════════════ STEP 1: Project ═══ -->
    <section id="step1" class="step-panel active" role="region" aria-label="Project directory">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
          </div>
          <div class="card-header-text">
            <h2>Project Directory</h2>
            <p>Point to your Vite + React project root</p>
          </div>
        </div>

        <div data-field>
          <label for="projectDir">
            Project path <span style="color:var(--danger);">*</span>
          </label>
          <div class="input-row">
            <input id="projectDir" type="text" class="mono"
              placeholder="C:\\\\Users\\\\me\\\\my-app  or  ./relative-path"
              aria-describedby="projectDirHint"
              autofocus />
            <button class="outline" type="button" onclick="openBrowser()" aria-label="Browse folders">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              Browse
            </button>
            <button id="detectBtn" type="button" onclick="detectProject()" aria-label="Detect project">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Detect
            </button>
          </div>
          <span data-hint id="projectDirHint">Type a path manually or use Browse to navigate your file system</span>
          <div id="projectDirError" class="form-error" role="alert"></div>
        </div>

        <div id="detectedBadges" class="badge-row" style="display:none;" aria-label="Detected project info"></div>

        <div class="btn-bar">
          <div class="spacer"></div>
          <button id="step1Next" type="button" onclick="goStep(2)" disabled aria-label="Continue to configuration">
            Continue
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════ STEP 2: Configure ══ -->
    <section id="step2" class="step-panel" role="region" aria-label="Configuration">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
          <div class="card-header-text">
            <h2>Federation Configuration</h2>
            <p id="projectNameLabel">Configure Module Federation settings</p>
          </div>
        </div>

        <!-- Role -->
        <div data-field>
          <label>
            Application role <span style="color:var(--danger);">*</span>
          </label>
          <div class="role-grid" role="radiogroup" aria-label="Application role">
            <div class="role-card" data-role="remote" role="radio" aria-checked="false" tabindex="0"
              onclick="selectRole('remote')" onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();selectRole('remote')}">
              <div class="role-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div class="role-name">Remote</div>
              <div class="role-desc">Exposes modules that other apps consume at runtime</div>
            </div>
            <div class="role-card" data-role="host" role="radio" aria-checked="false" tabindex="0"
              onclick="selectRole('host')" onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();selectRole('host')}">
              <div class="role-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div class="role-name">Host</div>
              <div class="role-desc">Consumes remote modules and orchestrates the shell app</div>
            </div>
          </div>
          <div id="roleError" class="form-error" role="alert"></div>
        </div>

        <!-- Name + Port -->
        <div class="grid-2">
          <div data-field>
            <label for="fedName">
              Federation name <span style="color:var(--danger);">*</span>
            </label>
            <input id="fedName" type="text" placeholder="my_app"
              aria-describedby="fedNameHint fedNameError" />
            <span data-hint id="fedNameHint">Unique identifier (alphanumeric, hyphens, underscores)</span>
            <div id="fedNameError" class="form-error" role="alert"></div>
          </div>
          <div data-field>
            <label for="fedPort">
              Dev server port <span style="color:var(--danger);">*</span>
            </label>
            <input id="fedPort" type="text" placeholder="5001"
              aria-describedby="fedPortHint fedPortError" />
            <span data-hint id="fedPortHint">1024 – 65535</span>
            <div id="fedPortError" class="form-error" role="alert"></div>
          </div>
        </div>

        <!-- Build Target -->
        <div data-field>
          <label for="buildTarget">Build target</label>
          <select id="buildTarget" aria-describedby="buildTargetHint">
            <option value="chrome89" selected>chrome89 (recommended for Module Federation)</option>
            <option value="esnext">esnext (latest ES features)</option>
            <option value="es2022">es2022</option>
            <option value="es2021">es2021</option>
            <option value="es2020">es2020</option>
          </select>
          <span data-hint id="buildTargetHint">Vite build.target — chrome89 supports top-level await required by Module Federation</span>
        </div>

        <!-- Exposes (Remote only) -->
        <div id="exposesSection" data-field style="display:none;" aria-label="Exposed modules">
          <label>Exposed Modules</label>
          <div class="entries-header">
            <span style="flex:1;">Expose path</span>
            <span style="flex:1;">Local file</span>
            <span style="width:34px;"></span>
          </div>
          <div id="exposesList" class="entries-list"></div>
          <div id="exposesEmpty" class="entry-empty">No modules exposed yet. Pick components below or add manually.</div>
          <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
            <button class="small" type="button" onclick="openComponentPicker()" aria-label="Pick components from project">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Pick from project
            </button>
            <button class="outline small" type="button" onclick="addExpose()" aria-label="Add exposed module manually">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add manually
            </button>
          </div>
        </div>

        <!-- Remotes (Host only) -->
        <div id="remotesSection" data-field style="display:none;" aria-label="Remote applications">
          <label>Remote Applications</label>
          <div class="entries-header">
            <span style="flex:1;max-width:140px;">Name</span>
            <span style="flex:0 0 80px;">Port</span>
            <span style="flex:1;">Entry URL</span>
            <span style="width:34px;"></span>
          </div>
          <div id="remotesList" class="entries-list"></div>
          <div id="remotesEmpty" class="entry-empty">No remotes configured yet. Add one below.</div>
          <button class="outline small mt-sm" type="button" onclick="addRemote()" aria-label="Add remote application">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add remote
          </button>
        </div>

        <!-- Advanced Options (collapsible) -->
        <details class="advanced-options" id="advancedOptions">
          <summary>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Advanced Federation Options
          </summary>
          <div class="advanced-options-body">
            <div class="grid-2">
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-medium);border:1px solid var(--border);background:var(--background);">
                <label for="optManifest" style="display:inline-flex;align-items:center;gap:8px;margin:0;">
                  <input type="checkbox" id="optManifest" role="switch" />
                  Manifest
                </label>
                <small class="text-lighter" style="flex:1;">Emit mf-manifest.json for preloading &amp; devtools</small>
              </div>
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-medium);border:1px solid var(--border);background:var(--background);">
                <label for="optDts" style="display:inline-flex;align-items:center;gap:8px;margin:0;">
                  <input type="checkbox" id="optDts" role="switch" />
                  TypeScript DTS
                </label>
                <small class="text-lighter" style="flex:1;">Auto-generate types across remotes</small>
              </div>
            </div>
            <div class="grid-2" style="margin-top:10px;">
              <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--radius-medium);border:1px solid var(--border);background:var(--background);">
                <label for="optDev" style="display:inline-flex;align-items:center;gap:8px;margin:0;">
                  <input type="checkbox" id="optDev" role="switch" checked />
                  Dev Mode
                </label>
                <small class="text-lighter" style="flex:1;">Live reload &amp; types hot-reload in dev</small>
              </div>
              <div data-field style="margin:0;">
                <label for="optRuntimePlugins" style="font-size:13px;">Runtime Plugins</label>
                <input id="optRuntimePlugins" type="text" class="mono" placeholder="./src/mf-plugins/auth.ts, ..."
                  aria-describedby="optRuntimePluginsHint" style="font-size:13px;" />
                <span data-hint id="optRuntimePluginsHint" style="font-size:11px;">Comma-separated paths to MF runtime plugin files</span>
              </div>
            </div>
            <div data-field style="margin-top:10px;">
              <label for="optPublicPath" style="font-size:13px;">Dynamic Public Path</label>
              <input id="optPublicPath" type="text" class="mono" placeholder="return window.__MF_PUBLIC_PATH__ || '/'"
                aria-describedby="optPublicPathHint" style="font-size:13px;" />
              <span data-hint id="optPublicPathHint" style="font-size:11px;">JS expression for dynamic publicPath (CDN deployments)</span>
            </div>
          </div>
        </details>

        <!-- Options -->
        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--radius-medium);border:1px solid var(--border);background:var(--background);margin-top:16px;">
          <label for="noInstall" style="display:inline-flex;align-items:center;gap:8px;margin:0;">
            <input type="checkbox" id="noInstall" role="switch" />
            Skip dependency installation
          </label>
          <small class="text-lighter" style="flex:1;">Don't run npm/pnpm install automatically</small>
        </div>

        <div class="btn-bar">
          <button class="outline" type="button" onclick="goStep(1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div class="spacer"></div>
          <button id="step2Next" type="button" onclick="goStep(3)" disabled>
            Review
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════ STEP 3: Review ═════ -->
    <section id="step3" class="step-panel" role="region" aria-label="Review configuration">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div class="card-header-text">
            <h2>Review &amp; Apply</h2>
            <p>Verify your configuration before applying</p>
          </div>
        </div>

        <div id="reviewContent"></div>

        <div id="previewSection" style="margin-top:16px;">
          <label style="margin-bottom:8px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Config preview
          </label>
          <div id="configPreview" class="code-preview" role="region" aria-label="Configuration preview"></div>
        </div>

        <div class="btn-bar">
          <button class="outline" type="button" onclick="goStep(2)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div class="spacer"></div>
          <button id="applyBtn" type="button" class="success" onclick="applyConfig()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Apply Configuration
          </button>
        </div>
      </div>
    </section>

    <!-- ═══════════════════════════════════════════ STEP 4: Done ═══════ -->
    <section id="step4" class="step-panel" role="region" aria-label="Setup complete">
      <div class="card">
        <div class="success-screen">
          <div class="success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--icon-success, #22c55e)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2>Module Federation Configured!</h2>
          <p id="successMsg">Your project is ready. Here's what to do next:</p>

          <div class="next-steps" id="nextSteps"></div>

          <div class="btn-bar" style="justify-content:center; margin-top: 24px;">
            <button class="outline" type="button" onclick="resetWizard()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Configure Another Project
            </button>
          </div>
        </div>
      </div>
    </section>

    </div><!-- /singleMode tabpanel -->

    <!-- ═══════════════════════════ WORKSPACE MODE ═══════════════════════════ -->
    <div role="tabpanel" id="workspaceMode" hidden>

    <!-- Workspace Stepper -->
    <nav class="stepper" role="navigation" aria-label="Workspace setup steps">
      <div class="step-item active" data-ws-step="1">
        <div class="step-circle">1</div>
        <span class="step-label">Root</span>
      </div>
      <div class="step-line" data-ws-line="1"></div>
      <div class="step-item" data-ws-step="2">
        <div class="step-circle">2</div>
        <span class="step-label">Apps</span>
      </div>
      <div class="step-line" data-ws-line="2"></div>
      <div class="step-item" data-ws-step="3">
        <div class="step-circle">3</div>
        <span class="step-label">Review</span>
      </div>
      <div class="step-line" data-ws-line="3"></div>
      <div class="step-item" data-ws-step="4">
        <div class="step-circle">4</div>
        <span class="step-label">Done</span>
      </div>
    </nav>

    <!-- WS Step 1: Workspace Root -->
    <section id="wsStep1" class="step-panel active" role="region" aria-label="Workspace root directory">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
            </svg>
          </div>
          <div class="card-header-text">
            <h2>Workspace Root</h2>
            <p>Point to your monorepo root directory</p>
          </div>
        </div>

        <div data-field>
          <label for="wsRootDir">
            Workspace root path <span style="color:var(--danger);">*</span>
          </label>
          <div class="input-row">
            <input id="wsRootDir" type="text" class="mono"
              placeholder="C:\\\\Users\\\\me\\\\my-monorepo  or  ./relative-path"
              aria-describedby="wsRootDirHint"
              autofocus />
            <button class="outline" type="button" onclick="openWsBrowser()" aria-label="Browse folders">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              Browse
            </button>
            <button id="wsDiscoverBtn" type="button" onclick="discoverWorkspace()" aria-label="Discover apps">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              Discover
            </button>
          </div>
          <span data-hint id="wsRootDirHint">Enter the monorepo root that contains your federated apps</span>
          <div id="wsRootDirError" class="form-error" role="alert"></div>
        </div>

        <div id="wsDiscoveredInfo" class="badge-row" style="display:none;" aria-label="Discovered workspace info"></div>
      </div>
    </section>

    <!-- WS Step 2: Discover & Configure Apps -->
    <section id="wsStep2" class="step-panel" role="region" aria-label="Configure apps">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </div>
          <div class="card-header-text">
            <h2>Configure Apps</h2>
            <p id="wsAppsSubtitle">Select and configure the apps to set up</p>
          </div>
        </div>

        <div class="ws-select-bar">
          <label class="ws-select-all">
            <input type="checkbox" id="wsSelectAll" checked onchange="wsToggleAll()" />
            <span>Select all</span>
          </label>
          <span id="wsSelectedCount" class="ws-selected-count">0 apps selected</span>
        </div>

        <div id="wsAppCards" class="ws-app-cards"></div>

        <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:var(--radius-medium);border:1px solid var(--border);background:var(--background);margin-top:16px;">
          <label for="wsNoInstall" style="display:inline-flex;align-items:center;gap:8px;margin:0;">
            <input type="checkbox" id="wsNoInstall" role="switch" />
            Skip dependency installation
          </label>
          <small class="text-lighter" style="flex:1;">Don't run npm/pnpm install automatically</small>
        </div>

        <div class="btn-bar">
          <button class="outline" type="button" onclick="goWsStep(1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div class="spacer"></div>
          <button id="wsStep2Next" type="button" onclick="goWsStep(3)" disabled>
            Review All
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- WS Step 3: Review -->
    <section id="wsStep3" class="step-panel" role="region" aria-label="Review workspace configuration">
      <div class="card">
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div class="card-header-text">
            <h2>Review All Apps</h2>
            <p>Verify the configuration before applying to all selected apps</p>
          </div>
        </div>

        <div id="wsReviewContent"></div>

        <div class="btn-bar">
          <button class="outline" type="button" onclick="goWsStep(2)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back
          </button>
          <div class="spacer"></div>
          <button id="wsApplyBtn" type="button" class="success" onclick="applyWorkspace()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Apply to All Apps
          </button>
        </div>
      </div>
    </section>

    <!-- WS Step 4: Done -->
    <section id="wsStep4" class="step-panel" role="region" aria-label="Workspace setup complete">
      <div class="card">
        <div class="success-screen">
          <div class="success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--icon-success, #22c55e)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2>Workspace Configured!</h2>
          <p id="wsSuccessMsg">All selected apps have been configured.</p>

          <div id="wsResults" class="ws-results"></div>

          <div id="wsNextSteps" class="next-steps" style="margin-top:20px;"></div>

          <div class="btn-bar" style="justify-content:center; margin-top: 24px;">
            <button class="outline" type="button" onclick="resetWorkspace()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
              Configure Again
            </button>
          </div>
        </div>
      </div>
    </section>

    </div><!-- /workspaceMode tabpanel -->
  </ot-tabs>

  <footer class="mfx-footer" role="contentinfo">
    Module Federation Studio v${safeVersion}
  </footer>
</div>

<!-- ═══════════════════ File Browser Dialog ═══════════════════ -->
<dialog id="browserDialog" aria-label="Browse folders">
  <header>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
    <h3>Browse Folders</h3>
    <button class="ghost icon" type="button" onclick="closeBrowser()" aria-label="Close">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </header>
  <section style="padding:0;overflow:visible;">
    <div class="browser-path-bar">
      <input id="browserPathInput" type="text" placeholder="Enter a path..."
        aria-label="Directory path" />
      <button class="outline small" type="button" onclick="navigateTo(document.getElementById('browserPathInput').value)">
        Go
      </button>
    </div>
    <div id="browserList" class="browser-list" role="listbox" aria-label="Directory contents">
      <div class="browser-loading">Loading...</div>
    </div>
  </section>
  <footer>
    <span id="browserSelected" class="selected-path"></span>
    <button id="browserSelectBtn" class="small" type="button" onclick="selectBrowserDir()" disabled>
      Select Folder
    </button>
  </footer>
</dialog>

<!-- ═══════════════════ Component Picker Dialog ═══════════════════ -->
<dialog id="pickerDialog" class="wide" aria-label="Pick components">
  <header>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
    <h3>Pick Components to Expose</h3>
    <button class="ghost icon" type="button" onclick="closePicker()" aria-label="Close">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </header>
  <section style="padding:0;overflow:visible;">
    <div class="picker-search">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <input id="pickerSearch" type="text" placeholder="Search components, hooks, files..." aria-label="Search files" />
    </div>
    <div id="pickerList" class="picker-list" role="listbox" aria-label="Project files">
      <div class="browser-loading"><span class="spinner" role="status"></span> Scanning project...</div>
    </div>
  </section>
  <footer>
    <span id="pickerCount" class="picker-footer-count">0 selected</span>
    <button class="outline small" type="button" onclick="closePicker()">Cancel</button>
    <button id="pickerAddBtn" class="small" type="button" onclick="addPickedExposes()" disabled>
      Add Selected
    </button>
  </footer>
</dialog>

<!-- ═══════════════════ Help Button ═══════════════════ -->
<button class="help-btn" type="button" onclick="toggleHelp()" aria-label="Quick reference guide" data-tooltip="Quick Reference">?</button>

<!-- ═══════════════════ Help Backdrop ═══════════════════ -->
<div id="helpBackdrop" class="help-backdrop" onclick="closeHelp()"></div>

<!-- ═══════════════════ Help Panel ═══════════════════ -->
<div id="helpPanel" class="help-panel" role="dialog" aria-modal="true" aria-label="Quick reference">
  <div class="help-panel-header">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <h3>Quick Reference</h3>
    <button class="ghost icon" type="button" onclick="closeHelp()" aria-label="Close help">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>

  <div class="help-panel-body">

    <!-- Concepts -->
    <div class="help-section">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
        Key Concepts
      </h4>

      <div class="help-term">
        <div class="help-term-icon" style="background:rgba(139,92,246,0.15);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
          </svg>
        </div>
        <div class="help-term-text">
          <strong>Remote App</strong>
          <span>Exposes modules (components, hooks, utils) that other apps can consume at runtime. Each remote runs on its own dev server port.</span>
        </div>
      </div>

      <div class="help-term">
        <div class="help-term-icon" style="background:rgba(6,182,212,0.15);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="help-term-text">
          <strong>Host App</strong>
          <span>The shell application that consumes remote modules. It imports components from remotes via their <code>remoteEntry.js</code> URL.</span>
        </div>
      </div>

      <div class="help-term">
        <div class="help-term-icon" style="background:rgba(99,102,241,0.15);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="1.5">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <div class="help-term-text">
          <strong>Module Federation</strong>
          <span>A Webpack/Vite feature that lets multiple independently-built apps share code at runtime — no npm publish needed.</span>
        </div>
      </div>
    </div>

    <!-- Workflow -->
    <div class="help-section">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        How This Works
      </h4>
      <p><strong>Step 1 — Project:</strong> Enter the path to your Vite + React project. Click <strong>Detect</strong> to scan it. The tool reads <code>package.json</code> and <code>vite.config.ts</code> to understand your setup.</p>
      <p><strong>Step 2 — Configure:</strong> Choose a role (Remote or Host), set the federation name and port. For remotes, define which modules to expose. For hosts, define which remotes to consume.</p>
      <p><strong>Step 3 — Review:</strong> See a summary and a live preview of the config that will be generated. Verify everything looks right.</p>
      <p><strong>Step 4 — Done:</strong> The tool writes your <code>vite.config.ts</code>, installs <code>@module-federation/vite</code>, creates type declarations, and saves <code>mfa.config.json</code>.</p>
    </div>

    <!-- Field Reference -->
    <div class="help-section">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        Field Reference
      </h4>

      <div class="help-term">
        <div class="help-term-text">
          <strong>Federation Name</strong>
          <span>A unique identifier for your app in the federation. Must start with a letter, then alphanumeric, hyphens, or underscores. Example: <code>mfa_remote</code></span>
        </div>
      </div>

      <div class="help-term">
        <div class="help-term-text">
          <strong>Dev Server Port</strong>
          <span>The port your Vite dev server will run on. Must be 1024–65535. Each federated app needs a unique port. Common: 5000 (host), 5001+ (remotes).</span>
        </div>
      </div>

      <div class="help-term">
        <div class="help-term-text">
          <strong>Build Target</strong>
          <span>Vite's <code>build.target</code> option. <code>chrome89</code> is recommended — it supports top-level await which Module Federation requires. Use <code>esnext</code> only if all consumers support it.</span>
        </div>
      </div>

      <div class="help-term">
        <div class="help-term-text">
          <strong>Exposed Modules <span style="color:var(--muted-foreground);">(Remote only)</span></strong>
          <span>Maps an expose path (e.g. <code>./Button</code>) to a local file (e.g. <code>./src/components/Button.tsx</code>). Hosts import these via the expose path. Use <strong>Pick from project</strong> to auto-scan your source files.</span>
        </div>
      </div>

      <div class="help-term">
        <div class="help-term-text">
          <strong>Remote Applications <span style="color:var(--muted-foreground);">(Host only)</span></strong>
          <span>Defines which remote apps your host consumes. Each remote needs a name, port, and entry URL (typically <code>http://localhost:PORT/remoteEntry.js</code>). The entry URL is auto-filled when you set the port.</span>
        </div>
      </div>
    </div>

    <!-- Tips -->
    <div class="help-section">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        Tips
      </h4>
      <p>Use the <strong>Browse</strong> button to navigate your file system visually instead of typing paths.</p>
      <p>The <strong>Pick from project</strong> button scans your <code>src/</code> directory and shows all components, hooks, and utilities — select the ones you want to expose.</p>
      <p>After setup, start your <strong>remotes first</strong>, then the host. The host needs remotes running to fetch <code>remoteEntry.js</code>.</p>
      <p>You can re-run this tool anytime — it detects existing configuration and updates surgically without losing your custom changes.</p>
    </div>

    <!-- Keyboard -->
    <div class="help-section">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><line x1="7" y1="16" x2="17" y2="16"/></svg>
        Keyboard Shortcuts
      </h4>
      <div class="help-shortcut">
        <span class="key">Enter</span>
        <span>Detect project (in path field)</span>
      </div>
      <div class="help-shortcut">
        <span class="key">Tab</span>
        <span>Move between fields</span>
      </div>
      <div class="help-shortcut">
        <span class="key">Space / Enter</span>
        <span>Select role card</span>
      </div>
      <div class="help-shortcut">
        <span class="key">Esc</span>
        <span>Close modals / this panel</span>
      </div>
      <div class="help-shortcut">
        <span class="key">?</span>
        <span>Toggle this help panel</span>
      </div>
    </div>

    <!-- CLI equivalent -->
    <div class="help-section">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
        CLI Equivalent
      </h4>
      <p>This GUI does the same thing as the <code>mfx init</code> CLI command. For scripting or CI, use:</p>
      <pre style="margin-top:8px;"><code>mfx init -d ./my-app \\
  -r remote -n myApp -p 5001 -y</code></pre>
    </div>

  </div>
</div>
`;
}
