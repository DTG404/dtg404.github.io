import { chromium, firefox } from 'playwright';

const BASE = 'https://dtg404.github.io';

async function main() {
  for (const browserType of [chromium, firefox]) {
    console.log(`\n═══════════════════════════════════════`);
    console.log(`  Testing ${browserType === chromium ? 'Chromium' : 'Firefox'}`);
    console.log(`═══════════════════════════════════════`);
    
    const browser = await browserType.launch({ headless: true });
    
    // Test 1: Homepage loads
    console.log(`\n── Test 1: Homepage ──`);
    const page = await browser.newPage();
    
    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleMessages.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    
    // Collect network errors
    const requestErrors = [];
    page.on('requestfailed', request => {
      requestErrors.push(`${request.method()} ${request.url()} => ${request.failure().errorText}`);
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        requestErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });
    
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log(`Title: "${await page.title()}"`);
    
    // Check for nav links
    const links = await page.$$eval('a', as => as.map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
    })));
    
    console.log('\nNav links:');
    for (const link of links) {
      if (link.href && (link.href.includes('/nyx') || link.href.includes('/chat') || link.href.includes('/cyberdeck/deck') || link.href.includes('/projects'))) {
        console.log(`  [${link.text}] → ${link.href}`);
      }
    }
    
    const nyxLink = await page.$('a[href*="nyx"]');
    console.log(`\nNyx nav link found: ${nyxLink ? 'YES' : 'NO'}`);
    
    const chatLink = await page.$('a[href*="chat"]');
    console.log(`Chat nav link found: ${chatLink ? 'YES' : 'NO'}`);
    
    const deckLink = await page.$('a[href*="deck"], a[href*="cyberdeck"]');
    console.log(`Cyberdeck nav link found: ${deckLink ? 'YES' : 'NO'}`);
    
    // Test 2: Nyx page
    console.log(`\n── Test 2: /nyx/ page ──`);
    await page.goto(`${BASE}/nyx/`, { waitUntil: 'networkidle', timeout: 15000 });
    const nyxContent = await page.textContent('body');
    console.log(`Nyx page loads: ${nyxContent.length > 100 ? 'YES' : 'NO'}`);
    console.log(`Content length: ${nyxContent.length} chars`);
    
    // Test 3: Chat page
    console.log(`\n── Test 3: /chat/ page ──`);
    const chatPage = await browser.newPage();
    
    const chatConsoleMsgs = [];
    chatPage.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        chatConsoleMsgs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });
    
    const chatRequestErrors = [];
    chatPage.on('requestfailed', request => {
      chatRequestErrors.push(`${request.method()} ${request.url()} => ${request.failure().errorText}`);
    });
    
    chatPage.on('response', response => {
      if (response.status() >= 400) {
        chatRequestErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });
    
    await chatPage.goto(`${BASE}/chat/`, { waitUntil: 'networkidle', timeout: 15000 });
    
    const chatBody = await chatPage.textContent('body');
    console.log(`Chat page loads: ${chatBody.length > 100 ? 'YES' : 'NO'}`);
    console.log(`Content length: ${chatBody.length} chars`);
    console.log(`Preview: "${chatBody.substring(0, 200).replace(/\n/g, ' ')}..."`);
    console.log(`\nChat console errors (${chatConsoleMsgs.length}):`);
    for (const msg of chatConsoleMsgs) {
      console.log(`  ${msg.substring(0, 200)}`);
    }
    console.log(`\nChat network errors (${chatRequestErrors.length}):`);
    for (const err of chatRequestErrors.slice(0, 20)) {
      console.log(`  ${err.substring(0, 200)}`);
    }
    
    // Check if terminal/boot screen is visible
    const isTerminalVisible = chatBody.includes('─') || chatBody.includes('█') || chatBody.includes('▄') || chatBody.includes('nyx') || chatBody.includes('terminal');
    console.log(`\nTerminal/boot screen visible: ${isTerminalVisible ? 'YES' : 'NO'}`);
    
    // Check for Nyx welcome message
    const hasNyxWelcome = chatBody.toLowerCase().includes('nyx') && (chatBody.includes('present') || chatBody.includes('move') || chatBody.includes('welcome') || chatBody.includes('hello'));
    console.log(`Nyx welcome present: ${hasNyxWelcome ? 'YES' : 'NO'}`);
    
    // Check input field
    const inputField = await chatPage.$('input, textarea, [contenteditable]');
    console.log(`Input field found: ${inputField ? 'YES' : 'NO'}`);
    
    console.log(`\n── Network Requests Summary ──`);
    console.log(`Total request errors/failures: ${requestErrors.length + chatRequestErrors.length}`);
    
    // Count 403s
    const rateLimit403s = requestErrors.filter(e => e.includes('403') && e.includes('api.github.com'));
    console.log(`GitHub API 403s: ${rateLimit403s.length}`);
    for (const err of rateLimit403s.slice(0, 5)) {
      console.log(`  ${err.substring(0, 180)}`);
    }
    
    await browser.close();
  }
}

main().catch(console.error);
