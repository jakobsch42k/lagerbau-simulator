import type { Analyse } from './Analyse';
import { R7_MIN_HOEHE } from './constants';
import { type Hinweis, hinweis, type Rule } from './Rule';

/** R7: Ein Querseil (Bau↔Bau, Bau↔Baum, Baum↔Baum) darf nicht tief hängen. Seile zum Hering sind normal. */
export class StolperfalleRule implements Rule {
  readonly name = 'R7';

  constructor(private readonly minHoehe = R7_MIN_HOEHE) {}

  pruefe(a: Analyse): Hinweis[] {
    return a.seile.flatMap((s): Hinweis[] => {
      const istQuerseil = a.verankerungVon(s.id).every((v) => v.art === 'bau' || v.art === 'baum');
      if (!istQuerseil || s.tiefsteHoehe >= this.minHoehe) return [];
      return [hinweis(this.name, 'Seil hängt tief: Stolper- oder Halsgefahr. Höher spannen oder gut sichtbar markieren.', [s.id])];
    });
  }
}
