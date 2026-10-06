import { expect, type Page, test } from '@playwright/test';

type V3 = readonly [number, number, number];
interface Objekt {
  readonly art: string;
  readonly id: string;
  readonly position?: V3;
  readonly start?: V3;
}

// Kamera aus Szene.ts: Position (5,4,6), Ziel (1.2,1,0), Sichtfeld 50° senkrecht.
const KAMERA: V3 = [5, 4, 6];
const ZIEL: V3 = [1.2, 1, 0];
const FOV_GRAD = 50;

const minus = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const punkt = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const kreuz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.sqrt(punkt(a, a));
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Wo ein Weltpunkt auf dem Bildschirm liegt, wenn die Kamera noch ihre Ausgangslage hat. */
async function bildschirmPunkt(page: Page, p: V3): Promise<{ x: number; y: number }> {
  const box = await page.locator('#ansicht canvas').boundingBox();
  if (!box) throw new Error('Keine Leinwand');
  const vorn = norm(minus(ZIEL, KAMERA));
  const rechts = norm(kreuz(vorn, [0, 1, 0]));
  const oben = kreuz(rechts, vorn);
  const d = minus(p, KAMERA);
  const kehrwert = 1 / (punkt(d, vorn) * Math.tan((FOV_GRAD / 2) * (Math.PI / 180)));
  const ndcX = punkt(d, rechts) * kehrwert * (box.height / box.width);
  const ndcY = punkt(d, oben) * kehrwert;
  return { x: box.x + ((ndcX + 1) / 2) * box.width, y: box.y + ((1 - ndcY) / 2) * box.height };
}

async function gespeichert(page: Page): Promise<Objekt[]> {
  const herunterladen = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const pfad = await (await herunterladen).path();
  const fs = await import('node:fs/promises');
  return (JSON.parse(await fs.readFile(pfad, 'utf-8')) as { objekte: Objekt[] }).objekte;
}

const lage = (o: Objekt): V3 => (o.position ?? o.start) as V3;

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
