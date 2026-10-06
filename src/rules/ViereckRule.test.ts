import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { lagertor } from './lagertor.fixture';
import { ViereckRule } from './ViereckRule';

const regel = new ViereckRule(0.05);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));

// Lagertor: zwei senkrechte Pfosten, oben ein Riegel, unten der Boden.
const pfosten0 = new Stange('p0', Vec3.NULL, new Vec3(0, 2.2, 0), 0.08);
const pfosten1 = new Stange('p1', new Vec3(2, 0, 0), new Vec3(2, 2.2, 0), 0.08);
const riegel = Stange.zwischen('r', new Vec3(0, 2, 0), new Vec3(2, 2, 0), 0.08);
const tor = Bauwerk.leer().mitStange(pfosten0).mitStange(pfosten1).mitStange(riegel);

describe('ViereckRule (R2)', () => {
  it('Test 4a: meldet ein Tor ohne Diagonale', () => {
    const h = pruefe(tor);
    expect(h).toHaveLength(1);
    expect(h[0]?.regel).toBe('R2');
    expect(h[0]?.text).toBe('Dieses Viereck kann sich verziehen, eine Diagonale fehlt.');
    expect([...(h[0]?.betroffeneTeile ?? [])].sort()).toEqual(['p0', 'p1', 'r']);
  });

  it('Test 4b: schweigt, sobald eine Diagonale drin ist', () => {
    const diagonale = Stange.zwischen('d', Vec3.NULL, new Vec3(2, 2, 0), 0.08, 0, 0.2);
    expect(pruefe(tor.mitStange(diagonale))).toEqual([]);
  });

  it('erkennt den A-Bock als ausgesteift (Beine treffen sich an der Spitze)', () => {
    expect(pruefe(Bauwerk.leer().mitGruppe(new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK)))).toEqual([]);
  });

  it('findet am Dreibein kein Viereck', () => {
    expect(pruefe(Bauwerk.leer().mitGruppe(new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN)))).toEqual([]);
  });

  it('bekannte Grenze: ein verwundenes Viereck wird nicht gemeldet', () => {
    const schief = new Stange('p1', new Vec3(2, 0, 1), new Vec3(2, 2.2, 0), 0.08);
    const punktAufSchief = schief.naechsterPunkt(new Vec3(2, 2, 0.09));
    const riegelSchief = Stange.zwischen('r', new Vec3(0, 2, 0), punktAufSchief, 0.08);
    const verwunden = Bauwerk.leer().mitStange(pfosten0).mitStange(schief).mitStange(riegelSchief);
    expect(pruefe(verwunden)).toEqual([]);
  });

  describe('feste Ecken (Lagertor aus zwei A-Böcken mit Firststange)', () => {
    it('ohne Seile: die Spitzen sind lose, beide Vierecke werden gemeldet', () => {
      const h = pruefe(lagertor(false));
      expect(h).toHaveLength(2);
      expect(h.every((x) => x.regel === 'R2')).toBe(true);
    });

    it('mit Längsabspannung je Spitze: alle Ecken fest, keine R2-Hinweise', () => {
      expect(pruefe(lagertor(true))).toEqual([]);
    });
  });
});
