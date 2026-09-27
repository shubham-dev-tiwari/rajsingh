/* Home hero options (mockup): switcher + B (Boot Edit film) + C (Chelsea film).
   <html data-hero> is set in <head>; this wires the switcher and the two films.
   Films only play while their hero is chosen and on screen. */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'rs-hero';
  const films = [];

  // A film plays while its hero is chosen, on screen, and not paused by the viewer.
  const film = (section, video, opt) => {
    const f = { section, video, opt, inView: false, userPaused: reduce };
    f.sync = () => {
      const on = root.dataset.hero === opt && f.inView && !f.userPaused;
      if (on && video.paused) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
      if (!on && !video.paused) video.pause();
      section.classList.toggle('is-paused', !on);
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        f.inView = e.isIntersecting;
        f.sync();
        if (root.dataset.hero === opt) document.body.classList.toggle('hero-alt-in-view', e.isIntersecting);
      }, { rootMargin: '0px 0px -40% 0px' }).observe(section);
    } else {
      f.inView = true;
    }
    films.push(f);
    return f;
  };

  /* ---------- Switcher ---------- */
  const picks = $$('[data-hero-pick]');
  const apply = (v, userPicked) => {
    root.dataset.hero = v;
    picks.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.heroPick === v)));
    if (!userPicked) return;
    try { localStorage.setItem(KEY, v); } catch (e) {}
    const url = new URL(location.href);
    url.searchParams.set('hero', v);
    history.replaceState(null, '', url);
    document.body.classList.remove('hero-alt-in-view');
    window.scrollTo(0, 0);
    // Header height and the turntable's scroll range depend on which hero is showing
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));
    films.forEach((f) => f.sync());
  };
  picks.forEach((b) => b.addEventListener('click', () => apply(b.dataset.heroPick, true)));
  apply(root.dataset.hero || 'a', false);

  /* ---------- B · The Boot Edit ---------- */
  const hv = $('.hv');
  if (hv) {
    const video = $('.hv__video', hv);
    const chapters = $$('.hv__chapter', hv);
    const names = $$('[data-hv-name]', hv);
    const num = $('[data-hv-num]', hv);
    const play = $('.hv__play', hv);
    const f = film(hv, video, 'b');
    let active = -1;

    const setActive = (i) => {
      if (i === active) return;
      active = i;
      chapters.forEach((c, n) => {
        c.setAttribute('aria-current', String(n === i));
        $('.hv__bar i', c).style.setProperty('--p', n < i ? 1 : 0);
      });
      const name = $('.hv__name', chapters[i]).textContent;
      names.forEach((n) => { n.textContent = name; });
      num.textContent = $('.hv__num', chapters[i]).textContent;
    };
    const tick = () => {
      const t = video.currentTime;
      let i = 0;
      chapters.forEach((c, n) => { if (t >= +c.dataset.start) i = n; });
      if (i < active && t < 0.5) chapters.forEach((c) => $('.hv__bar i', c).style.setProperty('--p', 0)); // looped
      setActive(i);
      const c = chapters[i];
      const p = (t - +c.dataset.start) / (+c.dataset.end - +c.dataset.start);
      $('.hv__bar i', c).style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
    };
    video.addEventListener('timeupdate', tick);
    chapters.forEach((c) => c.addEventListener('click', () => {
      video.currentTime = +c.dataset.start + 0.05;
      f.userPaused = false;
      tick();
      f.sync();
    }));
    play.addEventListener('click', () => {
      f.userPaused = !video.paused ? true : false;
      f.sync();
      play.setAttribute('aria-label', f.userPaused ? 'Play film' : 'Pause film');
    });
    if (reduce) play.setAttribute('aria-label', 'Play film');
    setActive(0);
  }

  /* ---------- C · Let's do Chelsea ---------- */
  const hc = $('.hc');
  if (hc) {
    const video = $('.hc__video', hc);
    const sound = $('.hc__sound', hc);
    const clock = $('[data-hc-clock]', hc);
    const line = $('.hc__line i', hc);
    const atc = $('.hc__atc', hc);
    const sizes = $$('.hc__size', hc);
    const f = film(hc, video, 'c');

    video.addEventListener('timeupdate', () => {
      const t = video.currentTime;
      clock.textContent = '00:' + String(Math.floor(t)).padStart(2, '0');
      line.style.setProperty('--p', Math.min(1, t / (video.duration || 10)).toFixed(3));
    });
    sound.addEventListener('click', () => {
      const on = sound.getAttribute('aria-pressed') !== 'true';
      video.muted = !on;
      sound.setAttribute('aria-pressed', String(on));
      $('span', sound).textContent = on ? 'Sound on' : 'Sound off';
      if (on) { f.userPaused = false; f.sync(); }
    });
    sizes.forEach((b) => b.addEventListener('click', () => {
      sizes.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      atc.disabled = false;
      atc.dataset.variant = 'UK ' + b.textContent.trim();
      atc.textContent = 'Add to cart · UK ' + b.textContent.trim();
    }));
  }
})();
