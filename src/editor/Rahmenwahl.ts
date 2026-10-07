import type { Bauwerk } from '../model/Bauwerk';
import type { Vec3 } from '../model/Vec3';

/** Achsparalleles Rechteck am Boden. */
export interface Rechteck {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/** Rechteck aus zwei beliebigen Ecken. */
export function rechteckAus(a: Vec3, b: Vec3): Rechteck {
  return { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minZ: Math.min(a.z, b.z), maxZ: Math.max(a.z, b.z) };
}

/** ids der Objekte, von denen ein Platzpunkt oder der Mittelpunkt (Drehpunkt) im Rechteck liegt (Spec E1, D1, Rahmen-Auswahl). */
export function idsImRechteck(bauwerk: Bauwerk, r: Rechteck): readonly string[] {
  const drin = (p: Vec3): boolean => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ;
  return bauwerk.objekte.filter((o) => drin(o.drehpunkt()) || o.platzPunkte().some(drin)).map((o) => o.id);
}
