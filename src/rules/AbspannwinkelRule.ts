import type { Analyse } from './Analyse';
import { R6_MAX_WINKEL_GRAD, R6_MIN_WINKEL_GRAD } from './constants';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R6: Ein Seil vom Bau zum Hering soll weder sehr flach noch sehr steil sein. */
export class AbspannwinkelRule implements Rule {
  readonly name = 'R6';

  constructor(
    private readonly minGrad = R6_MIN_WINKEL_GRAD,
    private readonly maxGrad = R6_MAX_WINKEL_GRAD,
  ) {}

  pruefe(a: Analyse): Hinweis[] {
    return a.seile.flatMap((s): Hinweis[] => {
      const arten = a
        .verankerungVon(s.id)
        .map((v) => v.art)
        .sort()
        .join('+');
      if (arten !== 'bau+hering') return [];
      const winkel = s.winkelZumBodenGrad;
      if (winkel < this.minGrad) return [hinweis(this.name, 'Seil sehr flach: braucht viel Platz.', [s.id])];
      if (winkel > this.maxGrad) return [hinweis(this.name, 'Seil sehr steil: hält seitlich kaum.', [s.id])];
      return [];
    });
  }
}
