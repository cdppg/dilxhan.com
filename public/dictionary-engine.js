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

    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'reveal-item is-entering';
    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    item.setAttribute('aria-label', 'Discovered item — tap for details');

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
      setTimeout(() => item.remove(), FADE_DURATION_MS);
    }

    if (IS_TOUCH_DEVICE) {
      // Touch: explicit open/closed state via a class, NOT native
      // focus/blur. Native focus turned out to be fragile here —
      // closing the custom keyboard (which happens automatically when
      // a reveal is tapped, to avoid the two overlays colliding) was
      // enough to knock focus off the button in some cases, instantly
      // triggering blur's fade timer and closing the tooltip far
      // sooner than intended. Explicit state has no such side effects:
      // nothing other than this code ever touches `is-open`.
      let autoFadeTimeoutId = setTimeout(fadeAndRemove, REVEAL_LIFETIME_MS);
      let isOpen = false;

      function openTooltip() {
        if (autoFadeTimeoutId) {
          clearTimeout(autoFadeTimeoutId);
          autoFadeTimeoutId = null;
        }
        isOpen = true;
        tooltip.classList.add('is-open');
        // Close the custom keyboard if it happens to be open — having
        // both the keyboard and a tooltip open at once causes them to
        // visually collide (the tooltip can render on top of/inside
        // the keyboard depending on where the icon spawned). This is
        // now safe to do regardless of focus side effects, since the
        // tooltip's open state no longer depends on focus at all.
        window.dispatchEvent(new CustomEvent('dilxhan:dictionary-hit'));
      }

      function closeTooltip() {
        isOpen = false;
        tooltip.classList.remove('is-open');
        autoFadeTimeoutId = setTimeout(fadeAndRemove, REVEAL_LIFETIME_MS);
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isOpen) {
          closeTooltip();
        } else {
          // close any other open tooltip first, so only one shows at a time
          document.querySelectorAll('.reveal-item__tooltip.is-open').forEach((t) => {
            const otherItem = t.closest('.reveal-item');
            if (otherItem && otherItem !== item && otherItem.__dilxhanCloseTooltip) {
              otherItem.__dilxhanCloseTooltip();
            }
          });
          openTooltip();
        }
      });

      // Exposed so other reveal items can close THIS one when they
      // open (see the "close any other open tooltip" loop above).
      item.__dilxhanCloseTooltip = closeTooltip;

      document.addEventListener('click', (e) => {
        if (isOpen && !item.contains(e.target)) {
          closeTooltip();
        }
      });
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

  // ---------- Animation fact toast ----------
  // Shows the animation's fact line as a brief centered toast —
  // fully independent of the prompt and keyboard, so it stays
  // visible on mobile even after dilxhan:dictionary-hit closes
  // the touch keyboard and resets the prompt area.

  function showAnimationFact(text) {
    if (!text) return;

    const existing = document.getElementById('dilxhan-anim-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'dilxhan-anim-toast';
    toast.textContent = text;
    toast.style.cssText = [
      'position:fixed',
      'bottom:28px',
      'left:50%',
      'transform:translateX(-50%) translateY(8px)',
      'background:var(--text,#111)',
      'color:var(--bg,#fff)',
      'border:1px solid var(--text,#111)',
      'border-radius:999px',
      'padding:7px 18px',
      'font-size:13px',
      'font-family:inherit',
      'letter-spacing:0.01em',
      'white-space:nowrap',
      'pointer-events:none',
      'z-index:10000',
      'opacity:0',
      'transition:opacity 220ms ease, transform 220ms ease',
    ].join(';');

    document.body.appendChild(toast);

    // Force layout then fade in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(() => toast.remove(), 250);
    }, 2000);
  }

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
        } else if (data.type === 'animation') {
          // Show the fact as a floating toast (not via the prompt
          // typewriter) so it survives the keyboard-close on mobile.
          showAnimationFact(data.fact || '✦');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('dilxhan:animation', {
              detail: { key: data.animationKey },
            }));
          }, 600);
        } else {
          spawnFloatingReveal({ icon: data.icon, fact: data.fact, quote: data.quote });
        }

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
