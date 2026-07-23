/** Shared SVG/HTML fragments for the Postpartum Reset lesson guides. */

export const LEAF_DIVIDER = `
<div class="divider" aria-hidden="true">
  <svg width="120" height="22" viewBox="0 0 120 22" xmlns="http://www.w3.org/2000/svg" fill="none">
    <line x1="0" y1="11" x2="44" y2="11" stroke="rgba(200,220,192,0.9)" stroke-width="1.5"/>
    <path d="M60 3 C64 7 66 11 60 19 C54 11 56 7 60 3 Z" fill="#44713B"/>
    <path d="M60 5.5 L60 16.5" stroke="#C8DCC0" stroke-width="1"/>
    <line x1="76" y1="11" x2="120" y2="11" stroke="rgba(200,220,192,0.9)" stroke-width="1.5"/>
  </svg>
</div>`

export function medallion(num, kicker, title) {
  return `
<div class="medallion">
  <svg width="54" height="54" viewBox="0 0 54 54" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    <circle cx="27" cy="27" r="25" fill="#1E3220"/>
    <circle cx="27" cy="27" r="21.5" stroke="#C8980A" stroke-width="1.5"/>
    <text x="27" y="34" text-anchor="middle" font-family="Georgia, serif" font-size="19" font-weight="700" fill="#F0D060">${num}</text>
  </svg>
  <div>
    <div class="m-kicker">${kicker}</div>
    <div class="m-title">${title}</div>
  </div>
</div>`
}

export const GATE_ICON = `
<svg class="g-icon" width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
  <circle cx="15" cy="15" r="14" stroke="#C8980A" stroke-width="1.5"/>
  <path d="M9.5 15.5 L13.5 19.5 L21 11" stroke="#F0D060" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

export function gate(text) {
  return `<div class="gate">${GATE_ICON}<p>${text}</p></div>`
}

/**
 * Tickable habit tracker grid. Each cell is a real checkbox button; state is
 * applied/persisted by TRACKER_SCRIPT (appended to every guide page):
 * inside the lesson page it syncs with Supabase through a postMessage bridge,
 * and in a standalone download it falls back to localStorage.
 */
export function tracker(days = 14, key = 'tracker-1') {
  const cells = Array.from({ length: days }, (_, i) =>
    `<button type="button" class="day" role="checkbox" aria-checked="false" data-day="${i + 1}" aria-label="Day ${i + 1}">${i + 1}</button>`
  ).join('')
  return `<div class="tracker" data-tracker="${key}" role="group" aria-label="${days}-day habit tracker">${cells}</div>
