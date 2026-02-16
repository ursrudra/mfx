/** Live validation, helpers, and help panel scripts. */
export function getValidationScripts(): string {
  return `// ═══════════════════════════════════════════════════════════════════════════
// Live Validation Utilities
// ═══════════════════════════════════════════════════════════════════════════

function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function setFieldState(inputEl, errorEl, state, message) {
  inputEl.classList.remove('input-error', 'input-valid');
  if (errorEl) {
    errorEl.classList.remove('visible');
    errorEl.className = errorEl.className.replace(' form-success', '').replace('form-success', '');
  }

  if (state === 'error') {
    inputEl.classList.add('input-error');
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.className = errorEl.className.replace(' form-success', '');
      if (!errorEl.classList.contains('form-error')) errorEl.classList.add('form-error');
      errorEl.classList.add('visible');
    }
  } else if (state === 'valid') {
    inputEl.classList.add('input-valid');
    if (errorEl && message) {
      errorEl.textContent = message;
      errorEl.className = errorEl.className.replace('form-error', 'form-success');
      errorEl.classList.add('visible');
    }
  }
  // 'neutral' — just reset (no classes added)
}

// ─── Individual field validators ──────────
function validateFedNameField() {
  const el = document.getElementById('fedName');
  const errEl = document.getElementById('fedNameError');
  const val = el.value.trim();

  if (!val) {
    setFieldState(el, errEl, 'neutral');
    return false;
  }
  if (!/^[a-zA-Z]/.test(val)) {
    setFieldState(el, errEl, 'error', 'Must start with a letter.');
    return false;
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(val)) {
    setFieldState(el, errEl, 'error', 'Only letters, digits, hyphens, and underscores allowed.');
    return false;
  }
  if (val.length < 2) {
    setFieldState(el, errEl, 'error', 'Name must be at least 2 characters.');
    return false;
  }
  setFieldState(el, errEl, 'valid', 'Looks good!');
  return true;
}

function validatePortField() {
  const el = document.getElementById('fedPort');
  const errEl = document.getElementById('fedPortError');
  const val = el.value.trim();

  if (!val) {
    setFieldState(el, errEl, 'neutral');
    return false;
  }
  const num = parseInt(val, 10);
  if (isNaN(num)) {
    setFieldState(el, errEl, 'error', 'Must be a number.');
    return false;
  }
  if (num < 1024) {
    setFieldState(el, errEl, 'error', 'Port must be at least 1024 (ports below are reserved).');
    return false;
  }
  if (num > 65535) {
    setFieldState(el, errEl, 'error', 'Port must be at most 65535.');
    return false;
  }
  // Check for common conflicts
  const commonPorts = { 3000: 'React default', 3001: 'common dev', 8080: 'common dev', 4173: 'Vite preview' };
  const hint = commonPorts[num] ? ' (commonly used by ' + commonPorts[num] + ')' : '';
  setFieldState(el, errEl, 'valid', 'Port ' + num + ' OK' + hint);
  return true;
}

function validateExposeRow(i) {
  const rows = document.querySelectorAll('#exposesList .entry-row');
  if (i >= rows.length) return;
  const inputs = rows[i].querySelectorAll('input');
  const keyInput = inputs[0];
  const valInput = inputs[1];

  // Key validation
  const key = S.exposes[i].key;
  if (key && !key.startsWith('./')) {
    keyInput.classList.add('input-error');
    keyInput.title = 'Expose path should start with ./';
  } else {
    keyInput.classList.remove('input-error');
    keyInput.title = '';
  }

  // Value validation
  const val = S.exposes[i].value;
  if (val && !val.startsWith('./')) {
    valInput.classList.add('input-error');
    valInput.title = 'Local file path should start with ./';
  } else {
    valInput.classList.remove('input-error');
    valInput.title = '';
  }
}

function validateRemoteRow(i) {
  const rows = document.querySelectorAll('#remotesList .entry-row');
  if (i >= rows.length) return;
  const inputs = rows[i].querySelectorAll('input');
  const nameInput = inputs[0];
  const portInput = inputs[1];
  const entryInput = inputs[2];

  // Name validation
  const name = S.remotes[i].name;
  if (name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    nameInput.classList.add('input-error');
    nameInput.title = 'Must start with a letter, then alphanumeric/hyphens/underscores.';
  } else {
    nameInput.classList.remove('input-error');
    nameInput.title = '';
  }

  // Port validation
  const port = S.remotes[i].port;
  if (port) {
    const pNum = parseInt(port, 10);
    if (isNaN(pNum) || pNum < 1024 || pNum > 65535) {
      portInput.classList.add('input-error');
      portInput.title = 'Port must be 1024\u201365535';
    } else {
      portInput.classList.remove('input-error');
      portInput.title = '';
    }
  }

  // Entry URL validation
  const entry = S.remotes[i].entry;
  if (entry && !/^https?:\\/\\//.test(entry)) {
    entryInput.classList.add('input-error');
    entryInput.title = 'Entry URL must start with http:// or https://';
  } else if (entry && !entry.endsWith('.js') && !entry.endsWith('.mjs')) {
    entryInput.classList.add('input-error');
    entryInput.title = 'Entry URL typically ends with .js or .mjs (e.g. remoteEntry.js)';
  } else {
    entryInput.classList.remove('input-error');
    entryInput.title = '';
  }
}

// Wire up live validation with debounce
const debouncedValidateName = debounce(function() {
  validateFedNameField();
  validateStep2();
}, 200);

const debouncedValidatePort = debounce(function() {
  validatePortField();
  validateStep2();
}, 200);

document.getElementById('fedName').addEventListener('input', debouncedValidateName);
document.getElementById('fedPort').addEventListener('input', debouncedValidatePort);

// Also validate on blur (immediate, no debounce)
document.getElementById('fedName').addEventListener('blur', function() {
  validateFedNameField();
  validateStep2();
});
document.getElementById('fedPort').addEventListener('blur', function() {
  validatePortField();
  validateStep2();
});

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeBadge(text, color) {
  var oatClass = { green: 'success', yellow: 'warning', blue: 'outline' };
  return '<span class="badge ' + (oatClass[color] || 'outline') + '">' + esc(text) + '</span>';
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ═══════════════════════════════════════════════════════════════════════════
// Help Panel
// ═══════════════════════════════════════════════════════════════════════════

function toggleHelp() {
  const panel = document.getElementById('helpPanel');
  const backdrop = document.getElementById('helpBackdrop');
  const isOpen = panel.classList.contains('open');

  if (isOpen) {
    closeHelp();
  } else {
    panel.classList.add('open');
    backdrop.classList.add('open');
    document.addEventListener('keydown', helpEscHandler);
  }
}

function closeHelp() {
  document.getElementById('helpPanel').classList.remove('open');
  document.getElementById('helpBackdrop').classList.remove('open');
  document.removeEventListener('keydown', helpEscHandler);
}

function helpEscHandler(e) {
  if (e.key === 'Escape') closeHelp();
}

// Global keyboard shortcut: ? to toggle help (only when not focused on an input)
document.addEventListener('keydown', function(e) {
  if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    toggleHelp();
  }
});
`;
}
