import { flaeche as polygonFlaeche } from './polygon';
import { Vec3 } from './Vec3';
import type { Zelt } from './Zelt';

/** Umriss, Fläche und abgeleitete Haringe eines Zelts, in der Welt (Position und Drehung eingerechnet), y = 0 (Spec E4, D3). */
export class ZeltGeometrie {
  /** `rund`: regelmäßiges Eck mit Umkreisdurchmesser; sonst Rechteck, Länge entlang der Zeltachse (lokal x). */
  static umriss(z: Zelt): Vec3[] {
    return ZeltGeometrie.alsWelt(z, ZeltGeometrie.lokalerUmriss(z));
  }

  /** Fläche des Umrisses in m². */
  static flaeche(z: Zelt): number {
    return polygonFlaeche(ZeltGeometrie.umriss(z));
  }

  /** `abspannungen` Punkte: rund auf einem Kreis, sonst gleichmäßig auf dem um `haringAbstand` versetzten Rechteck. */
  static haringe(z: Zelt): Vec3[] {
    const { aufbau, abspannungen: n, haringAbstand: a } = z.params;
    if (n === 0) return [];
    if (aufbau === 'rund') {
      const r = z.params.durchmesser / 2 + a;
      const schritt = (2 * Math.PI) / n;
      return ZeltGeometrie.alsWelt(
        z,
        Array.from({ length: n }, (_, k) => ZeltGeometrie.imKreis(r, (k + 0.5) * schritt)),
      );
    }
    return ZeltGeometrie.alsWelt(z, ZeltGeometrie.amRechteck(z.params.laenge / 2 + a, z.params.breite / 2 + a, n));
  }

  /** Länge und Anzahl der Abspannseile: Eingabewerte, nicht aus der Lage der Haringe gerechnet (die Zelthöhe am Seil ist unbekannt). */
  static abspannseile(z: Zelt): { laenge: number; anzahl: number } {
    return { laenge: z.params.seillaenge, anzahl: z.params.abspannungen };
  }

  private static lokalerUmriss(z: Zelt): Vec3[] {
    const p = z.params;
    if (p.aufbau === 'rund') {
      return Array.from({ length: p.ecken }, (_, k) => ZeltGeometrie.imKreis(p.durchmesser / 2, (2 * Math.PI * k) / p.ecken));
    }
    const l = p.laenge / 2;
    const b = p.breite / 2;
    return [new Vec3(l, 0, b), new Vec3(-l, 0, b), new Vec3(-l, 0, -b), new Vec3(l, 0, -b)];
  }

  private static imKreis(radius: number, winkel: number): Vec3 {
    return new Vec3(radius * Math.cos(winkel), 0, radius * Math.sin(winkel));
  }

  /** `n` gleich weit entfernte Punkte auf dem Rechteck ±hl × ±hb, Start an der Ecke (hl, hb), dann zuerst entlang z. */
  private static amRechteck(hl: number, hb: number, n: number): Vec3[] {
    const ecken = [new Vec3(hl, 0, hb), new Vec3(hl, 0, -hb), new Vec3(-hl, 0, -hb), new Vec3(-hl, 0, hb)];
    const umfang = 4 * (hl + hb);
    return Array.from({ length: n }, (_, k) => {
      let rest = (k * umfang) / n;
      for (let i = 0; i < 3; i++) {
        const seite = (ecken[i] as Vec3).distanceTo(ecken[i + 1] as Vec3);
        if (rest < seite) return ZeltGeometrie.zwischen(ecken[i] as Vec3, ecken[i + 1] as Vec3, rest / seite);
        rest -= seite;
      }
      return ZeltGeometrie.zwischen(ecken[3] as Vec3, ecken[0] as Vec3, rest / (2 * hl));
    });
  }

  private static zwischen(von: Vec3, nach: Vec3, t: number): Vec3 {
    return new Vec3(von.x + (nach.x - von.x) * t, 0, von.z + (nach.z - von.z) * t);
  }

  private static alsWelt(z: Zelt, lokal: readonly Vec3[]): Vec3[] {
    return lokal.map((p) => p.gedrehtUmY(z.drehungRad).add(z.position));
  }
}
