import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

const kochstelleOhneFirst = {
  version: 1,
  gruppen: [
    { id: 'abock', typ: 'abock', position: [0, 0, 0], drehung: Math.PI / 2, params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 } },
    { id: 'dreibein', typ: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } },
  ],
  stangen: [],
};

test('Test 10: Kochstelle ohne Hinweise, ohne First meldet R1', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('footer')).toContainText('Ersetzt nicht Sichtprüfung und Probebelastung durch Leiter.');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');

  const hash = `#b=${LZString.compressToEncodedURIComponent(JSON.stringify(kochstelleOhneFirst))}`;
  await page.goto(`./?t=ohne-first${hash}`);
  await expect(page.locator('#hinweise')).toContainText('A-Bock kann seitlich umkippen');
  await expect(page.getByRole('button', { name: 'Bearbeiten' })).toBeVisible();
});

test('kaputter Link zeigt eine Meldung statt abzustürzen', async ({ page }) => {
  await page.goto('./?t=kaputt#b=abc');
  await expect(page.locator('#meldung')).toContainText(/Link ist beschädigt|Ungültige Bauwerk-Daten/);
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
});

test('Link kopieren legt einen Link mit dem Bauwerk in die Zwischenablage', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('./');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  await page.getByRole('button', { name: 'Link kopieren' }).click();
  await expect(page.locator('#meldung')).toHaveText('Link kopiert.');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link.startsWith('http://localhost:4173/lagerbau-simulator/#b=')).toBe(true);
  expect(page.url()).toContain('#b=');
});
