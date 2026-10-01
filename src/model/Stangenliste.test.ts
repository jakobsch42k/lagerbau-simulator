import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from './Bauwerk';
import { Stange } from './Stange';
import { Stangenliste } from './Stangenliste';
import { Vec3 } from './Vec3';

describe('Stangenliste', () => {
  it('zählt Stangen je aufgerundeter Länge und Ø', () => {
    const b = Bauwerk.leer()
      .mitStange(new Stange('a', Vec3.NULL, new Vec3(0, 2.4, 0), 0.08))
      .mitStange(new Stange('b', new Vec3(1, 0, 0), new Vec3(1, 2.4, 0), 0.08))
      .mitStange(new Stange('c', new Vec3(3, 0, 0), new Vec3(3, 1.65, 0), 0.08))
      .mitStange(new Stange('d', new Vec3(5, 0, 0), new Vec3(5, 2.4, 0), 0.1));
    expect(Stangenliste.aus(b).zeilen).toEqual([
      { laenge: 2.4, durchmesserCm: 10, anzahl: 1 },
      { laenge: 2.4, durchmesserCm: 8, anzahl: 2 },
      { laenge: 1.7, durchmesserCm: 8, anzahl: 1 },
    ]);
    expect(Stangenliste.aus(b).anzahlBuende).toBe(0);
  });

  it('listet alle sieben Stangen und vier Bünde der Kochstelle', () => {
    const liste = Stangenliste.aus(kochstelle());
    expect(liste.zeilen.reduce((summe, z) => summe + z.anzahl, 0)).toBe(7);
    expect(liste.anzahlBuende).toBe(4);
  });
});
