import { expect, test } from '@playwright/test';
import { bildschirmPunkt, gespeichert, lage, type Objekt, type V3 } from './hilfen';

test('Doppelklick wählt den ganzen Bau, Ziehen bewegt alle Teile gleich weit, die Hinweise bleiben', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto('./?t=bewegen');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  const hinweiseVorher = await page.locator('#hinweise').innerText();
  const vorher = await gespeichert(page);
  const first = vorher.find((o) => o.art === 'stange');
  if (!first?.start) throw new Error('First fehlt');
  const ende = (first as unknown as { ende: V3 }).ende;
  const mitte: V3 = [(first.start[0] + ende[0]) / 2, (first.start[1] + ende[1]) / 2, (first.start[2] + ende[2]) / 2];
  const ziel = await bildschirmPunkt(page, mitte);

  await page.mouse.dblclick(ziel.x, ziel.y);
  await expect(page.locator('#parameter h2')).toHaveText('3 Objekte ausgewählt');

  await page.mouse.move(ziel.x, ziel.y);
  await page.mouse.down();
  await page.mouse.move(ziel.x + 60, ziel.y + 20, { steps: 6 });
  await page.mouse.move(ziel.x + 120, ziel.y + 40, { steps: 6 });
  await page.mouse.up();

  const nachher = await gespeichert(page);
  const versaetze = vorher.map((o) => {
    const n = nachher.find((x) => x.id === o.id) as Objekt;
    return lage(n).map((v, i) => Math.round((v - lage(o)[i]!) * 1000) / 1000);
  });
  expect(Math.hypot(versaetze[0]![0]!, versaetze[0]![2]!)).toBeGreaterThan(0.3);
  expect(versaetze[0]![1]).toBe(0);
  for (const v of versaetze) expect(v).toEqual(versaetze[0]);
  expect(await page.locator('#hinweise').innerText()).toBe(hinweiseVorher);
  expect(fehler).toEqual([]);

  await page.keyboard.press('Control+z');
  expect((await gespeichert(page)).map(lage)).toEqual(vorher.map(lage));
});

test('Kamera drehen über leerem Boden löst keinen Klick aus: nichts wird gesetzt, die Auswahl bleibt', async ({ page }) => {
  await page.goto('./?t=orbit');
  await page.getByRole('button', { name: 'Beispiel laden' }).click();
  const vorher = await gespeichert(page);
  const first = vorher.find((o) => o.art === 'stange');
  if (!first?.start) throw new Error('First fehlt');
  const ende = (first as unknown as { ende: V3 }).ende;
  const auf = await bildschirmPunkt(page, [(first.start[0] + ende[0]) / 2, (first.start[1] + ende[1]) / 2, (first.start[2] + ende[2]) / 2]);
  await page.mouse.click(auf.x, auf.y);
  const titel = await page.locator('#parameter h2').innerText();
  const leer = await bildschirmPunkt(page, [1, 0, 4]);
  const drehen = async (): Promise<void> => {
    await page.mouse.move(leer.x, leer.y);
    await page.mouse.down();
    await page.mouse.move(leer.x + 40, leer.y + 10, { steps: 5 });
    await page.mouse.move(leer.x + 90, leer.y + 20, { steps: 5 });
    await page.mouse.up();
  };

  await drehen();
  expect(await page.locator('#parameter h2').innerText()).toBe(titel);

  for (const werkzeug of ['Baum setzen', 'Stange ziehen', 'Seil spannen', 'Plane spannen', 'Dreibein setzen']) {
    await page.getByRole('button', { name: werkzeug }).click();
    await page.mouse.move(leer.x, leer.y);
    await page.mouse.down();
    await page.mouse.move(leer.x + 40, leer.y + 10, { steps: 5 });
    await page.mouse.move(leer.x + 90, leer.y + 20, { steps: 5 });
    await page.mouse.up();
    expect((await gespeichert(page)).map((o) => o.id), werkzeug).toEqual(vorher.map((o) => o.id));
  }
});
