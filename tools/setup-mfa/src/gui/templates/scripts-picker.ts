/** Component picker dialog scripts. */
export function getPickerScripts(): string {
  return `// ═══════════════════════════════════════════════════════════════════════════
// Component Picker
// ═══════════════════════════════════════════════════════════════════════════

let pickerFiles = [];
let pickerSelected = new Set();

async function openComponentPicker() {
  var dialog = document.getElementById('pickerDialog');
  dialog.showModal();

  pickerSelected = new Set();
  updatePickerCount();

  const dir = document.getElementById('projectDir').value.trim();
  if (!dir) {
    document.getElementById('pickerList').innerHTML = '<div class="browser-empty">No project detected. Go back to Step 1 and detect a project first.</div>';
    return;
  }

  document.getElementById('pickerList').innerHTML = '<div class="browser-loading"><span class="spinner"></span> Scanning project files...</div>';
  document.getElementById('pickerSearch').value = '';

  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir }),
    });
    const data = await res.json();

    if (!data.success) {
      document.getElementById('pickerList').innerHTML = '<div class="browser-empty">' + esc(data.error) + '</div>';
      return;
    }

    pickerFiles = data.files;

    // Pre-select files already in the exposes list
    for (const exp of S.exposes) {
      if (exp.value) pickerSelected.add(exp.value);
    }

    renderPickerList('');
    updatePickerCount();
    setTimeout(function() { document.getElementById('pickerSearch').focus(); }, 100);

  } catch (err) {
    document.getElementById('pickerList').innerHTML = '<div class="browser-empty">Scan failed: ' + esc(err.message) + '</div>';
  }
}

function closePicker() {
  var dialog = document.getElementById('pickerDialog');
  dialog.close();
}

// Close picker dialog on backdrop click
document.getElementById('pickerDialog').addEventListener('click', function(e) {
  if (e.target === this) this.close();
});

document.getElementById('pickerSearch').addEventListener('input', function() {
  renderPickerList(this.value.trim().toLowerCase());
});

function renderPickerList(filter) {
  const listEl = document.getElementById('pickerList');
  listEl.innerHTML = '';

  const kindLabels = {
    component: 'Components',
    hook: 'Hooks',
    util: 'Utilities',
    page: 'Pages',
    index: 'Index Files',
    other: 'Other',
  };

  const kindIcons = {
    component: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>',
    hook: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
    util: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    page: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    index: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
    other: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
  };

  // Group by kind
  const groups = {};
  for (const f of pickerFiles) {
    // Apply search filter
    if (filter) {
      const haystack = (f.relativePath + ' ' + f.suggestedKey + ' ' + f.exports.join(' ')).toLowerCase();
      if (!haystack.includes(filter)) continue;
    }
    if (!groups[f.kind]) groups[f.kind] = [];
    groups[f.kind].push(f);
  }

  const kindOrder = ['component', 'hook', 'util', 'page', 'index', 'other'];
  let totalShown = 0;

  for (const kind of kindOrder) {
    const files = groups[kind];
    if (!files || files.length === 0) continue;

    // Group heading
    const heading = document.createElement('div');
    heading.className = 'picker-group-label';
    heading.textContent = (kindLabels[kind] || kind) + ' (' + files.length + ')';
    listEl.appendChild(heading);

    for (const f of files) {
      totalShown++;
      const item = document.createElement('button');
      item.className = 'picker-item';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', pickerSelected.has(f.relativePath) ? 'true' : 'false');
      item.setAttribute('data-path', f.relativePath);
      item.setAttribute('data-key', f.suggestedKey);

      // Checkbox
      const check = document.createElement('span');
      check.className = 'picker-check';
      check.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      item.appendChild(check);

      // Info
      const info = document.createElement('div');
      info.className = 'picker-info';

      const fileEl = document.createElement('div');
      fileEl.className = 'picker-file';
      fileEl.textContent = f.relativePath;
      info.appendChild(fileEl);

      if (f.exports.length > 0) {
        const exportsEl = document.createElement('div');
        exportsEl.className = 'picker-exports';
        exportsEl.textContent = 'exports: ' + f.exports.join(', ');
        info.appendChild(exportsEl);
      }

      item.appendChild(info);

      // Kind badge
      const kindBadge = document.createElement('span');
      kindBadge.className = 'picker-kind';
      kindBadge.setAttribute('data-kind', f.kind);
      kindBadge.textContent = f.kind;
      item.appendChild(kindBadge);

      // Click to toggle
      item.addEventListener('click', function() {
        const p = this.getAttribute('data-path');
        if (pickerSelected.has(p)) {
          pickerSelected.delete(p);
          this.setAttribute('aria-selected', 'false');
        } else {
          pickerSelected.add(p);
          this.setAttribute('aria-selected', 'true');
        }
        updatePickerCount();
      });

      listEl.appendChild(item);
    }
  }

  if (totalShown === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'browser-empty';
    emptyDiv.textContent = filter ? 'No files match "' + filter + '"' : 'No exposable files found in the project';
    listEl.appendChild(emptyDiv);
  }
}

function updatePickerCount() {
  const count = pickerSelected.size;
  document.getElementById('pickerCount').textContent = count + ' selected';
  document.getElementById('pickerAddBtn').disabled = count === 0;
}

// addPickedExposes is defined in scripts-workspace.ts as a single
// context-aware function that handles both single-project and workspace modes.
`;
}
