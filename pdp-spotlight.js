/* Raj Singh's — PDP "Spotlight Atelier" hero behaviour.
   Loaded after main.js + pdp-cro.js and before app.js.
   Reuses: main.js (cart via [data-add], .pill sizes + scarcity, .color-swatches, .qty, drawers via [data-open]),
           pdp-cro.js (offer code copy, customise drawer summary, sticky size select sync, size-guide tabs).
   Adds:   gallery (scroll-snap track, IntersectionObserver-driven counter/dots, thumbs, arrows, keys),
           colour → gallery / cart image, accordions, sticky buy bar visibility.
   No scroll handlers, no layout reads while scrolling; listeners are passive. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = $('[data-spot]');
  if (!root) return;

  const mqMobile = window.matchMedia('(max-width: 999px)');
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pad2 = (n) => String(n).padStart(2, '0');

  /* ---------- Gallery ---------- */
  const track = $('[data-spot-track]', root);
  const slides = $$('.spot__slide', track);
  const thumbs = $$('[data-spot-thumb]', root);
  const dots = $$('[data-spot-dot]', root);
  const cur = $('[data-spot-cur]', root);
  let index = 0;

  const paint = (i) => {
    if (i === index && cur.textContent === pad2(i + 1)) return;
    index = i;
    cur.textContent = pad2(i + 1);
    thumbs.forEach((t, k) => t.setAttribute('aria-current', String(k === i)));
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
  };
  const go = (i) => {
    const n = slides.length;
    i = ((i % n) + n) % n;
    track.scrollTo({ left: i * track.clientWidth, behavior: mqReduce.matches ? 'auto' : 'smooth' });
    paint(i); // immediate feedback; the observer confirms once the slide settles
  };

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) paint(slides.indexOf(e.target)); });
    }, { root: track, threshold: 0.6 });
    slides.forEach((s) => io.observe(s));
  }

  thumbs.forEach((t, k) => {
    t.addEventListener('click', () => go(k));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const n = (k + (e.key === 'ArrowDown' ? 1 : -1) + thumbs.length) % thumbs.length;
      thumbs[n].focus();
      go(n);
    });
  });
  dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
  $$('[data-spot-dir]', root).forEach((b) => b.addEventListener('click', () => go(index + +b.dataset.spotDir)));
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
  });
  // Keep the current slide aligned when the track is resized (rotation, desktop resize)
  if ('ResizeObserver' in window) {
    let lastW = 0; // first callback just aligns slide 0; avoids a layout read at startup
    new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w && w !== lastW) { lastW = w; track.scrollTo({ left: index * w, behavior: 'auto' }); }
    }).observe(track);
  }

  /* ---------- Buy bar references ---------- */
  const sticky = $('.sticky-atc');
  const stickyImg = $('[data-spot-sticky-img]');
  const stickyMeta = $('[data-spot-sticky-meta]');
  const stickySelect = $('[data-mock-sticky-size]');
  const state = { colour: 'Black', size: '8' };
  const syncMeta = () => { if (stickyMeta) stickyMeta.textContent = `${state.colour} · UK ${state.size}`; };

  /* ---------- Colour: jump gallery, swap cart + sticky image (main.js sets is-selected + label) ---------- */
  const swatches = $$('.spot__swatch', root);
  swatches.forEach((s) => s.addEventListener('click', () => {
    swatches.forEach((x) => x.setAttribute('aria-pressed', String(x === s)));
    state.colour = s.getAttribute('aria-label');
    $$('[data-add][data-price="5499"]:not([data-ups-proxy]):not(.product-card__arrow)').forEach((b) => { b.dataset.img = s.dataset.img; });
    if (stickyImg) stickyImg.src = s.dataset.img;
    go(+s.dataset.slide);
    syncMeta();
  }));
  // pdp-cro.js rewrites data-variant as "<base> · <customisations>"; keep <base> = the chosen colour.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-add][data-price="5499"]:not([data-ups-proxy]):not(.product-card__arrow)');
    if (!b) return;
    const parts = (b.dataset.variant || '').split(' · ');
    parts[0] = state.colour;
    b.dataset.variant = parts.join(' · ');
  }, true);

  /* ---------- Size: aria + sticky meta (main.js handles selection + scarcity) ---------- */
  const sizes = $$('.spot__size', root);
  const syncSizes = () => sizes.forEach((p) => p.setAttribute('aria-pressed', String(p.classList.contains('is-selected'))));
  sizes.forEach((p) => p.addEventListener('click', () => {
    if (p.classList.contains('is-soldout')) return;
    state.size = p.textContent.trim();
    syncSizes();
    syncMeta();
  }));
  syncSizes();
  // The page pre-selects UK 8; tell pdp-cro.js the sticky select already has a size.
  if (stickySelect) {
    stickySelect.value = state.size;
    stickySelect.dispatchEvent(new Event('change'));
  }

  /* ---------- Offer code: visual confirmation (pdp-cro.js copies + swaps the label) ---------- */
  $$('.spot__copy', root).forEach((b) => b.addEventListener('click', () => {
    b.classList.add('is-done');
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove('is-done'), 1500);
  }));

  /* ---------- Accordions (grid-rows 0fr → 1fr in CSS; closed panels are inert) ---------- */
  $$('.spot-acc__btn', root).forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.inert = !open;
    });
  });

  /* ---------- Sticky buy bar: shown everywhere except while the main Add to cart / Buy it now
     buttons are on screen (above or below them, on every width). ---------- */
  const atcTargets = [$('[data-spot-atc]', root), $('.spot__buynow', root)].filter(Boolean);
  const onScreen = new Set();
  let atcObserver;
  const watchAtc = () => {
    if (!sticky || !atcTargets.length || !('IntersectionObserver' in window)) return;
    atcObserver && atcObserver.disconnect();
    onScreen.clear();
    const mobile = mqMobile.matches;
    const cs = getComputedStyle(document.documentElement);
    const px = (v, d) => parseFloat(cs.getPropertyValue(v)) || d;
    const header = $('.header');
    const top = header ? header.offsetHeight : 0;
    // The floating bars cover the bottom of the viewport; a button hidden under them counts as off screen.
    const bottom = mobile ? px('--tabbar-h', 72) + px('--tabbar-gap', 12) + 80 : 96;
    atcObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
      const show = onScreen.size === 0;
      sticky.classList.toggle('is-visible', show);
      document.body.classList.toggle('sticky-atc-visible', show);
    }, { rootMargin: `-${top}px 0px -${bottom}px 0px` });
    atcTargets.forEach((t) => atcObserver.observe(t));
  };
  watchAtc();

  /* ---------- Mobile: WhatsApp bubble steps aside while the buy panel's right-aligned controls
     (size guide, accordion +/−, copy code) pass under it. Observes only the band the bubble occupies. ---------- */
  const buy = $('.spot__buy', root);
  let waObserver;
  const watchBubble = () => {
    waObserver && waObserver.disconnect();
    document.body.classList.remove('spot-buy-under-wa');
    if (!buy || !mqMobile.matches || !('IntersectionObserver' in window)) return;
    const h = window.innerHeight;
    const bandBottom = 150; // tab bar + gap (+ buy bar when shown): the bubble sits just above
    const bandTop = Math.max(0, h - bandBottom - 140);
    waObserver = new IntersectionObserver(([e]) => {
      document.body.classList.toggle('spot-buy-under-wa', e.isIntersecting);
    }, { rootMargin: `-${bandTop}px 0px -${bandBottom}px 0px` });
    waObserver.observe(buy);
  };
  watchBubble();
  const onMq = () => { watchAtc(); watchBubble(); };
  mqMobile.addEventListener ? mqMobile.addEventListener('change', onMq) : mqMobile.addListener(onMq);
  let rT;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(watchBubble, 200); }, { passive: true });
})();

