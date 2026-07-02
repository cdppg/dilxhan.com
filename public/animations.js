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
  //  SEQUENCE:
  //    0–600ms       Dark background fades in
  //    400–1200ms    Dashed sine path reveals
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
    const ORIGIN_X = W * 0.10;
    const DEST_X = W * 0.90;
    const MID_Y = H * 0.50;
    const AMPLITUDE = H * 0.18;
    const FREQ = 3.5;
    const FLIGHT_DUR = 10000;
    const PIN_SIZE = Math.min(W, H) * 0.048;
    const FOOD_SIZE = Math.max(18, Math.min(W, H) * 0.052);
    const PLANE_SIZE = Math.max(20, Math.min(W, H) * 0.058);

    const originPx = [ORIGIN_X, MID_Y];
    const destPx = [DEST_X, MID_Y];

    // ── Helper Functions ─────────────────────────────────────
    function sinePt(t) {
      return [lerp(ORIGIN_X, DEST_X, t), MID_Y + AMPLITUDE * Math.sin(t * FREQ * Math.PI * 2)];
    }

    function sineTangent(t) {
      const dx = DEST_X - ORIGIN_X;
      const dy = AMPLITUDE * FREQ * Math.PI * 2 * Math.cos(t * FREQ * Math.PI * 2);
      return Math.atan2(dy, dx);
    }

    function prog(now, start, dur) {
      return Math.min(1, Math.max(0, (now - start) / dur));
    }

    // ── Timing ───────────────────────────────────────────────
    const T = {
      bgFadeIn: { start: 0, dur: 600 },
      pathReveal: { start: 400, dur: 900 },
      pinDrop: { start: 500, dur: 600 },
      ripple: 1000,
      planeStart: 2400,
      fadeOut: { start: 2400 + FLIGHT_DUR + 1200, dur: 900 },
      total: 2400 + FLIGHT_DUR + 2300,
    };

    // ── Setup State ──────────────────────────────────────────
    const FOOD_DEFS = [
      { emoji: '🍰', t: 0.25 / FREQ }, { emoji: '🍕', t: 0.75 / FREQ },
      { emoji: '🌭', t: 1.25 / FREQ }, { emoji: '🍝', t: 1.75 / FREQ },
      { emoji: '🍗', t: 2.25 / FREQ }, { emoji: '🥖', t: 2.75 / FREQ },
      { emoji: '🍫', t: 3.25 / FREQ },
    ];

    const foods = FOOD_DEFS.map(f => ({
      ...f, collected: false, pulseAge: 0, collectScale: 1, collectAlpha: 1
    }));

    const smoke = [];
    const confetti = [];
    const ripples = [];
    let ripplesSpawned = false, confettiSpawned = false, confettiDone = false;

    // ── Drawing Helpers ──────────────────────────────────────
    function drawFood(food, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(food.x, food.y);
      ctx.scale(food.collectScale, food.collectScale);
      ctx.font = `${FOOD_SIZE}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(food.emoji, 0, 0);
      ctx.restore();
    }

    // ── Main Frame Loop ──────────────────────────────────────
    let startTime = null, lastTs = null;

    function frame(ts) {
      if (!startTime) startTime = ts;
      const now = ts - startTime;
      const dt = lastTs ? Math.min(ts - lastTs, 50) : 16;
      lastTs = ts;

      ctx.clearRect(0, 0, W, H);

      const bgInP = easeOut(prog(now, T.bgFadeIn.start, T.bgFadeIn.dur));
      const bgOutP = easeIn(prog(now, T.fadeOut.start, T.fadeOut.dur));
      const globalA = bgInP * (1 - bgOutP);

      // Background, Pins, Path, Ripples ... (Add your drawing code here)

      // FOOD LOOP
      if (now >= T.planeStart) {
        for (const food of foods) {
          const flightP = Math.min(1, (now - T.planeStart) / FLIGHT_DUR);
          
          if (flightP >= food.t && !food.collected) {
            food.collected = true;
            food.pulseAge = 0;
          }

          if (!food.collected) {
            const near = food.t - flightP;
            food.collectScale = (near > 0 && near < 0.07) ? 1 + 0.14 * Math.abs(Math.sin(now * 0.022)) : 1;
            drawFood(food, globalA);
          } else {
            food.pulseAge += dt;
            food.collectScale = 1 + easeOut(Math.min(1, food.pulseAge / 200)) * 0.75;
            food.collectAlpha = Math.max(0, 1 - food.pulseAge / 380);
            if (food.collectAlpha > 0) drawFood(food, globalA * food.collectAlpha);
          }
        }
      } else {
        for (const food of foods) drawFood(food, globalA);
      }

      // Finish logic
      if (now >= T.total && (confettiDone || confetti.length === 0)) {
        done();
      } else {
        requestAnimationFrame(frame);
      }
    }
    requestAnimationFrame(frame);
  }
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
