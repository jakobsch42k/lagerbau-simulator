import {
  istPlatzRegelName,
  istPlatzWertSchluessel,
  PLATZREGEL_NAMEN,
  PlatzregelEinstellungen,
  type PlatzRegelName,
  type PlatzRegelwerte,
  type PlatzWertSchluessel,
} from '../rules/platz/PlatzregelEinstellungen';
import { liste, objekt, zahl } from './lesen';

/** Platzregel-Einstellungen (Spec E6, D4), z. B. `{ aus: ['P3'], werte: { P1_MIN_ABSTAND_FEUER_ZELT_M: 4 } }`. Optionales Feld von Version 7. */
export interface PlatzregelnJson {
  readonly aus: readonly PlatzRegelName[];
  readonly werte: PlatzRegelwerte;
}

export function platzregelnZuJson(e: PlatzregelEinstellungen): PlatzregelnJson {
  return { aus: PLATZREGEL_NAMEN.filter((n) => e.istAus(n)), werte: { ...e.werte } };
}

/** Wirft bei unbekannten Regeln oder Werten einen Error, bei unpassenden Werten den RangeError des Modells. */
export function platzregelnAusJson(d: unknown): PlatzregelEinstellungen {
  const roh = objekt(d, 'platzregeln');
  const aus = (roh.aus === undefined ? [] : liste(roh.aus, 'platzregeln.aus')).map((n): PlatzRegelName => {
    if (!istPlatzRegelName(n)) throw new Error(`unbekannte Platzregel ${String(n)}`);
    return n;
  });
  const rohWerte = roh.werte === undefined ? {} : objekt(roh.werte, 'platzregeln.werte');
  const werte = Object.fromEntries(
    Object.entries(rohWerte).map(([schluessel, wert]): [PlatzWertSchluessel, number] => {
      if (!istPlatzWertSchluessel(schluessel)) throw new Error(`unbekannter Platzregelwert ${schluessel}`);
      return [schluessel, zahl(wert, schluessel)];
    }),
  ) as PlatzRegelwerte;
  return PlatzregelEinstellungen.von(aus, werte);
}
