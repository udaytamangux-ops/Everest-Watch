/* ============================================================
   EVEREST — interactions
   ============================================================ */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- PRELOADER ---------- */
  const loader = document.getElementById('loader');
  const fill = document.getElementById('loaderFill');
  const pct = document.getElementById('loaderPct');
  let p = 0;
  const tick = setInterval(() => {
    p += Math.random() * 16 + 4;
    if (p >= 100) { p = 100; clearInterval(tick); }
    if (fill) fill.style.width = p + '%';
    if (pct) pct.textContent = String(Math.floor(p)).padStart(2, '0');
    if (p === 100) setTimeout(() => loader && loader.classList.add('done'), 450);
  }, 130);

  /* ---------- SMOOTH SCROLL (Lenis, graceful fallback) ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    window.lenis = lenis; // exposed for debugging / testing
  } else {
    document.documentElement.style.scrollBehavior = 'smooth';
  }

  /* ---------- GSAP + ScrollTrigger <-> Lenis ---------- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) lenis.on('scroll', ScrollTrigger.update);
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- ANCHOR SCROLLING ---------- */
  document.querySelectorAll('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || !id.startsWith('#')) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
      else el.scrollIntoView({ behavior: 'smooth' });
      setMenu(false);
    });
  });

  /* ---------- NAV SHRINK + PROGRESS ---------- */
  const nav = document.getElementById('nav');
  const scrollFill = document.getElementById('scrollFill');
  function onScroll(y) {
    const top = y !== undefined ? y : window.scrollY;
    if (nav) nav.classList.toggle('shrink', top > 60);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollFill) scrollFill.style.width = (h > 0 ? (top / h) * 100 : 0) + '%';
  }
  if (lenis) lenis.on('scroll', (e) => onScroll(e.scroll));
  else window.addEventListener('scroll', () => onScroll(), { passive: true });
  onScroll(0);

  /* ---------- REVEAL ON ENTER ---------- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-up');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el, i) => {
      // gentle stagger within shared parents
      el.style.transitionDelay = ((i % 6) * 0.06) + 's';
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- MANIFESTO: VariableProximity text ----------
     Ported from the VariableProximity React Bits component to vanilla JS.
     Each line is split into letters; each letter's font-variation-settings
     weight and optical-size settings interpolate toward the stronger state as the cursor
     nears it, with a linear falloff inside `radius`. Runs only while the
     section is in view, on hover-capable, non-reduced-motion devices.       */
  (function variableProximity() {
    const container = document.getElementById('manifestoLines');
    if (!container) return;
    const lines = Array.from(container.querySelectorAll('[data-proximity]'));
    if (!lines.length) return;

    const FROM = { wght: 400, opsz: 14 };
    const TO = { wght: 850, opsz: 32 };
    const radius = 130;
    const letters = [];

    // split each line into per-letter .vp-char spans (words kept unbroken)
    lines.forEach((line) => {
      const text = line.textContent.trim();
      line.textContent = '';
      text.split(' ').forEach((word, wi, arr) => {
        const w = document.createElement('span');
        w.style.display = 'inline-block';
        w.style.whiteSpace = 'nowrap';
        for (const ch of word) {
          const s = document.createElement('span');
          s.className = 'vp-char';
          s.textContent = ch;
          w.appendChild(s);
          letters.push(s);
        }
        line.appendChild(w);
        if (wi < arr.length - 1) line.appendChild(document.createTextNode(' '));
      });
    });

    const hoverable = window.matchMedia('(hover:hover)').matches;
    if (reduced || !hoverable) return; // leave text at its base weight

    const section = document.getElementById('manifesto');
    const mouse = { x: -9999, y: -9999 };
    let active = false;
    window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

    if ('IntersectionObserver' in window && section) {
      new IntersectionObserver((ents) => { ents.forEach((en) => { active = en.isIntersecting; }); },
        { threshold: 0 }).observe(section);
    } else { active = true; }

    const last = { x: null, y: null };
    function frame() {
      requestAnimationFrame(frame);
      if (!active) return;
      if (mouse.x === last.x && mouse.y === last.y) return;
      last.x = mouse.x; last.y = mouse.y;
      for (let i = 0; i < letters.length; i++) {
        const el = letters[i];
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const d = Math.hypot(mouse.x - cx, mouse.y - cy);
        const f = d < radius ? 1 - d / radius : 0; // linear falloff
        const wght = Math.round(FROM.wght + (TO.wght - FROM.wght) * f);
        const opsz = (FROM.opsz + (TO.opsz - FROM.opsz) * f).toFixed(1);
        el.style.fontWeight = String(wght);
        el.style.fontVariationSettings = "'wght' " + wght + ", 'opsz' " + opsz;
      }
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- COLLECTION: scroll-driven rotating carousel ----------
     Adapted from the TOONHUB figurine carousel, but rotation is driven by
     scroll progress, not buttons. Each watch orbits a circular path; the
     front watch is large/sharp, the sides shrink/blur/fade. The per-watch
     callout lives inside the item, so the title + CTA travel with the watch.
     A small lerp on the displayed phase keeps the motion buttery.          */
  (function carousel() {
    const section = document.getElementById('collection');
    const stage = document.getElementById('cwStage');
    if (!section || !stage) return;
    const items = Array.from(stage.querySelectorAll('.cw-item'));
    const hint = document.getElementById('cwHint');
    const N = items.length;
    if (!N) return;

    const callouts = Array.from(document.querySelectorAll('#cwCallouts .cw-call'));
    const sticky = section.querySelector('.cw__sticky');
    const lineEl = document.getElementById('cwLeaderLine');
    const endEl = document.getElementById('cwLeaderEnd');
    const twoZone = window.matchMedia('(min-width:901px)');
    const hotspots = items.map((it) => {
      const v = (it.getAttribute('data-hotspot') || '0.5,0.45').split(',');
      return [parseFloat(v[0]) || 0.5, parseFloat(v[1]) || 0.45];
    });

    /* No runtime background removal needed: the client's product photography is
       already shot on a near-black backdrop that vignettes to black at the edges,
       so each watch melts into the black stage on its own. (A brightness key
       would erase this dark watch, since the body is dark-on-dark.) */

    // reduced motion -> static text list + watch row (CSS .cw--static handles layout)
    if (reduced) {
      section.classList.add('cw--static');
      callouts.forEach((c) => { const cta = c.querySelector('.cw-call__cta'); if (cta) cta.tabIndex = 0; });
      return;
    }

    /* The active callout is structurally separate from the orbiting watch and
       lives in the protected text zone; it crossfades to match the front watch.
       The leader line's start is pinned to the active callout's divider, its end
       aims at the front watch's hotspot (recomputed every frame as it moves). */
    let activeIdx = -1;
    function setActive(i) {
      if (i === activeIdx) return;
      activeIdx = i;
      callouts.forEach((c, k) => {
        const on = k === i;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-hidden', on ? 'false' : 'true');
        const cta = c.querySelector('.cw-call__cta');
        if (cta) cta.tabIndex = on ? 0 : -1;
      });
    }

    // hotspot in viewport coords, accounting for object-fit:contain letterbox
    function hotspotScreen(item, hs) {
      const r = item.getBoundingClientRect();
      const img = item.querySelector('img');
      const natAR = (img && img.naturalWidth) ? img.naturalWidth / img.naturalHeight : r.width / r.height;
      const boxAR = r.width / r.height;
      let iw, ih;
      if (natAR > boxAR) { iw = r.width; ih = r.width / natAR; }
      else { ih = r.height; iw = r.height * natAR; }
      const ox = (r.width - iw) / 2, oy = (r.height - ih) / 2;
      return { x: r.left + ox + hs[0] * iw, y: r.top + oy + hs[1] * ih };
    }

    function updateLeader(bestI, frontF) {
      if (!lineEl || !endEl) return;
      if (!twoZone.matches) { lineEl.style.opacity = '0'; endEl.style.opacity = '0'; return; }
      const sRect = sticky.getBoundingClientRect();
      const active = callouts[bestI];
      const div = active && active.querySelector('.cw-call__line');
      if (!div) return;
      const dRect = div.getBoundingClientRect();
      const x1 = dRect.right - sRect.left;
      const y1 = dRect.top + dRect.height / 2 - sRect.top;
      const p = hotspotScreen(items[bestI], hotspots[bestI]);
      const x2 = p.x - sRect.left;
      const y2 = p.y - sRect.top;
      lineEl.setAttribute('x1', x1.toFixed(1)); lineEl.setAttribute('y1', y1.toFixed(1));
      lineEl.setAttribute('x2', x2.toFixed(1)); lineEl.setAttribute('y2', y2.toFixed(1));
      endEl.setAttribute('cx', x2.toFixed(1)); endEl.setAttribute('cy', y2.toFixed(1));
      const o = Math.max(0, Math.min(1, (frontF - 0.6) / 0.32)); // fade in as front settles
      lineEl.style.opacity = (o * 0.5).toFixed(3);
      endEl.style.opacity = (o * 0.9).toFixed(3);
    }

    let phase = 0, target = 0, running = false;

    function render() {
      const stageW = stage.clientWidth || window.innerWidth;
      const spread = Math.min(stageW * 0.26, 340);
      const bias = stageW * 0.06; // nudge the orbit right, away from the text zone
      let best = -2, bestI = 0;
      for (let i = 0; i < N; i++) {
        let rel = ((i - phase) % N + N) % N; // 0..N
        if (rel > N / 2) rel -= N;           // -N/2..N/2
        const ang = (rel / N) * Math.PI * 2; // front = 0
        const front = Math.cos(ang);         // 1 front .. -0.5 sides
        const f = (front + 0.5) / 1.5;       // 0 .. 1 frontness
        const x = bias + Math.sin(ang) * spread;
        const scale = 0.62 + f * 0.46;
        const op = 0.26 + f * 0.74;
        const blur = (1 - f) * 5;
        const item = items[i];
        item.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(1) + 'px,0,0) scale(' + scale.toFixed(3) + ')';
        item.style.opacity = op.toFixed(3);
        item.style.filter = blur > 0.05 ? 'blur(' + blur.toFixed(1) + 'px)' : 'none';
        item.style.zIndex = String(Math.round(f * 100) + 1);
        if (f > best) { best = f; bestI = i; }
      }
      items.forEach((it, i) => it.setAttribute('aria-hidden', i === bestI ? 'false' : 'true'));
      setActive(bestI);
      updateLeader(bestI, best);
    }

    function progress() {
      const total = section.offsetHeight - window.innerHeight;
      const p = total > 0 ? (-section.getBoundingClientRect().top) / total : 0;
      return Math.max(0, Math.min(1, p));
    }

    function loop() {
      target = progress() * (N - 1); // 0 -> first front, 1 -> last front
      phase += (target - phase) * 0.12;
      if (Math.abs(target - phase) < 0.0005) phase = target;
      render();
      if (running) requestAnimationFrame(loop);
    }
    function start() { if (!running) { running = true; requestAnimationFrame(loop); } }
    function stop() { running = false; }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((ents) => { ents.forEach((en) => (en.isIntersecting ? start() : stop())); },
        { rootMargin: '200px 0px' }).observe(section);
    } else { start(); }

    phase = target = progress() * (N - 1);
    render();
    window.addEventListener('resize', render);

    function hintFade() { if (hint) hint.style.opacity = progress() > 0.03 ? '0' : '1'; }
    if (lenis) lenis.on('scroll', hintFade); else window.addEventListener('scroll', hintFade, { passive: true });
    hintFade();
  })();

  /* ---------- STAT COUNTERS ---------- */
  const stats = document.querySelectorAll('[data-count]');
  if (stats.length && 'IntersectionObserver' in window) {
    const sio = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseInt(el.getAttribute('data-count'), 10);
        const dur = 1600; const start = performance.now();
        function step(now) {
          const t = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.floor(eased * target).toLocaleString('en-US');
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        sio.unobserve(el);
      });
    }, { threshold: 0.6 });
    stats.forEach((s) => sio.observe(s));
  }

  /* ---------- PARALLAX ---------- */
  const parEls = Array.from(document.querySelectorAll('[data-parallax]'));
  function parallax(y) {
    const top = y !== undefined ? y : window.scrollY;
    const vh = window.innerHeight;
    parEls.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = (center - vh / 2) / vh; // -1..1 ish
      const speed = parseFloat(el.getAttribute('data-parallax')) || 0.1;
      el.style.setProperty('--py', (-dist * speed * 100).toFixed(2) + 'px');
    });
  }
  if (!reduced) {
    if (lenis) lenis.on('scroll', (e) => parallax(e.scroll));
    else window.addEventListener('scroll', () => parallax(), { passive: true });
    window.addEventListener('resize', () => parallax());
    parallax(0);
  }

  /* ---------- SHOWCASE: scroll-driven 360° image sequence ---------- */
  (function showcase() {
    const section = document.getElementById('showcase');
    const canvas = document.getElementById('seqCanvas');
    if (!section || !canvas) return;
    const ctx = canvas.getContext('2d');
    const FRAMES = 120;
    const pad = (n) => String(n).padStart(3, '0');
    const caps = Array.from(section.querySelectorAll('.showcase__cap'));
    const bar = document.getElementById('seqBar');
    const hint = document.getElementById('showHint');
    const centerCap = section.querySelector('.cap--center');
    const ghost = section.querySelector('.showcase__ghost');
    const movementStart = 0.51;
    const summitStart = 0.78;
    const summitCentered = 0.94;
    const smoothstep = (edge0, edge1, value) => {
      const t = Math.max(0, Math.min(1, (value - edge0) / Math.max(edge1 - edge0, 0.0001)));
      return t * t * (3 - 2 * t);
    };

    // preload
    const imgs = new Array(FRAMES);
    let loaded = 0, ready = false;
    for (let i = 0; i < FRAMES; i++) {
      const im = new Image();
      im.onload = () => { loaded++; if (loaded === 1) draw(curFrame); if (loaded >= FRAMES) ready = true; };
      im.onerror = () => { loaded++; if (loaded >= FRAMES) ready = true; };
      im.src = 'assets/seq/f_' + pad(i + 1) + '.jpg?v=2026062201';
      imgs[i] = im;
    }

    let curFrame = 0;
    function drawCover(img) {
      if (!img || !img.complete || !img.naturalWidth) return;
      const cw = canvas.width, ch = canvas.height;
      const ir = img.naturalWidth / img.naturalHeight, cr = cw / ch;
      let w, h;
      if (cr > ir) { w = cw; h = cw / ir; } else { h = ch; w = ch * ir; }
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    function draw(frame) {
      let img = imgs[frame];
      // if target frame not yet decoded, fall back to nearest loaded
      if (!img || !img.complete || !img.naturalWidth) {
        for (let d = 1; d < FRAMES; d++) {
          if (imgs[frame - d] && imgs[frame - d].complete && imgs[frame - d].naturalWidth) { img = imgs[frame - d]; break; }
          if (imgs[frame + d] && imgs[frame + d].complete && imgs[frame + d].naturalWidth) { img = imgs[frame + d]; break; }
        }
      }
      drawCover(img);
    }

    function sizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      draw(curFrame);
    }

    function update() {
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      let p = total > 0 ? (-rect.top) / total : 0;
      p = Math.max(0, Math.min(1, p));
      const frame = Math.min(FRAMES - 1, Math.round(p * (FRAMES - 1)));
      if (frame !== curFrame) { curFrame = frame; draw(frame); }

      const movementFade = smoothstep(movementStart, summitStart, p) * 0.35;
      const summitFade = smoothstep(summitStart, summitCentered, p) * 0.65;
      const imageOpacity = Math.max(0, 1 - movementFade - summitFade);
      canvas.style.opacity = imageOpacity.toFixed(3);
      if (ghost) ghost.style.opacity = (0.03 * imageOpacity).toFixed(3);

      // captions
      caps.forEach((c) => {
        const from = parseFloat(c.dataset.from), to = parseFloat(c.dataset.to);
        let o = 0, ty = 28;
        if (c === centerCap) {
          const reveal = smoothstep(from, summitCentered, p);
          const startOffset = Math.min(window.innerHeight * 0.34, 260);
          o = reveal;
          ty = (1 - reveal) * startOffset;
          c.style.setProperty('--capScale', (0.84 + reveal * 0.16).toFixed(3));
        } else if (p >= from && p <= to) {
          const span = Math.max(to - from, 0.0001);
          const local = (p - from) / span;
          const fade = 0.26;
          if (local < fade) o = local / fade;
          else if (local > 1 - fade) o = (1 - local) / fade;
          else o = 1;
          ty = (1 - o) * 28;
        }
        c.style.opacity = o.toFixed(3);
        c.style.setProperty('--capY', ty.toFixed(1) + 'px');
      });

      if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
      if (hint) hint.style.opacity = p > 0.04 ? '0' : '1';
    }

    sizeCanvas();
    update();
    if (lenis) lenis.on('scroll', update);
    else window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', () => { sizeCanvas(); update(); });
    // redraw as frames finish decoding near the start
    const warm = setInterval(() => { draw(curFrame); if (ready) clearInterval(warm); }, 200);
  })();

  /* ---------- VIDEO AUTOPLAY ROBUSTNESS ----------
     Browsers pause offscreen / blurred <video>. Re-play muted videos
     on load, on tab focus, and whenever they re-enter the viewport. */
  const vids = document.querySelectorAll('video:not([data-hover-video])');
  const tryPlay = (v) => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const playAll = () => vids.forEach(tryPlay);
  playAll();
  window.addEventListener('load', playAll);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) playAll(); });
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) tryPlay(en.target); });
    }, { threshold: 0.1 });
    vids.forEach((v) => vio.observe(v));
  }

  /* ---------- CRAFT CARDS: scroll hint + hover-to-video ----------
     When the grid enters view, the captions drop away once — a hint that the
     cards are interactive. Hovering brings the caption back up and swaps the
     still image for a looping video. */
  (function craftCards() {
    const grid = document.querySelector('.craft__grid');
    if (!grid) return;
    const cells = Array.from(grid.querySelectorAll('.craft__cell'));
    const hoverable = window.matchMedia('(hover:hover)').matches;

    if (hoverable && !reduced && 'IntersectionObserver' in window) {
      const hio = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { grid.classList.add('is-hinted'); hio.unobserve(en.target); }
        });
      }, { threshold: 0.35 });
      hio.observe(grid);
    }

    cells.forEach((cell) => {
      const vid = cell.querySelector('[data-hover-video]');
      if (!vid) return;
      cell.addEventListener('mouseenter', () => { const p = vid.play(); if (p && p.catch) p.catch(() => {}); });
      cell.addEventListener('mouseleave', () => { vid.pause(); });
    });
  })();

  /* ---------- TOP MENU ---------- */
  const burger = document.getElementById('burger');
  const navMenu = document.getElementById('site-menu');
  const navChars = [];

  if (navMenu) {
    navMenu.querySelectorAll('[data-split-nav]').forEach((link) => {
      const label = link.textContent.trim();
      link.setAttribute('aria-label', label);
      link.textContent = '';

      const parent = document.createElement('span');
      parent.className = 'split-parent';

      Array.from(label).forEach((char, index) => {
        const span = document.createElement('span');
        span.className = 'split-char';
        span.style.setProperty('--i', index);
        span.textContent = char;
        parent.appendChild(span);
        navChars.push(span);
      });

      link.appendChild(parent);
    });
  }

  function animateMenuLinks(open) {
    if (!navChars.length || reduced) return;
    if (!window.gsap) return;

    gsap.killTweensOf(navChars);
    if (open) {
      gsap.fromTo(
        navChars,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.32, ease: 'power3.out', stagger: 0.018, delay: 0.03 }
      );
    } else {
      gsap.to(navChars, { opacity: 0, y: 14, duration: 0.14, ease: 'power2.in', stagger: 0.003 });
    }
  }

  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    if (burger) {
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    }
    animateMenuLinks(open);
  }
  if (burger) burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  if (navMenu) {
    navMenu.querySelectorAll('.nav-menu__cta').forEach((cta) => {
      cta.addEventListener('click', () => setMenu(false));
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });

})();
