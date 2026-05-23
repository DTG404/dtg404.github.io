import { firefox } from 'playwright';

const VPS = 'https://srv1630958.tail1d4119.ts.net';

async function main() {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Collect console messages
  page.on('console', msg => console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`));

  await page.goto(`${VPS}/chat/`, { waitUntil: 'networkidle', timeout: 15000 });
  
  // Wait for boot to finish and terminal to appear
  await page.waitForSelector('#terminal', { state: 'visible', timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  // Send a message to get Nyx to respond
  const input = await page.$('#term-input');
  if (input) {
    await input.fill('say something colorful');
    await input.press('Enter');
    await new Promise(r => setTimeout(r, 5000));
  }

  // Now inspect all message elements
  const msgInfo = await page.evaluate(() => {
    const messages = document.querySelectorAll('[class^="msg-"]');
    const results = [];
    messages.forEach(msg => {
      const style = window.getComputedStyle(msg);
      results.push({
        class: msg.className,
        text: msg.textContent.substring(0, 50),
        color: style.color,
        borderLeftColor: style.borderLeftColor,
        fontSize: style.fontSize,
        opacity: style.opacity,
      });
    });
    return results;
  });

  console.log('\n=== Message Styles ===');
  for (const m of msgInfo) {
    console.log(`[${m.class}] color=${m.color} border=${m.borderLeftColor} size=${m.fontSize} op=${m.opacity}`);
    console.log(`  text: "${m.text}"`);
  }

  // Also check CSS variable values
  const cssVars = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      accent: root.style.getPropertyValue('--nyx-accent'),
      accentDim: root.style.getPropertyValue('--nyx-accent-dim'),
      text: root.style.getPropertyValue('--nyx-text'),
    };
  });
  console.log('\n=== CSS Variables on :root ===');
  console.log(JSON.stringify(cssVars));

  // Check if the CSS rule is applied
  const ruleCheck = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes('msg-nyx')) {
            return { sheet: sheet.href || 'inline', rule: rule.cssText };
          }
        }
      } catch(e) { /* cross-origin */ }
    }
    return null;
  });
  console.log('\n=== CSS Rule for msg-nyx ===');
  console.log(JSON.stringify(ruleCheck));

  // Take a screenshot
  await page.screenshot({ path: '/root/projects/dtg404.github.io/chat-screenshot.png', fullPage: false });
  console.log('\nScreenshot saved to chat-screenshot.png');

  await browser.close();
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });