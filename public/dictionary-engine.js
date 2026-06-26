// ============================================================
// Dilxhan.com — dictionary-engine.js
// The easter-egg/dictionary interaction system:
//   - looks up a typed word against /api/dictionary/lookup
//   - HIT (easter_egg)    -> floating reveal at a random empty spot
//   - HIT (hobby_project) -> pulse the matching tile instead
//   - MISS                -> dry message, rare alt after streak
//   - tracks a persisted "discovered" counter (localStorage)
// ============================================================

(function () {
  const STORAGE_KEY = 'dilxhan-discovered-words';
  const REVEAL_LIFETIME_MS = 4200;
  const FADE_DURATION_MS = 500;

  // Detected once — touch devices skip mouseenter/mouseleave handlers
  // entirely (see spawnFloatingReveal) rather than relying only on
  // CSS to suppress :hover, since synthetic mouse events fired by
  // touch browsers on tap can still trigger JS mouse listeners even
  // when CSS :hover is suppressed, causing a brief, confusing flicker
  // of the tooltip before the real tap-to-open logic takes over.
  const IS_TOUCH_DEVICE = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  let missStreak = 0;
  let discoveredWords = loadDiscovered();

  // ---------- Persisted discovery counter ----------

  function loadDiscovered() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (err) {
      return new Set();
    }
  }

  function saveDiscovered() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(discoveredWords)));
    } catch (err) {
      // localStorage unavailable (private mode, etc.) — fail silently,
      // the counter just won't persist this session.
    }
  }

  function markDiscovered(word) {
    const isNew = !discoveredWords.has(word);
    discoveredWords.add(word);
    if (isNew) saveDiscovered();
    return isNew;
  }

  function getDiscoveredCount() {
    return discoveredWords.size;
  }

  // ---------- Floating reveal placement ----------
  // Picks a random position that avoids the hero, socials, tiles,
  // and prompt — uses their actual bounding boxes so this stays
  // correct across screen sizes rather than guessing fixed zones.

  function getOccupiedRects() {
    const selectors = ['.hero', '.socials', '.tiles', '.prompt'];
    return selectors
      .map((sel) => document.querySelector(sel))
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect());
  }

  function rectsOverlap(a, b, padding = 16) {
    return !(
      a.right + padding < b.left ||
      a.left - padding > b.right ||
      a.bottom + padding < b.top ||
      a.top - padding > b.bottom
    );
  }

  function pickRandomPosition(itemSize = 40) {
    const occupied = getOccupiedRects();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 24;

    for (let attempt = 0; attempt < 30; attempt++) {
      const x = margin + Math.random() * (vw - margin * 2 - itemSize);
      const y = margin + Math.random() * (vh - margin * 2 - itemSize);
      const candidate = { left: x, right: x + itemSize, top: y, bottom: y + itemSize };

      const overlaps = occupied.some((rect) => rectsOverlap(candidate, rect));
      if (!overlaps) return { x, y };
    }

    // Fallback after repeated failed attempts: corner of the viewport,
    // which is rarely occupied by primary content.
    return { x: margin, y: margin };
  }

  // ---------- Floating reveal lifecycle ----------

  function spawnFloatingReveal({ icon, fact, quote }) {
    const layer = document.getElementById('reveal-layer');
    if (!layer) return;

    const { x, y } = pickRandomPosition();

    const item = document.createElement('div');
    item.className = 'reveal-item is-entering';
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;

    const iconMarkup =
      (window.__dilxhan && window.__dilxhan.iconMarkup && window.__dilxhan.iconMarkup(icon)) ||
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>';
    item.innerHTML = iconMarkup;

    const tooltip = document.createElement('div');
    tooltip.className = 'reveal-item__tooltip';
    tooltip.innerHTML = `${escapeHtml(fact)}${
      quote ? `<span class="reveal-item__tooltip-quote">${escapeHtml(quote)}</span>` : ''
    }`;
    item.appendChild(tooltip);

    // Edge-aware positioning: a 200px-wide tooltip centered above a
    // 40px icon extends ~80px past each side of the icon, and ~? px
    // above it. If the icon sits near a viewport edge, flip the
    // anchor so the tooltip never clips off-screen.
    const tooltipWidth = 200;
    const tooltipEstHeight = 90; // rough card height incl. quote line
    const spaceLeftOfCenter = x + 20 - (tooltipWidth / 2);
    const spaceRightOfCenter = (window.innerWidth - (x + 20)) - (tooltipWidth / 2);

    if (spaceLeftOfCenter < 12) {
      tooltip.classList.add('tooltip-align-left');
    } else if (spaceRightOfCenter < 12) {
      tooltip.classList.add('tooltip-align-right');
    }

    if (y - tooltipEstHeight < 12) {
      tooltip.classList.add('tooltip-below');
    }

    layer.appendChild(item);

    // Force a layout flush before adding is-visible, so the browser
    // registers the initial opacity:0 state first and the transition
    // to opacity:1 actually animates instead of snapping in instantly.
    requestAnimationFrame(() => {
      item.classList.add('is-visible');
    });

    function fadeAndRemove() {
      item.classList.remove('is-entering', 'is-visible');
      item.classList.add('is-fading');
      setTimeout(() => {
        document.removeEventListener('click', handleOutsideTap);
        item.remove();
      }, FADE_DURATION_MS);
    }

    let handleOutsideTap = null;

    if (IS_TOUCH_DEVICE) {
      // Touch: deliberately simple, two states only.
      //   - tap the icon -> tooltip opens, auto-fade is cancelled
      //     outright (not paused/resumable — fully stopped)
      //   - tap anywhere else -> tooltip closes, THEN a fresh
      //     fade-out timer starts from zero
      // No shared timer state between these two paths, so there's
      // no window where one path's cleanup can race the other's.
      let autoFadeTimeoutId = setTimeout(fadeAndRemove, REVEAL_LIFETIME_MS);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (autoFadeTimeoutId) {
          clearTimeout(autoFadeTimeoutId);
          autoFadeTimeoutId = null;
        }
        document.querySelectorAll('.reveal-item__tooltip.is-open').forEach((t) => {
          if (t !== tooltip) t.classList.remove('is-open');
        });
        tooltip.classList.add('is-open');
      });

      handleOutsideTap = (e) => {
        if (item.contains(e.target)) return;
        if (tooltip.classList.contains('is-open')) {
          tooltip.classList.remove('is-open');
          autoFadeTimeoutId = setTimeout(fadeAndRemove, REVEAL_LIFETIME_MS);
        }
      };
      document.addEventListener('click', handleOutsideTap);
    } else {
      // Desktop: hover shows the tooltip (CSS :hover) and pauses the
      // auto-fade for as long as the cursor stays on the icon;
      // leaving resumes the countdown from zero.
      let autoFadeTimeoutId = setTimeout(fadeAndRemove, REVEAL_LIFETIME_MS);

      item.addEventListener('mouseenter', () => {
        if (autoFadeTimeoutId) {
          clearTimeout(autoFadeTimeoutId);
          autoFadeTimeoutId = null;
        }
      });

      item.addEventListener('mouseleave', () => {
        autoFadeTimeoutId = setTimeout(fadeAndRemove, REVEAL_LIFETIME_MS);
      });
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ---------- Miss handling ----------

  function showMissMessage(message) {
    // Reuses the prompt's typewriter element for a brief moment to
    // show the miss response, then lets the normal typewriter resume.
    // Simpler alternative to adding a whole new UI element for what
    // is, by design, a low-key/dry response.
    const el = document.getElementById('prompt-typewriter');
    if (!el) return;

    const field = document.querySelector('.prompt__field');
    field?.classList.add('is-occupied'); // hide the normal typewriter loop briefly
    el.style.display = 'block';
    el.textContent = message;

    setTimeout(() => {
      el.textContent = '';
      el.style.display = '';
      field?.classList.remove('is-occupied');
      window.dispatchEvent(new CustomEvent('dilxhan:prompt-reset'));
    }, 1600);
  }

  // ---------- Main lookup ----------

  async function lookup(rawWord) {
    const word = rawWord.trim().toLowerCase();
    if (!word) return;

    try {
      const res = await fetch(
        `/api/dictionary/lookup?word=${encodeURIComponent(word)}&miss_streak=${missStreak}`
      );
      const data = await res.json();

      if (data.hit) {
        missStreak = 0;
        markDiscovered(word);

        if (data.type === 'hobby_project') {
          if (window.__dilxhan && typeof window.__dilxhan.pulseTile === 'function') {
            window.__dilxhan.pulseTile(data.dictionaryKey || word);
          }
        } else {
          spawnFloatingReveal({ icon: data.icon, fact: data.fact, quote: data.quote });
        }

        // Touch devices: close the custom keyboard so the reveal/pulse
        // is actually visible, not hidden behind it. Misses deliberately
        // don't fire this — keep the keyboard open so the user can
        // immediately try another word without re-tapping the input.
        window.dispatchEvent(new CustomEvent('dilxhan:dictionary-hit'));
      } else {
        missStreak += 1;
        showMissMessage(data.message || '...nothing here.');
      }
    } catch (err) {
      console.error('Dictionary lookup failed', err);
    }
  }

  window.__dilxhanDictionary = { lookup, getDiscoveredCount };
})();
