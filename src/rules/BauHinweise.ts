import { Bau } from '../model/Bau';
import type { Bauwerk } from '../model/Bauwerk';
import type { Hinweis } from './Rule';

/** Ein Hinweis mit dem Bau, den er betrifft (Spec E5, D4). `null` = kein Bau, der Hinweis bleibt wie bisher. */
export interface BauHinweis extends Hinweis {
  readonly bau: Bau | null;
  readonly bauName: string | null;
}

export class BauHinweise {
  /**
   * Ordnet jeden Hinweis dem Bau seines ersten `betroffeneTeile` zu. Die Regeln laufen weiter einmal über das ganze Bauwerk;
   * hier ändert sich kein Text. Ein Seil zwischen zwei Bauten gehört zum zuerst gefundenen.
   */
  static zuordnen(bauwerk: Bauwerk, hinweise: readonly Hinweis[]): readonly BauHinweis[] {
    const imBau = new Map<string, Bau>();
    for (const bau of Bau.alle(bauwerk)) for (const id of bau.objektIds) if (!imBau.has(id)) imBau.set(id, bau);
    return hinweise.map((h) => {
      const erstes = h.betroffeneTeile[0];
      const objektId = erstes === undefined ? undefined : bauwerk.besitzer(erstes)?.id;
      const bau = (objektId === undefined ? undefined : imBau.get(objektId)) ?? null;
      return { ...h, bau, bauName: bau ? bauwerk.bauName(bau) : null };
    });
  }
}
