/** Core single-project wizard: state, theme, stepper, steps 1-4, toast, reset. */
export function getCoreScripts(): string {
  return `
// ═══════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════

const S = {
  currentStep: 1,
  detected: false,
  projectData: null,
  role: null,
  exposes: [],
  remotes: [],
};

// ═══════════════════════════════════════════════════════════════════════════
// Theme Toggle
// ═══════════════════════════════════════════════════════════════════════════

function getStoredTheme() {
  try { return localStorage.getItem('mfx-theme'); } catch(e) { return null; }
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  var sunIcon = document.getElementById('themeIconSun');
  var moonIcon = document.getElementById('themeIconMoon');
  var toggleBtn = document.getElementById('themeToggle');
  if (sunIcon && moonIcon) {
    // In dark mode: show sun icon (click to switch to light)
    // In light mode: show moon icon (click to switch to dark)
    sunIcon.style.display = theme === 'dark' ? 'block' : 'none';
    moonIcon.style.display = theme === 'light' ? 'block' : 'none';
  }
  if (toggleBtn) {
    toggleBtn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }
  try { localStorage.setItem('mfx-theme', theme); } catch(e) {}
}

function toggleTheme() {
  var current = document.body.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

// Apply stored theme on load (default: dark)
(function() {
  var stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') {
    applyTheme(stored);
  } else {
    applyTheme('dark');
  }
})();

// ═══════════════════════════════════════════════════════════════════════════
// Stepper
// ═══════════════════════════════════════════════════════════════════════════

function goStep(n) {
  // Validate before advancing
  if (n === 2 && !S.detected) return;
  if (n === 3 && !validateStep2()) return;

  // Build review content when entering step 3
  if (n === 3) buildReview();

  S.currentStep = n;

  // Update panels (scoped to single mode)
  document.querySelectorAll('#singleMode .step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('step' + n).classList.add('active');

  // Update stepper indicators (scoped to single mode via data-step/data-line)
  document.querySelectorAll('#singleMode .step-item').forEach(el => {
    const step = +el.dataset.step;
    el.classList.remove('active', 'done');
    if (step === n) el.classList.add('active');
    else if (step < n) el.classList.add('done');
  });
  document.querySelectorAll('#singleMode .step-line').forEach(el => {
    const line = +el.dataset.line;
    el.classList.remove('active', 'done');
    if (line < n) el.classList.add('done');
    else if (line === n - 1) el.classList.add('active');
  });

  // Scroll to top of step
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Focus management
  if (n === 2) {
    const first = document.querySelector('#step2 .role-card');
    if (first) setTimeout(() => first.focus(), 300);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 1: Detect project
// ═══════════════════════════════════════════════════════════════════════════

async function detectProject() {
  const input = document.getElementById('projectDir');
  const dir = input.value.trim();
  const errEl = document.getElementById('projectDirError');
  const btn = document.getElementById('detectBtn');

  // Clear previous
  errEl.classList.remove('visible');
  input.classList.remove('input-error');

  if (!dir) {
    errEl.textContent = 'Please enter a project directory path.';
    errEl.classList.add('visible');
    input.classList.add('input-error');
    input.focus();
    return;
  }

  // Loading state
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Detecting';

  try {
    const res = await fetch('/api/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir }),
    });
    const data = await res.json();

    if (!data.success) {
      errEl.textContent = data.error || 'Could not detect project.';
      errEl.classList.add('visible');
      input.classList.add('input-error');
      btn.innerHTML = restoreDetectBtn();
      btn.disabled = false;
      return;
    }

    S.detected = true;
    S.projectData = data;
    const p = data.project;

    // Show badges
    const badgesEl = document.getElementById('detectedBadges');
    badgesEl.style.display = 'flex';
    badgesEl.innerHTML = [
      makeBadge(p.name, 'blue'),
      makeBadge(p.packageManager, 'blue'),
      makeBadge(p.viteConfig || 'no vite config', p.viteConfig ? 'green' : 'yellow'),
      p.hasTailwind ? makeBadge('Tailwind CSS', 'green') : '',
      p.hasFederation ? makeBadge('MF configured', 'green') : makeBadge('MF not yet configured', 'yellow'),
    ].filter(Boolean).join('');

    // Pre-fill step 2 fields
    const nameEl = document.getElementById('fedName');
    const portEl = document.getElementById('fedPort');

    nameEl.value = p.federationName || p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (p.port) portEl.value = p.port;

    if (p.role) selectRole(p.role);
    document.getElementById('projectNameLabel').textContent = 'Configuring ' + p.name;

    // Override from config file if present
    if (data.config) {
      if (data.config.role) selectRole(data.config.role);
      if (data.config.name) nameEl.value = data.config.name;
      if (data.config.port) portEl.value = data.config.port;
    }

    // Pre-fill exposes from existing config
    if (p.role === 'remote' && Object.keys(p.exposes).length > 0) {
      S.exposes = Object.entries(p.exposes).map(([k, v]) => ({ key: k, value: v }));
      renderExposes();
    }

    // Enable continue
    document.getElementById('step1Next').disabled = false;
    showToast('Project detected successfully!', 'success');

  } catch (err) {
    errEl.textContent = 'Failed to connect: ' + err.message;
    errEl.classList.add('visible');
    input.classList.add('input-error');
  }

  btn.innerHTML = restoreDetectBtn();
  btn.disabled = false;
}

function restoreDetectBtn() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Detect';
}

// Enter key triggers detect
document.getElementById('projectDir').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); detectProject(); }
});

// Live path validation hint as user types
document.getElementById('projectDir').addEventListener('input', debounce(function() {
  const val = this.value.trim();
  const errEl = document.getElementById('projectDirError');
  const hintEl = document.getElementById('projectDirHint');
  errEl.classList.remove('visible');
  this.classList.remove('input-error');

  if (!val) {
    hintEl.textContent = 'Type a path manually or use Browse to navigate your file system';
    return;
  }

  // Basic format checks (not full validation — Detect does that via API)
  if (val.includes('\\0')) {
    setFieldState(this, errEl, 'error', 'Path contains invalid characters.');
    return;
  }

  hintEl.textContent = 'Press Detect or Enter to validate this path';
}, 300));

// ═══════════════════════════════════════════════════════════════════════════
// Step 2: Configuration
// ═══════════════════════════════════════════════════════════════════════════

function selectRole(role) {
  S.role = role;
  document.querySelectorAll('.role-card').forEach(c => {
    c.setAttribute('aria-checked', c.dataset.role === role ? 'true' : 'false');
  });
  document.getElementById('exposesSection').style.display = role === 'remote' ? '' : 'none';
  document.getElementById('remotesSection').style.display = role === 'host' ? '' : 'none';
  document.getElementById('roleError').classList.remove('visible');

  // Seed default entry if empty
  if (role === 'remote' && S.exposes.length === 0) {
    S.exposes.push({ key: './Button', value: './src/components/Button.tsx' });
    renderExposes();
  }
  if (role === 'host' && S.remotes.length === 0) {
    S.remotes.push({ name: 'remote_app', port: '5001', entry: '' });
    renderRemotes();
  }
  validateStep2();
}

// ─── Exposes ──────────
function addExpose() {
  S.exposes.push({ key: '', value: '' });
  renderExposes();
  // Focus the new row
  setTimeout(() => {
    const rows = document.querySelectorAll('#exposesList .entry-row');
    const last = rows[rows.length - 1];
    if (last) last.querySelector('input').focus();
  }, 50);
}

function removeExpose(i) {
  S.exposes.splice(i, 1);
  renderExposes();
  validateStep2();
}

function renderExposes() {
  const list = document.getElementById('exposesList');
  const empty = document.getElementById('exposesEmpty');
  empty.style.display = S.exposes.length === 0 ? '' : 'none';

  list.innerHTML = S.exposes.map((e, i) => \`
    <div class="entry-row">
      <input type="text" class="mono" placeholder="./Button" value="\${esc(e.key)}"
        oninput="S.exposes[\${i}].key=this.value; validateStep2()"
        aria-label="Expose path \${i + 1}" />
      <input type="text" class="mono" placeholder="./src/components/Button.tsx" value="\${esc(e.value)}"
        oninput="S.exposes[\${i}].value=this.value; validateStep2()"
        aria-label="Local file \${i + 1}" />
      <button class="btn-icon" onclick="removeExpose(\${i})" aria-label="Remove expose \${i + 1}" title="Remove">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  \`).join('');
}

// ─── Remotes ──────────
function addRemote() {
  S.remotes.push({ name: '', port: '', entry: '' });
  renderRemotes();
  setTimeout(() => {
    const rows = document.querySelectorAll('#remotesList .entry-row');
    const last = rows[rows.length - 1];
    if (last) last.querySelector('input').focus();
  }, 50);
}

function removeRemote(i) {
  S.remotes.splice(i, 1);
  renderRemotes();
  validateStep2();
}

function renderRemotes() {
  const list = document.getElementById('remotesList');
  const empty = document.getElementById('remotesEmpty');
  empty.style.display = S.remotes.length === 0 ? '' : 'none';

  list.innerHTML = S.remotes.map((r, i) => \`
    <div class="entry-row">
      <input type="text" class="mono" placeholder="remote_app" value="\${esc(r.name)}" style="max-width:140px;"
        oninput="S.remotes[\${i}].name=this.value; autoFillRemoteEntry(\${i}); validateStep2()"
        aria-label="Remote name \${i + 1}" />
      <input type="text" class="mono" placeholder="5001" value="\${esc(r.port)}" style="flex:0 0 80px;"
        oninput="S.remotes[\${i}].port=this.value; autoFillRemoteEntry(\${i}); validateStep2()"
        aria-label="Remote port \${i + 1}" />
      <input type="text" class="mono" placeholder="http://localhost:5001/remoteEntry.js" value="\${esc(r.entry)}"
        oninput="S.remotes[\${i}].entry=this.value; validateStep2()"
        aria-label="Entry URL \${i + 1}" />
      <button class="btn-icon" onclick="removeRemote(\${i})" aria-label="Remove remote \${i + 1}" title="Remove">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  \`).join('');
}

function autoFillRemoteEntry(i) {
  const r = S.remotes[i];
  if (r.port && !r.entry) {
    r.entry = 'http://localhost:' + r.port + '/remoteEntry.js';
    renderRemotes();
  }
}

// ─── Validation ──────────
function validateStep2() {
  let valid = true;
  const roleErr = document.getElementById('roleError');

  // Role
  if (!S.role) {
    valid = false;
  }
  roleErr.classList.toggle('visible', false);

  // Name (delegates to per-field validator for visual state)
  const nameVal = document.getElementById('fedName').value.trim();
  if (!nameVal || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(nameVal)) {
    valid = false;
  }

  // Port
  const portVal = document.getElementById('fedPort').value.trim();
  if (!portVal) {
    valid = false;
  } else {
    const portNum = parseInt(portVal, 10);
    if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
      valid = false;
    }
  }

  // Validate expose rows for inline feedback
  if (S.role === 'remote') {
    for (let i = 0; i < S.exposes.length; i++) {
      validateExposeRow(i);
    }
  }

  // Validate remote rows for inline feedback
  if (S.role === 'host') {
    for (let i = 0; i < S.remotes.length; i++) {
      validateRemoteRow(i);
    }
  }

  document.getElementById('step2Next').disabled = !valid;
  return valid;
}

// ═══════════════════════════════════════════════════════════════════════════
// Step 3: Review
// ═══════════════════════════════════════════════════════════════════════════

function buildReview() {
  const name = document.getElementById('fedName').value.trim();
  const port = document.getElementById('fedPort').value.trim();
  const role = S.role;

  let html = '<div class="review-section"><h3>General</h3>';
  html += reviewRow('Role', role === 'remote' ? 'Remote (exposes modules)' : 'Host (consumes remotes)');
  html += reviewRow('Federation name', name);
  html += reviewRow('Dev server port', port);
  html += reviewRow('Build target', document.getElementById('buildTarget').value);
  if (S.projectData) {
    html += reviewRow('Package manager', S.projectData.project.packageManager);
    if (S.projectData.project.hasTailwind) html += reviewRow('Tailwind CSS', 'Detected — will add @source directives');
  }
  html += '</div>';

  if (role === 'remote' && S.exposes.length > 0) {
    html += '<div class="review-section"><h3>Exposed Modules (' + S.exposes.length + ')</h3>';
    html += '<div class="review-entries">';
    S.exposes.forEach(e => {
      html += esc(e.key) + '  →  ' + esc(e.value) + '\\n';
    });
    html += '</div></div>';
  }

  if (role === 'host' && S.remotes.length > 0) {
    html += '<div class="review-section"><h3>Remote Applications (' + S.remotes.length + ')</h3>';
    html += '<div class="review-entries">';
    S.remotes.forEach(r => {
      html += esc(r.name) + '  :' + esc(r.port) + '  →  ' + esc(r.entry) + '\\n';
    });
    html += '</div></div>';
  }

  // Advanced options review
  var advManifestR = document.getElementById('optManifest').checked;
  var advDtsR = document.getElementById('optDts').checked;
  var advDevR = document.getElementById('optDev').checked;
  var advRuntimeR = document.getElementById('optRuntimePlugins').value.trim();
  var advPublicR = document.getElementById('optPublicPath').value.trim();

  if (advManifestR || advDtsR || !advDevR || advRuntimeR || advPublicR) {
    html += '<div class="review-section"><h3>Advanced Federation</h3>';
    if (advManifestR) html += reviewRow('Manifest', 'Enabled — emits mf-manifest.json');
    if (advDtsR) html += reviewRow('TypeScript DTS', 'Enabled — auto-generates types');
    if (!advDevR) html += reviewRow('Dev Mode', 'Disabled');
    if (advRuntimeR) html += reviewRow('Runtime Plugins', advRuntimeR);
    if (advPublicR) html += reviewRow('Public Path', advPublicR);
    html += '</div>';
  }

  if (document.getElementById('noInstall').checked) {
    html += '<div class="review-section"><h3>Options</h3>';
    html += reviewRow('Skip install', 'Yes — dependencies will not be installed');
    html += '</div>';
  }

  document.getElementById('reviewContent').innerHTML = html;

  // Build config preview
  buildConfigPreview(name, port, role);
}

function reviewRow(key, val) {
  return '<div class="review-row"><span class="review-key">' + esc(key) + '</span><span class="review-val">' + esc(val) + '</span></div>';
}

function buildConfigPreview(name, port, role) {
  let lines = [];
  lines.push('<span class="cc">// vite.config.ts — federation plugin snippet</span>');
  lines.push('<span class="cp">federation</span>({');
  lines.push('  <span class="ck">name</span>: <span class="cv">"' + esc(name) + '"</span>,');

  if (role === 'remote') {
    lines.push('  <span class="ck">filename</span>: <span class="cv">"remoteEntry.js"</span>,');
    if (S.exposes.length > 0) {
      lines.push('  <span class="ck">exposes</span>: {');
      S.exposes.forEach(e => {
        lines.push('    <span class="cv">"' + esc(e.key) + '"</span>: <span class="cv">"' + esc(e.value) + '"</span>,');
      });
      lines.push('  },');
    }
  } else {
    if (S.remotes.length > 0) {
      lines.push('  <span class="ck">remotes</span>: {');
      S.remotes.forEach(r => {
        lines.push('    <span class="ck">' + esc(r.name) + '</span>: {');
        lines.push('      <span class="ck">type</span>: <span class="cv">"module"</span>,');
        lines.push('      <span class="ck">name</span>: <span class="cv">"' + esc(r.name) + '"</span>,');
        lines.push('      <span class="ck">entry</span>: <span class="cv">"' + esc(r.entry || 'http://localhost:' + r.port + '/remoteEntry.js') + '"</span>,');
        lines.push('    },');
      });
      lines.push('  },');
    }
  }

  // DTS
  var pvDts = document.getElementById('optDts').checked;
  lines.push('  <span class="ck">dts</span>: <span class="cp">' + (pvDts ? 'true' : 'false') + '</span>,');

  lines.push('  <span class="ck">shared</span>: {');
  lines.push('    <span class="cv">"react"</span>:      { <span class="ck">singleton</span>: <span class="cp">true</span> },');
  lines.push('    <span class="cv">"react-dom"</span>:  { <span class="ck">singleton</span>: <span class="cp">true</span> },');
  lines.push('  },');

  // Advanced options in preview
  var pvManifest = document.getElementById('optManifest').checked;
  var pvDev = document.getElementById('optDev').checked;
  var pvRuntime = document.getElementById('optRuntimePlugins').value.trim();
  var pvPublic = document.getElementById('optPublicPath').value.trim();
  if (pvManifest) lines.push('  <span class="ck">manifest</span>: <span class="cp">true</span>,');
  if (!pvDev) lines.push('  <span class="ck">dev</span>: <span class="cp">false</span>,');
  if (pvRuntime) {
    var pvPlugins = pvRuntime.split(',').map(function(s) { return '"' + s.trim() + '"'; }).join(', ');
    lines.push('  <span class="ck">runtimePlugins</span>: [<span class="cv">' + pvPlugins + '</span>],');
  }
  if (pvPublic) lines.push('  <span class="ck">getPublicPath</span>: <span class="cv">\`' + esc(pvPublic) + '\`</span>,');

  lines.push('})');
  lines.push('');
  lines.push('<span class="cc">// server + build config</span>');
  lines.push('<span class="ck">server</span>: { <span class="ck">port</span>: <span class="cp">' + esc(port) + '</span>, <span class="ck">strictPort</span>: <span class="cp">true</span> },');
  const bt = document.getElementById('buildTarget').value;
  lines.push('<span class="ck">build</span>: { <span class="ck">target</span>: <span class="cv">"' + esc(bt) + '"</span> },');

  document.getElementById('configPreview').innerHTML = lines.join('\\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// Apply
// ═══════════════════════════════════════════════════════════════════════════

async function applyConfig() {
  const btn = document.getElementById('applyBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Applying...';
  showToast('Configuring Module Federation...', 'info');

  // Build exposes map from state
  const exposesMap = {};
  for (const e of S.exposes) {
    if (e.key && e.value) exposesMap[e.key] = e.value;
  }

  // Build remotes list from state
  const remotesList = S.remotes.filter(function(r) { return r.name && r.entry; });

  // Gather advanced federation options
  var advManifest = document.getElementById('optManifest').checked;
  var advDts = document.getElementById('optDts').checked;
  var advDev = document.getElementById('optDev').checked;
  var advRuntimePluginsRaw = document.getElementById('optRuntimePlugins').value.trim();
  var advRuntimePlugins = advRuntimePluginsRaw ? advRuntimePluginsRaw.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
  var advPublicPath = document.getElementById('optPublicPath').value.trim();

  const payload = {
    projectDir: document.getElementById('projectDir').value.trim(),
    role: S.role,
    name: document.getElementById('fedName').value.trim(),
    port: document.getElementById('fedPort').value.trim(),
    noInstall: document.getElementById('noInstall').checked,
    buildTarget: document.getElementById('buildTarget').value,
    exposes: S.role === 'remote' ? exposesMap : undefined,
    remotes: S.role === 'host' ? remotesList : undefined,
    manifest: advManifest || undefined,
    dts: advDts || undefined,
    dev: advDev ? undefined : false,
    runtimePlugins: advRuntimePlugins.length > 0 ? advRuntimePlugins : undefined,
    getPublicPath: advPublicPath || undefined,
  };

  try {
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      showToast('Configuration applied successfully!', 'success');
      buildNextSteps(payload);
      goStep(4);
    } else {
      showToast('Error: ' + (data.error || 'Unknown error'), 'error', 8000);
      btn.innerHTML = restoreApplyBtn();
      btn.disabled = false;
    }
  } catch (err) {
    showToast('Request failed: ' + err.message, 'error', 8000);
    btn.innerHTML = restoreApplyBtn();
    btn.disabled = false;
  }
}

function restoreApplyBtn() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Apply Configuration';
}

function buildNextSteps(payload) {
  const pm = S.projectData ? S.projectData.project.packageManager : 'npm';
  const port = payload.port;
  const dir = payload.projectDir;
  const devCmd = pm === 'npm' ? 'npm run dev' : pm + ' dev';

  let html = '<h3>Next steps</h3>';
  html += '<code>cd ' + esc(dir) + '</code>';
  html += '<code>' + devCmd + '</code>';
  html += '<code><span style="color:var(--muted-foreground)"># Verify at </span>http://localhost:' + esc(port) + (payload.role === 'remote' ? '/remoteEntry.js' : '') + '</code>';

  document.getElementById('nextSteps').innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// Reset
// ═══════════════════════════════════════════════════════════════════════════

function resetWizard() {
  S.currentStep = 1;
  S.detected = false;
  S.projectData = null;
  S.role = null;
  S.exposes = [];
  S.remotes = [];

  document.getElementById('projectDir').value = '';
  document.getElementById('fedName').value = '';
  document.getElementById('fedPort').value = '';
  document.getElementById('noInstall').checked = false;
  document.getElementById('buildTarget').value = 'chrome89';
  document.getElementById('optManifest').checked = false;
  document.getElementById('optDts').checked = false;
  document.getElementById('optDev').checked = true;
  document.getElementById('optRuntimePlugins').value = '';
  document.getElementById('optPublicPath').value = '';
  document.getElementById('step1Next').disabled = true;
  document.getElementById('step2Next').disabled = true;
  document.getElementById('detectedBadges').style.display = 'none';
  document.getElementById('exposesSection').style.display = 'none';
  document.getElementById('remotesSection').style.display = 'none';

  document.querySelectorAll('.role-card').forEach(c => c.setAttribute('aria-checked', 'false'));
  document.querySelectorAll('.form-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('input.input-error').forEach(e => e.classList.remove('input-error'));

  const applyBtn = document.getElementById('applyBtn');
  applyBtn.disabled = false;
  applyBtn.innerHTML = restoreApplyBtn();

  goStep(1);
  setTimeout(() => document.getElementById('projectDir').focus(), 300);
}

// ═══════════════════════════════════════════════════════════════════════════
// Toast (using Oat UI ot.toast)
// ═══════════════════════════════════════════════════════════════════════════

function showToast(msg, type, duration) {
  var variant = type === 'error' ? 'danger' : (type || 'info');
  ot.toast(msg, '', { variant: variant, duration: duration || 4000 });
}
`;
}
