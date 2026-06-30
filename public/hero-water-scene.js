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
  // closing the shape. "waterTopY" is the Y position of the water
  // surface in scene coordinates (already resolved from the current
  // scene height. "amplitude"/"phase" control the wave's shape.

  function buildWaterPath(waterTopY, amplitude, phase) {
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
  //
  // level is 0 (empty) .. 100 (full). "Full" maps to 60% of the
  // letterform height (FULL_LEVEL_RATIO below) — not the very top —
  // so the wave always has visible headroom to move without
  // clipping against the top of the letters.

  // ─── EASY TUNING ─────────────────────────────────────────────────────────
  // How high the water sits when "full" (level = 100), expressed as a
  // fraction of the visible letter height (0 = bottom of letters, 1 = top).
  // 0.45 ≈ 45% up the letterforms — raise this number to fill higher,
  // lower it to fill less. Changing only this constant is all you need.
  const FULL_LEVEL_RATIO = 0.45;
  // ─────────────────────────────────────────────────────────────────────────

  let level = 100; // starts FULL (was half — now half is just a waypoint while draining)
  let targetLevel = 100;
  let isDarkMode = false;
  let isManualRefilling = false; // true while a tapped refill is actively pulling level back up

  const EMPTY_THRESHOLD = 0; // show refill icon only once water has fully drained to the letter baseline

  // Draining slowed further per feedback — now ~38s to fully drain.
  // Fill rate left as-is (refill should still feel responsive).
  const DRAIN_RATE = 100 / 38; // level units per second while heading toward empty
  const FILL_RATE = 100 / 24; // level units per second while heading toward full

  function levelToFillRatio(lvl) {
    // Converts the 0-100 level scale to an actual fill ratio of the
    // letter height — level=100 maps to FULL_LEVEL_RATIO (0.6), not
    // 1.0, since "full" deliberately leaves headroom for the wave.
    return (lvl / 100) * FULL_LEVEL_RATIO;
  }

  // None of the letters in "Dilxhan" (d, i, l, x, h, a, n) have a
  // descender, so the clipped glyph shape's visible bottom edge sits
  // right at the text baseline — y=195 of the 260-tall authored
  // viewBox. Expressed as a ratio (195/260 = 0.75) so it stays correct
  // even though SCENE_H is re-read dynamically from real font metrics
  // on load/resize (the baseline is always at this same proportional
  // position within the fitted viewBox).
  const VISIBLE_BOTTOM_RATIO = 0.75;

  function levelToWaterTopY() {
    // level=0 now maps to the visible baseline itself (instantly
    // visible the moment filling starts), and level=100 rises
    // FULL_LEVEL_RATIO of the way up the VISIBLE glyph height (not
    // the whole viewBox), so "full" still lands inside the
    // letterforms with headroom near the top, same as before.
    const visibleBottomY = SCENE_Y + SCENE_H * VISIBLE_BOTTOM_RATIO;
    const visibleHeight = SCENE_H * VISIBLE_BOTTOM_RATIO;
    const fillRatio = levelToFillRatio(level);
    return visibleBottomY - visibleHeight * fillRatio;
  }

  let bubbles = [];
  let vapors = [];
  let ripples = []; // landing-ring particles spawned when a condensed droplet hits the water surface

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

    const waterTopY = levelToWaterTopY();
    const bottomY = SCENE_Y + SCENE_H * VISIBLE_BOTTOM_RATIO; // visible baseline, not the absolute viewBox bottom
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
  //
  // Visually, each "vapor" is a small cluster of 2-3 soft, blurred,
  // overlapping circles (a "puff") rather than one hard-edged dot —
  // and the puff grows for its first moments after a bubble pops,
  // like mist actually forming, instead of snapping to full size.

  function createVaporPuffEl() {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'scene-vapor-puff');
    const blobCount = 2 + Math.floor(Math.random() * 2); // 2-3 blobs
    const blobs = [];
    for (let i = 0; i < blobCount; i++) {
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('class', 'scene-vapor');
      g.appendChild(circle);
      blobs.push({
        el: circle,
        offsetX: randRange(-3, 3),
        offsetY: randRange(-2, 2),
        rBase: randRange(2.5, 5),
      });
    }
    return { g, blobs };
  }

  function spawnVapor(x, y) {
    const container = document.getElementById('hero-scene-elements');
    if (!container) return;

    const { g, blobs } = createVaporPuffEl();
    container.appendChild(g);

    // If we're currently filling (light mode / mid-refill), spawn
    // directly as 'condensing' — any vapor that forms during a fill
    // should fall back down rather than continue upward.
    const isFilling = targetLevel > level;
    const riseSpeed = randRange(11, 19);

    vapors.push({
      g,
      blobs,
      x,
      y,
      state: isFilling ? 'condensing' : 'rising',
      riseSpeed,
      fallSpeed: riseSpeed * randRange(1.0, 1.4),  // used in condensing phase
      condenseAge: 0,                               // separate clock for condensing phase
      drift: randRange(-8, 8),
      age: 0,
      growDuration: randRange(0.35, 0.55),
      maxAge: randRange(2.2, 3.2),
    });
  }

  // ---------- Condensation ----------
  // When the theme flips dark→light, steam mid-flight reverses:
  // each rising vapor puff coalesces into a falling droplet and
  // lands back on the water surface, closing the visual loop.

  function condenseFlyingVapors() {
    for (const v of vapors) {
      if (v.state !== 'rising') continue;
      v.state = 'condensing';
      v.condenseAge = 0;
      // Use a fresh fallSpeed if one wasn't set at spawn time
      if (!v.fallSpeed) {
        v.fallSpeed = v.riseSpeed * randRange(1.0, 1.4);
      }
    }
  }

  // A landing ripple: an expanding, fading ring at the point where
  // a condensed droplet hits the water surface.
  function spawnRipple(x, y) {
    const container = document.getElementById('hero-scene-elements');
    if (!container) return;
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('fill', 'none');
    el.setAttribute('class', 'scene-bubble'); // reuse the bubble color token
    el.setAttribute('stroke-width', '1');
    el.setAttribute('opacity', '0.5');
    container.appendChild(el);
    ripples.push({ el, x, y, age: 0, maxAge: randRange(0.4, 0.65) });
  }

  // ---------- Frame loop ----------

  let rafId = null;
  let lastFrameTime = performance.now();
  let wavePhase = 0;
  let bubbleSpawnAccumulator = 0;
  let lastWaterTopY = null;

  const IDLE_AMPLITUDE_RATIO = 0.018;
  const BOIL_AMPLITUDE_RATIO = 0.04; // rougher than idle, but less aggressive than before
  const IDLE_WAVE_SPEED = 0.6;
  const BOIL_WAVE_SPEED = 1.7;

  function currentBoilIntensity() {
    // 0 when calm/idle, ramps up while level is actively heading
    // toward empty. Using the gap between level and targetLevel
    // (when target is below level) rather than a flat "isDarkMode"
    // flag — this is what lets the visuals naturally settle if the
    // target reverses mid-boil, instead of needing a special case.
    if (targetLevel >= level) return 0;
    const gap = level - targetLevel;
    return Math.min(gap / 45, 1); // ramps more gradually than before (was /30)
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

    // ---- refill completion: once a manual refill reaches full,
    // resume draining automatically if still in dark mode — this is
    // what makes the empty/refill/boil loop repeat indefinitely
    // while dark mode stays on, per spec. ----
    if (isManualRefilling && level >= 100) {
      isManualRefilling = false;
      if (isDarkMode) {
        targetLevel = 0; // boiling resumes
      }
    }

    // ---- refill icon visibility: show once empty enough AND in
    // dark mode AND not already mid-refill; hide otherwise. ----
    if (isDarkMode && isNearEmpty() && !isManualRefilling) {
      showRefillIcon();
    } else {
      hideRefillIcon();
    }

    const boilIntensity = currentBoilIntensity();
    const effectiveWaveSpeed = prefersReducedMotion
      ? IDLE_WAVE_SPEED
      : IDLE_WAVE_SPEED + (BOIL_WAVE_SPEED - IDLE_WAVE_SPEED) * boilIntensity;
    wavePhase += dt * effectiveWaveSpeed;

    const waterEl = document.getElementById('hero-water-body');
    const waterTopY = levelToWaterTopY();
    if (waterEl) {
      const effectiveAmplitudeRatio = prefersReducedMotion
        ? IDLE_AMPLITUDE_RATIO
        : IDLE_AMPLITUDE_RATIO + (BOIL_AMPLITUDE_RATIO - IDLE_AMPLITUDE_RATIO) * boilIntensity;
      const amplitude = SCENE_H * effectiveAmplitudeRatio;
      waterEl.setAttribute('d', buildWaterPath(waterTopY, amplitude, wavePhase));
    }
    lastWaterTopY = waterTopY;

    // ---- spawn bubbles, rate scales with boil intensity ----
    // Suppressed entirely under prefers-reduced-motion — the level
    // still drains/fills correctly (so dark mode doesn't misleadingly
    // show a static full glass), but the busy bubble/vapor particle
    // motion is skipped for users who've asked to minimize it.
    if (!prefersReducedMotion && boilIntensity > 0.02) {
      bubbleSpawnAccumulator += dt * boilIntensity * 9; // up to ~9/sec at full intensity (was 14)
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

    // ---- update vapor: rising puffs or condensing droplets ----
    for (let i = vapors.length - 1; i >= 0; i--) {
      const v = vapors[i];
      v.age += dt;

      if (v.state === 'rising') {
        v.y -= v.riseSpeed * dt;
        v.x += Math.sin(v.age * 2.2) * v.drift * dt;

        const lifeRatio = v.age / v.maxAge;
        const fadeOpacity = lifeRatio < 0.15 ? lifeRatio / 0.15 : 1 - (lifeRatio - 0.15) / 0.85;
        // Mist "forming" — blobs grow from a small fraction of their
        // base size up to full size over growDuration, instead of
        // snapping in at full size the instant a bubble pops.
        const growRatio = Math.min(v.age / v.growDuration, 1);
        const growScale = 0.3 + growRatio * 0.7;

        v.g.setAttribute('transform', `translate(${v.x}, ${v.y})`);
        v.blobs.forEach((blob) => {
          blob.el.setAttribute('cx', blob.offsetX);
          blob.el.setAttribute('cy', blob.offsetY);
          blob.el.setAttribute('r', blob.rBase * growScale);
          blob.el.setAttribute('opacity', Math.max(0, fadeOpacity * 0.6));
        });

        if (v.age >= v.maxAge) {
          v.g.remove();
          vapors.splice(i, 1);
        }

      } else if (v.state === 'condensing') {
        // Condensing: the vapor coalesces into a falling droplet.
        // condenseAge tracks how far through the coalesce animation we are,
        // independently of v.age (which still tracks total lifespan for safety).
        v.condenseAge += dt;

        // Fall toward the water surface, gentle sway
        v.y += v.fallSpeed * dt;
        v.x += Math.sin(v.condenseAge * 1.4) * Math.abs(v.drift) * 0.25 * dt;

        // Over ~0.6s the puff tightens: blobs converge and shrink to a
        // compact droplet shape, opacity increases (steam → liquid).
        const COALESCE_DUR = 0.6;
        const cr = Math.min(v.condenseAge / COALESCE_DUR, 1); // 0→1

        v.g.setAttribute('transform', `translate(${v.x}, ${v.y})`);
        v.blobs.forEach((blob) => {
          const cx = blob.offsetX * (1 - cr);          // converge toward centre
          const cy = blob.offsetY * (1 - cr);
          const r  = blob.rBase * (0.3 + (1 - cr) * 0.7); // shrink as cr rises
          const opacity = 0.35 + cr * 0.45;            // wispy → more solid
          blob.el.setAttribute('cx', cx);
          blob.el.setAttribute('cy', cy);
          blob.el.setAttribute('r',  Math.max(r, 1.2));
          blob.el.setAttribute('opacity', opacity);
        });

        // Land when the droplet reaches the water surface
        const landed = v.y >= waterTopY;
        // Safety: remove if somehow still airborne after 8s
        const timedOut = v.condenseAge > 8;

        if (landed || timedOut) {
          if (landed) spawnRipple(v.x, waterTopY);
          v.g.remove();
          vapors.splice(i, 1);
        }
      }
    }

    // ---- update ripples: expanding landing rings ----
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.age += dt;
      const ratio = r.age / r.maxAge;
      r.el.setAttribute('cx', r.x);
      r.el.setAttribute('cy', r.y);
      r.el.setAttribute('r',  2 + ratio * 13);
      r.el.setAttribute('stroke', 'currentColor');
      r.el.setAttribute('opacity', (1 - ratio) * 0.45);
      if (r.age >= r.maxAge) {
        r.el.remove();
        ripples.splice(i, 1);
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
    isManualRefilling = false;
    targetLevel = dark ? 0 : 100;
    // Dark→light: any steam mid-flight reverses into falling droplets
    if (!dark) condenseFlyingVapors();
  }

  function applyCurrentTheme() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    setDarkMode(theme === 'dark');
  }

  // ---------- Refill icon + manual refill trigger ----------

  function showRefillIcon() {
    const icon = document.getElementById('hero-refill-icon');
    if (icon) icon.classList.add('is-visible');
  }

  function hideRefillIcon() {
    const icon = document.getElementById('hero-refill-icon');
    if (icon) icon.classList.remove('is-visible');
  }

  function isNearEmpty() {
    return level <= EMPTY_THRESHOLD;
  }

  function triggerRefill() {
    if (!isDarkMode || !isNearEmpty() || isManualRefilling) return;
    isManualRefilling = true;
    targetLevel = 100; // pull back up to full, calmly — refilling isn't a boil action
    hideRefillIcon();
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

    const refillIcon = document.getElementById('hero-refill-icon');
    if (refillIcon) {
      refillIcon.addEventListener('click', triggerRefill);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
