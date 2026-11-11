/* Newesque site — interactions and scroll-driven animations. No libraries. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = () => window.matchMedia('(min-width: 980px)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // Booking/contact API (the Newesque dialer). ?api=... overrides for testing.
  const API = new URLSearchParams(location.search).get('api') || 'https://agency-dialer-production.up.railway.app/api/public/site';
  $('#yr').textContent = new Date().getFullYear();

  /* ── Reveal on scroll ──────────────────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
      e.target.dispatchEvent(new CustomEvent('reveal'));
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
  $$('.rv, .svc').forEach((el) => io.observe(el));
  requestAnimationFrame(() => $('.hero').classList.add('in'));

  /* ── Typing ────────────────────────────────────────────────────────── */
  async function typeInto(el, text, speed = 28) {
    if (reduce) { el.textContent = text; return; }
    for (let i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await sleep(speed); }
  }
  const kicker = $('.typed');
  typeInto(kicker, kicker.dataset.type, 45).then(() => setTimeout(() => kicker.classList.add('done'), 2400));

  const CODE = [
    ['c', '// your new receptionist\n'],
    ['k', 'const '], ['f', 'receptionist'], ['', ' = newesque.'], ['f', 'create'], ['', '({\n'],
    ['', '  business: '], ['s', '"{your business}"'], ['', ',\n'],
    ['', '  hours:    '], ['s', '"24/7"'], ['', ',\n'],
    ['', '  voice:    '], ['s', '"calm, friendly"'], ['', ',\n'],
    ['', '  books:    '], ['f', 'calendar'], ['', ',\n'],
    ['', '  texts:    '], ['s', '"you, after every call"'], ['', '\n})\n\n'],
    ['f', 'receptionist'], ['', '.'], ['f', 'answer'], ['', '('], ['n', 'everyCall'], ['', ') '], ['c', '// ✓ live'],
  ];
  const codeEl = $('#hero-code');
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  (async function typeCode() {
    const full = CODE.map(([c, t]) => (c ? `<span class="tk-${c}">${esc(t)}</span>` : esc(t))).join('');
    if (reduce) { codeEl.innerHTML = full; return; }
    for (;;) {
      let html = '';
      for (const [c, t] of CODE) {
        for (let i = 1; i <= t.length; i++) {
          const part = esc(t.slice(0, i));
          codeEl.innerHTML = html + (c ? `<span class="tk-${c}">${part}</span>` : part) + '<span style="background:#7c3aed;color:#7c3aed">_</span>';
          await sleep(t[i - 1] === '\n' ? 90 : 22);
        }
        html += c ? `<span class="tk-${c}">${esc(t)}</span>` : esc(t);
      }
      codeEl.innerHTML = html;
      await sleep(6000);
    }
  })();

  /* ── Hero phone: ring → conversation → booked → owner notified ─────── */
  const states = Object.fromEntries($$('.st').map((s) => [s.dataset.st, s]));
  const show = (name) => Object.entries(states).forEach(([k, el]) => el.classList.toggle('off', k !== name));
  const bubbles = $('#bubbles'), timer = $('#call-timer'), notif = $('#notif');
  const SCRIPT = [
    ['a', 'Thanks for calling! How can I help you today?'],
    ['c', "Hi, I'd like to book an appointment. Do you have anything tomorrow morning?"],
    ['a', 'Sure. I have 9:00 or 10:30 tomorrow. Which works better for you?'],
    ['c', '10:30 is great.'],
    ['a', "You're all set for 10:30 tomorrow, Daniel. I'll text you a confirmation now."],
  ];
  (async function phoneLoop() {
    if (reduce) { show('booked'); return; }
    for (;;) {
      bubbles.innerHTML = ''; notif.classList.remove('show'); show('ring');
      await sleep(2600);
      show('talk');
      const t0 = Date.now();
      const tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
      for (const [who, text] of SCRIPT) {
        await sleep(who === 'a' ? 900 : 1300);
        const b = document.createElement('div');
        b.className = `bub ${who}`;
        b.textContent = text;
        bubbles.appendChild(b);
        requestAnimationFrame(() => b.classList.add('show'));
        while (bubbles.scrollHeight > bubbles.clientHeight && bubbles.children.length > 2) bubbles.removeChild(bubbles.firstChild);
        await sleep(Math.min(2400, 900 + text.length * 22));
      }
      clearInterval(tick);
      await sleep(600);
      show('booked');
      await sleep(1100);
      notif.classList.add('show');
      await sleep(4200);
    }
  })();

  /* ── Scroll-driven scenes ──────────────────────────────────────────── */
  const header = $('.site-header'), bar = $('.progress i'), mobileBar = $('#mobile-bar');
  const hero = $('.hero'), heroCopy = $('.hero-grid > div:first-child'), codeWin = $('.code-win'), phone = $('.phone');
  const hs = $('#what'), track = $('#hs-track'), cards = $$('.svc', track), hsN = $('#hs-n'), hsBar = $('#hs-bar');
  const steps = $('#steps3'), stepFill = $('#steps3-fill'), stepEls = $$('.s3');
  const vm = $('#vm');
  const progressOf = (el) => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  let lastY = scrollY, velocity = 0, vmX = 0;

  function heroScene(y) {
    if (reduce || y > innerHeight * 1.2) return;
    const k = y / innerHeight;
    if (desktop()) {
      codeWin.style.transform = `translate(${-k * 60}px, ${k * 40}px) rotate(${-3 - k * 4}deg)`;
      phone.style.transform = `translateY(${-k * 120}px) rotate(${2 + k * 5}deg)`;
    }
    heroCopy.style.opacity = String(1 - clamp(k * 1.1, 0, .8));
    heroCopy.style.transform = `translateY(${k * 50}px)`;
  }

  function servicesScene() {
    if (!desktop() || reduce) { track.style.transform = ''; cards.forEach((c) => c.classList.remove('dim')); return; }
    const p = progressOf(hs);
    const max = track.scrollWidth - innerWidth;
    track.style.transform = `translateX(${-max * p}px)`;
    const idx = Math.min(cards.length - 1, Math.round(p * (cards.length - 1)));
    cards.forEach((c, i) => c.classList.toggle('dim', i !== idx));
    hsN.textContent = String(idx + 1).padStart(2, '0');
    hsBar.style.transform = `scaleX(${0.25 + 0.75 * p})`;
  }
  track.addEventListener('scroll', () => { // phones: native swipe
    if (desktop()) return;
    const p = clamp(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth));
    hsN.textContent = String(Math.min(4, Math.round(p * 3) + 1)).padStart(2, '0');
    hsBar.style.transform = `scaleX(${0.25 + 0.75 * p})`;
  }, { passive: true });

  function stepsScene() {
    const r = steps.getBoundingClientRect();
    const p = reduce ? 1 : clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.25));
    stepFill.style.setProperty('--fill', p);
    stepEls.forEach((s, i) => s.classList.toggle('lit', p > i * 0.3 + 0.05));
  }

  function chrome(y) {
    header.classList.toggle('scrolled', y > 30);
    header.classList.toggle('hide', y > 500 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('hide');
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    const bookTop = $('#book').getBoundingClientRect().top;
    mobileBar.classList.toggle('show', y > innerHeight * 0.8 && bookTop > innerHeight * 0.6);
  }

  let ticking = false;
  function frame() {
    ticking = false;
    const y = scrollY;
    velocity = y - lastY;
    chrome(y);
    heroScene(y);
    servicesScene();
    stepsScene();
    lastY = y;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
  addEventListener('resize', frame);
  frame();

  // Marquee: drifts on its own, speeds up and follows the direction you scroll.
  if (!reduce) {
    let speed = 0.6;
    (function loop() {
      speed += ((0.6 + Math.abs(velocity) * 0.35) * (velocity < 0 ? -1 : 1) - speed) * 0.08;
      velocity *= 0.9;
      vmX -= speed;
      const half = vm.scrollWidth / 2;
      if (vmX < -half) vmX += half;
      if (vmX > 0) vmX -= half;
      vm.style.transform = `translateX(${vmX}px)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ── Calculator ────────────────────────────────────────────────────── */
  const calls = $('#c-calls'), rate = $('#c-rate'), job = $('#c-job'), total = $('#o-total');
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  let shownTotal = 0;
  function animateTo(target) {
    const from = shownTotal, start = performance.now(), dur = reduce ? 0 : 500;
    const step = (now) => {
      const k = dur ? Math.min(1, (now - start) / dur) : 1;
      shownTotal = from + (target - from) * (1 - Math.pow(1 - k, 3));
      total.textContent = money(shownTotal);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function calc() {
    [calls, rate, job].forEach((r) => r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`));
    $('#o-calls').textContent = calls.value;
    $('#o-rate').textContent = `${rate.value}%`;
    $('#o-job').textContent = money(job.value);
    animateTo(calls.value * (rate.value / 100) * job.value * 4.33);
  }
  [calls, rate, job].forEach((r) => r.addEventListener('input', calc));
  calc();

  /* ── Service visual: voice waveform ────────────────────────────────── */
  const wave = $('#wave');
  for (let i = 0; i < 34; i++) {
    const b = document.createElement('i');
    b.style.setProperty('--i', i);
    b.style.setProperty('--h', `${30 + Math.round(Math.abs(Math.sin(i * 0.7)) * 60)}%`);
    wave.appendChild(b);
  }

  /* ── Booking ───────────────────────────────────────────────────────── */
  const daysEl = $('#days'), timesEl = $('#times'), form = $('#book-form'), msg = $('#book-msg');
  let slotData = null, chosenDay = null, chosenSlot = null;
  const fmtTime = (iso, tz) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
  const fmtDay = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
  const callFallback = '<p class="slots-msg">Online booking isn’t loading right now. Please call <a href="tel:+12134515035" style="color:#fff">(213) 451-5035</a>, and if I’m busy my AI receptionist will book you in.</p>';

  async function loadSlots() {
    try {
      const r = await fetch(`${API}/slots`, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(r.status);
      slotData = await r.json();
      const days = (slotData.days || []).filter((d) => d.slots && d.slots.length);
      if (!days.length) { timesEl.innerHTML = '<p class="slots-msg">No open times this week. Please call or send a message.</p>'; return; }
      $('#tz-note').textContent = `(${slotData.timezone === 'America/Los_Angeles' ? 'Pacific time' : slotData.timezone.replace('_', ' ')})`;
      daysEl.innerHTML = days.slice(0, 10).map((d) => {
        const dt = fmtDay(d.date);
        return `<button type="button" class="day" data-date="${d.date}" aria-pressed="false"><small>${dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</small><b>${dt.getUTCDate()}</b><small>${dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</small></button>`;
      }).join('');
      $$('.day', daysEl).forEach((b) => b.addEventListener('click', () => pickDay(b.dataset.date)));
      pickDay(days[0].date);
    } catch {
      timesEl.innerHTML = callFallback;
    }
  }
  function pickDay(date) {
    chosenDay = date; chosenSlot = null; form.hidden = true;
    $$('.day', daysEl).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.date === date)));
    const day = slotData.days.find((d) => d.date === date);
    timesEl.innerHTML = day.slots.map((iso) => `<button type="button" class="time" data-iso="${iso}" aria-pressed="false">${fmtTime(iso, slotData.timezone)}</button>`).join('');
    $$('.time', timesEl).forEach((b) => b.addEventListener('click', () => {
      chosenSlot = b.dataset.iso;
      $$('.time', timesEl).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      form.hidden = false;
      $('#book-btn').innerHTML = `Book ${fmtTime(chosenSlot, slotData.timezone)} on ${fmtDay(chosenDay).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })} <span class="chev">&gt;</span>`;
      form.querySelector('input[name=name]').focus({ preventScroll: true });
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }));
  }
  $$('#topics .chip').forEach((c) => c.addEventListener('click', () => c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'))));

  const fieldsFrom = (f) => Object.fromEntries(new FormData(f).entries());
  function showDone(title, text, log) {
    $('#flow-book').hidden = true; $('#msg-form').hidden = true;
    $('#done-title').textContent = title; $('#done-text').textContent = text;
    const pre = $('#done-log'); pre.textContent = '';
    $('#done').hidden = false;
    typeInto(pre, log, 18);
  }
  async function post(path, body) {
    const r = await fetch(`${API}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong'), { status: r.status });
    return j;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = fieldsFrom(form);
    if (!f.name.trim() || f.phone.replace(/\D/g, '').length < 10) { msg.className = 'form-msg err'; msg.textContent = 'Please add your name and a phone number.'; return; }
    const topic = $$('#topics .chip[aria-pressed=true]').map((c) => c.textContent).join(', ');
    const btn = $('#book-btn'); btn.disabled = true; msg.className = 'form-msg'; msg.textContent = 'Booking…';
    try {
      const r = await post('book', { ...f, okToText: !!form.okToText.checked, topic, slotStartIso: chosenSlot });
      const when = new Date(r.slotStart || chosenSlot);
      const nice = when.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: slotData.timezone });
      showDone("You're booked.", `I'll call you on ${nice}.`, `> booking.create()\n  name:  ${f.name}\n  when:  ${nice}\n  phone: ${f.phone}\n✓ added to the calendar`);
    } catch (err) {
      btn.disabled = false;
      msg.className = 'form-msg err';
      msg.textContent = err.status === 409 ? 'That time was just taken. Please pick another one.' : 'Couldn’t book that. Please call (213) 451-5035 instead.';
      if (err.status === 409) loadSlots();
    }
  });

  const msgForm = $('#msg-form'), msgMsg = $('#msg-msg');
  $('#show-msg').addEventListener('click', () => {
    $('#flow-book').hidden = true; $('#done').hidden = true; msgForm.hidden = false; $('#term-title').textContent = 'send-a-message';
    $('#book').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => msgForm.querySelector('input[name=name]').focus({ preventScroll: true }), 500);
  });
  $('#back-to-book').addEventListener('click', () => { msgForm.hidden = true; $('#flow-book').hidden = false; $('#term-title').textContent = 'book-a-call'; });
  msgForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = fieldsFrom(msgForm);
    if (!f.name.trim() || f.phone.replace(/\D/g, '').length < 10) { msgMsg.className = 'form-msg err'; msgMsg.textContent = 'Please add your name and a phone number.'; return; }
    msgMsg.className = 'form-msg'; msgMsg.textContent = 'Sending…';
    try {
      await post('contact', f);
      showDone('Message sent.', "Thanks! I'll call or text you back today.", `> message.send()\n  from:  ${f.name}\n  phone: ${f.phone}\n✓ delivered to Shant`);
    } catch {
      msgMsg.className = 'form-msg err';
      msgMsg.textContent = 'Couldn’t send that. Please call or text (213) 451-5035.';
    }
  });

  /* ── Have it call you (speed-to-lead demo) ─────────────────────────── */
  const cmForm = $('#callme-form'), cmMsg = $('#callme-msg'), calling = $('#calling');
  cmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = fieldsFrom(cmForm);
    const err = (t) => { cmMsg.className = 'form-msg err'; cmMsg.textContent = t; };
    if (!String(f.name || '').trim() || String(f.phone || '').replace(/\D/g, '').length < 10) return err('Please add your first name and a mobile number.');
    if (!cmForm.consent.checked) return err('Please tick the box so we can call you.');
    const btn = $('#callme-btn'); btn.disabled = true; cmMsg.className = 'form-msg'; cmMsg.textContent = 'Starting the call…';
    const t0 = Date.now();
    try {
      await post('callme', { name: f.name, phone: f.phone, consent: true, company_website: f.company_website });
    } catch (x) {
      btn.disabled = false;
      return err(x.message && x.status && x.status < 500 ? x.message : 'Couldn’t start the call. Please call (213) 451-5035 instead.');
    }
    cmForm.hidden = true; calling.hidden = false;
    const clock = $('#calling-clock');
    const tick = setInterval(() => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      clock.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
      if (sec >= 45) {
        clearInterval(tick);
        calling.classList.add('done');
        $('#calling-title').textContent = 'Did it ring?';
        $('#calling-text').innerHTML = 'That’s what every new customer of yours would get. Missed it? Call <a href="tel:+12134515035" style="color:#fff">(213) 451-5035</a> and it will pick up.';
      }
    }, 250);
  });

  const bookIo = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { loadSlots(); bookIo.disconnect(); } }, { rootMargin: '600px' });
  bookIo.observe($('#book'));
})();
