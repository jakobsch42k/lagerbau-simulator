import { FUSS_TOLERANZ, MIN_SEILLAENGE } from './konstanten';
import type { LagerObjekt } from './LagerObjekt';
import type { PlanenParams } from './params';
import { Vec3 } from './Vec3';

/** Ein ebenes Viereck im Umlauf: zwei Punkte an der Aufhängelinie, dann zwei an der Außenkante. */
export type Viereck = readonly [Vec3, Vec3, Vec3, Vec3];

const GRAD = Math.PI / 180;
const mitteVon = (p: Vec3, q: Vec3): Vec3 => p.add(q).scale(0.5);

/**
 * Rechteckige Plane an einer Aufhängelinie (Spec v2b, D1). Die Länge läuft mittig entlang der Linie,
 * die Breite quer dazu, um die Neigung unter die Waagrechte gekippt. Kein Durchhang, keine Kräfte.
 */
export class Plane implements LagerObjekt {
  readonly art = 'plane' as const;

  /** Eine Fläche bei `eben`, zwei (je Dachseite) beim Satteldach. */
  readonly flaechen: readonly Viereck[];
  /** Die 8 Ösen: 4 Ecken und 4 Kantenmitten der ausgebreiteten Plane. */
  readonly oesen: readonly Vec3[];

  constructor(
    readonly id: string,
    readonly start: Vec3,
    readonly ende: Vec3,
    readonly params: PlanenParams,
  ) {
    Plane.pruefeParams(params);
    const linie = ende.sub(start);
    const linienLaenge = linie.length();
    if (!Number.isFinite(linienLaenge) || linienLaenge < MIN_SEILLAENGE) throw new RangeError('Aufhängelinie zu kurz.');
    // Ohne waagrechten Anteil gibt es keine Richtung „quer zur Linie“.
    if (Math.hypot(linie.x, linie.z) < MIN_SEILLAENGE) throw new RangeError('Aufhängelinie zu steil.');
    const u = linie.normalize();
    const mitte = mitteVon(start, ende);
    const a = mitte.sub(u.scale(params.laenge / 2));
    const b = mitte.add(u.scale(params.laenge / 2));
    if (params.form === 'eben') {
      const d = Plane.hangrichtung(u, params.seite, params.neigungGrad).scale(params.breite);
      const flaeche: Viereck = [a, b, b.add(d), a.add(d)];
      this.flaechen = [flaeche];
      this.oesen = [...flaeche, mitteVon(a, b), mitteVon(b, b.add(d)), mitteVon(a.add(d), b.add(d)), mitteVon(a, a.add(d))];
    } else {
      const links = Plane.hangrichtung(u, 1, params.neigungGrad).scale(params.breite / 2);
      const rechts = Plane.hangrichtung(u, -1, params.neigungGrad).scale(params.breite / 2);
      this.flaechen = [
        [a, b, b.add(links), a.add(links)],
        [a, b, b.add(rechts), a.add(rechts)],
      ];
      // Die Mitten der kurzen Kanten liegen gefaltet genau auf den Firstenden.
      this.oesen = [a.add(links), b.add(links), b.add(rechts), a.add(rechts), mitte.add(links), mitte.add(rechts), a, b];
    }
    if (this.oesen.some((p) => p.y < -FUSS_TOLERANZ)) {
      throw new RangeError('Plane reicht in den Boden: Neigung, Breite oder Länge verringern.');
    }
  }

  get linienLaenge(): number {
    return this.start.distanceTo(this.ende);
  }

  mitParams(params: PlanenParams): Plane {
    return new Plane(this.id, this.start, this.ende, params);
  }

  ids(): readonly string[] {
    return [this.id];
  }

  /** Prüft die neue Lage wie der Konstruktor: Reicht sie in den Boden, fliegt ein RangeError. */
  verschobenUm(dv: Vec3): Plane {
    return new Plane(this.id, this.start.add(dv), this.ende.add(dv), this.params);
  }

  /** Ohne `um` um die Mitte der Aufhängelinie. */
  gedreht(winkelRad: number, um: Vec3 = mitteVon(this.start, this.ende)): Plane {
    return new Plane(this.id, this.start.gedrehtUmY(winkelRad, um), this.ende.gedrehtUmY(winkelRad, um), this.params);
  }

  /** Die Ösen; so zählte der Platzbedarf sie schon bisher (Spec v2b, D4). */
  platzPunkte(): readonly Vec3[] {
    return this.oesen;
  }

  naechsteOese(p: Vec3): Vec3 {
    return this.oesen.reduce((beste, o) => (o.distanceTo(p) < beste.distanceTo(p) ? o : beste));
  }

  abstandZurOese(p: Vec3): number {
    return this.naechsteOese(p).distanceTo(p);
  }

  /** Richtung von der Linie weg, quer zu ihr und um die Neigung nach unten gekippt. Steht immer senkrecht auf u. */
  private static hangrichtung(u: Vec3, seite: 1 | -1, neigungGrad: number): Vec3 {
    const quer = Vec3.OBEN.cross(u).normalize().scale(seite);
    const senkrecht = quer.cross(u).normalize();
    const runter = senkrecht.y > 0 ? senkrecht.scale(-1) : senkrecht;
    const w = neigungGrad * GRAD;
    return quer.scale(Math.cos(w)).add(runter.scale(Math.sin(w)));
  }

  private static pruefeParams(p: PlanenParams): void {
    if (!(Number.isFinite(p.breite) && p.breite > 0)) throw new RangeError('Planenbreite muss größer als 0 sein');
    if (!(Number.isFinite(p.laenge) && p.laenge > 0)) throw new RangeError('Planenlänge muss größer als 0 sein');
    if (!(Number.isFinite(p.neigungGrad) && p.neigungGrad >= 0 && p.neigungGrad <= 90)) {
      throw new RangeError('Neigung muss zwischen 0 und 90° liegen');
    }
    if (p.form !== 'eben' && p.form !== 'satteldach') throw new RangeError('Unbekannte Planenform');
    if (p.seite !== 1 && p.seite !== -1) throw new RangeError('Seite muss +1 oder -1 sein');
  }
}
