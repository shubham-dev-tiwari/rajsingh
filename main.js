/* Raj Singh's — mockup interactions (vanilla JS, no dependencies) */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* Announcement bar rotation */
  const announcements = $$('.announcement__item');
  if (announcements.length > 1) {
    let i = 0;
    let annTimer;
    const show = (n) => {
      announcements[i].classList.remove('is-active');
      i = (n + announcements.length) % announcements.length;
      announcements[i].classList.add('is-active');
    };
    const annStart = () => { clearInterval(annTimer); annTimer = setInterval(() => show(i + 1), 4000); };
    $$('[data-ann]').forEach((b) => b.addEventListener('click', () => { show(i + +b.dataset.ann); annStart(); }));
    annStart();
  }

  /* Header shadow on scroll */
  const header = $('.header');
  const setHeaderHeight = () => header && document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  const onScroll = () => header && header.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', setHeaderHeight);
  setHeaderHeight();
  onScroll();

  /* Slideshow */
  const slides = $$('.slide');
  const dots = $$('.slideshow__dots button');
  if (slides.length) {
    let current = 0;
    let timer;
    const go = (n) => {
      slides[current].classList.remove('is-active');
      dots[current] && dots[current].classList.remove('is-active');
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('is-active');
      dots[current] && dots[current].classList.add('is-active');
    };
    const start = () => { clearInterval(timer); timer = setInterval(() => go(current + 1), 5000); };
    dots.forEach((d, n) => d.addEventListener('click', () => { go(n); start(); }));
    start();
  }

  /* Drawers (menu + cart) */
  const openDrawer = (id) => {
    const d = document.getElementById(id);
    if (!d) return;
    d.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };
  const closeDrawers = () => {
    $$('.drawer.is-open, .popup.is-open').forEach((d) => d.classList.remove('is-open'));
    document.body.style.overflow = '';
  };
  $$('[data-open]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); openDrawer(b.dataset.open); }));
  $$('[data-close]').forEach((b) => b.addEventListener('click', closeDrawers));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeDrawers());

  /* Cart (mock state) */
  const cart = [];
  const fmt = (n) => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const renderCart = () => {
    const body = $('#cart-body');
    const foot = $('#cart-foot');
    const count = cart.reduce((a, l) => a + l.qty, 0);
    $$('.header__cart-count').forEach((c) => { c.textContent = count; c.style.display = count ? '' : 'none'; });
    if (!body) return;
    if (!cart.length) {
      body.innerHTML = '<div class="cart-empty"><p class="h4">Your cart is empty</p><a class="btn" href="collection.html">Continue shopping</a></div>';
      foot.hidden = true;
      return;
    }
    body.innerHTML = cart.map((l) => `
      <div class="cart-line">
        <img src="${l.img}" alt="">
        <div>
          <p class="cart-line__title">${l.title}</p>
          <p class="cart-line__meta">${l.variant || ''}</p>
          <p class="price" style="justify-content:flex-start;margin-top:6px">${fmt(l.price)} <span class="cart-line__meta">× ${l.qty}</span></p>
        </div>
      </div>`).join('');
    $('#cart-total').textContent = fmt(cart.reduce((a, l) => a + l.price * l.qty, 0));
    foot.hidden = false;
  };
  $$('[data-add]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    const d = b.dataset;
    const qtyInput = d.qtyFrom ? $(d.qtyFrom) : null;
    const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
    const size = $('.pill.is-selected');
    // data-size lets a button add its own size (e.g. PDP upsells) instead of the page's selected size
    const sizeTxt = d.size || (size ? size.textContent.trim() : '');
    const variant = [d.variant, sizeTxt ? 'UK ' + sizeTxt : ''].filter(Boolean).join(' / ');
    const existing = cart.find((l) => l.title === d.title && l.variant === variant);
    existing ? (existing.qty += qty) : cart.push({ title: d.title, price: +d.price, img: d.img, variant, qty });
    renderCart();
    openDrawer('cart-drawer');
  }));
  renderCart();

  /* Product carousels */
  $$('[data-carousel]').forEach((wrap) => {
    const track = $('.product-carousel', wrap);
    $$('[data-dir]', wrap).forEach((btn) => btn.addEventListener('click', () => {
      track.scrollBy({ left: track.clientWidth * 0.75 * +btn.dataset.dir, behavior: 'smooth' });
    }));
  });

  /* Gallery thumbnails */
  $$('.gallery').forEach((g) => {
    const main = $('.gallery__main img', g);
    $$('.gallery__thumbs button', g).forEach((t) => t.addEventListener('click', () => {
      $$('.gallery__thumbs button', g).forEach((x) => x.classList.remove('is-active'));
      t.classList.add('is-active');
      main.style.opacity = 0;
      setTimeout(() => { main.src = $('img', t).src; main.style.opacity = 1; }, 180);
    }));
  });

  /* Featured product (home): colour → gallery, image counter, size required before buying */
  $$('[data-fp]').forEach((fp) => {
    const thumbs = $$('.gallery__thumbs button', fp);
    const index = $('[data-fp-index]', fp);
    const atc = $('[data-add]', fp);
    const hint = $('[data-fp-hint]', fp);
    const sizes = $('[data-fp-sizes]', fp);
    thumbs.forEach((t, i) => t.addEventListener('click', () => { index.textContent = String(i + 1).padStart(2, '0'); }));
    $$('.fp__swatch', fp).forEach((s) => s.addEventListener('click', () => {
      $$('.fp__swatch', fp).forEach((x) => { x.classList.remove('is-selected'); x.setAttribute('aria-pressed', 'false'); });
      s.classList.add('is-selected');
      s.setAttribute('aria-pressed', 'true');
      $('[data-fp-colour]', fp).textContent = s.getAttribute('aria-label');
      atc.dataset.variant = s.getAttribute('aria-label');
      atc.dataset.img = $('img', s).getAttribute('src');
      thumbs[+s.dataset.thumb].click();
    }));
    $$('.pill', fp).forEach((p) => p.addEventListener('click', () => { if (!p.classList.contains('is-soldout')) hint.hidden = true; }));
    /* Capture on the card runs before the global [data-add] handler on the button */
    fp.addEventListener('click', (e) => {
      const buy = e.target.closest('[data-add], [data-fp-buy]');
      if (!buy || $('.pill.is-selected', fp)) return;
      e.preventDefault();
      e.stopPropagation();
      hint.hidden = false;
      sizes.classList.remove('is-shake');
      void sizes.offsetWidth;
      sizes.classList.add('is-shake');
    }, true);
  });

  /* Shop the look (home): hotspot tag + colour swaps look photo, packshot and cart variant */
  $$('[data-stl]').forEach((stl) => {
    const frame = $('.stl__frame', stl);
    const spot = $('[data-stl-spot]', stl);
    const tag = $('[data-stl-tag]', stl);
    const atc = $('[data-add]', stl);
    const setOpen = (open) => { frame.classList.toggle('is-open', open); spot.setAttribute('aria-expanded', String(open)); };
    const canHover = window.matchMedia('(hover: hover)').matches;
    spot.addEventListener('click', () => setOpen(canHover || !frame.classList.contains('is-open')));
    if (canHover) {
      let hideTimer;
      [spot, tag].forEach((el) => {
        el.addEventListener('mouseenter', () => { clearTimeout(hideTimer); setOpen(true); });
        el.addEventListener('mouseleave', () => { hideTimer = setTimeout(() => setOpen(false), 220); });
      });
    }
    document.addEventListener('click', (e) => { if (!e.target.closest('[data-stl-spot], [data-stl-tag]')) setOpen(false); });
    stl.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); spot.focus(); } });
    $$('.stl__swatch', stl).forEach((s) => s.addEventListener('click', () => {
      $$('.stl__swatch', stl).forEach((x) => { x.classList.remove('is-selected'); x.setAttribute('aria-pressed', 'false'); });
      s.classList.add('is-selected');
      s.setAttribute('aria-pressed', 'true');
      const d = s.dataset;
      $$('.stl__photo', stl).forEach((p) => p.classList.toggle('is-active', p.dataset.look === d.look));
      $$('[data-stl-thumb]', stl).forEach((img) => { img.src = d.thumb; });
      [spot, tag].forEach((el) => { el.style.setProperty('--x', d.x); el.style.setProperty('--y', d.y); });
      $('[data-stl-colour]', stl).textContent = s.getAttribute('aria-label');
      atc.dataset.variant = s.getAttribute('aria-label');
      atc.dataset.img = d.thumb;
    }));
  });

  /* Quantity selectors */
  $$('.qty').forEach((q) => {
    const input = $('input', q);
    $$('button', q).forEach((b) => b.addEventListener('click', () => {
      input.value = Math.max(1, (parseInt(input.value, 10) || 1) + +b.dataset.step);
    }));
  });

  /* Size pills + scarcity */
  const stock = { 6: 12, 7: 3, 8: 7, 9: 2, 10: 9, 11: 0 };
  $$('.pill').forEach((p) => p.addEventListener('click', () => {
    if (p.classList.contains('is-soldout')) return;
    $$('.pill').forEach((x) => x.classList.remove('is-selected'));
    p.classList.add('is-selected');
    const label = $('#size-label');
    if (label) label.textContent = 'UK ' + p.textContent.trim();
    const alert = $('#stock-alert');
    if (!alert) return;
    const size = p.textContent.trim();
    const q = stock[size];
    if (q <= 4) {
      alert.hidden = false;
      alert.className = 'scarcity__pill';
      alert.innerHTML = `<span class="dot"></span>Only ${q} pairs left in Size ${size} — order now`;
    } else if (q <= 10) {
      alert.hidden = false;
      alert.className = 'scarcity__pill is-amber';
      alert.innerHTML = `<span class="dot"></span>Selling fast — limited stock in Size ${size}`;
    } else {
      alert.hidden = true;
    }
  }));

  /* Colour swatches */
  $$('.color-swatches button').forEach((s) => s.addEventListener('click', () => {
    $$('.color-swatches button').forEach((x) => x.classList.remove('is-selected'));
    s.classList.add('is-selected');
    const label = $('#color-label');
    if (label) label.textContent = s.getAttribute('aria-label');
  }));

  /* Accordions (div + button + max-height, no scroll jump) */
  $$('.acc').forEach((acc) => {
    const body = $('.acc__body', acc);
    const set = () => { body.style.maxHeight = acc.classList.contains('is-open') ? body.scrollHeight + 'px' : '0'; };
    $('.acc__toggle', acc).addEventListener('click', () => {
      acc.classList.toggle('is-open');
      $('.acc__toggle', acc).setAttribute('aria-expanded', acc.classList.contains('is-open'));
      set();
    });
    set();
  });

  /* Sticky add-to-cart (shows once main ATC scrolls away) */
  const sticky = $('.sticky-atc');
  const mainAtc = $('#main-atc');
  if (sticky && mainAtc && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      const show = !e.isIntersecting; // before reaching the main buttons and after passing them
      sticky.classList.toggle('is-visible', show);
      document.body.classList.toggle('sticky-atc-visible', show);
    }).observe(mainAtc);
  }

  /* Text-with-icons mobile carousel dots */
  const iconsRow = $('#icons-row');
  if (iconsRow) {
    const iconDots = $$('.icons-dots span');
    iconsRow.addEventListener('scroll', () => {
      const n = Math.round(iconsRow.scrollLeft / iconsRow.clientWidth);
      iconDots.forEach((d, k) => d.classList.toggle('is-active', k === n));
    }, { passive: true });
  }

  /* Reveal on scroll */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  /* Newsletter popup (once per session) */
  const popup = $('#newsletter-popup');
  if (popup) {
    let seen = false;
    try { seen = sessionStorage.getItem('rs-popup') === '1'; } catch (e) {}
    if (!seen) {
      setTimeout(() => {
        popup.classList.add('is-open');
        try { sessionStorage.setItem('rs-popup', '1'); } catch (e) {}
      }, 5000);
    }
    const form = $('form', popup);
    form && form.addEventListener('submit', (e) => {
      e.preventDefault();
      $('.popup__head', popup).innerHTML = '<p class="popup__title">Welcome to the club</p><p class="popup__text">Your VIP access is on its way to your inbox.</p>';
      form.remove();
      setTimeout(closeDrawers, 2200);
    });
  }

  /* Hero — Oxford turntable (auto-rotating film)
     images/oxford-loop.mp4 is one seamless 360° turn (12s, 60fps) built from the
     36 renders per leather, in-between angles generated with RIFE frame interpolation. The leather changes every
     90°: black, oxblood, walnut, espresso, each change a short cross-fade centred on the
     90° mark while the shoe keeps turning. The browser's video decoder does all the drawing;
     this code only keeps swatches, angle readout, notes and progress bars in step. */
  const hf = $('.hf');
  if (hf) {
    const TURN = 12;  // seconds per full turn (must match the film)
    const FADE = 1.6; // cross-fade centred on each 90° mark, baked into the film
    const film = $('.ox-film', hf);
    const swatches = $$('.ox-swatch', hf);
    const notes = $$('.hf__note', hf);
    const bars = $$('.hf__track i', hf);
    const degs = $$('[data-ox-deg]', hf);
    const count = swatches.length;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lastLeather = -1, lastDeg = -1, lastBars = -1, visible = false, loaded = false;

    const shown = () => hf.offsetParent !== null; // another home hero may be selected (mockup)
    const load = () => {
      if (loaded || !shown()) return;
      loaded = true;
      film.src = film.dataset.src; // one 1200px file (1 MB): a smaller one looked soft on 3x phones
    };

    // One quarter turn per leather; the swap happens mid-fade, exactly on the 90° mark.
    const QUARTER = TURN / count;
    const sync = () => {
      const t = film.currentTime % TURN;
      const li = Math.floor(t / QUARTER) % count;
      if (li !== lastLeather) {
        lastLeather = li;
        swatches.forEach((b, i) => b.setAttribute('aria-pressed', String(i === li)));
        notes.forEach((n, i) => n.classList.toggle('is-on', i === Math.min(notes.length - 1, li)));
      }
      const deg = Math.round((t / TURN) * 72) * 5 % 360; // 5° steps
      if (deg !== lastDeg) { lastDeg = deg; const s = String(deg).padStart(3, '0') + '°'; degs.forEach((d) => { d.textContent = s; }); }
      const seg = li, within = (t % QUARTER) / QUARTER;
      const sig = seg * 1000 + ((within * 200) | 0);
      if (sig !== lastBars) {
        lastBars = sig;
        bars.forEach((b, i) => { b.style.transform = `scaleX(${i < seg ? 1 : i === seg ? within.toFixed(3) : 0})`; });
      }
    };
    // Readouts follow the film ~8 times a second. Deliberately not per video frame:
    // touching the DOM every frame makes Chrome drop the film's frames (measured 100%).
    let timer = 0;
    film.addEventListener('play', () => { clearInterval(timer); timer = setInterval(sync, 125); sync(); });
    film.addEventListener('pause', () => { clearInterval(timer); sync(); });
    film.addEventListener('seeked', sync);
    film.addEventListener('loadeddata', sync);

    const play = () => {
      if (reduce || !visible || !shown()) return;
      load();
      const p = film.play();
      if (p && p.catch) p.catch(() => {});
    };
    const pause = () => { if (!film.paused) film.pause(); };

    // Swatches: jump to that leather's quarter, just past its fade (a quick dip hides the cut).
    swatches.forEach((b, li) => b.addEventListener('click', () => {
      load();
      hf.classList.add('is-cutting');
      setTimeout(() => {
        film.currentTime = li * QUARTER + FADE / 2 + 0.05;
        sync();
        requestAnimationFrame(() => hf.classList.remove('is-cutting'));
      }, 160);
    }));

    // Only play while on screen; the WhatsApp bubble hides meanwhile on mobile.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        document.body.classList.toggle('hero-in-view', e.isIntersecting);
        visible ? play() : pause();
      }, { threshold: 0.15 }).observe(hf);
    } else {
      visible = true;
    }
    document.addEventListener('visibilitychange', () => { document.hidden ? pause() : play(); });
    window.addEventListener('resize', () => { shown() ? play() : pause(); }); // hero switcher dispatches resize
    if (reduce) load();
    sync();
  }
})();
