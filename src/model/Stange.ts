import { Fuss } from './Fuss';
import { clamp } from './geometrie';
import { MIN_STANGENLAENGE, STANGEN_UEBERSTAND } from './konstanten';
import type { LagerObjekt } from './LagerObjekt';
import type { Vec3 } from './Vec3';

export type StangenRolle = 'bein' | 'riegel' | 'frei';

/** Eine Rundholzstange als Strecke start–ende mit Durchmesser. */
export class Stange implements LagerObjekt {
  readonly art = 'stange' as const;

  constructor(
    readonly id: string,
    readonly start: Vec3,
    readonly ende: Vec3,
    readonly durchmesser: number,
    readonly rolle: StangenRolle = 'frei',
    readonly gruppeId: string | null = null,
  ) {
    const abstand = start.distanceTo(ende);
    if (!Number.isFinite(abstand) || !(abstand >= MIN_STANGENLAENGE)) {
      throw new RangeError(`Eine Stange muss mindestens ${MIN_STANGENLAENGE} m lang sein`);
    }
    if (!(durchmesser > 0)) throw new RangeError('Durchmesser muss größer als 0 sein');
  }

  /** Stange durch a und b, an den Enden um den jeweiligen Überstand verlängert. */
  static zwischen(
    id: string,
    a: Vec3,
    b: Vec3,
    durchmesser: number,
    ueberstandStart = STANGEN_UEBERSTAND,
    ueberstandEnde = STANGEN_UEBERSTAND,
  ): Stange {
    const abstand = a.distanceTo(b);
    if (!Number.isFinite(abstand) || !(abstand >= MIN_STANGENLAENGE)) {
      throw new RangeError(`Die Punkte liegen näher als ${MIN_STANGENLAENGE} m beieinander`);
    }
    const r = b.sub(a).normalize();
    return new Stange(id, a.sub(r.scale(ueberstandStart)), b.add(r.scale(ueberstandEnde)), durchmesser);
  }

  get laenge(): number {
    return this.start.distanceTo(this.ende);
  }

  get richtung(): Vec3 {
    return this.ende.sub(this.start).normalize();
  }

  endpunkte(): readonly [Vec3, Vec3] {
    return [this.start, this.ende];
  }

  naechsterPunkt(p: Vec3): Vec3 {
    const d = this.ende.sub(this.start);
    const t = clamp(p.sub(this.start).dot(d) / d.dot(d), 0, 1);
    return this.start.add(d.scale(t));
  }

  mitDurchmesser(durchmesser: number): Stange {
    return new Stange(this.id, this.start, this.ende, durchmesser, this.rolle, this.gruppeId);
  }

  ids(): readonly string[] {
    return [this.id];
  }

  mitId(id: string): Stange {
    return new Stange(id, this.start, this.ende, this.durchmesser, this.rolle, this.gruppeId);
  }

  drehpunkt(): Vec3 {
    return this.mitte();
  }

  /** Rolle und Gruppe bleiben, damit auch eine Stange einer Baugruppe sie behält. */
  verschobenUm(dv: Vec3): Stange {
    return new Stange(this.id, this.start.add(dv), this.ende.add(dv), this.durchmesser, this.rolle, this.gruppeId);
  }

  /** Ohne `um` um die Mitte der Stange. */
  gedreht(winkelRad: number, um: Vec3 = this.mitte()): Stange {
    return new Stange(
      this.id,
      this.start.gedrehtUmY(winkelRad, um),
      this.ende.gedrehtUmY(winkelRad, um),
      this.durchmesser,
      this.rolle,
      this.gruppeId,
    );
  }

  /** Die Enden am Boden (Füße); so zählte der Platzbedarf sie schon bisher. */
  platzPunkte(): readonly Vec3[] {
    return Fuss.von(this).map((f) => f.position);
  }

  private mitte(): Vec3 {
    return this.start.add(this.ende).scale(0.5);
  }
}
