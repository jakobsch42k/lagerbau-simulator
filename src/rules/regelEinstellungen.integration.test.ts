import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_DREIBEIN } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { RegelEinstellungen } from './RegelEinstellungen';
import type { Hinweis } from './Rule';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

/** Ein Dreibein mit Beinwinkel asin(r ÷ 2,2): r = 1,35 m → 38°, r = 1,4 m → 40°, r = 0,2 m → 5°. */
const dreibein = (fusskreisradius: number): Bauwerk =>
  Bauwerk.leer().mitGruppe(new Dreibein('d', Vec3.NULL, 0, { ...STANDARD_DREIBEIN, fusskreisradius }));
const regeln = (hinweise: readonly Hinweis[]): string[] => hinweise.map((h) => h.regel);

describe('Regel-Einstellungen in der Prüfung (Spec v3, D8)', () => {
  it('ergibt ohne Einstellungen genau die Hinweise von heute', () => {
    const heute = new RuleEngine(standardRegeln());
    for (const b of [kochstelle(), kochstelle().ohne('first'), dreibein(1.4), dreibein(0.2), Bauwerk.leer()]) {
      expect(RuleEngine.fuer(b.regelEinstellungen).pruefe(b)).toEqual(heute.pruefe(b));
    }
    expect(regeln(heute.pruefe(dreibein(1.4)))).toEqual(['R4']);
  });

  it('überspringt eine abgeschaltete Regel', () => {
    expect(regeln(RuleEngine.fuer(RegelEinstellungen.standard().mitAus('R4', true)).pruefe(dreibein(1.4)))).toEqual([]);
  });

  it('prüft mit dem eingestellten Wert: R4 höchstens 40° → keine Warnung bei 38°', () => {
    const b = dreibein(1.35);
    expect(regeln(RuleEngine.fuer(RegelEinstellungen.standard()).pruefe(b))).toEqual(['R4']);
    expect(regeln(RuleEngine.fuer(RegelEinstellungen.standard().mitWert('R4_MAX_BEINWINKEL_GRAD', 40)).pruefe(b))).toEqual([]);
  });
});
