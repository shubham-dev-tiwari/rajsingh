/* Raj Singh's — collection page: filter pills, sort menu, URL state (vanilla JS) */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const grid = $('.collection-layout .product-grid');
  if (!grid) return;

  const cards = $$('.product-card[data-order]', grid);
  const story = $('[data-story]', grid);
  const pills = $$('.fpill[data-filter]');
  const tagsEl = $('[data-active-tags]');
  const countEl = $('[data-results-count]');
  const emptyEl = $('[data-empty]');
  const endEl = $('[data-results-end]');
  const head = $('#results');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const products = cards.map((el) => ({
    el,
    order: +el.dataset.order,
    colors: el.dataset.colors.split(' '),
    sizes: el.dataset.sizes.split(' '),
    price: +el.dataset.price,
    savings: +el.dataset.compare - +el.dataset.price,
    rating: +el.dataset.rating,
    discount: +el.dataset.discount,
  }));

  /* Tag filters are ANDed; colours and sizes are ORed within their group */
  const TAGS = {
    'top-rated': (p) => p.rating >= 4.5,
    deal: (p) => p.discount >= 40,
  };
  const SORTS = {
    featured: (a, b) => a.order - b.order,
    rating: (a, b) => b.rating - a.rating || a.order - b.order,
    savings: (a, b) => b.savings - a.savings || a.order - b.order,
    'price-asc': (a, b) => a.price - b.price || a.order - b.order,
    'price-desc': (a, b) => b.price - a.price || a.order - b.order,
  };

  const state = { tag: new Set(), color: new Set(), size: new Set(), sort: 'featured' };

  const matches = (p, s) =>
    [...s.tag].every((t) => TAGS[t] && TAGS[t](p)) &&
    (!s.color.size || p.colors.some((c) => s.color.has(c))) &&
    (!s.size.size || p.sizes.some((z) => s.size.has(z)));

  const hasFilters = () => state.tag.size + state.color.size + state.size.size > 0;
  const pillLabel = (pill) => pill.firstChild && pill.cloneNode(true);

  /* Count for a pill = results if that pill were added to the current state */
  const countFor = (group, value) => {
    const s = { tag: new Set(state.tag), color: new Set(state.color), size: new Set(state.size) };
    if (group === 'tag') s.tag.add(value);
    else s[group] = new Set([value]);
    return products.filter((p) => matches(p, s)).length;
  };

  const labelText = (pill) => {
    const clone = pillLabel(pill);
    $$('small, .fpill__star, .fpill__dot', clone).forEach((n) => n.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  };

  const xIcon = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m2 2 8 8M10 2l-8 8"/></svg>';

  const syncUrl = () => {
    const params = new URLSearchParams();
    ['tag', 'color', 'size'].forEach((g) => { if (state[g].size) params.set(g, [...state[g]].join(',')); });
    if (state.sort !== 'featured') params.set('sort', state.sort);
    const q = params.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : '') + location.hash);
  };

  const animate = (visible) => {
    if (reduceMotion) return;
    grid.classList.remove('is-animating');
    visible.forEach((el, i) => el.style.setProperty('--i', Math.min(i, 8)));
    void grid.offsetWidth; // restart the entrance animation
    grid.classList.add('is-animating');
  };

  const render = ({ animateCards = true } = {}) => {
    const visible = products.filter((p) => matches(p, state)).sort(SORTS[state.sort]);
    const showStory = story && !hasFilters() && state.sort === 'featured';

    products.forEach((p) => { p.el.hidden = !visible.includes(p); });
    const frag = document.createDocumentFragment();
    visible.forEach((p, i) => {
      if (showStory && i === 4) frag.appendChild(story);
      frag.appendChild(p.el);
    });
    products.filter((p) => !visible.includes(p)).forEach((p) => frag.appendChild(p.el));
    if (story) {
      story.hidden = !showStory;
      if (!story.parentNode || !showStory) frag.appendChild(story);
    }
    grid.appendChild(frag);

    pills.forEach((pill) => {
      const [group, value] = pill.dataset.filter.split(':');
      const on = state[group].has(value);
      pill.classList.toggle('is-active', on);
      pill.setAttribute('aria-pressed', on);
      const n = countFor(group, value);
      $('[data-count]', pill).textContent = on ? '' : n;
      pill.classList.toggle('is-empty', !on && n === 0);
    });

    tagsEl.innerHTML = '';
    pills.filter((p) => p.classList.contains('is-active')).forEach((pill) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'facet-tag';
      b.dataset.remove = pill.dataset.filter;
      b.setAttribute('aria-label', 'Remove filter: ' + labelText(pill));
      b.innerHTML = `<span>${labelText(pill)}</span>${xIcon}`;
      tagsEl.appendChild(b);
    });
    if (hasFilters()) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'facet-tag facet-tag--clear';
      clear.dataset.clearFilters = '';
      clear.textContent = 'Clear all';
      tagsEl.appendChild(clear);
    }

    countEl.textContent = visible.length;
    emptyEl.hidden = visible.length > 0;
    endEl.hidden = visible.length === 0;
    $('[data-results-shown]', endEl).textContent = visible.length;
    $('[data-results-total]', endEl).textContent = products.length;
    $('[data-results-bar]', endEl).style.transform = `scaleX(${visible.length / products.length})`;

    syncUrl();
    if (animateCards) animate([...grid.children].filter((el) => !el.hidden));
  };

  /* Keep the results in view after a change made from the sticky toolbar */
  const revealResults = () => {
    const toolbar = $('.toolbar');
    const limit = toolbar ? toolbar.getBoundingClientRect().bottom : 0;
    if (head.getBoundingClientRect().top < limit) head.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const toggle = (filter) => {
    const [group, value] = filter.split(':');
    state[group].has(value) ? state[group].delete(value) : state[group].add(value);
    render();
    revealResults();
  };

  const clearAll = () => {
    state.tag.clear(); state.color.clear(); state.size.clear();
    render();
    revealResults();
  };

  pills.forEach((pill) => pill.addEventListener('click', () => toggle(pill.dataset.filter)));
  document.addEventListener('click', (e) => {
    const remove = e.target.closest('[data-remove]');
    if (remove) {
      const pill = pills.find((p) => p.dataset.filter === remove.dataset.remove);
      toggle(remove.dataset.remove);
      if (pill) pill.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest('[data-clear-filters]')) clearAll();
  });

  /* ---------- Sort menu ---------- */
  const sortBtn = $('.sort__btn');
  const sortMenu = $('#sort-menu');
  const backdrop = $('.sort__backdrop');
  const items = $$('[data-sort]', sortMenu);

  const setSort = (key) => {
    state.sort = SORTS[key] ? key : 'featured';
    items.forEach((it) => it.setAttribute('aria-checked', it.dataset.sort === state.sort));
    const label = $('.toolbar__label', sortBtn);
    sortBtn.setAttribute('aria-label', 'Sort by: ' + items.find((it) => it.dataset.sort === state.sort).textContent);
    if (label) label.dataset.value = state.sort;
  };

  /* Keyboard opens move focus to the checked item; pointer opens focus the menu itself (no ring) */
  const openMenu = (fromKeyboard) => {
    sortMenu.hidden = false;
    backdrop.hidden = false;
    sortBtn.setAttribute('aria-expanded', 'true');
    if (fromKeyboard) (items.find((it) => it.getAttribute('aria-checked') === 'true') || items[0]).focus();
    else sortMenu.focus({ preventScroll: true });
  };
  const closeMenu = (restoreFocus = true) => {
    if (sortMenu.hidden) return;
    sortMenu.hidden = true;
    backdrop.hidden = true;
    sortBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) sortBtn.focus();
  };

  sortBtn.addEventListener('click', (e) => (sortMenu.hidden ? openMenu(e.detail === 0) : closeMenu()));
  backdrop.addEventListener('click', () => closeMenu());
  items.forEach((it) => it.addEventListener('click', () => {
    setSort(it.dataset.sort);
    closeMenu();
    render();
    revealResults();
  }));
  sortMenu.addEventListener('keydown', (e) => {
    const i = items.indexOf(document.activeElement);
    if (i < 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); items[0].focus(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1].focus();
    } else if (e.key === 'Tab') {
      closeMenu(false);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', (e) => {
    if (!sortMenu.hidden && !e.target.closest('.sort')) closeMenu(false);
  });

  /* ---------- Pill row: mouse wheel + click-drag scroll horizontally ---------- */
  $$('.filter-pills__track').forEach((track) => {
    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = track.scrollWidth - track.clientWidth;
      if ((e.deltaY < 0 && track.scrollLeft <= 0) || (e.deltaY > 0 && track.scrollLeft >= max - 1)) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    }, { passive: false });

    let startX = 0, startLeft = 0, down = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; startX = e.clientX; startLeft = track.scrollLeft;
    });
    track.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!track.classList.contains('is-dragging') && Math.abs(dx) > 5) {
        track.classList.add('is-dragging');
        track.setPointerCapture(e.pointerId);
      }
      if (track.classList.contains('is-dragging')) track.scrollLeft = startLeft - dx;
    });
    const end = () => { down = false; requestAnimationFrame(() => track.classList.remove('is-dragging')); };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
  });

  /* ---------- Initial state from URL ---------- */
  const params = new URLSearchParams(location.search);
  ['tag', 'color', 'size'].forEach((g) => {
    (params.get(g) || '').split(',').filter(Boolean).forEach((v) => {
      if (pills.some((p) => p.dataset.filter === `${g}:${v}`)) state[g].add(v);
    });
  });
  setSort(params.get('sort') || 'featured');
  render();

  /* Bring the first active pill into view on load */
  const firstActive = pills.find((p) => p.classList.contains('is-active'));
  if (firstActive) {
    const track = firstActive.parentElement;
    track.scrollLeft = firstActive.offsetLeft - 16;
  }
})();
