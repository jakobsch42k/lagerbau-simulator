import type { BaumParams } from './params';
import { Vec3 } from './Vec3';

/** Ein Baum auf dem Lagerplatz: senkrechter Stamm ab dem Boden. Teil des Platzes, nicht des Baus. */
export class Baum {
  readonly position: Vec3;

  constructor(
    readonly id: string,
    position: Vec3,
    readonly params: BaumParams,
  ) {
    if (!(Number.isFinite(params.durchmesser) && params.durchmesser > 0)) throw new RangeError('Stammdurchmesser muss größer als 0 sein');
    if (!(Number.isFinite(params.hoehe) && params.hoehe > 0)) throw new RangeError('Baumhöhe muss größer als 0 sein');
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) throw new RangeError('Die Position muss endlich sein');
    this.position = new Vec3(position.x, 0, position.z);
  }

  mitParams(params: BaumParams): Baum {
    return new Baum(this.id, this.position, params);
  }

  /** Abstand eines Punkts zur Stammoberfläche. Unter dem Boden oder über der Baumhöhe: unendlich. */
  abstandZumStamm(p: Vec3): number {
    if (p.y < 0 || p.y > this.params.hoehe) return Infinity;
    const waagrecht = Math.hypot(p.x - this.position.x, p.z - this.position.z);
    return Math.abs(waagrecht - this.params.durchmesser / 2);
  }
}
