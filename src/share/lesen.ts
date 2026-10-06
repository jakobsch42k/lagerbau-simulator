import { Vec3 } from '../model/Vec3';

// Lese-Hilfen für Bauwerk-Daten (Spec v3, D3). Jede wirft einen Error mit dem Feldnamen;
// der Serializer stellt „Ungültige Bauwerk-Daten:“ davor.

/** Ein JSON-Objekt, dessen Felder erst noch geprüft werden. */
export type Roh = Record<string, unknown>;
/** Ein Punkt im JSON: [x, y, z] in Metern. */
export type V3 = readonly [number, number, number];

export function objekt(d: unknown, name: string): Roh {
  if (typeof d !== 'object' || d === null || Array.isArray(d)) throw new Error(`${name} ist kein Objekt`);
  return d as Roh;
}

export function liste(d: unknown, name: string): unknown[] {
  if (!Array.isArray(d)) throw new Error(`${name} ist keine Liste`);
  return d;
}

export function zahl(d: unknown, name: string): number {
  if (typeof d !== 'number' || !Number.isFinite(d)) throw new Error(`${name} ist keine Zahl`);
  return d;
}

export function text(d: unknown, name: string): string {
  if (typeof d !== 'string' || d.length === 0) throw new Error(`${name} fehlt`);
  return d;
}

/** Ein Text, der auch leer sein darf; das Modell prüft die Länge mit seiner eigenen Meldung. */
export function freierText(d: unknown, name: string): string {
  if (typeof d !== 'string') throw new Error(`${name} ist kein Text`);
  return d;
}

export function vektor(d: unknown, name: string): Vec3 {
  const l = liste(d, name);
  if (l.length !== 3) throw new Error(`${name} braucht drei Koordinaten`);
  return new Vec3(zahl(l[0], name), zahl(l[1], name), zahl(l[2], name));
}
