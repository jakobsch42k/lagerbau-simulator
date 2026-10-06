import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import type { Analyse } from './Analyse';
import { hinweis, type Rule } from './Rule';
import { RuleEngine } from './RuleEngine';

class ZaehlRegel implements Rule {
  constructor(readonly name: string) {}
  pruefe(a: Analyse) {
    return a.stangen.length > 0 ? [hinweis(this.name, `${a.stangen.length} Stangen`, [], 'info')] : [];
  }
}

describe('RuleEngine', () => {
  const engine = new RuleEngine([new ZaehlRegel('A'), new ZaehlRegel('B')]);

  it('sammelt die Hinweise aller Regeln in Reihenfolge', () => {
    const h = engine.pruefe(kochstelle());
    expect(h.map((x) => x.regel)).toEqual(['A', 'B']);
    expect(h[0]).toEqual({ regel: 'A', schwere: 'info', text: '7 Stangen', betroffeneTeile: [] });
  });

  it('liefert für ein leeres Bauwerk nichts', () => {
    expect(engine.pruefe(Bauwerk.leer())).toEqual([]);
  });

  it('setzt „warnung" als Standard-Schwere', () => {
    expect(hinweis('X', 't', ['a']).schwere).toBe('warnung');
  });

  it('überspringt abgeschaltete Regeln (Spec v3, D8)', () => {
    const mitAus = new RuleEngine([new ZaehlRegel('A'), new ZaehlRegel('B')], new Set(['A']));
    expect(mitAus.pruefe(kochstelle()).map((x) => x.regel)).toEqual(['B']);
  });
});
