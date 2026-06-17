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

  /* ---------- MANIFESTO: ScrollFloat per-character (sticky-scrubbed)
     Ported from the ScrollFloat React Bits component to vanilla GSAP.
     Each .mline is split into .char spans; chars animate from
     yPercent:120 / scaleY:2.3 / scaleX:0.7 → normal with back.inOut(2)
     and stagger:0.03, scrubbed by the section's scroll progress.       ---------- */
  (function scrollFloat() {
    const section = document.getElementById('manifesto');
    const linesEl = document.getElementById('manifestoLines');
    if (!section || !linesEl) return;
    const lines = Array.from(linesEl.querySelectorAll('.mline'));
    const metric = linesEl.querySelector('.manifesto__metric');

    // split each line into individual .char spans (spaces → &nbsp;)
    lines.forEach((line) => {
      const text = line.textContent;
      line.textContent = '';
      text.split(' ').forEach((word, wi, arr) => {
        const w = document.createElement('span');
        w.className = 'mword';
        for (const ch of word) {
          const c = document.createElement('span');
          c.className = 'char';
          c.textContent = ch;
          w.appendChild(c);
        }
        line.appendChild(w);
        if (wi < arr.length - 1) line.appendChild(document.createTextNode(' '));
      });
    });

    if (!window.gsap) return;

    let tl = null;
    function build() {
      if (tl) tl.kill();

      // ScrollFloat start state
      gsap.set(linesEl.querySelectorAll('.char'), {
        willChange: 'opacity, transform',
        opacity: 0,
        yPercent: 120,
        scaleY: 2.3,
        scaleX: 0.7,
        transformOrigin: '50% 0%'
      });
      if (metric) gsap.set(metric, { opacity: 0, y: 18 });

      // vertical centering: keep active line at viewport mid-point
      const y = lines.map((l) => -(l.offsetTop + l.offsetHeight / 2));
      gsap.set(linesEl, { y: y[0] });

      tl = gsap.timeline({ paused: true });
      const step = 0.68;
      lines.forEach((line, i) => {
        const at = i * step;
        tl.to(line.querySelectorAll('.char'), {
          opacity: 1,
          yPercent: 0,
          scaleY: 1,
          scaleX: 1,
          ease: 'back.inOut(2)',
          duration: 0.6,
          stagger: 0.03
        }, at);
        if (i > 0) tl.to(linesEl, { y: y[i], duration: 0.58, ease: 'power3.inOut' }, at);
      });
      if (metric) tl.to(metric, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' },
        Math.max(lines.length * step - 0.35, 0));

      update();
    }

    function update() {
      if (!tl) return;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      let p = total > 0 ? (-rect.top) / total : 0;
      tl.progress(Math.max(0, Math.min(1, p)));
    }

    build();
    if (lenis) lenis.on('scroll', update);
    else window.addEventListener('scroll', update, { passive: true });
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 150); });
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
      im.src = 'assets/seq/f_' + pad(i + 1) + '.jpg';
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
