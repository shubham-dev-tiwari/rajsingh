/* Mockup version of theme assets/pdp-cro.js — same behaviours, wired to the mockup's drawers and mock cart. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const closeDrawers = () => {
    $$('.drawer.is-open').forEach((d) => d.classList.remove('is-open'));
    document.body.style.overflow = '';
  };

  /* Offers toggle + copy code */
  $$('[data-pdp-offers]').forEach((root) => {
    const t = $('[data-offers-toggle]', root);
    t && t.addEventListener('click', () => t.setAttribute('aria-expanded', root.classList.toggle('is-open')));
  });
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) { /* ignore */ }
    const txt = b.textContent;
    b.textContent = 'Copied!';
    setTimeout(() => (b.textContent = txt), 1500);
  }));

  /* Customisation drawer */
  const drawer = $('#customise-drawer');
  const root = $('[data-pdp-customise]');
  if (drawer && root) {
    const summary = $('[data-customise-summary]', root);
    const emptyText = summary.textContent;
    const wa = $('[data-customise-whatsapp]', drawer);
    const baseVariant = {};
    // only this product's own add buttons carry its customisation (not upsells / related cards)
    $$('[data-add]:not([data-ups-proxy]):not(.product-card__arrow)').forEach((b, i) => (baseVariant[i] = b.dataset.variant || ''));

    const update = () => {
      const parts = [];
      $$('[data-customise-group]', drawer).forEach((g) => {
        const checked = $('input[data-option]:checked', g);
        $$('[data-sub-for]', g).forEach((w) => {
          const active = checked && w.dataset.subFor === checked.id;
          w.hidden = !active;
          if (active && !$('input:checked', w)) { const f = $('input', w); if (f) f.checked = true; }
        });
        let value = checked ? checked.value : '';
        const subWrap = checked && $(`[data-sub-for="${checked.id}"]`, g);
        const sub = subWrap && $('input:checked', subWrap);
        if (sub) value += ' — ' + sub.value;
        $('[data-group-current]', g).textContent = value;
        if (checked && !checked.hasAttribute('data-default')) parts.push(g.dataset.groupTitle + ': ' + value);
      });
      const note = $('[data-customise-note]', drawer);
      if (note && note.value.trim()) parts.push('Special request: ' + note.value.trim());

      summary.textContent = parts.length ? parts.join(' · ') : emptyText;
      root.classList.toggle('is-customised', parts.length > 0);

      // Mock "line item properties": appended to the variant line in the mock cart
      $$('[data-add]:not([data-ups-proxy]):not(.product-card__arrow)').forEach((b, i) => {
        b.dataset.variant = [baseVariant[i], ...parts].filter(Boolean).join(' · ');
      });

      if (wa) {
        const url = new URL(wa.href);
        url.searchParams.set('text', wa.dataset.baseText + (parts.length ? '\n' + parts.join('\n') : ''));
        wa.href = url.toString();
      }
    };

    drawer.addEventListener('change', update);
    drawer.addEventListener('input', (e) => e.target.matches('[data-customise-note]') && update());
    $('[data-customise-reset]', drawer).addEventListener('click', () => {
      $$('[data-customise-group]', drawer).forEach((g) => {
        $('input[data-option]', g).checked = true;
        $$('[data-sub-for] input', g).forEach((i) => (i.checked = false));
      });
      $('[data-customise-note]', drawer).value = '';
      update();
    });
    $('[data-customise-apply]', drawer).addEventListener('click', () => { update(); closeDrawers(); });
    update();
  }

  /* Tabs (size guide) */
  $$('[data-pdp-tabs]').forEach((r) => {
    const tabs = $$('[role="tab"]', r);
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => tabs.forEach((o) => {
        const sel = o === tab;
        o.setAttribute('aria-selected', sel);
        o.tabIndex = sel ? 0 : -1;
        document.getElementById(o.getAttribute('aria-controls')).hidden = !sel;
      }));
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        n.focus(); n.click();
      });
    });
  });

  /* Sticky bar size selector — synced with the main size pills */
  const stickySelect = $('[data-mock-sticky-size]');
  if (stickySelect) {
    let chosen = false; // the sticky bar asks for an explicit size until the customer picks one
    stickySelect.addEventListener('change', () => {
      chosen = true;
      stickySelect.classList.remove('is-required');
      const pill = $$('.pill').find((p) => p.textContent.trim() === stickySelect.value);
      pill && pill.click();
    });
    $$('.pill').forEach((p) => p.addEventListener('click', () => {
      if (p.classList.contains('is-soldout')) return;
      chosen = true;
      stickySelect.value = p.textContent.trim();
    }));
    // Capture phase so we run before main.js's add-to-cart handler
    document.addEventListener('click', (e) => {
      if (!e.target.closest('[data-sticky-atc]') || chosen) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      stickySelect.classList.remove('is-required');
      void stickySelect.offsetWidth;
      stickySelect.classList.add('is-required');
      stickySelect.focus();
      try { stickySelect.showPicker && stickySelect.showPicker(); } catch (err) { /* ignore */ }
    }, true);
  }

  /* Craft process slider */
  $$('[data-process-slider]').forEach((r) => {
    const track = $('[data-process-track]', r);
    const prev = $('[data-process-prev]', r);
    const next = $('[data-process-next]', r);
    const bar = $('[data-process-progress]', r);
    const step = () => {
      const first = track.firstElementChild;
      return first ? first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) : track.clientWidth;
    };
    const ui = () => {
      const max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max - 2;
      bar.style.transform = `scaleX(${max > 0 ? Math.max(0.08, (track.scrollLeft + track.clientWidth) / track.scrollWidth) : 1})`;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', ui, { passive: true });
    window.addEventListener('resize', ui);
    ui();
  });

  /* Anatomy hotspots */
  $$('[data-anatomy]').forEach((r) => {
    const items = $$('[data-anatomy-index]', r);
    const act = (i) => items.forEach((it) => it.classList.toggle('is-active', it.dataset.anatomyIndex === i));
    items.forEach((it) => ['mouseenter', 'focus', 'click'].forEach((ev) => it.addEventListener(ev, () => act(it.dataset.anatomyIndex))));
    r.addEventListener('mouseleave', () => act(null));
  });

  /* Main image gallery: chevrons, dots, counter */
  $$('.pdp-gallery-wrap').forEach((wrap) => {
    const track = $('.pdp-gallery', wrap);
    const slides = $$('.pdp-gallery__media', track);
    const dots = $$('.pdp-gallery__dots button', wrap.parentElement);
    const prev = $('[data-gallery-dir="-1"]', wrap);
    const next = $('[data-gallery-dir="1"]', wrap);
    const count = $('.pdp-gallery__count', wrap);
    let index = 0;
    const go = (i) => {
      index = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
    };
    const sync = () => {
      index = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
      if (count) count.textContent = `${index + 1} / ${slides.length}`;
      prev.disabled = index === 0;
      next.disabled = index === slides.length - 1;
    };
    prev.addEventListener('click', () => go(index - 1));
    next.addEventListener('click', () => go(index + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
    track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    });
    sync();
  });
})();
