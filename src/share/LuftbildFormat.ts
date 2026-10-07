import { Luftbild } from '../model/Luftbild';
import { objekt, type Roh, text, zahl } from './lesen';

/** Das Luftbild im Datenformat v5 (Spec E2, D4). */
export interface LuftbildJson {
  readonly daten: string;
  readonly breitePx: number;
  readonly hoehePx: number;
  readonly meterProPixel: number;
  readonly deckkraft: number;
}

/** Im Teilen-Link steht statt des Bilds nur diese Marke. */
export interface LuftbildEntferntJson {
  readonly entfernt: true;
}

export function luftbildZuJson(l: Luftbild): LuftbildJson {
  return { daten: l.daten, breitePx: l.breitePx, hoehePx: l.hoehePx, meterProPixel: l.meterProPixel, deckkraft: l.deckkraft };
}

/** Ob ein v5-Feld `luftbild` nur die Marke „Bild ist nicht im Link“ ist. */
export function istEntfernt(roh: Roh): boolean {
  return roh.entfernt === true;
}

/** Wirft den RangeError des Modells bei unpassenden Werten, sonst einen Error mit dem Feldnamen. */
export function luftbildAusJson(d: unknown): Luftbild {
  const roh = objekt(d, 'luftbild');
  return new Luftbild(
    text(roh.daten, 'luftbild.daten'),
    zahl(roh.breitePx, 'breitePx'),
    zahl(roh.hoehePx, 'hoehePx'),
    zahl(roh.meterProPixel, 'meterProPixel'),
    zahl(roh.deckkraft, 'deckkraft'),
  );
}
