import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

// Ein Dreibein mit flach gespreizten Beinen (asin(1,4 ÷ 2,2) ≈ 40°): R4 meldet es, sonst keine Regel.
const flach = {
  version: 1,
  gruppen: [{ id: 'flach', typ: 'dreibein', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 1.4, durchmesser: 0.08 } }],
  stangen: [],
};

test('R4 abschalten: der Hinweis verschwindet und bleibt nach Speichern und Laden aus (Spec v3, D8)', async ({ page }) => {
  await page.goto(`./?t=regeln#b=${LZString.compressToEncodedURIComponent(JSON.stringify(flach))}`);
  await expect(page.locator('#hinweise')).toContainText('R4: Beine sehr flach gespreizt');
  await page.getByRole('button', { name: 'Regeln…' }).click();
  const r4 = page.getByRole('checkbox', { name: /^R4:/ });
  await expect(r4).toBeDisabled(); // geteilter Link: Ansicht, nur lesbar
  await page.getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(r4).toBeEnabled();
  await r4.uncheck();
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(page.locator('#ausgeschaltet')).toHaveText('Ausgeschaltet: R4');
  const herunterladen = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const datei = await (await herunterladen).path();
  await page.goto('./?t=leer');
  await expect(page.locator('#ausgeschaltet')).toHaveText('');
  await page.locator('#inp-laden').setInputFiles(datei);
  await expect(page.locator('#ausgeschaltet')).toHaveText('Ausgeschaltet: R4');
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
});
