import type { Bauwerk } from './Bauwerk';
import type { LagerObjekt } from './LagerObjekt';
import { Vec3 } from './Vec3';

/**
 * Mittelpunkt einer Menge von Objekten (Spec E1, D3/D4): der Schwerpunkt ihrer Platzpunkte. Haben sie keine
 * (Baum, Seil), gilt der Schwerpunkt der eigenen Drehpunkte. Bei einer leeren Menge null.
 */
export function mitte(objekte: readonly LagerObjekt[]): Vec3 | null {
  const punkte = objekte.flatMap((o) => o.platzPunkte());
  const quelle = punkte.length > 0 ? punkte : objekte.map((o) => o.drehpunkt());
  if (quelle.length === 0) return null;
  return quelle.reduce((summe, p) => summe.add(p), Vec3.NULL).scale(1 / quelle.length);
}

/**
 * Fügt Kopien der Objekte hinzu, um `dv` versetzt (nur waagrecht) und mit neuen ids. Die Objekte müssen eine in sich
 * geschlossene Menge sein, wie `mitgenommen` sie liefert. Das Original bleibt; `neueIds` sind die Kopien in derselben Reihenfolge.
 */
export function kopiere(
  bauwerk: Bauwerk,
  objekte: readonly LagerObjekt[],
  dv: Vec3,
  neueId: (praefix: string) => string,
): { readonly bauwerk: Bauwerk; readonly neueIds: readonly string[] } {
  const waagrecht = new Vec3(dv.x, 0, dv.z);
  const kopien = objekte.map((o) => o.verschobenUm(waagrecht).mitId(neueId(o.art)));
  return { bauwerk: kopien.reduce((b, k) => b.mit(k), bauwerk), neueIds: kopien.map((k) => k.id) };
}
