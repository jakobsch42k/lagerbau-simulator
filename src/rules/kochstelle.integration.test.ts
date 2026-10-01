import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

// Läuft mit den Schwellwerten aus constants.ts. Schlägt Test 2 fehl, nachdem Jakob Werte geändert hat,
// ist das eine echte Aussage: Entweder ist die Referenz-Kochstelle nach seinen Regeln nicht in Ordnung
// oder ein Schwellwert ist zu streng. Mit Jakob klären, nicht den Test anpassen.
const engine = new RuleEngine(standardRegeln());

describe('Kochstelle mit allen Regeln', () => {
  it('Test 2: die komplette Kochstelle erzeugt keine Hinweise', () => {
    expect(engine.pruefe(kochstelle())).toEqual([]);
  });

  it('Test 3: ohne First meldet R1 den A-Bock', () => {
    const h = engine.pruefe(kochstelle().ohne('first'));
    expect(h.some((x) => x.regel === 'R1' && x.betroffeneTeile.includes('abock'))).toBe(true);
  });

  it('ein leeres Bauwerk erzeugt keine Hinweise', () => {
    expect(engine.pruefe(Bauwerk.leer())).toEqual([]);
  });

  it('enthält die acht Regeln R1–R8', () => {
    expect(standardRegeln().map((r) => r.name)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8']);
  });
});
