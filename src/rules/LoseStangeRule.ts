import type { Analyse } from './Analyse';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R5: Eine Stange braucht mindestens zwei Halte-Punkte (Bünde oder Füße). */
export class LoseStangeRule implements Rule {
  readonly name = 'R5';

  pruefe(a: Analyse): Hinweis[] {
    return a.stangen.flatMap((s) => {
      const buende = a.buendeVon(s.id).length;
      const fuesse = a.fuesseVon(s.id).length;
      if (buende + fuesse > 1) return [];
      const text =
        buende === 1
          ? 'Diese Stange hängt nur an einem Bund.'
          : fuesse === 1
            ? 'Diese Stange steht frei, ohne Bund.'
            : 'Diese Stange ist mit nichts verbunden.';
      return [hinweis(this.name, text, [s.id])];
    });
  }
}
