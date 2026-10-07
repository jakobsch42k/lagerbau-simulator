import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Dreibein } from './Dreibein';
import { kopiere, mitte } from './Duplikat';
import { mitgenommen } from './Mitbewegung';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

const abock = new ABock('abock', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
const dreibein = new Dreibein('dreibein', new Vec3(2.5, 0, 0), 0, STANDARD_DREIBEIN);
const baumEnde = new Vec3(-3.85, 3, 0);
const ids = (os: readonly { id: string }[]): string[] => os.map((o) => o.id);
const mitBaum = () => kochstelle().mitBaum(new Baum('baum', new Vec3(-4, 0, 0), STANDARD_BAUM));

describe('mitgenommen', () => {
  it('nimmt Abspannung bis zum Haring und Planen mit beiden Enden am Bau mit', () => {
    const b = kochstelle()
      .mitSeil(new Seil('s', abock.spitze(), new Vec3(-1.5, 0, 1)))
      .mitPlane(new Plane('p', abock.spitze(), dreibein.spitze(), STANDARD_PLANE));
    expect(ids(mitgenommen(b, ['abock', 'dreibein', 'first']))).toEqual(['abock', 'dreibein', 'first', 's', 'p']);
  });

  it('lässt Seil und Plane mit einem Ende am Baum oder an einem nicht gewählten Teil zurück', () => {
    const b = mitBaum()
      .mitSeil(new Seil('s', abock.spitze(), baumEnde))
      .mitPlane(new Plane('p', abock.spitze(), baumEnde, STANDARD_PLANE));
    expect(ids(mitgenommen(b, ['abock', 'dreibein', 'first']))).toEqual(['abock', 'dreibein', 'first']);
    expect(ids(mitgenommen(kochstelle().mitSeil(new Seil('t', dreibein.spitze(), new Vec3(5, 0, 5))), ['abock']))).toEqual(['abock']);
  });

  it('nimmt ein gewähltes Seil mit und ignoriert unbekannte ids', () => {
    const b = kochstelle().mitSeil(new Seil('s', new Vec3(8, 0, 8), new Vec3(10, 0, 8)));
    expect(ids(mitgenommen(b, ['s', 'gibtsnicht']))).toEqual(['s']);
  });
});

describe('mitgenommen: Doppelklick-Auswahl', () => {
  it('kopiert Seil zum Baum und Plane am Baum nicht, auch wenn sie mit gewählt sind', () => {
    const b = mitBaum()
      .mitSeil(new Seil('s', abock.spitze(), baumEnde))
      .mitPlane(new Plane('p', abock.spitze(), baumEnde, STANDARD_PLANE));
    expect(ids(mitgenommen(b, ['abock', 'dreibein', 'first', 's', 'p']))).toEqual(['abock', 'dreibein', 'first']);
  });
});

describe('mitte', () => {
  it('ist der Mittelpunkt der Platzpunkte', () => {
    const m = mitte([abock]);
    expect(m?.equals(new Vec3(0, 0, 0), 1e-9)).toBe(true);
    const zwei = mitte([abock, dreibein]);
    expect(zwei?.x).toBeGreaterThan(0.5);
  });

  it('nimmt ohne Platzpunkte die eigenen Drehpunkte, bei nichts null', () => {
    const baum = new Baum('b', new Vec3(2, 0, 4), STANDARD_BAUM);
    expect(mitte([baum])?.equals(new Vec3(2, 0, 4), 1e-9)).toBe(true);
    expect(mitte([])).toBeNull();
  });
});

describe('kopiere', () => {
  it('fügt Kopien mit neuen ids um dv versetzt hinzu und lässt das Original', () => {
    const b = kochstelle();
    let n = 0;
    const r = kopiere(b, mitgenommen(b, ['abock', 'dreibein', 'first']), new Vec3(1, 0, 1), (p) => `${p}-n${++n}`);
    expect(r.bauwerk.objekte).toHaveLength(6);
    expect(r.neueIds).toEqual(['abock-n1', 'dreibein-n2', 'stange-n3']);
    expect(r.bauwerk.gruppe('abock')).toBe(b.gruppe('abock'));
    expect(r.bauwerk.gruppe('abock-n1')?.position.equals(new Vec3(1, 0, 1), 1e-9)).toBe(true);
    expect(r.bauwerk.stange('abock-n1-bein-0')).toBeDefined();
  });

  it('gibt 50 Kopien hintereinander eindeutige ids', () => {
    let b = kochstelle();
    let n = 0;
    const neueId = (p: string): string => `${p}-${(n++).toString(36)}`;
    for (let i = 0; i < 50; i++) b = kopiere(b, mitgenommen(b, ['abock']), new Vec3(1, 0, 1), neueId).bauwerk;
    const alle = b.objekte.flatMap((o) => o.ids());
    expect(new Set(alle).size).toBe(alle.length);
  });
});
