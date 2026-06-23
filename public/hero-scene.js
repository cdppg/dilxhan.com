// ============================================================
// Dilxhan.com — hero-scene.js
// Drives the animated scene clipped inside the "Dilxhan" letters.
//
// Core idea: creatures travel in continuous straight-line paths
// across the FULL scene width/height, completely independent of
// where the letters are. The SVG clip-path (applied in HTML) is
// what makes them only visible when crossing behind a letter —
// this file never needs to know letter boundaries.
//
// Light mode: birds, deer, butterflies drifting inward (calm).
// Dark mode:  same species fleeing outward + embers/ash, with
//             ambient intensity that rises on mouse proximity
//             and a one-time "ignition" flare on switch-to-dark.
// ============================================================

(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // Scene coordinate space mirrors the SVG's *actual* fitted viewBox
  // (computed at runtime by fitHeroViewBox() in app.js, based on the
  // real rendered glyph bounds — NOT a fixed guess). We read it fresh
  // each time we (re)populate the scene so creatures always spawn and
  // travel within the visible window, regardless of font metrics.
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

  let sceneGroup = null;
  let rafId = null;
  let creatures = [];
  let embers = [];
  let mode = 'light'; // 'light' | 'dark'
  let emberIntensity = 0.35; // ambient baseline (0-1), rises on interaction
  let targetIntensity = 0.35;
  let lastFrameTime = performance.now();

  // ---------- Silhouette builders ----------
  // Validated against an isolated render before inclusion here —
  // each must read clearly as its species at small scale. Bird and
  // butterfly are single paths; deer is composed from primitives
  // (ellipses/rects) since a single hand-drawn path didn't read
  // cleanly as a deer. All are wrapped in a <g> for a uniform
  // transform/scale API regardless of internal structure.
  //
  // NOTE: this is a placeholder shape set. The plan is to replace
  // these with hand-uploaded SVG artwork (dropped into
  // /assets/creatures/) once the rest of the site's interactive
  // systems are built — animation polish is being deferred to last,
  // on purpose. Swapping the source later won't require touching
  // the movement/animation logic below, just createSilhouette().

  const SHAPE_PATHS = {
    bird: 'M0,4 Q6,-4 12,4 Q14,0 20,2 Q14,3 12,6 Q14,9 20,8 Q14,7 12,6 Q6,12 0,4 Z',
    butterfly:
      'M10,2 Q6,-5 1,-2 Q-2,1 3,4 Q-1,7 1,11 Q5,15 10,8 Q15,15 19,11 Q21,7 17,4 Q22,1 19,-2 Q14,-5 10,2 Z',
  };

  function buildDeerGroup() {
    const g = document.createElementNS(NS, 'g');
    const parts = [
      { tag: 'ellipse', attrs: { cx: 11, cy: 9, rx: 6, ry: 3.2 } }, // body
      { tag: 'rect', attrs: { x: 14.5, y: 4, width: 2.2, height: 6, rx: 1, transform: 'rotate(15 15.6 7)' } }, // neck
      { tag: 'ellipse', attrs: { cx: 17.5, cy: 4, rx: 2, ry: 1.4 } }, // head
      { tag: 'rect', attrs: { x: 7, y: 11, width: 1.3, height: 6 } }, // legs
      { tag: 'rect', attrs: { x: 10, y: 11.5, width: 1.3, height: 5.5 } },
      { tag: 'rect', attrs: { x: 13, y: 11.5, width: 1.3, height: 5.5 } },
      { tag: 'rect', attrs: { x: 15.5, y: 11, width: 1.3, height: 6 } },
      { tag: 'ellipse', attrs: { cx: 5.3, cy: 8, rx: 0.8, ry: 1 } }, // tail
    ];
    parts.forEach(({ tag, attrs }) => {
      const el = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      g.appendChild(el);
    });
    // antlers as thin strokes, drawn separately since they're stroke-only
    const antlers = document.createElementNS(NS, 'path');
    antlers.setAttribute('d', 'M17,3 L16,0.5 M17.5,2.8 L17.5,0 M18.5,3 L19.8,0.8');
    antlers.setAttribute('stroke', 'currentColor');
    antlers.setAttribute('stroke-width', '0.5');
    antlers.setAttribute('fill', 'none');
    g.appendChild(antlers);
    return g;
  }

  function createSilhouette(shapeKey) {
    const wrapper = document.createElementNS(NS, 'g');
    wrapper.setAttribute('class', 'scene-silhouette');

    if (shapeKey === 'deer') {
      wrapper.appendChild(buildDeerGroup());
    } else {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', SHAPE_PATHS[shapeKey]);
      wrapper.appendChild(path);
    }
    return wrapper;
  }

  // ---------- Creature model ----------
  // Each creature travels a straight line from one side to the
  // other at a constant speed, then respawns on the opposite side
  // with newly randomized vertical position/speed — an endless,
  // non-repeating-looking drift.

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function makeCreature(species, directionSign) {
    const el = createSilhouette(species);

    // Scale relative to actual scene height so creatures read clearly
    // regardless of the letterform's fitted viewBox size.
    const unit = SCENE_H / 12; // ~1/12th of letter height per creature "unit"
    const baseScale =
      species === 'deer'
        ? randRange(0.9, 1.3) * unit * 0.16
        : species === 'bird'
        ? randRange(0.55, 0.95) * unit * 0.18
        : randRange(0.5, 0.8) * unit * 0.14; // butterfly

    const y =
      species === 'deer'
        ? randRange(SCENE_Y + SCENE_H * 0.62, SCENE_Y + SCENE_H * 0.82) // near the "ground"
        : randRange(SCENE_Y + SCENE_H * 0.12, SCENE_Y + SCENE_H * 0.85);

    const speedUnit = SCENE_W / 700; // normalize against original tuning baseline
    const speed =
      (species === 'deer'
        ? randRange(14, 22)
        : species === 'bird'
        ? randRange(40, 70)
        : randRange(18, 30)) * speedUnit * directionSign;

    const flutter = species === 'butterfly' ? randRange(6, 14) : species === 'bird' ? randRange(2, 5) : 0;
    const flutterSpeed = randRange(2, 4);

    return {
      species,
      el,
      x: directionSign > 0
        ? SCENE_X - randRange(0, SCENE_W * 0.4)
        : SCENE_X + SCENE_W + randRange(0, SCENE_W * 0.4),
      y,
      baseY: y,
      scale: baseScale,
      speed,
      flutter,
      flutterSpeed,
      flutterPhase: Math.random() * Math.PI * 2,
      facingRight: speed > 0,
    };
  }

  function respawnCreature(c, directionSign) {
    c.x = directionSign > 0
      ? SCENE_X - randRange(20, 200)
      : SCENE_X + SCENE_W + randRange(20, 200);
    c.y = c.species === 'deer'
      ? randRange(SCENE_Y + SCENE_H * 0.62, SCENE_Y + SCENE_H * 0.82)
      : randRange(SCENE_Y + SCENE_H * 0.12, SCENE_Y + SCENE_H * 0.85);
    c.baseY = c.y;
  }

  // ---------- Ember model (dark mode only) ----------

  function makeEmber() {
    const el = document.createElementNS(NS, 'circle');
    el.setAttribute('class', 'scene-ember');
    const r = randRange(2, 5) * (SCENE_H / 240);
    el.setAttribute('r', r);
    return {
      el,
      x: randRange(SCENE_X, SCENE_X + SCENE_W),
      y: SCENE_Y + randRange(0, SCENE_H), // spread through full height initially
      r,
      riseSpeed: randRange(14, 30),
      drift: randRange(-8, 8),
      life: randRange(0.6, 1),
      maxLife: randRange(2.5, 4.5),
      age: 0,
    };
  }

  function respawnEmber(e) {
    e.x = randRange(SCENE_X, SCENE_X + SCENE_W);
    e.y = SCENE_Y + SCENE_H + randRange(0, 30); // subsequent spawns rise from the bottom
    e.age = 0;
    e.maxLife = randRange(2.5, 4.5);
    e.riseSpeed = randRange(14, 30) * (0.6 + emberIntensity);
    e.drift = randRange(-8, 8);
  }

  // ---------- Scene population ----------

  function clearScene() {
    readViewBox();
    if (sceneGroup) sceneGroup.innerHTML = '';
    creatures = [];
    embers = [];
  }

  function populateLightScene() {
    clearScene();
    const directionSign = 1; // moving inward/rightward — "arriving"

    const counts = { bird: 6, deer: 3, butterfly: 4 };
    Object.entries(counts).forEach(([species, count]) => {
      for (let i = 0; i < count; i++) {
        const c = makeCreature(species, directionSign);
        // Stagger initial X across the full scene width (not just
        // off-screen-left) so the scene reads as populated immediately
        // on load, rather than needing time for everyone to drift in.
        c.x = SCENE_X + (i / count) * SCENE_W * 1.4 - SCENE_W * 0.2 + randRange(-40, 40);
        sceneGroup.appendChild(c.el);
        creatures.push(c);
      }
    });
  }

  function populateDarkScene() {
    clearScene();
    const directionSign = -1; // moving outward/leftward — "fleeing"

    const counts = { bird: 6, deer: 3, butterfly: 3 };
    Object.entries(counts).forEach(([species, count]) => {
      for (let i = 0; i < count; i++) {
        const c = makeCreature(species, directionSign);
        c.speed = Math.abs(c.speed) * 1.4 * directionSign; // fleeing = faster
        c.x = SCENE_X + SCENE_W - (i / count) * SCENE_W * 1.4 + SCENE_W * 0.2 + randRange(-40, 40);
        sceneGroup.appendChild(c.el);
        creatures.push(c);
      }
    });

    for (let i = 0; i < 22; i++) {
      const e = makeEmber();
      e.age = randRange(0, e.maxLife); // stagger initial ages so they don't all pulse in sync
      sceneGroup.appendChild(e.el);
      embers.push(e);
    }
  }

  // ---------- Frame loop ----------

  function step(now) {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05); // clamp for tab-switch gaps
    lastFrameTime = now;

    // ease intensity toward target (mouse proximity / decay)
    emberIntensity += (targetIntensity - emberIntensity) * Math.min(dt * 2, 1);

    creatures.forEach((c) => {
      c.x += c.speed * dt;
      if (c.flutter) {
        c.flutterPhase += dt * c.flutterSpeed;
        c.y = c.baseY + Math.sin(c.flutterPhase) * c.flutter;
      }

      const directionSign = c.speed > 0 ? 1 : -1;
      if (directionSign > 0 && c.x > SCENE_X + SCENE_W + 200) respawnCreature(c, 1);
      if (directionSign < 0 && c.x < SCENE_X - 200) respawnCreature(c, -1);

      const flip = c.speed > 0 ? 1 : -1;
      c.el.setAttribute(
        'transform',
        `translate(${c.x},${c.y}) scale(${c.scale * flip},${c.scale})`
      );
    });

    if (mode === 'dark') {
      embers.forEach((e) => {
        e.age += dt;
        if (e.age > e.maxLife) respawnEmber(e);
        const lifeRatio = e.age / e.maxLife;
        e.y -= e.riseSpeed * dt * (0.5 + emberIntensity);
        e.x += Math.sin(e.age * 2) * e.drift * dt;
        const opacity = lifeRatio < 0.15 ? lifeRatio / 0.15 : 1 - (lifeRatio - 0.15) / 0.85;
        e.el.setAttribute('cx', e.x);
        e.el.setAttribute('cy', e.y);
        e.el.setAttribute('opacity', Math.max(0, opacity * (0.55 + emberIntensity * 0.6)));
      });
    }

    rafId = requestAnimationFrame(step);
  }

  function startLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    lastFrameTime = performance.now();
    rafId = requestAnimationFrame(step);
  }

  // ---------- Mouse interaction (dark mode ember intensity) ----------

  function setupInteraction() {
    const heroEl = document.querySelector('.hero');
    if (!heroEl) return;

    heroEl.addEventListener('mousemove', () => {
      if (mode !== 'dark') return;
      targetIntensity = 1;
    });

    heroEl.addEventListener('mouseleave', () => {
      if (mode !== 'dark') return;
      targetIntensity = 0.35; // ambient baseline
    });
  }

  // ---------- Ignition flare (one-time, on switch-to-dark) ----------

  function igniteFlare() {
    targetIntensity = 1.6; // overshoot for a dramatic flare
    emberIntensity = 1.6;
    setTimeout(() => {
      targetIntensity = 0.35; // settle to ambient baseline
    }, 700);
  }

  // ---------- Public API ----------

  function setMode(newMode, { flare = false } = {}) {
    mode = newMode;
    if (mode === 'light') {
      populateLightScene();
    } else {
      populateDarkScene();
      if (flare) igniteFlare();
      else targetIntensity = 0.35;
    }
  }

  function init() {
    sceneGroup = document.getElementById('hero-scene-elements');
    if (!sceneGroup) return;

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setupInteraction();

    // Wait for the same font-ready signal app.js uses to fit the
    // viewBox, so our scene reads the FINAL tightened viewBox rather
    // than an initial guess. A short follow-up repopulation covers
    // any late metric settling (matches app.js's own safety net).
    const begin = () => {
      setMode(currentTheme, { flare: false });
      startLoop();
      setTimeout(() => setMode(mode, { flare: false }), 200);
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(begin);
    } else {
      setTimeout(begin, 250);
    }

    window.addEventListener('resize', () => {
      // Re-sync scene bounds to the (re-fitted) viewBox on resize,
      // without restarting creature motion abruptly.
      readViewBox();
    });
  }

  window.__dilxhanHeroScene = { setMode };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
