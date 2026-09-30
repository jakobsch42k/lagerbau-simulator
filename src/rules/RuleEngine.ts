import type { Bauwerk } from '../model/Bauwerk';
import { Analyse } from './Analyse';
import type { Hinweis, Rule } from './Rule';

export class RuleEngine {
  constructor(private readonly regeln: readonly Rule[]) {}

  pruefe(bauwerk: Bauwerk): Hinweis[] {
    const analyse = new Analyse(bauwerk);
    return this.regeln.flatMap((r) => r.pruefe(analyse));
  }
}
