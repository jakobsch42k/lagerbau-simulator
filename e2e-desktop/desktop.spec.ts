import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

const PAGES = 'https://jakobsch42k.github.io/lagerbau-simulator/';
const NUR_LOKAL = /^(file|blob|data):/;

let programm: ElectronApplication;
let fenster: Page;

test.beforeEach(async () => {
  programm = await electron.launch({ args: ['.'] });
  fenster = await programm.firstWindow();
  await fenster.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await programm.close();
});

test('öffnet ein Fenster im Editor-Modus mit Fußzeile', async () => {
  const titel = await programm.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle());
  expect(titel).toBe('Lagerbau-Simulator');
  await expect(fenster.locator('footer')).toContainText('Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.');
  await expect(fenster.getByRole('button', { name: 'Dreibein setzen' })).toBeVisible();
  await expect(fenster.getByRole('button', { name: 'Bearbeiten' })).toBeHidden();
  expect(await fenster.evaluate(() => window.isSecureContext)).toBe(true);
});

test('Beispiel laden zeigt keine Hinweise und die Stangenliste', async () => {
  await fenster.getByRole('button', { name: 'Beispiel laden' }).click();
  await expect(fenster.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(fenster.locator('#stangenliste')).toContainText('2.4 m');
});

test('Link kopieren legt einen Link auf die Web-Version in die Zwischenablage', async () => {
  await programm.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].focus());
  await fenster.getByRole('button', { name: 'Beispiel laden' }).click();
  await fenster.getByRole('button', { name: 'Link kopieren' }).click();
  await expect(fenster.locator('#meldung')).toHaveText('Link kopiert.');
  const link = await programm.evaluate(({ clipboard }) => clipboard.readText());
  expect(link.startsWith(`${PAGES}#b=`)).toBe(true);
});

test('lädt nichts aus dem Netz', async () => {
  const anfragen: string[] = [];
  fenster.on('request', (anfrage) => anfragen.push(anfrage.url()));
  await Promise.all([
    fenster.waitForEvent('load'),
    programm.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.reload()),
  ]);
  await fenster.getByRole('button', { name: 'Beispiel laden' }).click();
  await expect(fenster.locator('#hinweise')).toHaveText('Keine Hinweise.');
  expect(anfragen.some((url) => url.startsWith('file:'))).toBe(true);
  expect(anfragen.filter((url) => !NUR_LOKAL.test(url))).toEqual([]);
});

test('bleibt in der App, wenn eine Seite wegnavigieren will', async () => {
  expect(await fenster.evaluate(() => window.open('https://example.com/') === null)).toBe(true);
  await fenster.evaluate(() => {
    location.href = 'https://example.com/';
  });
  await fenster.waitForTimeout(1000);
  expect(fenster.url().startsWith('file:')).toBe(true);
  // isVisible statt expect().toBeVisible(): Playwright hält die abgebrochene Navigation für unfertig (siehe CLAUDE.md).
  expect(await fenster.locator('footer').isVisible()).toBe(true);
  expect(programm.windows()).toHaveLength(1);
});
