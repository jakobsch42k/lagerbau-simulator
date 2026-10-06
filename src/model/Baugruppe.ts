import { Fuss } from './Fuss';
import type { LagerObjekt } from './LagerObjekt';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

export type BaugruppenTyp = 'dreibein' | 'abock';

/** Parametrische Baugruppe, die ihre Stangen selbst erzeugt. */
export abstract class Baugruppe implements LagerObjekt {
  abstract readonly typ: BaugruppenTyp;

  constructor(
    readonly id: string,
    readonly position: Vec3,
    readonly drehung: number,
  ) {
    if (!Number.isFinite(drehung)) throw new RangeError('Drehung muss eine endliche Zahl sein');
  }

  /** Im Objekt-Modell ist die Art der Baugruppen-Typ. */
  get art(): BaugruppenTyp {
    return this.typ;
  }

  protected static pruefePositiv(wert: number, name: string): void {
    if (!(Number.isFinite(wert) && wert > 0)) throw new RangeError(`${name} muss größer als 0 sein`);
  }

  /** Eigene id und die ids der Stangen; ein Klick auf eine Stange wählt die ganze Gruppe. */
  ids(): readonly string[] {
    return [this.id, ...this.stangen().map((s) => s.id)];
  }

  drehpunkt(): Vec3 {
    return this.position;
  }

  verschobenUm(dv: Vec3): Baugruppe {
    return this.verschoben(this.position.add(dv));
  }

  /** Die Füße der Stangen; so zählte der Platzbedarf sie schon bisher. */
  platzPunkte(): readonly Vec3[] {
    return this.stangen()
      .flatMap((s) => Fuss.von(s))
      .map((f) => f.position);
  }

  abstract mitId(id: string): Baugruppe;
  abstract stangen(): readonly Stange[];
  abstract spitze(): Vec3;
  abstract hoehe(): number;
  abstract beinwinkelGrad(): number;
  /** Ohne `um` um die eigene Position (wie bisher), sonst um die senkrechte Achse durch `um`. */
  abstract gedreht(delta: number, um?: Vec3): Baugruppe;
  /** Auf eine absolute Position. */
  abstract verschoben(position: Vec3): Baugruppe;
}
