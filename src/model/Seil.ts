import { MIN_SEILLAENGE } from './konstanten';
import type { LagerObjekt } from './LagerObjekt';
import type { Vec3 } from './Vec3';

/** Ein gespanntes Seil als gerade Strecke start–ende. Kein Durchhang, keine Kräfte (Spec v2a, D1). */
export class Seil implements LagerObjekt {
  readonly art = 'seil' as const;

  constructor(
    readonly id: string,
    readonly start: Vec3,
    readonly ende: Vec3,
  ) {
    const laenge = start.distanceTo(ende);
    if (!Number.isFinite(laenge) || !(laenge >= MIN_SEILLAENGE)) {
      throw new RangeError(`Ein Seil muss mindestens ${MIN_SEILLAENGE} m lang sein`);
    }
  }

  get laenge(): number {
    return this.start.distanceTo(this.ende);
  }

  /** Winkel der Seillinie zur Waagrechten in Grad, 0–90. */
  get winkelZumBodenGrad(): number {
    const hoehenunterschied = Math.abs(this.ende.y - this.start.y);
    return (Math.asin(Math.min(1, hoehenunterschied / this.laenge)) * 180) / Math.PI;
  }

  /** Tiefster Punkt der geraden Seillinie: das tiefere Ende. */
  get tiefsteHoehe(): number {
    return Math.min(this.start.y, this.ende.y);
  }

  endpunkte(): readonly [Vec3, Vec3] {
    return [this.start, this.ende];
  }

  ids(): readonly string[] {
    return [this.id];
  }

  verschobenUm(dv: Vec3): Seil {
    return new Seil(this.id, this.start.add(dv), this.ende.add(dv));
  }

  /** Ohne `um` um die Mitte des Seils. */
  gedreht(winkelRad: number, um: Vec3 = this.start.add(this.ende).scale(0.5)): Seil {
    return new Seil(this.id, this.start.gedrehtUmY(winkelRad, um), this.ende.gedrehtUmY(winkelRad, um));
  }

  /** Ein Seil braucht selbst keinen Platz; seine Haringe zählt `Platzbedarf` über `Bauwerk.haringe()`. */
  platzPunkte(): readonly Vec3[] {
    return [];
  }
}
