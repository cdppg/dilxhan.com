// ============================================================
// Dilxhan.com — app.js
// Stage 1: fetch real content, render it, theme toggle, greeting.
// Hero animation + command palette wiring come in later passes.
// ============================================================

const ICONS = {
  instagram: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24"><path d="M16 3v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M16 3c0 2.5 2 4.5 4.5 4.5"/></svg>',
  email: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  github: '<svg viewBox="0 0 24 24"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2-.2 4.5-1 4.5-5 0-1.1-.4-2-1-2.7.1-.3.5-1.4-.1-2.8 0 0-1.1-.3-3.4 1.2-1-.3-2.1-.4-3-.4s-2 .1-3 .4C6.1 4.2 5 4.5 5 4.5c-.6 1.4-.2 2.5-.1 2.8-.6.7-1 1.7-1 2.7 0 4 2.5 4.8 4.5 5-.4.4-.4.8-.5 1.5V20"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z"/></svg>',
  puzzle: '<svg viewBox="0 0 24 24"><path d="M9 4h3a1 1 0 0 1 1 1 2 2 0 1 0 4 0 1 1 0 0 1 1-1h2v6a1 1 0 0 1-1 1 2 2 0 1 0 0 4 1 1 0 0 1 1 1v2h-6a1 1 0 0 1-1-1 2 2 0 1 0-4 0 1 1 0 0 1-1 1H4v-6a1 1 0 0 1 1-1 2 2 0 1 0 0-4A1 1 0 0 1 4 10V4z"/></svg>',
  code: '<svg viewBox="0 0 24 24"><path d="M9 18l-5-6 5-6M15 6l5 6-5 6"/></svg>',
  coffee: '<svg viewBox="0 0 24 24"><path d="M4 10h13v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-4z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c-.5 1 .5 1.5 0 2.5M12 3c-.5 1 .5 1.5 0 2.5"/></svg>',
  wave: '<svg viewBox="0 0 24 24"><path d="M3 12a4 4 0 0 0 4-4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0 4 4M3 18a4 4 0 0 0 4-4 4 4 0 0 0 4 4 4 4 0 0 0 4-4 4 4 0 0 0 4 4"/></svg>',
  bean: '<svg viewBox="0 0 24 24"><path d="M7 17c-3-3-3-9 2-12 5-3 11 1 11 6 0 7-9 12-13 6z"/></svg>',
  bird: '<svg viewBox="0 0 24 24"><path d="M3 10s3-5 8-3c1-2 4-3 7-2-1 1-2 2-2 4 3 0 4 2 5 4-3-1-4 0-5 1 0 4-4 7-9 6 2-1 3-2 3-4-3 1-6 0-7-2 2 0 3-1 4-2-2 0-3-1-4-2z"/></svg>',
  tree: '<svg viewBox="0 0 24 24"><path d="M12 2l5 7h-3l4 6h-4v3h-4v-3H6l4-6H7l5-7z"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4-4 5-4 9a4 4 0 0 0 8 0c1 1 1.5 2.5 1.5 4A5.5 5.5 0 0 1 12 21 5.5 5.5 0 0 1 6.5 15c0-5 4-6 5.5-13z"/></svg>',
  dolphin: '<svg viewBox="0 0 24 24"><path d="M3 16c4-7 12-10 18-6-2 1-3 1-4 0 0 2-1 3-3 3 1 2 0 3-2 3-3 0-7-1-9 0z"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>',
  butterfly: '<svg viewBox="0 0 24 24"><path d="M12 4v16M12 9c-2-4-8-4-8 0s4 5 8 2M12 9c2-4 8-4 8 0s-4 5-8 2M12 15c-1.5-2-6-2-6 1s3 3 6 1M12 15c1.5-2 6-2 6 1s-3 3-6 1"/></svg>',
  virus: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
  lock: '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24"><path d="M12 2l1.5 6L20 10l-6.5 2L12 18l-1.5-6L4 10l6.5-2z"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14a8 8 0 1 1-8-9 6.5 6.5 0 0 0 8 9z"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  default: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
};

function iconMarkup(name) {
  return ICONS[name] || ICONS.default;
}

// ---------- Greeting ----------

function setGreeting() {
  const hour = new Date().getHours();
  let text;
  if (hour < 5) text = "you're up late.";
  else if (hour < 12) text = 'good morning.';
  else if (hour < 18) text = "hope today's productive.";
  else if (hour < 23) text = 'good evening.';
  else text = "you're up late.";

  document.getElementById('greeting').textContent = text;
}

// ---------- Theme ----------

function getStoredTheme() {
  return localStorage.getItem('dilxhan-theme');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('dilxhan-theme', theme);
}

function initTheme() {
  const stored = getStoredTheme();
  if (stored) {
    applyTheme(stored);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);

  if (window.__dilxhanHeroScene) {
    window.__dilxhanHeroScene.setMode(next, { flare: next === 'dark' });
  }
}

// ---------- Data fetching + rendering ----------

let socialsCache = [];

