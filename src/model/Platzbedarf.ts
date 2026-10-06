import type { Bauwerk } from './Bauwerk';

/** Achsparalleles Rechteck am Boden über alle Füße, Haringe und Planen-Ösen (Spec v2a/v2b, D4). Bäume zählen nicht. */
export class Platzbedarf {
  private constructor(
    readonly minX: number,
    readonly maxX: number,
    readonly minZ: number,
    readonly maxZ: number,
  ) {}

  static aus(bauwerk: Bauwerk): Platzbedarf | null {
    const punkte = [
      ...bauwerk.fuesse().map((f) => f.position),
      ...bauwerk.haringe().map((h) => h.position),
      ...bauwerk.planen.flatMap((p) => p.oesen),
    ];
    if (punkte.length === 0) return null;
    const xs = punkte.map((p) => p.x);
    const zs = punkte.map((p) => p.z);
    return new Platzbedarf(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
  }

  /** Längere Seite in m. */
  get laenge(): number {
    return Math.max(this.maxX - this.minX, this.maxZ - this.minZ);
  }

  /** Kürzere Seite in m. */
  get breite(): number {
    return Math.min(this.maxX - this.minX, this.maxZ - this.minZ);
  }
}
