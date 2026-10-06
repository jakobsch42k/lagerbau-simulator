import {
  istRegelName,
  istWertSchluessel,
  REGEL_NAMEN,
  RegelEinstellungen,
  type RegelName,
  type Regelwerte,
  type WertSchluessel,
} from '../rules/RegelEinstellungen';
import { liste, objekt, zahl } from './lesen';

/** Regel-Einstellungen im Datenformat v4 (Spec v3, D8), z. B. `{ aus: ['R4'], werte: { R4_MAX_BEINWINKEL_GRAD: 40 } }`. */
export interface RegelnJson {
  readonly aus: readonly RegelName[];
  readonly werte: Regelwerte;
}

export function regelnZuJson(e: RegelEinstellungen): RegelnJson {
  return { aus: REGEL_NAMEN.filter((n) => e.istAus(n)), werte: { ...e.werte } };
}

/** Wirft bei unbekannten Regeln oder Werten einen Error, bei unpassenden Werten den RangeError des Modells. */
export function regelnAusJson(d: unknown): RegelEinstellungen {
  const roh = objekt(d, 'regeln');
  const aus = (roh.aus === undefined ? [] : liste(roh.aus, 'regeln.aus')).map((n): RegelName => {
    if (!istRegelName(n)) throw new Error(`unbekannte Regel ${String(n)}`);
    return n;
  });
  const rohWerte = roh.werte === undefined ? {} : objekt(roh.werte, 'regeln.werte');
  const werte = Object.fromEntries(
    Object.entries(rohWerte).map(([schluessel, wert]): [WertSchluessel, number] => {
      if (!istWertSchluessel(schluessel)) throw new Error(`unbekannter Regelwert ${schluessel}`);
      return [schluessel, zahl(wert, schluessel)];
    }),
  ) as Regelwerte;
  return RegelEinstellungen.von(aus, werte);
}
