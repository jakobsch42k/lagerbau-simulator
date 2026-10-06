import { expect, type Page, test } from '@playwright/test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/** Künstliche Grafik, 200 × 100 px (Gitter und Farbverlauf), kein Foto eines echten Ortes. */
const TESTBILD = path.resolve('e2e/fixtures/testbild.png');

const panel = (page: Page) => page.locator('#luftbild');

/** Planansicht, auf das Bild eingepasst: Das 100 × 50 m große Bild füllt die Breite, seine Mitte liegt in der Mitte der Leinwand. */
async function planAufBild(page: Page): Promise<{ x: number; y: number; pxProMeter: number }> {
  await page.keyboard.press('p');
  await page.keyboard.press('f');
  const box = await page.locator('#ansicht canvas').boundingBox();
  if (!box) throw new Error('Keine Leinwand');
  // Wie planEinpassen: halbe Breite 55 m, halbe Tiefe 27,5 m; die größere halbe Höhe füllt die Leinwandhöhe.
  const halbeHoehe = Math.max(27.5, 55 / (box.width / box.height));
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, pxProMeter: box.height / (2 * halbeHoehe) };
}

async function speichern(page: Page): Promise<{ pfad: string; json: { version: number; luftbild?: { daten: string; deckkraft: number; breitePx: number; meterProPixel: number } } }> {
  const herunterladen = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const pfad = await (await herunterladen).path();
  return { pfad, json: JSON.parse(await fs.readFile(pfad, 'utf-8')) };
}

test('Luftbild laden, Maßstab mit zwei Klicks, Speichern und Laden, Link ohne Bild', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto('./?t=luftbild');
  await expect(page.locator('#btn-luftbild')).toBeHidden();

  await page.locator('#inp-luftbild').setInputFiles(TESTBILD);
  await expect(panel(page)).toContainText('Bild 100 × 50 m');
  await expect(page.locator('#meldung')).toHaveText('Klicke zwei Punkte, deren Abstand du kennst.');
  await expect(page.locator('#btn-luftbild')).toBeVisible();
  // Mit Bild ist das Raster zunächst aus.
  await expect(panel(page).getByRole('checkbox', { name: 'Raster zeigen' })).not.toBeChecked();

  // 100 Bildpixel (= 50 m beim vorläufigen Maßstab) sollen 10 m sein: Das Bild wird 20 × 10 m groß.
  const mitte = await planAufBild(page);
  await page.mouse.click(mitte.x - 25 * mitte.pxProMeter, mitte.y);
  await page.mouse.click(mitte.x + 25 * mitte.pxProMeter, mitte.y);
  await panel(page).getByLabel('Abstand in Metern').fill('10');
  await panel(page).getByRole('button', { name: 'Übernehmen' }).click();
  await expect(panel(page)).toContainText('Bild 20 × 10 m, 1 px = 0,1 m');
  await expect(panel(page).getByLabel('Abstand in Metern')).toBeHidden();

  await panel(page).getByRole('slider').fill('50');
  const gespeichert = await speichern(page);
  expect(gespeichert.json.version).toBe(5);
  const original = `data:image/png;base64,${(await fs.readFile(TESTBILD)).toString('base64')}`;
  expect(gespeichert.json.luftbild?.daten).toBe(original);
  expect(gespeichert.json.luftbild?.deckkraft).toBe(0.5);
  expect(gespeichert.json.luftbild?.meterProPixel).toBeCloseTo(0.1, 6);

  // Frisch starten und die Datei laden: dasselbe Bild mit demselben Maßstab und derselben Deckkraft.
  await page.goto('./?t=luftbild-laden');
  await expect(page.locator('#btn-luftbild')).toBeHidden();
  await page.locator('#inp-laden').setInputFiles(gespeichert.pfad);
  await expect(panel(page)).toContainText('Bild 20 × 10 m, 1 px = 0,1 m');
  await expect(panel(page).getByRole('slider')).toHaveValue('50');
  const nochmal = await speichern(page);
  expect(nochmal.json.luftbild).toEqual(gespeichert.json.luftbild);

  // Der Link trägt das Bild nicht; wer ihn öffnet, bekommt den Hinweis.
  await page.getByRole('button', { name: 'Link kopieren' }).click();
  await expect.poll(() => page.url()).toContain('#b=');
  expect(page.url().length).toBeLessThan(5000);
  await page.reload();
  await expect(page.locator('#meldung')).toHaveText('Das Luftbild ist nur in der gespeicherten Datei enthalten.');
  await expect(page.locator('#btn-luftbild')).toBeHidden();
  expect(fehler).toEqual([]);
});

test('Maßstab setzen: zwei Punkte zu nah beieinander werden abgelehnt, das Werkzeug bleibt aktiv', async ({ page }) => {
  await page.goto('./?t=luftbild-nah');
  await page.locator('#inp-luftbild').setInputFiles(TESTBILD);
  await expect(panel(page)).toContainText('Bild 100 × 50 m');
  const mitte = await planAufBild(page);
  await page.mouse.click(mitte.x, mitte.y);
  await page.mouse.click(mitte.x + 2 * mitte.pxProMeter, mitte.y); // 2 m = 4 Bildpixel
  await expect(page.locator('#meldung')).toHaveText('Punkte zu nah beieinander');
  await expect(panel(page).getByLabel('Abstand in Metern')).toBeHidden();
  await page.mouse.click(mitte.x - 5 * mitte.pxProMeter, mitte.y);
  await page.mouse.click(mitte.x + 5 * mitte.pxProMeter, mitte.y);
  await expect(panel(page).getByLabel('Abstand in Metern')).toBeVisible();
});

test('Luftbild entfernen und Rückgängig; der Nordpfeil zeigt in der Planansicht nach oben', async ({ page }) => {
  await page.goto('./?t=luftbild-entfernen');
  await page.locator('#inp-luftbild').setInputFiles(TESTBILD);
  await expect(panel(page)).toContainText('Bild 100 × 50 m');
  await expect(page.locator('#nordpfeil')).toBeVisible();
  // In 3D schaut die Kamera schräg nach Nordwesten: Der Pfeil ist gedreht, in der Planansicht nicht.
  await expect(page.locator('#nordpfeil')).not.toHaveCSS('transform', 'none');
  const dreiD = await page.locator('#nordpfeil').evaluate((e) => (e as HTMLElement).style.transform);
  expect(dreiD).not.toBe('rotate(0deg)');
  await page.keyboard.press('p');
  await expect(page.locator('#nordpfeil')).toHaveAttribute('style', /rotate\(0deg\)/);

  await panel(page).getByRole('button', { name: 'Luftbild entfernen' }).click();
  await expect(panel(page)).toBeHidden();
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(panel(page)).toBeVisible();
});
