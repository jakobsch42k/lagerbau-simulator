import { expect, type Page, test } from '@playwright/test';
import * as fs from 'node:fs/promises';

interface Roh {
  readonly art: string;
  readonly [schluessel: string]: unknown;
}

async function speichern(page: Page): Promise<{ pfad: string; objekte: Roh[] }> {
  const herunterladen = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const pfad = await (await herunterladen).path();
  return { pfad, objekte: (JSON.parse(await fs.readFile(pfad, 'utf-8')) as { objekte: Roh[] }).objekte };
}

/** Planansicht; liefert die Mitte der Leinwand. */
async function plan(page: Page): Promise<{ x: number; y: number }> {
  await page.keyboard.press('p');
  const box = await page.locator('#ansicht canvas').boundingBox();
  if (!box) throw new Error('Keine Leinwand');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Setzt ein Zelt der Vorlage in die Mitte und wählt es danach aus. */
async function setzeZelt(page: Page, vorlage: string, m: { x: number; y: number }): Promise<void> {
  await page.locator('button[data-werkzeug="zelt"]').click();
  await page.locator('#sel-zelt').selectOption({ label: vorlage });
  await page.mouse.click(m.x, m.y);
  await page.locator('button[data-werkzeug="auswahl"]').click();
  await page.mouse.click(m.x, m.y);
}

async function meterProBalken(page: Page): Promise<number> {
  const text = (await page.locator('#massstab span').textContent()) ?? '';
  const breite = (await page.locator('#massstab .massstab-balken').boundingBox())?.width ?? 0;
  return Number.parseFloat(text) / breite;
}

test('Jurte 6er: Wand 2 aus, gedreht, Speichern und Laden ergibt dasselbe', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto('./?t=zelt-jurte');
  const m = await plan(page);
  await setzeZelt(page, 'Jurte 6er', m);
  const panel = page.locator('#parameter');
  await panel.getByLabel('Wand 2').selectOption('aus');
  await panel.getByLabel('Drehung (°)').fill('30');
  await panel.getByLabel('Drehung (°)').press('Tab');
  const erst = await speichern(page);
  const zelt = erst.objekte.find((o) => o.art === 'zelt');
  expect(zelt).toBeDefined();
  expect(JSON.stringify(zelt)).toContain('"vorlage":"jurte6"');

  await page.goto('./?t=zelt-jurte-laden');
  await page.locator('#inp-laden').setInputFiles(erst.pfad);
  const nochmal = await speichern(page);
  expect(nochmal.objekte).toEqual(erst.objekte);
  expect(fehler).toEqual([]);
});

test('Alles zeigen deckt die Haringe eines Doppelkeglers ab', async ({ page }) => {
  await page.goto('./?t=zelt-haringe');
  const m = await plan(page);
  await setzeZelt(page, 'Doppelkegler', m);
  await page.keyboard.press('f');
  const vorher = await meterProBalken(page);
  // Ein größerer Haring-Abstand rückt die Haringe nach außen, das Zelt bleibt gleich: der Ausschnitt muss wachsen.
  const seil = page.locator('#parameter').getByLabel('Haring-Abstand (m)');
  await seil.fill('15');
  await seil.press('Tab');
  await page.keyboard.press('f');
  expect(await meterProBalken(page)).toBeGreaterThan(vorher);
});
