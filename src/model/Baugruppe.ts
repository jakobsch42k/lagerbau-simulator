import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

export type BaugruppenTyp = 'dreibein' | 'abock';

/** Parametrische Baugruppe, die ihre Stangen selbst erzeugt. */
export abstract class Baugruppe {
  abstract readonly typ: BaugruppenTyp;

  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly drehung: number,
  ) {}

  protected static pruefePositiv(wert: number, name: string): void {
    if (!(wert > 0)) throw new RangeError(`${name} muss größer als 0 sein`);
  }

  abstract stangen(): readonly Stange[];
  abstract spitze(): Vec3;
  abstract hoehe(): number;
  abstract beinwinkelGrad(): number;
  abstract gedreht(delta: number): Baugruppe;
  abstract verschoben(position: Vec3): Baugruppe;
}
