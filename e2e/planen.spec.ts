import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

type V3 = [number, number, number];

// Kochstelle wie im Beispiel: A-Bock und Dreibein mit 2,4-m-Stangen und 0,2 m Überstand, dazwischen der First.
const ABOCK_SPITZE: V3 = [0, Math.sqrt(2.2 ** 2 - 0.8 ** 2), 0];
const DREIBEIN_SPITZE: V3 = [2.5, Math.sqrt(2.2 ** 2 - 0.7 ** 2), 0];
const UEBERSTAND = 0.2;

/** Der First ragt wie bei Stange.zwischen an beiden Enden 0,2 m über die Spitzen hinaus. */
function first(): { id: string; start: V3; ende: V3; durchmesser: number } {
  const d = DREIBEIN_SPITZE.map((x, i) => x - ABOCK_SPITZE[i]!);
  const laenge = Math.hypot(...d);
  const r = d.map((x) => x / laenge);
  return {
    id: 'first',
    start: ABOCK_SPITZE.map((x, i) => x - r[i]! * UEBERSTAND) as V3,
    ende: DREIBEIN_SPITZE.map((x, i) => x + r[i]! * UEBERSTAND) as V3,
    durchmesser: 0.08,
  };
}

const kochstelleMitDach = {
  version: 3,
  gruppen: [
    { id: 'abock', typ: 'abock', position: [0, 0, 0], drehung: Math.PI / 2, params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 } },
    { id: 'dreibein', typ: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } },
  ],
  stangen: [first()],
  seile: [],
  baeume: [],
  planen: [{ id: 'dach', start: ABOCK_SPITZE, ende: DREIBEIN_SPITZE, breite: 3, laenge: 4, form: 'satteldach', neigung: 30, seite: 1 }],
};

test('Satteldach über der Kochstelle: Materialliste und Platzbedarf', async ({ page }) => {
  const fehler: string[] = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.goto(`./?t=satteldach#b=${LZString.compressToEncodedURIComponent(JSON.stringify(kochstelleMitDach))}`);
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(page.locator('#stangenliste th').filter({ hasText: /^Plane$/ })).toHaveCount(1);
  await expect(page.locator('#stangenliste tr').filter({ hasText: '3.0 × 4.0 m' })).toContainText('1');
  // x: Firstende −0,75 bis Außenecke 3,26 → 4,0 m; z: ± 1,5 · cos 30° → 2,6 m.
  await expect(page.locator('#platzbedarf')).toHaveText('Platzbedarf: 4.0 × 2.6 m');
  expect(fehler).toEqual([]);
});
