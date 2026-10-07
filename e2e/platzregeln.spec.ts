import { expect, test } from '@playwright/test';
import LZString from 'lz-string';

// Feuerstelle (Radius 0,75 m) und Jurte 6er (Radius ≈ 3,04 m) mit rund 3 m Abstand von Kante zu Kante.
const plan = {
  version: 7,
  objekte: [
    { art: 'platzobjekt', id: 'f', position: [0, 0, 0], drehung: 0, vorlage: 'feuerstelle', name: 'Feuerstelle', form: 'kreis', breite: 1.5, laenge: 1.5, hoehe: 0.3, farbe: '#e8590c' },
    {
      art: 'zelt', id: 'z', vorlage: 'jurte6', name: 'Jurte 6er', aufbau: 'rund', position: [6.75, 0, 0], drehungRad: 0, durchmesser: 6.07, ecken: 12,
      laenge: 6.07, breite: 6.07, wandhoehe: 1.65, firsthoehe: 2.62, waende: [true, true, true], abspannungen: 12, seillaenge: 3, haringAbstand: 2, farbe: '#4a4a4a',
    },
  ],
};

test('P1: Hinweis bei 3 m, Wert 2 m blendet ihn aus, Ausschalten bleibt nach Speichern und Laden (Spec E6, D6)', async ({ page }) => {
  await page.goto(`./?t=platzregeln#b=${LZString.compressToEncodedURIComponent(JSON.stringify(plan))}`);
  await expect(page.locator('#hinweise')).toContainText('P1: Faustregel (Camping-Blogs');
  await page.getByRole('button', { name: 'Bearbeiten' }).click();
  await page.getByRole('button', { name: 'Platzregeln…' }).click();
  const feld = page.getByLabel(/^Mindestabstand Feuer – Zelt/);
  await feld.fill('2');
  await feld.dispatchEvent('change');
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await feld.fill('5');
  await feld.dispatchEvent('change');
  await expect(page.locator('#hinweise')).toContainText('Faustregel (Camping-Blogs');
  await page.getByRole('checkbox', { name: /^P1:/ }).uncheck();
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
  await expect(page.locator('#ausgeschaltet')).toHaveText('Ausgeschaltet: P1');
  const herunterladen = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Speichern' }).click();
  const datei = await (await herunterladen).path();
  await page.goto('./?t=leer');
  await expect(page.locator('#ausgeschaltet')).toHaveText('');
  await page.locator('#inp-laden').setInputFiles(datei);
  await expect(page.locator('#ausgeschaltet')).toHaveText('Ausgeschaltet: P1');
  await expect(page.locator('#hinweise')).toHaveText('Keine Hinweise.');
});
