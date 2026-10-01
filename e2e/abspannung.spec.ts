import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

const SPITZE_Y = Math.sqrt(2.2 ** 2 - 0.8 ** 2); // A-Bock 2,4 m, Überstand 0,2 m, Fußabstand 1,6 m
const aBock = {
  id: 'abock',
  typ: 'abock',
  position: [0, 0, 0],
  drehung: Math.PI / 2,
  params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 },
};
const seil = (id: string, x: number) => ({ id, start: [0, SPITZE_Y, 0], ende: [x, 0, 0] });
const link = (seile: readonly object[]) =>
  `#b=${LZString.compressToEncodedURIComponent(JSON.stringify({ version: 2, gruppen: [aBock], stangen: [], seile, baeume: [] }))}`;

test('beidseitig abgespannter A-Bock braucht keine Querverbindung', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(`./?t=beidseitig${link([seil('l', -1.5), seil('r', 1.5)])}`);
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(page.locator('#stangenliste td').filter({ hasText: /^4 m$/ })).toHaveCount(1);
  await expect(page.locator('#stangenliste tr').filter({ hasText: 'Heringe' })).toContainText('2');
  await expect(page.locator('#platzbedarf')).toHaveText('Platzbedarf: 3.0 × 1.6 m');
  expect(fehler).toEqual([]);
});

test('einseitig abgespannter A-Bock meldet R1', async ({ page }) => {
  await page.goto(`./?t=einseitig${link([seil('r', 1.5)])}`);
  await expect(page.locator('#hinweise')).toContainText('A-Bock kann seitlich umkippen');
});
