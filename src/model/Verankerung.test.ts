import { describe, expect, it } from 'vitest';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';
import { STANDARD_PLANE } from './params';
import { VerankerungsFinder } from './Verankerung';

const stange = new Stange('st', Vec3.NULL, new Vec3(0, 3, 0), 0.08);
const baum = new Baum('b', new Vec3(5, 0, 0), { durchmesser: 0.4, hoehe: 10 });
const finder = new VerankerungsFinder();
// Linie entlang z bei x = 2; die Plane liegt flach Richtung +x. Ösen u. a. bei (2, 1, 0) und (3, 1, 0).
const plane = new Plane('pl', new Vec3(2, 1, -2), new Vec3(2, 1, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });

describe('VerankerungsFinder', () => {
  it('erkennt einen Hering am Boden', () => {
    expect(finder.finde(new Vec3(1, 0, 1), [stange], [baum])).toEqual({ art: 'hering' });
  });

  it('erkennt einen Baum an der Stammoberfläche', () => {
    expect(finder.finde(new Vec3(4.8, 2, 0), [stange], [baum])).toEqual({ art: 'baum', baumId: 'b' });
  });

  it('erkennt einen Bau an der Stangenachse', () => {
    expect(finder.finde(new Vec3(0.03, 2, 0), [stange], [baum])).toEqual({ art: 'bau', stangeId: 'st' });
  });

  it('nimmt bei mehreren Stangen in Reichweite die nächste', () => {
    const nah = new Stange('nah', new Vec3(0.04, 0, 0), new Vec3(0.04, 3, 0), 0.08);
    expect(finder.finde(new Vec3(0.035, 1, 0), [stange, nah], [])).toEqual({ art: 'bau', stangeId: 'nah' });
  });

  it('meldet frei, wenn nichts in Reichweite ist', () => {
    expect(finder.finde(new Vec3(2, 2, 2), [stange], [baum])).toEqual({ art: 'frei' });
  });

  it('der Boden geht vor der Stange', () => {
    expect(finder.finde(new Vec3(0, 0.02, 0), [stange], [])).toEqual({ art: 'hering' });
  });

  it('erkennt eine Plane an einer Öse', () => {
    expect(finder.finde(new Vec3(2.03, 1, 0), [stange], [baum], [plane])).toEqual({ art: 'plane', planeId: 'pl' });
  });

  it('nimmt eine Öse vor einem Baum an derselben Stelle', () => {
    const amStamm = new Plane('st', new Vec3(4.8, 2, -2), new Vec3(4.8, 2, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    expect(finder.finde(new Vec3(4.8, 2, 0), [stange], [baum], [amStamm])).toEqual({ art: 'plane', planeId: 'st' });
  });

  it('macht ein Seilende an der Öse einer Bodenplane zum Hering', () => {
    const bodenplane = new Plane('bp', new Vec3(0, 0, 5), new Vec3(4, 0, 5), { ...STANDARD_PLANE, neigungGrad: 0 });
    expect(finder.finde(new Vec3(2, 0, 5), [stange], [baum], [bodenplane])).toEqual({ art: 'hering' });
  });

  it('nimmt bei zwei Planen in Reichweite die mit der näheren Öse', () => {
    const daneben = new Plane('pl2', new Vec3(2.04, 1, -2), new Vec3(2.04, 1, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    expect(finder.finde(new Vec3(2.03, 1, 0), [], [], [plane, daneben])).toEqual({ art: 'plane', planeId: 'pl2' });
  });

  it('nimmt bei zwei Bäumen in Reichweite den näheren', () => {
    const nah = new Baum('nah', new Vec3(5.03, 0, 0), { durchmesser: 0.4, hoehe: 10 });
    expect(finder.finde(new Vec3(4.83, 2, 0), [], [baum, nah], [])).toEqual({ art: 'baum', baumId: 'nah' });
  });

  it('Seilenden nah beieinander teilen sich einen Hering', () => {
    const a = new Seil('a', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    const b = new Seil('b', new Vec3(0, 2, 1), new Vec3(2.1, 0, 0));
    const c = new Seil('c', new Vec3(0, 2, 0), new Vec3(-2, 0, 0));
    const heringe = finder.heringe([a, b, c]);
    expect(heringe).toHaveLength(2);
    const geteilt = heringe.find((h) => h.seilIds.includes('a'));
    expect(geteilt?.seilIds).toEqual(['a', 'b']);
    expect(geteilt?.position.equals(new Vec3(2.05, 0, 0), 1e-9)).toBe(true);
  });

  it('ein Seil zwischen zwei Bauten hat keinen Hering', () => {
    expect(finder.heringe([new Seil('q', new Vec3(0, 2, 0), new Vec3(4, 2, 0))])).toEqual([]);
  });
});

describe('Bauwerk mit Seilen', () => {
  it('liefert Heringe und die Verankerung eines Punkts', () => {
    const b = Bauwerk.leer().mitStange(stange).mitBaum(baum).mitSeil(new Seil('s', new Vec3(0, 2, 0), new Vec3(4.8, 2, 0)));
    expect(b.heringe()).toEqual([]);
    expect(b.verankerung(new Vec3(0, 2, 0))).toEqual({ art: 'bau', stangeId: 'st' });
    expect(b.verankerung(new Vec3(4.8, 2, 0))).toEqual({ art: 'baum', baumId: 'b' });
  });

  it('ein Seil zwischen zwei Stangen erzeugt keinen Bund', () => {
    const zweite = new Stange('st2', new Vec3(4, 0, 0), new Vec3(4, 3, 0), 0.08);
    const b = Bauwerk.leer().mitStange(stange).mitStange(zweite).mitSeil(new Seil('q', new Vec3(0, 2, 0), new Vec3(4, 2, 0)));
    expect(b.buende()).toEqual([]);
  });
});
