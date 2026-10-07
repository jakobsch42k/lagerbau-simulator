import { pruefeFarbe, pruefeText } from './farbe';
import type { LagerObjekt } from './LagerObjekt';
import type { BeschriftungParams } from './params';
import { Vec3 } from './Vec3';

export const MAX_TEXT_ZEICHEN = 80;

/** Ein Text auf dem Plan (Spec E3, D1). Die Schrifthöhe ist in Metern; der Text dreht sich nicht mit, nur seine Position. */
export class Beschriftung implements LagerObjekt {
  readonly art = 'beschriftung' as const;
  readonly position: Vec3;

  constructor(
    readonly id: string,
    position: Vec3,
    readonly params: BeschriftungParams,
  ) {
    pruefeText(params.text, MAX_TEXT_ZEICHEN, 'Text');
    if (!(Number.isFinite(params.groesse) && params.groesse > 0)) throw new RangeError('Schrifthöhe muss größer als 0 sein');
    pruefeFarbe(params.farbe);
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) throw new RangeError('Die Position muss endlich sein');
    this.position = new Vec3(position.x, 0, position.z);
  }

  mitParams(params: BeschriftungParams): Beschriftung {
    return new Beschriftung(this.id, this.position, params);
  }

  ids(): readonly string[] {
    return [this.id];
  }

  mitId(id: string): Beschriftung {
    return new Beschriftung(id, this.position, this.params);
  }

  drehpunkt(): Vec3 {
    return this.position;
  }

  verschobenUm(dv: Vec3): Beschriftung {
    return new Beschriftung(this.id, this.position.add(dv), this.params);
  }

  gedreht(winkelRad: number, um: Vec3 = this.position): Beschriftung {
    return new Beschriftung(this.id, this.position.gedrehtUmY(winkelRad, um), this.params);
  }

  platzPunkte(): readonly Vec3[] {
    return [this.position];
  }
}
