/** Ein Punkt in der Bodenebene (Meter). */
export interface Punkt2 {
  readonly x: number;
  readonly z: number;
}

const KREIS_ECKEN = 24;
const EPS = 1e-9;

/** Kürzester Abstand eines Punkts zur Strecke ab. */
function abstandPunktStrecke(p: Punkt2, a: Punkt2, b: Punkt2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const laenge2 = dx * dx + dz * dz;
  const t = laenge2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / laenge2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/** Echte Kreuzung zweier Strecken (nur Berühren oder Überdecken zählt nicht). */
function kreuzen(a: Punkt2, b: Punkt2, c: Punkt2, d: Punkt2): boolean {
  const kreuz = (o: Punkt2, p: Punkt2, q: Punkt2): number => (p.x - o.x) * (q.z - o.z) - (p.z - o.z) * (q.x - o.x);
  const d1 = kreuz(a, b, c);
  const d2 = kreuz(a, b, d);
  const d3 = kreuz(c, d, a);
  const d4 = kreuz(c, d, b);
  return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
}

/** Ein Vieleck in der Bodenebene (x, z), unveränderlich. Dient den Platzregeln für Abstände von Kante zu Kante (Spec E6, D2). */
export class Grundriss {
  private constructor(readonly punkte: readonly Punkt2[]) {}

  static vieleck(punkte: readonly Punkt2[]): Grundriss {
    if (punkte.length < 3) throw new RangeError('Ein Grundriss braucht mindestens 3 Ecken');
    if (!punkte.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z))) throw new RangeError('Die Ecken müssen endlich sein');
    return new Grundriss(punkte.map((p) => ({ x: p.x, z: p.z })));
  }

  static kreis(mitte: Punkt2, radius: number): Grundriss {
    if (!(Number.isFinite(radius) && radius > 0)) throw new RangeError('Radius muss größer als 0 sein');
    const punkte = Array.from({ length: KREIS_ECKEN }, (_, i) => {
      const w = (2 * Math.PI * i) / KREIS_ECKEN;
      return { x: mitte.x + radius * Math.cos(w), z: mitte.z + radius * Math.sin(w) };
    });
    return Grundriss.vieleck(punkte);
  }

  /** `breite` entlang x, `laenge` entlang z, dann um `drehungRad` gedreht (um y, wie `Vec3.gedrehtUmY`). */
  static rechteck(mitte: Punkt2, breite: number, laenge: number, drehungRad: number): Grundriss {
    if (!(Number.isFinite(breite) && breite > 0 && Number.isFinite(laenge) && laenge > 0)) throw new RangeError('Breite und Länge müssen größer als 0 sein');
    const c = Math.cos(drehungRad);
    const s = Math.sin(drehungRad);
    const ecken: readonly (readonly [number, number])[] = [
      [-breite / 2, -laenge / 2],
      [breite / 2, -laenge / 2],
      [breite / 2, laenge / 2],
      [-breite / 2, laenge / 2],
    ];
    return Grundriss.vieleck(ecken.map(([x, z]) => ({ x: mitte.x + x * c - z * s, z: mitte.z + x * s + z * c })));
  }

  /** Kürzester Abstand der Ränder; 0 bei Berührung oder Überlappung (auch wenn eines im anderen liegt). */
  abstand(anderer: Grundriss): number {
    if (this.ueberlappt(anderer)) return 0;
    let kleinster = Infinity;
    for (const [a, b] of this.kanten()) {
      for (const [c, d] of anderer.kanten()) {
        kleinster = Math.min(
          kleinster,
          abstandPunktStrecke(a, c, d),
          abstandPunktStrecke(b, c, d),
          abstandPunktStrecke(c, a, b),
          abstandPunktStrecke(d, a, b),
        );
      }
    }
    return kleinster;
  }

  /** Die Flächen teilen sich Innenraum; bloßes Berühren zählt nicht. */
  ueberlappt(anderer: Grundriss): boolean {
    for (const [a, b] of this.kanten()) for (const [c, d] of anderer.kanten()) if (kreuzen(a, b, c, d)) return true;
    const probe = (g: Grundriss): readonly Punkt2[] => [
      ...g.punkte,
      ...g.kanten().map(([a, b]) => ({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 })),
      g.schwerpunkt(),
    ];
    return probe(this).some((p) => anderer.innen(p)) || probe(anderer).some((p) => this.innen(p));
  }

  private kanten(): readonly (readonly [Punkt2, Punkt2])[] {
    return this.punkte.map((p, i) => [p, this.punkte[(i + 1) % this.punkte.length]] as const);
  }

  private schwerpunkt(): Punkt2 {
    const n = this.punkte.length;
    return { x: this.punkte.reduce((s, p) => s + p.x, 0) / n, z: this.punkte.reduce((s, p) => s + p.z, 0) / n };
  }

  /** Echt im Inneren (nicht auf dem Rand); Strahlverfahren. */
  private innen(p: Punkt2): boolean {
    if (this.kanten().some(([a, b]) => abstandPunktStrecke(p, a, b) < 1e-7)) return false;
    let drin = false;
    for (const [a, b] of this.kanten()) {
      if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) drin = !drin;
    }
    return drin;
  }
}
