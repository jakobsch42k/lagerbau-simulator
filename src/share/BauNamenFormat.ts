import type { Bauwerk } from '../model/Bauwerk';
import { MAX_BAUNAME } from '../model/Bauwerk';
import { freierText, objekt } from './lesen';

/** Bau-Namen im Datenformat v7 (Spec E5, D6): `{ "<objekt-id>": "<Name>" }`. */
export type BauNamenJson = Readonly<Record<string, string>>;

/** Nur Einträge zu Objekten, die es noch gibt, in der Reihenfolge des Bauwerks; `undefined`, wenn keiner bleibt (das Feld entfällt). */
export function bauNamenZuJson(bauwerk: Bauwerk): BauNamenJson | undefined {
  const eintraege = bauwerk.objekte.flatMap((o) => {
    const name = bauwerk.bauNamen.get(o.id);
    return name === undefined ? [] : [[o.id, name] as const];
  });
  return eintraege.length === 0 ? undefined : Object.fromEntries(eintraege);
}

/** Liest die Namen (getrimmt); Einträge zu unbekannten ids entfallen. Wirft bei falschen Typen oder Längen. */
export function bauNamenAusJson(d: unknown, istObjekt: (id: string) => boolean): ReadonlyMap<string, string> {
  const roh = objekt(d, 'bauNamen');
  const namen = new Map<string, string>();
  for (const [id, wert] of Object.entries(roh)) {
    const name = freierText(wert, `bauNamen.${id}`).trim();
    if (name.length === 0 || name.length > MAX_BAUNAME) throw new Error(`bauNamen.${id}: Name muss 1 bis ${MAX_BAUNAME} Zeichen lang sein.`);
    if (istObjekt(id)) namen.set(id, name);
  }
  return namen;
}
