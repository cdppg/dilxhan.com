// ============================================================
// Dilxhan.com — command-palette.js
// Drives the always-visible command prompt: typewriter placeholder,
// command parsing, dictionary lookups, navigation commands, and
// the floating easter-egg reveal system.
// ============================================================

(function () {
  const inputEl = () => document.getElementById('prompt-input');
  const fieldEl = () => document.querySelector('.prompt__field');
  const typewriterEl = () => document.getElementById('prompt-typewriter');

  // ---------- Typewriter placeholder ----------
  // Cycles through a short list of phrases, typing and deleting them
  // in a loop, ONLY while the input is empty and unfocused. The
  // moment the user focuses or types, this stops and the field shows
  // their real input instead.

  const BASE_PHRASES_DESKTOP = [
    'enter your command',
    'try "coffee"',
    'press ? for shortcuts',
    'type something weird',
  ];

  const BASE_PHRASES_TOUCH = [
    'enter your command',
    'try "coffee"',
    'type something weird',
  ];

  function isTouchDevice() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  }

  function getTypewriterPhrases() {
    const base = isTouchDevice() ? BASE_PHRASES_TOUCH : BASE_PHRASES_DESKTOP;

    const count =
      window.__dilxhanDictionary && typeof window.__dilxhanDictionary.getDiscoveredCount === 'function'
        ? window.__dilxhanDictionary.getDiscoveredCount()
        : 0;

    if (count > 0) {
      const label = count === 1 ? '1 thing discovered' : `${count} things discovered`;
      return [...base, label];
    }
    return base;
  }

  let twPhraseIndex = 0;
  let twCharIndex = 0;
  let twDeleting = false;
  let twTimeoutId = null;
  let twActive = false;

  function typewriterTick() {
    const el = typewriterEl();
    if (!el || !twActive) return;

    const phrases = getTypewriterPhrases();
    if (twPhraseIndex >= phrases.length) twPhraseIndex = 0;

    const phrase = phrases[twPhraseIndex];
    let delay = 55;

    if (!twDeleting) {
      twCharIndex++;
      el.textContent = phrase.slice(0, twCharIndex);
      if (twCharIndex >= phrase.length) {
        twDeleting = true;
        delay = 1400; // pause at full phrase before deleting
      }
    } else {
      twCharIndex--;
      el.textContent = phrase.slice(0, twCharIndex);
      delay = 30;
      if (twCharIndex <= 0) {
        twDeleting = false;
        twPhraseIndex = (twPhraseIndex + 1) % phrases.length;
        delay = 400;
      }
    }

    twTimeoutId = setTimeout(typewriterTick, delay);
  }

  function startTypewriter() {
    if (twActive) return;
    twActive = true;
    twCharIndex = 0;
    twDeleting = false;
    typewriterTick();
  }

  function stopTypewriter() {
    twActive = false;
    if (twTimeoutId) clearTimeout(twTimeoutId);
    const el = typewriterEl();
    if (el) el.textContent = '';
  }

  // ---------- Field state ----------

  function updateFieldOccupiedState() {
    const field = fieldEl();
    const input = inputEl();
    if (!field || !input) return;

    const occupied = document.activeElement === input || input.value.length > 0;
    field.classList.toggle('is-occupied', occupied);

    if (occupied) {
      stopTypewriter();
    } else {
      startTypewriter();
    }
  }

  // ---------- Navigation commands ----------
  // Plain commands that do something immediate rather than a
  // dictionary lookup. Checked first; if no match, falls through
  // to the dictionary/easter-egg system in dictionary-engine.js.

  function getSocialUrl(label) {
    const socials = (window.__dilxhan && window.__dilxhan.socialsCache) || [];
    const match = socials.find((s) => s.label.toLowerCase() === label.toLowerCase());
    return match ? match.url : null;
  }

  function runNavigationCommand(raw) {
    const word = raw.trim().toLowerCase();

    const openers = {
      github: () => getSocialUrl('github'),
      instagram: () => getSocialUrl('instagram'),
      tiktok: () => getSocialUrl('tiktok'),
      email: () => getSocialUrl('email'),
    };

    if (word === 'projects') {
      document.getElementById('tiles')?.scrollIntoView?.({ block: 'nearest' });
      const firstTile = document.querySelector('.tile');
      if (firstTile) {
        firstTile.classList.remove('is-pulsing');
        void firstTile.offsetWidth;
        firstTile.classList.add('is-pulsing');
      }
      return true;
    }

    if (word === 'surprise' || word === 'surprise me') {
      window.dispatchEvent(new CustomEvent('dilxhan:surprise-me'));
      return true;
    }

    if (openers[word]) {
      const url = openers[word]();
      if (url) {
        window.open(url, '_blank', 'noopener');
        return true;
      }
    }

    return false;
  }

  // ---------- Submit handling ----------

  async function handleSubmit(rawValue) {
    const value = rawValue.trim();
    if (!value) return;

    if (runNavigationCommand(value)) {
      clearInput();
      return;
    }

    // Fall through to the dictionary/easter-egg engine, if present.
    if (window.__dilxhanDictionary && typeof window.__dilxhanDictionary.lookup === 'function') {
      window.__dilxhanDictionary.lookup(value);
    }

    clearInput();
  }

  function clearInput() {
    const input = inputEl();
    if (input) input.value = '';
    updateFieldOccupiedState();
  }

  // ---------- Wiring ----------

  function initPalette() {
    const input = inputEl();
    if (!input) return;

    input.addEventListener('focus', updateFieldOccupiedState);
    input.addEventListener('blur', updateFieldOccupiedState);
    input.addEventListener('input', updateFieldOccupiedState);
    window.addEventListener('dilxhan:prompt-reset', updateFieldOccupiedState);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleSubmit(input.value);
      }
    });

    // Global shortcuts: / or Cmd/Ctrl+K focuses the prompt.
    document.addEventListener('keydown', (e) => {
      const isTypingInPrompt = document.activeElement === input;

      if (!isTypingInPrompt && e.key === '/') {
        e.preventDefault();
        input.focus();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
      }

      if (!isTypingInPrompt && e.key === '?') {
        const overlay = document.getElementById('shortcuts-overlay');
        if (overlay) overlay.hidden = !overlay.hidden;
      }
    });

    updateFieldOccupiedState(); // kicks off typewriter on load
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPalette);
  } else {
    initPalette();
  }
})();