/* Offers — "Build your saving": pairs toggle + prepaid switch drive a live "You pay".
   One offer at a time (2 pairs → EXTRA15, 1 pair → prepaid 10%) until stacking is confirmed.
   The pairs toggle and the page quantity stepper stay in sync. */
(function () {
  const box = document.querySelector('[data-bundle]');
  if (!box) return;
  const PRICE = 5499;
  const fmt = (n) => 'Rs. ' + Math.round(n).toLocaleString('en-IN');
  const opts = box.querySelectorAll('.spot-bundle__opt');
  const sw = box.querySelector('.spot-bundle__sw');
  const pre = box.querySelector('.spot-bundle__pre');
  const total = box.querySelector('[data-bundle-total]');
  const note = box.querySelector('[data-bundle-note]');
  const code = box.querySelector('[data-bundle-code]');
  const qty = document.getElementById('pdp-qty');

  const render = () => {
    const count = Math.max(1, parseInt(qty && qty.value, 10) || (box.dataset.pairs === '2' ? 2 : 1));
    const pairs = count >= 2 ? 2 : 1;
    const prepaid = sw.getAttribute('aria-checked') === 'true';
    let sum = PRICE * count;
    if (pairs === 2) { sum *= 0.85; note.innerHTML = '<b>' + fmt(sum / count) + '</b> per pair'; }
    else if (prepaid) { sum *= 0.9; note.innerHTML = 'Save <b>' + fmt(PRICE - sum) + '</b>'; }
    else note.textContent = 'Full price';
    total.textContent = fmt(sum);
    code.hidden = pairs !== 2;
    sw.disabled = pairs === 2;
    pre.classList.toggle('is-off', pairs === 2);
    opts.forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.pairs === String(pairs))));
  };
  const setPairs = (n, fromQty) => {
    box.dataset.pairs = n >= 2 ? '2' : '1';
    if (!fromQty && qty) qty.value = String(n);
    render();
  };

  opts.forEach((o) => o.addEventListener('click', () => setPairs(+o.dataset.pairs)));
  sw.addEventListener('click', () => { sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true')); render(); });
  if (qty) {
    const fromQty = () => setPairs(parseInt(qty.value, 10) || 1, true);
    qty.addEventListener('change', fromQty);
    qty.closest('.qty')?.addEventListener('click', (e) => { if (e.target.closest('[data-step]')) setTimeout(fromQty, 0); });
  }
  render();
})();

