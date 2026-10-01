// Rendert build/icon.svg mit Playwright-Chromium zu build/icon.png (512 × 512) für electron-builder.
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const svg = await readFile('build/icon.svg', 'utf8');
const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 512, height: 512 } });
await seite.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await seite.locator('svg').screenshot({ path: 'build/icon.png', omitBackground: true });
await browser.close();
