import { describe, expect, it } from 'vitest';
import { MaterialPosten, seilLaenge } from './MaterialPosten';

const p = (kategorie: string, bezeichnung: string, menge: number, einheit: 'Stk' | 'm' = 'Stk'): MaterialPosten => ({ kategorie, bezeichnung, menge, einheit });

describe('MaterialPosten.summiere', () => {
  it('addiert gleiche Kategorie + Bezeichnung + Einheit', () => {
    const summe = MaterialPosten.summiere([p('Haring', 'Haring', 2), p('Haring', 'Haring', 3), p('Zaun', 'Zaun', 5, 'm'), p('Zaun', 'Zaun', 2.5, 'm')]);
    expect(summe).toEqual([p('Haring', 'Haring', 5), p('Zaun', 'Zaun', 7.5, 'm')]);
  });

  it('trennt verschiedene Einheiten', () => {
    expect(MaterialPosten.summiere([p('A', 'x', 1), p('A', 'x', 1, 'm')])).toHaveLength(2);
  });

  it('sortiert nach Kategorie, dann Bezeichnung', () => {
    const summe = MaterialPosten.summiere([p('Zelt', 'B', 1), p('Haring', 'Z', 1), p('Haring', 'A', 1)]);
    expect(summe.map((x) => `${x.kategorie}/${x.bezeichnung}`)).toEqual(['Haring/A', 'Haring/Z', 'Zelt/B']);
  });

  it('sortiert Seile absteigend nach Länge, nicht alphabetisch', () => {
    const summe = MaterialPosten.summiere([p('Seil', 'Seil 4 m', 1), p('Seil', 'Seil 12 m', 1), p('Seil', 'Seil 9 m', 2)]);
    expect(summe.map((x) => x.bezeichnung)).toEqual(['Seil 12 m', 'Seil 9 m', 'Seil 4 m']);
  });

  it('verändert die Eingabe nicht', () => {
    const eingabe = [p('B', 'x', 1), p('A', 'x', 1)];
    MaterialPosten.summiere(eingabe);
    expect(eingabe[0]?.kategorie).toBe('B');
  });
});

describe('seilLaenge', () => {
  it('rundet Länge plus Zugabe an beiden Enden auf ganze Meter auf, mit Toleranz', () => {
    expect(seilLaenge(3, 0.5)).toBe(4);
    expect(seilLaenge(3.2, 0.5)).toBe(5);
    expect(seilLaenge(2.5, 0.25)).toBe(3);
  });
});
