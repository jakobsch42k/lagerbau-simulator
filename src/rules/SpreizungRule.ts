import type { Analyse } from './Analyse';
import { R4_MAX_BEINWINKEL_GRAD, R4_MIN_BEINWINKEL_GRAD } from './constants';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R4: Der Beinwinkel zur Senkrechten muss in einem vernünftigen Bereich liegen. */
export class SpreizungRule implements Rule {
  readonly name = 'R4';

  constructor(
    private readonly minGrad = R4_MIN_BEINWINKEL_GRAD,
    private readonly maxGrad = R4_MAX_BEINWINKEL_GRAD,
  ) {}

  pruefe(a: Analyse): Hinweis[] {
    return a.bauwerk.gruppen.flatMap((g): Hinweis[] => {
      const winkel = g.beinwinkelGrad();
      const grad = winkel.toFixed(0);
      if (winkel < this.minGrad) {
        return [hinweis(this.name, `Beine sehr steil (${grad}°), der Bau kippt leicht. Füße weiter auseinander.`, [g.id])];
      }
      if (winkel > this.maxGrad) {
        return [hinweis(this.name, `Beine sehr flach gespreizt (${grad}°), sie können wegrutschen.`, [g.id])];
      }
      return [];
    });
  }
}
