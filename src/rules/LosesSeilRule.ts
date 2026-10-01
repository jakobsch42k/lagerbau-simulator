import type { Analyse } from './Analyse';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R8: Jedes Seilende muss an einem Hering, Baum oder einer Stange hängen. */
export class LosesSeilRule implements Rule {
  readonly name = 'R8';

  pruefe(a: Analyse): Hinweis[] {
    return a.seile
      .filter((s) => a.verankerungVon(s.id).some((v) => v.art === 'frei'))
      .map((s) => hinweis(this.name, 'Seil hängt in der Luft: ein Ende ist nirgends befestigt.', [s.id]));
  }
}
