/* Raj Singh's — PDP story "Film Strip" (product.html, below the Spotlight hero).
   Loaded after pdp-spotlight.js and before app.js. Scoped to [data-ps-story].
   - Film: images/product_video.mp4 plays as a muted ambient loop in view; the play button watches it with sound.
   - Chapter chips jump the process strip to a step.
   - Strip: native scroll-snap; the centred frame is tracked by an IntersectionObserver
     (thin centre band) which drives the active frame, counter, rail/dots, chips and arrows.
   - Anatomy: pins / part chips update the leather caption card (pin 1 on load).
   No scroll listeners; keydown is the only non-passive handler (needs preventDefault). */
(function () {
  const root = document.querySelector('[data-ps-story]');
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = reduce ? 'auto' : 'smooth';
  const pad = (n) => String(n).padStart(2, '0');

  /* Visible band: between the sticky header and the fixed bottom bars (app tab bar,
     sticky buy capsule). Used so jumps never land content underneath them. */
  const header = document.querySelector('.header');
  const bandTop = () => Math.max(0, header ? header.getBoundingClientRect().bottom : 0) + 12;
  const bandBottom = () => {
    let b = window.innerHeight;
    document.querySelectorAll('.tabbar, .sticky-atc.is-visible').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.height && getComputedStyle(el).position === 'fixed' && r.top < b) b = r.top;
    });
    return b - 12;
  };

  /* ---------- Film ----------
     Ambient: muted loop that loads only when the film nears the screen and pauses off-screen.
     "Watch with sound": restarts unmuted with pause/mute pills; returns to ambient at the end.
     Reduced motion: no autoplay, the poster stays until the play button is pressed. */
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('[data-ps-screen]').forEach((screen) => {
    const q = (sel) => screen.querySelector(sel);
    const video = q('[data-ps-video]');
    const play = q('[data-ps-play]');
    const ctl = q('[data-ps-vctl]');
    if (!video || !play) return;
    const toggle = q('[data-ps-toggle]');
    const mute = q('[data-ps-mute]');
    let loaded = false, watching = false, visible = false;
    const load = () => { if (!loaded) { video.src = video.dataset.src; loaded = true; } };
    const safePlay = () => { const p = video.play(); if (p && p.catch) p.catch(() => {}); };
    const sync = () => {
      screen.classList.toggle('is-playing', watching);
      if (ctl) ctl.hidden = !watching;
      if (toggle) { toggle.classList.toggle('is-paused', video.paused); toggle.setAttribute('aria-label', video.paused ? 'Play film' : 'Pause film'); }
      if (mute) { mute.classList.toggle('is-muted', video.muted); mute.setAttribute('aria-label', video.muted ? 'Unmute' : 'Mute'); }
    };
    const ambient = () => { watching = false; video.muted = true; video.loop = true; if (visible && !still) safePlay(); sync(); };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) { load(); if (!still || watching) safePlay(); }
        else video.pause();
      }, { rootMargin: '200px 0px', threshold: 0.25 }).observe(screen);
    } else { load(); }

    play.addEventListener('click', () => {
      // only one film plays with sound at a time
      $$('[data-ps-video]').forEach((v) => { if (v !== video && !v.muted) { v.muted = true; v.dispatchEvent(new Event('ps-ambient')); } });
      load();
      watching = true; video.loop = false; video.muted = false; video.currentTime = 0; safePlay(); sync();
      toggle && toggle.focus({ preventScroll: true });
    });
    toggle && toggle.addEventListener('click', () => { video.paused ? safePlay() : video.pause(); });
    mute && mute.addEventListener('click', () => { video.muted = !video.muted; sync(); });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('ps-ambient', ambient);
    video.addEventListener('ended', () => { ambient(); play.focus({ preventScroll: true }); });
    sync();
  });

  /* ---------- Process strip ---------- */
  const strip = $('[data-ps-strip]');
  if (strip) {
    const frames = $$('[data-ps-frame]');
    const chips = $$('[data-ps-go]');
    const chipRow = $('[data-ps-chips]');
    const dots = $$('[data-ps-dots] i');
    const count = $('[data-ps-count]');
    const fill = $('[data-ps-fill]');
    const prev = $('[data-ps-prev]');
    const next = $('[data-ps-next]');
    const total = frames.length;
    let active = -1;

    const setActive = (i) => {
      if (i === active || i < 0) return;
      active = i;
      frames.forEach((f, j) => f.classList.toggle('is-active', j === i));
      dots.forEach((d, j) => d.classList.toggle('on', j === i));
      chips.forEach((c, j) => c.setAttribute('aria-current', j === i ? 'true' : 'false'));
      if (count) count.innerHTML = pad(i + 1) + ' <span>/ ' + pad(total) + '</span>';
      if (fill) fill.style.transform = 'scaleX(' + (i + 1) / total + ')';
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === total - 1;
      // Keep the current chip in view when the chip row scrolls (mobile)
      if (chipRow && chipRow.scrollWidth > chipRow.clientWidth + 1) {
        const li = chips[i].parentNode;
        chipRow.scrollTo({ left: li.offsetLeft - (chipRow.clientWidth - li.offsetWidth) / 2, behavior });
      }
    };
    // Desktop (≥1000px): frames start at the page's left edge and several are visible at once.
    // Mobile: one centred frame per view, tracked by a thin centre band.
    const wide = window.matchMedia('(min-width: 1000px)');
    const padL = () => parseFloat(getComputedStyle(strip).paddingLeft) || 0;
    const goTo = (i) => {
      i = Math.max(0, Math.min(total - 1, i));
      const f = frames[i];
      const left = wide.matches ? f.offsetLeft - padL() : f.offsetLeft - (strip.clientWidth - f.offsetWidth) / 2;
      strip.scrollTo({ left, behavior });
    };

    // Desktop tracking: first visible frame is "active"; counter/rail show how far the strip has been seen.
    let raf = 0, geo = null;
    const measure = () => {
      const step = frames.length > 1 ? frames[1].offsetLeft - frames[0].offsetLeft : frames[0].offsetWidth;
      geo = { step, pad: padL(), view: strip.clientWidth, max: strip.scrollWidth - strip.clientWidth };
    };
    const trackWide = () => {
      raf = 0;
      if (!geo) measure();
      const x = strip.scrollLeft;
      const first = Math.max(0, Math.min(total - 1, Math.round(x / geo.step)));
      const fits = Math.max(1, Math.floor((geo.view - 2 * geo.pad + 20) / geo.step));
      const atEnd = x >= geo.max - 4;
      const last = atEnd ? total - 1 : Math.min(total - 1, first + fits - 1);
      active = first;
      frames.forEach((f, j) => f.classList.toggle('is-active', j === first));
      chips.forEach((c, j) => c.setAttribute('aria-current', j === first ? 'true' : 'false'));
      if (count) count.innerHTML = pad(last + 1) + ' <span>/ ' + pad(total) + '</span>';
      if (fill) fill.style.transform = 'scaleX(' + (last + 1) / total + ')';
      if (prev) prev.disabled = x <= 4;
      if (next) next.disabled = atEnd;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(trackWide); };

    let io = null;
    const setup = () => {
      io && io.disconnect(); io = null;
      strip.removeEventListener('scroll', onScroll);
      if (wide.matches) {
        geo = null; active = -1;
        strip.addEventListener('scroll', onScroll, { passive: true });
        trackWide();
      } else {
        active = -1; setActive(0);
        if ('IntersectionObserver' in window) {
          io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) setActive(frames.indexOf(e.target)); });
          }, { root: strip, rootMargin: '0px -49% 0px -49%', threshold: 0 });
          frames.forEach((f) => io.observe(f));
        }
      }
    };
    setup();
    wide.addEventListener ? wide.addEventListener('change', setup) : wide.addListener(setup);
    window.addEventListener('resize', () => { geo = null; if (wide.matches) onScroll(); }, { passive: true });

    prev && prev.addEventListener('click', () => goTo(active - 1));
    next && next.addEventListener('click', () => goTo(active + 1));
    strip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(active + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(active - 1); }
    });
    const ctl = $('.ps-ctl');
    // Bring strip + its controls into the visible band (see bandTop/bandBottom).
    const reveal = () => {
      const top = strip.getBoundingClientRect().top;
      const bottom = (ctl || strip).getBoundingClientRect().bottom;
      const t = bandTop(), b = bandBottom();
      if (top >= t && bottom <= b) return;
      const room = b - t, h = bottom - top;
      const delta = h <= room ? top - (t + (room - h) / 2) : top - t;
      window.scrollBy({ top: delta, behavior });
    };
    chips.forEach((c) => c.addEventListener('click', () => {
      reveal();
      goTo(+c.dataset.psGo);
    }));
  }

  /* ---------- Anatomy ---------- */
  const glass = $('[data-ps-glass]');
  if (glass) {
    const PARTS = [
      ['Upper', 'Single-piece full-grain upper', 'Cut from one seamless piece of full-grain leather: no toe cap and no side seams to break the line. Lined in leather inside.'],
      ['Fit', 'Elastic side gusset', 'Elastic panels set into each side let the boot slip on and off easily, then hold snug at the ankle.'],
      ['Collar', 'Rear collar', 'Shaped to sit cleanly against the back of the ankle, with a pull tab to help ease the boot on.'],
      ['Sole', 'Blake-stitched leather sole', 'A handmade leather sole stitched straight through to the insole, with anti-skid rubber for grip. Flexible, and made to be resoled.'],
      ['Heel', 'Stacked heel', 'Built up in layers for a firm, even stride and a heel that can be renewed when it wears.'],
    ];
    const gk = $('[data-ps-g-k]'), gn = $('[data-ps-g-n]'), gt = $('[data-ps-g-t]'), gd = $('[data-ps-g-d]');
    const btns = $$('[data-ps-part]');
    let cur = -1, timer;
    const fillGlass = (i) => {
      const p = PARTS[i];
      gk.textContent = p[0];
      gn.textContent = pad(i + 1) + ' / ' + pad(PARTS.length);
      gt.textContent = p[1];
      gd.textContent = p[2];
    };
    const setPart = (i, instant) => {
      if (i === cur) return;
      cur = i;
      btns.forEach((b) => b.setAttribute('aria-pressed', +b.dataset.psPart === i ? 'true' : 'false'));
      clearTimeout(timer);
      if (instant || reduce) { fillGlass(i); return; }
      glass.classList.add('is-swap');
      timer = setTimeout(() => { fillGlass(i); glass.classList.remove('is-swap'); }, 180);
    };
    // After a tap, make sure the caption card is on screen (on phones it sits below the photo)
    const showGlass = () => {
      const r = glass.getBoundingClientRect(), b = bandBottom();
      if (r.bottom > b) window.scrollBy({ top: Math.min(r.bottom - b, r.top - bandTop()), behavior });
    };
    btns.forEach((b) => b.addEventListener('click', () => { setPart(+b.dataset.psPart); showGlass(); }));
    setPart(0, true);
  }
})();
