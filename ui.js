// UI helpers for Processing Grapher Web

export function initTabsAndSidebar(state) {
  const tabsDiv = document.getElementById('tabs');
  const tabList = [
    { id: 'serial', label: 'Serial' },
    { id: 'live', label: 'Live Graph' },
    { id: 'file', label: 'File Graph' },
    { id: 'settings', label: '⚙', class: 'settings', title: 'Settings' }
  ];
  tabList.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (tab.class ? ' ' + tab.class : '');
    btn.textContent = tab.label;
    btn.dataset.tab = tab.id;
    if (tab.title) btn.title = tab.title;
    if (tab.id === 'serial') btn.classList.add('active');
    btn.onclick = () => {
      if (tab.id === 'settings') {
        state.settings.openModal();
        return;
      }
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      state.switchTab(tab.id);
    };
    tabsDiv.appendChild(btn);
  });
}

export function showModal(html) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="background:#222;padding:2em 2em 1em 2em;border-radius:8px;min-width:320px;color:#fff;max-width:90vw;">
      ${html}
    </div>
  `;
  modal.classList.remove('hidden');
  modal.onclick = e => {
    if (e.target.id === 'modal' || e.target.classList.contains('close-modal')) {
      modal.classList.add('hidden');
      modal.innerHTML = '';
    }
  };
}

export function setStatusBar(text) {
  document.getElementById('status-bar').textContent = text;
}

export function setTheme(scheme) {
  // Monokai, Gravity, Celeste
  let root = document.documentElement;
  if (scheme === 'monokai') {
    root.style.setProperty('--background', '#282923');
    root.style.setProperty('--tabbar', '#181912');
    root.style.setProperty('--sidebar', '#181912');
    root.style.setProperty('--sidebar-heading', '#67d8ef');
    root.style.setProperty('--sidebar-accent', '#d02662');
    root.style.setProperty('--sidebar-button', '#5c5d5a');
    root.style.setProperty('--sidebar-text', '#fff');
    root.style.setProperty('--terminal-bg', '#1a1a1a');
  } else if (scheme === 'gravity') {
    root.style.setProperty('--background', '#282c34');
    root.style.setProperty('--tabbar', '#181a1f');
    root.style.setProperty('--sidebar', '#181a1f');
    root.style.setProperty('--sidebar-heading', '#61afef');
    root.style.setProperty('--sidebar-accent', '#d02662');
    root.style.setProperty('--sidebar-button', '#4c4d51');
    root.style.setProperty('--sidebar-text', '#fff');
    root.style.setProperty('--terminal-bg', '#21252b');
  } else {
    // Celeste (light)
    root.style.setProperty('--background', '#fff');
    root.style.setProperty('--tabbar', '#e5e5e5');
    root.style.setProperty('--sidebar', '#e5e5e5');
    root.style.setProperty('--sidebar-heading', '#228ec3');
    root.style.setProperty('--sidebar-accent', '#ff6ca0');
    root.style.setProperty('--sidebar-button', '#fff');
    root.style.setProperty('--sidebar-text', '#222');
    root.style.setProperty('--terminal-bg', '#f5f5f5');
  }
}