/** File browser dialog scripts. */
export function getBrowserScripts(): string {
  return `// ═══════════════════════════════════════════════════════════════════════════
// File Browser
// ═══════════════════════════════════════════════════════════════════════════

let browserCurrentDir = '';
let browserNavTimer = null;

function openBrowser() {
  var dialog = document.getElementById('browserDialog');
  dialog.showModal();

  const currentVal = document.getElementById('projectDir').value.trim();
  navigateTo(currentVal || '');
}

function closeBrowser() {
  var dialog = document.getElementById('browserDialog');
  dialog.close();
  document.getElementById('projectDir').focus();
}

// Close dialog on backdrop click
document.getElementById('browserDialog').addEventListener('click', function(e) {
  if (e.target === this) this.close();
});

async function navigateTo(dir) {
  const listEl = document.getElementById('browserList');
  const pathInput = document.getElementById('browserPathInput');
  const selectedEl = document.getElementById('browserSelected');
  const selectBtn = document.getElementById('browserSelectBtn');

  listEl.innerHTML = '<div class="browser-loading"><span class="spinner"></span> Loading...</div>';

  try {
    const res = await fetch('/api/browse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dir: dir || undefined }),
    });
    const data = await res.json();

    if (!data.success) {
      listEl.innerHTML = '<div class="browser-empty">' + esc(data.error || 'Could not read directory') + '</div>';
      return;
    }

    browserCurrentDir = data.current;
    pathInput.value = data.current;
    selectedEl.textContent = data.current;
    selectBtn.disabled = false;

    // Build list using DOM (avoids all escaping issues with paths)
    listEl.innerHTML = '';

    // Parent directory button
    if (data.parent) {
      const parentBtn = makeItem('..', data.parent, false, true);
      listEl.appendChild(parentBtn);
    }

    if (data.entries.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'browser-empty';
      emptyDiv.textContent = data.parent ? 'No subdirectories in this folder' : 'No subdirectories found';
      listEl.appendChild(emptyDiv);
    }

    const sep = data.current.includes('\\\\') ? '\\\\' : '/';
    const base = data.current.endsWith(sep) ? data.current : data.current + sep;

    for (const entry of data.entries) {
      const fullPath = base + entry.name;
      const item = makeItem(entry.name, fullPath, entry.hasPackageJson, false);
      listEl.appendChild(item);
    }

  } catch (err) {
    listEl.innerHTML = '<div class="browser-empty">Failed to load: ' + esc(err.message) + '</div>';
  }
}

function makeItem(name, fullPath, hasPackageJson, isParent) {
  const btn = document.createElement('button');
  btn.className = isParent ? 'browser-item parent-item' : (hasPackageJson ? 'browser-item has-pkg' : 'browser-item');
  btn.setAttribute('data-path', fullPath);
  btn.setAttribute('aria-label', name);

  // Icon
  const icon = document.createElement('span');
  icon.className = 'item-icon';
  if (isParent) {
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>';
  } else if (hasPackageJson) {
    icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--icon-accent, #818cf8)" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
  } else {
    icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>';
  }
  btn.appendChild(icon);

  // Name
  const nameSpan = document.createElement('span');
  nameSpan.className = 'item-name';
  nameSpan.textContent = name;
  btn.appendChild(nameSpan);

  // Badge
  if (hasPackageJson) {
    const badge = document.createElement('span');
    badge.className = 'item-badge';
    badge.textContent = 'project';
    btn.appendChild(badge);
  }

  // Single click: highlight, then navigate after a pause
  btn.addEventListener('click', function() {
    document.getElementById('browserSelected').textContent = fullPath;
    browserCurrentDir = fullPath;

    // Highlight
    document.querySelectorAll('.browser-item').forEach(function(b) { b.style.background = ''; });
    btn.style.background = 'color-mix(in srgb, var(--primary) 10%, transparent)';

    if (browserNavTimer) clearTimeout(browserNavTimer);
    browserNavTimer = setTimeout(function() { navigateTo(fullPath); }, 400);
  });

  // Double click: select and close immediately
  btn.addEventListener('dblclick', function() {
    if (browserNavTimer) clearTimeout(browserNavTimer);
    if (window._wsBrowserMode) {
      document.getElementById('wsRootDir').value = fullPath;
      document.getElementById('browserDialog').close();
      window._wsBrowserMode = false;
      discoverWorkspace();
    } else {
      document.getElementById('projectDir').value = fullPath;
      closeBrowser();
      detectProject();
    }
  });

  return btn;
}

function selectBrowserDir() {
  if (browserCurrentDir) {
    if (browserNavTimer) clearTimeout(browserNavTimer);
    document.getElementById('projectDir').value = browserCurrentDir;
    closeBrowser();
    detectProject();
  }
}

// Enter in path bar navigates
document.getElementById('browserPathInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    navigateTo(this.value);
  }
});
`;
}
