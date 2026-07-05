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
  //  Setup:
  //    1. Put your paw image at: public/assets/paw.png
  //    2. Add D1 row:
  //       INSERT INTO dictionary_entries (word, fact, entry_type, icon, animation_key)
  //       VALUES ('kitty', 'pitter patter.', 'animation', 'bird', 'kitty');
  //
  //  HOW THE WALK WORKS:
  //    Cats use a diagonal gait: RF → LH → LF → RH (repeat).
  //    Left paws are mirrored horizontally from the PNG.
  //    Hops = 2-3 rapid short steps, scattered randomly along the path.
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['kitty'] = {
    run({ canvas, ctx, done, randRange, randInt, randChoice }) {
      const W = canvas.width, H = canvas.height;

      // ── Tuning knobs ─────────────────────────────────────────
      const PAW_SIZE     = 24;   // ← px size of the paw PNG (width & height)
      const STRIDE       = 72;   // px between each step along the walk path
      const LATERAL      = 28;   // px left/right offset from the center line
      const STEP_DELAY   = 280;  // ms between each paw placement
      const HOP_STRIDE   = 32;   // px between steps during a hop (shorter = tighter)
      const HOP_DELAY    = 130;  // ms between steps during a hop (faster)
      const TOTAL_STEPS  = 22;   // how many paw prints before the cat exits
      const FADE_IN_MS   = 100;  // how fast each print stamps in
      const HOLD_MS      = 1800; // how long each print stays fully visible
      const FADE_OUT_MS  = 600;  // how long each print takes to fade out
      // ─────────────────────────────────────────────────────────

      // ── Preload paw image ────────────────────────────────────
      const pawImg = new Image();
      pawImg.src = '/assets/paw.png';
      pawImg.onload  = startAnimation;
      pawImg.onerror = () => {
        console.warn('[kitty] Could not load /assets/paw.png — check the path.');
        done();
      };

      // ── Draw one paw print ───────────────────────────────────
      // x, y   = center position
      // angle  = direction the cat is walking (radians)
      // isLeft = mirror the image for the left paw
      function drawPaw(x, y, angle, isLeft) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        if (isLeft) ctx.scale(-1, 1);
        ctx.drawImage(pawImg, -PAW_SIZE / 2, -PAW_SIZE / 2, PAW_SIZE, PAW_SIZE);
        ctx.restore();
      }

      function startAnimation() {

        // ── Walk path ──────────────────────────────────────────
        // Random direction: left→right or right→left with slight vertical drift
        const goingRight = Math.random() < 0.5;
        const walkAngle  = (goingRight ? 0 : Math.PI) + randRange(-0.3, 0.3);
        const startX     = goingRight ? -PAW_SIZE : W + PAW_SIZE;
        const startY     = randRange(H * 0.15, H * 0.8);

        // ── Gait pattern ───────────────────────────────────────
        // 4-beat diagonal gait: Right Front, Left Hind, Left Front, Right Hind
        // isLeftPaw:  RF=false, LH=true,  LF=true,  RH=false
        // lateralDir: positive = right of travel, negative = left
        const isLeftPaw  = [false, true,  true,  false];
        const lateralDir = [1,    -1,     1,    -1    ];

        // ── Pick 2 random hop bursts ────────────────────────────
        // A hop = 3 rapid short steps in a row, scattered mid-walk
        const hopStarts = new Set();
        while (hopStarts.size < 2) hopStarts.add(randInt(3, TOTAL_STEPS - 5));
        let inHop = 0;

        // ── Build the full step list ────────────────────────────
        const steps = [];
        let cx = startX, cy = startY, gaitIndex = 0;

        for (let i = 0; i < TOTAL_STEPS; i++) {
          if (hopStarts.has(i)) inHop = 3;

          const stride = inHop > 0 ? HOP_STRIDE : STRIDE;
          const delay  = inHop > 0 ? HOP_DELAY  : STEP_DELAY;
          if (inHop > 0) inHop--;

          // Advance along the walk direction
          cx += Math.cos(walkAngle) * stride;
          cy += Math.sin(walkAngle) * stride;

          // Offset perpendicular to the walk (left/right paw separation)
          const perpAngle = walkAngle + Math.PI / 2;
          const px = cx + Math.cos(perpAngle) * lateralDir[gaitIndex] * LATERAL;
          const py = cy + Math.sin(perpAngle) * lateralDir[gaitIndex] * LATERAL;

          steps.push({
            x:      px,
            y:      py,
            isLeft: isLeftPaw[gaitIndex],
            delay,
            age:    null, // set by setTimeout when the step is stamped
          });

          gaitIndex = (gaitIndex + 1) % 4;
        }

        // ── Schedule each step ──────────────────────────────────
        let totalDelay = 0;
        for (const step of steps) {
          totalDelay += step.delay;
          const t = totalDelay;
          setTimeout(() => { step.age = performance.now(); }, t);
        }

        // Total animation budget = all steps + last print's full life
        const totalDuration = totalDelay + FADE_IN_MS + HOLD_MS + FADE_OUT_MS + 300;
        let finished = false;
        setTimeout(() => { finished = true; }, totalDuration);

        // ── Frame loop ──────────────────────────────────────────
        function frame() {
          ctx.clearRect(0, 0, W, H);
          const now = performance.now();

          for (const step of steps) {
            if (step.age === null) continue;

            const elapsed = now - step.age;
            let alpha;

            if (elapsed < FADE_IN_MS) {
              alpha = elapsed / FADE_IN_MS;                                   // stamping in
            } else if (elapsed < FADE_IN_MS + HOLD_MS) {
              alpha = 1;                                                       // holding
            } else {
              alpha = Math.max(0, 1 - (elapsed - FADE_IN_MS - HOLD_MS) / FADE_OUT_MS); // fading
            }

            if (alpha <= 0) continue;

            ctx.globalAlpha = alpha;
            // Rotate the paw to face the direction of travel
            drawPaw(step.x, step.y, walkAngle + Math.PI / 2, step.isLeft);
          }

          ctx.globalAlpha = 1;

          if (finished) {
            done();
          } else {
            requestAnimationFrame(frame);
          }
        }

        requestAnimationFrame(frame);
      }
    },
  };

  // ════════════════════════════════════════════════════════════
  //  ALIEN  — UFO arrives, lights up the screen, beam extends,
  //           alien descends, scurries into the dark and vanishes
  //
  //  Pure canvas — no assets needed.
  //
  //  SEQUENCE:
  //    0–900ms     UFO flies in from right, slows to hover
  //    750–1400ms  Screen pulses with colour washes
  //    1300–2500ms Light ray extends down from UFO belly
  //    2400–3800ms Alien descends inside the ray
  //    3700–4350ms Alien scurries sideways into darkness
  //    4350–5000ms Alien shrinks and fades into shadow
  //    4800–5300ms Ray retracts
  //    5000–5700ms UFO flies back off screen
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['alien'] = {
    run({ canvas, ctx, done, randRange, randInt, randChoice, lerp, easeOut, easeIn }) {
      const W = canvas.width, H = canvas.height;

      // ── Tuning knobs ─────────────────────────────────────────
      const UFO_Y     = H * 0.18;    // how high the UFO hovers
      const UFO_W     = W * 0.18;    // UFO body width
      const UFO_H     = UFO_W * 0.3; // UFO body height
      const GROUND_Y  = H * 0.82;    // where the alien lands
      const RAY_TOP_W = UFO_W * 0.4; // beam width at UFO belly
      const RAY_BOT_W = UFO_W * 0.9; // beam width at ground
      const ALIEN_H   = H * 0.09;    // alien body height (try H*0.12 for chunkier)
      // ─────────────────────────────────────────────────────────

      const UFO_X = W * 0.48; // hover X — roughly centre

      // progress(now, start, dur) → 0–1 clamped
      function progress(now, start, dur) {
        return Math.min(1, Math.max(0, (now - start) / dur));
      }

      const T = {
        ufoFlyIn:     { start: 0,    dur: 900  },
        screenFlash:  { start: 750,  dur: 650  },
        rayExtend:    { start: 1300, dur: 1200 },
        alienDescend: { start: 2400, dur: 1400 },
        alienScurry:  { start: 3700, dur: 650  },
        alienVanish:  { start: 4350, dur: 650  },
        rayRetract:   { start: 4800, dur: 500  },
        ufoFlyOut:    { start: 5000, dur: 700  },
        total:                        5800,
      };

      const FLASH_COLORS = [
        [120, 220, 255], // cyan
        [180, 100, 255], // purple
        [80,  255, 160], // green
        [255, 200,  80], // amber
      ];
      let flashColorIndex = 0;
      let lastFlashSwitch = 0;

      // ── UFO ──────────────────────────────────────────────────
      function drawUFO(x, y, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;

        // Underglow
        const glowR = UFO_W * 0.7;
        const glow = ctx.createRadialGradient(x, y + UFO_H * 0.5, 0, x, y + UFO_H * 0.5, glowR);
        glow.addColorStop(0,   'rgba(120, 240, 180, 0.35)');
        glow.addColorStop(0.5, 'rgba(80,  200, 140, 0.12)');
        glow.addColorStop(1,   'rgba(0,   0,   0,   0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(x, y + UFO_H * 0.5, glowR, glowR * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body
        const bodyGrad = ctx.createLinearGradient(x - UFO_W, y, x + UFO_W, y + UFO_H);
        bodyGrad.addColorStop(0,   '#9ee8c8');
        bodyGrad.addColorStop(0.4, '#c8f5e0');
        bodyGrad.addColorStop(1,   '#5ab894');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.ellipse(x, y, UFO_W * 0.5, UFO_H * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dome
        const domeGrad = ctx.createRadialGradient(
          x - UFO_W * 0.1, y - UFO_H * 0.6, 1,
          x, y - UFO_H * 0.3, UFO_W * 0.28
        );
        domeGrad.addColorStop(0,   'rgba(220,255,240,0.95)');
        domeGrad.addColorStop(0.6, 'rgba(100,220,180,0.7)');
        domeGrad.addColorStop(1,   'rgba(60, 160,120,0.5)');
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.ellipse(x, y - UFO_H * 0.1, UFO_W * 0.28, UFO_H * 0.75, 0, Math.PI, 0);
        ctx.fill();

        // Pulsing ring lights
        for (let i = 0; i < 7; i++) {
          const angle = (i / 7) * Math.PI * 2;
          const lx    = x + Math.cos(angle) * UFO_W * 0.38;
          const ly    = y + Math.sin(angle) * UFO_H * 0.28;
          const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.006 + i * 1.1);
          ctx.beginPath();
          ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, ${180 + Math.floor(pulse * 60)}, 80, ${0.7 + pulse * 0.3})`;
          ctx.fill();
        }

        ctx.restore();
      }

      // ── Ray ──────────────────────────────────────────────────
      function drawRay(ufoX, ufoY, extendP) {
        const topY   = ufoY + UFO_H * 0.45;
        const botY   = lerp(topY, GROUND_Y, extendP);
        const topW   = RAY_TOP_W;
        const botW   = lerp(topW, RAY_BOT_W, extendP);
        const flicker = 0.85 + 0.15 * Math.sin(Date.now() * 0.03);

        const rayGrad = ctx.createLinearGradient(0, topY, 0, botY);
        rayGrad.addColorStop(0,   `rgba(160,255,200,${0.55 * flicker})`);
        rayGrad.addColorStop(0.5, `rgba(100,220,170,${0.30 * flicker})`);
        rayGrad.addColorStop(1,   `rgba(60, 180,130,${0.10 * flicker})`);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(ufoX - topW / 2, topY);
        ctx.lineTo(ufoX + topW / 2, topY);
        ctx.lineTo(ufoX + botW / 2, botY);
        ctx.lineTo(ufoX - botW / 2, botY);
        ctx.closePath();
        ctx.fillStyle = rayGrad;
        ctx.fill();
        ctx.restore();
      }

      // ── Alien ────────────────────────────────────────────────
      // x, y = feet position; scale shrinks to 0 on vanish
      function drawAlien(x, y, alpha, scale) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.translate(0, -ALIEN_H); // draw upward from feet

        const head_r = ALIEN_H * 0.28;
        const headCY = head_r;
        const bodyTop = headCY + head_r * 0.7;
        const bodyBot = ALIEN_H * 0.72;

        // Body
        ctx.fillStyle = '#5ddc8a';
        ctx.beginPath();
        ctx.ellipse(0, (bodyTop + bodyBot) / 2, ALIEN_H * 0.1, (bodyBot - bodyTop) / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arms
        ctx.strokeStyle = '#5ddc8a';
        ctx.lineWidth = Math.max(1.5, ALIEN_H * 0.045);
        ctx.lineCap = 'round';
        const armY = bodyTop + (bodyBot - bodyTop) * 0.3;
        ctx.beginPath();
        ctx.moveTo(-ALIEN_H * 0.1,  armY);
        ctx.lineTo(-ALIEN_H * 0.28, armY + ALIEN_H * 0.14);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo( ALIEN_H * 0.1,  armY);
        ctx.lineTo( ALIEN_H * 0.28, armY + ALIEN_H * 0.14);
        ctx.stroke();

        // Legs
        ctx.beginPath();
        ctx.moveTo(-ALIEN_H * 0.05, bodyBot);
        ctx.lineTo(-ALIEN_H * 0.14, ALIEN_H * 0.96);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo( ALIEN_H * 0.05, bodyBot);
        ctx.lineTo( ALIEN_H * 0.14, ALIEN_H * 0.96);
        ctx.stroke();

        // Head
        ctx.fillStyle = '#6eeaa0';
        ctx.beginPath();
        ctx.ellipse(0, headCY, head_r * 0.82, head_r, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const eyeOffX = head_r * 0.38;
        const eyeY    = headCY + head_r * 0.05;
        const eyeRX   = head_r * 0.3;
        const eyeRY   = head_r * 0.38;

        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.ellipse(-eyeOffX, eyeY, eyeRX, eyeRY, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse( eyeOffX, eyeY, eyeRX, eyeRY,  0.2, 0, Math.PI * 2);
        ctx.fill();

        // Eye gleam
        ctx.fillStyle = 'rgba(180,255,220,0.7)';
        ctx.beginPath();
        ctx.ellipse(-eyeOffX - eyeRX * 0.2, eyeY - eyeRY * 0.25, eyeRX * 0.25, eyeRY * 0.2, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse( eyeOffX - eyeRX * 0.2, eyeY - eyeRY * 0.25, eyeRX * 0.25, eyeRY * 0.2,  0.2, 0, Math.PI * 2);
        ctx.fill();

        // Antennae
        ctx.strokeStyle = '#5ddc8a';
        ctx.lineWidth = Math.max(1, ALIEN_H * 0.03);
        ctx.beginPath();
        ctx.moveTo(-head_r * 0.35, headCY - head_r * 0.85);
        ctx.lineTo(-head_r * 0.55, headCY - head_r * 1.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo( head_r * 0.35, headCY - head_r * 0.85);
        ctx.lineTo( head_r * 0.55, headCY - head_r * 1.4);
        ctx.stroke();

        // Antenna tips
        ctx.fillStyle = '#aaffe0';
        ctx.beginPath();
        ctx.arc(-head_r * 0.55, headCY - head_r * 1.4, ALIEN_H * 0.03, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc( head_r * 0.55, headCY - head_r * 1.4, ALIEN_H * 0.03, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // ── Frame loop ───────────────────────────────────────────
      let startTime = null;

      function frame(ts) {
        if (!startTime) startTime = ts;
        const now = ts - startTime;

        ctx.clearRect(0, 0, W, H);

        // flyInP / flyOutP computed first — overlay needs them
        const flyInP  = easeOut(progress(now, T.ufoFlyIn.start,  T.ufoFlyIn.dur));
        const flyOutP = easeIn (progress(now, T.ufoFlyOut.start, T.ufoFlyOut.dur));

        // Dark overlay — contrast fix for light mode
        const overlayAlpha = now < T.ufoFlyOut.start
          ? Math.min(0.45, flyInP * 0.45)
          : 0.45 * (1 - flyOutP);
        ctx.fillStyle = `rgba(0,0,10,${overlayAlpha})`;
        ctx.fillRect(0, 0, W, H);

        // Screen colour flash
        const flashP = progress(now, T.screenFlash.start, T.screenFlash.dur);
        if (flashP > 0 && flashP < 1) {
          if (now - lastFlashSwitch > 160) {
            flashColorIndex = (flashColorIndex + 1) % FLASH_COLORS.length;
            lastFlashSwitch = now;
          }
          const [r, g, b] = FLASH_COLORS[flashColorIndex];
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.sin(flashP * Math.PI) * 0.18})`;
          ctx.fillRect(0, 0, W, H);
        }

        // UFO position + draw
        const ufoX    = now < T.ufoFlyOut.start
          ? lerp(W + UFO_W, UFO_X, flyInP)
          : lerp(UFO_X, -UFO_W, flyOutP);
        const ufoAlpha = now < T.ufoFlyOut.start ? 1 : 1 - flyOutP;
        drawUFO(ufoX, UFO_Y, ufoAlpha);

        // Ray
        const rayExtP     = easeOut(progress(now, T.rayExtend.start,  T.rayExtend.dur));
        const rayRetractP = easeIn (progress(now, T.rayRetract.start, T.rayRetract.dur));
        const rayProgress = now < T.rayRetract.start ? rayExtP : 1 - rayRetractP;
        if (rayProgress > 0) drawRay(ufoX, UFO_Y, rayProgress);

        // Alien
        const descendP = easeOut(progress(now, T.alienDescend.start, T.alienDescend.dur));
        const scurryP  = easeIn (progress(now, T.alienScurry.start,  T.alienScurry.dur));
        const vanishP  =         progress(now, T.alienVanish.start,  T.alienVanish.dur);

        if (now >= T.alienDescend.start && now < T.alienVanish.start + T.alienVanish.dur) {
          const alienTopY  = UFO_Y + UFO_H + ALIEN_H;
          const alienBaseY = descendP < 1 ? lerp(alienTopY, GROUND_Y, descendP) : GROUND_Y;
          const scurryDir  = UFO_X < W / 2 ? -1 : 1;
          const alienX     = UFO_X + scurryDir * scurryP * W * 0.18;
          const alienScale = vanishP > 0 ? lerp(1, 0.15, easeIn(vanishP)) : 1;
          const alienAlpha = vanishP > 0 ? Math.max(0, 1 - vanishP)       : 1;
          drawAlien(alienX, alienBaseY, alienAlpha, alienScale);
        }

        if (now >= T.total) {
          done();
        } else {
          requestAnimationFrame(frame);
        }
      }

      requestAnimationFrame(frame);
    },
  };

  // ════════════════════════════════════════════════════════════
  //  BOOPIE  — pin drop, sine wave flight path, food
  //            collectibles one by one, gold confetti landing
  //
  //  Pure canvas — no assets needed.
  //  Visible in both light and dark mode (dark overlay).
  //
  //  DESKTOP FLICKER FIX: all food emoji are pre-rendered to
  //  offscreen canvases once at init. The frame loop blits
  //  cached images via drawImage — no font engine or glyph
  //  rasterization happens during animation, eliminating the
  //  desktop emoji flicker entirely.
  //
  //  SEQUENCE:
  //    0–600ms       Dark background fades in
  //    400–1300ms    Dashed sine path reveals
  //    500–1100ms    Origin pin drops
  //    1000ms        Ripple rings burst from pin
  //    2400ms        Plane takes off along sine path
  //    2400–8900ms   Plane flies, food collected one by one
  //    8900ms        Plane lands, gold confetti burst
  //    10100–11000ms Everything fades out
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['boopie'] = {
    run({ canvas, ctx, done, randRange, randInt, randChoice, lerp, easeOut, easeIn }) {
      const W = canvas.width, H = canvas.height;

      // ── Tuning knobs ─────────────────────────────────────────
      const ORIGIN_X   = W * 0.10;
      const DEST_X     = W * 0.90;
      const MID_Y      = H * 0.50;
      const AMPLITUDE  = H * 0.18;
      const FREQ       = 3.5;
      const FLIGHT_DUR = 10000;
      const PIN_SIZE   = Math.min(W, H) * 0.048;
      const FOOD_SIZE  = Math.max(18, Math.min(W, H) * 0.052);
      const PLANE_SIZE = Math.max(20, Math.min(W, H) * 0.058);
      // ─────────────────────────────────────────────────────────

      const originPx = [ORIGIN_X, MID_Y];
      const destPx   = [DEST_X,   MID_Y];

      // ── Sine path helpers ────────────────────────────────────
      function sinePt(t) {
        return [
          lerp(ORIGIN_X, DEST_X, t),
          MID_Y + AMPLITUDE * Math.sin(t * FREQ * Math.PI * 2),
        ];
      }

      function sineTangent(t) {
        const dx = DEST_X - ORIGIN_X;
        const dy = AMPLITUDE * FREQ * Math.PI * 2
                * Math.cos(t * FREQ * Math.PI * 2);
        return Math.atan2(dy, dx);
      }

      function prog(now, start, dur) {
        return Math.min(1, Math.max(0, (now - start) / dur));
      }

      // ── Timing ───────────────────────────────────────────────
      const T = {
        bgFadeIn:   { start: 0,              dur: 600  },
        pathReveal: { start: 400,            dur: 900  },
        pinDrop:    { start: 500,            dur: 600  },
        ripple:       1000,
        planeStart:   2400,
        planeEnd:     2400 + FLIGHT_DUR,
        confetti:     2400 + FLIGHT_DUR,
        fadeOut:    { start: 2400 + FLIGHT_DUR + 1200, dur: 900 },
        total:        2400 + FLIGHT_DUR + 2300,
      };

      // ── Food items on sine peaks and valleys ─────────────────
      const FOOD_DEFS = [
        { emoji: '🍰', t: 0.25 / FREQ }, // peak 1
        { emoji: '🍕', t: 0.75 / FREQ }, // valley 1
        { emoji: '🌭', t: 1.25 / FREQ }, // peak 2
        { emoji: '🍝', t: 1.75 / FREQ }, // valley 2
        { emoji: '🍗', t: 2.25 / FREQ }, // peak 3
        { emoji: '🥖', t: 2.75 / FREQ }, // valley 3
        { emoji: '🍫', t: 3.25 / FREQ }, // peak 4
      ];

      const foods = FOOD_DEFS.map(f => {
        const [x, y] = sinePt(f.t);
        return {
          emoji:        f.emoji,
          t:            f.t,
          x, y,
          collected:    false,
          pulseAge:     0,
          collectScale: 1,
          collectAlpha: 1,
        };
      });

      // ── Pre-render food emoji to offscreen canvases ───────────
      // Done ONCE here at init — the frame loop never touches the
      // font engine again. Eliminates desktop glyph-cache flicker.
      const CACHE_RES  = 3;   // render at 3× for crisp scaling
      const foodCaches = foods.map(f => {
        const size = Math.ceil(FOOD_SIZE * 2 * CACHE_RES);
        const oc   = document.createElement('canvas');
        oc.width   = size;
        oc.height  = size;
        const oc2  = oc.getContext('2d');
        oc2.font          = `${Math.floor(FOOD_SIZE * CACHE_RES)}px serif`;
        oc2.textAlign     = 'center';
        oc2.textBaseline  = 'middle';
        oc2.fillText(f.emoji, size / 2, size / 2);
        return { canvas: oc, size };
      });

      // ── Pre-render plane emoji the same way ───────────────────
      const PLANE_CACHE_RES = 3;
      const planeCache = (() => {
        const size = Math.ceil(PLANE_SIZE * 2 * PLANE_CACHE_RES);
        const oc   = document.createElement('canvas');
        oc.width   = size;
        oc.height  = size;
        const oc2  = oc.getContext('2d');
        oc2.font          = `${Math.floor(PLANE_SIZE * PLANE_CACHE_RES)}px serif`;
        oc2.textAlign     = 'center';
        oc2.textBaseline  = 'middle';
        oc2.fillText('✈️', size / 2, size / 2);
        return { canvas: oc, size };
      })();

      // ── Particle pools ────────────────────────────────────────
      const smoke    = [];
      const confetti = [];
      const ripples  = [];
      let ripplesSpawned  = false;
      let confettiSpawned = false;
      let confettiDone    = false;

      // ── Background ────────────────────────────────────────────
      function drawBg(alpha) {
        ctx.fillStyle = `rgba(6,10,28,${0.9 * alpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      // ── Dashed sine path ──────────────────────────────────────
      function drawPath(revealAlpha, flightP) {
        const steps = 140;
        ctx.save();
        ctx.setLineDash([5, 9]);
        ctx.lineWidth = 1.5;

        // Full path — dim
        ctx.strokeStyle = `rgba(255,255,255,${0.22 * revealAlpha})`;
        ctx.beginPath();
        const [sx, sy] = sinePt(0);
        ctx.moveTo(sx, sy);
        for (let i = 1; i <= steps; i++) {
          const [px, py] = sinePt(i / steps);
          ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Traced portion behind plane — brighter
        if (flightP > 0) {
          ctx.strokeStyle = `rgba(255,255,255,${0.55 * revealAlpha})`;
          ctx.beginPath();
          const [tx, ty] = sinePt(0);
          ctx.moveTo(tx, ty);
          const tracedSteps = Math.ceil(flightP * steps);
          for (let i = 1; i <= tracedSteps; i++) {
            const [px, py] = sinePt(i / steps);
            ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        ctx.setLineDash([]);
        ctx.restore();
      }

      // ── Pin ───────────────────────────────────────────────────
      function drawPin(x, y, color, alpha, dropP) {
        const landed = easeOut(Math.min(1, dropP));
        const drawY  = lerp(y - H * 0.15, y, landed);

        ctx.save();
        ctx.globalAlpha = alpha * Math.min(1, dropP * 3);
        ctx.translate(x, drawY);

        ctx.beginPath();
        ctx.ellipse(0, PIN_SIZE * 0.08,
          PIN_SIZE * 0.18, PIN_SIZE * 0.055, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-PIN_SIZE * 0.17, -PIN_SIZE * 0.3);
        ctx.lineTo(0,                 PIN_SIZE * 0.06);
        ctx.lineTo( PIN_SIZE * 0.17, -PIN_SIZE * 0.3);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -PIN_SIZE * 0.54, PIN_SIZE * 0.33, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -PIN_SIZE * 0.54, PIN_SIZE * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();

        ctx.restore();
      }

      // ── Ripples ───────────────────────────────────────────────
      function spawnRipples(x, y) {
        for (let i = 0; i < 6; i++) {
          ripples.push({
            x, y,
            born:   performance.now() + i * 160,
            maxAge: 1100,
          });
        }
      }

      function drawRipples(absNow) {
        for (let i = ripples.length - 1; i >= 0; i--) {
          const r   = ripples[i];
          const age = absNow - r.born;
          if (age < 0) continue;
          const t = Math.min(1, age / r.maxAge);
          ctx.beginPath();
          ctx.arc(r.x, r.y, easeOut(t) * Math.min(W, H) * 0.20, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,65,65,${(1 - t) * 0.85})`;
          ctx.lineWidth   = lerp(4.5, 0.5, t);
          ctx.stroke();
          if (t >= 1) ripples.splice(i, 1);
        }
      }

      // ── Smoke trail ───────────────────────────────────────────
      function updateSmoke() {
        for (let i = smoke.length - 1; i >= 0; i--) {
          const p = smoke[i];
          p.alpha -= 0.006;
          p.r     += 0.22;
          p.x     += p.vx;
          p.y     += p.vy;
          if (p.alpha <= 0) { smoke.splice(i, 1); continue; }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200,200,220,${p.alpha.toFixed(3)})`;
          ctx.fill();
        }
      }

      // ── Plane — blit from cache, rotate around centre ─────────
      function drawPlane(x, y, angle, alpha) {
        const { canvas: pc, size } = planeCache;
        const drawSize = PLANE_SIZE * 2; // display size (not cache size)
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(pc, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      }

      // ── Food — blit from cache, scale via drawImage size ──────
      // ctx.scale() is never called — scaling is done by varying
      // the destination rect size in drawImage, which doesn't
      // trigger per-frame glyph re-rasterization on desktop.
      function drawFood(food, index, overrideAlpha) {
        const a = overrideAlpha !== undefined
          ? overrideAlpha * food.collectAlpha
          : food.collectAlpha;
        if (a <= 0) return;

        const { canvas: fc } = foodCaches[index];
        const drawSize = FOOD_SIZE * 2 * food.collectScale;

        ctx.save();
        ctx.globalAlpha = a;
        ctx.drawImage(fc,
          food.x - drawSize / 2,
          food.y - drawSize / 2,
          drawSize, drawSize
        );
        ctx.restore();
      }

      // ── Gold confetti ─────────────────────────────────────────
      function spawnConfetti(x, y) {
        const GOLDS = [
          '#FFD700','#FFC200','#FFAA00',
          '#FFE066','#FFEC99','#FF8C00','#FFFACD',
        ];
        for (let i = 0; i < 110; i++) {
          const angle = randRange(0, Math.PI * 2);
          const speed = randRange(2.5, 8.5);
          confetti.push({
            x, y,
            vx:    Math.cos(angle) * speed,
            vy:    Math.sin(angle) * speed - randRange(2, 7),
            color: randChoice(GOLDS),
            alpha: 1,
            rot:   randRange(0, Math.PI * 2),
            rotV:  randRange(-0.12, 0.12),
            shape: Math.random() < 0.5 ? 'rect' : 'circle',
            w: randRange(6, 14), h: randRange(4, 9), r: randRange(3, 7),
          });
        }
      }

      function updateConfetti() {
        let alive = 0;
        for (let i = confetti.length - 1; i >= 0; i--) {
          const p = confetti[i];
          p.vy   += 0.1;
          p.x    += p.vx;
          p.y    += p.vy;
          p.rot  += p.rotV;
          p.alpha = Math.max(0, p.alpha - 0.006);
          if (p.alpha <= 0) { confetti.splice(i, 1); continue; }
          alive++;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.r, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          }
          ctx.restore();
        }
        if (alive === 0) confettiDone = true;
      }

      // ── Frame loop ────────────────────────────────────────────
      let startTime = null;
      let lastTs    = null;

      function frame(ts) {
        if (!startTime) startTime = ts;
        const now = ts - startTime;
        const dt  = lastTs ? Math.min(ts - lastTs, 50) : 16;
        lastTs    = ts;

        ctx.clearRect(0, 0, W, H);

        const bgInP  = easeOut(prog(now, T.bgFadeIn.start, T.bgFadeIn.dur));
        const bgOutP = easeIn (prog(now, T.fadeOut.start,  T.fadeOut.dur));
        const globalA = bgInP * (1 - bgOutP);

        drawBg(globalA);

        const pathRevealA = easeOut(prog(now, T.pathReveal.start, T.pathReveal.dur));
        const flightP     = now >= T.planeStart
          ? Math.min(1, (now - T.planeStart) / FLIGHT_DUR)
          : 0;

        if (pathRevealA > 0) drawPath(pathRevealA * globalA, flightP);

        // Destination pin
        if (pathRevealA > 0.3) {
          drawPin(
            destPx[0], destPx[1], '#4488ff',
            globalA * Math.min(1, (pathRevealA - 0.3) / 0.4),
            1
          );
        }

        // Origin pin drop
        const pinDropP = prog(now, T.pinDrop.start, T.pinDrop.dur);
        if (pinDropP > 0) {
          drawPin(originPx[0], originPx[1], '#ff3333', globalA, pinDropP);
        }

        // Ripples
        if (now >= T.ripple && !ripplesSpawned) {
          spawnRipples(originPx[0], originPx[1]);
          ripplesSpawned = true;
        }
        drawRipples(ts);

        // Plane + food + smoke
        if (now >= T.planeStart) {
          const [px, py] = sinePt(flightP);
          const angle    = sineTangent(flightP);

          // Smoke
          if (flightP < 1 && Math.random() < 0.38) {
            smoke.push({
              x:  px - Math.cos(angle) * PLANE_SIZE * 0.55,
              y:  py - Math.sin(angle) * PLANE_SIZE * 0.55,
              vx: (Math.random() - 0.5) * 0.5,
              vy: (Math.random() - 0.5) * 0.5,
              r:  randRange(1.5, 3.2),
              alpha: 0.4,
            });
          }
          updateSmoke();

          // Food — one by one collection, all via drawImage (no font calls)
          for (let i = 0; i < foods.length; i++) {
            const food = foods[i];

            if (flightP >= food.t && !food.collected) {
              food.collected = true;
              food.pulseAge  = 0;
            }

            if (!food.collected) {
              // Alpha pulse as plane approaches — no scale change,
              // no re-rasterization, no flicker
              const near = food.t - flightP;
              if (near > 0 && near < 0.07) {
                food.collectAlpha = 0.55 + 0.45 * Math.abs(Math.sin(now * 0.018));
              } else {
                food.collectAlpha = 1;
                food.collectScale = 1;
              }
              drawFood(food, i, globalA);
            } else {
              // Burst: scale up via drawImage dest size, then fade
              food.pulseAge    += dt;
              food.collectScale = 1 + easeOut(Math.min(1, food.pulseAge / 200)) * 0.75;
              food.collectAlpha = Math.max(0, 1 - food.pulseAge / 380);
              drawFood(food, i);
            }
          }

          // Plane on top
          const planeA = flightP < 0.03
            ? flightP / 0.03
            : flightP > 0.97 ? (1 - flightP) / 0.03 : 1;
          drawPlane(px, py, angle, planeA * (1 - bgOutP));

        } else {
          // Before takeoff — food faded with background
          for (let i = 0; i < foods.length; i++) {
            drawFood(foods[i], i, globalA);
          }
        }

        // Confetti
        if (now >= T.confetti && !confettiSpawned) {
          spawnConfetti(destPx[0], destPx[1]);
          confettiSpawned = true;
        }
        if (confettiSpawned) updateConfetti();

        if (now >= T.total && (confettiDone || confetti.length === 0)) {
          done();
        } else {
          requestAnimationFrame(frame);
        }
      }

      requestAnimationFrame(frame);
    },
  };

  // ════════════════════════════════════════════════════════════
  //  TIC TAC TOE  — space-themed neon mini game vs smart AI
  //
  //  Renders a DOM modal instead of a canvas overlay.
  //  Player picks X or O and who goes first.
  //  AI uses minimax — it plays optimally.
  //
  //  To change the AI name: edit AI_NAME below.
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['tictactoe'] = {
    run({ done }) {

      // Guard — don't open a second modal if one is already up
      if (document.getElementById('dilxhan-ttt-overlay')) { done(); return; }

      const AI_NAME = 'Minion';

      // ── CSS ───────────────────────────────────────────────
      if (!document.getElementById('dilxhan-ttt-style')) {
        const s = document.createElement('style');
        s.id = 'dilxhan-ttt-style';
        s.textContent = `
          #dilxhan-ttt-overlay {
            position: fixed; inset: 0; z-index: 10001;
            background: rgba(0,0,15,0.82);
            backdrop-filter: blur(6px);
            display: flex; align-items: center; justify-content: center;
            animation: ttt-fadein 280ms ease forwards;
          }
          @keyframes ttt-fadein { from { opacity:0 } to { opacity:1 } }

          #dilxhan-ttt-modal {
            position: relative;
            background: #06071a;
            border: 1px solid rgba(0,245,255,0.22);
            border-radius: 18px;
            padding: 36px 28px 28px;
            width: min(400px, 92vw);
            max-height: 90vh;
            overflow-y: auto;
            box-shadow:
              0 0 0 1px rgba(0,245,255,0.08),
              0 0 50px rgba(0,245,255,0.1),
              0 0 100px rgba(120,0,255,0.07);
            font-family: inherit;
            color: #dde4ff;
          }

          /* star field */
          #dilxhan-ttt-modal::before {
            content: '';
            position: absolute; inset: 0; border-radius: 18px;
            pointer-events: none; z-index: 0;
            background-image:
              radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,.55) 0%, transparent 100%),
              radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,.45) 0%, transparent 100%),
              radial-gradient(1.5px 1.5px at 45% 6%,  rgba(255,255,255,.7)  0%, transparent 100%),
              radial-gradient(1px 1px at 90% 52%, rgba(255,255,255,.4)  0%, transparent 100%),
              radial-gradient(1px 1px at 8%  72%, rgba(255,255,255,.5)  0%, transparent 100%),
              radial-gradient(1px 1px at 60% 88%, rgba(255,255,255,.4)  0%, transparent 100%),
              radial-gradient(1.5px 1.5px at 30% 45%, rgba(255,255,255,.3) 0%, transparent 100%),
              radial-gradient(1px 1px at 95% 8%,  rgba(255,255,255,.6)  0%, transparent 100%),
              radial-gradient(1px 1px at 55% 30%, rgba(255,255,255,.35) 0%, transparent 100%),
              radial-gradient(1px 1px at 22% 92%, rgba(255,255,255,.4)  0%, transparent 100%);
          }

          #dilxhan-ttt-close {
            position: absolute; top: 12px; right: 14px; z-index: 10;
            width: 30px; height: 30px; border-radius: 50%;
            background: none; border: 1px solid rgba(0,245,255,0.25);
            color: rgba(0,245,255,0.6); font-size: 13px;
            cursor: pointer; display: flex; align-items: center; justify-content: center;
            transition: all 150ms; line-height: 1;
          }
          #dilxhan-ttt-close:hover {
            border-color: rgba(0,245,255,0.8); color: #00f5ff;
            box-shadow: 0 0 12px rgba(0,245,255,0.3);
          }

          .ttt-title {
            text-align: center; font-size: 20px; font-weight: 700;
            letter-spacing: .25em; color: #00f5ff; margin: 0 0 3px;
            text-shadow: 0 0 20px rgba(0,245,255,.8), 0 0 40px rgba(0,245,255,.4);
            position: relative; z-index: 1;
          }
          .ttt-sub {
            text-align: center; font-size: 10px; letter-spacing: .2em;
            color: rgba(180,180,255,.45); margin: 0 0 26px;
            position: relative; z-index: 1;
          }
          .ttt-label {
            text-align: center; font-size: 10px; letter-spacing: .15em;
            color: rgba(180,180,255,.45); margin: 0 0 10px;
            text-transform: uppercase; position: relative; z-index: 1;
          }
          .ttt-row {
            display: flex; gap: 10px; justify-content: center;
            margin-bottom: 22px; position: relative; z-index: 1;
          }
          .ttt-opt {
            width: 80px; height: 68px; border-radius: 12px;
            background: rgba(0,0,30,.7);
            border: 1.5px solid rgba(0,245,255,.15);
            color: rgba(180,180,255,.6); font-size: 26px; font-weight: 700;
            cursor: pointer; transition: all 180ms;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center; gap: 2px;
            font-family: inherit;
          }
          .ttt-opt span.ttt-opt-label {
            font-size: 9px; font-weight: 400; letter-spacing: .1em;
            color: rgba(180,180,255,.35);
          }
          .ttt-opt:hover {
            border-color: rgba(0,245,255,.45);
            box-shadow: 0 0 18px rgba(0,245,255,.1);
          }
          .ttt-opt.sel-x {
            border-color: #00f5ff; color: #00f5ff;
            text-shadow: 0 0 16px rgba(0,245,255,.9);
            box-shadow: 0 0 24px rgba(0,245,255,.18), inset 0 0 18px rgba(0,245,255,.05);
          }
          .ttt-opt.sel-o {
            border-color: #ff00ff; color: #ff00ff;
            text-shadow: 0 0 16px rgba(255,0,255,.9);
            box-shadow: 0 0 24px rgba(255,0,255,.18), inset 0 0 18px rgba(255,0,255,.05);
          }
          .ttt-opt.sel-first {
            border-color: #a06bff; color: #c09eff;
            box-shadow: 0 0 22px rgba(123,47,255,.22);
          }

          #dilxhan-ttt-start {
            display: block; width: 100%; padding: 13px;
            background: linear-gradient(135deg, rgba(0,245,255,.12), rgba(123,47,255,.12));
            border: 1.5px solid rgba(0,245,255,.35); border-radius: 10px;
            color: #00f5ff; font-size: 12px; font-weight: 600;
            letter-spacing: .22em; cursor: pointer; transition: all 180ms;
            font-family: inherit; position: relative; z-index: 1;
          }
          #dilxhan-ttt-start:hover {
            background: linear-gradient(135deg, rgba(0,245,255,.22), rgba(123,47,255,.22));
            box-shadow: 0 0 28px rgba(0,245,255,.18);
          }

          #dilxhan-ttt-score {
            display: flex; justify-content: center; gap: 0;
            margin-bottom: 16px; position: relative; z-index: 1;
          }
          .ttt-sc {
            text-align: center; padding: 0 18px;
          }
          .ttt-sc + .ttt-sc { border-left: 1px solid rgba(0,245,255,.1); }
          .ttt-sc-lbl { font-size: 8px; letter-spacing: .14em; color: rgba(180,180,255,.38); display: block; text-transform: uppercase; margin-bottom: 2px; }
          .ttt-sc-val { font-size: 24px; font-weight: 700; display: block; }
          .ttt-sc-val.c { color: #00f5ff; text-shadow: 0 0 14px rgba(0,245,255,.6); }
          .ttt-sc-val.m { color: #ff00ff; text-shadow: 0 0 14px rgba(255,0,255,.6); }
          .ttt-sc-val.w { color: rgba(180,180,255,.5); }

          #dilxhan-ttt-status {
            text-align: center; font-size: 12px; letter-spacing: .12em;
            color: rgba(180,180,255,.75); margin-bottom: 18px;
            min-height: 18px; position: relative; z-index: 1;
          }

          #dilxhan-ttt-board {
            display: grid; grid-template-columns: repeat(3,1fr);
            gap: 2px; margin: 0 auto 18px; max-width: 270px;
            background: rgba(0,245,255,.12); border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 24px rgba(0,245,255,.07);
            position: relative; z-index: 1;
          }
          .ttt-cell {
            aspect-ratio: 1; background: #06071a;
            display: flex; align-items: center; justify-content: center;
            font-size: 40px; font-weight: 700;
            cursor: pointer; transition: background 140ms; user-select: none;
          }
          .ttt-cell:hover:not(.taken) { background: rgba(0,245,255,.05); }
          .ttt-cell.taken { cursor: default; }

          .ttt-x-mark {
            color: #00f5ff;
            text-shadow: 0 0 18px rgba(0,245,255,1), 0 0 36px rgba(0,245,255,.5);
            animation: ttt-pop 200ms cubic-bezier(.34,1.56,.64,1) forwards;
          }
          .ttt-o-mark {
            color: #ff00ff;
            text-shadow: 0 0 18px rgba(255,0,255,1), 0 0 36px rgba(255,0,255,.5);
            animation: ttt-pop 200ms cubic-bezier(.34,1.56,.64,1) forwards;
          }
          @keyframes ttt-pop {
            from { transform: scale(.2); opacity: 0; }
            to   { transform: scale(1);  opacity: 1; }
          }
          .ttt-cell.win {
            animation: ttt-win-flash 350ms ease 3;
          }
          @keyframes ttt-win-flash {
            0%,100% { background: #06071a; }
            50%     { background: rgba(0,245,255,.14); }
          }

          #dilxhan-ttt-restart {
            display: block; width: 100%; padding: 10px;
            background: transparent; border: 1px solid rgba(0,245,255,.18);
            border-radius: 8px; color: rgba(0,245,255,.55);
            font-size: 11px; letter-spacing: .16em;
            cursor: pointer; transition: all 180ms; font-family: inherit;
            position: relative; z-index: 1;
          }
          #dilxhan-ttt-restart:hover {
            border-color: rgba(0,245,255,.45); color: #00f5ff;
            box-shadow: 0 0 14px rgba(0,245,255,.1);
          }
          .ttt-thinking { animation: ttt-blink 500ms ease-in-out infinite; display: inline-block; }
          @keyframes ttt-blink { 0%,100%{opacity:1} 50%{opacity:.2} }
        `;
        document.head.appendChild(s);
      }

      // ── DOM ───────────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.id = 'dilxhan-ttt-overlay';
      overlay.innerHTML = `
        <div id="dilxhan-ttt-modal">
          <button id="dilxhan-ttt-close" aria-label="Close">✕</button>

          <!-- Setup screen -->
          <div id="dilxhan-ttt-setup">
            <p class="ttt-title">TIC TAC TOE</p>
            <p class="ttt-sub">VS ${AI_NAME}</p>

            <p class="ttt-label">Choose your symbol</p>
            <div class="ttt-row">
              <button class="ttt-opt sel-x" data-sym="X">X<span class="ttt-opt-label">YOU</span></button>
              <button class="ttt-opt"       data-sym="O">O<span class="ttt-opt-label">YOU</span></button>
            </div>

            <p class="ttt-label">Who goes first?</p>
            <div class="ttt-row">
              <button class="ttt-opt sel-first" data-first="player">🧑<span class="ttt-opt-label">YOU</span></button>
              <button class="ttt-opt"           data-first="ai">🤖<span class="ttt-opt-label">${AI_NAME}</span></button>
            </div>

            <button id="dilxhan-ttt-start">START GAME</button>
          </div>

          <!-- Game screen -->
          <div id="dilxhan-ttt-game" hidden>
            <p class="ttt-title">TIC TAC TOE</p>
            <p class="ttt-sub">VS ${AI_NAME}</p>

            <div id="dilxhan-ttt-score">
              <div class="ttt-sc"><span class="ttt-sc-lbl">You</span><span class="ttt-sc-val c" id="ttt-sc-p">0</span></div>
              <div class="ttt-sc"><span class="ttt-sc-lbl">Draws</span><span class="ttt-sc-val w" id="ttt-sc-d">0</span></div>
              <div class="ttt-sc"><span class="ttt-sc-lbl">${AI_NAME}</span><span class="ttt-sc-val m" id="ttt-sc-a">0</span></div>
            </div>

            <div id="dilxhan-ttt-status"></div>
            <div id="dilxhan-ttt-board"></div>
            <button id="dilxhan-ttt-restart">↺ &nbsp;NEW GAME</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // ── State ─────────────────────────────────────────────
      let playerSym  = 'X';
      let aiSym      = 'O';
      let playerFirst = true;
      let board      = Array(9).fill(null);
      let gameActive = false;
      let score      = { player: 0, ai: 0, draws: 0 };

      const WIN_LINES = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6],
      ];

      // ── Minimax ───────────────────────────────────────────
      function checkResult(b) {
        for (const [a,c,d] of WIN_LINES) {
          if (b[a] && b[a] === b[c] && b[a] === b[d])
            return { winner: b[a], line: [a,c,d] };
        }
        if (b.every(c => c !== null)) return { winner: 'draw', line: [] };
        return null;
      }

      function minimax(b, depth, isMax) {
        const r = checkResult(b);
        if (r) {
          if (r.winner === aiSym)     return 10 - depth;
          if (r.winner === playerSym) return depth - 10;
          return 0;
        }
        if (isMax) {
          let best = -Infinity;
          for (let i = 0; i < 9; i++) {
            if (!b[i]) {
              b[i] = aiSym;
              best = Math.max(best, minimax(b, depth+1, false));
              b[i] = null;
            }
          }
          return best;
        } else {
          let best = Infinity;
          for (let i = 0; i < 9; i++) {
            if (!b[i]) {
              b[i] = playerSym;
              best = Math.min(best, minimax(b, depth+1, true));
              b[i] = null;
            }
          }
          return best;
        }
      }

      function getBestMove(b) {
        let best = -Infinity, move = -1;
        for (let i = 0; i < 9; i++) {
          if (!b[i]) {
            b[i] = aiSym;
            const s = minimax(b, 0, false);
            b[i] = null;
            if (s > best) { best = s; move = i; }
          }
        }
        return move;
      }

      // ── Rendering ─────────────────────────────────────────
      function setStatus(html) {
        document.getElementById('dilxhan-ttt-status').innerHTML = html;
      }

      function updateScore() {
        document.getElementById('ttt-sc-p').textContent = score.player;
        document.getElementById('ttt-sc-d').textContent = score.draws;
        document.getElementById('ttt-sc-a').textContent = score.ai;
      }

      function renderBoard() {
        const boardEl = document.getElementById('dilxhan-ttt-board');
        boardEl.innerHTML = '';
        board.forEach((val, i) => {
          const cell = document.createElement('div');
          cell.className = 'ttt-cell' + (val ? ' taken' : '');
          cell.dataset.i = i;
          if (val) {
            const mark = document.createElement('span');
            mark.className = val === 'X' ? 'ttt-x-mark' : 'ttt-o-mark';
            mark.textContent = val;
            cell.appendChild(mark);
          }
          cell.addEventListener('click', onCellClick);
          boardEl.appendChild(cell);
        });
      }

      function highlightWin(line) {
        const cells = document.querySelectorAll('.ttt-cell');
        line.forEach(i => cells[i].classList.add('win'));
      }

      // ── Game flow ─────────────────────────────────────────
      function onCellClick(e) {
        const i = parseInt(e.currentTarget.dataset.i);
        if (!gameActive || board[i]) return;
        placeMove(i, playerSym);
        const result = checkResult(board);
        if (result) { endGame(result); return; }
        aiTurn();
      }

      function placeMove(i, sym) {
        board[i] = sym;
        renderBoard();
      }

      function aiTurn() {
        gameActive = false;
        setStatus(`<span class="ttt-thinking">${AI_NAME} IS THINKING</span>`);
        setTimeout(() => {
          const move = getBestMove([...board]);
          placeMove(move, aiSym);
          const result = checkResult(board);
          if (result) { endGame(result); return; }
          gameActive = true;
          setStatus('YOUR TURN');
        }, 480);
      }

      function endGame(result) {
        gameActive = false;
        if (result.winner === playerSym) {
          score.player++;
          setStatus('✦ YOU WIN ✦');
          highlightWin(result.line);
        } else if (result.winner === aiSym) {
          score.ai++;
          setStatus(`${AI_NAME} WINS`);
          highlightWin(result.line);
        } else {
          score.draws++;
          setStatus('DRAW');
        }
        updateScore();
      }

      function startGame() {
        board = Array(9).fill(null);
        gameActive = true;
        renderBoard();
        if (playerFirst) {
          setStatus('YOUR TURN');
        } else {
          setStatus('');
          aiTurn();
        }
      }

      // ── Setup screen wiring ────────────────────────────────
      let selectedSym   = 'X';
      let selectedFirst = 'player';

      overlay.querySelectorAll('[data-sym]').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedSym = btn.dataset.sym;
          overlay.querySelectorAll('[data-sym]').forEach(b => {
            b.classList.remove('sel-x', 'sel-o');
          });
          btn.classList.add(selectedSym === 'X' ? 'sel-x' : 'sel-o');
        });
      });

      overlay.querySelectorAll('[data-first]').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedFirst = btn.dataset.first;
          overlay.querySelectorAll('[data-first]').forEach(b => b.classList.remove('sel-first'));
          btn.classList.add('sel-first');
        });
      });

      document.getElementById('dilxhan-ttt-start').addEventListener('click', () => {
        playerSym   = selectedSym;
        aiSym       = playerSym === 'X' ? 'O' : 'X';
        playerFirst = selectedFirst === 'player';
        score       = { player: 0, ai: 0, draws: 0 };
        updateScore();
        document.getElementById('dilxhan-ttt-setup').hidden = true;
        document.getElementById('dilxhan-ttt-game').hidden  = false;
        startGame();
      });

      document.getElementById('dilxhan-ttt-restart').addEventListener('click', startGame);

      // ── Close ─────────────────────────────────────────────
      function cleanup() {
        overlay.remove();
        done();
      }

      document.getElementById('dilxhan-ttt-close').addEventListener('click', cleanup);
      overlay.addEventListener('click', e => {
        if (e.target === overlay) cleanup();
      });
    },
  };

  // ════════════════════════════════════════════════════════════
  //  MEMORY  — cherry blossom memory tiles game vs the clock
  //
  //  Player picks theme, tile count, and difficulty.
  //  Cards are shuffled fresh every new game (Fisher-Yates).
  //  Card back shows "X" in #ff3131 in Fraunces.
  //  DOM modal — not a canvas overlay.
  //
  //  Themes:  animals · sports · food · nature · space
  //  Tiles:   16 (8 pairs) · 24 (12 pairs) · 30 (15 pairs)
  //  Difficulty controls time limit per tile count.
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['tiles'] = {
    run({ done }) {
      if (document.getElementById('dilxhan-mem-overlay')) { done(); return; }

      // ── CSS ──────────────────────────────────────────────────
      if (!document.getElementById('dilxhan-mem-style')) {
        const s = document.createElement('style');
        s.id = 'dilxhan-mem-style';
        s.textContent = `
          #dilxhan-mem-overlay {
            position:fixed; inset:0; z-index:10001;
            background:rgba(255,238,245,0.9);
            backdrop-filter:blur(10px);
            display:flex; align-items:center; justify-content:center;
            animation:mem-fi 350ms ease forwards;
            overflow:hidden;
          }
          @keyframes mem-fi { from{opacity:0} to{opacity:1} }

          .mem-petal {
            position:absolute; top:-16px; pointer-events:none;
            border-radius:50% 0 50% 0;
            background:rgba(255,160,190,0.5);
            animation:mem-fall linear infinite;
          }
          @keyframes mem-fall {
            0%  {transform:translateY(0) rotate(0deg) translateX(0);opacity:0}
            8%  {opacity:.7}
            92% {opacity:.4}
            100%{transform:translateY(102vh) rotate(560deg) translateX(35px);opacity:0}
          }

          #dilxhan-mem-modal {
            position:relative; z-index:1;
            background:rgba(255,253,255,0.97);
            border:1px solid rgba(220,140,165,0.25);
            border-radius:20px;
            padding:30px 22px 22px;
            width:min(600px,94vw);
            max-height:90vh; overflow-y:auto;
            box-shadow:0 6px 40px rgba(200,80,120,0.1),0 1px 0 rgba(255,255,255,.9) inset;
            font-family:inherit; color:#5c3d4a;
          }
          #dilxhan-mem-modal::-webkit-scrollbar{width:3px}
          #dilxhan-mem-modal::-webkit-scrollbar-thumb{background:rgba(220,140,165,.3);border-radius:2px}

          #dilxhan-mem-close {
            position:absolute; top:13px; right:15px; z-index:10;
            width:28px; height:28px; border-radius:50%;
            background:rgba(220,140,165,.1);
            border:1px solid rgba(220,140,165,.28);
            color:rgba(180,90,120,.65); font-size:12px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
            transition:all 160ms;
          }
          #dilxhan-mem-close:hover{background:rgba(220,140,165,.2);border-color:rgba(220,140,165,.6);color:#b04060}

          .mem-title{
            font-family:'Fraunces',Georgia,serif;
            font-weight:900; font-size:26px; text-align:center;
            color:#c05070; letter-spacing:.05em; margin:0 0 2px;
          }
          .mem-sub{
            text-align:center; font-size:11px; letter-spacing:.14em;
            color:rgba(140,70,90,.45); margin:0 0 22px; text-transform:uppercase;
          }
          .mem-lbl{
            font-size:10px; letter-spacing:.14em; text-transform:uppercase;
            color:rgba(140,70,90,.45); text-align:center; margin:0 0 9px;
          }

          .mem-opts{
            display:flex; flex-wrap:wrap; gap:7px;
            justify-content:center; margin-bottom:18px;
          }
          .mem-opt{
            background:rgba(255,240,248,.8);
            border:1.5px solid rgba(220,140,165,.18);
            border-radius:12px; padding:9px 13px;
            cursor:pointer; transition:all 170ms;
            font-family:inherit; color:#7a4558;
            font-size:12px; text-align:center; min-width:68px;
            display:flex; flex-direction:column; align-items:center; gap:2px;
          }
          .mem-opt:hover{border-color:rgba(220,140,165,.5);background:rgba(255,228,240,.9)}
          .mem-opt.sel{
            border-color:#e8748a; background:rgba(232,116,138,.1); color:#b04060;
            box-shadow:0 0 0 3px rgba(232,116,138,.12);
          }
          .mem-opt-icon{font-size:20px; line-height:1}
          .mem-opt-name{font-size:11px}
          .mem-opt-hint{font-size:9px; color:rgba(140,70,90,.4); letter-spacing:.04em}

          #dilxhan-mem-start{
            display:block; width:100%; padding:13px;
            background:linear-gradient(135deg,#f4929f,#e8748a);
            border:none; border-radius:12px; color:#fff;
            font-size:12px; font-weight:600; letter-spacing:.2em;
            cursor:pointer; transition:all 170ms; font-family:inherit;
            box-shadow:0 3px 16px rgba(232,116,138,.32); margin-top:6px;
          }
          #dilxhan-mem-start:hover{
            background:linear-gradient(135deg,#f5a0ac,#ec849a);
            box-shadow:0 4px 22px rgba(232,116,138,.42);
            transform:translateY(-1px);
          }

          #dilxhan-mem-header{
            display:flex; justify-content:space-around; align-items:center;
            margin-bottom:14px; padding:10px 12px;
            background:rgba(255,240,248,.7); border-radius:10px;
            border:1px solid rgba(220,140,165,.16);
          }
          .mem-stat{text-align:center}
          .mem-stat-v{
            font-family:'Fraunces',Georgia,serif;
            font-size:22px; font-weight:700; color:#c05070; display:block; line-height:1;
          }
          .mem-stat-v.warn{color:#d07020}
          .mem-stat-v.danger{color:#cc2020; animation:mem-blink 480ms ease-in-out infinite}
          @keyframes mem-blink{0%,100%{opacity:1}50%{opacity:.3}}
          .mem-stat-l{font-size:8px; letter-spacing:.12em; color:rgba(140,70,90,.45); text-transform:uppercase}

          #dilxhan-mem-board{
            display:grid; gap:7px; margin:0 auto 16px;
          }
          .mem-card{
            perspective:900px; cursor:pointer;
            aspect-ratio:1; border-radius:10px;
            transition:transform 100ms;
          }
          .mem-card:not(.flipped):not(.matched):hover{transform:scale(1.04)}
          .mem-card-inner{
            position:relative; width:100%; height:100%;
            transform-style:preserve-3d;
            transition:transform 0.44s cubic-bezier(.4,0,.2,1);
            border-radius:10px;
          }
          .mem-card.flipped .mem-card-inner,
          .mem-card.matched .mem-card-inner{transform:rotateY(180deg)}
          .mem-card-face{
            position:absolute; inset:0; border-radius:10px;
            backface-visibility:hidden; display:flex;
            align-items:center; justify-content:center;
            border:1.5px solid rgba(220,140,165,.2);
          }
          .mem-card-back{
            background:linear-gradient(135deg,#fff0f6,#ffe2ee);
            box-shadow:0 2px 8px rgba(200,80,120,.07);
          }
          .mem-card-back-x{
            font-family:'Fraunces',Georgia,serif;
            font-weight:900; color:#ff3131; line-height:1; user-select:none;
          }
          .mem-card-front{
            transform:rotateY(180deg);
            background:#fffbfc;
            box-shadow:0 2px 8px rgba(200,80,120,.05);
          }
          .mem-card.matched .mem-card-face{border-color:rgba(140,200,130,.45)}
          .mem-card.matched .mem-card-front{background:rgba(240,253,240,.95)}
          .mem-card.matched .mem-card-inner{
            animation:mem-match-pop 300ms cubic-bezier(.34,1.56,.64,1) forwards;
          }
          @keyframes mem-match-pop{
            0%{transform:rotateY(180deg) scale(1)}
            50%{transform:rotateY(180deg) scale(1.09)}
            100%{transform:rotateY(180deg) scale(1)}
          }
          .mem-card.wrong .mem-card-inner{
            animation:mem-shake 360ms ease forwards;
          }
          @keyframes mem-shake{
            0%{transform:rotateY(180deg) translateX(0)}
            22%{transform:rotateY(180deg) translateX(-5px)}
            44%{transform:rotateY(180deg) translateX(5px)}
            66%{transform:rotateY(180deg) translateX(-3px)}
            88%{transform:rotateY(180deg) translateX(3px)}
            100%{transform:rotateY(180deg) translateX(0)}
          }
          .mem-card.locked-card{cursor:not-allowed}

          .mem-action-row{display:flex; gap:8px}
          .mem-btn{
            flex:1; padding:10px;
            background:transparent;
            border:1px solid rgba(220,140,165,.25); border-radius:9px;
            color:rgba(140,70,90,.65); font-size:11px; letter-spacing:.14em;
            cursor:pointer; transition:all 160ms; font-family:inherit;
          }
          .mem-btn:hover{border-color:rgba(220,140,165,.55);color:#b04060;background:rgba(220,140,165,.06)}
          .mem-btn.primary{
            background:linear-gradient(135deg,#f4929f,#e8748a);
            border-color:transparent; color:#fff; font-weight:600;
            box-shadow:0 2px 12px rgba(232,116,138,.28);
          }
          .mem-btn.primary:hover{background:linear-gradient(135deg,#f5a0ac,#ec849a);box-shadow:0 3px 16px rgba(232,116,138,.38)}

          #dilxhan-mem-result{text-align:center; padding:8px 0}
          .mem-r-emoji{font-size:50px; display:block; margin-bottom:10px}
          .mem-r-title{
            font-family:'Fraunces',Georgia,serif;
            font-size:24px; font-weight:900; color:#c05070; margin:0 0 4px;
          }
          .mem-r-sub{font-size:12px; color:rgba(140,70,90,.55); margin:0 0 20px; letter-spacing:.07em}
          .mem-r-stats{
            display:flex; justify-content:center; gap:0;
            margin-bottom:22px; padding:14px;
            background:rgba(255,240,248,.7); border-radius:12px;
            border:1px solid rgba(220,140,165,.16);
          }
          .mem-rs{text-align:center; padding:0 16px}
          .mem-rs+.mem-rs{border-left:1px solid rgba(220,140,165,.18)}
          .mem-rs-v{
            font-family:'Fraunces',Georgia,serif;
            font-size:24px; font-weight:700; color:#c05070; display:block;
          }
          .mem-rs-l{font-size:9px; letter-spacing:.12em; color:rgba(140,70,90,.45); text-transform:uppercase}
        `;
        document.head.appendChild(s);
      }

      // ── DOM ──────────────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.id = 'dilxhan-mem-overlay';
      overlay.innerHTML = `
        <div id="dilxhan-mem-modal">
          <button id="dilxhan-mem-close">✕</button>

          <!-- Setup -->
          <div id="dilxhan-mem-setup">
            <p class="mem-title">MEMORY TILES</p>
            <p class="mem-sub">🌸 flip &amp; find 🌸</p>

            <p class="mem-lbl">Theme</p>
            <div class="mem-opts">
              <button class="mem-opt sel" data-theme="animals">
                <span class="mem-opt-icon">🐶</span><span class="mem-opt-name">Animals</span>
              </button>
              <button class="mem-opt" data-theme="sports">
                <span class="mem-opt-icon">⚽</span><span class="mem-opt-name">Sports</span>
              </button>
              <button class="mem-opt" data-theme="food">
                <span class="mem-opt-icon">🍕</span><span class="mem-opt-name">Food</span>
              </button>
              <button class="mem-opt" data-theme="nature">
                <span class="mem-opt-icon">🌸</span><span class="mem-opt-name">Nature</span>
              </button>
              <button class="mem-opt" data-theme="space">
                <span class="mem-opt-icon">🚀</span><span class="mem-opt-name">Space</span>
              </button>
            </div>

            <p class="mem-lbl">Tiles</p>
            <div class="mem-opts">
              <button class="mem-opt sel" data-size="16">
                <span class="mem-opt-name">16 tiles</span>
                <span class="mem-opt-hint">8 pairs</span>
              </button>
              <button class="mem-opt" data-size="24">
                <span class="mem-opt-name">24 tiles</span>
                <span class="mem-opt-hint">12 pairs</span>
              </button>
              <button class="mem-opt" data-size="30">
                <span class="mem-opt-name">30 tiles</span>
                <span class="mem-opt-hint">15 pairs</span>
              </button>
            </div>

            <p class="mem-lbl">Difficulty</p>
            <div class="mem-opts">
              <button class="mem-opt sel" data-diff="easy">
                <span class="mem-opt-name">Easy</span>
                <span class="mem-opt-hint">More time</span>
              </button>
              <button class="mem-opt" data-diff="medium">
                <span class="mem-opt-name">Medium</span>
                <span class="mem-opt-hint">Balanced</span>
              </button>
              <button class="mem-opt" data-diff="hard">
                <span class="mem-opt-name">Hard</span>
                <span class="mem-opt-hint">Fast pace</span>
              </button>
            </div>

            <button id="dilxhan-mem-start">START GAME</button>
          </div>

          <!-- Game -->
          <div id="dilxhan-mem-game" hidden>
            <div id="dilxhan-mem-header">
              <div class="mem-stat">
                <span class="mem-stat-v" id="mem-timer">3:00</span>
                <span class="mem-stat-l">Time</span>
              </div>
              <div class="mem-stat">
                <span class="mem-stat-v" id="mem-moves">0</span>
                <span class="mem-stat-l">Moves</span>
              </div>
              <div class="mem-stat">
                <span class="mem-stat-v" id="mem-pairs">0/8</span>
                <span class="mem-stat-l">Pairs</span>
              </div>
            </div>
            <div id="dilxhan-mem-board"></div>
            <div class="mem-action-row">
              <button class="mem-btn" id="mem-quit">← Settings</button>
              <button class="mem-btn" id="mem-renew">↺ New Game</button>
            </div>
          </div>

          <!-- Result -->
          <div id="dilxhan-mem-result" hidden></div>
        </div>
      `;
      document.body.appendChild(overlay);

      // ── Petals ───────────────────────────────────────────────
      for (let i = 0; i < 14; i++) {
        const p = document.createElement('div');
        p.className = 'mem-petal';
        const sz = 6 + Math.random() * 7;
        p.style.cssText = `left:${Math.random()*100}%;width:${sz}px;height:${sz*.65}px;animation-duration:${4+Math.random()*5}s;animation-delay:${-Math.random()*10}s`;
        overlay.appendChild(p);
      }

      // ── Data ─────────────────────────────────────────────────
      const THEMES = {
        animals: ['🐶','🐱','🐻','🦊','🐨','🐯','🦁','🐸','🐧','🦋','🦜','🐬','🦄','🐙','🦔'],
        sports:  ['⚽','🏀','🏈','⚾','🎾','🏐','🏒','🎿','🏄','🚴','🎯','🥊','🏓','🤸','🏊'],
        food:    ['🍕','🍔','🌮','🍜','🍣','🍩','🍰','🍓','🫐','🥑','🌽','🍦','🧁','🥐','🍋'],
        nature:  ['🌸','🌺','🌻','🌹','🍀','🌿','🍁','🌊','🏔️','🌈','🌙','🍄','🌴','🌾','🌵'],
        space:   ['🚀','🌍','⭐','🪐','🛸','☄️','🔭','🛰️','💫','🌟','🌌','🪨','🌠','🔮','🌑'],
      };
      const TIMES = {
        16: { easy:180, medium:120, hard:60  },
        24: { easy:240, medium:150, hard:90  },
        30: { easy:300, medium:200, hard:120 },
      };
      const COLS = { 16:4, 24:6, 30:6 };

      // ── State ────────────────────────────────────────────────
      let selTheme = 'animals', selSize = 16, selDiff = 'easy';
      let cards = [], flipped = [], matchedCount = 0;
      let moves = 0, totalPairs = 0, locked = false;
      let timerSecs = 0, timerStart = 0, timerRAF = null;
      let gameRunning = false, resultShown = false;

      // ── Helpers ──────────────────────────────────────────────
      function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }

      function fmt(s) {
        return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
      }

      function show(id)  { document.getElementById(id).hidden = false; }
      function hide(id)  { document.getElementById(id).hidden = true;  }
      function el(id)    { return document.getElementById(id); }

      // ── Setup option binding ─────────────────────────────────
      function bindOpts(attr, setter) {
        overlay.querySelectorAll(`[${attr}]`).forEach(btn => {
          btn.addEventListener('click', () => {
            overlay.querySelectorAll(`[${attr}]`).forEach(b => b.classList.remove('sel'));
            btn.classList.add('sel');
            setter(btn.dataset[attr.replace('data-','')]);
          });
        });
      }
      bindOpts('data-theme', v => selTheme = v);
      bindOpts('data-size',  v => selSize  = parseInt(v));
      bindOpts('data-diff',  v => selDiff  = v);

      // ── Start game ───────────────────────────────────────────
      function startGame() {
        totalPairs   = selSize / 2;
        matchedCount = 0;
        moves        = 0;
        flipped      = [];
        locked       = false;
        resultShown  = false;
        timerSecs    = TIMES[selSize][selDiff];

        // Shuffle fresh every game — randomizes spawn position each time
        const emojis = THEMES[selTheme].slice(0, totalPairs);
        cards = shuffle([...emojis, ...emojis]).map((emoji, i) => ({
          id: i, emoji, flipped: false, matched: false,
        }));

        hide('dilxhan-mem-setup');
        hide('dilxhan-mem-result');
        show('dilxhan-mem-game');

        updateHeader();
        renderBoard();
        startTimer();
      }

      // ── Board rendering ──────────────────────────────────────
      function renderBoard() {
        const boardEl = el('dilxhan-mem-board');
        const cols    = COLS[selSize];
        boardEl.style.gridTemplateColumns = `repeat(${cols},1fr)`;
        boardEl.innerHTML = '';

        const xSize = cols === 6
          ? 'clamp(13px,2.4vw,24px)'
          : 'clamp(18px,3.2vw,34px)';
        const emojiSize = cols === 6
          ? 'clamp(15px,3vw,28px)'
          : 'clamp(20px,4vw,36px)';

        cards.forEach((card, i) => {
          const div = document.createElement('div');
          div.className = 'mem-card'
            + (card.flipped  ? ' flipped' : '')
            + (card.matched  ? ' matched' : '');
          div.dataset.i = i;
          div.innerHTML = `
            <div class="mem-card-inner">
              <div class="mem-card-face mem-card-back">
                <span class="mem-card-back-x" style="font-size:${xSize}">X</span>
              </div>
              <div class="mem-card-face mem-card-front" style="font-size:${emojiSize}">
                ${card.emoji}
              </div>
            </div>`;
          div.addEventListener('click', () => onCardClick(i));
          boardEl.appendChild(div);
        });
      }

      function cardEl(i) {
        return el('dilxhan-mem-board').children[i];
      }

      // ── Card click ───────────────────────────────────────────
      function onCardClick(i) {
        const card = cards[i];
        if (locked || card.flipped || card.matched || !gameRunning) return;

        card.flipped = true;
        cardEl(i).classList.add('flipped');
        flipped.push(i);

        if (flipped.length === 2) {
          moves++;
          updateHeader();
          locked = true;
          checkMatch();
        }
      }

      function checkMatch() {
        const [a, b] = flipped;

        if (cards[a].emoji === cards[b].emoji) {
          // Match ✓
          setTimeout(() => {
            cards[a].matched = cards[b].matched = true;
            cardEl(a).classList.add('matched');
            cardEl(b).classList.add('matched');
            matchedCount++;
            flipped = [];
            locked  = false;
            updateHeader();
            if (matchedCount === totalPairs) {
              gameRunning = false;
              cancelAnimationFrame(timerRAF);
              setTimeout(showResult, 550);
            }
          }, 200);
        } else {
          // No match — shake then flip back
          cardEl(a).classList.add('wrong');
          cardEl(b).classList.add('wrong');
          setTimeout(() => {
            cards[a].flipped = cards[b].flipped = false;
            const eA = cardEl(a), eB = cardEl(b);
            eA.classList.remove('flipped','wrong');
            eB.classList.remove('flipped','wrong');
            flipped = [];
            locked  = false;
          }, 960);
        }
      }

      // ── Header ───────────────────────────────────────────────
      function updateHeader() {
        el('mem-moves').textContent = moves;
        el('mem-pairs').textContent = `${matchedCount}/${totalPairs}`;
      }

      // ── Timer ────────────────────────────────────────────────
      function startTimer() {
        gameRunning = true;
        timerStart  = performance.now();

        function tick() {
          if (!gameRunning) return;
          const elapsed    = Math.floor((performance.now() - timerStart) / 1000);
          const remaining  = Math.max(0, timerSecs - elapsed);
          const timerEl    = el('mem-timer');
          timerEl.textContent = fmt(remaining);
          timerEl.className   = 'mem-stat-v'
            + (remaining <= 10 ? ' danger' : remaining <= 30 ? ' warn' : '');

          if (remaining === 0) {
            gameRunning = false;
            showResult();
            return;
          }
          timerRAF = requestAnimationFrame(tick);
        }
        timerRAF = requestAnimationFrame(tick);
      }

      // ── Result ───────────────────────────────────────────────
      function showResult() {
        if (resultShown) return;
        resultShown = true;
        gameRunning = false;
        cancelAnimationFrame(timerRAF);

        const isWin    = matchedCount === totalPairs;
        const elapsed  = Math.min(
          Math.floor((performance.now() - timerStart) / 1000),
          timerSecs
        );

        el('dilxhan-mem-result').innerHTML = `
          <span class="mem-r-emoji">${isWin ? '🌸' : '💮'}</span>
          <p class="mem-r-title">${isWin ? 'You Did It!' : "Time's Up!"}</p>
          <p class="mem-r-sub">${isWin
            ? 'All pairs found — beautifully done.'
            : `Found ${matchedCount} of ${totalPairs} pairs.`}
          </p>
          <div class="mem-r-stats">
            <div class="mem-rs">
              <span class="mem-rs-v">${matchedCount}/${totalPairs}</span>
              <span class="mem-rs-l">Pairs</span>
            </div>
            <div class="mem-rs">
              <span class="mem-rs-v">${moves}</span>
              <span class="mem-rs-l">Moves</span>
            </div>
            <div class="mem-rs">
              <span class="mem-rs-v">${fmt(elapsed)}</span>
              <span class="mem-rs-l">Time</span>
            </div>
          </div>
          <div class="mem-action-row">
            <button class="mem-btn" id="mem-back">← Settings</button>
            <button class="mem-btn primary" id="mem-again">↺ Play Again</button>
          </div>
        `;

        hide('dilxhan-mem-game');
        show('dilxhan-mem-result');

        el('mem-back').addEventListener('click', () => {
          hide('dilxhan-mem-result');
          show('dilxhan-mem-setup');
        });
        el('mem-again').addEventListener('click', startGame);
      }

      // ── Button wiring ────────────────────────────────────────
      el('dilxhan-mem-start').addEventListener('click', startGame);

      el('mem-quit').addEventListener('click', () => {
        gameRunning = false;
        cancelAnimationFrame(timerRAF);
        hide('dilxhan-mem-game');
        show('dilxhan-mem-setup');
      });

      el('mem-renew').addEventListener('click', () => {
        gameRunning = false;
        cancelAnimationFrame(timerRAF);
        startGame(); // fresh shuffle every time
      });

      // ── Close ────────────────────────────────────────────────
      function cleanup() {
        gameRunning = false;
        cancelAnimationFrame(timerRAF);
        overlay.remove();
        done();
      }
      el('dilxhan-mem-close').addEventListener('click', cleanup);
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(); });
    },
  };

  // ════════════════════════════════════════════════════════════
  //  CR7  — penalty shootout mini game
  //  Choose CR7 (Portugal) or Messi (Argentina) vs AI keeper.
  //  Drag from the ball to aim and shoot.
  //  Score 3 out of 5 to win. All 5 always taken unless you
  //  clinch 3 early.
  //
  //  Difficulty controls keeper AI accuracy:
  //    Easy   → keeper dives randomly
  //    Medium → 40% chance of reading your column
  //    Hard   → 65% chance of reading your column
  //    Top-row shots have a 55% chance of scoring even if
  //    keeper dives the right column (harder to reach).
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['cr7'] = {
    run({ done }) {
      if (document.getElementById('dilxhan-cr7-overlay')) { done(); return; }

      // ── CSS ──────────────────────────────────────────────────
      if (!document.getElementById('dilxhan-cr7-style')) {
        const s = document.createElement('style');
        s.id = 'dilxhan-cr7-style';
        s.textContent = `
          #dilxhan-cr7-overlay {
            position:fixed; inset:0; z-index:10001;
            background:rgba(10,8,25,0.88);
            backdrop-filter:blur(8px);
            display:flex; align-items:center; justify-content:center;
            animation:cr7-fi 300ms ease forwards;
          }
          @keyframes cr7-fi{from{opacity:0}to{opacity:1}}

          #dilxhan-cr7-modal {
            position:relative; z-index:1;
            background:#0d0d1f;
            border:1px solid rgba(255,255,255,0.1);
            border-radius:18px;
            padding:28px 22px 22px;
            width:min(520px,94vw);
            max-height:92vh; overflow-y:auto;
            box-shadow:0 0 60px rgba(0,0,0,0.6);
            font-family:inherit; color:#e8e8ff;
          }
          #dilxhan-cr7-modal::-webkit-scrollbar{width:3px}
          #dilxhan-cr7-modal::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:2px}

          #dilxhan-cr7-close {
            position:absolute; top:12px; right:14px; z-index:10;
            width:28px; height:28px; border-radius:50%;
            background:rgba(255,255,255,0.06);
            border:1px solid rgba(255,255,255,0.15);
            color:rgba(255,255,255,0.5); font-size:12px; cursor:pointer;
            display:flex; align-items:center; justify-content:center;
            transition:all 150ms;
          }
          #dilxhan-cr7-close:hover{background:rgba(255,255,255,0.12);color:#fff}

          .cr7-title{
            font-family:'Fraunces',Georgia,serif;
            font-weight:900; font-size:24px; text-align:center;
            color:#fff; letter-spacing:.06em; margin:0 0 2px;
            text-shadow:0 0 30px rgba(255,200,50,0.5);
          }
          .cr7-sub{
            text-align:center; font-size:10px; letter-spacing:.18em;
            color:rgba(255,255,255,0.35); margin:0 0 22px; text-transform:uppercase;
          }
          .cr7-lbl{
            font-size:10px; letter-spacing:.14em; text-transform:uppercase;
            color:rgba(255,255,255,0.3); text-align:center; margin:0 0 10px;
          }

          .cr7-char-row{
            display:flex; gap:12px; justify-content:center; margin-bottom:22px;
          }
          .cr7-char-btn{
            flex:1; max-width:180px;
            background:rgba(255,255,255,0.04);
            border:1.5px solid rgba(255,255,255,0.1);
            border-radius:14px; padding:16px 12px;
            cursor:pointer; transition:all 200ms;
            font-family:inherit; color:#aaa; text-align:center;
          }
          .cr7-char-btn:hover{border-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.07)}
          .cr7-char-btn.sel-cr7{
            border-color:#EE1111; color:#fff;
            background:rgba(238,17,17,0.12);
            box-shadow:0 0 24px rgba(238,17,17,0.2);
          }
          .cr7-char-btn.sel-messi{
            border-color:#74ACDF; color:#fff;
            background:rgba(116,172,223,0.12);
            box-shadow:0 0 24px rgba(116,172,223,0.2);
          }
          .cr7-char-flag{font-size:28px; display:block; margin-bottom:6px}
          .cr7-char-name{font-weight:700; font-size:15px; display:block; letter-spacing:.05em}
          .cr7-char-num{
            font-size:10px; letter-spacing:.1em;
            color:rgba(255,255,255,0.35); display:block; margin-top:3px;
          }

          .cr7-diff-row{
            display:flex; gap:8px; justify-content:center; margin-bottom:22px;
          }
          .cr7-diff-btn{
            flex:1; max-width:110px; padding:10px 8px;
            background:rgba(255,255,255,0.04);
            border:1.5px solid rgba(255,255,255,0.1);
            border-radius:10px; cursor:pointer; transition:all 180ms;
            font-family:inherit; color:#888; text-align:center; font-size:12px;
          }
          .cr7-diff-btn:hover{border-color:rgba(255,255,255,0.25);color:#ccc}
          .cr7-diff-btn.sel{border-color:#FFD700;color:#FFD700;background:rgba(255,215,0,0.08);box-shadow:0 0 16px rgba(255,215,0,0.12)}
          .cr7-diff-hint{font-size:9px;color:rgba(255,255,255,0.3);display:block;margin-top:2px}

          #dilxhan-cr7-start{
            display:block; width:100%; padding:13px;
            background:linear-gradient(135deg,#FFD700,#FFA500);
            border:none; border-radius:11px;
            color:#111; font-size:12px; font-weight:700;
            letter-spacing:.2em; cursor:pointer;
            transition:all 180ms; font-family:inherit;
            box-shadow:0 3px 18px rgba(255,165,0,0.35);
          }
          #dilxhan-cr7-start:hover{transform:translateY(-1px);box-shadow:0 5px 24px rgba(255,165,0,0.45)}

          #cr7-canvas{
            display:block; width:100%; border-radius:10px;
            cursor:crosshair; margin-bottom:12px;
            box-shadow:0 0 0 1px rgba(255,255,255,0.08);
          }

          #cr7-scorebar{
            display:flex; align-items:center; justify-content:space-between;
            padding:8px 4px; margin-bottom:12px;
          }
          #cr7-dots{display:flex; gap:7px}
          .cr7-dot{
            width:12px; height:12px; border-radius:50%;
            border:1.5px solid rgba(255,255,255,0.25);
            background:transparent; transition:all 250ms;
            display:inline-block;
          }
          .cr7-dot.g{background:#22cc55;border-color:#22cc55;box-shadow:0 0 8px rgba(34,204,85,0.6)}
          .cr7-dot.s{background:#cc3322;border-color:#cc3322}
          .cr7-dot.cur{border-color:#FFD700;box-shadow:0 0 8px rgba(255,215,0,0.6);animation:cr7-dot-pulse 700ms ease-in-out infinite}
          @keyframes cr7-dot-pulse{0%,100%{opacity:1}50%{opacity:.4}}
          #cr7-score-txt{font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:.06em}
          #cr7-score-num{
            font-family:'Fraunces',Georgia,serif;
            font-size:22px; font-weight:700; color:#FFD700;
            text-shadow:0 0 16px rgba(255,215,0,0.5);
          }

          .cr7-action-row{display:flex;gap:8px}
          .cr7-btn{
            flex:1; padding:10px;
            background:rgba(255,255,255,0.04);
            border:1px solid rgba(255,255,255,0.12); border-radius:9px;
            color:rgba(255,255,255,0.5); font-size:11px;
            letter-spacing:.12em; cursor:pointer;
            transition:all 160ms; font-family:inherit;
          }
          .cr7-btn:hover{border-color:rgba(255,255,255,0.3);color:#fff;background:rgba(255,255,255,0.08)}
          .cr7-btn.primary{
            background:linear-gradient(135deg,#FFD700,#FFA500);
            border-color:transparent; color:#111; font-weight:700;
            box-shadow:0 2px 12px rgba(255,165,0,0.3);
          }
          .cr7-btn.primary:hover{box-shadow:0 4px 18px rgba(255,165,0,0.45)}

          #dilxhan-cr7-result{text-align:center;padding:8px 0}
          .cr7-r-emoji{font-size:48px;display:block;margin-bottom:10px}
          .cr7-r-title{
            font-family:'Fraunces',Georgia,serif;
            font-size:26px;font-weight:900;margin:0 0 4px;
          }
          .cr7-r-sub{font-size:11px;color:rgba(255,255,255,0.4);margin:0 0 20px;letter-spacing:.1em}
          .cr7-r-stats{
            display:flex;justify-content:center;
            margin-bottom:22px; padding:14px;
            background:rgba(255,255,255,0.04);border-radius:12px;
            border:1px solid rgba(255,255,255,0.08);
          }
          .cr7-rs{text-align:center;padding:0 18px}
          .cr7-rs+.cr7-rs{border-left:1px solid rgba(255,255,255,0.08)}
          .cr7-rs-v{
            font-family:'Fraunces',Georgia,serif;
            font-size:26px;font-weight:700;color:#FFD700;display:block;
          }
          .cr7-rs-l{font-size:9px;letter-spacing:.12em;color:rgba(255,255,255,0.35);text-transform:uppercase}
        `;
        document.head.appendChild(s);
      }

      // ── DOM ──────────────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.id = 'dilxhan-cr7-overlay';
      overlay.innerHTML = `
        <div id="dilxhan-cr7-modal">
          <button id="dilxhan-cr7-close">✕</button>

          <!-- Setup -->
          <div id="dilxhan-cr7-setup">
            <p class="cr7-title">PENALTY</p>
            <p class="cr7-sub">⚽ shootout ⚽</p>

            <p class="cr7-lbl">Choose your player</p>
            <div class="cr7-char-row">
              <button class="cr7-char-btn sel-cr7" data-char="cr7">
                <span class="cr7-char-flag">🇵🇹</span>
                <span class="cr7-char-name">RONALDO</span>
                <span class="cr7-char-num">CR7 · #7 · Portugal</span>
              </button>
              <button class="cr7-char-btn" data-char="messi">
                <span class="cr7-char-flag">🇦🇷</span>
                <span class="cr7-char-name">MESSI</span>
                <span class="cr7-char-num">LEO · #10 · Argentina</span>
              </button>
            </div>

            <p class="cr7-lbl">Difficulty</p>
            <div class="cr7-diff-row">
              <button class="cr7-diff-btn sel" data-diff="easy">Easy<span class="cr7-diff-hint">Keeper guesses randomly</span></button>
              <button class="cr7-diff-btn" data-diff="medium">Medium<span class="cr7-diff-hint">40% read chance</span></button>
              <button class="cr7-diff-btn" data-diff="hard">Hard<span class="cr7-diff-hint">65% read chance</span></button>
            </div>

            <button id="dilxhan-cr7-start">TAKE THE PENALTY</button>
          </div>

          <!-- Game -->
          <div id="dilxhan-cr7-game" hidden>
            <canvas id="cr7-canvas"></canvas>
            <div id="cr7-scorebar">
              <div id="cr7-dots"></div>
              <div>
                <span id="cr7-score-txt">Goals: </span>
                <span id="cr7-score-num">0</span>
                <span id="cr7-score-txt"> / 5</span>
              </div>
            </div>
            <div class="cr7-action-row">
              <button class="cr7-btn" id="cr7-quit">← Change Player</button>
              <button class="cr7-btn" id="cr7-renew">↺ New Game</button>
            </div>
          </div>

          <!-- Result -->
          <div id="dilxhan-cr7-result" hidden></div>
        </div>
      `;
      document.body.appendChild(overlay);

      // ── Helpers ──────────────────────────────────────────────
      const $ = id => document.getElementById(id);
      const show = id => $(id).hidden = false;
      const hide = id => $(id).hidden = true;
      function easeOut(t) { return 1 - (1-t)*(1-t); }
      function lerp(a,b,t) { return a + (b-a)*t; }

      // ── Character configs ─────────────────────────────────────
      const CHARS = {
        cr7: {
          name:'RONALDO', num:'7', flag:'🇵🇹',
          jersey:'#EE1111', shorts:'#006400', hair:'#1A1A1A', skin:'#C8956A',
          celebText:'SIUUUU!', celebColor:'#FFD700',
          winMsg:'SIUUUUU! WINNER!', loseMsg:'We go again.',
          confetti:['#EE1111','#009900','#FFD700','#FFFFFF','#CC0000'],
        },
        messi: {
          name:'MESSI', num:'10', flag:'🇦🇷',
          jersey:'#74ACDF', shorts:'#1A237E', hair:'#2C1810', skin:'#C8A07A',
          celebText:'GOLAZO!', celebColor:'#74ACDF',
          winMsg:'¡CAMPEÓN!', loseMsg:'Next time, Leo.',
          confetti:['#74ACDF','#FFFFFF','#F5C518','#ADD8E6','#000080'],
        },
      };

      // ── Game state ────────────────────────────────────────────
      let char = 'cr7', diff = 'easy';
      let canvas, ctx, W, H;
      let GOAL_LEFT, GOAL_RIGHT, GOAL_TOP, GOAL_BOTTOM, GOAL_W, GOAL_H;
      let BALL_X, BALL_Y, BALL_R, KEEPER_H, KEEPER_Y, PLAYER_H, PLAYER_Y;

      let penalties, currentPen, playerScore, gamePhase;
      let dragStart, dragCurrent;
      let ballPos, ballTarget, ballCtrl;
      let keeperDiveDir, keeperStartX;
      let shotResult, shotZone;
      let phaseStart;
      let particles = [];
      let rafId = null;

      const BALL_ANIM  = 620;
      const CELEB_DUR  = 1900;
      const SAVE_DUR   = 1400;

      // ── Setup wiring ──────────────────────────────────────────
      overlay.querySelectorAll('[data-char]').forEach(btn => {
        btn.addEventListener('click', () => {
          overlay.querySelectorAll('[data-char]').forEach(b =>
            b.classList.remove('sel-cr7','sel-messi'));
          char = btn.dataset.char;
          btn.classList.add(char === 'cr7' ? 'sel-cr7' : 'sel-messi');
        });
      });
      overlay.querySelectorAll('[data-diff]').forEach(btn => {
        btn.addEventListener('click', () => {
          overlay.querySelectorAll('[data-diff]').forEach(b => b.classList.remove('sel'));
          btn.classList.add('sel');
          diff = btn.dataset.diff;
        });
      });
      $('dilxhan-cr7-start').addEventListener('click', startGame);
      $('cr7-quit').addEventListener('click', () => {
        stopGame();
        hide('dilxhan-cr7-game');
        show('dilxhan-cr7-setup');
      });
      $('cr7-renew').addEventListener('click', startGame);

      // ── Start / stop ──────────────────────────────────────────
      function stopGame() {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        removeInputListeners();
      }

      function startGame() {
        stopGame();
        hide('dilxhan-cr7-setup');
        hide('dilxhan-cr7-result');
        show('dilxhan-cr7-game');

        // Canvas sizing — must happen after game screen is visible
        canvas = $('cr7-canvas');
        W = canvas.width  = canvas.clientWidth  || 460;
        H = canvas.height = Math.round(W * 0.63);
        ctx = canvas.getContext('2d');

        // Layout constants
        GOAL_LEFT   = W * 0.15;
        GOAL_RIGHT  = W * 0.85;
        GOAL_TOP    = H * 0.08;
        GOAL_BOTTOM = H * 0.52;
        GOAL_W      = GOAL_RIGHT - GOAL_LEFT;
        GOAL_H      = GOAL_BOTTOM - GOAL_TOP;
        BALL_R      = Math.max(7, W * 0.022);
        BALL_X      = W * 0.50;
        BALL_Y      = H * 0.75;
        KEEPER_H    = H * 0.20;
        KEEPER_Y    = GOAL_TOP + GOAL_H * 0.75;
        PLAYER_H    = H * 0.22;
        PLAYER_Y    = H - PLAYER_H * 0.05;

        // Game state reset
        penalties   = Array(5).fill(null).map(() => ({ result:null }));
        currentPen  = 0;
        playerScore = 0;
        particles   = [];
        dragStart   = null;
        dragCurrent = null;
        ballPos     = { x:BALL_X, y:BALL_Y };
        gamePhase   = 'idle';

        updateScoreboard();
        addInputListeners();
        rafId = requestAnimationFrame(gameLoop);
      }

      // ── Scoreboard ────────────────────────────────────────────
      function updateScoreboard() {
        $('cr7-score-num').textContent = playerScore;
        const dotsEl = $('cr7-dots');
        dotsEl.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          const d = document.createElement('span');
          d.className = 'cr7-dot';
          const r = penalties[i].result;
          if (r === 'goal') d.classList.add('g');
          else if (r === 'save') d.classList.add('s');
          else if (i === currentPen) d.classList.add('cur');
          dotsEl.appendChild(d);
        }
      }

      // ── Input ─────────────────────────────────────────────────
      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const sx = W / rect.width, sy = H / rect.height;
        const src = e.touches ? e.touches[0] : e;
        return { x:(src.clientX - rect.left)*sx, y:(src.clientY - rect.top)*sy };
      }
      function nearBall(x, y) {
        const dx = x-BALL_X, dy = y-BALL_Y;
        return Math.sqrt(dx*dx+dy*dy) < BALL_R * 5;
      }
      function onDown(e) {
        if (gamePhase !== 'idle') return;
        e.preventDefault();
        const p = getPos(e);
        if (!nearBall(p.x, p.y)) return;
        dragStart = p; dragCurrent = p;
        gamePhase = 'dragging';
      }
      function onMove(e) {
        if (gamePhase !== 'dragging') return;
        e.preventDefault();
        dragCurrent = getPos(e);
      }
      function onUp(e) {
        if (gamePhase !== 'dragging') return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const sx = W/rect.width, sy = H/rect.height;
        let ex, ey;
        if (e.changedTouches) {
          ex = (e.changedTouches[0].clientX - rect.left)*sx;
          ey = (e.changedTouches[0].clientY - rect.top)*sy;
        } else { ex = dragCurrent.x; ey = dragCurrent.y; }
        shotZone = detectZone(BALL_X, BALL_Y, ex, ey);
        fireShot();
      }
      function addInputListeners() {
        canvas.addEventListener('mousedown',  onDown);
        canvas.addEventListener('mousemove',  onMove);
        canvas.addEventListener('mouseup',    onUp);
        canvas.addEventListener('touchstart', onDown, { passive:false });
        canvas.addEventListener('touchmove',  onMove, { passive:false });
        canvas.addEventListener('touchend',   onUp,   { passive:false });
      }
      function removeInputListeners() {
        if (!canvas) return;
        canvas.removeEventListener('mousedown',  onDown);
        canvas.removeEventListener('mousemove',  onMove);
        canvas.removeEventListener('mouseup',    onUp);
        canvas.removeEventListener('touchstart', onDown);
        canvas.removeEventListener('touchmove',  onMove);
        canvas.removeEventListener('touchend',   onUp);
      }

      // ── Zone detection ────────────────────────────────────────
      function detectZone(bx, by, ex, ey) {
        if (ey >= by - 15) return { col:1, row:1 }; // barely moved up
        const dx = ex - bx, dy = ey - by;
        const midY = GOAL_TOP + GOAL_H * 0.5;
        const t = (midY - by) / dy;
        const px = bx + t * dx;
        const rel = (px - GOAL_LEFT) / GOAL_W;
        const col = rel < 0.33 ? 0 : rel < 0.67 ? 1 : 2;
        const row = ey < midY ? 0 : 1;
        return { col:Math.max(0,Math.min(2,col)), row };
      }

      // ── Shot ─────────────────────────────────────────────────
      function fireShot() {
        gamePhase = 'shooting';
        dragStart = dragCurrent = null;

        keeperDiveDir = getKeeperDive(shotZone.col);
        keeperStartX  = W * 0.5;

        ballTarget = {
          x: GOAL_LEFT + (shotZone.col + 0.5) * GOAL_W / 3,
          y: shotZone.row === 0
            ? GOAL_TOP + GOAL_H * 0.22
            : GOAL_TOP + GOAL_H * 0.70,
        };
        ballCtrl = {
          x: (BALL_X + ballTarget.x) / 2 + (ballTarget.x - BALL_X) * 0.1,
          y: (BALL_Y + ballTarget.y) / 2 - H * 0.10,
        };

        shotResult = resolveShot(shotZone, keeperDiveDir);
        phaseStart = performance.now();
      }

      function getKeeperDive(col) {
        const r = Math.random();
        if (diff === 'easy')   return Math.floor(Math.random()*3);
        if (diff === 'medium') return r < 0.40 ? col : Math.floor(Math.random()*3);
        /* hard */             return r < 0.65 ? col : Math.floor(Math.random()*3);
      }

      function resolveShot(zone, keeperCol) {
        if (zone.col !== keeperCol) return 'goal';
        if (zone.row === 0) return Math.random() < 0.55 ? 'goal' : 'save';
        return 'save';
      }

      // ── Particles ─────────────────────────────────────────────
      function spawnParticles(x, y, count, colors) {
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 2 + Math.random() * 6;
          particles.push({
            x, y,
            vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 2.5,
            color: colors[Math.floor(Math.random()*colors.length)],
            alpha:1, r:2+Math.random()*4,
          });
        }
      }

      function updateParticles() {
        for (let i = particles.length-1; i >= 0; i--) {
          const p = particles[i];
          p.vy += 0.14; p.x += p.vx; p.y += p.vy;
          p.alpha -= 0.016;
          if (p.alpha <= 0) { particles.splice(i,1); continue; }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // ── Draw: background ──────────────────────────────────────
      function drawBg() {
        // Stands
        const sg = ctx.createLinearGradient(0,0,0,H*0.42);
        sg.addColorStop(0,'#12103a'); sg.addColorStop(1,'#1e1448');
        ctx.fillStyle = sg; ctx.fillRect(0,0,W,H*0.42);
        // Crowd dots
        for (let cx2=8; cx2<W; cx2+=16) {
          for (let cy2=4; cy2<H*0.40; cy2+=12) {
            if (Math.random()<0.55) {
              ctx.beginPath();
              ctx.arc(cx2, cy2, 2.2, 0, Math.PI*2);
              ctx.fillStyle = `rgba(${80+Math.random()*80},${60+Math.random()*60},${120+Math.random()*80},0.6)`;
              ctx.fill();
            }
          }
        }
        // Floodlights glow
        ['#3333aa','#aa3333','#33aa33'].forEach((c,i) => {
          const gx = W*(0.15+i*0.35);
          const grad = ctx.createRadialGradient(gx,0,0,gx,0,H*0.25);
          grad.addColorStop(0,c.replace(')',',0.07)')); grad.addColorStop(1,'rgba(0,0,0,0)');
          ctx.fillStyle = grad; ctx.fillRect(0,0,W,H*0.42);
        });
        // Grass
        const gg = ctx.createLinearGradient(0,H*0.40,0,H);
        gg.addColorStop(0,'#1e6b1e'); gg.addColorStop(1,'#154f15');
        ctx.fillStyle = gg; ctx.fillRect(0,H*0.40,W,H*0.60);
        // Grass stripes
        for (let sx=0; sx<W; sx+=W*0.10) {
          ctx.fillStyle='rgba(0,0,0,0.07)';
          ctx.fillRect(sx,H*0.40,W*0.05,H*0.60);
        }
        // Penalty box
        const bL=W*0.07,bR=W*0.93,bT=H*0.52,bB=H;
        ctx.strokeStyle='rgba(255,255,255,0.38)';
        ctx.lineWidth=1.5;
        ctx.strokeRect(bL,bT,bR-bL,bB-bT);
        // Penalty spot
        ctx.beginPath();
        ctx.arc(BALL_X,BALL_Y,2.5,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fill();
      }

      // ── Draw: goal ────────────────────────────────────────────
      function drawGoal() {
        // Net
        ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=0.8;
        for (let r=0;r<=10;r++) {
          const ny=GOAL_TOP+r*GOAL_H/10;
          ctx.beginPath(); ctx.moveTo(GOAL_LEFT,ny); ctx.lineTo(GOAL_RIGHT,ny); ctx.stroke();
        }
        for (let c=0;c<=14;c++) {
          const nx=GOAL_LEFT+c*GOAL_W/14;
          ctx.beginPath(); ctx.moveTo(nx,GOAL_TOP); ctx.lineTo(nx,GOAL_BOTTOM); ctx.stroke();
        }
        // Goal flash on score
        if (gamePhase==='celebrating') {
          const t = Math.min(1,(performance.now()-phaseStart)/500);
          ctx.fillStyle=`rgba(255,255,120,${(1-t)*0.18})`;
          ctx.fillRect(GOAL_LEFT,GOAL_TOP,GOAL_W,GOAL_H);
        }
        // Posts
        const pw=5;
        ctx.fillStyle='#FFFFFF';
        ctx.fillRect(GOAL_LEFT-pw, GOAL_TOP, pw, GOAL_H+pw);   // left post
        ctx.fillRect(GOAL_RIGHT,   GOAL_TOP, pw, GOAL_H+pw);   // right post
        ctx.fillRect(GOAL_LEFT-pw, GOAL_TOP, GOAL_W+pw*2, pw); // crossbar
      }

      // ── Draw: zone hint ───────────────────────────────────────
      function drawZoneHint() {
        if (gamePhase !== 'dragging' || !dragCurrent) return;
        const z = detectZone(BALL_X, BALL_Y, dragCurrent.x, dragCurrent.y);
        const zx = GOAL_LEFT + z.col * GOAL_W / 3;
        const zy = z.row === 0 ? GOAL_TOP : GOAL_TOP + GOAL_H*0.5;
        ctx.fillStyle = 'rgba(255,255,100,0.14)';
        ctx.fillRect(zx+2, zy+2, GOAL_W/3-4, GOAL_H/2-4);
      }

      // ── Draw: keeper ──────────────────────────────────────────
      function drawKeeper() {
        const now = performance.now();
        let kx = W*0.5;
        let diveT = 0, tiltAngle = 0;

        if (gamePhase==='shooting'||gamePhase==='celebrating'||gamePhase==='save') {
          diveT = Math.min(1,(now-phaseStart)/BALL_ANIM);
          const diveTargetX = keeperDiveDir===0
            ? GOAL_LEFT + GOAL_W*0.16
            : keeperDiveDir===2
            ? GOAL_RIGHT - GOAL_W*0.16
            : W*0.5;
          kx = lerp(W*0.5, diveTargetX, easeOut(diveT));
          if (keeperDiveDir!==1) tiltAngle = (keeperDiveDir===0?-1:1)*diveT*0.38;
        }

        const h = KEEPER_H;
        ctx.save();
        ctx.translate(kx, KEEPER_Y);
        ctx.rotate(tiltAngle);

        // Legs
        ctx.strokeStyle='#222'; ctx.lineWidth=h*0.07; ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(-h*0.09,0); ctx.lineTo(-h*0.09,h*0.42); ctx.moveTo(-h*0.09,h*0.42); ctx.lineTo(-h*0.12,h*0.44);
        ctx.moveTo( h*0.09,0); ctx.lineTo( h*0.09,h*0.42); ctx.moveTo( h*0.09,h*0.42); ctx.lineTo( h*0.12,h*0.44);
        ctx.stroke();

        // Body
        ctx.fillStyle='#FFD700';
        ctx.fillRect(-h*0.16,-h*0.52,h*0.32,h*0.52);
        ctx.fillStyle='rgba(0,0,0,0.4)';
        ctx.font=`bold ${Math.round(h*0.14)}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('GK',0,-h*0.28);

        // Arms + gloves
        ctx.strokeStyle='#FFD700'; ctx.lineWidth=h*0.07; ctx.lineCap='round';
        if (diveT>0.1 && keeperDiveDir!==1) {
          const d = keeperDiveDir===0?-1:1;
          ctx.beginPath();
          ctx.moveTo(d*h*0.16,-h*0.38);
          ctx.lineTo(d*h*0.52,-h*0.20+diveT*h*0.12);
          ctx.moveTo(-d*h*0.16,-h*0.38);
          ctx.lineTo(-d*h*0.32,-h*0.28);
          ctx.stroke();
          ctx.fillStyle='#FFA500';
          ctx.beginPath();
          ctx.arc(d*h*0.52,-h*0.20+diveT*h*0.12,h*0.08,0,Math.PI*2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(-h*0.16,-h*0.38); ctx.lineTo(-h*0.38,-h*0.16);
          ctx.moveTo( h*0.16,-h*0.38); ctx.lineTo( h*0.38,-h*0.16);
          ctx.stroke();
          ctx.fillStyle='#FFA500';
          ctx.beginPath(); ctx.arc(-h*0.38,-h*0.16,h*0.08,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc( h*0.38,-h*0.16,h*0.08,0,Math.PI*2); ctx.fill();
        }

        // Head
        ctx.fillStyle='#F5CBA7';
        ctx.beginPath(); ctx.arc(0,-h*0.65,h*0.14,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#5C3D2E';
        ctx.beginPath(); ctx.arc(0,-h*0.73,h*0.12,Math.PI,0); ctx.fill();
        ctx.restore();
      }

      // ── Draw: player ──────────────────────────────────────────
      function drawPlayer() {
        const now = performance.now();
        const cfg = CHARS[char];
        const h = PLAYER_H;
        let kickT=0, jumpY=0, armAngle=0;

        if (gamePhase==='shooting') {
          kickT = Math.min(1,(now-phaseStart)/BALL_ANIM);
        } else if (gamePhase==='celebrating') {
          const et = now - phaseStart;
          if (char === 'cr7') {
            // CR7 only gets the jump — iconic SIUUU leap
            jumpY = Math.sin(Math.min(1, et/600) * Math.PI) * h * 0.32;
          }
          armAngle = Math.PI * 0.75 * Math.min(1, et/500);
        } else if (gamePhase==='save') {
          armAngle = -0.25; // arms drop / disappointed
        }

        ctx.save();
        ctx.translate(W*0.5, PLAYER_Y - jumpY);

        // Legs
        ctx.strokeStyle=cfg.shorts; ctx.lineWidth=h*0.07; ctx.lineCap='round';
        if (kickT>0.2 && gamePhase==='shooting') {
          const kt = Math.min(1,(kickT-0.2)/0.55);
          // Standing leg
          ctx.beginPath();
          ctx.moveTo(-h*0.09,0); ctx.lineTo(-h*0.09,h*0.40); ctx.moveTo(-h*0.09,h*0.40); ctx.lineTo(-h*0.11,h*0.44);
          ctx.stroke();
          // Kicking leg
          ctx.save();
          ctx.translate(h*0.09,h*0.22);
          ctx.rotate(-Math.PI*0.55*kt);
          ctx.beginPath();
          ctx.moveTo(0,-h*0.22); ctx.lineTo(0,h*0.18);
          ctx.stroke();
          ctx.fillStyle='#111';
          ctx.beginPath(); ctx.ellipse(0,h*0.20,h*0.09,h*0.045,0,0,Math.PI*2); ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.moveTo(-h*0.09,0); ctx.lineTo(-h*0.09,h*0.40); ctx.moveTo(-h*0.09,h*0.40); ctx.lineTo(-h*0.11,h*0.44);
          ctx.moveTo( h*0.09,0); ctx.lineTo( h*0.09,h*0.40); ctx.moveTo( h*0.09,h*0.40); ctx.lineTo( h*0.11,h*0.44);
          ctx.stroke();
        }

        // Body
        ctx.fillStyle = cfg.jersey;
        ctx.fillRect(-h*0.16,-h*0.52,h*0.32,h*0.52);
        // Argentina stripes
        if (char==='messi') {
          ctx.fillStyle='rgba(255,255,255,0.45)';
          for (let sx=-h*0.13; sx<h*0.13; sx+=h*0.09) ctx.fillRect(sx,-h*0.52,h*0.04,h*0.52);
        }
        // Number
        ctx.fillStyle='#FFFFFF';
        ctx.font=`bold ${Math.round(h*0.16)}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(cfg.num,0,-h*0.28);

        // Arms
        ctx.strokeStyle=cfg.jersey; ctx.lineWidth=h*0.065; ctx.lineCap='round';
        if (armAngle!==0) {
          // Celebration or disappointment arms
          if (gamePhase==='celebrating') {
            if (char === 'cr7') {
              const t = Math.min(1, (now - phaseStart) / 500);

              const spread = t * h * 0.25;   // keep horizontal reach
              const drop = t * h * 0.20;     // 👈 small downward tilt

              // RIGHT ARM (straight line, slightly downward)
              ctx.beginPath();
              ctx.moveTo(h*0.16, -h*0.38);
              ctx.lineTo(h*0.16 + spread, -h*0.38 + drop);
              ctx.stroke();

              // LEFT ARM (mirror)
              ctx.beginPath();
              ctx.moveTo(-h*0.16, -h*0.38);
              ctx.lineTo(-h*0.16 - spread, -h*0.38 + drop);
              ctx.stroke();
            } else {
              // Messi: both arms rise toward sky, one finger pointing up from each hand
              const at = Math.min(1, (now - phaseStart) / 500);
              const rise = Math.PI * 0.72 * at;

              // Left arm
              const lx = -h*0.16 - Math.sin(rise*0.2)*h*0.22;
              const ly = -h*0.38 - Math.cos(rise - Math.PI)*h*0.22;
              ctx.beginPath();
              ctx.moveTo(-h*0.16, -h*0.38);
              ctx.lineTo(lx, ly);
              ctx.stroke();
              // Left index finger pointing straight up
              ctx.beginPath();
              ctx.moveTo(lx, ly);
              ctx.lineTo(lx, ly - h*0.10);
              ctx.stroke();
              // Left finger tip dot (knuckle)
              ctx.fillStyle = CHARS[char].skin;
              ctx.beginPath();
              ctx.arc(lx, ly - h*0.10, h*0.025, 0, Math.PI*2);
              ctx.fill();

              // Right arm
              const rx = h*0.16 + Math.sin(rise*0.2)*h*0.22;
              const ry = -h*0.38 - Math.cos(rise - Math.PI)*h*0.22;
              ctx.beginPath();
              ctx.moveTo(h*0.16, -h*0.38);
              ctx.lineTo(rx, ry);
              ctx.stroke();
              // Right index finger pointing straight up
              ctx.beginPath();
              ctx.moveTo(rx, ry);
              ctx.lineTo(rx, ry - h*0.10);
              ctx.stroke();
              // Right finger tip dot
              ctx.fillStyle = CHARS[char].skin;
              ctx.beginPath();
              ctx.arc(rx, ry - h*0.10, h*0.025, 0, Math.PI*2);
              ctx.fill();
            }
          } else {
            // Save — arms droop
            ctx.beginPath();
            ctx.moveTo(-h*0.16,-h*0.38); ctx.lineTo(-h*0.34,-h*0.10);
            ctx.moveTo( h*0.16,-h*0.38); ctx.lineTo( h*0.34,-h*0.10);
            ctx.stroke();
          }
        } else {
          ctx.beginPath();
          ctx.moveTo(-h*0.16,-h*0.38); ctx.lineTo(-h*0.34,-h*0.18);
          ctx.moveTo( h*0.16,-h*0.38); ctx.lineTo( h*0.34,-h*0.18);
          ctx.stroke();
        }

        // Head
        ctx.fillStyle=cfg.skin;
        ctx.beginPath(); ctx.arc(0,-h*0.65,h*0.14,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=cfg.hair;
        ctx.beginPath(); ctx.arc(0,-h*0.73,h*0.12,Math.PI,0); ctx.fill();
        if (char==='cr7') { // CR7 undercut
          ctx.fillRect(-h*0.12,-h*0.73,h*0.24,h*0.05);
        }
        ctx.restore();
      }

      // ── Draw: ball ────────────────────────────────────────────
      function drawBall() {
        const now = performance.now();
        let bx=BALL_X, by=BALL_Y, spin=0;

        if (gamePhase==='shooting'||gamePhase==='celebrating'||gamePhase==='save') {
          const t = Math.min(1,(now-phaseStart)/BALL_ANIM);
          const mt=1-t;
          bx = mt*mt*BALL_X + 2*mt*t*ballCtrl.x + t*t*ballTarget.x;
          by = mt*mt*BALL_Y + 2*mt*t*ballCtrl.y + t*t*ballTarget.y;
          spin = t * Math.PI * 5;
        }
        ballPos = { x:bx, y:by };

        // Shadow
        ctx.beginPath();
        ctx.ellipse(bx,by+BALL_R*0.9,BALL_R*0.75,BALL_R*0.22,0,0,Math.PI*2);
        ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fill();

        ctx.save();
        ctx.translate(bx,by); ctx.rotate(spin);
        const bg = ctx.createRadialGradient(-BALL_R*0.3,-BALL_R*0.3,1,0,0,BALL_R);
        bg.addColorStop(0,'#FFFFFF'); bg.addColorStop(1,'#CCCCCC');
        ctx.beginPath(); ctx.arc(0,0,BALL_R,0,Math.PI*2);
        ctx.fillStyle=bg; ctx.fill();
        ctx.strokeStyle='#444'; ctx.lineWidth=0.6; ctx.stroke();
        // Seam lines
        ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=0.9;
        for (let i=0; i<5; i++) {
          const a=(i/5)*Math.PI*2;
          ctx.beginPath();
          ctx.moveTo(0,0);
          ctx.lineTo(Math.cos(a)*BALL_R*0.55,Math.sin(a)*BALL_R*0.55);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── Draw: drag arrow ──────────────────────────────────────
      function drawDragArrow() {
        if (gamePhase!=='dragging'||!dragCurrent) return;
        const dx=dragCurrent.x-BALL_X, dy=dragCurrent.y-BALL_Y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<12) return;
        const angle=Math.atan2(dy,dx);
        const len=Math.min(dist, H*0.22);
        const ex=BALL_X+Math.cos(angle)*len, ey=BALL_Y+Math.sin(angle)*len;
        ctx.save();
        ctx.strokeStyle='rgba(255,255,180,0.75)'; ctx.lineWidth=2.5;
        ctx.setLineDash([6,5]);
        ctx.beginPath(); ctx.moveTo(BALL_X,BALL_Y); ctx.lineTo(ex,ey); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle='rgba(255,255,180,0.85)';
        ctx.translate(ex,ey); ctx.rotate(angle);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-10,-5); ctx.lineTo(-10,5); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      // ── Draw: prompt ──────────────────────────────────────────
      function drawPrompt() {
        if (gamePhase!=='idle') return;
        const pulse=0.5+0.5*Math.sin(performance.now()*0.003);
        ctx.beginPath();
        ctx.arc(BALL_X,BALL_Y,BALL_R*(2.2+pulse*0.8),0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,120,${0.07+pulse*0.08})`; ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.65)';
        ctx.font=`${H*0.042}px sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('Drag from the ball to shoot',W*0.5,H*0.93);
      }

      // ── Draw: overlay text (goal/save) ────────────────────────
      function drawResultText() {
        const cfg = CHARS[char];
        if (gamePhase==='celebrating') {
          const t=Math.min(1,(performance.now()-phaseStart)/800);
          const alpha=t>0.75?1-(t-0.75)/0.25:1;
          ctx.save();
          ctx.globalAlpha=alpha;
          ctx.translate(W*0.5,H*0.34);
          ctx.scale(easeOut(Math.min(1,t*2.5)),easeOut(Math.min(1,t*2.5)));
          ctx.font=`bold ${H*0.13}px 'Fraunces',Georgia,serif`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillStyle=cfg.celebColor;
          ctx.shadowColor=cfg.celebColor; ctx.shadowBlur=22;
          ctx.fillText(cfg.celebText,0,0);
          ctx.shadowBlur=0; ctx.restore();
        } else if (gamePhase==='save') {
          const t=Math.min(1,(performance.now()-phaseStart)/700);
          const alpha=t>0.75?1-(t-0.75)/0.25:1;
          ctx.save();
          ctx.globalAlpha=alpha;
          ctx.font=`bold ${H*0.10}px 'Fraunces',Georgia,serif`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillStyle='#FF4444'; ctx.shadowColor='#FF4444'; ctx.shadowBlur=18;
          ctx.fillText('SAVED!',W*0.5,H*0.34);
          ctx.shadowBlur=0; ctx.restore();
        }
      }

      // ── Draw: score strip ─────────────────────────────────────
      function drawScoreStrip() {
        ctx.fillStyle='rgba(0,0,0,0.5)';
        ctx.fillRect(0,0,W,H*0.072);
        const cfg=CHARS[char];
        ctx.fillStyle='#FFFFFF';
        ctx.font=`bold ${H*0.042}px sans-serif`;
        ctx.textAlign='left'; ctx.textBaseline='middle';
        ctx.fillText(`${cfg.flag} ${cfg.name} · #${cfg.num}`,W*0.03,H*0.036);
        ctx.textAlign='right';
        ctx.fillStyle='#FFD700';
        ctx.fillText(`⚽ ${playerScore}  •  Pen ${Math.min(currentPen+1,5)}/5`,W*0.97,H*0.036);
      }

      // ── Game loop ─────────────────────────────────────────────
      function gameLoop() {
        const now = performance.now();
        ctx.clearRect(0,0,W,H);

        // Phase transitions
        if (gamePhase==='shooting' && now-phaseStart >= BALL_ANIM) {
          penalties[currentPen].result = shotResult;
          if (shotResult==='goal') {
            playerScore++;
            spawnParticles(ballTarget.x,ballTarget.y,55,CHARS[char].confetti);
          }
          phaseStart = now;
          gamePhase = shotResult==='goal' ? 'celebrating' : 'save';
          updateScoreboard();
        } else if (gamePhase==='celebrating' && now-phaseStart>=CELEB_DUR) {
          advance();
        } else if (gamePhase==='save' && now-phaseStart>=SAVE_DUR) {
          advance();
        }

        // Render
        drawBg(); drawGoal(); drawZoneHint();
        updateParticles();
        drawKeeper(); drawBall(); drawPlayer();
        drawDragArrow(); drawResultText(); drawPrompt();
        drawScoreStrip();

        if (gamePhase!=='ended') rafId = requestAnimationFrame(gameLoop);
      }

      // ── Advance / end ─────────────────────────────────────────
      function advance() {
        currentPen++;
        particles = [];
        ballPos = { x:BALL_X, y:BALL_Y };

        // Early win
        if (playerScore >= 3) { endGame('win'); return; }
        // All 5 done
        if (currentPen >= 5) { endGame(playerScore>=3?'win':'lose'); return; }

        gamePhase = 'idle';
        updateScoreboard();
      }

      function endGame(outcome) {
        gamePhase = 'ended';
        cancelAnimationFrame(rafId); rafId = null;
        removeInputListeners();
        const isWin = outcome==='win';
        const cfg   = CHARS[char];

        if (isWin) {
          // Final celebration: keep drawing with big confetti for 1.8s
          let fr;
          const fs = performance.now();
          for (let i=0; i<3; i++) {
            setTimeout(() => {
              for (let j=0; j<80; j++) {
                const a=Math.random()*Math.PI*2, sp=3+Math.random()*8;
                particles.push({
                  x:W*(0.2+Math.random()*0.6), y:H*0.3,
                  vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-5,
                  color:cfg.confetti[Math.floor(Math.random()*cfg.confetti.length)],
                  alpha:1, r:3+Math.random()*5,
                });
              }
            }, i*350);
          }
          function finalDraw() {
            ctx.clearRect(0,0,W,H);
            drawBg(); drawGoal();
            updateParticles(); drawPlayer();
            const ft = Math.min(1,(performance.now()-fs)/600);
            ctx.save();
            ctx.globalAlpha=easeOut(ft);
            ctx.font=`bold ${H*0.14}px 'Fraunces',Georgia,serif`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillStyle=cfg.celebColor;
            ctx.shadowColor=cfg.celebColor; ctx.shadowBlur=30;
            ctx.fillText(cfg.winMsg,W*0.5,H*0.38);
            ctx.shadowBlur=0;
            ctx.font=`${H*0.054}px sans-serif`;
            ctx.fillStyle='#FFFFFF';
            ctx.fillText(`${cfg.flag} ${playerScore} - ${currentPen-playerScore} Goals ${cfg.flag}`,W*0.5,H*0.56);
            ctx.restore();
            if (performance.now()-fs < 1800) fr = requestAnimationFrame(finalDraw);
            else { cancelAnimationFrame(fr); showResult(isWin); }
          }
          rafId = requestAnimationFrame(finalDraw);
        } else {
          setTimeout(() => showResult(isWin), 500);
        }
      }

      function showResult(isWin) {
        hide('dilxhan-cr7-game');
        const cfg = CHARS[char];
        $('dilxhan-cr7-result').innerHTML = `
          <span class="cr7-r-emoji">${isWin ? '🏆' : '😔'}</span>
          <p class="cr7-r-title" style="color:${isWin?cfg.celebColor:'#888'}">
            ${isWin ? cfg.winMsg : cfg.loseMsg}
          </p>
          <p class="cr7-r-sub">${cfg.flag} ${cfg.name} · ${diff.toUpperCase()} difficulty</p>
          <div class="cr7-r-stats">
            <div class="cr7-rs">
              <span class="cr7-rs-v">${playerScore}</span>
              <span class="cr7-rs-l">Goals</span>
            </div>
            <div class="cr7-rs">
              <span class="cr7-rs-v">${currentPen - playerScore}</span>
              <span class="cr7-rs-l">Saved</span>
            </div>
            <div class="cr7-rs">
              <span class="cr7-rs-v">5</span>
              <span class="cr7-rs-l">Penalties</span>
            </div>
          </div>
          <div class="cr7-action-row">
            <button class="cr7-btn" id="cr7-back">← Change Player</button>
            <button class="cr7-btn primary" id="cr7-again">↺ Play Again</button>
          </div>
        `;
        show('dilxhan-cr7-result');
        $('cr7-back').addEventListener('click', () => {
          hide('dilxhan-cr7-result'); show('dilxhan-cr7-setup');
        });
        $('cr7-again').addEventListener('click', startGame);
      }

      // ── Cleanup ───────────────────────────────────────────────
      function cleanup() {
        stopGame();
        overlay.remove();
        done();
      }
      $('dilxhan-cr7-close').addEventListener('click', cleanup);
      overlay.addEventListener('click', e => { if (e.target===overlay) cleanup(); });
    },
  };

  // ════════════════════════════════════════════════════════════
  //  FORTUNE  — Japanese-themed fortune cookie reveal
  //
  //  Three cookies shown. User picks one. It cracks open and
  //  a paper scroll unfurls with a fortune.
  //
  //  114 fortunes across 12 categories with rarity weighting:
  //    Common (96%): 🍀 💪 ❤️ 🌞 💰 🌍 ✨ 😄 🎮 🎲
  //    Rare   (3.3%): 🌈
  //    Ultra  (0.6%): 👑
  //
  //  localStorage tracks seen fortunes so repeats are rare.
  //  After 70% of fortunes seen the tracker resets.
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['fortune'] = {
    run({ done }) {
      if (document.getElementById('dilxhan-fort-overlay')) { done(); return; }
    //  CSS
    if (!document.getElementById('dilxhan-fort-style')) {
      const s = document.createElement('style');
      s.id = 'dilxhan-fort-style';
      s.textContent = `
        #dilxhan-fort-overlay {
          position:fixed; inset:0; z-index:10001;
          background:rgba(251, 249, 244, 0.9);
          backdrop-filter:blur(8px);
          display:flex; align-items:center; justify-content:center;
          animation:fort-fi 350ms ease forwards;
        }
        @keyframes fort-fi{from{opacity:0}to{opacity:1}}

        #dilxhan-fort-modal {
          position:relative; z-index:1;
          background:#FFFFFF;
          border:1px solid rgba(200, 159, 112, 0.2);
          border-radius:12px;
          padding:32px 22px 22px;
          width:min(400px,94vw);
          max-height:92vh; overflow-y:auto;
          box-shadow:0 10px 40px rgba(92, 82, 72, 0.15);
          font-family:inherit; color:#5C5248;
        }
        #dilxhan-fort-modal::-webkit-scrollbar{width:3px}
        #dilxhan-fort-modal::-webkit-scrollbar-thumb{background:rgba(200, 159, 112, 0.2);border-radius:2px}

        #dilxhan-fort-close {
          position:absolute; top:12px; right:14px; z-index:10;
          width:28px; height:28px; border-radius:50%;
          background:rgba(200, 159, 112, 0.08);
          border:1px solid rgba(200, 159, 112, 0.2);
          color:#B89C85; font-size:12px; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:all 200ms;
        }
        #dilxhan-fort-close:hover{background:rgba(200, 159, 112, 0.16);color:#C89F70;}

        .fc-divider {
          height:1px; margin:6px 0;
          background:linear-gradient(90deg,transparent,rgba(200, 159, 112, 0.3),transparent);
        }
        .fc-seal {
          width:10px; height:10px; border-radius:50%;
          background:#B86B6B; display:inline-block;
          box-shadow:0 0 8px rgba(184, 107, 107, 0.3);
        }
        .fc-title-area {
          text-align:center; margin-bottom:22px;
          display:flex; flex-direction:column; align-items:center; gap:5px;
        }
        .fc-jp { font-size:10px; letter-spacing:.45em; color:#B89C85; }
        .fc-main-title {
          font-family:'Fraunces',Georgia,serif;
          font-size:20px; font-weight:900; letter-spacing:.12em;
          color:#C89F70;
        }
        .fc-seals { display:flex; gap:8px; align-items:center; }

        #fc-prompt {
          text-align:center; font-size:10px; letter-spacing:.18em;
          color:#B89C85; margin-bottom:20px; text-transform:uppercase;
        }

        #fc-cookies { display:flex; justify-content:center; gap:14px; margin-bottom:18px; }
        .fc-cookie-btn {
          background:none; border:none; cursor:pointer;
          display:flex; flex-direction:column; align-items:center; gap:7px;
          padding:0; transition:transform 220ms; position:relative;
          width:100px;
        }
        .fc-cookie-btn:hover:not(.fc-used):not(.fc-selected) {
          transform:translateY(-8px) scale(1.06);
        }
        .fc-cookie-btn.fc-used {
          cursor:default; opacity:0.3; pointer-events:none;
          transform:scale(0.92) !important;
        }
        .fc-cookie-btn.fc-selected { cursor:default; }
        .fc-cookie-wrap { position:relative; width:100px; height:76px; }
        .fc-svg { width:100px; height:76px; display:block; }

        .fc-half { position:absolute; inset:0; pointer-events:none; }
        .fc-half-t { clip-path:polygon(0 0,100% 0,100% 50%,0 50%); }
        .fc-half-b { clip-path:polygon(0 50%,100% 50%,100% 100%,0 100%); }
        .fc-cracking .fc-half-t { animation:fc-split-t 680ms cubic-bezier(.22,1,.36,1) forwards; }
        .fc-cracking .fc-half-b { animation:fc-split-b 680ms cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes fc-split-t { 100%{transform:translate(-16px,-24px) rotate(-24deg);opacity:0} }
        @keyframes fc-split-b { 100%{transform:translate(16px,20px) rotate(20deg);opacity:0} }

        .fc-cookie-num { font-size:11px; letter-spacing:.12em; color:#D6C4B0; }

        #fc-scroll {
          background:#FDFBF7;
          border:1px solid #E6DED0;
          border-radius:3px; padding:20px 18px 16px;
          box-shadow:0 4px 15px rgba(92, 82, 72, 0.1);
          margin-bottom:14px; position:relative;
          transform-origin:top center;
          animation:fc-unfurl 700ms cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes fc-unfurl { 0% {transform:scaleY(0);opacity:0} 100%{transform:scaleY(1);opacity:1} }
        .fc-scroll-curl {
          display:block; height:5px; margin:0 -18px;
          background:linear-gradient(180deg,rgba(200,159,112,0.15),transparent);
        }
        .fc-scroll-curl.bot { margin-top:14px; margin-bottom:-16px; transform:rotate(180deg); }

        .fc-category-badge {
          display:flex; align-items:center; justify-content:center; gap:5px;
          font-size:10px; letter-spacing:.13em; text-transform:uppercase;
          color:#B89C85; margin:10px auto 14px;
          border:1px solid #E6DED0;
          border-radius:20px; padding:3px 10px; width:fit-content;
        }
        .fc-fortune-text {
          font-family:Georgia,serif;
          font-size:16px; line-height:1.8;
          color:#4A443D; text-align:center;
        }
        .fc-rarity-badge {
          text-align:center; font-size:9px; letter-spacing:.2em;
          color:#C89F70; margin-top:12px; text-transform:uppercase;
        }
        .fc-rarity-badge.rare { color:#B86B6B; }
        .fc-rarity-badge.ultra { color:#C89F70; font-weight:700; }
        
        #fc-actions { display:flex; justify-content:center; margin-top:10px; }
        .fc-action-btn {
          background:#F5F2EE; border:1px solid #E6DED0;
          border-radius:20px; padding:8px 18px;
          color:#B89C85; font-size:11px;
          letter-spacing:.1em; cursor:pointer; transition:all 200ms;
        }
        .fc-action-btn:hover { background:#E6DED0; color:#4A443D; }
      `;
      document.head.appendChild(s);
    }

      // ── Fortune data ──────────────────────────────────────────
      // [icon, categoryName, text, rarity]  rarity: 0=common 1=rare 2=ultra
      const F = [
        // 🍀 Lucky
        ['🍀','Lucky','Fortune favors those who make their own luck.',0],
        ['🍀','Lucky','The stars have aligned in your favor — step boldly.',0],
        ['🍀','Lucky','An unexpected gift is making its way to you.',0],
        ['🍀','Lucky','Doors that have been closed will soon swing wide open.',0],
        ['🍀','Lucky','You will find something valuable in an unexpected place.',0],
        ['🍀','Lucky','A coin found today is more than money — it is a sign.',0],
        ['🍀','Lucky','Luck is not chance — it is the residue of your effort.',0],
        ['🍀','Lucky','The universe is conspiring in your favor. Let it.',0],
        ['🍀','Lucky','Tomorrow\'s luck begins with today\'s courage.',0],
        ['🍀','Lucky','Something long overdue is finally on its way to you.',0],
        // 💪 Motivational
        ['💪','Motivational','The mountain you fear to climb has the best view.',0],
        ['💪','Motivational','Every expert was once a beginner who refused to quit.',0],
        ['💪','Motivational','You have survived every difficult day so far. Today is no different.',0],
        ['💪','Motivational','The only failure is the one from which you learn nothing.',0],
        ['💪','Motivational','Rest if you must, but never quit.',0],
        ['💪','Motivational','Your potential has no ceiling — only the floor you choose.',0],
        ['💪','Motivational','The hardest step is always the first. You have already taken it.',0],
        ['💪','Motivational','Small progress is still progress. Keep moving.',0],
        ['💪','Motivational','You are closer to your goal than you were yesterday.',0],
        ['💪','Motivational','Believe in yourself as fiercely as you believe in others.',0],
        // ❤️ Kindness & Relationships
        ['❤️','Kindness','The one who makes you laugh is worth more than gold.',0],
        ['❤️','Kindness','A kind word costs nothing but means everything.',0],
        ['❤️','Kindness','Tell someone you love them today. Tomorrow is never guaranteed.',0],
        ['❤️','Kindness','Your heart knows what your mind has not yet accepted.',0],
        ['❤️','Kindness','The friends who sit with you in silence are the truest.',0],
        ['❤️','Kindness','Love is not about perfection — it is about showing up anyway.',0],
        ['❤️','Kindness','Someone is thinking of you more than you know.',0],
        ['❤️','Kindness','The kindness you show strangers echoes through eternity.',0],
        ['❤️','Kindness','Forgiveness is a gift you give yourself.',0],
        ['❤️','Kindness','A relationship that makes you better is worth fighting for.',0],
        // 🌞 Daily Positivity
        ['🌞','Positivity','Today is a blank page. Write something beautiful.',0],
        ['🌞','Positivity','The sun rose again today. So did you. That is enough.',0],
        ['🌞','Positivity','Even slow days move you forward.',0],
        ['🌞','Positivity','You don\'t need to have it all figured out. Just begin.',0],
        ['🌞','Positivity','Good things are already on their way to you.',0],
        ['🌞','Positivity','Notice three beautiful things today. They are waiting.',0],
        ['🌞','Positivity','Your presence changes every room you walk into.',0],
        ['🌞','Positivity','Today\'s simple moments are tomorrow\'s cherished memories.',0],
        ['🌞','Positivity','Everything you need is already within your reach.',0],
        ['🌞','Positivity','The best part of today has not happened yet.',0],
        // 💰 Success & Growth
        ['💰','Success','The seed of your greatest success is planted in today\'s effort.',0],
        ['💰','Success','Wealth is not only money — it is time, health, and peace.',0],
        ['💰','Success','A great idea will not wait — write it down now.',0],
        ['💰','Success','Success follows those who work even when no one is watching.',0],
        ['💰','Success','The investment you make in yourself always pays dividends.',0],
        ['💰','Success','Your next chapter is better than your last — start writing it.',0],
        ['💰','Success','Patience and persistence are the parents of achievement.',0],
        ['💰','Success','One good habit repeated is worth a thousand ideas abandoned.',0],
        ['💰','Success','You are building something that will matter. Keep going.',0],
        ['💰','Success','The goal is not to be rich. The goal is to be free.',0],
        // 🌍 Adventure
        ['🌍','Adventure','Say yes to the thing you have been putting off for months.',0],
        ['🌍','Adventure','The road not taken is still there, patiently waiting.',0],
        ['🌍','Adventure','Adventure is not found on a map. It is found in an open mind.',0],
        ['🌍','Adventure','The most interesting people have been lost and found themselves.',0],
        ['🌍','Adventure','Go somewhere you have never been — even just a new street.',0],
        ['🌍','Adventure','The world is a book. Those who don\'t travel read only one page.',0],
        ['🌍','Adventure','Your next great story begins with a single unfamiliar step.',0],
        ['🌍','Adventure','The journey changes you before the destination even arrives.',0],
        ['🌍','Adventure','Try the thing on the menu you cannot pronounce. It will be perfect.',0],
        ['🌍','Adventure','A new city, a new dish, a new conversation — all are waiting.',0],
        // ✨ Mysterious
        ['✨','Mysterious','The answer you seek is hiding in plain sight.',0],
        ['✨','Mysterious','Not all who wander are lost — some have found something better.',0],
        ['✨','Mysterious','The version of you from five years ago would be amazed right now.',0],
        ['✨','Mysterious','Reality is but a consensus. Dream differently.',0],
        ['✨','Mysterious','Something ancient recognizes something ancient in you.',0],
        ['✨','Mysterious','The question matters more than the answer you assume is right.',0],
        ['✨','Mysterious','There are forces with no name — and they are on your side.',0],
        ['✨','Mysterious','You are exactly where you need to be, even if you can\'t see why.',0],
        ['✨','Mysterious','The universe is 13.8 billion years old. Today was made for you.',0],
        ['✨','Mysterious','You have met this person before. You do not remember where.',0],
        // 😄 Funny
        ['😄','Funny','Delete your browser history. Just in case.',0],
        ['😄','Funny','Your future self is judging your choices. Still rooting for you though.',0],
        ['😄','Funny','Technically, everything you have ever eaten is a risk you survived.',0],
        ['😄','Funny','Someone will ask if you\'re okay today. You will say \'fine.\'',0],
        ['😄','Funny','The snack you\'re thinking about — eat it. Life is short.',0],
        ['😄','Funny','You are one nap away from being a completely different person.',0],
        ['😄','Funny','A spreadsheet won\'t solve your problems but it will make you feel better.',0],
        ['😄','Funny','Your plants are judging you, but they still love you.',0],
        ['😄','Funny','Your Wi-Fi speed is inversely proportional to meeting urgency.',0],
        ['😄','Funny','Somewhere, someone is using Comic Sans unironically. Send help.',0],
        // 🎮 Gamer
        ['🎮','Gamer','It\'s dangerous to go alone. Take this fortune.',0],
        ['🎮','Gamer','You have been playing on hard mode your whole life. You didn\'t notice.',0],
        ['🎮','Gamer','The tutorial was lying. Real life has no instructions.',0],
        ['🎮','Gamer','Achievement unlocked: You opened a fortune cookie.',0],
        ['🎮','Gamer','Save often. Checkpoints in real life are rare.',0],
        ['🎮','Gamer','The final boss was inside you all along. You are defeating it.',0],
        ['🎮','Gamer','You are the main character. Act accordingly.',0],
        ['🎮','Gamer','Press F to pay respects — or just send the message you\'ve been drafting.',0],
        ['🎮','Gamer','New quest available: Be kind to someone today.',0],
        ['🎮','Gamer','Your inventory is full. Time to drop some old baggage.',0],
        // 🎲 Whimsical
        ['🎲','Whimsical','A duck somewhere has already thought of this exact same thing.',0],
        ['🎲','Whimsical','The last crumble in the cookie jar is always the sweetest.',0],
        ['🎲','Whimsical','You have been mispronouncing something forever. It doesn\'t matter.',0],
        ['🎲','Whimsical','The left sock is always the one that disappears. Science has no answer.',0],
        ['🎲','Whimsical','Somewhere a pigeon is judging your outfit. The pigeon is wrong.',0],
        ['🎲','Whimsical','You will find a pen that works today. Treasure it.',0],
        ['🎲','Whimsical','The elevator will arrive immediately today. You have earned this.',0],
        ['🎲','Whimsical','A snail is completing its journey right now, unbothered.',0],
        ['🎲','Whimsical','Your future self will find this moment hilarious.',0],
        ['🎲','Whimsical','An unexpected umbrella will appear exactly when you need it.',0],
        // 🌈 Rare
        ['🌈','Rare Fortune','You carry the memories of someone who loved you before you were born.',1],
        ['🌈','Rare Fortune','This fortune was written for this exact moment in your life.',1],
        ['🌈','Rare Fortune','You will create something that outlasts you. You have already begun.',1],
        ['🌈','Rare Fortune','The rarest element in the universe is a kind heart that stays kind. You have one.',1],
        ['🌈','Rare Fortune','In a simulation of infinite possibilities, you exist. The odds were impossible.',1],
        ['🌈','Rare Fortune','You have changed someone\'s life without knowing it. They remember you.',1],
        ['🌈','Rare Fortune','The world is slightly better because you are in it today.',1],
        ['🌈','Rare Fortune','Fewer than 1 in 20 receive this fortune. May it serve you well.',1],
        // 👑 Ultra-Rare
        ['👑','Ultra Rare','🌟 You found the hidden fortune. Legend says whoever reads this will have an extraordinary day. Today is that day. Go.',2],
        ['👑','Ultra Rare','👑 Fortune #001 — kept hidden for years, found only by those who look. You looked. The universe noticed.',2],
        ['👑','Ultra Rare','✨ The cookie did not choose you by accident. This fortune has been waiting specifically for you.',2],
        ['👑','Ultra Rare','🎴 Less than 0.1% of fortune readers ever see this. You are statistically improbable. Embrace it.',2],
        ['👑','Ultra Rare','🔮 In ancient times, one fortune was kept sacred, never spoken aloud. This is that fortune: you are going to be okay.',2],
        ['👑','Ultra Rare','💎 The first person to crack a fortune cookie found nothing inside. They made their own fortune instead. Like you will today.',2],
      ];

      // ── DOM ───────────────────────────────────────────────────
      const overlay = document.createElement('div');
      overlay.id = 'dilxhan-fort-overlay';
      overlay.innerHTML = `
        <div id="dilxhan-fort-modal">
          <button id="dilxhan-fort-close">✕</button>

          <div class="fc-title-area">
            <div class="fc-divider"></div>
            <div class="fc-seals">
              <span class="fc-seal"></span>
              <div>
                <div class="fc-jp">お み く じ</div>
                <div class="fc-main-title">FORTUNE COOKIE</div>
              </div>
              <span class="fc-seal"></span>
            </div>
            <div class="fc-divider"></div>
          </div>

          <p id="fc-prompt">Choose your fortune</p>
          <div id="fc-cookies"></div>
          <div id="fc-scroll" hidden></div>
          <div id="fc-actions" hidden>
            <button class="fc-action-btn" id="fc-another">🥠 &nbsp;Crack Another Cookie</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // ── Helpers ───────────────────────────────────────────────
      const $ = id => document.getElementById(id);

      function getSeenFortunes() {
        try { return new Set(JSON.parse(localStorage.getItem('dilxhan-fort-seen') || '[]')); }
        catch(e) { return new Set(); }
      }

      function markFortuneSeen(idx) {
        const seen = getSeenFortunes();
        seen.add(idx);
        // Reset oldest half once 70% of fortunes are seen
        if (seen.size > Math.floor(F.length * 0.7)) {
          const arr = [...seen];
          arr.slice(0, Math.floor(arr.length / 2)).forEach(i => seen.delete(i));
        }
        try { localStorage.setItem('dilxhan-fort-seen', JSON.stringify([...seen])); }
        catch(e) {}
      }

      function pickFortunes(count) {
        const seen = getSeenFortunes();
        const weights = F.map((f, i) => {
          if (seen.has(i)) return 0;
          return f[3] === 2 ? 1 : f[3] === 1 ? 4 : 10;
        });

        const chosen = [];
        const used   = new Set();

        for (let pick = 0; pick < count; pick++) {
          const total = weights.reduce((a, b) => a + b, 0);
          if (total === 0) break;
          let r = Math.random() * total;
          for (let i = 0; i < F.length; i++) {
            if (used.has(i)) continue;
            r -= weights[i];
            if (r <= 0) {
              chosen.push(i);
              used.add(i);
              weights[i] = 0;
              break;
            }
          }
        }
        // Pad with any unseen fortune if not enough
        while (chosen.length < count) {
          const fallback = F.findIndex((_, i) => !chosen.includes(i));
          if (fallback === -1) break;
          chosen.push(fallback);
        }
        return chosen;
      }

      // ── Cookie SVG ────────────────────────────────────────────
      function cookieSVG(id) {
        return `<svg class="fc-svg" viewBox="0 0 100 76" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="fcg${id}" cx="38%" cy="30%">
              <stop offset="0%" stop-color="#F6C86A"/>
              <stop offset="55%" stop-color="#D4912A"/>
              <stop offset="100%" stop-color="#9A6010"/>
            </radialGradient>
            <filter id="fcs${id}" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.35"/>
            </filter>
          </defs>
          <path d="M50,6 Q78,6 90,32 Q82,38 65,38 L35,38 Q18,38 10,32 Q22,6 50,6 Z"
                fill="url(#fcg${id})" filter="url(#fcs${id})"/>
          <path d="M10,32 Q18,38 35,38 L65,38 Q82,38 90,32 Q88,60 65,68 Q50,72 35,68 Q12,60 10,32 Z"
                fill="url(#fcg${id})" opacity="0.88" filter="url(#fcs${id})"/>
          <ellipse cx="50" cy="38" rx="38" ry="4" fill="rgba(55,28,0,0.42)"/>
          <ellipse cx="44" cy="20" rx="22" ry="9" fill="rgba(255,255,255,0.2)"
                  transform="rotate(-8 44 20)"/>
        </svg>`;
      }

      // ── State ─────────────────────────────────────────────────
      let active     = false;
      let currentPicks = [];
      const NUMS     = ['一','二','三'];

      // ── Render cookies ────────────────────────────────────────
      function renderCookies() {
        active       = false;
        currentPicks = pickFortunes(3);
        const container = $('fc-cookies');
        container.innerHTML = '';

        currentPicks.forEach((fortuneIdx, i) => {
          const btn = document.createElement('button');
          btn.className = 'fc-cookie-btn';
          btn.dataset.pick = i;
          btn.innerHTML = `
            <div class="fc-cookie-wrap" id="fcw${i}">
              <div class="fc-whole">${cookieSVG(i)}</div>
            </div>
            <span class="fc-cookie-num">${NUMS[i]}</span>
          `;
          btn.addEventListener('click', () => onCookiePick(btn, i, fortuneIdx));
          container.appendChild(btn);
        });

        $('fc-scroll').hidden  = true;
        $('fc-actions').hidden = true;
        $('fc-prompt').hidden  = false;
      }

      // ── Cookie pick ───────────────────────────────────────────
      function onCookiePick(btn, pickIdx, fortuneIdx) {
        if (active) return;
        active = true;

        $('fc-prompt').hidden = true;

        // Fade out other two cookies
        document.querySelectorAll('.fc-cookie-btn').forEach((b, i) => {
          if (i !== pickIdx) {
            b.classList.add('fc-used');
          }
        });

        btn.classList.add('fc-selected');
        crackCookie(btn, pickIdx, fortuneIdx);
      }

      function crackCookie(btn, pickIdx, fortuneIdx) {
        const wrap    = btn.querySelector('.fc-cookie-wrap');
        const svgHTML = btn.querySelector('.fc-whole').innerHTML;

        // Replace whole with two halves for split animation
        wrap.innerHTML = `
          <div class="fc-half fc-half-t">${svgHTML}</div>
          <div class="fc-half fc-half-b">${svgHTML}</div>
        `;
        wrap.classList.add('fc-cracking');

        // Reveal scroll after crack animation completes
        setTimeout(() => revealFortune(fortuneIdx), 750);
      }

      // ── Reveal fortune ────────────────────────────────────────
      function revealFortune(fortuneIdx) {
        markFortuneSeen(fortuneIdx);
        const [icon, category, text, rarity] = F[fortuneIdx];

        const rarityLabel = rarity === 2
          ? '✦ Ultra Rare Fortune ✦'
          : rarity === 1
          ? '✦ Rare Fortune ✦'
          : '';

        const rarityClass = rarity === 2 ? 'ultra' : rarity === 1 ? 'rare' : '';

        const scrollEl = $('fc-scroll');
        scrollEl.innerHTML = `
          <span class="fc-scroll-curl"></span>
          <div class="fc-category-badge">${icon} &nbsp;${category}</div>
          <p class="fc-fortune-text">${text}</p>
          ${rarityLabel ? `<p class="fc-rarity-badge ${rarityClass}">${rarityLabel}</p>` : ''}
          <span class="fc-scroll-curl bot"></span>
        `;
        scrollEl.hidden = false;

        // Ultra-rare sparkles
        if (rarity === 2) {
          const positions = [
            {top:'-10px',left:'10px',delay:'0s'},
            {top:'-10px',right:'10px',delay:'0.4s'},
            {bottom:'10px',left:'15px',delay:'0.8s'},
            {bottom:'10px',right:'15px',delay:'1.1s'},
            {top:'40%',left:'-12px',delay:'0.2s'},
            {top:'40%',right:'-12px',delay:'0.6s'},
          ];
          positions.forEach(pos => {
            const sp = document.createElement('span');
            sp.className = 'fc-sparkle';
            sp.textContent = '✦';
            Object.assign(sp.style, pos);
            scrollEl.appendChild(sp);
          });
        }

        $('fc-actions').hidden = false;
      }

      // ── Another cookie ────────────────────────────────────────
      $('fc-another').addEventListener('click', renderCookies);

      // ── Cleanup ───────────────────────────────────────────────
      function cleanup() {
        overlay.remove();
        done();
      }
      $('dilxhan-fort-close').addEventListener('click', cleanup);
      overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(); });

      // ── Init ──────────────────────────────────────────────────
      renderCookies();
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
