import type { Vec3 } from './Vec3';

export function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

export interface NaechstePunkte {
  readonly a: Vec3;
  readonly b: Vec3;
  readonly abstand: number;
}

/**
 * Nächste Punkte der Strecken p1–q1 und p2–q2 (Ericson, Real-Time Collision Detection, 5.1.9).
 * Beide Strecken haben Länge > 0; Stange garantiert das.
 */
export function naechstePunkte(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): NaechstePunkte {
  const d1 = q1.sub(p1);
  const d2 = q2.sub(p2);
  const r = p1.sub(p2);
  const a = d1.dot(d1);
  const e = d2.dot(d2);
  const f = d2.dot(r);
  const c = d1.dot(r);
  const b = d1.dot(d2);
  const nenner = a * e - b * b;
  let s = nenner > 1e-12 ? clamp((b * f - c * e) / nenner, 0, 1) : 0;
  let t = (b * s + f) / e;
  if (t < 0) {
    t = 0;
    s = clamp(-c / a, 0, 1);
  } else if (t > 1) {
    t = 1;
    s = clamp((b - c) / a, 0, 1);
  }
  const pa = p1.add(d1.scale(s));
  const pb = p2.add(d2.scale(t));
  return { a: pa, b: pb, abstand: pa.distanceTo(pb) };
}