<p class="tracker-count" data-tracker-count="${key}" aria-live="polite"></p>`
}

export const TRACKER_SCRIPT = `
<script>
(function () {
  var trackers = document.querySelectorAll('[data-tracker]');
  if (!trackers.length) return;

  // localStorage throws inside the sandboxed lesson iframe; that's fine,
  // there the parent page persists to Supabase instead.
  function lsGet(key) {
    try { var v = localStorage.getItem('lumora-tracker:' + key); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }
  function lsSet(key, days) {
    try { localStorage.setItem('lumora-tracker:' + key, JSON.stringify(days)); } catch (e) {}
  }

  function cellsOf(el) { return el.querySelectorAll('.day'); }

  function checkedDays(el) {
    var days = [];
    cellsOf(el).forEach(function (c) {
      if (c.getAttribute('aria-checked') === 'true') days.push(parseInt(c.getAttribute('data-day'), 10));
    });
    return days;
  }

  function updateCount(el) {
    var key = el.getAttribute('data-tracker');
    var counter = document.querySelector('[data-tracker-count="' + key + '"]');
    if (!counter) return;
    var n = checkedDays(el).length;
    var total = cellsOf(el).length;
    counter.textContent = n === 0 ? '' : n + ' of ' + total + ' days ticked';
  }

  function applyState(el, days) {
    if (!Array.isArray(days)) return;
    cellsOf(el).forEach(function (c) {
      var on = days.indexOf(parseInt(c.getAttribute('data-day'), 10)) !== -1;
      c.setAttribute('aria-checked', on ? 'true' : 'false');
      c.classList.toggle('checked', on);
    });
    updateCount(el);
  }

  trackers.forEach(function (el) {
    var key = el.getAttribute('data-tracker');
    var saved = lsGet(key);
    if (saved) applyState(el, saved);

    el.addEventListener('click', function (e) {
      var cell = e.target.closest('.day');
      if (!cell) return;
      var on = cell.getAttribute('aria-checked') === 'true';
      cell.setAttribute('aria-checked', on ? 'false' : 'true');
      cell.classList.toggle('checked', !on);
      updateCount(el);
      var days = checkedDays(el);
      lsSet(key, days);
      window.parent.postMessage({ __lumoraTrackerSave: { key: key, days: days } }, '*');
    });
  });

  // Saved state pushed in by the lesson page once it has loaded it.
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || !data.__lumoraTrackerState) return;
    Object.keys(data.__lumoraTrackerState).forEach(function (key) {
      var el = document.querySelector('[data-tracker="' + key + '"]');
      if (el) applyState(el, data.__lumoraTrackerState[key]);
    });
  });
  window.parent.postMessage({ __lumoraTrackerReady: true }, '*');
})();
</script>
`

/**
 * Video embed slots. YouTube's player cannot run inside the lesson page's
 * sandboxed iframe (no allow-same-origin, deliberately), so in that context
 * the guide only reserves the box: it measures each [data-video-src] slot and
 * posts the coordinates to the parent, which overlays a real player exactly
 * on top (see HtmlEmbed in src/app/lesson/[lessonId]/page.tsx) and acks.
 * Opened standalone (downloaded copy), no ack arrives and the guide embeds
 * the player itself, which works in a full browser context.
 */
export const VIDEO_SCRIPT = `
<script>
(function () {
  var slots = Array.prototype.slice.call(document.querySelectorAll('[data-video-src]'));
  if (!slots.length) return;
  var handledByParent = false;
  var postTimer = null;

  function measure() {
    return slots.map(function (el, i) {
      var r = el.getBoundingClientRect();
      return {
        index: i,
        src: el.getAttribute('data-video-src'),
        title: el.getAttribute('data-video-title') || 'Video',
        top: r.top + window.scrollY,
        left: r.left + window.scrollX,
        width: r.width,
        height: r.height
      };
    });
  }
  function post() {
    if (postTimer) return;
    postTimer = setTimeout(function () {
      postTimer = null;
      window.parent.postMessage({ __lumoraVideoSlots: measure() }, '*');
    }, 100);
  }

  window.addEventListener('message', function (e) {
    if (e.data && e.data.__lumoraVideoAck) {
      handledByParent = true;
      slots.forEach(function (el) { el.classList.add('is-remote'); });
    }
  });

  function hydrateLocal() {
    if (handledByParent) return;
    slots.forEach(function (el) {
      if (el.querySelector('iframe')) return;
      var f = document.createElement('iframe');
      f.src = el.getAttribute('data-video-src');
      f.title = el.getAttribute('data-video-title') || 'Video';
      f.setAttribute('allow', 'fullscreen; picture-in-picture');
      f.setAttribute('allowfullscreen', '');
      el.innerHTML = '';
      el.appendChild(f);
    });
  }

  window.addEventListener('load', function () {
    post();
    setTimeout(hydrateLocal, 1200);
  });
  window.addEventListener('resize', post);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(post).observe(document.documentElement);
  }
})();
</script>
`

/** Workout day table. dayTitle e.g. "Day 1 · Lower Body", rows = [[name, sets, reps], ...] */
export function dayTable(dayTitle, rows) {
  const body = rows
    .map(([name, sets, reps]) => `<tr><td>${name}</td><td class="num">${sets}</td><td class="num">${reps}</td></tr>`)
    .join('\n')
  return `
<table>
  <thead><tr><th scope="col">${dayTitle}</th><th scope="col" style="width:72px">Sets</th><th scope="col" style="width:110px">Reps</th></tr></thead>
  <tbody>
${body}
  </tbody>
</table>`
}

/** Hydration cups visual: filled vs outline cups. */
export function cupsRow(filled, total, label) {
  const cup = (isFilled, i) => `
    <svg width="26" height="32" viewBox="0 0 26 32" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
      <path d="M4 4 H22 L19.5 28 H6.5 Z" fill="${isFilled ? '#C8DCC0' : 'none'}" stroke="${isFilled ? '#44713B' : 'rgba(90,107,88,0.5)'}" stroke-width="1.6"/>
      ${isFilled ? '<path d="M7 12 H19 L18 26 H8 Z" fill="#44713B" opacity="0.55"/>' : ''}
    </svg>`
  const cups = Array.from({ length: total }, (_, i) => cup(i < filled, i)).join('')
  return `
