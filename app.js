/* Raj Singh's — app shell (≤ 999px). Loaded after main.js on every page.
   Injects the bottom tab bar, back/share buttons, inline header title and the
   search sheet; turns drawers into swipe-to-close bottom sheets. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const mq = window.matchMedia('(max-width: 999px)');
  const body = document.body;
  const header = $('.header');
  const headerInner = $('.header__inner');

  const page = /product/.test(location.pathname) ? 'product'
    : /collection/.test(location.pathname) ? 'collection' : 'home';
  if (page === 'product') body.classList.add('app-pdp');

  const icon = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    shop: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bag: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    go: '<path d="m9 6 6 6-6 6"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  };

  /* ---------- Tab bar ---------- */
  const tabbar = document.createElement('nav');
  tabbar.className = 'tabbar';
  tabbar.setAttribute('aria-label', 'App navigation');
  tabbar.innerHTML = `
    <a class="tabbar__item" href="index.html" ${page === 'home' ? 'aria-current="page"' : ''}><span class="tabbar__pill">${icon(ICONS.home)}</span><span>Home</span></a>
    <a class="tabbar__item" href="collection.html" ${page !== 'home' ? 'aria-current="page"' : ''}><span class="tabbar__pill">${icon(ICONS.shop)}</span><span>Shop</span></a>
    <button class="tabbar__item" type="button" data-app-search><span class="tabbar__pill">${icon(ICONS.search)}</span><span>Search</span></button>
    <button class="tabbar__item" type="button" data-app-cart><span class="tabbar__pill">${icon(ICONS.bag)}<span class="header__cart-count" style="display:none">0</span></span><span>Bag</span></button>
    <button class="tabbar__item" type="button" data-app-menu><span class="tabbar__pill">${icon(ICONS.menu)}</span><span>Menu</span></button>`;
  body.appendChild(tabbar);

  // main.js binds [data-open] once at load, so route through its existing triggers
  const trigger = (sel) => { const el = $(sel); el && el.click(); };
  $('[data-app-cart]', tabbar).addEventListener('click', () => trigger('.header__cart'));
  $('[data-app-menu]', tabbar).addEventListener('click', () => trigger('.header__burger'));

  // Mirror the cart count (main.js writes every .header__cart-count) and bump on change
  const tabCount = $('.header__cart-count', tabbar);
  const srcCount = $('.header .header__cart-count');
  if (srcCount) {
    const sync = () => { tabCount.textContent = srcCount.textContent; tabCount.style.display = srcCount.style.display; };
    sync();
    let last = srcCount.textContent;
    new MutationObserver(() => {
      sync();
      if (srcCount.textContent !== last) {
        last = srcCount.textContent;
        tabCount.classList.remove('is-bump'); void tabCount.offsetWidth; tabCount.classList.add('is-bump');
        navigator.vibrate && navigator.vibrate(8);
      }
    }).observe(srcCount, { childList: true, characterData: true, subtree: true, attributes: true });
  }

  /* ---------- Header: back, share, inline title ---------- */
  if (headerInner && page !== 'home') {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'app-back';
    back.setAttribute('aria-label', 'Back');
    back.innerHTML = icon(ICONS.back);
    back.addEventListener('click', () => {
      const fromHere = document.referrer && new URL(document.referrer).origin === location.origin;
      if (fromHere && history.length > 1) history.back();
      else location.href = page === 'product' ? 'collection.html' : 'index.html';
    });
    headerInner.prepend(back);
  }
  const toast = (msg) => {
    let t = $('.app-toast');
    if (!t) { t = document.createElement('div'); t.className = 'app-toast'; t.setAttribute('role', 'status'); body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('is-on'), 1800);
  };
  if (page === 'product') {
    const actions = $('.header__actions');
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'app-share';
    share.setAttribute('aria-label', 'Share');
    share.innerHTML = icon(ICONS.share);
    share.addEventListener('click', async () => {
      const data = { title: document.title, url: location.href };
      try {
        if (navigator.share) await navigator.share(data);
        else { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
      } catch (e) { /* dismissed */ }
    });
    actions && actions.prepend(share);
  }

  const titleSrc = page === 'product' ? $('.product-info__title') : page === 'collection' ? $('.collection-banner__title') : null;
  if (header && titleSrc && 'IntersectionObserver' in window) {
    const label = page === 'product' ? ($('.sticky-atc__title') || titleSrc).textContent.trim() : titleSrc.textContent.trim();
    const title = document.createElement('span');
    title.className = 'app-title';
    title.setAttribute('aria-hidden', 'true');
    title.textContent = label;
    headerInner.appendChild(title);
    new IntersectionObserver(([e]) => {
      header.classList.toggle('has-title', !e.isIntersecting && e.boundingClientRect.top < 80);
    }, { rootMargin: '-60px 0px 0px 0px' }).observe(titleSrc);
  }

  /* ---------- Search sheet ---------- */
  const PRODUCTS = [
    ['Premium Wholecut Chelsea Boots', 'Boots', 'images/boot-chelsea-1.jpg', 5499],
    ['Alon Jodhpur Boots', 'Boots', 'images/boot-alon-1.jpg', 5999],
    ['Comfort Leather Chelsea Boots', 'Boots', 'images/boot-comfort-1.jpg', 5499],
    ['Luxury Leather Formal Shoes', 'Lace ups', 'images/formal-1.jpg', 5499],
    ['Premium Penny Loafers', 'Loafers', 'images/loafer-penny-1.jpg', 5499],
    ['Valentino Heritage Penny Loafer – Burgundy', 'Loafers', 'images/loafer-valentino-burg-1.jpg', 5499.5],
    ['Valentino Heritage Penny Loafer – Black', 'Loafers', 'images/loafer-valentino-black-1.jpg', 5499.5],
    ['Valentino Heritage Penny Loafer – Brown', 'Loafers', 'images/loafer-valentino-brown-1.jpg', 5499.5],
    ['Strider Penny Loafer – Sand Suede', 'Loafers', 'images/loafer-strider-sand-1.jpg', 5499.5],
    ['Strider Penny Loafer – Dark Brown Suede', 'Loafers', 'images/loafer-strider-dark-1.jpg', 5499.5],
    ['Milano College Loafer – Tobacco Suede', 'Loafers', 'images/loafer-milano-tobacco-1.jpg', 5499.5],
    ['Milano College Loafer – Brown Suede', 'Loafers', 'images/loafer-milano-brown-1.jpg', 5499.5],
  ];
  const CATS = [['Boots', 'images/boot-alon-1.jpg'], ['Loafers', 'images/loafer-penny-1.jpg'], ['Lace ups', 'images/cat-laceups.jpg'], ['Monk straps', 'images/cat-monk.jpg']];
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rs = (n) => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const search = document.createElement('div');
  search.className = 'drawer app-search';
  search.id = 'app-search';
  search.setAttribute('aria-hidden', 'true');
  search.innerHTML = `
    <div class="drawer__overlay" data-app-close></div>
    <div class="drawer__panel" role="dialog" aria-label="Search">
      <form class="app-search__bar" action="collection.html" role="search">
        <label class="app-search__field">${icon(ICONS.search)}<span class="visually-hidden">Search products</span>
          <input type="search" name="q" placeholder="Search boots, loafers…" autocomplete="off" enterkeyhint="search"></label>
        <button type="button" class="app-search__cancel" data-app-close>Cancel</button>
      </form>
      <div class="app-search__body" data-app-results></div>
    </div>`;
  body.appendChild(search);
  const input = $('input', search);
  const results = $('[data-app-results]', search);
  const idle = `
    <p class="app-search__label">Trending</p>
    <div class="app-chips">${['Chelsea boots', 'Penny loafers', 'Wedding', 'Suede', 'Oxford'].map((t) => `<button type="button" class="app-chip" data-q="${t}">${icon(ICONS.trend)}${t}</button>`).join('')}</div>
    <p class="app-search__label">Shop by category</p>
    <div class="app-cats">${CATS.map(([n, img]) => `<a class="app-cat" href="collection.html"><img src="images/${img}" alt="" loading="lazy"><span>${n}</span></a>`).join('')}</div>`;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = idle; return; }
    const words = q.split(/\s+/).map((w) => w.replace(/s$/, ''));
    const hits = PRODUCTS.filter(([t, c]) => words.every((w) => (t + ' ' + c).toLowerCase().includes(w)));
    results.innerHTML = hits.length
      ? `<p class="app-search__label">${hits.length} result${hits.length > 1 ? 's' : ''}</p><div class="app-results">${hits.map(([t, c, img, p]) => `
          <a class="app-sheet-row" href="product.html"><img src="images/${img}" alt="" loading="lazy"><span><b>${esc(t)}</b><small>${c} · ${rs(p)}</small></span>${icon(ICONS.go)}</a>`).join('')}</div>`
      : `<p class="app-empty">No pairs match “${esc(input.value.trim())}”.</p>`;
  };
  input.addEventListener('input', render);
  results.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-q]');
    if (chip) { input.value = chip.dataset.q; render(); input.blur(); }
  });
  $('form', search).addEventListener('submit', (e) => {
    e.preventDefault();
    const first = $('.app-sheet-row', results);
    location.href = first ? first.getAttribute('href') : 'collection.html';
  });
  const openSearch = () => {
    render();
    search.classList.add('is-open');
    search.setAttribute('aria-hidden', 'false');
    body.style.overflow = 'hidden';
    setTimeout(() => input.focus({ preventScroll: true }), 60);
  };
  const closeSearch = () => {
    search.classList.remove('is-open');
    search.setAttribute('aria-hidden', 'true');
    body.style.overflow = '';
    input.blur();
  };
  $$('[data-app-close]', search).forEach((b) => b.addEventListener('click', closeSearch));
  $('[data-app-search]', tabbar).addEventListener('click', openSearch);
  $$('.header__actions a[aria-label="Search"]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); openSearch(); }));

  /* ---------- Sheet state: hide bars while any sheet is up ---------- */
  const sortMenu = $('.sort__menu');
  const syncSheets = () => body.classList.toggle('app-sheet-open',
    !!$('.drawer.is-open') || (!!sortMenu && !sortMenu.hidden));
  const watch = new MutationObserver(syncSheets);
  $$('.drawer').forEach((d) => watch.observe(d, { attributes: true, attributeFilter: ['class'] }));
  sortMenu && watch.observe(sortMenu, { attributes: true, attributeFilter: ['hidden'] });

  /* ---------- Swipe down to close sheets ---------- */
  $$('.drawer').forEach((drawer) => {
    const panel = $('.drawer__panel', drawer);
    const overlay = $('.drawer__overlay', drawer);
    let y0 = 0, t0 = 0, dy = 0, tracking = false, dragging = false;
    panel.addEventListener('touchstart', (e) => {
      if (!mq.matches || e.touches.length > 1) return;
      const scroller = e.target.closest('.drawer__body, .app-search__body');
      tracking = !(scroller && scroller.scrollTop > 0) && !e.target.closest('input, textarea, select');
      y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; dragging = false;
    }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0 && !dragging) { tracking = false; return; }
      dragging = true;
      e.preventDefault();
      drawer.classList.add('is-dragging');
      drawer.style.setProperty('--sheet-drag', Math.max(0, dy) + 'px');
    }, { passive: false });
    panel.addEventListener('touchend', () => {
      if (!dragging) { tracking = false; return; }
      const fast = dy / Math.max(1, Date.now() - t0) > 0.6;
      drawer.classList.remove('is-dragging');
      drawer.style.removeProperty('--sheet-drag');
      if (dy > Math.min(140, panel.offsetHeight * 0.25) || (fast && dy > 40)) overlay.click();
      tracking = dragging = false;
    });
  });

  /* ---------- Footer: collapsible link groups ---------- */
  $$('.footer-card').forEach((card) => {
    const head = $('.footer__heading', card);
    if (!head) return;
    card.classList.add('app-acc');
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', 'false');
    head.insertAdjacentHTML('beforeend', icon(ICONS.chev));
    const toggle = () => {
      if (!mq.matches) return;
      const open = card.classList.toggle('is-open');
      head.setAttribute('aria-expanded', String(open));
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* Header height drives sticky offsets; recalc after the shell changes it */
  const setH = () => header && document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  setH();
  mq.addEventListener ? mq.addEventListener('change', setH) : mq.addListener(setH);
  window.addEventListener('orientationchange', () => setTimeout(setH, 250));
})();
