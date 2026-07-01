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
  //  GLITCH  — brief CSS glitch on the hero + scanlines flash
  // ════════════════════════════════════════════════════════════

  ANIMATIONS['glitch'] = {
    run({ canvas, ctx, done, randRange, randInt }) {
      const W = canvas.width, H = canvas.height;
      const hero = document.querySelector('.hero');

      // Inject a one-shot keyframe animation onto the hero element
      const styleId = 'dilxhan-glitch-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes dilxhan-glitch-clip {
            0%   { clip-path: inset(40% 0 50% 0); transform: translate(-4px, 0); }
            10%  { clip-path: inset(10% 0 80% 0); transform: translate(4px, 0); }
            20%  { clip-path: inset(70% 0 10% 0); transform: translate(-2px, 0); }
            30%  { clip-path: inset(20% 0 60% 0); transform: translate(3px, 0); }
            40%  { clip-path: inset(55% 0 25% 0); transform: translate(-3px, 0); }
            50%  { clip-path: inset(0%  0 90% 0); transform: translate(0, 0); }
            60%  { clip-path: inset(80% 0 5%  0); transform: translate(2px, 0); }
            70%  { clip-path: inset(30% 0 45% 0); transform: translate(-4px, 0); }
            80%  { clip-path: inset(5%  0 70% 0); transform: translate(4px, 0); }
            100% { clip-path: inset(0%  0 0%  0); transform: translate(0, 0); }
          }
          .dilxhan-is-glitching::before,
          .dilxhan-is-glitching::after {
            content: attr(data-text);
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .dilxhan-is-glitching::before {
            color: #0ff;
            animation: dilxhan-glitch-clip 120ms steps(1) 3;
          }
          .dilxhan-is-glitching::after {
            color: #f0f;
            animation: dilxhan-glitch-clip 90ms steps(1) 4 reverse;
          }
        `;
        document.head.appendChild(style);
      }

      // Scanline flash on canvas
      const DURATION = 1200;
      let elapsed    = 0;

      function frame(dt) {
        elapsed += dt;
        ctx.clearRect(0, 0, W, H);

        if (elapsed < 800) {
          // flickering scanlines
          for (let y = 0; y < H; y += randInt(3, 8)) {
            if (Math.random() < 0.15) {
              ctx.fillStyle   = 'rgba(0,255,255,0.04)';
              ctx.globalAlpha = 1;
              ctx.fillRect(0, y, W, randInt(1, 3));
            }
          }
          // random horizontal glitch bars
          if (Math.random() < 0.3) {
            const barY = randRange(0, H);
            const barH = randRange(2, 10);
            ctx.fillStyle   = `rgba(${randInt(0,255)},${randInt(0,255)},${randInt(0,255)},0.06)`;
            ctx.fillRect(0, barY, W, barH);
          }
        }

        ctx.globalAlpha = 1;

        if (elapsed >= DURATION) {
          if (hero) hero.classList.remove('dilxhan-is-glitching');
          done();
        } else {
          requestAnimationFrame((ts) => frame(ts - (frame._last || ts)));
          frame._last = performance.now();
        }
      }

      // Apply glitch class to hero for CSS color-split effect
      if (hero) {
        hero.classList.add('dilxhan-is-glitching');
        setTimeout(() => hero.classList.remove('dilxhan-is-glitching'), 500);
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
