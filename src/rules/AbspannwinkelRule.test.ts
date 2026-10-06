import { describe, expect, it } from 'vitest';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { AbspannwinkelRule } from './AbspannwinkelRule';
import { Analyse } from './Analyse';

const pfosten = new Stange('p', Vec3.NULL, new Vec3(0, 4, 0), 0.08);
/** Seil vom Pfosten in 2 m Höhe zum Boden, mit dem gewünschten Winkel zur Waagrechten. */
const seilMitWinkel = (grad: number): Seil => new Seil('s', new Vec3(0, 2, 0), new Vec3(2 / Math.tan((grad * Math.PI) / 180), 0, 0));
const pruefe = (regel: AbspannwinkelRule, ...seile: Seil[]) =>
  regel.pruefe(new Analyse(seile.reduce((b, s) => b.mitSeil(s), Bauwerk.leer().mitStange(pfosten))));
const regel = new AbspannwinkelRule(30, 60);

describe('AbspannwinkelRule (R6)', () => {
  it('meldet ein sehr flaches Seil zum Haring', () => {
    const h = pruefe(regel, seilMitWinkel(20));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R6', schwere: 'warnung', betroffeneTeile: ['s'] });
    expect(h[0]?.text).toBe('Seil sehr flach: braucht viel Platz.');
  });

  it('meldet ein sehr steiles Seil zum Haring', () => {
    expect(pruefe(regel, seilMitWinkel(75))[0]?.text).toBe('Seil sehr steil: hält seitlich kaum.');
  });

  it('schweigt im erlaubten Bereich und genau an beiden Grenzen', () => {
    expect(pruefe(regel, seilMitWinkel(45))).toEqual([]);
    const s = seilMitWinkel(40);
    expect(pruefe(new AbspannwinkelRule(s.winkelZumBodenGrad, 80), s)).toEqual([]);
    expect(pruefe(new AbspannwinkelRule(10, s.winkelZumBodenGrad), s)).toEqual([]);
  });

  it('meldet knapp jenseits der Grenzen', () => {
    const s = seilMitWinkel(40);
    expect(pruefe(new AbspannwinkelRule(s.winkelZumBodenGrad + 0.1, 80), s)).toHaveLength(1);
    expect(pruefe(new AbspannwinkelRule(10, s.winkelZumBodenGrad - 0.1), s)).toHaveLength(1);
  });

  it('prüft nur Seile vom Bau zum Haring', () => {
    const baum = new Baum('b', new Vec3(5, 0, 0), { durchmesser: 0.4, hoehe: 10 });
    const vomBaum = new Seil('vb', new Vec3(4.8, 1, 0), new Vec3(1, 0, 0));
    const quer = new Seil('q', new Vec3(0, 3, 0), new Vec3(4.8, 3, 0));
    const b = Bauwerk.leer().mitStange(pfosten).mitBaum(baum).mitSeil(vomBaum).mitSeil(quer);
    expect(regel.pruefe(new Analyse(b))).toEqual([]);
  });
});
