/* =====================================================
   ADMIN PANEL — admin.js
   Password auth, config management, uploads
   ===================================================== */

'use strict';

// ============================================================
// CONSTANTS
// ============================================================
const STORAGE_KEY   = 'sorrySiteConfig';
const SESSION_KEY   = 'sorryAdminSession';
const DEFAULT_HASH  = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // admin123

// ============================================================
// STATE
// ============================================================
let config = {};
let currentSection = 'site';

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  checkSession();
  setupColorSync();
  setupDragDrop();
});

// ============================================================
// CONFIG LOADER
// ============================================================
async function loadConfig() {
  // Try to load from config.json
  try {
    const res = await fetch('config.json?t=' + Date.now());
    if (res.ok) config = await res.json();
  } catch (_) {
    config = getDefaultConfig();
  }

  // Merge local overrides
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    try {
      config = deepMerge(config, JSON.parse(local));
    } catch (_) {}
  }
}

function getDefaultConfig() {
  return {
    site: { status: 'ACTIVE', privateMessage: "This surprise isn't ready yet ❤️", maintenanceMessage: "We're sprinkling some extra magic... be back soon! ✨" },
    landing: { greeting: 'Hi ❤️', subtitle: 'Someone has a little surprise waiting for you.', buttonText: 'Open My Heart 💖' },
    game: { enabled: true, type: 'catch', requiredHearts: 20, countdownTime: 30, difficulty: 'normal' },
    apology: {
      girlfriendName: 'Sweetheart',
      message: "I know I hurt you.\n\nIf I could go back and change that moment, I would.\n\nYou deserve laughter, peace, and all the love in the world.\n\nThank you for being patient with someone who's still learning.\n\nI'm truly sorry.\n\nNo matter what happens, you'll always be someone incredibly special to me.\n\nI hope this little surprise made you smile even just a little.\n\nWill you forgive me? ❤️",
      finalYes: "You just made me the happiest person ❤️",
      finalWait: "That's okay.\n\nI'll wait.\n\nBecause you're worth waiting for."
    },
    music: { enabled: true, autoPlay: false, defaultTrack: 'assets/music/background.mp3' },
    theme: { mode: 'light', primary: '#FF85A1', secondary: '#C9B1FF', accent: '#FFD6E0', background: '#FFF5F7', text: '#5C3D5E', backgroundImage: '' },
    admin: { passwordHash: DEFAULT_HASH }
  };
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// ============================================================
// SESSION
// ============================================================
function checkSession() {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (session === 'authenticated') {
    showAdminPanel();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const password = document.getElementById('passwordInput').value;
  const hash = await sha256(password);
  const storedHash = config.admin?.passwordHash || DEFAULT_HASH;

  if (hash === storedHash) {
    sessionStorage.setItem(SESSION_KEY, 'authenticated');
    showAdminPanel();
  } else {
    const err = document.getElementById('loginError');
    err.classList.add('show');
    document.getElementById('passwordInput').value = '';
    setTimeout(() => err.classList.remove('show'), 3000);
  }
}

function handleLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

function showAdminPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  const panel = document.getElementById('adminPanel');
  panel.classList.add('visible');
  populateForm();
}

// ============================================================
// SHA-256 HASH
// ============================================================
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// POPULATE FORM
// ============================================================
function populateForm() {
  // Site
  const status = config.site?.status || 'ACTIVE';
  const radioId = 'status-' + status.toLowerCase();
  const radio = document.getElementById(radioId);
  if (radio) radio.checked = true;
  setVal('privateMsg',      config.site?.privateMessage    || '');
  setVal('maintenanceMsg',  config.site?.maintenanceMessage || '');

  // Landing
  setVal('landingGreeting', config.landing?.greeting   || '');
  setVal('landingSubtitle', config.landing?.subtitle   || '');
  setVal('landingButton',   config.landing?.buttonText || '');

  // Game
  setChecked('gameEnabled',     config.game?.enabled !== false);
  setVal('requiredHearts',      config.game?.requiredHearts || 20);
  setVal('countdownTime',       config.game?.countdownTime  || 30);
  setVal('gameDifficulty',      config.game?.difficulty     || 'normal');
  document.getElementById('heartsVal').textContent = config.game?.requiredHearts || 20;
  document.getElementById('timerVal').textContent  = config.game?.countdownTime  || 30;

  // Apology
  setVal('girlfriendName',  config.apology?.girlfriendName || '');
  setVal('apologyMessage',  config.apology?.message        || '');
  setVal('finalYes',        config.apology?.finalYes       || '');
  setVal('finalWait',       config.apology?.finalWait      || '');

  // Theme
  setVal('themeMode',         config.theme?.mode            || 'light');
  setColorVal('colorPrimary',    'colorPrimaryHex',    config.theme?.primary     || '#FF85A1');
  setColorVal('colorSecondary',  'colorSecondaryHex',  config.theme?.secondary   || '#C9B1FF');
  setColorVal('colorBackground', 'colorBackgroundHex', config.theme?.background  || '#FFF5F7');
  setColorVal('colorText',       'colorTextHex',       config.theme?.text        || '#5C3D5E');
  setVal('bgImageUrl', config.theme?.backgroundImage || '');

  // Music
  setChecked('musicEnabled',  config.music?.enabled   !== false);
  setChecked('musicAutoPlay', config.music?.autoPlay  === true);
  setVal('musicUrl',          config.music?.defaultTrack || '');

  // Update sidebar status
  updateStatusIndicator(status);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

function setColorVal(colorId, hexId, val) {
  const colorEl = document.getElementById(colorId);
  const hexEl   = document.getElementById(hexId);
  if (colorEl) colorEl.value = val;
  if (hexEl)   hexEl.value   = val;
}

// ============================================================
// COLOR SYNC
// ============================================================
function setupColorSync() {
  const pairs = [
    ['colorPrimary',    'colorPrimaryHex'],
    ['colorSecondary',  'colorSecondaryHex'],
    ['colorBackground', 'colorBackgroundHex'],
    ['colorText',       'colorTextHex'],
  ];

  pairs.forEach(([colorId, hexId]) => {
    const colorEl = document.getElementById(colorId);
    const hexEl   = document.getElementById(hexId);
    if (colorEl && hexEl) {
      colorEl.addEventListener('input', () => {
        hexEl.value = colorEl.value;
      });
    }
  });
}

function syncColor(colorId, hexVal) {
  if (/^#[0-9A-Fa-f]{6}$/.test(hexVal)) {
    const el = document.getElementById(colorId);
    if (el) el.value = hexVal;
  }
}

// ============================================================
// SAVE ALL SETTINGS
// ============================================================
function saveAllSettings() {
  // Collect all form values
  const statusRadio = document.querySelector('input[name="siteStatus"]:checked');

  const newConfig = {
    site: {
      status:             statusRadio?.value || 'ACTIVE',
      privateMessage:     getVal('privateMsg'),
      maintenanceMessage: getVal('maintenanceMsg'),
    },
    landing: {
      greeting:   getVal('landingGreeting'),
      subtitle:   getVal('landingSubtitle'),
      buttonText: getVal('landingButton'),
    },
    game: {
      enabled:       getChecked('gameEnabled'),
      requiredHearts: parseInt(getVal('requiredHearts')) || 20,
      countdownTime:  parseInt(getVal('countdownTime'))  || 30,
      difficulty:     getVal('gameDifficulty'),
    },
    apology: {
      girlfriendName: getVal('girlfriendName'),
      message:        getVal('apologyMessage'),
      finalYes:       getVal('finalYes'),
      finalWait:      getVal('finalWait'),
    },
    theme: {
      mode:            getVal('themeMode'),
      primary:         getVal('colorPrimaryHex')    || getVal('colorPrimary'),
      secondary:       getVal('colorSecondaryHex')  || getVal('colorSecondary'),
      background:      getVal('colorBackgroundHex') || getVal('colorBackground'),
      text:            getVal('colorTextHex')       || getVal('colorText'),
      backgroundImage: getVal('bgImageUrl'),
    },
    music: {
      enabled:      getChecked('musicEnabled'),
      autoPlay:     getChecked('musicAutoPlay'),
      defaultTrack: getVal('musicUrl') || 'assets/music/background.mp3',
    },
    admin: {
      passwordHash: config.admin?.passwordHash || DEFAULT_HASH,
    }
  };

  // Preserve any uploaded media data
  if (config._uploadedMusic)  newConfig._uploadedMusic  = config._uploadedMusic;
  if (config._uploadedImages) newConfig._uploadedImages = config._uploadedImages;

  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
  config = newConfig;

  // Update status indicator
  updateStatusIndicator(newConfig.site.status);

  // Show saved badge
  const badge = document.getElementById('saveBadge');
  badge.classList.add('show');
  setTimeout(() => badge.classList.remove('show'), 2000);

  showToast('Settings saved successfully! ✨', 'success');
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function updateStatusIndicator(status) {
  const dot  = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  dot.className = 'status-dot ' + status.toLowerCase();
  text.textContent = status.charAt(0) + status.slice(1).toLowerCase();
}

// ============================================================
// SIDEBAR NAVIGATION
// ============================================================
function showSection(name, btn) {
  // Hide all sections
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  // Show target
  const section = document.getElementById('section-' + name);
  if (section) section.classList.add('active');
  if (btn) btn.classList.add('active');

  // Update topbar title
  const titles = {
    site: '🌐 Site Control',
    landing: '🏠 Landing Page',
    game: '🎮 Game Settings',
    apology: '💌 Apology Letter',
    theme: '🎨 Theme & Colors',
    music: '🎵 Music Settings',
    media: '🖼️ Media & Uploads',
    security: '🔐 Password',
  };
  document.getElementById('topbarTitle').textContent = titles[name] || name;
  currentSection = name;

  // Close mobile sidebar
  document.getElementById('adminSidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('adminSidebar').classList.toggle('open');
}

// ============================================================
// PASSWORD CHANGE
// ============================================================
async function changePassword() {
  const current  = document.getElementById('currentPassword').value;
  const newPass  = document.getElementById('newPassword').value;
  const confirm  = document.getElementById('confirmPassword').value;
  const msgEl    = document.getElementById('passwordMsg');

  if (!current || !newPass || !confirm) {
    msgEl.style.color = '#FF8585';
    msgEl.textContent = '❌ Please fill in all fields.';
    return;
  }

  if (newPass !== confirm) {
    msgEl.style.color = '#FF8585';
    msgEl.textContent = '❌ New passwords do not match.';
    return;
  }

  if (newPass.length < 6) {
    msgEl.style.color = '#FF8585';
    msgEl.textContent = '❌ Password must be at least 6 characters.';
    return;
  }

  const currentHash = await sha256(current);
  const storedHash  = config.admin?.passwordHash || DEFAULT_HASH;

  if (currentHash !== storedHash) {
    msgEl.style.color = '#FF8585';
    msgEl.textContent = '❌ Current password is incorrect.';
    return;
  }

  const newHash = await sha256(newPass);
  config.admin = { passwordHash: newHash };

  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  saved.admin = { passwordHash: newHash };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

  msgEl.style.color = '#7FD4A8';
  msgEl.textContent = '✓ Password changed successfully!';
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value     = '';
  document.getElementById('confirmPassword').value = '';

  showToast('Password updated! 🔐', 'success');
}

// ============================================================
// RESET TO DEFAULTS
// ============================================================
function resetToDefaults() {
  if (!confirm('Are you sure? This will remove all customizations.')) return;
  localStorage.removeItem(STORAGE_KEY);
  config = getDefaultConfig();
  populateForm();
  showToast('Reset to defaults! 🔄', 'info');
}

// ============================================================
// MEDIA UPLOADS
// ============================================================
function handleMusicUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast('File too large! Use a URL for files over 10MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;

    // Save to config
    if (!config._uploadedMusic) config._uploadedMusic = [];
    config._uploadedMusic.push({ name: file.name, dataUrl });

    // Update music URL field
    document.getElementById('musicUrl').value = dataUrl;

    // Show chip
    addFileChip('uploadedMusic', file.name, () => {
      document.getElementById('musicUrl').value = '';
    });

    showToast(`Music uploaded: ${file.name} 🎵`, 'success');
  };
  reader.readAsDataURL(file);
}

function handleImageUpload(event) {
  const files = Array.from(event.target.files);

  files.forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 5MB)`, 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;

      if (!config._uploadedImages) config._uploadedImages = [];
      config._uploadedImages.push({ name: file.name, dataUrl });

      // Add chip
      addFileChip('uploadedImages', file.name, null);

      // Preview
      const grid = document.getElementById('imagePreviewGrid');
      const img  = document.createElement('img');
      img.src    = dataUrl;
      img.style.cssText = 'width:100%; height:100px; object-fit:cover; border-radius:8px; border:2px solid rgba(201,177,255,0.3); cursor:pointer;';
      img.title  = 'Click to copy URL';
      img.onclick = () => {
        navigator.clipboard.writeText(dataUrl).then(() => showToast('URL copied! 📋', 'success'));
      };
      grid.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function addFileChip(containerId, name, onRemove) {
  const container = document.getElementById(containerId);
  const chip = document.createElement('div');
  chip.className = 'uploaded-file-chip';
  chip.innerHTML = `${name} <span class="chip-remove" title="Remove">×</span>`;
  chip.querySelector('.chip-remove').onclick = () => {
    chip.remove();
    if (onRemove) onRemove();
  };
  container.appendChild(chip);
}

// ============================================================
// DRAG & DROP
// ============================================================
function setupDragDrop() {
  ['musicUploadArea', 'imageUploadArea'].forEach(id => {
    const area = document.getElementById(id);
    if (!area) return;

    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('drag-over');
    });

    area.addEventListener('dragleave', () => {
      area.classList.remove('drag-over');
    });

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('drag-over');
      // Handled by input change event
    });
  });
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', info: '💜' };

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `<span>${icons[type] || '💜'}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveAllSettings();
  }
});