<div style="margin:14px 0;">
  <div style="display:flex; gap:5px; flex-wrap:wrap;">${cups}</div>
  <p style="font-size:13px; color:#5A6B58; margin-top:6px;">${label}</p>
</div>`
}

/**
 * Foundation Five warm-up. The deep-core hold position progresses across the
 * program (rehab literature: supine → side-lying/quadruped → standing).
 */
export function foundationFive(position = 'lying on your back') {
  return `
<div class="card tint">
  <h3 style="margin-top:0;">Start every workout: The Foundation Five <span style="font-weight:500; color:#5A6B58;">(~5 minutes)</span></h3>
  <ol>
    <li><strong>360° breathing</strong>: 5 slow breaths. Inhale into your ribs and belly, exhale fully and feel your deep core gently wrap.</li>
    <li><strong>Pelvic tilts</strong>: 10 slow rocks. Flatten your lower back toward the floor on the exhale, release on the inhale.</li>
    <li><strong>Deep-core holds</strong>: 5 × 5-second holds, <strong>${position}</strong>. Exhale, gently draw your lower belly in (about 30% effort, a hug rather than a crunch), and breathe while you hold.</li>
    <li><strong>Glute bridge</strong>: 2 × 10. Exhale up, squeeze at the top, lower with control.</li>
    <li><strong>Bird dog</strong>: 2 × 6 per side. Long spine, no wobble, opposite arm and leg reach.</li>
  </ol>
  <p style="font-size:13.5px; color:#5A6B58; margin-bottom:0;">This is your warm-up <em>and</em> your deep-core rebuild. Do not skip it. It is the most important five minutes of the program.</p>
</div>`
}

export const DAILY_DOSE = `
<div class="card dark">
  <h3 style="margin-top:0;">The Daily Dose: every day, workout or not <span style="font-weight:500; color:rgba(200,220,192,0.8);">(~5 minutes)</span></h3>
  <p><strong>Pelvic floor training</strong> is the single best-proven postpartum exercise, and it works on daily repetition.</p>
  <p><strong>Finding the right muscles:</strong> squeeze as if you're stopping your urine midstream and holding in wind at the same time, then lift up and in. Belly, thighs, and glutes stay soft. If you're unsure you've got it, the video below shows exactly what it should feel like.</p>
  <ul>
    <li><strong>3 rounds of 8 squeezes</strong>: lift for 6 seconds (a slow elevator up, breathing the whole time), rest 6 seconds. Full relaxation between reps matters as much as the lift.</li>
    <li><strong>Finish with 10 quick flicks</strong>: fast lift, fast release.</li>
    <li>Start lying down; graduate to sitting, then standing as it gets easier.</li>
    <li>Keep it up for <strong>at least three months</strong>. Attach it to a feed, a shower, or brushing your teeth.</li>
  </ul>
  <div class="video-embed" data-video-src="https://www.youtube-nocookie.com/embed/-1lViRMMdJg" data-video-title="Real-time guided pelvic floor training with pelvic floor physiotherapist Michelle Kenway"><p class="video-embed-loading">Loading video player…</p></div>
  <p style="font-size:13px; color:rgba(200,220,192,0.8); margin-top:6px;">Follow along in real time with pelvic floor physiotherapist Michelle Kenway (8 min) until the movement feels familiar. Player not loading? <a class="video-link" href="https://www.youtube.com/watch?v=-1lViRMMdJg" target="_blank" rel="noopener" style="font-size:13px;">Watch it on YouTube</a>.</p>
  <p style="margin-bottom:0;"><strong>Plus a daily walk:</strong> start where you are (even 10 minutes) and build gradually toward 30 minutes at a pace where you can talk but you know you're moving.</p>
</div>`

export const SYMPTOM_RULE = `
<div class="safety">
  <p><strong>Your body sets the pace.</strong> If you notice any of these during or after exercise, drop back to the easier version and give it more time:</p>
  <ul>
    <li>Leaking urine, or a feeling of heaviness / dragging in your pelvis</li>
    <li>Doming or coning down the middle of your belly</li>
    <li>Pain, or bleeding that returns or gets heavier after a workout</li>
  </ul>
  <p>These are signals, not failures. If they persist, a pelvic-floor physical therapist is worth their weight in gold.</p>
</div>`
