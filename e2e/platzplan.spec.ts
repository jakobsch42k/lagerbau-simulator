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

const knopf = (page: Page, werkzeug: string) => page.locator(`button[data-werkzeug="${werkzeug}"]`);

/** Planansicht; liefert die Mitte der Leinwand. Die Maßstäbe sind egal, die Tests rechnen nicht in Pixeln gegen Meter. */
async function plan(page: Page): Promise<{ x: number; y: number }> {
  await page.keyboard.press('p');
  const box = await page.locator('#ansicht canvas').boundingBox();
  if (!box) throw new Error('Keine Leinwand');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Vier Klicks im Quadrat um die Mitte, dann Enter; die neue Zone ist danach ausgewählt. */
async function zeichneZone(page: Page, m: { x: number; y: number }, halb: number): Promise<void> {
  await knopf(page, 'zone').click();
  for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) await page.mouse.click(m.x + dx * halb, m.y + dy * halb);
  await page.keyboard.press('Enter');
}

test('Feuerstelle setzen, Durchmesser auf 2 m ändern, Speichern und Laden ergibt dasselbe', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto('./?t=platzobjekt');
  const m = await plan(page);
  await page.locator('#sel-vorlage').selectOption({ label: 'Feuerstelle' });
  await page.mouse.click(m.x, m.y);
  await knopf(page, 'auswahl').click();
  await page.mouse.click(m.x, m.y);
  await page.locator('#parameter').getByLabel('Durchmesser (m)').fill('2');
  await page.locator('#parameter').getByLabel('Durchmesser (m)').press('Tab');
  const erst = await speichern(page);
  const feuer = erst.objekte.find((o) => o.art === 'platzobjekt');
  expect(feuer).toMatchObject({ name: 'Feuerstelle', form: 'kreis', breite: 2 });

  await page.goto('./?t=platzobjekt-laden');
  await page.locator('#inp-laden').setInputFiles(erst.pfad);
  const nochmal = await speichern(page);
  expect(nochmal.objekte).toEqual(erst.objekte);
  expect(fehler).toEqual([]);
});

test('Zone mit 4 Klicks und Enter zeigt die Fläche, ein Weg zeigt die Länge', async ({ page }) => {
  await page.goto('./?t=zone-weg');
  const m = await plan(page);
  await zeichneZone(page, m, 60);
  await expect(page.locator('#parameter')).toContainText(/Fläche [\d,]+ m²/);
  await knopf(page, 'linie').click();
  await page.mouse.click(m.x - 100, m.y + 150);
  await page.mouse.click(m.x + 100, m.y + 150);
  await page.keyboard.press('Enter');
  await expect(page.locator('#parameter')).toContainText(/Länge [\d,]+ m/);
  const { objekte } = await speichern(page);
  expect(objekte.map((o) => o.art).sort()).toEqual(['linie', 'zone']);
});

test('Ecken bearbeiten: Griff ziehen, Kante doppelklicken, Entf entfernt den Griff, jeder Schritt ist ein Undo', async ({ page }) => {
  await page.goto('./?t=ecken');
  const m = await plan(page);
  await zeichneZone(page, m, 60);
  await knopf(page, 'auswahl').click();
  await page.mouse.click(m.x, m.y);
  const punkte = async (): Promise<number> => ((await speichern(page)).objekte.find((o) => o.art === 'zone')?.punkte as unknown[]).length;
  expect(await punkte()).toBe(4);

  // Obere Kante doppelklicken: eine fünfte Ecke, die danach als Griff gewählt ist.
  await page.mouse.dblclick(m.x, m.y - 60);
  expect(await punkte()).toBe(5);

  // Entf entfernt den gewählten Griff wieder.
  await page.keyboard.press('Delete');
  expect(await punkte()).toBe(4);
  await page.keyboard.press('Control+z');
  expect(await punkte()).toBe(5);
  await page.keyboard.press('Control+z');
  expect(await punkte()).toBe(4);

  // Rechte untere Ecke nach rechts ziehen: die Zone wird größer, die Ecken bleiben vier.
  const vorher = await page.locator('#parameter').innerText();
  await page.mouse.move(m.x + 60, m.y + 60);
  await page.mouse.down();
  await page.mouse.move(m.x + 100, m.y + 90, { steps: 5 });
  await page.mouse.up();
  expect(await page.locator('#parameter').innerText()).not.toBe(vorher);
  expect(await punkte()).toBe(4);
  await page.keyboard.press('Control+z');
  expect(await page.locator('#parameter').innerText()).toBe(vorher);
});

test('Shift+Ziehen im Plan beginnt den Auswahlrahmen auch über einer Zone', async ({ page }) => {
  await page.goto('./?t=rahmen-zone');
  const m = await plan(page);
  await zeichneZone(page, m, 80);
  await knopf(page, 'auswahl').click();
  await page.keyboard.down('Shift');
  await page.mouse.move(m.x - 20, m.y - 20); // mitten auf der Zone
  await page.mouse.down();
  await page.mouse.move(m.x + 150, m.y + 150, { steps: 5 });
  await expect(page.locator('#rahmen')).toBeVisible();
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('#parameter h2')).not.toBeEmpty();
});
