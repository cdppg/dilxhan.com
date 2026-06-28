// ============================================================
// Dilxhan.com — touch-keyboard.js
// A custom on-screen keyboard for touch devices, replacing the
// OS keyboard so the page never zooms/scrolls when the prompt is
// tapped (the real <input> uses inputmode="none" to suppress the
// native keyboard, while staying a normal, focusable input that
// command-palette.js / dictionary-engine.js don't need to know
// anything different about).
// ============================================================

(function () {
  const ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
    ['123', 'space', 'enter'],
  ];

  const NUMBER_ROW = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['#+=', '.', ',', '?', '!', "'", 'backspace'],
    ['abc', 'space', 'enter'],
  ];

  const SYMBOLS_ROW = [
    ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
    ['_', '\\', '|', '~', '<', '>', '€', '£', '¥', '•'],
    ['123', '.', ',', '?', '!', "'", 'backspace'],
    ['abc', 'space', 'enter'],
  ];

  let isShiftActive = false;
  let currentPage = 'letters'; // 'letters' | 'numbers' | 'symbols'
  let isOpen = false;
  let suppressOutsideClick = false; // true briefly during/after drag or resize,
                                     // so the gesture's trailing click isn't
                                     // mistaken for an outside-tap-to-close

  // Remembers where the user last left the keyboard (position + size
  // + scale), in-memory only — resets to the default layout on a full
  // page reload, but persists across repeated open/close within the
  // same session. Null until the user actually drags or resizes once.
  let savedLayout = null; // { left, top, width, scale } | null

  function isTouchDevice() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  function getInput() {
    return document.getElementById('prompt-input');
  }

  function keyLabel(key) {
    const labels = {
      shift: '⇧',
      backspace: '⌫',
      enter: '⏎',
      space: ' ',
      '123': '123',
      abc: 'ABC',
      '#+=': '#+=',
    };
    if (labels[key]) return labels[key];
    return isShiftActive ? key.toUpperCase() : key;
  }

  const WIDE_KEY_IDS = {
    shift: 'shift',
    backspace: 'backspace',
    '123': '123',
    abc: 'abc',
    '#+=': 'symbols',
    space: 'space',
    enter: 'enter',
  };

  function keyClass(key) {
    const id = WIDE_KEY_IDS[key];
    return id ? `touch-key touch-key--${id}` : 'touch-key';
  }

  function clampIntoValidBounds(kb) {
    // Used after page switches (letters/numbers/symbols can have
    // different heights) — keeps the keyboard fully on-screen
    // WITHOUT resetting user drag/resize position. Only the actual
    // viewport edges constrain this now, not the tiles row — the
    // user may have deliberately dragged the keyboard below the
    // tiles, and a page switch shouldn't fight that placement.
    const rect = kb.getBoundingClientRect();
    const bottomLimit = window.innerHeight - 4;

    if (rect.bottom > bottomLimit) {
      kb.style.top = `${Math.max(4, bottomLimit - rect.height)}px`;
    }
    if (rect.right > window.innerWidth - 4) {
      kb.style.left = `${Math.max(4, window.innerWidth - rect.width - 4)}px`;
    }
    if (rect.left < 4) {
      kb.style.left = '4px';
    }
  }

  function render() {
    const container = document.getElementById('touch-keyboard-rows');
    if (!container) return;

    const pageRows = { letters: ROWS, numbers: NUMBER_ROW, symbols: SYMBOLS_ROW };
    const rows = pageRows[currentPage] || ROWS;

    container.innerHTML = rows
      .map(
        (row) => `
        <div class="touch-keyboard__row">
          ${row.map((key) => `<button type="button" class="${keyClass(key)}" data-key="${escapeAttr(key)}">${keyLabel(key)}</button>`).join('')}
        </div>`
      )
      .join('');

    container.querySelectorAll('.touch-key').forEach((btn) => {
      // Prevent the input from blurring when a key is tapped — click's
      // preventDefault() alone doesn't stop the browser's default
      // focus-shift behavior, which happens on mousedown. (Note:
      // deliberately NOT calling preventDefault on touchstart — doing
      // so can suppress the synthetic click event entirely on some
      // touch browsers, which broke key presses during testing.)
      btn.addEventListener('mousedown', (e) => e.preventDefault());

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // don't let this bubble to the document-level
                              // outside-click handler — re-rendering the
                              // keyboard (innerHTML swap) on this same tick
                              // can otherwise make kb.contains(e.target)
                              // misbehave once the original button node has
                              // been replaced, incorrectly closing the keyboard.
        handleKey(btn.dataset.key);
      });
    });

    // Keep within valid bounds after every render — switching pages
    // (letters vs numbers vs symbols) can change the keyboard's
    // height. This does NOT reset user drag/resize, just prevents
    // the (possibly taller/shorter) keyboard from ending up off-screen
    // or overlapping the tiles after a page switch.
    if (isOpen) {
      const kb = document.getElementById('touch-keyboard');
      if (kb) requestAnimationFrame(() => clampIntoValidBounds(kb));
    }
  }

  function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;');
  }

  function unescapeAttr(str) {
    return String(str).replace(/&quot;/g, '"');
  }

  function handleKey(rawKey) {
    const input = getInput();
    if (!input) return;
    const key = unescapeAttr(rawKey);

    switch (key) {
      case 'backspace':
        input.value = input.value.slice(0, -1);
        break;
      case 'space':
        input.value += ' ';
        break;
      case 'enter':
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        break;
      case 'shift':
        isShiftActive = !isShiftActive;
        render();
        return; // don't fall through to the input-event dispatch below
      case '123':
        currentPage = 'numbers';
        render();
        return;
      case '#+=':
        currentPage = 'symbols';
        render();
        return;
      case 'abc':
        currentPage = 'letters';
        render();
        return;
      default:
        input.value += isShiftActive ? key.toUpperCase() : key;
        if (isShiftActive) {
          isShiftActive = false; // shift is one-shot, like a real phone keyboard
          render();
        }
    }

    // Let the rest of the app (typewriter occupied-state, live ghost
    // hints, etc.) react exactly as if the user had typed normally.
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  const DEFAULT_SIDE_MARGIN = 16;
  const DEFAULT_MAX_WIDTH = 480;
  const MIN_KEYBOARD_WIDTH = 240;
  const MIN_KEYBOARD_SCALE = 0.6;
  const MAX_KEYBOARD_SCALE = 1.6;

  function resetToDefaultPosition(kb) {
    // This computes the same "centered overlay, clears the tiles
    // row, side margins" layout as before — but as explicit pixel
    // left/top/width, since free dragging and resizing both require
    // real values to manipulate rather than CSS auto-centering.
    // Only called the FIRST time the keyboard ever opens (or any time
    // there's no remembered position yet) — see openKeyboard(). Once
    // the user has dragged/resized, that becomes the new default for
    // subsequent opens this session.
    const tiles = document.querySelector('.tiles');
    if (!tiles) return;

    const defaultWidth = Math.min(window.innerWidth - DEFAULT_SIDE_MARGIN * 2, DEFAULT_MAX_WIDTH);
    kb.style.width = `${defaultWidth}px`;
    kb.style.left = `${(window.innerWidth - defaultWidth) / 2}px`;

    const tilesRect = tiles.getBoundingClientRect();
    const gapAboveTiles = 18;
    const floorY = tilesRect.top - gapAboveTiles;

    const kbHeight = kb.getBoundingClientRect().height || kb.scrollHeight;
    const availableSpace = Math.max(floorY, 0);
    const idealTop = Math.max((availableSpace - kbHeight) / 2, 8);
    let topY = idealTop;
    let bottomY = topY + kbHeight;

    if (bottomY > floorY) {
      bottomY = floorY;
      topY = Math.max(bottomY - kbHeight, 8);
    }

    kb.style.top = `${topY}px`;
  }

  // ---------- Drag (via handle) ----------

  function setupDrag(kb) {
    const handle = document.getElementById('touch-keyboard-handle');
    if (!handle) return;

    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let dragging = false;

    function onPointerDown(e) {
      dragging = true;
      suppressOutsideClick = true;
      kb.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = kb.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const rect = kb.getBoundingClientRect();

      // Keep the whole keyboard within the viewport. The tiles-row
      // floor only constrains the DEFAULT spawn position — once the
      // user is actively dragging, they can place it anywhere on
      // screen, including well below the tiles, down to the actual
      // bottom edge of the viewport.
      const bottomLimit = window.innerHeight - 4;

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      newLeft = Math.max(4, Math.min(newLeft, window.innerWidth - rect.width - 4));
      newTop = Math.max(4, Math.min(newTop, bottomLimit - rect.height));

      kb.style.left = `${newLeft}px`;
      kb.style.top = `${newTop}px`;
    }

    function onPointerUp(e) {
      dragging = false;
      kb.classList.remove('is-dragging');
      handle.releasePointerCapture && handle.releasePointerCapture(e.pointerId);
      setTimeout(() => { suppressOutsideClick = false; }, 50);

      const rect = kb.getBoundingClientRect();
      savedLayout = {
        ...(savedLayout || {}),
        left: rect.left,
        top: rect.top,
        width: rect.width,
      };
    }

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
  }

  // ---------- Resize (via corner grip) ----------

  function setupResize(kb) {
    const grip = document.getElementById('touch-keyboard-resize');
    if (!grip) return;

    let startX = 0;
    let startWidth = 0;
    let startFontScale = 1;
    let resizing = false;

    function onPointerDown(e) {
      resizing = true;
      suppressOutsideClick = true;
      kb.classList.add('is-resizing');
      startX = e.clientX;
      startWidth = kb.getBoundingClientRect().width;
      grip.setPointerCapture && grip.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!resizing) return;
      const dx = e.clientX - startX;
      let newWidth = startWidth + dx;

      const maxWidth = window.innerWidth - 8;
      newWidth = Math.max(MIN_KEYBOARD_WIDTH, Math.min(newWidth, maxWidth));

      kb.style.width = `${newWidth}px`;

      // Scale key/font size proportionally with width, within sane
      // bounds, so resizing actually changes usability rather than
      // just stretching empty space.
      const scale = Math.max(
        MIN_KEYBOARD_SCALE,
        Math.min(newWidth / DEFAULT_MAX_WIDTH, MAX_KEYBOARD_SCALE)
      );
      kb.style.setProperty('--touch-kb-scale', scale);

      // Keep the bottom edge within the viewport after a height change
      // from font scaling — re-clamp top if needed. Uses the actual
      // viewport bottom, not the tiles row, since the user may have
      // deliberately resized while positioned below the tiles.
      const rect = kb.getBoundingClientRect();
      const bottomLimit = window.innerHeight - 4;
      if (rect.bottom > bottomLimit) {
        kb.style.top = `${Math.max(4, bottomLimit - rect.height)}px`;
      }
    }

    function onPointerUp(e) {
      resizing = false;
      kb.classList.remove('is-resizing');
      grip.releasePointerCapture && grip.releasePointerCapture(e.pointerId);
      setTimeout(() => { suppressOutsideClick = false; }, 50);

      const rect = kb.getBoundingClientRect();
      const currentScale = parseFloat(kb.style.getPropertyValue('--touch-kb-scale')) || 1;
      savedLayout = {
        ...(savedLayout || {}),
        left: rect.left,
        top: rect.top,
        width: rect.width,
        scale: currentScale,
      };
    }

    grip.addEventListener('pointerdown', onPointerDown);
    grip.addEventListener('pointermove', onPointerMove);
    grip.addEventListener('pointerup', onPointerUp);
    grip.addEventListener('pointercancel', onPointerUp);
  }

  function applyLayout(kb) {
    if (savedLayout) {
      // Restore exactly where/how the user last left it.
      kb.style.left = `${savedLayout.left}px`;
      kb.style.top = `${savedLayout.top}px`;
      kb.style.width = `${savedLayout.width}px`;
      if (savedLayout.scale) {
        kb.style.setProperty('--touch-kb-scale', savedLayout.scale);
      } else {
        kb.style.removeProperty('--touch-kb-scale');
      }
    } else {
      // First time ever opening (or nothing remembered yet) — use
      // the original centered/clears-the-tiles default.
      kb.style.removeProperty('--touch-kb-scale');
      resetToDefaultPosition(kb);
    }
  }

  function openKeyboard() {
    if (!isTouchDevice()) return;
    const kb = document.getElementById('touch-keyboard');
    if (!kb) return;
    isOpen = true;
    currentPage = 'letters';
    isShiftActive = false;
    kb.hidden = false;
    render();
    requestAnimationFrame(() => {
      applyLayout(kb);
      kb.classList.add('is-open');
    });
  }

  function closeKeyboard() {
    const kb = document.getElementById('touch-keyboard');
    if (!kb) return;
    isOpen = false;
    kb.classList.remove('is-open');
    setTimeout(() => {
      if (!isOpen) kb.hidden = true;
    }, 250);
  }

  function init() {
    if (!isTouchDevice()) return; // desktop: this module does nothing

    const input = getInput();
    if (!input) return;

    const kb = document.getElementById('touch-keyboard');
    if (kb) {
      setupDrag(kb);
      setupResize(kb);
    }

    input.addEventListener('focus', openKeyboard);

    // Tapping anywhere outside the input/prompt area or the keyboard
    // itself closes it. Using coordinate/bounding-box checks instead
    // of DOM containment — some touch/tap implementations resolve
    // the click's e.target to an unexpected ancestor depending on
    // exact hit-testing with inputmode="none" inputs, so containment
    // checks against e.target were unreliable in testing.
    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      if (suppressOutsideClick) return; // drag/resize gesture just ended — its trailing click isn't a real outside-tap

      const kb = document.getElementById('touch-keyboard');
      const promptEl = document.querySelector('.prompt');
      const x = e.clientX;
      const y = e.clientY;

      const insideRect = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      };

      if (insideRect(promptEl) || insideRect(kb)) return;

      input.blur();
      closeKeyboard();
    });

    // Escape specifically (not every prompt reset — a miss message's
    // own reset shouldn't dismiss the keyboard, only an explicit
    // Escape press should) closes the keyboard.
    window.addEventListener('dilxhan:prompt-escape', closeKeyboard);

    // A successful dictionary hit (floating reveal or tile pulse)
    // closes the keyboard so the user can actually see it — a miss
    // deliberately does NOT trigger this, so rapid-fire guessing
    // doesn't require re-opening the keyboard each time.
    window.addEventListener('dilxhan:dictionary-hit', () => {
      input.blur();
      closeKeyboard();
    });

    window.addEventListener('resize', () => {
      if (isOpen) {
        const kb = document.getElementById('touch-keyboard');
        if (kb) clampIntoValidBounds(kb);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
