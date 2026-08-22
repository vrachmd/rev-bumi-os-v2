import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('docs/screenshots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const urls = [
  { name: 'shadcn-login', url: 'https://app.revbuminusantara.biz.id', view: 'login' },
  { name: 'shadcn-vercel', url: 'https://rev-bumi-os-v2-web.vercel.app', view: 'login' },
];

const views = [
  'dashboard',
  'deliveries',
  'reconciliation',
  'invoices',
  'payments',
  'customers-projects',
  'contracts',
  'reports',
  'audit-admin',
];

async function shot(url, name) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  console.log(`Goto ${url} ...`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const pathOut = path.join(outDir, `${name}.png`);
    await page.screenshot({ path: pathOut, fullPage: true });
    console.log(`Saved ${pathOut}`);
  } catch (e) {
    console.error(`Fail ${name}:`, e.message);
    // try screenshot anyway
    try { await page.screenshot({ path: path.join(outDir, `${name}-error.png`), fullPage: true }); } catch {}
  }
  await browser.close();
}

for (const u of urls) {
  await shot(u.url, u.name);
}

console.log('Done urls');

// Local dev capture if available (optional)
const localUrl = 'http://localhost:3000';
try {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  console.log(`Trying local ${localUrl} ...`);
  await page.goto(localUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
  await page.waitForTimeout(3000);
  // try to click through tabs if AuthGate bypasses
  for (const v of views) {
    try {
      // Try to find sidebar button with text matching view
      // For now just screenshot current page as dashboard
      await page.screenshot({ path: path.join(outDir, `shadcn-local-${v}.png`), fullPage: true });
      console.log(`Local ${v} saved`);
      // Attempt to navigate via clicking sidebar (best effort)
      // Find button by text
      const btn = page.locator(`button:has-text("${v}")`).first();
      if (await btn.count() > 0) {
        await btn.click().catch(()=>{});
        await page.waitForTimeout(800);
      }
    } catch (e) { console.log(`view ${v} err`, e.message); }
  }
  await browser.close();
} catch (e) {
  console.log('Local not running, skip:', e.message);
}
