/**
 * Skrip bantuan developer: memakai Chromium headless Playwright (bila tersedia)
 * untuk mengambil tangkapan layar aplikasi yang sedang berjalan.
 *
 * Contoh:
 *   npm run dev                # terminal lain
 *   node scripts/screenshot.mjs http://localhost:5173 out.png
 *
 * Skrip ini opsional; Playwright tidak termasuk dependency proyek.
 */
import { existsSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173';
const target = process.argv[3] ?? 'nota-flow.png';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Playwright tidak terpasang. Jalankan: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });

const template = await page.$('text=Alur Persetujuan');
if (template) await template.click();
await page.waitForTimeout(1200);

await page.screenshot({ path: target });
await browser.close();

if (!existsSync(target)) {
  console.error('Gagal menyimpan tangkapan layar.');
  process.exit(1);
}
console.log(`Tersimpan: ${target}`);
