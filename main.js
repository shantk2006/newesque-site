/* Newesque site — interactions and motion. No libraries.
   Everything that loops pauses when it is off screen. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Booking/contact API (the Newesque dialer). ?api=... overrides for testing.
  const API = new URLSearchParams(location.search).get('api') || 'https://agency-dialer-production.up.railway.app/api/public/site';
  $('#yr').textContent = new Date().getFullYear();

  /* ── Scramble-in text ──────────────────────────────────────────────── */
  const GLYPHS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789<>/=+*';
  function scramble(el) {
    if (reduce || el.dataset.done) return;
    el.dataset.done = '1';
    const final = el.textContent;
    const start = performance.now();
    const dur = Math.min(900, 300 + final.length * 45);
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const fixed = Math.floor(p * final.length);
      let out = '';
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        out += i < fixed || ch === ' ' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  }

  /* ── Count up ──────────────────────────────────────────────────────── */
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const to = Number(el.dataset.count) || 0;
    if (reduce) { el.textContent = to; return; }
    const start = performance.now(), dur = 1400;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ── Reveal on scroll ──────────────────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      el.classList.add('in');
      $$('[data-scramble]', el).forEach(scramble);
      if (el.matches('[data-scramble]')) scramble(el);
      $$('[data-count]', el).forEach(countUp);
      io.unobserve(el);
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
  $$('.rv, .stage, .h2').forEach((el) => io.observe(el));

  /* ── Hero intro ────────────────────────────────────────────────────── */
  const hero = $('.hero');
  requestAnimationFrame(() => {
    hero.classList.add('loaded');
    setTimeout(() => $$('[data-scramble]', hero).forEach(scramble), 150);
  });

  /* ── Waveform bars (hero + dark CTA) ───────────────────────────────── */
  const small = window.matchMedia('(max-width: 640px)').matches;
  $$('.wave').forEach((w, wi) => {
    const n = small ? 7 : 13;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const b = document.createElement('i');
      const env = wi % 2 === 0 ? 1 - i / n : (i + 1) / n; // taller toward the outside edge
      b.style.setProperty('--h', `${Math.round(28 + env * 52 + Math.random() * 18)}%`);
      b.style.setProperty('--t', `${(2.4 + Math.random() * 2).toFixed(2)}s`);
      b.style.setProperty('--dl', `${(-Math.random() * 3).toFixed(2)}s`);
      frag.appendChild(b);
    }
    w.appendChild(frag);
  });
  // Pause looping decorations when their section is off screen.
  const pauseIO = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle('paused', !e.isIntersecting);
  });
  $$('.hero, .cta-dark, .stage').forEach((el) => pauseIO.observe(el));

  /* ── Nav + mobile bar ──────────────────────────────────────────────── */
  const nav = $('#nav'), bar = $('#mobile-bar');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 30);
      bar.classList.toggle('show', y > window.innerHeight * 0.85);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  const menuBtn = $('.menu-btn'), menu = $('#mobile-menu');
  menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    nav.classList.add('scrolled');
  });
  $$('a', menu).forEach((a) => a.addEventListener('click', () => { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); }));

  /* ── Scroll parallax: one --p variable per visible section ────────── */
  if (!reduce) {
    const visible = new Set();
    let parTick = false;
    const update = () => {
      parTick = false;
      const vh = window.innerHeight;
      for (const el of visible) {
        const r = el.getBoundingClientRect();
        // +1 entering from below, 0 centered, -1 leaving above.
        const p = Math.max(-1.5, Math.min(1.5, (r.top + Math.min(r.height, vh) / 2 - vh / 2) / vh));
        el.style.setProperty('--p', p.toFixed(3));
      }
    };
    const queue = () => { if (!parTick) { parTick = true; requestAnimationFrame(update); } };
    const parIO = new IntersectionObserver((es) => {
      for (const e of es) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }
      queue();
    }, { rootMargin: '200px 0px' });
    $$('section, .cta-dark').forEach((el) => parIO.observe(el));
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
  }

  /* ── Service tabs ──────────────────────────────────────────────────── */
  const tabs = $$('.tabs .tab');
  function selectTab(t, focus) {
    tabs.forEach((x) => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
    $$('[data-count]', $('#' + t.getAttribute('aria-controls'))).forEach(countUp);
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        selectTab(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length], true);
      }
    });
  });
  // Count the first panel's numbers when the card comes into view.
  new IntersectionObserver((es, ob) => { if (es[0].isIntersecting) { $$('#p-desk [data-count]').forEach(countUp); ob.disconnect(); } }, { threshold: 0.3 }).observe($('.panel-card'));

  /* ── Lead scan: a ringing phone "calls" each dot ───────────────────── */
  const scan = $('.scan'), dotsEl = $('.dots'), scanner = $('.scanner');
  const dots = Array.from({ length: 12 }, () => { const i = document.createElement('i'); dotsEl.appendChild(i); return i; });
  let scanTimer = null;
  function scanStep() {
    const open = dots.filter((d) => !d.classList.contains('called'));
    if (!open.length) { setTimeout(() => dots.forEach((d) => d.classList.remove('called')), 900); return; }
    const d = open[(Math.random() * open.length) | 0];
    const sr = scan.getBoundingClientRect(), dr = d.getBoundingClientRect();
    scanner.style.transform = `translate(${dr.left - sr.left + dr.width / 2}px, ${dr.top - sr.top + dr.height / 2}px)`;
    setTimeout(() => d.classList.add('called'), 650);
  }
  new IntersectionObserver((es) => {
    const vis = es[0].isIntersecting;
    if (vis && !scanTimer && !reduce) { scanStep(); scanTimer = setInterval(scanStep, 1100); }
    if (!vis && scanTimer) { clearInterval(scanTimer); scanTimer = null; }
  }, { threshold: 0.25 }).observe(scan);
  if (reduce) dots.forEach((d) => d.classList.add('called'));

  /* ── Steps: light up one by one, beam follows ──────────────────────── */
  const steps = $('#steps'), stepEls = $$('#steps li'), beam = $('.beam');
  let stepRun = 0;
  async function runSteps() {
    const run = ++stepRun;
    while (run === stepRun) {
      for (let i = 0; i < stepEls.length; i++) {
        if (run !== stepRun) return;
        const li = stepEls[i];
        const sr = steps.getBoundingClientRect(), lr = li.getBoundingClientRect();
        beam.style.setProperty('--bx', `${lr.left - sr.left + lr.width / 2 - beam.offsetWidth / 2}px`);
        li.classList.add('lit');
        await sleep(750);
      }
      await sleep(2200);
      if (run !== stepRun) return;
      stepEls.forEach((li) => li.classList.remove('lit'));
      await sleep(500);
    }
  }
  new IntersectionObserver((es) => {
    const vis = es[0].isIntersecting;
    steps.classList.toggle('in', vis);
    if (vis && !reduce) runSteps(); else stepRun++;
    if (reduce) stepEls.forEach((li) => li.classList.add('lit'));
  }, { threshold: 0.3 }).observe(steps);

  /* ── Industries ────────────────────────────────────────────────────── */
  const IND = [
    { k: 'Plumbing', i: '🔧', chat: [['c', 'Hi, my water heater is leaking all over the garage.'], ['a', "Sorry to hear that. Is the water still running, or were you able to shut the valve off?"], ['c', "It's still dripping."], ['a', "Okay, I'm flagging this as urgent. I can have someone out today at 3 or first thing tomorrow at 8. Which works better?"]], h: ['Emergency calls flagged urgent', 'Service area questions', 'Estimate requests', 'Reschedules'] },
    { k: 'HVAC', i: '❄️', chat: [['c', 'My AC stopped blowing cold air.'], ['a', 'Got it. Is it running and blowing warm air, or not turning on at all?'], ['c', "It's running but warm."], ['a', 'Okay. I have a technician available tomorrow at 9 or at 1. Which time is better for you?']], h: ['Maintenance plan questions', 'After-hours no-cool calls', 'Install and replacement quotes', 'Warranty questions'] },
    { k: 'Electrical', i: '⚡', chat: [['c', 'Half the outlets in my kitchen stopped working.'], ['a', 'Okay. Have you checked the breaker panel, or would you rather we take a look?'], ['c', "I'd rather you look."], ['a', 'No problem. I can book an electrician Thursday at 10 or Friday at 2. Which one works?']], h: ['Panel upgrade quotes', 'EV charger installs', 'Safety concerns flagged urgent', 'Permit questions'] },
    { k: 'Roofing', i: '🏠', chat: [['c', "There's a leak in my ceiling after the rain."], ['a', "Sorry about that. Is it actively dripping right now?"], ['c', 'A little, yes.'], ['a', "Okay, I'll mark it urgent. We can send someone for an inspection tomorrow at 8 or 11. Which is better?"]], h: ['Free inspection requests', 'Insurance claim questions', 'Storm damage calls', 'Gutter and repair quotes'] },
    { k: 'Garage Doors', i: '🚪', chat: [['c', "My garage door won't open and my car is stuck inside."], ['a', 'That sounds stressful. Did you hear a loud bang, like a spring snapping?'], ['c', 'Yes, last night.'], ['a', "That's usually the spring. I can get a technician out this afternoon at 2. Does that work?"]], h: ['Broken spring emergencies', 'Opener installs', 'Same-day requests', 'Price questions'] },
    { k: 'Landscaping', i: '🌿', chat: [['c', 'Do you do weekly lawn service?'], ['a', 'We do. Is this for a front yard, backyard, or both?'], ['c', 'Both, about a quarter acre.'], ['a', 'Great. I can set up a free estimate visit Monday at 10 or Tuesday at 3. Which one works?']], h: ['Recurring service signups', 'Estimate visits', 'Irrigation repairs', 'Seasonal cleanups'] },
    { k: 'Dental', i: '🦷', chat: [['c', "I chipped a tooth and it's a little sensitive."], ['a', "I'm sorry. Are you in a lot of pain, or is it mostly sensitive?"], ['c', 'Mostly sensitive.'], ['a', 'Okay. I have an opening tomorrow at 9:30 or 2:15. Would either of those work?']], h: ['New patient bookings', 'Insurance questions', 'Emergency visits', 'Cleaning reminders'] },
    { k: 'Auto Repair', i: '🚗', chat: [['c', 'My check engine light came on this morning.'], ['a', 'Okay. Is the car driving normally, or is it shaking or losing power?'], ['c', "It's driving okay."], ['a', 'Good. We can run a diagnostic tomorrow at 8 or 12. Which time works for drop-off?']], h: ['Diagnostic bookings', 'Oil change appointments', 'Tow and pickup questions', 'Status updates'] },
  ];
  const indList = $('.ind-list');
  IND.forEach((d, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.innerHTML = `<i aria-hidden="true">${d.i}</i>${d.k}`;
    b.addEventListener('click', () => showInd(idx));
    indList.appendChild(b);
  });
  let indTimer = null, indChosen = false;
  function showInd(idx, auto) {
    if (!auto) indChosen = true;
    const d = IND[idx];
    $$('button', indList).forEach((b, i) => b.setAttribute('aria-selected', String(i === idx)));
    $('#ind-icon').textContent = d.i;
    $('#ind-title').textContent = d.k;
    $('#ind-chat').innerHTML = d.chat.map(([who, t], i) => `<div class="bubble ${who}" style="animation-delay:${i * 0.18}s"><small>${who === 'c' ? 'Caller' : 'Your AI receptionist'}</small>${t}</div>`).join('');
    $('#ind-handles').innerHTML = d.h.map((t, i) => `<li style="animation-delay:${0.1 + i * 0.08}s">${t}</li>`).join('');
  }
  showInd(0, true);
  // Gently cycle through trades until someone picks one.
  new IntersectionObserver((es) => {
    const vis = es[0].isIntersecting;
    if (vis && !indTimer && !reduce) indTimer = setInterval(() => { if (indChosen) return; const cur = $$('button', indList).findIndex((b) => b.getAttribute('aria-selected') === 'true'); showInd((cur + 1) % IND.length, true); }, 6000);
    if (!vis && indTimer) { clearInterval(indTimer); indTimer = null; }
  }, { threshold: 0.3 }).observe($('.ind'));

  /* ── Calculator ────────────────────────────────────────────────────── */
  const cCalls = $('#c-calls'), cRate = $('#c-rate'), cJob = $('#c-job');
  const fmt$ = (n) => '$' + Math.round(n).toLocaleString('en-US');
  function calc() {
    [cCalls, cRate, cJob].forEach((r) => r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`));
    $('#o-calls').textContent = cCalls.value;
    $('#o-rate').textContent = cRate.value + '%';
    $('#o-job').textContent = fmt$(cJob.value);
    $('#o-total').textContent = fmt$(cCalls.value * (cRate.value / 100) * cJob.value * 4.33);
  }
  [cCalls, cRate, cJob].forEach((r) => r.addEventListener('input', calc));
  calc();

  /* ── Shared form helpers ───────────────────────────────────────────── */
  const fieldsFrom = (f) => Object.fromEntries(new FormData(f).entries());
  async function post(path, body) {
    const r = await fetch(`${API}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong'), { status: r.status });
    return j;
  }
  async function typeInto(el, text, speed = 18) {
    if (reduce) { el.textContent = text; return; }
    for (let i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await sleep(speed); }
  }

  /* ── Have it call you (hero) ───────────────────────────────────────── */
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
        $('#calling-text').innerHTML = 'That’s what every new customer of yours would get. Missed it? Call <a href="tel:+12134515035">(213) 451-5035</a>.';
      }
    }, 250);
  });

  /* ── Booking ───────────────────────────────────────────────────────── */
  const daysEl = $('#days'), timesEl = $('#times'), form = $('#book-form'), msg = $('#book-msg');
  let slotData = null, chosenDay = null, chosenSlot = null;
  const fmtTime = (iso, tz) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz });
  const fmtDay = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
  const callFallback = '<p class="slots-msg">Online booking isn’t loading right now. Please call <a href="tel:+12134515035">(213) 451-5035</a>, and if I’m busy my AI receptionist will book you in.</p>';

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
      $('#book-btn').textContent = `Book ${fmtTime(chosenSlot, slotData.timezone)} on ${fmtDay(chosenDay).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}`;
      form.querySelector('input[name=name]').focus({ preventScroll: true });
      form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    }));
  }
  $$('#topics .chip').forEach((c) => c.addEventListener('click', () => c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'))));

  function showDone(title, text, log) {
    $('#flow-book').hidden = true; $('#msg-form').hidden = true;
    $('#done-title').textContent = title; $('#done-text').textContent = text;
    const pre = $('#done-log'); pre.textContent = '';
    $('#done').hidden = false;
    typeInto(pre, log);
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
    $('#flow-book').hidden = true; $('#done').hidden = true; msgForm.hidden = false; $('#term-title').textContent = 'Send a message';
    $('#book').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => msgForm.querySelector('input[name=name]').focus({ preventScroll: true }), 500);
  });
  $('#back-to-book').addEventListener('click', () => { msgForm.hidden = true; $('#flow-book').hidden = false; $('#term-title').textContent = 'Book a call'; });
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

  const bookIo = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { loadSlots(); bookIo.disconnect(); } }, { rootMargin: '600px' });
  bookIo.observe($('#book'));
})();
