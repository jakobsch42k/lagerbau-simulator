import { FUSS_TOLERANZ } from './konstanten';
import type { Stange } from './Stange';
import type { Vec3 } from './Vec3';

/** Ein Stangenende, das auf dem Boden steht. */
export class Fuss {
  constructor(
    readonly stangeId: string,
    readonly position: Vec3,
  ) {}

  static von(stange: Stange): Fuss[] {
    return stange
      .endpunkte()
      .filter((p) => p.y <= FUSS_TOLERANZ)
      .map((p) => new Fuss(stange.id, p));
  }
}
