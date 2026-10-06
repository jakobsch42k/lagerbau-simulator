import { expect, test } from '@playwright/test';
import { bildschirmPunkt, gespeichert, lage, type V3 } from './hilfen';

test('Plan / 3D umschalten zeigt die Maßstabsleiste nur im Plan', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto('./?t=ansicht');
  await expect(page.locator('#massstab')).toBeHidden();

  await page.getByRole('button', { name: 'Plan / 3D' }).click();
  await expect(page.locator('#btn-ansicht')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#massstab')).toBeVisible();
  await expect(page.locator('#massstab')).toHaveText(/^\d+ m$/);

  await page.keyboard.press('f');
  await expect(page.locator('#massstab')).toBeVisible();

  await page.keyboard.press('p');
  await expect(page.locator('#btn-ansicht')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#massstab')).toBeHidden();
  expect(fehler).toEqual([]);
});

test('Messen zwischen zwei Spitzen zeigt den Abstand; Esc löscht die Messung', async ({ page }) => {
  await page.goto('./?t=messen');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  const first = (await gespeichert(page)).find((o) => o.art === 'stange');
  if (!first?.start) throw new Error('First fehlt');
  const ende = (first as unknown as { ende: V3 }).ende;
  const erwartet = Math.hypot(ende[0] - first.start[0], ende[1] - first.start[1], ende[2] - first.start[2]);
  const waagrecht = Math.hypot(ende[0] - first.start[0], ende[2] - first.start[2]);

  await page.getByRole('button', { name: 'Messen' }).click();
  const von = await bildschirmPunkt(page, lage(first));
  const bis = await bildschirmPunkt(page, ende);
  await page.mouse.click(von.x, von.y);
  await page.mouse.click(bis.x, bis.y);
  await expect(page.locator('#messung')).toHaveText(`${erwartet.toFixed(2)} m (waagrecht ${waagrecht.toFixed(2)} m)`);

  await page.keyboard.press('Escape');
  await expect(page.locator('#messung')).toBeHidden();
});

test('In der Planansicht wählt Shift+Ziehen mit einem Rahmen, Pfeil nach oben schiebt nach Norden', async ({ page }) => {
  await page.goto('./?t=rahmen');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  await page.keyboard.press('p');
  await page.keyboard.press('f');
  const vorher = await gespeichert(page);
  const box = await page.locator('#ansicht canvas').boundingBox();
  if (!box) throw new Error('Keine Leinwand');

  await page.keyboard.down('Shift');
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
  await page.mouse.move(box.x + box.width - 30, box.y + box.height - 30, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('#parameter h2')).toHaveText('3 Objekte ausgewählt');

  await page.keyboard.press('ArrowUp');
  const nachher = await gespeichert(page);
  for (const o of vorher) {
    const n = nachher.find((x) => x.id === o.id)!;
    expect(lage(n)[0]).toBeCloseTo(lage(o)[0], 6);
    expect(lage(n)[2]).toBeCloseTo(lage(o)[2] - 0.1, 6);
  }
});
