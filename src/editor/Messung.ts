import type { Vec3 } from '../model/Vec3';

/** Eine Messung zwischen zwei Punkten (Spec E1, D5). Gehört nicht ins Bauwerk und wird nicht gespeichert. `bis` fehlt nach dem ersten Klick. */
export class Messung {
  constructor(
    readonly von: Vec3,
    readonly bis: Vec3 | null,
  ) {}

  /** Abstand in m; null nach dem ersten Klick. */
  get laenge(): number | null {
    return this.bis && this.von.distanceTo(this.bis);
  }

  /** Abstand in der Ebene am Boden in m; null nach dem ersten Klick. */
  get waagrecht(): number | null {
    return this.bis && Math.hypot(this.bis.x - this.von.x, this.bis.z - this.von.z);
  }

  /** „3.42 m (waagrecht 3.40 m)“; leer nach dem ersten Klick. */
  get text(): string {
    const { laenge, waagrecht } = this;
    return laenge === null || waagrecht === null ? '' : `${laenge.toFixed(2)} m (waagrecht ${waagrecht.toFixed(2)} m)`;
  }
}
