import type { Analyse } from './Analyse';

export type Schwere = 'info' | 'warnung';

export interface Hinweis {
  readonly regel: string;
  readonly schwere: Schwere;
  readonly text: string;
  /** Stangen- oder Gruppen-IDs, die in der 3D-Ansicht markiert werden. */
  readonly betroffeneTeile: readonly string[];
}

/** Eine Faustregel. Rechnet nichts aus, sondern erkennt typische Planungsfehler an der Geometrie. */
export interface Rule {
  readonly name: string;
  pruefe(analyse: Analyse): readonly Hinweis[];
}

export function hinweis(regel: string, text: string, betroffeneTeile: readonly string[], schwere: Schwere = 'warnung'): Hinweis {
  return { regel, schwere, text, betroffeneTeile };
}
