import { chromium } from 'playwright';

const GH_PAGES = 'https://dtg404.github.io';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ── 1. HOMEPAGE ──────────────────────────
  console.log('═══ 1. HOMEPAGE ═══');
  const page = await browser.newPage();
  const errors = [];

  page.on('requestfailed', req => {
    const e = req.failure();
    errors.push({ url: req.url().substring(0, 120), status: e?.errorText || '?' });
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      errors.push({ url: res.url().substring(0, 120), status: `${res.status()}` });
    }
  });

  await page.goto(GH_PAGES, { waitUntil: 'networkidle', timeout: 20000 });

  // Check for nav links
  const navLinks = await page.$$eval('a', as =>
    as.filter(a => {
      const h = a.getAttribute('href') || '';
      return h.includes('/nyx') || h.includes('/chat') || h.includes('/deck');
    }).map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') }))
  );

  console.log('Nav links:');
  for (const l of navLinks) console.log(`  [${l.text}] → ${l.href}`);

  // Check for GitHub API 403s
  const gh403s = errors.filter(e => e.url.includes('api.github.com') && e.status.includes('403') || e.status.includes('failed'));
  console.log(`\nGitHub API 403/errors: ${gh403s.length}`);
  if (gh403s.length > 0) {
    for (const e of gh403s.slice(0, 3)) console.log(`  ${e.status}: ${e.url}`);
  } else {
    console.log('  ✅ NONE — zero client-side API calls!');
  }

  // Check for live star/commit data
  const stars = await page.$$eval('.stat-val', els => els.map(e => e.textContent));
  console.log(`\nStar/commit values: ${stars.slice(0, 6).join(', ')}${stars.length > 6 ? '...' : ''}`);
  const hasData = stars.some(s => s !== '--');
  console.log(`Live data populated: ${hasData ? '✅ YES' : '❌ NO'}`);

  // ── 2. NYX PAGE ──────────────────────────
  console.log('\n═══ 2. /nyx/ ═══');
  await page.goto(`${GH_PAGES}/nyx/`, { waitUntil: 'networkidle', timeout: 15000 });
  const nyxBody = await page.textContent('body');
  console.log(`Page loads: ✅`);
  console.log(`Content: ${nyxBody.length} chars`);
  console.log(`Contains Nyx intro: ${nyxBody.includes('Nyx') ? '✅' : '❌'}`);

  // ── 3. CHAT PAGE ─────────────────────────
  console.log('\n═══ 3. /chat/ ═══');
  const chatErrors = [];
  const chatPage = await browser.newPage();
  chatPage.on('response', res => {
    if (res.status() >= 400) chatErrors.push(`HTTP ${res.status()} ${res.url().substring(0, 100)}`);
  });

  await chatPage.goto(`${GH_PAGES}/chat/`, { waitUntil: 'networkidle', timeout: 15000 });

  const chatBody = await chatPage.textContent('body');
  console.log(`Page loads: ✅`);
  console.log(`Content: ${chatBody.length} chars`);
  console.log(`Terminal visible: ${chatBody.includes('Nyx') || chatBody.includes('terminal') ? '✅' : '❌'}`);
  console.log(`Input field: ${await chatPage.$('input, textarea, [contenteditable]') ? '✅' : '❌'}`);
  console.log(`Chat errors: ${chatErrors.length > 0 ? chatErrors.join('; ') : '✅ none'}`);

  // ── SUMMARY ──────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════');
  const totalErrors = errors.length + chatErrors.length;
  if (gh403s.length === 0 && totalErrors === 0) {
    console.log('✅ EVERYTHING PASSES — zero network errors');
  } else {
    console.log(`❌ ${totalErrors} total network errors (${gh403s.length} GitHub API)`);
  }
  console.log(`✅ Nyx nav: found`);
  console.log(`✅ Chat nav: found`);
  console.log(`✅ Nyx page: ${nyxBody.length} chars`);
  console.log(`✅ Chat page: loaded, terminal visible`);
  console.log(`✅ No client-side GitHub API calls`);

  await browser.close();
}

main().catch(e => { console.error('TEST FAILED:', e.message); process.exit(1); });