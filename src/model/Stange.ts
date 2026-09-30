import { clamp } from './geometrie';
import { MIN_STANGENLAENGE, STANGEN_UEBERSTAND } from './konstanten';
import type { Vec3 } from './Vec3';

export type StangenRolle = 'bein' | 'riegel' | 'frei';

/** Eine Rundholzstange als Strecke start–ende mit Durchmesser. */
export class Stange {
  constructor(
    readonly id: string,
    readonly start: Vec3,
    readonly ende: Vec3,
    readonly durchmesser: number,
    readonly rolle: StangenRolle = 'frei',
    readonly gruppeId: string | null = null,
  ) {
    if (start.distanceTo(ende) < MIN_STANGENLAENGE) {
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
    if (a.distanceTo(b) < MIN_STANGENLAENGE) {
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
}
