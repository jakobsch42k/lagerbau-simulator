import { expect, test, type Page } from '@playwright/test';
import LZString from 'lz-string';

// Zwei flach gespreizte Dreibeine (R4 meldet beide) weit auseinander: zwei Bauten; eine Jurte kommt in die Mitte dazu.
const flach = (id: string, x: number) => ({ id, typ: 'dreibein', position: [x, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 1.4, durchmesser: 0.08 } });
const lager = { version: 1, gruppen: [flach('links', -10), flach('rechts', 10)], stangen: [] };

async function ladeUndSetzeJurte(page: Page, t: string): Promise<void> {
  await page.goto(`./?t=${t}#b=${LZString.compressToEncodedURIComponent(JSON.stringify(lager))}`);
  await page.getByRole('button', { name: 'Bearbeiten' }).click();
  await page.keyboard.press('p');
  const box = await page.locator('#ansicht canvas').boundingBox();
  if (!box) throw new Error('Keine Leinwand');
  await page.locator('button[data-werkzeug="zelt"]').click();
  await page.locator('#sel-zelt').selectOption({ label: 'Jurte 6er' });
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.locator('button[data-werkzeug="auswahl"]').click();
}

test('Liste zeigt Bau 1, Bau 2 und die Jurte; Umbenennen überlebt Speichern und Laden, Hinweise nennen den Bau', async ({ page }) => {
  await ladeUndSetzeJurte(page, 'lager-liste');
  await page.getByRole('button', { name: 'Materialliste…' }).click();
  const liste = page.locator('#lagerliste');
  await expect(liste).toContainText('Jurte 6er (1 ×)');
  const felder = liste.getByLabel('Bau-Name');
  await expect(felder.nth(0)).toHaveValue('Bau 1');
  await expect(felder.nth(1)).toHaveValue('Bau 2');

  await felder.nth(0).fill('Küche');
  await felder.nth(0).press('Enter');
  await expect(felder.nth(0)).toHaveValue('Küche');
  await liste.getByRole('button', { name: 'Schließen' }).click();
  await expect(page.locator('#hinweise')).toContainText('„Küche“: R4');

  const herunterladen = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const datei = await (await herunterladen).path();
  await page.goto('./?t=lager-liste-laden');
  await page.locator('#inp-laden').setInputFiles(datei);
  await page.getByRole('button', { name: 'Materialliste…' }).click();
  await expect(page.locator('#lagerliste').getByLabel('Bau-Name').nth(0)).toHaveValue('Küche');
});

test('Ein zu langer Name springt zurück; Zeigen wählt den Bau', async ({ page }) => {
  await ladeUndSetzeJurte(page, 'lager-name');
  await page.getByRole('button', { name: 'Materialliste…' }).click();
  const feld = page.locator('#lagerliste').getByLabel('Bau-Name').nth(0);
  await feld.fill('x'.repeat(41));
  await feld.press('Enter');
  await expect(feld).toHaveValue('Bau 1');
  await expect(page.locator('#meldung')).toHaveText('Name muss 1 bis 40 Zeichen lang sein.');
  await page.locator('#lagerliste').getByRole('button', { name: 'Zeigen' }).first().click();
  await expect(page.locator('#lagerliste')).toBeHidden();
});

test('Drucken ruft window.print; die Druckansicht zeigt nur Liste und Fußzeile', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { druckAufrufe: number }).druckAufrufe = 0;
    window.print = () => { (window as unknown as { druckAufrufe: number }).druckAufrufe += 1; };
  });
  await ladeUndSetzeJurte(page, 'lager-druck');
  await page.getByRole('button', { name: 'Materialliste…' }).click();
  await page.locator('#lagerliste').getByRole('button', { name: 'Drucken' }).click();
  expect(await page.evaluate(() => (window as unknown as { druckAufrufe: number }).druckAufrufe)).toBe(1);

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#ansicht')).toBeHidden();
  await expect(page.locator('.rechts')).toBeHidden();
  await expect(page.locator('header.kopf')).toBeHidden();
  await expect(page.locator('#lagerliste')).toBeVisible();
  await expect(page.locator('#lagerliste h2')).toHaveText('Lagerplan – Materialliste');
  await expect(page.locator('#lagerliste').getByRole('button', { name: 'Drucken' })).toBeHidden();
  await expect(page.locator('footer')).toBeVisible();
});
