/* Newesque site — interactions and animations. No libraries. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Booking/contact API (the Newesque dialer). ?api=... overrides for testing.
  const API = new URLSearchParams(location.search).get('api') || 'https://agency-dialer-production.up.railway.app/api/public/site';

  $('#yr').textContent = new Date().getFullYear();

  /* ── Header: solid after scrolling, hides on the way down ──────────── */
  const header = $('.site-header');
  const bar = $('.progress i');
  const mobileBar = $('#mobile-bar');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 30);
    header.classList.toggle('hide', y > 500 && y > lastY + 4);
    if (y < lastY - 4) header.classList.remove('hide');
    lastY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    const bookTop = $('#book').getBoundingClientRect().top;
    mobileBar.classList.toggle('show', y > innerHeight * 0.8 && bookTop > innerHeight * 0.6);
    stepsProgress();
  };
  addEventListener('scroll', onScroll, { passive: true });

  /* ── Reveal on scroll ──────────────────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
      e.target.dispatchEvent(new CustomEvent('reveal'));
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
  $$('.rv, .svc, #missed, #dash, #flipday').forEach((el) => io.observe(el));
  requestAnimationFrame(() => $('.hero').classList.add('in'));

  /* ── Typing helpers ────────────────────────────────────────────────── */
  async function typeInto(el, text, speed = 28) {
    if (reduce) { el.textContent = text; return; }
    for (let i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await sleep(speed); }
  }
  const kicker = $('.typed');
  typeInto(kicker, kicker.dataset.type, 45).then(() => setTimeout(() => kicker.classList.add('done'), 2400));

  /* ── Hero code window: the receptionist "being written" ────────────── */
  const CODE = [
    ['c', '// your new receptionist'],
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
  async function typeCode() {
    if (reduce) { codeEl.innerHTML = CODE.map(([c, t]) => (c ? `<span class="tk-${c}">${esc(t)}</span>` : esc(t))).join(''); return; }
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
  }
  typeCode();

  /* ── Hero phone: ring → conversation → booked → owner notified ─────── */
  const states = Object.fromEntries($$('.st').map((s) => [s.dataset.st, s]));
  const show = (name) => Object.entries(states).forEach(([k, el]) => el.classList.toggle('off', k !== name));
  const bubbles = $('#bubbles');
  const timer = $('#call-timer');
  const notif = $('#notif');
  const SCRIPT = [
    ['a', 'Thanks for calling! How can I help you today?'],
    ['c', "Hi, I'd like to book an appointment. Do you have anything tomorrow morning?"],
    ['a', 'Sure. I have 9:00 or 10:30 tomorrow. Which works better for you?'],
    ['c', '10:30 is great.'],
    ['a', "You're all set for 10:30 tomorrow, Daniel. I'll text you a confirmation now."],
  ];
  async function phoneLoop() {
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
  }
  phoneLoop();

  /* ── Missed calls lock screen: the clock creeps forward ───────────── */
  $('#missed').addEventListener('reveal', () => {
    const clock = $('#lock-clock');
    const times = ['9:14', '11:02', '1:37'];
    times.forEach((t, i) => setTimeout(() => { clock.textContent = t; }, 300 + i * 600));
  });

  /* ── Calculator ────────────────────────────────────────────────────── */
  const calls = $('#c-calls'), rate = $('#c-rate'), job = $('#c-job'), total = $('#o-total');
  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  let shown = 0;
  function animateTo(target) {
    const from = shown, start = performance.now(), dur = reduce ? 0 : 500;
    const step = (now) => {
      const p = dur ? Math.min(1, (now - start) / dur) : 1;
      shown = from + (target - from) * (1 - Math.pow(1 - p, 3));
      total.textContent = money(shown);
      if (p < 1) requestAnimationFrame(step);
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

  /* ── Service visuals ───────────────────────────────────────────────── */
  const wave = $('#wave');
  for (let i = 0; i < 34; i++) {
    const b = document.createElement('i');
    b.style.setProperty('--i', i);
    b.style.setProperty('--h', `${30 + Math.round(Math.abs(Math.sin(i * 0.7)) * 60)}%`);
    wave.appendChild(b);
  }
  $$('.flip button').forEach((btn) => btn.addEventListener('click', () => {
    const card = btn.closest('.svc');
    const open = card.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.firstChild.textContent = open ? 'Back to plain English ' : "What's under the hood ";
  }));

  /* ── How it works: the line fills as you scroll ────────────────────── */
  const steps = $('#steps');
  const line = $('.steps-line i');
  function stepsProgress() {
    const r = steps.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.6 - r.top) / r.height));
    line.style.setProperty('--fill', p);
    $$('.step', steps).forEach((s) => s.classList.toggle('lit', s.getBoundingClientRect().top < innerHeight * 0.6));
  }

  /* -- Your day: flip every row from "missed" to "answered" -- */
  const fd = $('#flipday');
  const setDay = (withIt) => {
    fd.classList.toggle('with', withIt);
    $$('.seg-btn', fd).forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.v === '1') === withIt)));
  };
  $$('.seg-btn', fd).forEach((b) => b.addEventListener('click', () => setDay(b.dataset.v === '1')));
  // Flip once on its own the first time it comes into view, so people see it move.
  fd.addEventListener('reveal', () => { setTimeout(() => setDay(true), reduce ? 0 : 1600); });

  /* ── Week dashboard: count up, then a live feed ────────────────────── */
  $('#dash').addEventListener('reveal', () => {
    $$('[data-count]').forEach((el) => {
      const target = +el.dataset.count, suffix = el.dataset.suffix || '';
      const start = performance.now(), dur = reduce ? 0 : 1400;
      const step = (now) => {
        const p = dur ? Math.min(1, (now - start) / dur) : 1;
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    feedLoop();
  });
  const FEED = [
    ['8:02 AM', 'ans', 'answered', 'New customer asked about prices, sent details'],
    ['8:47 AM', 'book', 'booked', 'Consultation, Thursday 2:00 PM'],
    ['10:15 AM', 'txt', 'texted back', 'Missed call while you were busy'],
    ['12:31 PM', 'book', 'booked', 'Appointment moved to Friday 9:30 AM'],
    ['2:06 PM', 'msg', 'message', 'Vendor called, wants a callback'],
    ['6:48 PM', 'book', 'booked', 'After hours, tomorrow 11:00 AM'],
    ['9:12 PM', 'ans', 'answered', 'Asked about opening hours'],
    ['7:30 AM', 'txt', 'texted', 'Reminder sent for today’s 9:00 AM'],
  ];
  async function feedLoop() {
    const feed = $('#feed');
    let i = 0;
    for (;;) {
      const [t, cls, label, text] = FEED[i % FEED.length];
      const row = document.createElement('div');
      row.className = 'feed-row';
      row.innerHTML = `<time>${t}</time><span class="tag ${cls}">${label}</span><span>${text}</span>`;
      feed.prepend(row);
      while (feed.children.length > 6) feed.removeChild(feed.lastChild);
      i++;
      await sleep(reduce ? 999999 : 2200);
    }
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

  // Message form
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

  // Load times when the booking section comes near.
  const bookIo = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { loadSlots(); bookIo.disconnect(); } }, { rootMargin: '600px' });
  bookIo.observe($('#book'));

  onScroll();
})();
