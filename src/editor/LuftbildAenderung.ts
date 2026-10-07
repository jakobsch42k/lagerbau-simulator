import type { Bauwerk } from '../model/Bauwerk';
import { massstabAusPunkten } from '../model/Massstab';
import type { Messung } from './Messung';

/** Setzt den Maßstab aus den zwei Klickpunkten der Messung. Wirft RangeError, wenn Luftbild oder Messung fehlen oder die Punkte nicht taugen. */
export const setzeMassstabAuf = (strecke: Messung | null, meter: number) => (b: Bauwerk): Bauwerk => {
  if (!b.luftbild) throw new RangeError('Kein Luftbild geladen');
  if (!strecke?.bis) throw new RangeError('Erst zwei Punkte auf dem Bild anklicken');
  return b.mitLuftbild(b.luftbild.mitMassstab(massstabAusPunkten(strecke.von, strecke.bis, meter, b.luftbild.meterProPixel)));
};

export const setzeDeckkraftAuf = (deckkraft: number) => (b: Bauwerk): Bauwerk => {
  if (!b.luftbild) throw new RangeError('Kein Luftbild geladen');
  return b.mitLuftbild(b.luftbild.mitDeckkraft(deckkraft));
};
