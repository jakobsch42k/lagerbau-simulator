import { pruefeFarbe, pruefeText } from './farbe';
import type { LagerObjekt } from './LagerObjekt';
import type { ZoneParams } from './params';
import { bboxMitte, flaeche, schneidetSichSelbst } from './polygon';
import { Vec3 } from './Vec3';

export const MIN_ZONEN_ECKEN = 3;
const MAX_NAME_ZEICHEN = 40;

/** Eine Fläche am Boden aus mindestens 3 Ecken, die sich nicht selbst schneidet (Spec E3, D1). Y der Ecken ist immer 0. */
export class Zone implements LagerObjekt {
  readonly art = 'zone' as const;
  readonly punkte: readonly Vec3[];

  constructor(
    readonly id: string,
    punkte: readonly Vec3[],
    readonly params: ZoneParams,
  ) {
    if (punkte.length < MIN_ZONEN_ECKEN) throw new RangeError('Eine Zone braucht mindestens 3 Ecken.');
    if (!punkte.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z))) throw new RangeError('Die Punkte müssen endlich sein');
    pruefeText(params.name, MAX_NAME_ZEICHEN, 'Name');
    pruefeFarbe(params.farbe);
    if (!(Number.isFinite(params.deckkraft) && params.deckkraft >= 0 && params.deckkraft <= 100)) {
      throw new RangeError('Deckkraft muss zwischen 0 und 100 % liegen');
    }
    this.punkte = punkte.map((p) => new Vec3(p.x, 0, p.z));
    if (schneidetSichSelbst(this.punkte)) throw new RangeError('Die Zone darf sich nicht selbst schneiden.');
  }

  /** Fläche in m² (Shoelace). */
  flaeche(): number {
    return flaeche(this.punkte);
  }

  mitParams(params: ZoneParams): Zone {
    return new Zone(this.id, this.punkte, params);
  }

  /** Dieselbe Zone mit anderen Ecken; prüft neu (Mindestzahl, Selbstschnitt). Für das Bearbeiten der Ecken. */
  mitPunkten(punkte: readonly Vec3[]): Zone {
    return new Zone(this.id, punkte, this.params);
  }

  ids(): readonly string[] {
    return [this.id];
  }

  mitId(id: string): Zone {
    return new Zone(id, this.punkte, this.params);
  }

  /** Die Mitte des umschließenden Rechtecks. */
  drehpunkt(): Vec3 {
    return bboxMitte(this.punkte);
  }

  verschobenUm(dv: Vec3): Zone {
    return new Zone(this.id, this.punkte.map((p) => p.add(dv)), this.params);
  }

  gedreht(winkelRad: number, um: Vec3 = this.drehpunkt()): Zone {
    return new Zone(this.id, this.punkte.map((p) => p.gedrehtUmY(winkelRad, um)), this.params);
  }

  /** Die Ecken, für Rahmen, „Alles zeigen“ und Mitte; nicht für den Platzbedarf. */
  platzPunkte(): readonly Vec3[] {
    return this.punkte;
  }
}
