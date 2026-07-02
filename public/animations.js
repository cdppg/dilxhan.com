// ============================================================
// Dilxhan.com — animations.js
// Triggered when the user types an animation word in the prompt.
// Dispatched via: window.dispatchEvent(new CustomEvent('dilxhan:animation', { detail: { key } }))
//
// ── HOW TO ADD A NEW ANIMATION ───────────────────────────────
//
//  1. Copy the template block at the bottom of this file.
//  2. Replace TEMPLATE_KEY with your animation name (lowercase,
//     no spaces — this is what goes in animation_key in D1).
//  3. Write your animation inside the run({ canvas, ctx, done })
//     callback. Call done() when finished so the canvas cleans up.
//  4. Register it: ANIMATIONS['your_key'] = { ... }
//  5. Add a row to D1 via migration or console:
//       INSERT INTO dictionary_entries (word, fact, entry_type, icon, animation_key)
//       VALUES ('yourword', 'Short punchy fact.', 'animation', 'sparkle', 'your_key');
//
// ── HOW THE SYSTEM WORKS ────────────────────────────────────
//
//  - dictionary-engine.js fires 'dilxhan:animation' with { key }
//  - This file listens, checks the cooldown, looks up the registry,
//    creates a full-page canvas overlay (pointer-events: none),
//    and calls run(). done() removes the canvas.
//  - Each animation is fully self-contained — no shared state.
//  - prefers-reduced-motion: animations are skipped entirely.
//
// ── SHARED UTILITIES available inside run() ─────────────────
//
//  randRange(min, max)          — random float between min and max
//  randInt(min, max)            — random integer between min and max
//  randChoice(array)            — random element from array
//  lerp(a, b, t)                — linear interpolation
//  easeOut(t)                   — quadratic ease-out (t from 0→1)
//  easeIn(t)                    — quadratic ease-in
// ============================================================

