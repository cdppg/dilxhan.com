// ============================================================
// Dilxhan.com — hero-water-scene.js
// STAGE 1 of the water-vessel hero concept: a static half-filled
// water body inside the "Dilxhan" letters, with a gently wavy
// surface line. No animation yet — this stage is purely about
// validating the visual (fill level, wave shape, colors) before
// adding motion in later stages.
//
// This is a SEPARATE module from hero-scene.js (the existing
// forest/fire bird-and-ember system) so the two concepts can be
// reviewed independently. Nothing here touches hero-scene.js.
// ============================================================

(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // Scene coordinate space mirrors the SVG's actual fitted viewBox,
  // same approach as hero-scene.js — read fresh so this works
  // regardless of font-metric-driven viewBox changes.
  let SCENE_X = 0;
  let SCENE_Y = 0;
  let SCENE_W = 1000;
  let SCENE_H = 260;

  function readViewBox() {
    const svg = document.querySelector('.hero__svg');
    if (!svg) return;
    const vb = svg.viewBox && svg.viewBox.baseVal;
    if (vb && vb.width && vb.height) {
      SCENE_X = vb.x;
      SCENE_Y = vb.y;
      SCENE_W = vb.width;
      SCENE_H = vb.height;
    }
  }

  // ---------- Wave path builder ----------
  // Builds a closed SVG path: a wavy line across the top (the water
  // surface), then straight down both sides and across the bottom,
  // closing the shape. "levelRatio" is 0 (empty) to 1 (full) of the
  // scene height. "amplitude"/"phase" control the wave's shape.

  function buildWaterPath(levelRatio, amplitude, phase) {
    const waterTopY = SCENE_Y + SCENE_H * (1 - levelRatio);
    const bottomY = SCENE_Y + SCENE_H;
    const left = SCENE_X;
    const right = SCENE_X + SCENE_W;

    // Sample the wave across the width in small segments, using two
    // overlaid sine terms for a slightly organic (non-perfectly-
    // periodic-looking) surface rather than one clean sine wave.
    const segments = 24;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const x = left + (SCENE_W * i) / segments;
      const t = (i / segments) * Math.PI * 2;
      const y =
        waterTopY +
        Math.sin(t * 2 + phase) * amplitude +
        Math.sin(t * 3.3 + phase * 1.7) * (amplitude * 0.4);
      points.push([x, y]);
    }

    let d = `M ${points[0][0]} ${points[0][1]} `;
    for (let i = 1; i < points.length; i++) {
      d += `L ${points[i][0]} ${points[i][1]} `;
    }
    d += `L ${right} ${bottomY} L ${left} ${bottomY} Z`;
    return d;
  }

  // ---------- Core state ----------
  // ONE continuous model drives everything. Theme doesn't switch
  // between two canned animations — it just sets targetLevel, and
  // everything else (wave calm, bubble rate, vapor amount) is
  // DERIVED from how level is currently moving toward that target.
  // This is what makes a mid-flight theme reversal "just work" later
  // without special-casing it: flip targetLevel, existing particles
  // keep their position and simply get re-tagged with new behavior.

  let level = 50; // 0 (empty) .. 100 (full) — starts half-filled, per spec
  let targetLevel = 50; // dark mode -> 0, light mode -> 100 (stage 4+)
  let isDarkMode = false;

  const DRAIN_RATE = 4; // level units per second while heading toward empty
  const FILL_RATE = 6; // level units per second while heading toward full (slightly faster than draining — refill should feel responsive)

  let bubbles = [];
  let vapors = [];

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  // ---------- Bubbles ----------
  // Small circles that originate within the water body and rise to
  // the current surface, where they pop and (probabilistically)
  // spawn a vapor particle that continues upward past the letters.

  function createBubbleEl() {
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('class', 'scene-bubble');
    return el;
  }

  function spawnBubble() {
    const container = document.getElementById('hero-scene-elements');
    if (!container) return;

    const waterTopY = SCENE_Y + SCENE_H * (1 - level / 100);
    const bottomY = SCENE_Y + SCENE_H;
    if (bottomY - waterTopY < 4) return; // not enough water depth to bother

    const el = createBubbleEl();
    const r = randRange(1.5, 4);
    el.setAttribute('r', r);
    container.appendChild(el);

    bubbles.push({
      el,
      x: SCENE_X + randRange(SCENE_W * 0.08, SCENE_W * 0.92),
      y: randRange(waterTopY + 6, bottomY - 4),
      r,
      riseSpeed: randRange(18, 34),
      wobble: randRange(2, 5),
      wobbleSpeed: randRange(2, 4),
      wobblePhase: Math.random() * Math.PI * 2,
    });
  }

  // ---------- Vapor ----------
  // Rises from the surface where a bubble popped, drifts upward past
  // the top of the letters, and fades out. Each vapor particle that
  // fully escapes represents a small amount of water leaving — this
  // is what actually drives `level` down while boiling (not a fixed
  // timer), so the drain rate naturally reflects how much is boiling.

  function createVaporEl() {
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('class', 'scene-vapor');
    return el;
  }

  function spawnVapor(x, y) {
    const container = document.getElementById('hero-scene-elements');
    if (!container) return;

    const el = createVaporEl();
    const r = randRange(2.5, 5.5);
    el.setAttribute('r', r);
    container.appendChild(el);

    vapors.push({
      el,
      x,
      y,
      r,
      state: 'rising', // 'rising' | 'condensing' — condensing arrives in stage 5 (reversal)
      riseSpeed: randRange(14, 24),
      drift: randRange(-8, 8),
      age: 0,
      maxAge: randRange(1.8, 2.8), // seconds before fully dissipated
    });
  }

  // ---------- Frame loop ----------

  let rafId = null;
  let lastFrameTime = performance.now();
  let wavePhase = 0;
  let bubbleSpawnAccumulator = 0;
  let lastWaterTopY = null;

  const IDLE_AMPLITUDE_RATIO = 0.018;
  const BOIL_AMPLITUDE_RATIO = 0.055; // rougher surface while actively draining
  const IDLE_WAVE_SPEED = 0.6;
  const BOIL_WAVE_SPEED = 2.4;

  function currentBoilIntensity() {
    // 0 when calm/idle, ramps up while level is actively heading
    // toward empty. Using the gap between level and targetLevel
    // (when target is below level) rather than a flat "isDarkMode"
    // flag — this is what lets the visuals naturally settle if the
    // target reverses mid-boil, instead of needing a special case.
    if (targetLevel >= level) return 0;
    const gap = level - targetLevel;
    return Math.min(gap / 30, 1); // ramps to full intensity over a 30-unit gap
  }

  function renderFrame(now) {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;

    // ---- advance level toward target ----
    if (targetLevel < level) {
      level = Math.max(targetLevel, level - DRAIN_RATE * dt);
    } else if (targetLevel > level) {
      level = Math.min(targetLevel, level + FILL_RATE * dt);
    }

    const boilIntensity = currentBoilIntensity();
    const effectiveWaveSpeed = prefersReducedMotion
      ? IDLE_WAVE_SPEED
      : IDLE_WAVE_SPEED + (BOIL_WAVE_SPEED - IDLE_WAVE_SPEED) * boilIntensity;
    wavePhase += dt * effectiveWaveSpeed;

    const waterEl = document.getElementById('hero-water-body');
    const levelRatio = level / 100;
    const waterTopY = SCENE_Y + SCENE_H * (1 - levelRatio);
    if (waterEl) {
      const effectiveAmplitudeRatio = prefersReducedMotion
        ? IDLE_AMPLITUDE_RATIO
        : IDLE_AMPLITUDE_RATIO + (BOIL_AMPLITUDE_RATIO - IDLE_AMPLITUDE_RATIO) * boilIntensity;
      const amplitude = SCENE_H * effectiveAmplitudeRatio;
      waterEl.setAttribute('d', buildWaterPath(levelRatio, amplitude, wavePhase));
    }
    lastWaterTopY = waterTopY;

    // ---- spawn bubbles, rate scales with boil intensity ----
    // Suppressed entirely under prefers-reduced-motion — the level
    // still drains/fills correctly (so dark mode doesn't misleadingly
    // show a static full glass), but the busy bubble/vapor particle
    // motion is skipped for users who've asked to minimize it.
    if (!prefersReducedMotion && boilIntensity > 0.02) {
      bubbleSpawnAccumulator += dt * boilIntensity * 14; // up to ~14/sec at full intensity
      while (bubbleSpawnAccumulator >= 1) {
        spawnBubble();
        bubbleSpawnAccumulator -= 1;
      }
    }

    // ---- update bubbles: rise, wobble, pop at surface ----
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.riseSpeed * dt;
      b.wobblePhase += dt * b.wobbleSpeed;
      const wobbleX = Math.sin(b.wobblePhase) * b.wobble;
      b.el.setAttribute('cx', b.x + wobbleX);
      b.el.setAttribute('cy', b.y);

      if (b.y <= waterTopY) {
        // Popped at the surface — remove, and sometimes release vapor.
        b.el.remove();
        bubbles.splice(i, 1);
        if (Math.random() < 0.7) {
          spawnVapor(b.x + wobbleX, waterTopY);
        }
      }
    }

    // ---- update vapor: rise and fade while in 'rising' state ----
    for (let i = vapors.length - 1; i >= 0; i--) {
      const v = vapors[i];
      v.age += dt;

      if (v.state === 'rising') {
        v.y -= v.riseSpeed * dt;
        v.x += Math.sin(v.age * 2.2) * v.drift * dt;
        const lifeRatio = v.age / v.maxAge;
        const opacity = lifeRatio < 0.15 ? lifeRatio / 0.15 : 1 - (lifeRatio - 0.15) / 0.85;
        v.el.setAttribute('cx', v.x);
        v.el.setAttribute('cy', v.y);
        v.el.setAttribute('opacity', Math.max(0, opacity * 0.7));

        if (v.age >= v.maxAge) {
          v.el.remove();
          vapors.splice(i, 1);
        }
      }
    }

    rafId = requestAnimationFrame(renderFrame);
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(renderFrame);
  }

  // ---------- Theme wiring ----------

  function setDarkMode(dark) {
    isDarkMode = dark;
    targetLevel = dark ? 0 : 100;
  }

  function applyCurrentTheme() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    setDarkMode(theme === 'dark');
  }

  let prefersReducedMotion = false;

  function init() {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function begin() {
      readViewBox();
      applyCurrentTheme();
      startLoop();
      setTimeout(readViewBox, 200);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(begin);
    } else {
      setTimeout(begin, 250);
    }

    window.addEventListener('resize', readViewBox);

    // app.js's toggleTheme() sets data-theme and calls
    // window.__dilxhanHeroScene.setMode(...) for the OLD forest/fire
    // system. That hook isn't relevant here, so instead we watch
    // data-theme directly via a MutationObserver — keeps this module
    // fully decoupled from app.js's internals.
    const observer = new MutationObserver(() => applyCurrentTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
