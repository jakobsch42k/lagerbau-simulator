import { describe, expect, it } from 'vitest';
import { BauwerkSerializer } from '../share/BauwerkSerializer';
import fixture from './fixtures/lagerplatz-stabil.json';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

// Ein echter, stehender Lagerplatz-Bau (5 Baugruppen, 8 Stangen, 11 Seile, 3 Bäume, 4 Planen) aus einem Link.
const bau = new BauwerkSerializer().ausJson(fixture);
const hinweise = new RuleEngine(standardRegeln()).pruefe(bau);

describe('Lagerplatz-Bau mit Abspannungen (R2 sieht feste Knoten)', () => {
  it('keine R2-Hinweise, obwohl der Bau Vierecke ohne eigene Diagonale enthält', () => {
    expect(hinweise.filter((h) => h.regel === 'R2')).toEqual([]);
  });

  it('übrige Hinweise unverändert: genau ein R7 am Seil seil-4411b359', () => {
    expect(hinweise.map((h) => [h.regel, [...h.betroffeneTeile]])).toEqual([['R7', ['seil-4411b359']]]);
  });
});
