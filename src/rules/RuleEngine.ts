import type { Bauwerk } from '../model/Bauwerk';
import { Analyse } from './Analyse';
import type { RegelEinstellungen } from './RegelEinstellungen';
import type { Hinweis, Rule } from './Rule';
import { standardRegeln } from './standardRegeln';

export class RuleEngine {
  /** @param aus Namen abgeschalteter Regeln; sie werden übersprungen (Spec v3, D8). */
  constructor(
    private readonly regeln: readonly Rule[],
    private readonly aus: ReadonlySet<string> = new Set(),
  ) {}

  /** R1–R8 mit den Einstellungen eines Bauwerks: eingestellte Werte, abgeschaltete Regeln übersprungen. */
  static fuer(einstellungen: RegelEinstellungen): RuleEngine {
    return new RuleEngine(standardRegeln(einstellungen), einstellungen.aus);
  }

  pruefe(bauwerk: Bauwerk): Hinweis[] {
    const analyse = new Analyse(bauwerk);
    return this.regeln.filter((r) => !this.aus.has(r.name)).flatMap((r) => r.pruefe(analyse));
  }
}