async function loadSocials() {
  try {
    const res = await fetch('/api/socials');
    const socials = await res.json();
    socialsCache = socials;
    const nav = document.getElementById('socials');
    nav.innerHTML = socials
      .map(
        (s) => `
        <a href="${s.url}" target="_blank" rel="noopener" data-label="${s.label.toLowerCase()}">
          ${iconMarkup(s.icon)}
        </a>`
      )
      .join('');
  } catch (err) {
    console.error('Failed to load socials', err);
  }
}

let hobbyProjectsCache = [];

// Mirrors the backend's normalize() in functions/api/dictionary/lookup.js —
// must stay in sync so a typed title and a rendered tile agree on the
// same key. This is what makes new projects "just work": add a row
// with any title, and both sides derive the same key from it automatically.
function normalizeForMatch(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function loadHobbyProjects() {
  try {
    const res = await fetch('/api/hobby-projects');
    const projects = await res.json();
    hobbyProjectsCache = projects;

    const container = document.getElementById('tiles');
    container.innerHTML = projects
      .map(
        (p) => `
        <button class="tile" data-id="${p.id}" data-dictionary-key="${normalizeForMatch(p.title)}" aria-label="${p.title}">
          ${iconMarkup(p.icon)}
        </button>`
      )
      .join('');

    container.querySelectorAll('.tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const project = hobbyProjectsCache.find((p) => String(p.id) === tile.dataset.id);
        if (project) openTilePopup(project);
      });
    });
  } catch (err) {
    console.error('Failed to load hobby projects', err);
  }
}

function openTilePopup(project) {
  document.getElementById('popup-title').textContent = project.title;
  document.getElementById('popup-desc').textContent = project.description || '';
  const link = document.getElementById('popup-link');
  link.href = project.url || '#';
  const popup = document.getElementById('tile-popup');
  popup.hidden = false;
}

function closeTilePopup() {
  document.getElementById('tile-popup').hidden = true;
}

function pulseTile(dictionaryKey) {
  const tile = document.querySelector(`.tile[data-dictionary-key="${dictionaryKey}"]`);
  if (!tile) return;
  tile.classList.remove('is-pulsing');
  // restart animation even if already pulsing
  void tile.offsetWidth;
  tile.classList.add('is-pulsing');
}

// ---------- Wiring ----------

function initEventListeners() {
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

  document.getElementById('tile-popup').addEventListener('click', (e) => {
    if (e.target.id === 'tile-popup') closeTilePopup();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeTilePopup();
      document.getElementById('shortcuts-overlay').hidden = true;

      const promptInput = document.getElementById('prompt-input');
      if (document.activeElement === promptInput) {
        promptInput.value = '';
        promptInput.blur();
        window.dispatchEvent(new CustomEvent('dilxhan:prompt-reset'));
      }
    }

    const isTypingInPrompt = document.activeElement === document.getElementById('prompt-input');
    if (!isTypingInPrompt && (e.key === 'd' || e.key === 'D') && !e.metaKey && !e.ctrlKey) {
      toggleTheme();
    }
  });
}

// ---------- Hero viewBox auto-fit ----------
// The SVG viewBox is set generously at first paint, then tightened
// to the *actual* rendered bounding box of "Dilxhan" (font metrics
// vary by font-loading timing/platform). This guarantees the hero
// fills its container width consistently rather than leaving
// unpredictable side padding baked into a guessed viewBox.

function fitHeroViewBox() {
  const svg = document.querySelector('.hero__svg');
  const textEl = document.querySelector('.hero__text-fallback');
  if (!svg || !textEl) return false;

  const bbox = textEl.getBBox();
  if (!bbox.width || !bbox.height) return false; // font not ready yet

  const marginX = bbox.width * 0.03;
  const marginY = bbox.height * 0.04; // minimal headroom; tight fit around the glyphs

  const vbX = bbox.x - marginX;
  const vbY = bbox.y - marginY;
  const vbW = bbox.width + marginX * 2;
  const vbH = bbox.height + marginY * 2;

  svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  return true;
}

function initHeroFit() {
  const hero = document.querySelector('.hero');

  function revealHero() {
    if (hero) hero.classList.add('is-fitted');
  }

  // Run once fonts are ready (Fraunces variable font), then once more
  // shortly after as a safety net — the FIRST fit can still land before
  // layout has fully reflowed even though fonts.ready resolved, so the
  // hero is only revealed after the safety-net re-fit, not the first
  // one. This guarantees the viewer never sees an intermediate/incorrect
  // viewBox state, only the final correct one.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      fitHeroViewBox();
      setTimeout(() => {
        fitHeroViewBox();
        revealHero();
      }, 150);
    });
  } else {
    setTimeout(() => {
      fitHeroViewBox();
      setTimeout(() => {
        fitHeroViewBox();
        revealHero();
      }, 150);
    }, 200);
  }
  window.addEventListener('resize', fitHeroViewBox);
}

initTheme();
setGreeting();
initEventListeners();
loadSocials();
loadHobbyProjects();
initHeroFit();

// Exposed for the next build pass (palette wiring) to reuse:
window.__dilxhan = {
  iconMarkup,
  pulseTile,
  hobbyProjectsCache: () => hobbyProjectsCache,
  get socialsCache() {
    return socialsCache;
  },
};
