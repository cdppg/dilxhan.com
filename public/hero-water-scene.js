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

  // ---------- Stage 2: idle wave animation ----------
  // Continuously redraws the water path with a slowly advancing
  // phase, so the surface gently undulates at rest — same
  // requestAnimationFrame-driven-redraw approach as the particle
  // systems in hero-scene.js, just animating path geometry instead
  // of moving discrete elements.

  let rafId = null;
  let lastFrameTime = performance.now();
  let wavePhase = 0;

  const IDLE_LEVEL_RATIO = 0.5; // "half filled," per spec — static for now, will become dynamic in a later stage
  const IDLE_AMPLITUDE_RATIO = 0.018; // slightly more visible than the stage-1 static amplitude, since motion itself helps it read as water even when amplitude is modest
  const IDLE_WAVE_SPEED = 0.6; // radians per second, gentle

  function renderFrame(now) {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    wavePhase += dt * IDLE_WAVE_SPEED;

    const waterEl = document.getElementById('hero-water-body');
    if (waterEl) {
      const amplitude = SCENE_H * IDLE_AMPLITUDE_RATIO;
      waterEl.setAttribute('d', buildWaterPath(IDLE_LEVEL_RATIO, amplitude, wavePhase));
    }

    rafId = requestAnimationFrame(renderFrame);
  }

  function startIdleLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(renderFrame);
  }

  function init() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function begin() {
      readViewBox();
      if (prefersReducedMotion) {
        // Render a single calm frame and stop — no continuous
        // animation loop for users who've asked to minimize motion.
        const waterEl = document.getElementById('hero-water-body');
        if (waterEl) {
          const amplitude = SCENE_H * IDLE_AMPLITUDE_RATIO;
          waterEl.setAttribute('d', buildWaterPath(IDLE_LEVEL_RATIO, amplitude, 0));
        }
        return;
      }
      startIdleLoop();
      setTimeout(readViewBox, 200);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(begin);
    } else {
      setTimeout(begin, 250);
    }

    window.addEventListener('resize', readViewBox);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
