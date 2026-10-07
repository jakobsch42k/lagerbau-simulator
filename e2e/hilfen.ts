import type { Page } from '@playwright/test';

export type V3 = readonly [number, number, number];
export interface Objekt {
  readonly art: string;
  readonly id: string;
  readonly position?: V3;
  readonly start?: V3;
}

// Kamera aus Kameras.ts (3D): Position (5,4,6), Ziel (1.2,1,0), Sichtfeld 50° senkrecht.
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
export async function bildschirmPunkt(page: Page, p: V3): Promise<{ x: number; y: number }> {
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

export async function gespeichert(page: Page): Promise<Objekt[]> {
  const herunterladen = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const pfad = await (await herunterladen).path();
  const fs = await import('node:fs/promises');
  return (JSON.parse(await fs.readFile(pfad, 'utf-8')) as { objekte: Objekt[] }).objekte;
}


export const lage = (o: Objekt): V3 => (o.position ?? o.start) as V3;
