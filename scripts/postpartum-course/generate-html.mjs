#!/usr/bin/env node
/**
 * Generates the Lumora-branded lesson HTML guides for
 * "The Lumora Postpartum Reset" course.
 *
 * Output: docs/course-content/postpartum-reset/*.html
 * These are self-contained files rendered inline on lesson pages
 * (downloads table, file_type text/html) and also downloadable.
 *
 * Run: node scripts/postpartum-course/generate-html.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { LEAF_DIVIDER, TRACKER_SCRIPT } from './helpers.mjs'
import { LESSON_GUIDES } from './lessons.mjs'

const OUT_DIR = path.join(process.cwd(), 'docs', 'course-content', 'postpartum-reset')

const BASE_CSS = `
  :root {
    --page-bg: #F8F6F0; --card-bg: #FFFFFF; --section-tint: #EAF2E4;
    --section-sand: #F0E8D8; --dark: #1E3220; --nav: #162814;
    --ink: #1A2818; --ink-2: #3A4A38; --muted: #5A6B58;
    --green: #44713B; --green-light: #C8DCC0;
    --gold: #C8980A; --gold-deep: #A87808; --gold-soft: #F0D060;
    --border: rgba(200, 220, 192, 0.45);
    --serif: 'Libre Baskerville', Georgia, 'Times New Roman', serif;
    --sans: 'DM Sans', system-ui, -apple-system, sans-serif;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: var(--page-bg); color: var(--ink); font-family: var(--sans); line-height: 1.75; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 40px 22px 64px; }

  .hero { text-align: center; padding: 34px 26px 30px; background: var(--dark); border-radius: 18px; margin-bottom: 30px; }
  .hero .eyebrow { color: var(--green-light); font-size: 11px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; }
  .hero h1 { font-family: var(--serif); color: #FFFFFF; font-size: 30px; line-height: 1.25; font-weight: 700; margin: 12px 0 10px; }
  .hero .sub { color: rgba(200,220,192,0.85); font-size: 14.5px; max-width: 520px; margin: 0 auto; }
  .gold-rule { width: 72px; height: 3px; margin: 16px auto 0; border-radius: 999px;
    background: linear-gradient(to right, #F0D060, #C8980A, #E8C040, #A87808, #D4AC30); }

  h2 { font-family: var(--serif); font-size: 21px; color: var(--ink); margin: 38px 0 6px; line-height: 1.3; }
  h3 { font-family: var(--sans); font-size: 15px; color: var(--ink); margin: 22px 0 6px; font-weight: 700; }
  p { font-size: 15px; color: var(--ink-2); margin: 10px 0; }
  ul, ol { margin: 10px 0 10px 22px; }
  li { font-size: 15px; color: var(--ink-2); margin: 5px 0; }
  strong { color: var(--ink); }
  .label { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--green); margin-top: 34px; }

  .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 16px; padding: 22px 24px; margin: 16px 0; }
  .card.tint { background: var(--section-tint); border-color: transparent; }
  .card.sand { background: var(--section-sand); border-color: transparent; }
  .card.dark { background: var(--dark); border-color: transparent; }
  .card.dark p, .card.dark li { color: var(--green-light); }
  .card.dark h3, .card.dark strong { color: #FFFFFF; }
  .video-link { display: inline-block; margin-top: 4px; font-weight: 700; color: var(--gold-soft); text-decoration: underline; text-underline-offset: 3px; }
  .video-link:hover { color: #FFFFFF; }

  .medallion { display: flex; align-items: center; gap: 14px; margin: 26px 0 8px; }
  .medallion svg { flex-shrink: 0; }
  .medallion .m-title { font-family: var(--serif); font-size: 19px; font-weight: 700; color: var(--ink); }
  .medallion .m-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-deep); }

  .divider { text-align: center; margin: 34px 0; }

  table { width: 100%; border-collapse: collapse; margin: 14px 0; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
  th { background: var(--dark); color: #FFFFFF; font-family: var(--sans); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; padding: 10px 14px; text-align: left; font-weight: 700; }
  td { padding: 10px 14px; font-size: 14.5px; color: var(--ink-2); border-top: 1px solid rgba(200,220,192,0.3); }
  td.num { white-space: nowrap; font-weight: 600; color: var(--ink); }
  tr.day-row td { background: var(--section-tint); font-weight: 700; color: var(--ink); font-family: var(--serif); font-size: 15px; }

  .pill-list { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; padding: 0; list-style: none; }
  .pill-list li { background: #FFFFFF; border: 1px solid var(--border); border-radius: 999px; padding: 6px 14px; font-size: 13.5px; color: var(--ink-2); margin: 0; }

  .gate { display: flex; gap: 14px; align-items: flex-start; background: var(--dark); border-radius: 16px; padding: 20px 22px; margin: 22px 0; }
  .gate p { color: var(--green-light); font-size: 14.5px; margin: 0; }
  .gate strong { color: #FFFFFF; }
  .gate .g-icon { flex-shrink: 0; margin-top: 2px; }

  .note { border-left: 3px solid var(--gold); background: var(--section-sand); border-radius: 0 12px 12px 0; padding: 14px 18px; margin: 16px 0; }
  .note p { margin: 0; font-size: 14px; }
  .safety { border-left: 3px solid #A85C3A; background: #F5E9E1; border-radius: 0 12px 12px 0; padding: 14px 18px; margin: 16px 0; }
  .safety p, .safety li { font-size: 14px; margin: 4px 0; }
  .safety strong { color: #7A3E22; }

  .tracker { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin: 14px 0; }
  .tracker .day { aspect-ratio: 1; border: 1.5px solid var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--muted); background: #FFFFFF; font-family: var(--sans); cursor: pointer; padding: 0; position: relative; transition: background 0.15s, border-color 0.15s; }
  .tracker .day:hover { border-color: var(--green); }
  .tracker .day:focus-visible { outline: 2px solid var(--gold-deep); outline-offset: 2px; }
  .tracker .day.checked { background: var(--section-tint); border-color: var(--green); color: var(--ink); }
  .tracker .day.checked::after { content: '\\2713'; position: absolute; top: 3px; right: 6px; font-size: 11px; color: var(--green); }
  .tracker-count { font-size: 13px; color: var(--muted); margin-top: 2px; min-height: 1.2em; }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 560px) { .grid-2 { grid-template-columns: 1fr; } .wrap { padding: 24px 14px 48px; } .hero h1 { font-size: 24px; } }

  .footer { margin-top: 46px; text-align: center; }
  .footer p { font-size: 12px; color: var(--muted); }
`

function page({ title, sub, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | The Lumora Postpartum Reset</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap');
${BASE_CSS}
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="eyebrow">The Lumora Postpartum Reset</div>
    <h1>${title}</h1>
    ${sub ? `<p class="sub">${sub}</p>` : ''}
    <div class="gold-rule"></div>
  </header>
  ${body}
  <footer class="footer">
    ${LEAF_DIVIDER}
    <p>© Lumora Women · This program is educational and is not medical advice. Always follow the guidance of your own physician or midwife.</p>
  </footer>
</div>
${TRACKER_SCRIPT}
</body>
</html>`
}

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const guide of LESSON_GUIDES) {
  const html = page(guide)
  const file = path.join(OUT_DIR, `${guide.slug}.html`)
  fs.writeFileSync(file, html)
  console.log('wrote', path.relative(process.cwd(), file), `(${(html.length / 1024).toFixed(1)} kB)`)
}