(function () {

  // ── Shared utilities ────────────────────────────────────────

  const randRange = (min, max) => min + Math.random() * (max - min);
  const randInt   = (min, max) => Math.floor(randRange(min, max + 1));
  const randChoice = (arr)     => arr[Math.floor(Math.random() * arr.length)];
  const lerp      = (a, b, t)  => a + (b - a) * t;
  const easeOut   = (t)        => 1 - (1 - t) * (1 - t);
  const easeIn    = (t)        => t * t;

  // ── Canvas helper ────────────────────────────────────────────
  // Creates a full-viewport overlay canvas, appends it to body,
  // and returns { canvas, ctx, done }.
  // Call done() when your animation ends — it fades and removes the canvas.

  function createOverlay() {
    const canvas  = document.createElement('canvas');
    canvas.style.cssText = [
      'position:fixed', 'inset:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'z-index:9999', 'opacity:1',
      'transition:opacity 600ms ease',
    ].join(';');

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function done() {
      canvas.style.opacity = '0';
      setTimeout(() => canvas.remove(), 650);
    }

    return { canvas, ctx, done };
  }

  // ── Cooldown guard ───────────────────────────────────────────
  // Prevents the same animation from stacking if typed rapidly.
  // Each key gets its own independent cooldown.

  const COOLDOWN_MS = 6000;
  const lastFired   = {};

  function canFire(key) {
    const now = Date.now();
    if (lastFired[key] && now - lastFired[key] < COOLDOWN_MS) return false;
    lastFired[key] = now;
    return true;
  }

  // ── Animation registry ───────────────────────────────────────
  // Keys must match animation_key values in D1.

  const ANIMATIONS = {};

  // ── Event listener ───────────────────────────────────────────

  window.addEventListener('dilxhan:animation', (e) => {
    const key = e.detail?.key;
    if (!key) return;

    // Respect reduced-motion preference — skip visual animations entirely.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const anim = ANIMATIONS[key];
    if (!anim) {
      console.warn(`[animations] No animation registered for key: "${key}"`);
      return;
    }

    if (!canFire(key)) return;

    const { canvas, ctx, done } = createOverlay();
    anim.run({ canvas, ctx, done, randRange, randInt, randChoice, lerp, easeOut, easeIn });
  });


  // ════════════════════════════════════════════════════════════
  //  FIREWORKS
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['fireworks'] = {
    run({ canvas, ctx, done, randRange, randInt, randChoice, easeOut }) {
      const W = canvas.width, H = canvas.height;
      const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#f4acb7','#ffb347','#c77dff'];
      const particles = [];
      const shells    = [];
      let   elapsed   = 0;
      let   lastShell = 0;
      const DURATION  = 4500;

      function launchShell() {
        const x = randRange(W * 0.15, W * 0.85);
        const y = randRange(H * 0.15, H * 0.55);
        const color = randChoice(COLORS);
        const count = randInt(60, 90);
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const speed = randRange(1.8, 4.5);
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color,
            radius: randRange(1.5, 3),
            decay: randRange(0.012, 0.022),
            trail: [],
          });
        }
      }

      function frame(dt) {
        ctx.clearRect(0, 0, W, H);
        elapsed += dt;

        // launch a new shell every ~700ms for the first 3s
        if (elapsed - lastShell > 700 && elapsed < 3000) {
          launchShell();
          lastShell = elapsed;
          if (shells.length === 0) launchShell(); // double on first burst
        }

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 5) p.trail.shift();

          p.vx *= 0.97;
          p.vy  = p.vy * 0.97 + 0.04; // gravity
          p.x  += p.vx;
          p.y  += p.vy;
          p.alpha -= p.decay;

          // draw trail
          for (let t = 0; t < p.trail.length - 1; t++) {
            const ta = (p.alpha * t) / p.trail.length;
            ctx.beginPath();
            ctx.moveTo(p.trail[t].x, p.trail[t].y);
            ctx.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = ta * 0.5;
            ctx.lineWidth   = p.radius * 0.7;
            ctx.stroke();
          }

          // draw particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle  = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fill();

          if (p.alpha <= 0) particles.splice(i, 1);
        }

        ctx.globalAlpha = 1;

        if (elapsed >= DURATION && particles.length === 0) {
          done();
        } else {
          requestAnimationFrame((ts) => frame(ts - (frame._last || ts)));
          frame._last = performance.now();
        }
      }

      let lastTs = null;
      requestAnimationFrame(function tick(ts) {
        const dt = lastTs ? ts - lastTs : 16;
        lastTs = ts;
        frame(dt);
      });
    },
  };


  // ════════════════════════════════════════════════════════════
  //  CONFETTI
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['confetti'] = {
    run({ canvas, ctx, done, randRange, randInt, randChoice }) {
      const W = canvas.width, H = canvas.height;
      const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#f4acb7','#a29bfe','#fd79a8'];
      const SHAPES = ['rect', 'circle'];
      const pieces = [];
      const COUNT  = Math.min(180, Math.floor(W * 0.18));

      for (let i = 0; i < COUNT; i++) {
        pieces.push({
          x:     randRange(0, W),
          y:     randRange(-H * 0.3, -10),
          vx:    randRange(-1.5, 1.5),
          vy:    randRange(2.5, 5.5),
          rot:   randRange(0, Math.PI * 2),
          rotV:  randRange(-0.08, 0.08),
          w:     randRange(7, 14),
          h:     randRange(4, 9),
          color: randChoice(COLORS),
          shape: randChoice(SHAPES),
          wobble: randRange(0, Math.PI * 2),
          wobbleSpeed: randRange(0.05, 0.12),
        });
      }

      let done_ = false;
      const DURATION = 4000;
      let elapsed = 0;

      function frame(dt) {
        ctx.clearRect(0, 0, W, H);
        elapsed += dt;

        let alive = 0;
        for (const p of pieces) {
          p.wobble += p.wobbleSpeed;
          p.x  += p.vx + Math.sin(p.wobble) * 0.8;
          p.y  += p.vy;
          p.rot += p.rotV;

          if (p.y < H + 20) alive++;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = elapsed > 3000 ? Math.max(0, 1 - (elapsed - 3000) / 1000) : 1;
          ctx.fillStyle = p.color;

          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }

          ctx.restore();
        }

        ctx.globalAlpha = 1;

        if (elapsed >= DURATION && alive === 0) {
          done();
        } else {
          requestAnimationFrame((ts) => {
            frame(ts - (frame._last || ts));
            frame._last = ts;
          });
        }
      }

      let lastTs = null;
      requestAnimationFrame(function tick(ts) {
        const dt = lastTs ? ts - lastTs : 16;
        lastTs = ts;
        frame(dt);
      });
    },
  };


  // ════════════════════════════════════════════════════════════
  //  SNOW
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['snow'] = {
    run({ canvas, ctx, done, randRange, randInt }) {
      const W = canvas.width, H = canvas.height;
      const COUNT    = Math.min(220, Math.floor(W * 0.2));
      const DURATION = 5500;
      const flakes   = [];

      for (let i = 0; i < COUNT; i++) {
        flakes.push({
          x:      randRange(0, W),
          y:      randRange(-50, H),
          r:      randRange(1.5, 4.5),
          vy:     randRange(0.6, 2.2),
          vx:     randRange(-0.4, 0.4),
          wobble: randRange(0, Math.PI * 2),
          wobbleSpeed: randRange(0.01, 0.04),
        });
      }

      let elapsed = 0;

      function frame(dt) {
        ctx.clearRect(0, 0, W, H);
        elapsed += dt;
        const fadeAlpha = elapsed > 4500 ? Math.max(0, 1 - (elapsed - 4500) / 1000) : 1;

        for (const f of flakes) {
          f.wobble += f.wobbleSpeed;
          f.x += f.vx + Math.sin(f.wobble) * 0.5;
          f.y += f.vy;
          if (f.y > H + 10) { f.y = -10; f.x = randRange(0, W); }

          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle  = '#ffffff';
          ctx.globalAlpha = fadeAlpha * 0.85;
          ctx.fill();
        }

        ctx.globalAlpha = 1;

        if (elapsed >= DURATION) {
          done();
        } else {
          requestAnimationFrame((ts) => frame(ts - (frame._last || ts)));
          frame._last = performance.now();
        }
      }

      let lastTs = null;
      requestAnimationFrame(function tick(ts) {
        const dt = lastTs ? ts - lastTs : 16;
        lastTs = ts;
        frame(dt);
      });
    },
  };


  // ════════════════════════════════════════════════════════════
  //  MATRIX  — green falling characters
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['matrix'] = {
    run({ canvas, ctx, done, randRange, randInt, randChoice }) {
      const W = canvas.width, H = canvas.height;
      const FONT_SIZE = 14;
      const COLS      = Math.floor(W / FONT_SIZE);
      const CHARS     = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01'.split('');
      const drops     = Array.from({ length: COLS }, () => randRange(0, -H / FONT_SIZE));
      const DURATION  = 5000;
      let elapsed     = 0;

      function frame(dt) {
        elapsed += dt;

        // Semi-transparent black trail gives the falling character effect
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, W, H);

        const fadeAlpha = elapsed > 4000 ? Math.max(0, 1 - (elapsed - 4000) / 1000) : 1;
        ctx.font        = `${FONT_SIZE}px monospace`;

        for (let i = 0; i < drops.length; i++) {
          const char = randChoice(CHARS);
          const x    = i * FONT_SIZE;
          const y    = drops[i] * FONT_SIZE;

          // Leading character — bright white
          ctx.fillStyle   = `rgba(200,255,200,${fadeAlpha})`;
          ctx.globalAlpha = fadeAlpha;
          ctx.fillText(char, x, y);

          // Trail character — green
          if (drops[i] > 1) {
            ctx.fillStyle = `rgba(0,200,70,${fadeAlpha * 0.7})`;
            ctx.fillText(randChoice(CHARS), x, y - FONT_SIZE);
          }

          // Reset column when it falls off bottom (random chance for stagger)
          if (y > H && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i] += 0.5;
        }

        ctx.globalAlpha = 1;

        if (elapsed >= DURATION) {
          done();
        } else {
          requestAnimationFrame((ts) => frame(ts - (frame._last || ts)));
          frame._last = performance.now();
        }
      }

      let lastTs = null;
      requestAnimationFrame(function tick(ts) {
        const dt = lastTs ? ts - lastTs : 16;
        lastTs = ts;
        frame(dt);
      });
    },
  };


  // ════════════════════════════════════════════════════════════
  //  GLITCH  — scanlines, RGB channel-split bars, noise pixels
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['glitch'] = {
    run({ canvas, ctx, done, randRange, randInt }) {
      const W = canvas.width, H = canvas.height;
      const DURATION = 1400;
      let elapsed    = 0;

      function frame(ts) {
        elapsed += 16; // approximate; good enough for a short burst
        ctx.clearRect(0, 0, W, H);

        // Intensity peaks mid-animation, eases in and out
        const t         = Math.min(elapsed / DURATION, 1);
        const intensity = Math.sin(t * Math.PI);

        if (intensity > 0.05) {
          // ── Horizontal tear bars with RGB channel split ──
          const barCount = Math.floor(randRange(3, 9) * intensity);
          for (let i = 0; i < barCount; i++) {
            const y     = randRange(0, H);
            const bh    = randRange(1, Math.max(2, 14 * intensity));
            const shift = (Math.random() < 0.5 ? 1 : -1) * randRange(4, 32) * intensity;

            ctx.globalAlpha = randRange(0.07, 0.2) * intensity;
            ctx.fillStyle = 'rgba(255,0,80,1)';
            ctx.fillRect(shift, y, W, bh);

            ctx.fillStyle = 'rgba(0,255,200,1)';
            ctx.fillRect(-shift, y + bh * 0.4, W, bh * 0.6);
          }

          // ── Scanline overlay ──
          ctx.globalAlpha = 0.03 * intensity;
          ctx.fillStyle = '#000';
          for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);

          // ── Random noise pixels ──
          if (intensity > 0.35) {
            const count = Math.floor(randRange(60, 220) * intensity);
            for (let i = 0; i < count; i++) {
              ctx.globalAlpha = randRange(0.1, 0.5) * intensity;
              ctx.fillStyle = `rgb(${randInt(0,255)},${randInt(0,255)},${randInt(0,255)})`;
              ctx.fillRect(randRange(0, W), randRange(0, H), randRange(1, 4), randRange(1, 3));
            }
          }
        }

        ctx.globalAlpha = 1;

        if (elapsed >= DURATION) {
          done();
        } else {
          requestAnimationFrame(frame);
        }
      }

      requestAnimationFrame(frame);
    },
  };


  // ════════════════════════════════════════════════════════════
  //  AURORA  — shifting curtains of color across the top
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['aurora'] = {
    run({ canvas, ctx, done, randRange }) {
      const W = canvas.width, H = canvas.height;
      const DURATION = 6000;
      let elapsed    = 0;

      // 3 overlapping curtains, each with its own phase and color
      const curtains = [
        { color: [100, 220, 180], phase: 0,    speed: 0.0008, amp: H * 0.18, yBase: H * 0.08 },
        { color: [60,  180, 255], phase: 2.1,  speed: 0.0011, amp: H * 0.13, yBase: H * 0.05 },
        { color: [160, 100, 255], phase: 4.3,  speed: 0.0007, amp: H * 0.22, yBase: H * 0.03 },
      ];

      function frame(dt) {
        elapsed += dt;
        ctx.clearRect(0, 0, W, H);

        const globalAlpha = elapsed > 5000
          ? Math.max(0, 1 - (elapsed - 5000) / 1000)
          : Math.min(1, elapsed / 800);

        for (const c of curtains) {
          c.phase += c.speed * dt;

          ctx.beginPath();
          ctx.moveTo(0, 0);

          for (let x = 0; x <= W; x += 4) {
            const wave = Math.sin(x * 0.005 + c.phase) * c.amp
                       + Math.sin(x * 0.009 + c.phase * 1.3) * c.amp * 0.4;
            ctx.lineTo(x, c.yBase + wave);
          }

          ctx.lineTo(W, 0);
          ctx.closePath();

          const [r, g, b] = c.color;
          const grad = ctx.createLinearGradient(0, 0, 0, c.yBase + c.amp * 1.5);
          grad.addColorStop(0,   `rgba(${r},${g},${b},0.55)`);
          grad.addColorStop(0.6, `rgba(${r},${g},${b},0.2)`);
          grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);

          ctx.globalAlpha = globalAlpha;
          ctx.fillStyle   = grad;
          ctx.fill();
        }

        ctx.globalAlpha = 1;

        if (elapsed >= DURATION) {
          done();
        } else {
          requestAnimationFrame((ts) => frame(ts - (frame._last || ts)));
          frame._last = performance.now();
        }
      }

      let lastTs = null;
      requestAnimationFrame(function tick(ts) {
        const dt = lastTs ? ts - lastTs : 16;
        lastTs = ts;
        frame(dt);
      });
    },
  };

  
  // ════════════════════════════════════════════════════════════
  //  KITTY  — cat paw prints walk across the screen
  //
  //  HOW THE CAT WALKS:
  //  Cats use a diagonal gait: RF → LH → LF → RH (repeat).
  //  Left/right paws are offset perpendicular to the walk direction.
  //  A "hop" is just 2-3 steps with shorter stride and faster timing.
  //  Each paw print stamps in, holds, then fades.
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['kitty'] = {
    run({ canvas, ctx, done, randRange, randInt, randChoice }) {
      const W = canvas.width, H = canvas.height;

      // ── Tuning knobs ─────────────────────────────────────────
      const STRIDE       = 72;   // px between each step along the walk path
      const LATERAL      = 28;   // px left/right offset from the center line
      const STEP_DELAY   = 280;  // ms between each paw placement
      const HOP_STRIDE   = 32;   // px between steps during a hop (shorter = tighter)
      const HOP_DELAY    = 140;  // ms between steps during a hop (faster)
      const TOTAL_STEPS  = 22;   // how many paw prints before the cat leaves
      const FADE_IN_MS   = 120;  // how fast each print stamps in
      const HOLD_MS      = 1800; // how long the print stays solid
      const FADE_OUT_MS  = 600;  // how long the print takes to fade
      // ─────────────────────────────────────────────────────────

      // ── Draw one paw print ───────────────────────────────────
      // x, y = center of the main pad
      // angle = direction the cat is walking (radians)
      // isLeft = true for left paw, false for right
      function drawPaw(x, y, angle, isLeft) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        // Mirror for left vs right paw
        if (isLeft) ctx.scale(-1, 1);

        // Main pad — large rounded oval
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // 4 toe beans — arc of small ovals above the main pad
        // Toes are arranged: outer-left, inner-left, inner-right, outer-right
        const toes = [
          { x: -11, y: -10, rx: 4.5, ry: 5.5, rot: -0.5 },
          { x: -4,  y: -16, rx: 4.5, ry: 5.5, rot: -0.15 },
          { x:  4,  y: -16, rx: 4.5, ry: 5.5, rot:  0.15 },
          { x:  11, y: -10, rx: 4.5, ry: 5.5, rot:  0.5  },
        ];
        for (const t of toes) {
          ctx.save();
          ctx.translate(t.x, t.y);
          ctx.rotate(t.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, t.rx, t.ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      }

      // ── Build the step sequence ──────────────────────────────
      // Decide walk direction, start position, and where hops happen
      const walkAngle = randRange(-Math.PI * 0.25, Math.PI * 0.25)
                      + (Math.random() < 0.5 ? 0 : Math.PI); // left→right or right→left
      const startX = walkAngle > Math.PI / 2 || walkAngle < -Math.PI / 2
        ? W + 40 : -40;
      const startY = randRange(H * 0.2, H * 0.75);

      // Gait order: RF=0, LH=1, LF=2, RH=3 → isLeft: F,LH,T,F
      // 0=RightFront, 1=LeftHind, 2=LeftFront, 3=RightHind
      const isLeftPaw  = [false, true,  true,  false];
      const lateralDir = [1,    -1,    -1,     1   ]; // +1 = right of travel

      // Pick 2 random hops (set of 3 quick steps) during the walk
      const hopStarts = new Set();
      while (hopStarts.size < 2) {
        hopStarts.add(randInt(4, TOTAL_STEPS - 6));
      }
      let inHop = 0; // countdown for hop steps remaining

      const steps = [];
      let cx = startX, cy = startY, gaitIndex = 0;

      for (let i = 0; i < TOTAL_STEPS; i++) {
        // Check if this step starts a hop
        if (hopStarts.has(i)) inHop = 3;

        const stride  = inHop > 0 ? HOP_STRIDE  : STRIDE;
        const delay   = inHop > 0 ? HOP_DELAY   : STEP_DELAY;
        if (inHop > 0) inHop--;

        // Advance position along walk direction
        cx += Math.cos(walkAngle) * stride;
        cy += Math.sin(walkAngle) * stride;

        // Add lateral offset perpendicular to walk direction
        const perpAngle = walkAngle + Math.PI / 2;
        const lateralOffset = lateralDir[gaitIndex] * LATERAL;
        const px = cx + Math.cos(perpAngle) * lateralOffset;
        const py = cy + Math.sin(perpAngle) * lateralOffset;

        steps.push({
          x:      px,
          y:      py,
          isLeft: isLeftPaw[gaitIndex],
          delay,        // ms after previous step to place this one
          age:    null, // filled in when the step is stamped (performance.now())
        });

        gaitIndex = (gaitIndex + 1) % 4;
      }

      // ── Animation loop ───────────────────────────────────────
      // Steps are scheduled via setTimeout so each print appears
      // at the right time. The rAF loop just redraws all active prints.

      const active = []; // prints currently visible on screen
      let allScheduled = false;
      let totalDelay = 0;
      let allDone = false;

      // Schedule each step
      for (const step of steps) {
        totalDelay += step.delay;
        const t = totalDelay;
        setTimeout(() => {
          step.age = performance.now();
          active.push(step);
        }, t);
      }

      // Mark when all steps + their hold + fade will be finished
      const totalDuration = totalDelay + HOLD_MS + FADE_OUT_MS + 200;
      setTimeout(() => { allDone = true; }, totalDuration);

      // Theme-aware paw color
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const PAW_COLOR = isDark
        ? 'rgba(200, 200, 210, {a})'   // soft light grey in dark mode
        : 'rgba(60,  50,  80,  {a})';  // warm dark in light mode

      function frame() {
        ctx.clearRect(0, 0, W, H);
        const now = performance.now();

        for (const step of active) {
          if (step.age === null) continue;
          const elapsed = now - step.age;

          let alpha;
          if (elapsed < FADE_IN_MS) {
            // Stamp in: quick scale isn't possible with just globalAlpha,
            // but a fast fade-in reads as a "stamp" well enough
            alpha = elapsed / FADE_IN_MS;
          } else if (elapsed < FADE_IN_MS + HOLD_MS) {
            alpha = 1;
          } else {
            const fadeElapsed = elapsed - FADE_IN_MS - HOLD_MS;
            alpha = Math.max(0, 1 - fadeElapsed / FADE_OUT_MS);
          }

          ctx.fillStyle = PAW_COLOR.replace('{a}', alpha.toFixed(3));
          drawPaw(step.x, step.y, walkAngle + Math.PI / 2, step.isLeft);
        }

        if (allDone && active.every(s => {
          if (s.age === null) return true;
          return (performance.now() - s.age) > FADE_IN_MS + HOLD_MS + FADE_OUT_MS;
        })) {
          done();
        } else {
          requestAnimationFrame(frame);
        }
      }

      requestAnimationFrame(frame);
    },
  };

  // ════════════════════════════════════════════════════════════
  //  ── TEMPLATE — copy this block to add a new animation ────
  //
  //  Steps:
  //    1. Copy from the opening line to the closing });
  //    2. Replace TEMPLATE_KEY with your animation's key name
  //    3. Fill in the run() body with your animation logic
  //    4. Add a D1 row for the trigger word (see top of file)
  //
  //  Available inside run():
  //    canvas, ctx    — the overlay canvas and its 2D context
  //    done()         — call this when your animation ends
  //    randRange(min, max), randInt(min, max), randChoice(arr)
  //    lerp(a, b, t), easeOut(t), easeIn(t)
  //
  // ════════════════════════════════════════════════════════════

  // ANIMATIONS['TEMPLATE_KEY'] = {
  //   run({ canvas, ctx, done, randRange, randInt, randChoice, lerp, easeOut, easeIn }) {
  //     const W = canvas.width, H = canvas.height;
  //     const DURATION = 3000; // total animation time in ms
  //     let elapsed = 0;
  //
  //     function frame(dt) {
  //       ctx.clearRect(0, 0, W, H);
  //       elapsed += dt;
  //
  //       // ── your drawing code here ──
  //
  //       if (elapsed >= DURATION) {
  //         done(); // clean up and remove canvas
  //       } else {
  //         requestAnimationFrame((ts) => frame(ts - (frame._last || ts)));
  //         frame._last = performance.now();
  //       }
  //     }
  //
  //     let lastTs = null;
  //     requestAnimationFrame(function tick(ts) {
  //       const dt = lastTs ? ts - lastTs : 16;
  //       lastTs = ts;
  //       frame(dt);
  //     });
  //   },
  // };

})();
