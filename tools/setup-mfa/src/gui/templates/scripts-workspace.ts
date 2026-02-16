/** Workspace mode scripts: discovery, app cards, review, apply. */
export function getWorkspaceScripts(): string {
  return `// ═══════════════════════════════════════════════════════════════════════════
// Workspace Mode
// ═══════════════════════════════════════════════════════════════════════════

const WS = {
  currentStep: 1,
  rootDir: '',
  apps: [],           // discovered apps from API
  selectedApps: [],   // indices into apps[] that are checked
};

// ─── Mode Toggle (Oat tabs handle show/hide) ──────────
// ot-tabs automatically handles tabpanel visibility.
// We listen for ot-tab-change to focus the workspace root input.
document.querySelector('.mfx-mode-tabs').addEventListener('ot-tab-change', function(e) {
  if (e.detail && e.detail.index === 1) {
    setTimeout(function() {
      var input = document.getElementById('wsRootDir');
      if (input) input.focus();
    }, 200);
  }
});

// ─── Workspace Stepper ──────────

function goWsStep(n) {
  if (n === 2 && WS.apps.length === 0) return;
  if (n === 3) {
    if (!validateWsApps()) return;
    buildWsReview();
  }

  WS.currentStep = n;

  // Update panels
  document.querySelectorAll('#workspaceMode .step-panel').forEach(function(p) { p.classList.remove('active'); });
  var stepEl = document.getElementById('wsStep' + n);
  if (stepEl) stepEl.classList.add('active');

  // Update stepper indicators
  document.querySelectorAll('[data-ws-step]').forEach(function(el) {
    var step = +el.dataset.wsStep;
    el.classList.remove('active', 'done');
    if (step === n) el.classList.add('active');
    else if (step < n) el.classList.add('done');
  });
  document.querySelectorAll('[data-ws-line]').forEach(function(el) {
    var line = +el.dataset.wsLine;
    el.classList.remove('active', 'done');
    if (line < n) el.classList.add('done');
    else if (line === n - 1) el.classList.add('active');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── WS Step 1: Discover ──────────

async function discoverWorkspace() {
  var input = document.getElementById('wsRootDir');
  var dir = input.value.trim();
  var errEl = document.getElementById('wsRootDirError');
  var btn = document.getElementById('wsDiscoverBtn');

  errEl.classList.remove('visible');
  input.classList.remove('input-error');

  if (!dir) {
    errEl.textContent = 'Please enter a workspace root directory.';
    errEl.classList.add('visible');
    input.classList.add('input-error');
    input.focus();
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Discovering';

  try {
    var res = await fetch('/api/workspace/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir: dir }),
    });
    var data = await res.json();

    if (!data.success) {
      errEl.textContent = data.error || 'Could not discover apps.';
      errEl.classList.add('visible');
      input.classList.add('input-error');
      btn.innerHTML = restoreDiscoverBtn();
      btn.disabled = false;
      return;
    }

    WS.rootDir = data.rootDir;
    WS.apps = data.apps.map(function(app) {
      return {
        dir: app.dir,
        name: app.federationName || app.name,
        role: app.role || '',
        port: app.port || '',
        buildTarget: 'chrome89',
        hasFederation: app.hasFederation,
        packageManager: app.packageManager,
        exposes: app.exposes || {},
        remotes: app.remotes || {},
        checked: true,
        manifest: false,
        dts: false,
      };
    });
    WS.selectedApps = WS.apps.map(function(_, i) { return i; });

    // Auto-assign sequential ports to apps that don't have one
    var nextPort = 5001;
    var usedPorts = {};
    for (var pi = 0; pi < WS.apps.length; pi++) {
      if (WS.apps[pi].port) usedPorts[WS.apps[pi].port] = true;
    }
    for (var pi2 = 0; pi2 < WS.apps.length; pi2++) {
      if (!WS.apps[pi2].port) {
        while (usedPorts[String(nextPort)]) nextPort++;
        WS.apps[pi2].port = String(nextPort);
        usedPorts[String(nextPort)] = true;
        nextPort++;
      }
    }

    // Show info badges
    var infoEl = document.getElementById('wsDiscoveredInfo');
    infoEl.style.display = 'flex';
    infoEl.innerHTML = makeBadge(data.apps.length + ' app(s) found', 'green') +
      makeBadge(data.rootDir, 'blue');

    showToast(data.apps.length + ' app(s) discovered!', 'success');

    // Auto-advance to step 2
    renderAppCards();
    goWsStep(2);

  } catch (err) {
    errEl.textContent = 'Failed to connect: ' + err.message;
    errEl.classList.add('visible');
    input.classList.add('input-error');
  }

  btn.innerHTML = restoreDiscoverBtn();
  btn.disabled = false;
}

function restoreDiscoverBtn() {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Discover';
}

// Enter key triggers discover
document.getElementById('wsRootDir').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); discoverWorkspace(); }
});

// ─── WS Step 2: App Cards ──────────

function renderAppCards() {
  var container = document.getElementById('wsAppCards');
  container.innerHTML = '';

  if (WS.apps.length === 0) {
    container.innerHTML = '<div class="ws-empty-state">' +
      '<div class="ws-empty-state-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg></div>' +
      '<h3>No apps discovered</h3>' +
      '<p>Ensure each app has a <code>package.json</code> with <code>react</code> as a dependency and a Vite config file.</p>' +
    '</div>';
    return;
  }

  WS.apps.forEach(function(app, i) {
    var card = document.createElement('div');
    var roleClass = app.role === 'host' ? ' ws-role-host' : (app.role === 'remote' ? ' ws-role-remote' : '');
    card.className = 'ws-app-card' + roleClass + (app.checked ? ' selected' : '');
    card.id = 'wsCard' + i;
    card.setAttribute('role', 'group');
    card.setAttribute('aria-label', app.name + ' configuration');

    var statusBadge = app.hasFederation
      ? makeBadge('MF configured', 'green')
      : makeBadge('New', 'yellow');

    var rolePill = app.role === 'host'
      ? '<span class="ws-role-pill ws-role-pill-host" id="wsRolePill' + i + '">HOST</span>'
      : (app.role === 'remote'
        ? '<span class="ws-role-pill ws-role-pill-remote" id="wsRolePill' + i + '">REMOTE</span>'
        : '<span id="wsRolePill' + i + '"></span>');

    var roleOptions = '<option value="">Select role...</option>'
      + '<option value="remote"' + (app.role === 'remote' ? ' selected' : '') + '>Remote — exposes modules</option>'
      + '<option value="host"' + (app.role === 'host' ? ' selected' : '') + '>Host — consumes remotes</option>';

    var btOptions = [
      { v: 'chrome89', l: 'chrome89 (recommended)' },
      { v: 'esnext', l: 'esnext (latest ES)' },
      { v: 'es2022', l: 'es2022' },
      { v: 'es2021', l: 'es2021' },
      { v: 'es2020', l: 'es2020' },
    ].map(function(bt) {
      return '<option value="' + bt.v + '"' + (app.buildTarget === bt.v ? ' selected' : '') + '>' + bt.l + '</option>';
    }).join('');

    // Build exposes rows (remote role)
    var exposesHtml = '';
    var exposesObj = app.exposes || {};
    var exposesKeys = Object.keys(exposesObj);
    for (var ei = 0; ei < exposesKeys.length; ei++) {
      exposesHtml += wsExposeRow(i, exposesKeys[ei], exposesObj[exposesKeys[ei]], ei);
    }

    // Build remotes rows (host role)
    var remotesHtml = '';
    var remotesObj = app.remotes || {};
    var remotesKeys = Object.keys(remotesObj);
    for (var ri = 0; ri < remotesKeys.length; ri++) {
      var rEntry = typeof remotesObj[remotesKeys[ri]] === 'string' ? remotesObj[remotesKeys[ri]] : remotesObj[remotesKeys[ri]].entry || remotesObj[remotesKeys[ri]];
      remotesHtml += wsRemoteRow(i, remotesKeys[ri], rEntry, ri);
    }

    var chevronSvg = '<svg class="ws-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>';

    card.innerHTML =
      '<div class="ws-app-card-header" onclick="wsToggleCardExpand(' + i + ')">' +
        '<input type="checkbox"' + (app.checked ? ' checked' : '') + ' onchange="wsToggleApp(' + i + ', this.checked)" onclick="event.stopPropagation()" aria-label="Include ' + esc(app.name) + '" />' +
        '<div class="ws-app-card-title">' +
          '<div class="ws-app-card-title-row">' +
            '<span class="ws-app-card-name">' + esc(app.name) + '</span>' +
            rolePill +
            '<div class="ws-app-card-badges">' + statusBadge + '</div>' +
            '<span class="ws-card-error-dot" id="wsCardError' + i + '" style="display:none;" title="Has validation errors">!</span>' +
          '</div>' +
          '<div class="ws-app-card-dir">' + esc(app.dir) + '</div>' +
        '</div>' +
        chevronSvg +
      '</div>' +
      '<div class="ws-app-card-collapse" id="wsCardBody' + i + '">' +
        '<div class="ws-app-card-body">' +
          '<div class="ws-field ws-field-role">' +
            '<span class="ws-field-label">Role <span class="ws-required">*</span></span>' +
            '<select aria-label="Role for ' + esc(app.name) + '" onchange="wsUpdateField(' + i + ', \\'role\\', this.value); wsToggleRoleSections(' + i + ', this.value)">' + roleOptions + '</select>' +
          '</div>' +
          '<div class="ws-field">' +
            '<span class="ws-field-label">Federation Name <span class="ws-required">*</span></span>' +
            '<input type="text" value="' + esc(app.name) + '" oninput="wsUpdateField(' + i + ', \\'name\\', this.value)" placeholder="my_app" aria-label="Federation name for ' + esc(app.name) + '" />' +
          '</div>' +
          '<div class="ws-field">' +
            '<span class="ws-field-label">Port <span class="ws-required">*</span></span>' +
            '<input type="text" value="' + esc(app.port) + '" oninput="wsUpdateField(' + i + ', \\'port\\', this.value)" placeholder="5001" aria-label="Port for ' + esc(app.name) + '" />' +
          '</div>' +
          '<div class="ws-field">' +
            '<span class="ws-field-label">Build Target</span>' +
            '<select aria-label="Build target for ' + esc(app.name) + '" onchange="wsUpdateField(' + i + ', \\'buildTarget\\', this.value)">' + btOptions + '</select>' +
          '</div>' +
          '<div class="ws-field" style="grid-column: 1 / -1; display:flex; gap:16px; flex-wrap:wrap;">' +
            '<label style="display:inline-flex;align-items:center;gap:6px;margin:0;font-size:13px;cursor:pointer;">' +
              '<input type="checkbox" id="wsManifest' + i + '"' + (app.manifest ? ' checked' : '') + ' onchange="wsUpdateField(' + i + ', \\'manifest\\', this.checked)" />' +
              '<span>Manifest</span>' +
              '<small class="text-lighter" style="font-size:11px;">mf-manifest.json</small>' +
            '</label>' +
            '<label style="display:inline-flex;align-items:center;gap:6px;margin:0;font-size:13px;cursor:pointer;">' +
              '<input type="checkbox" id="wsDts' + i + '"' + (app.dts ? ' checked' : '') + ' onchange="wsUpdateField(' + i + ', \\'dts\\', this.checked)" />' +
              '<span>TypeScript DTS</span>' +
              '<small class="text-lighter" style="font-size:11px;">auto-generate types</small>' +
            '</label>' +
          '</div>' +
        '</div>' +
        // ── Exposes section (remote) ──
        '<div id="wsExposes' + i + '" class="ws-role-section" style="display:' + (app.role === 'remote' ? 'block' : 'none') + ';">' +
          '<div class="ws-role-section-header">' +
            '<span class="ws-field-label">Exposed Modules</span>' +
            '<div style="display:flex;gap:6px;">' +
              '<button type="button" class="ws-add-btn" onclick="wsOpenWsPicker(' + i + ', \\'expose\\')" title="Browse components">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> Browse' +
              '</button>' +
              '<button type="button" class="ws-add-btn" onclick="wsAddExpose(' + i + ')" title="Add expose manually">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div id="wsExposeRows' + i + '">' + exposesHtml + '</div>' +
          (exposesKeys.length === 0
            ? '<div class="ws-empty-hint" id="wsExposesEmpty' + i + '">' +
                '<div class="ws-empty-hint-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18M9 21V9"/></svg></div>' +
                '<div class="ws-empty-hint-text"><strong>No modules exposed</strong><br/>Click <em>Browse</em> to scan files or <em>Add</em> to configure manually.</div>' +
              '</div>'
            : '<div class="ws-empty-hint" id="wsExposesEmpty' + i + '" style="display:none;"></div>') +
        '</div>' +
        // ── Remotes section (host) ──
        '<div id="wsRemotes' + i + '" class="ws-role-section" style="display:' + (app.role === 'host' ? 'block' : 'none') + ';">' +
          '<div class="ws-role-section-header">' +
            '<span class="ws-field-label">Remote Applications</span>' +
            '<div style="display:flex;gap:6px;">' +
              '<button type="button" class="ws-add-btn" onclick="wsAddRemote(' + i + ')" title="Add remote">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div id="wsRemoteRows' + i + '">' + remotesHtml + '</div>' +
          '<div id="wsAutoLinkHint' + i + '" class="ws-auto-link-section" style="display:' + (app.role === 'host' ? 'block' : 'none') + ';">' +
            '<button type="button" class="ws-link-btn" onclick="wsAutoLinkRemotes(' + i + ')">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Auto-link workspace remotes' +
            '</button>' +
          '</div>' +
          (remotesKeys.length === 0
            ? '<div class="ws-empty-hint" id="wsRemotesEmpty' + i + '">' +
                '<div class="ws-empty-hint-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>' +
                '<div class="ws-empty-hint-text"><strong>No remotes configured</strong><br/>Click <em>Add</em> to enter manually or <em>Auto-link</em> to connect workspace remotes.</div>' +
              '</div>'
            : '<div class="ws-empty-hint" id="wsRemotesEmpty' + i + '" style="display:none;"></div>') +
        '</div>' +
      '</div>';

    container.appendChild(card);
  });

  updateWsSelectedCount();
  validateWsApps();
}

function wsToggleApp(i, checked) {
  WS.apps[i].checked = checked;
  var card = document.getElementById('wsCard' + i);
  if (card) {
    card.classList.toggle('selected', checked);
    // Collapse unchecked cards to save space; expand when re-checked
    if (!checked) {
      card.classList.add('collapsed');
    } else {
      card.classList.remove('collapsed');
    }
  }
  updateWsSelectedCount();
  validateWsApps();
}

function wsToggleCardExpand(i) {
  var card = document.getElementById('wsCard' + i);
  if (!card) return;
  card.classList.toggle('collapsed');
}

function wsToggleAll() {
  var allChecked = document.getElementById('wsSelectAll').checked;
  WS.apps.forEach(function(app, i) {
    app.checked = allChecked;
    var cb = document.querySelector('#wsCard' + i + ' input[type="checkbox"]');
    if (cb) cb.checked = allChecked;
    var card = document.getElementById('wsCard' + i);
    if (card) {
      card.classList.toggle('selected', allChecked);
      if (allChecked) {
        card.classList.remove('collapsed');
      } else {
        card.classList.add('collapsed');
      }
    }
  });
  updateWsSelectedCount();
  validateWsApps();
}

function wsUpdateField(i, field, value) {
  WS.apps[i][field] = value;
  validateWsApps();
}

// ── Trash icon SVG ──
var wsTrashSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';

// ── Expose row HTML helper ──
function wsExposeRow(appIdx, key, localPath, rowIdx) {
  return '<div class="ws-entry-row" id="wsExposeRow' + appIdx + '_' + rowIdx + '">' +
    '<input type="text" value="' + esc(key) + '" placeholder="./components" class="ws-entry-key" ' +
      'oninput="wsUpdateExpose(' + appIdx + ', this, \\'key\\', ' + rowIdx + ')" />' +
    '<span class="ws-entry-arrow">→</span>' +
    '<input type="text" value="' + esc(localPath) + '" placeholder="./src/components/index.ts" class="ws-entry-val" ' +
      'oninput="wsUpdateExpose(' + appIdx + ', this, \\'val\\', ' + rowIdx + ')" />' +
    '<button type="button" class="ws-remove-btn" onclick="wsConfirmRemoveExpose(' + appIdx + ', ' + rowIdx + ')" title="Remove module">' +
      wsTrashSvg +
    '</button>' +
  '</div>';
}

// ── Remote row HTML helper ──
function wsRemoteRow(appIdx, name, entry, rowIdx) {
  return '<div class="ws-entry-row" id="wsRemoteRow' + appIdx + '_' + rowIdx + '">' +
    '<input type="text" value="' + esc(name) + '" placeholder="remote-name" class="ws-entry-key" ' +
      'oninput="wsUpdateRemote(' + appIdx + ', this, \\'name\\', ' + rowIdx + ')" />' +
    '<span class="ws-entry-arrow">→</span>' +
    '<input type="text" value="' + esc(entry) + '" placeholder="http://localhost:5001/remoteEntry.js" class="ws-entry-val ws-entry-url" ' +
      'oninput="wsUpdateRemote(' + appIdx + ', this, \\'entry\\', ' + rowIdx + ')" />' +
    '<button type="button" class="ws-remove-btn" onclick="wsConfirmRemoveRemote(' + appIdx + ', ' + rowIdx + ')" title="Remove remote">' +
      wsTrashSvg +
    '</button>' +
  '</div>';
}

// ── Show/hide exposes and remotes when role changes ──
function wsToggleRoleSections(appIdx, role) {
  var exposesSection = document.getElementById('wsExposes' + appIdx);
  var remotesSection = document.getElementById('wsRemotes' + appIdx);
  var autoLinkHint = document.getElementById('wsAutoLinkHint' + appIdx);

  if (exposesSection) exposesSection.style.display = role === 'remote' ? 'block' : 'none';
  if (remotesSection) remotesSection.style.display = role === 'host' ? 'block' : 'none';
  if (autoLinkHint) autoLinkHint.style.display = role === 'host' ? 'block' : 'none';

  // Update role-based card styling
  var card = document.getElementById('wsCard' + appIdx);
  if (card) {
    card.classList.remove('ws-role-host', 'ws-role-remote');
    if (role === 'host') card.classList.add('ws-role-host');
    else if (role === 'remote') card.classList.add('ws-role-remote');
  }

  // Update role pill in card header (fixes stale pill after dropdown change)
  var pill = document.getElementById('wsRolePill' + appIdx);
  if (pill) {
    if (role === 'host') {
      pill.className = 'ws-role-pill ws-role-pill-host';
      pill.textContent = 'HOST';
    } else if (role === 'remote') {
      pill.className = 'ws-role-pill ws-role-pill-remote';
      pill.textContent = 'REMOTE';
    } else {
      pill.className = '';
      pill.textContent = '';
    }
  }

  // Initialize exposes/remotes objects if not present
  if (role === 'remote' && !WS.apps[appIdx].exposes) {
    WS.apps[appIdx].exposes = {};
  }
  if (role === 'host' && !WS.apps[appIdx].remotes) {
    WS.apps[appIdx].remotes = {};
  }
}

// ── Delete confirmation dialog ──
function wsShowConfirm(title, message, onConfirm) {
  var overlay = document.createElement('div');
  overlay.className = 'ws-confirm-overlay';
  overlay.innerHTML =
    '<div class="ws-confirm-box">' +
      '<h4>' + title + '</h4>' +
      '<p>' + message + '</p>' +
      '<div class="ws-confirm-actions">' +
        '<button class="ws-confirm-cancel" type="button">Cancel</button>' +
        '<button class="ws-confirm-delete" type="button">Remove</button>' +
      '</div>' +
    '</div>';

  overlay.querySelector('.ws-confirm-cancel').onclick = function() {
    overlay.remove();
  };
  overlay.querySelector('.ws-confirm-delete').onclick = function() {
    overlay.remove();
    onConfirm();
  };
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  overlay.querySelector('.ws-confirm-cancel').focus();
}

// ── Confirm + remove expose ──
function wsConfirmRemoveExpose(appIdx, rowIdx) {
  var app = WS.apps[appIdx];
  var keys = Object.keys(app.exposes || {});
  var keyName = keys[rowIdx] || 'this module';
  wsShowConfirm(
    'Remove Exposed Module',
    'Are you sure you want to remove <code>' + esc(keyName) + '</code> from <strong>' + esc(app.name) + '</strong>?',
    function() { wsRemoveExpose(appIdx, rowIdx); }
  );
}

// ── Confirm + remove remote ──
function wsConfirmRemoveRemote(appIdx, rowIdx) {
  var app = WS.apps[appIdx];
  var keys = Object.keys(app.remotes || {});
  var keyName = keys[rowIdx] || 'this remote';
  wsShowConfirm(
    'Remove Remote',
    'Are you sure you want to remove remote <code>' + esc(keyName) + '</code> from <strong>' + esc(app.name) + '</strong>?',
    function() { wsRemoveRemote(appIdx, rowIdx); }
  );
}

// ── Add new expose entry ──
function wsAddExpose(appIdx) {
  var app = WS.apps[appIdx];
  if (!app.exposes) app.exposes = {};

  var existingCount = Object.keys(app.exposes).length;
  var defaultKey = existingCount === 0 ? './components' : './module' + (existingCount + 1);
  var defaultVal = existingCount === 0 ? './src/components/index.ts' : './src/index.ts';

  app.exposes[defaultKey] = defaultVal;

  var container = document.getElementById('wsExposeRows' + appIdx);
  container.insertAdjacentHTML('beforeend', wsExposeRow(appIdx, defaultKey, defaultVal, existingCount));

  var emptyHint = document.getElementById('wsExposesEmpty' + appIdx);
  if (emptyHint) emptyHint.style.display = 'none';

  showToast('Expose entry added to ' + app.name, 'success');
}

// ── Remove expose entry ──
function wsRemoveExpose(appIdx, rowIdx) {
  var app = WS.apps[appIdx];
  var keys = Object.keys(app.exposes || {});
  var removedKey = keys[rowIdx] || '';
  if (keys[rowIdx]) {
    delete app.exposes[keys[rowIdx]];
  }
  wsRerenderExposes(appIdx);
  showToast('Removed expose ' + removedKey + ' from ' + app.name, 'info');
}

// ── Update expose entry from input ──
function wsUpdateExpose(appIdx, inputEl, field, rowIdx) {
  var app = WS.apps[appIdx];
  var keys = Object.keys(app.exposes || {});
  var oldKey = keys[rowIdx];

  if (field === 'key') {
    // Rename key
    var val = app.exposes[oldKey];
    delete app.exposes[oldKey];
    app.exposes[inputEl.value] = val;
  } else {
    // Update value
    app.exposes[oldKey] = inputEl.value;
  }
}

// ── Re-render expose rows ──
function wsRerenderExposes(appIdx) {
  var app = WS.apps[appIdx];
  var container = document.getElementById('wsExposeRows' + appIdx);
  var html = '';
  var keys = Object.keys(app.exposes || {});
  for (var i = 0; i < keys.length; i++) {
    html += wsExposeRow(appIdx, keys[i], app.exposes[keys[i]], i);
  }
  container.innerHTML = html;

  var emptyHint = document.getElementById('wsExposesEmpty' + appIdx);
  if (emptyHint) {
    if (keys.length === 0) {
      emptyHint.style.display = 'flex';
      emptyHint.innerHTML =
        '<div class="ws-empty-hint-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18M9 21V9"/></svg></div>' +
        '<div class="ws-empty-hint-text"><strong>No modules exposed</strong><br/>Click <em>Browse</em> to scan files or <em>Add</em> to configure manually.</div>';
    } else {
      emptyHint.style.display = 'none';
    }
  }
}

// ── Add new remote entry ──
function wsAddRemote(appIdx) {
  var app = WS.apps[appIdx];
  if (!app.remotes) app.remotes = {};

  var existingCount = Object.keys(app.remotes).length;
  var defaultName = 'remote' + (existingCount + 1);
  var defaultEntry = 'http://localhost:' + (5001 + existingCount) + '/remoteEntry.js';

  app.remotes[defaultName] = defaultEntry;

  var container = document.getElementById('wsRemoteRows' + appIdx);
  container.insertAdjacentHTML('beforeend', wsRemoteRow(appIdx, defaultName, defaultEntry, existingCount));

  var emptyHint = document.getElementById('wsRemotesEmpty' + appIdx);
  if (emptyHint) emptyHint.style.display = 'none';

  showToast('Remote entry added to ' + app.name, 'success');
}

// ── Remove remote entry ──
function wsRemoveRemote(appIdx, rowIdx) {
  var app = WS.apps[appIdx];
  var keys = Object.keys(app.remotes || {});
  var removedKey = keys[rowIdx] || '';
  if (keys[rowIdx]) {
    delete app.remotes[keys[rowIdx]];
  }
  wsRerenderRemotes(appIdx);
  showToast('Removed remote ' + removedKey + ' from ' + app.name, 'info');
}

// ── Update remote entry from input ──
function wsUpdateRemote(appIdx, inputEl, field, rowIdx) {
  var app = WS.apps[appIdx];
  var keys = Object.keys(app.remotes || {});
  var oldKey = keys[rowIdx];

  if (field === 'name') {
    var val = app.remotes[oldKey];
    delete app.remotes[oldKey];
    app.remotes[inputEl.value] = val;
  } else {
    app.remotes[oldKey] = inputEl.value;
  }
}

// ── Re-render remote rows ──
function wsRerenderRemotes(appIdx) {
  var app = WS.apps[appIdx];
  var container = document.getElementById('wsRemoteRows' + appIdx);
  var html = '';
  var keys = Object.keys(app.remotes || {});
  for (var i = 0; i < keys.length; i++) {
    var entry = typeof app.remotes[keys[i]] === 'string' ? app.remotes[keys[i]] : app.remotes[keys[i]].entry || '';
    html += wsRemoteRow(appIdx, keys[i], entry, i);
  }
  container.innerHTML = html;

  var emptyHint = document.getElementById('wsRemotesEmpty' + appIdx);
  if (emptyHint) {
    if (keys.length === 0) {
      emptyHint.style.display = 'flex';
      emptyHint.innerHTML =
        '<div class="ws-empty-hint-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div>' +
        '<div class="ws-empty-hint-text"><strong>No remotes configured</strong><br/>Click <em>Add</em> to enter manually or <em>Auto-link</em> to connect workspace remotes.</div>';
    } else {
      emptyHint.style.display = 'none';
    }
  }
}

// ── Auto-link workspace remotes to a host ──
function wsAutoLinkRemotes(appIdx) {
  var app = WS.apps[appIdx];
  if (!app.remotes) app.remotes = {};

  var linked = 0;
  for (var i = 0; i < WS.apps.length; i++) {
    var other = WS.apps[i];
    if (i === appIdx) continue;
    if (other.role !== 'remote') continue;
    if (!other.checked) continue;

    var remoteName = other.name || other.dir;
    if (app.remotes[remoteName]) continue; // already linked

    var port = other.port || '5001';
    app.remotes[remoteName] = 'http://localhost:' + port + '/remoteEntry.js';
    linked++;
  }

  if (linked > 0) {
    showToast('Linked ' + linked + ' remote(s) to ' + app.name, 'success');
  } else {
    showToast('No new remotes to link (check that other apps have role "remote")', 'info');
  }

  wsRerenderRemotes(appIdx);
}

// ═══════════════════════════════════════════════════════════════════════════
// Workspace Component Picker (reuses single-project picker dialog)
// ═══════════════════════════════════════════════════════════════════════════

var wsPickerAppIdx = -1;
var wsPickerMode = ''; // 'expose' or 'remote'

async function wsOpenWsPicker(appIdx, mode) {
  wsPickerAppIdx = appIdx;
  wsPickerMode = mode;

  var app = WS.apps[appIdx];
  var dir = WS.rootDir ? (WS.rootDir + '/' + app.dir) : app.dir;

  // Reuse the single-project picker dialog
  var dialog = document.getElementById('pickerDialog');
  dialog.showModal();

  pickerSelected = new Set();
  updatePickerCount();

  document.getElementById('pickerList').innerHTML = '<div class="browser-loading"><span class="spinner" role="status"></span> Scanning ' + esc(app.name) + '...</div>';
  document.getElementById('pickerSearch').value = '';

  try {
    var res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir: dir }),
    });
    var data = await res.json();

    if (!data.success) {
      document.getElementById('pickerList').innerHTML = '<div class="browser-empty">' + esc(data.error) + '</div>';
      return;
    }

    pickerFiles = data.files;

    // Pre-select files already in the exposes list for this app
    if (app.exposes) {
      var expVals = Object.values(app.exposes);
      for (var ei = 0; ei < expVals.length; ei++) {
        if (expVals[ei]) pickerSelected.add(expVals[ei]);
      }
    }

    renderPickerList('');
    updatePickerCount();
    setTimeout(function() { document.getElementById('pickerSearch').focus(); }, 100);

  } catch (err) {
    document.getElementById('pickerList').innerHTML = '<div class="browser-empty">Scan failed: ' + esc(err.message) + '</div>';
  }
}

// Unified addPickedExposes — handles both single-project and workspace modes.
// In workspace mode (wsPickerAppIdx >= 0), adds to a specific app's exposes.
// In single-project mode, adds to the global S.exposes list.
function addPickedExposes() {
  if (wsPickerAppIdx >= 0) {
    // Workspace mode: add to specific app
    var app = WS.apps[wsPickerAppIdx];
    if (!app.exposes) app.exposes = {};

    var fileMap = {};
    for (var fi = 0; fi < pickerFiles.length; fi++) {
      fileMap[pickerFiles[fi].relativePath] = pickerFiles[fi].suggestedKey;
    }

    var existingPaths = {};
    var expKeys = Object.keys(app.exposes);
    for (var ek = 0; ek < expKeys.length; ek++) {
      existingPaths[app.exposes[expKeys[ek]]] = true;
    }

    var added = 0;
    pickerSelected.forEach(function(p) {
      if (existingPaths[p]) return;
      var key = fileMap[p] || './' + p.replace(/^\\.\\//,'').replace(/^src\\//, '').replace(/\\.[^.]+$/, '');
      app.exposes[key] = p;
      added++;
    });

    wsRerenderExposes(wsPickerAppIdx);
    closePicker();
    showToast(added + ' module(s) added to ' + app.name, 'success');

    wsPickerAppIdx = -1;
    wsPickerMode = '';
    return;
  }

  // Single-project mode fallback
  var fileMap2 = {};
  for (var f2 = 0; f2 < pickerFiles.length; f2++) {
    fileMap2[pickerFiles[f2].relativePath] = pickerFiles[f2].suggestedKey;
  }

  var existingPaths2 = {};
  for (var s2 = 0; s2 < S.exposes.length; s2++) {
    existingPaths2[S.exposes[s2].value] = true;
  }

  pickerSelected.forEach(function(p) {
    if (existingPaths2[p]) return;
    S.exposes.push({
      key: fileMap2[p] || './' + p.replace(/^\\.\\//,'').replace(/^src\\//, '').replace(/\\.[^.]+$/, ''),
      value: p,
    });
  });

  renderExposes();
  validateStep2();
  closePicker();
  showToast(pickerSelected.size + ' module(s) added', 'success');
}

function updateWsSelectedCount() {
  var count = WS.apps.filter(function(a) { return a.checked; }).length;
  document.getElementById('wsSelectedCount').textContent = count + ' app(s) selected';
  document.getElementById('wsSelectAll').checked = count === WS.apps.length;
}

function validateWsApps() {
  var valid = true;
  var hasSelected = false;
  var selectedCount = 0;

  for (var i = 0; i < WS.apps.length; i++) {
    var app = WS.apps[i];
    if (!app.checked) {
      // Clear error dot for unchecked cards
      var dot = document.getElementById('wsCardError' + i);
      if (dot) dot.style.display = 'none';
      continue;
    }
    hasSelected = true;
    selectedCount++;

    var cardValid = validateWsCard(i);
    if (!cardValid) valid = false;
  }

  if (!hasSelected) valid = false;

  // Dynamic button text with count
  var btn = document.getElementById('wsStep2Next');
  btn.disabled = !valid;
  if (selectedCount > 0) {
    btn.innerHTML = 'Review ' + selectedCount + ' App' + (selectedCount !== 1 ? 's' : '') +
      ' <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }

  return valid;
}

function validateWsCard(i) {
  var app = WS.apps[i];
  var valid = true;
  var body = document.getElementById('wsCardBody' + i);
  if (!body) return true;

  var selects = body.querySelectorAll('.ws-app-card-body select');
  var inputs = body.querySelectorAll('.ws-app-card-body input[type="text"]');

  // Role validation (first select = role dropdown)
  if (selects[0]) {
    if (!app.role) {
      selects[0].classList.add('ws-input-error');
      valid = false;
    } else {
      selects[0].classList.remove('ws-input-error');
    }
  }

  // Name validation (first text input)
  if (inputs[0]) {
    var name = app.name;
    if (!name || !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      inputs[0].classList.add('ws-input-error');
      valid = false;
    } else {
      inputs[0].classList.remove('ws-input-error');
    }
  }

  // Port validation (second text input)
  if (inputs[1]) {
    var port = app.port;
    if (!port) {
      inputs[1].classList.add('ws-input-error');
      valid = false;
    } else {
      var portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
        inputs[1].classList.add('ws-input-error');
        valid = false;
      } else {
        inputs[1].classList.remove('ws-input-error');
      }
    }
  }

  // Show/hide error indicator dot on card header
  var errorDot = document.getElementById('wsCardError' + i);
  if (errorDot) {
    errorDot.style.display = valid ? 'none' : 'inline-flex';
  }

  return valid;
}

// ─── WS Step 3: Review ──────────

function buildWsReview() {
  var selected = WS.apps.filter(function(a) { return a.checked; });

  var html = '<div class="review-section">';
  html += '<h3>Workspace Summary</h3>';
  html += '<div class="review-row"><span class="review-key">Root directory</span><span class="review-val">' + esc(WS.rootDir) + '</span></div>';
  html += '<div class="review-row"><span class="review-key">Apps to configure</span><span class="review-val">' + selected.length + '</span></div>';
  html += '<div class="review-row"><span class="review-key">Skip install</span><span class="review-val">' + (document.getElementById('wsNoInstall').checked ? 'Yes' : 'No') + '</span></div>';
  html += '</div>';

  html += '<table class="ws-review-table">';
  html += '<thead><tr><th>App</th><th>Role</th><th>Port</th><th>Build Target</th><th>Advanced</th><th>Exposes / Remotes</th><th>Dir</th></tr></thead>';
  html += '<tbody>';
  for (var i = 0; i < selected.length; i++) {
    var app = selected[i];
    var roleLabel = app.role === 'remote' ? '<span class="badge outline" style="padding:2px 8px;">remote</span>'
                  : '<span class="badge success" style="padding:2px 8px;">host</span>';

    // Build exposes/remotes summary with improved display
    var modulesSummary = '';
    if (app.role === 'remote' && app.exposes) {
      var expKeys = Object.keys(app.exposes);
      if (expKeys.length > 0) {
        modulesSummary = '<span class="ws-review-module-count ws-review-count-expose">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9h18M9 21V9"/></svg> ' +
          expKeys.length + ' expose' + (expKeys.length > 1 ? 's' : '') + '</span>';
        modulesSummary += '<div class="ws-review-modules">';
        for (var ei = 0; ei < expKeys.length; ei++) {
          modulesSummary += '<div class="ws-review-module-row">' +
            '<span class="ws-review-module-key">' + esc(expKeys[ei]) + '</span>' +
            '<span class="ws-review-module-arrow">→</span>' +
            '<span class="ws-review-module-val">' + esc(app.exposes[expKeys[ei]]) + '</span>' +
          '</div>';
        }
        modulesSummary += '</div>';
      } else {
        modulesSummary = '<span style="color:var(--muted-foreground);font-size:12px;font-style:italic;">No exposes configured</span>';
      }
    } else if (app.role === 'host' && app.remotes) {
      var remKeys = Object.keys(app.remotes);
      if (remKeys.length > 0) {
        modulesSummary = '<span class="ws-review-module-count ws-review-count-remote">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> ' +
          remKeys.length + ' remote' + (remKeys.length > 1 ? 's' : '') + '</span>';
        modulesSummary += '<div class="ws-review-modules">';
        for (var ri = 0; ri < remKeys.length; ri++) {
          var rVal = typeof app.remotes[remKeys[ri]] === 'string' ? app.remotes[remKeys[ri]] : (app.remotes[remKeys[ri]].entry || '');
          modulesSummary += '<div class="ws-review-module-row">' +
            '<span class="ws-review-module-key">' + esc(remKeys[ri]) + '</span>' +
            '<span class="ws-review-module-arrow">→</span>' +
            '<span class="ws-review-module-val">' + esc(rVal) + '</span>' +
          '</div>';
        }
        modulesSummary += '</div>';
      } else {
        modulesSummary = '<span style="color:var(--muted-foreground);font-size:12px;font-style:italic;">No remotes configured</span>';
      }
    } else {
      modulesSummary = '<span style="color:var(--muted-foreground);font-size:12px;">—</span>';
    }

    // Advanced options badges
    var advBadges = '';
    if (app.manifest) advBadges += '<span class="badge outline" style="padding:1px 6px;font-size:10px;">manifest</span> ';
    if (app.dts) advBadges += '<span class="badge outline" style="padding:1px 6px;font-size:10px;">dts</span> ';
    if (!advBadges) advBadges = '<span style="color:var(--muted-foreground);font-size:11px;">—</span>';

    html += '<tr>';
    html += '<td><strong>' + esc(app.name) + '</strong></td>';
    html += '<td>' + roleLabel + '</td>';
    html += '<td class="mono-cell">' + esc(app.port) + '</td>';
    html += '<td class="mono-cell">' + esc(app.buildTarget) + '</td>';
    html += '<td>' + advBadges + '</td>';
    html += '<td>' + modulesSummary + '</td>';
    html += '<td class="mono-cell">' + esc(app.dir) + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table>';

  // Check for port conflicts
  var ports = {};
  var conflicts = [];
  for (var j = 0; j < selected.length; j++) {
    var p = selected[j].port;
    if (ports[p]) {
      conflicts.push(p + ' (' + ports[p] + ' & ' + selected[j].name + ')');
    }
    ports[p] = selected[j].name;
  }
  if (conflicts.length > 0) {
    html += '<div class="review-section" style="border-color:rgba(239,68,68,0.3);">';
    html += '<h3 style="color:var(--danger);">Port Conflicts</h3>';
    for (var k = 0; k < conflicts.length; k++) {
      html += '<p style="color:var(--danger);font-size:13px;">Port ' + esc(conflicts[k]) + '</p>';
    }
    html += '</div>';
  }

  document.getElementById('wsReviewContent').innerHTML = html;
}

// ─── WS Step 4: Apply ──────────

async function applyWorkspace() {
  var btn = document.getElementById('wsApplyBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Applying...';
  showToast('Configuring workspace apps...', 'info');

  var noInstall = document.getElementById('wsNoInstall').checked;
  var selected = WS.apps.filter(function(a) { return a.checked; });

  var payload = {
    apps: selected.map(function(app) {
      var exposesMap = {};
      if (app.role === 'remote' && app.exposes) {
        exposesMap = app.exposes;
      }
      var remotesList = [];
      if (app.role === 'host' && app.remotes) {
        remotesList = Object.entries(app.remotes).map(function(entry) {
          var entryVal = typeof entry[1] === 'string' ? entry[1] : (entry[1].entry || '');
          return { name: entry[0], port: '', entry: entryVal };
        });
      }

      return {
        projectDir: WS.rootDir + '/' + app.dir,
        role: app.role,
        name: app.name,
        port: app.port,
        buildTarget: app.buildTarget,
        noInstall: noInstall,
        exposes: app.role === 'remote' ? exposesMap : undefined,
        remotes: app.role === 'host' ? remotesList : undefined,
        manifest: app.manifest || undefined,
        dts: app.dts || undefined,
      };
    }),
  };

  try {
    var res = await fetch('/api/workspace/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    var data = await res.json();

    // Show results
    buildWsResults(data.results);
    buildWsNextSteps(selected);

    if (data.success) {
      showToast('All apps configured successfully!', 'success');
      document.getElementById('wsSuccessMsg').textContent = 'All ' + selected.length + ' app(s) have been configured.';
    } else {
      var failCount = data.results.filter(function(r) { return !r.success; }).length;
      showToast(failCount + ' app(s) failed. Check results below.', 'error', 6000);
      document.getElementById('wsSuccessMsg').textContent = 'Some apps failed to configure.';
    }

    goWsStep(4);
  } catch (err) {
    showToast('Request failed: ' + err.message, 'error', 6000);
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Apply to All Apps';
    btn.disabled = false;
  }
}

function buildWsResults(results) {
  var container = document.getElementById('wsResults');
  var html = '';

  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    var statusClass = r.success ? 'success' : 'failed';
    var icon = r.success
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    html += '<div class="ws-result-item ' + statusClass + '">';
    html += '<div class="ws-result-icon">' + icon + '</div>';
    html += '<span class="ws-result-name">' + esc(r.name) + '</span>';
    if (r.error) {
      html += '<span class="ws-result-error">' + esc(r.error) + '</span>';
    } else {
      html += '<span style="color:var(--success);font-size:12px;">Configured</span>';
    }
    html += '</div>';
  }

  container.innerHTML = html;
}

function buildWsNextSteps(apps) {
  var html = '<h3>Next steps</h3>';
  html += '<code>cd ' + esc(WS.rootDir) + '</code>';

  // Show "start remotes first, then hosts"
  var remotes = apps.filter(function(a) { return a.role === 'remote'; });
  var hosts = apps.filter(function(a) { return a.role === 'host'; });

  if (remotes.length > 0) {
    html += '<code><span style="color:var(--muted-foreground)"># Start remotes first:</span></code>';
    for (var i = 0; i < remotes.length; i++) {
      html += '<code>cd ' + esc(remotes[i].dir) + ' && ' + (remotes[i].packageManager === 'npm' ? 'npm run dev' : remotes[i].packageManager + ' dev') + '</code>';
    }
  }
  if (hosts.length > 0) {
    html += '<code><span style="color:var(--muted-foreground)"># Then start hosts:</span></code>';
    for (var j = 0; j < hosts.length; j++) {
      html += '<code>cd ' + esc(hosts[j].dir) + ' && ' + (hosts[j].packageManager === 'npm' ? 'npm run dev' : hosts[j].packageManager + ' dev') + '</code>';
    }
  }

  html += '<code><span style="color:var(--muted-foreground)"># Or use: mfx dev</span></code>';

  document.getElementById('wsNextSteps').innerHTML = html;
}

// ─── Workspace Browser ──────────

function openWsBrowser() {
  // Reuse the browser dialog but redirect selection to workspace root input
  window._wsBrowserMode = true;

  var dialog = document.getElementById('browserDialog');
  dialog.showModal();

  var currentVal = document.getElementById('wsRootDir').value.trim();
  navigateTo(currentVal || '');
}

// Patch selectBrowserDir to support workspace mode
var _origSelectBrowserDir = selectBrowserDir;
selectBrowserDir = function() {
  if (window._wsBrowserMode) {
    if (browserCurrentDir) {
      if (browserNavTimer) clearTimeout(browserNavTimer);
      document.getElementById('wsRootDir').value = browserCurrentDir;
      document.getElementById('browserDialog').close();
      window._wsBrowserMode = false;
      discoverWorkspace();
    }
  } else {
    _origSelectBrowserDir();
  }
};

// ─── Workspace Reset ──────────

function resetWorkspace() {
  WS.currentStep = 1;
  WS.rootDir = '';
  WS.apps = [];
  WS.selectedApps = [];

  document.getElementById('wsRootDir').value = '';
  document.getElementById('wsDiscoveredInfo').style.display = 'none';
  document.getElementById('wsAppCards').innerHTML = '';
  document.getElementById('wsSelectAll').checked = true;
  document.getElementById('wsNoInstall').checked = false;
  document.getElementById('wsStep2Next').disabled = true;

  var applyBtn = document.getElementById('wsApplyBtn');
  applyBtn.disabled = false;
  applyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Apply to All Apps';

  goWsStep(1);
  setTimeout(function() { document.getElementById('wsRootDir').focus(); }, 300);
}
`;
}
