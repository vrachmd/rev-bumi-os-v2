import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('docs/screenshots');
fs.mkdirSync(outDir, { recursive: true });

const url = 'https://app.revbuminusantara.biz.id';
const email = 'ghifarisausans@gmail.com';
const password = 'Ucihavieri11';

const views = [
  { id: 'dashboard', label: 'Operational Cockpit', file: 'shadcn-dashboard.png' },
  { id: 'deliveries', label: 'Pengiriman & Surat Jalan', file: 'shadcn-deliveries.png' },
  { id: 'reconciliation', label: 'Rekonsiliasi Volume m³', file: 'shadcn-reconciliation.png' },
  { id: 'invoices', label: 'Faktur / Invoices', file: 'shadcn-invoices.png' },
  { id: 'payments', label: 'Pembayaran & Piutang', file: 'shadcn-payments.png' },
  { id: 'customers-projects', label: 'Customer & Proyek', file: 'shadcn-customers.png' },
  { id: 'reports', label: 'Laporan & Ekspor CSV', file: 'shadcn-reports.png' },
  { id: 'audit-admin', label: 'Audit Trail & Koreksi', file: 'shadcn-audit.png' },
  { id: 'contracts', label: 'Kontrak & Fulfillment', file: 'shadcn-contracts.png' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

console.log(`Goto ${url}`);
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: path.join(outDir, 'shadcn-login.png'), fullPage: true });
console.log('login screenshot saved');

// Try to login
try {
  // Find email input
  const emailInput = page.locator('input[type="email"], input[placeholder*="Email"], input[name="email"]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(email);
  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(password);
  const loginBtn = page.locator('button:has-text("Masuk"), button:has-text("Login"), button:has-text("Sign In")').first();
  await loginBtn.click();
  console.log('Clicked login');
  await page.waitForTimeout(5000);
  // Wait for dashboard
  await page.waitForSelector('text=Operational & Commercial Cockpit', { timeout: 15000 }).catch(()=>{});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'shadcn-after-login.png'), fullPage: true });
  console.log('after login screenshot');

  for (const v of views) {
    try {
      // Click sidebar button by label
      const btn = page.locator(`aside button:has-text("${v.label}")`).first();
      let found = await btn.count();
      if (found === 0) {
        // Try alternative: find by text anywhere in sidebar
        const alt = page.locator(`text=${v.label}`).first();
        found = await alt.count();
        if (found > 0) {
          await alt.click().catch(()=>{});
        } else {
          console.log(`Not found sidebar ${v.label}, try direct`);
        }
      } else {
        await btn.click();
      }
      await page.waitForTimeout(2500);
      const outPath = path.join(outDir, v.file);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`Saved ${v.file}`);
    } catch (e) {
      console.log(`Fail view ${v.id}:`, e.message);
    }
  }
} catch (e) {
  console.error('Login fail', e.message);
  await page.screenshot({ path: path.join(outDir, 'shadcn-login-error.png'), fullPage: true });
}

await browser.close();
console.log('Done');