/* Customise drawer: step tabs + live "Your pair" card.
   pdp-cro.js owns the option state, summary, WhatsApp text, reset and save;
   this only drives the steps and mirrors each group's current value into the card. */
(function () {
  const dr = document.getElementById('customise-drawer');
  if (!dr || !dr.classList.contains('cz')) return;
  const $ = (s) => dr.querySelector(s);
  const $$ = (s) => Array.from(dr.querySelectorAll(s));
  const tabs = $$('[data-cz-tab]');
  const panels = $$('[data-cz-panel]');
  const groups = $$('[data-customise-group]');
  const back = $('[data-cz-back]');
  const next = $('[data-cz-next]');
  const save = $('[data-customise-apply]');
  const bar = $('.cz__prog i');
  const body = $('.cz__body');
  const names = ['Leather', 'Sole', 'Comfort', 'Note'];
  const SHORT = { 'Handmade leather sole with anti-skid rubber': 'Leather + anti-skid sole', 'No thanks': 'Standard insole', 'Add Japanese cushioning': 'Japanese cushioning' };
  let cur = 0;

  const go = (k) => {
    cur = Math.max(0, Math.min(panels.length - 1, k));
    tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === cur)));
    panels.forEach((p, i) => { p.hidden = i !== cur; });
    bar.style.width = ((cur + 1) / panels.length) * 100 + '%';
    back.disabled = cur === 0;
    const last = cur === panels.length - 1;
    next.hidden = last; save.hidden = !last;
    if (!last) next.textContent = 'Next · ' + names[cur + 1];
    body.scrollTop = 0;
    tabs[cur].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const sync = () => {
    let n = 0;
    groups.forEach((g, i) => {
      const c = g.querySelector('input[data-option]:checked');
      const up = !!(c && !c.hasAttribute('data-default'));
      const raw = (g.querySelector('[data-group-current]') || {}).textContent || '';
      const val = SHORT[raw] || raw.replace(' — ', ' · ');
      const dd = $(`[data-cz-cur="${i}"]`);
      if (dd) dd.textContent = val;
      $(`[data-cz-row="${i}"]`)?.classList.toggle('is-up', up);
      tabs[i]?.classList.toggle('is-up', up);
      if (up) n++;
    });
    const note = $('[data-customise-note]');
    if (note && note.value.trim()) n++;
    $('[data-cz-count]').textContent = n ? n + (n > 1 ? ' upgrades' : ' upgrade') : 'No upgrades yet';
  };

  tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
  back.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => go(cur + 1));
  // pdp-cro.js listens first (loaded earlier), so the group values are already updated here
  dr.addEventListener('change', sync);
  dr.addEventListener('input', (e) => e.target.matches('[data-customise-note]') && sync());
  $('[data-customise-reset]')?.addEventListener('click', () => setTimeout(() => { sync(); go(0); }, 0));
  // Each open starts at step 1
  let wasOpen = false;
  new MutationObserver(() => {
    const open = dr.classList.contains('is-open');
    if (open && !wasOpen) go(0);
    wasOpen = open;
  }).observe(dr, { attributes: true, attributeFilter: ['class'] });
  sync(); go(0);
})();

