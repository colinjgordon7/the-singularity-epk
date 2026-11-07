(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- Starfield: 3D drift, warps with scroll speed, leans with the mouse ---------- */
  const cv = document.getElementById('stars');
  const ctx = cv.getContext('2d');
  let W, H, DPR, stars = [];
  const N = innerWidth < 700 ? 260 : 520;
  const DEPTH = 1000;

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = innerWidth * DPR;
    H = cv.height = innerHeight * DPR;
  }
  function spawn(s, far) {
    s.x = (Math.random() - .5) * 2000;
    s.y = (Math.random() - .5) * 2000;
    s.z = far ? DEPTH : Math.random() * DEPTH;
    s.pz = s.z;
    s.hue = Math.random() < .18 ? 30 : (Math.random() < .3 ? 225 : 0); // amber / blue / white
    return s;
  }
  resize();
  for (let i = 0; i < N; i++) stars.push(spawn({}));
  addEventListener('resize', resize);

  let mx = 0, my = 0, tmx = 0, tmy = 0;
  addEventListener('pointermove', e => { tmx = (e.clientX / innerWidth - .5); tmy = (e.clientY / innerHeight - .5); }, { passive: true });

  let lastY = scrollY, warp = 0;
  function frame() {
    const dy = scrollY - lastY; lastY = scrollY;
    warp += (Math.min(Math.abs(dy), 120) / 120 * 14 - warp) * 0.08;
    mx += (tmx - mx) * .05; my += (tmy - my) * .05;
    const speed = 0.6 + warp;
    const cx = W / 2 - mx * 60 * DPR, cy = H / 2 - my * 60 * DPR;
    const f = Math.min(W, H) * 0.6;

    ctx.fillStyle = 'rgba(4,5,10,.55)';
    ctx.fillRect(0, 0, W, H);
    for (const s of stars) {
      s.pz = s.z;
      s.z -= speed;
      if (s.z < 1) { spawn(s, true); continue; }
      const sx = cx + s.x / s.z * f, sy = cy + s.y / s.z * f;
      const px = cx + s.x / s.pz * f, py = cy + s.y / s.pz * f;
      if (sx < 0 || sx > W || sy < 0 || sy > H) { spawn(s, true); continue; }
      const b = 1 - s.z / DEPTH;
      const a = Math.min(1, b * 1.4);
      ctx.strokeStyle = s.hue === 0 ? `rgba(233,236,245,${a})` : `hsla(${s.hue},100%,75%,${a})`;
      ctx.lineWidth = Math.max(.4, b * 2.2) * DPR;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx + .1, sy + .1); ctx.stroke();
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  ctx.fillStyle = '#04050a'; ctx.fillRect(0, 0, W, H);
  if (reduce) { for (let i = 0; i < 3; i++) frame(); } else requestAnimationFrame(frame);

  /* ---------- Reveal on scroll (staggered per parent) ---------- */
  const reveals = document.querySelectorAll('.reveal');
  const counts = new Map();
  reveals.forEach(el => {
    const n = counts.get(el.parentElement) || 0;
    el.style.setProperty('--d', `${Math.min(n, 6) * 0.08}s`);
    counts.set(el.parentElement, n + 1);
  });
  const rio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
  }), { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  reveals.forEach(el => rio.observe(el));

  /* ---------- Scroll-linked: black hole sinks + scales, band photo parallax ---------- */
  const hole = document.querySelector('.hole');
  const heroText = document.querySelector('.hero__text');
  const band = document.querySelector('.band__photo');
  const bandImg = band.querySelector('img');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = innerHeight;
    const ht = hole.parentElement.getBoundingClientRect().top;
    if (ht > -vh * 1.2 && ht < vh) {
      const p = Math.max(0, -ht / vh);
      hole.style.transform = `scale(${1 + p * .9})`;
      hole.style.opacity = 1 - p * .9;
      heroText.style.transform = `translateY(${p * 80}px) scale(${1 - p * .12})`;
      heroText.style.opacity = 1 - p * 1.3;
    }
    const r = band.getBoundingClientRect();
    if (r.bottom > 0 && r.top < vh) {
      bandImg.style.transform = `translateY(${-(vh - r.top) / (vh + r.height) * 20}%)`;
    }
  }
  if (!reduce) {
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  /* ---------- Videos: autoplay muted in view; tap toggles sound (one at a time) ---------- */
  const figs = [...document.querySelectorAll('.video')];
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target.querySelector('video');
    if (e.isIntersecting && !reduce) v.play().catch(() => {});
    else if (!e.isIntersecting) { v.pause(); v.muted = true; e.target.classList.remove('on'); }
  }), { threshold: 0.35 });
  figs.forEach(fig => {
    vio.observe(fig);
    const v = fig.querySelector('video');
    fig.addEventListener('click', () => {
      const turnOn = v.muted;
      figs.forEach(f => { f.querySelector('video').muted = true; f.classList.remove('on'); });
      if (turnOn) { v.muted = false; v.play().catch(() => {}); fig.classList.add('on'); }
    });
  });
})();

/* ---------- Intro video: sound toggle, pause off-screen, hide bar while on intro ---------- */
(() => {
  const intro = document.getElementById('intro');
  const vid = intro.querySelector('.intro__vid');
  const bg = intro.querySelector('.intro__bg');
  const btn = intro.querySelector('.intro__sound');
  const label = btn.querySelector('.intro__label');
  const sync = () => { if (Math.abs(bg.currentTime - vid.currentTime) > .3) bg.currentTime = vid.currentTime; };
  vid.addEventListener('timeupdate', sync);
  vid.play().catch(() => {});
  function setSound(on) {
    vid.muted = !on;
    intro.classList.toggle('on', on);
    label.textContent = on ? 'Sound off' : 'Sound on';
    btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    if (on) {
      // only one source of audio on the page
      document.querySelectorAll('.video').forEach(f => { f.querySelector('video').muted = true; f.classList.remove('on'); });
      vid.play().catch(() => {});
    }
  }
  btn.addEventListener('click', () => setSound(vid.muted));
  vid.addEventListener('click', () => setSound(vid.muted));
  document.querySelectorAll('.video').forEach(f => f.addEventListener('click', () => setSound(false)));
  new IntersectionObserver(([e]) => {
    document.body.classList.toggle('at-intro', e.intersectionRatio > .6);
    if (e.intersectionRatio > .25) { vid.play().catch(() => {}); bg.play().catch(() => {}); }
    else { vid.pause(); bg.pause(); if (!vid.muted) setSound(false); }
  }, { threshold: [0, .25, .6] }).observe(intro);
})();
