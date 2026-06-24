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
    ['#abc', '.', ',', '?', '!', "'", 'backspace'],
    ['abc', 'space', 'enter'],
  ];

  let isShiftActive = false;
  let isNumberMode = false;
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
      '#abc': '#+=',
    };
    if (labels[key]) return labels[key];
    return isShiftActive ? key.toUpperCase() : key;
  }

  function keyClass(key) {
    const wide = ['shift', 'backspace', 'space', 'enter', '123', 'abc', '#abc'];
    return wide.includes(key) ? `touch-key touch-key--${key}` : 'touch-key';
  }

  function render() {
    const container = document.getElementById('touch-keyboard-rows');
    if (!container) return;

    const rows = isNumberMode ? NUMBER_ROW : ROWS;
    container.innerHTML = rows
      .map(
        (row) => `
        <div class="touch-keyboard__row">
          ${row.map((key) => `<button type="button" class="${keyClass(key)}" data-key="${key}">${keyLabel(key)}</button>`).join('')}
        </div>`
      )
      .join('');

    container.querySelectorAll('.touch-key').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); // don't let the button steal focus / trigger native behavior
        handleKey(btn.dataset.key);
      });
    });
  }

  function handleKey(key) {
    const input = getInput();
    if (!input) return;

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
        isNumberMode = true;
        render();
        return;
      case 'abc':
      case '#abc':
        isNumberMode = key === '#abc';
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
    isNumberMode = false;
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