/* Details: pill tabs (Wholecut · Specs · Care · Delivery) with arrow-key support */
(function () {
  const root = document.querySelector('[data-spot-tabs]');
  if (!root) return;
  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      select(tabs[(i + d + tabs.length) % tabs.length], true);
    });
  });
})();

/* Upsells under Add to cart: "+" opens a size row on that card; choosing a size adds that
   shoe in that size (via main.js cart, data-size) and closes the row. */
(function () {
  const root = document.querySelector('[data-ups]');
  if (!root) return;
  const cards = Array.from(root.querySelectorAll('[data-ups-card]'));
  const teaser = root.querySelector('[data-ups-teaser]');
  const panel = root.querySelector('[data-ups-panel]');
  if (teaser && panel) {
    const setOpen = (o) => { panel.hidden = !o; teaser.setAttribute('aria-expanded', String(o)); if (!o) cards.forEach((c) => close(c)); };
    teaser.addEventListener('click', () => setOpen(panel.hidden));
    root.querySelector('[data-ups-close]')?.addEventListener('click', () => { setOpen(false); teaser.focus(); });
  }
  const close = (card) => {
    const btn = card.querySelector('[data-ups-open]');
    card.querySelector('.spot-ups__sizes').hidden = true;
    card.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
  };
  cards.forEach((card) => {
    const btn = card.querySelector('[data-ups-open]');
    const row = card.querySelector('.spot-ups__sizes');
    const proxy = card.querySelector('[data-ups-proxy]');
    btn.addEventListener('click', () => {
      const open = row.hidden;
      cards.forEach((c) => c !== card && close(c));
      row.hidden = !open;
      card.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open) {
        row.querySelector('button').focus({ preventScroll: true });
      }
    });
    row.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ups-size]');
      if (!b) return;
      proxy.dataset.size = b.dataset.upsSize;
      proxy.click();
      close(card);
      btn.classList.add('is-added');
      setTimeout(() => btn.classList.remove('is-added'), 1600);
    });
    card.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !row.hidden) { close(card); btn.focus(); } });
  });
})();
