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

  function openKeyboard() {
    if (!isTouchDevice()) return;
    const kb = document.getElementById('touch-keyboard');
    if (!kb) return;
    isOpen = true;
    currentPage = 'letters';
    isShiftActive = false;
    render();
    kb.hidden = false;
    requestAnimationFrame(() => kb.classList.add('is-open'));
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

    input.addEventListener('focus', openKeyboard);

    // Tapping anywhere outside the input or the keyboard itself closes it.
    document.addEventListener('click', (e) => {
      const kb = document.getElementById('touch-keyboard');
      if (!isOpen) return;
      if (e.target === input) return;
      if (kb && kb.contains(e.target)) return;
      input.blur();
      closeKeyboard();
    });

    // Escape (e.g. from app.js's Escape handling, which blurs the
    // input) should also close the keyboard.
    window.addEventListener('dilxhan:prompt-reset', closeKeyboard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
