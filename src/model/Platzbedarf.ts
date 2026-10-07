import type { Bauwerk } from './Bauwerk';
import type { LagerObjekt } from './LagerObjekt';

/**
 * Achsparalleles Rechteck am Boden über die Platzpunkte aller Objekte (Füße, Planen-Ösen) und die Haringe (Spec v3, D1).
 * Bäume und Seile haben keine Platzpunkte; die Haringe der Seile werden zusammengefasst wie bisher.
 * `zaehlt` sagt, welche Objekte mitzählen (Spec E3, D3): Platz-Objekte haben Platzpunkte für Rahmen und „Alles zeigen“, gehören aber
 * nicht zum Platzbedarf. Die Entscheidung liegt in `ObjektArt.zaehltZumPlatzbedarf`; das Modell kennt die Arten nicht und bekommt sie als Funktion.
 */
export class Platzbedarf {
  private constructor(
    readonly minX: number,
    readonly maxX: number,
    readonly minZ: number,
    readonly maxZ: number,
  ) {}

  static aus(bauwerk: Bauwerk, zaehlt: (o: LagerObjekt) => boolean = () => true): Platzbedarf | null {
    const punkte = [...bauwerk.objekte.filter(zaehlt).flatMap((o) => o.platzPunkte()), ...bauwerk.haringe().map((h) => h.position)];
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
