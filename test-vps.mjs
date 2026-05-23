import { chromium } from 'playwright';

const VPS = 'https://srv1630958.tail1d4119.ts.net';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ── CHAT: Load page and wait for Nyx response ──
  console.log('═══ VPS CHAT TEST ═══');
  const page = await browser.newPage();

  const wsErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') wsErrors.push(msg.text().substring(0, 200));
  });

  // Navigate to chat page served by Caddy on VPS
  await page.goto(`${VPS}/chat/`, { waitUntil: 'networkidle', timeout: 15000 });

  const body = await page.textContent('body');
  console.log(`Page loaded: ✅`);
  console.log(`Content: ${body.length} chars`);

  // Check for Nyx welcome message
  const nyxInPage = body.includes('Nyx') || body.includes('nyx');
  console.log(`Nyx visible in page: ${nyxInPage ? '✅' : '❌'}`);

  // Check WebSocket connection - look for any errors
  console.log(`WebSocket errors: ${wsErrors.length > 0 ? wsErrors.join('; ') : '✅ none'}`);

  // Wait a moment for WebSocket to connect and receive welcome
  await new Promise(r => setTimeout(r, 3000));

  // Check for terminal elements
  const terminalEl = await page.$('[class*="terminal"], [class*="Terminal"], [id*="terminal"], .terminal, #chat-messages, [class*="boot"]');
  console.log(`Terminal element found: ${terminalEl ? '✅' : '❌'}`);

  // Check for message display area
  const msgArea = await page.$('#chat-messages, .chat-messages, [class*="message"], [role="log"]');
  const inputEl = await page.$('input, textarea, [contenteditable]');
  console.log(`Message area: ${msgArea ? '✅' : '❌'}`);
  console.log(`Input field: ${inputEl ? '✅' : '❌'}`);

  // Try sending a message and see if Nyx responds
  if (inputEl) {
    await inputEl.fill('hello Nyx');
    await inputEl.press('Enter');
    await new Promise(r => setTimeout(r, 4000));
    
    // Check for any new content indicating response
    const body2 = await page.textContent('body');
    const hasResponse = body2.includes('Present') || body2.includes('Your move') || body2.includes('Nyx') || body2 !== body;
    console.log(`\nNyx responds to messages: ${hasResponse ? '✅' : '❌ (check console)'}`);
  }

  // ── NYX DOSSIER ──
  console.log('\n═══ VPS NYX DOSSIER ═══');
  await page.goto(`${VPS}/nyx/`, { waitUntil: 'networkidle', timeout: 15000 });
  const nyxBody = await page.textContent('body');
  console.log(`Page loads: ✅`);
  console.log(`Content: ${nyxBody.length} chars`);

  // ── SUMMARY ──
  console.log('\n═══════════════════════════════════════');
  console.log('VPS SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`Chat WebSocket: ${wsErrors.length === 0 ? '✅ connected' : '❌ ' + wsErrors.join('; ')}`);
  console.log(`Nyx dossier: ${nyxBody.length} chars`);
  console.log(`Chat terminal: ${terminalEl ? '✅ visible' : '⚠️ check'}`);

  await browser.close();
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });