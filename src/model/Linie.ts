import { pruefeFarbe, pruefeText } from './farbe';
import type { LagerObjekt } from './LagerObjekt';
import type { LinienParams } from './params';
import { bboxMitte, pfadLaenge } from './polygon';
import { Vec3 } from './Vec3';

export const MIN_LINIEN_PUNKTE = 2;
const MAX_NAME_ZEICHEN = 40;

/** Ein Linienzug am Boden aus mindestens 2 Punkten: Weg, Zaun oder Grenze (Spec E3, D1). Y der Punkte ist immer 0; Kreuzen ist erlaubt. */
export class Linie implements LagerObjekt {
  readonly art = 'linie' as const;
  readonly punkte: readonly Vec3[];
  readonly eckenGeschlossen = false;

  constructor(
    readonly id: string,
    punkte: readonly Vec3[],
    readonly params: LinienParams,
  ) {
    if (punkte.length < MIN_LINIEN_PUNKTE) throw new RangeError('Eine Linie braucht mindestens 2 Punkte.');
    if (!punkte.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z))) throw new RangeError('Die Punkte müssen endlich sein');
    pruefeText(params.name, MAX_NAME_ZEICHEN, 'Name');
    pruefeFarbe(params.farbe);
    if (params.typ !== 'weg' && params.typ !== 'zaun' && params.typ !== 'grenze') throw new RangeError('Typ muss Weg, Zaun oder Grenze sein');
    if (params.typ === 'weg' && !(Number.isFinite(params.breite) && params.breite > 0)) throw new RangeError('Breite muss größer als 0 sein');
    this.punkte = punkte.map((p) => new Vec3(p.x, 0, p.z));
  }

  /** Länge des Linienzugs in m. */
  laenge(): number {
    return pfadLaenge(this.punkte);
  }

  mitParams(params: LinienParams): Linie {
    return new Linie(this.id, this.punkte, params);
  }

  /** Dieselbe Linie mit anderen Punkten; prüft neu (Mindestzahl). Für das Bearbeiten der Ecken. */
  mitEcken(punkte: readonly Vec3[]): Linie {
    return new Linie(this.id, punkte, this.params);
  }

  /** Die Ecken zum Bearbeiten (Griffe). */
  ecken(): readonly Vec3[] {
    return this.punkte;
  }

  ids(): readonly string[] {
    return [this.id];
  }

  mitId(id: string): Linie {
    return new Linie(id, this.punkte, this.params);
  }

  /** Die Mitte des umschließenden Rechtecks. */
  drehpunkt(): Vec3 {
    return bboxMitte(this.punkte);
  }

  verschobenUm(dv: Vec3): Linie {
    return new Linie(this.id, this.punkte.map((p) => p.add(dv)), this.params);
  }

  gedreht(winkelRad: number, um: Vec3 = this.drehpunkt()): Linie {
    return new Linie(this.id, this.punkte.map((p) => p.gedrehtUmY(winkelRad, um)), this.params);
  }

  platzPunkte(): readonly Vec3[] {
    return this.punkte;
  }
}
