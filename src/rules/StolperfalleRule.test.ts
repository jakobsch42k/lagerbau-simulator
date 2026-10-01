import { describe, expect, it } from 'vitest';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { StolperfalleRule } from './StolperfalleRule';

const links = new Stange('p1', Vec3.NULL, new Vec3(0, 3, 0), 0.08);
const rechts = new Stange('p2', new Vec3(4, 0, 0), new Vec3(4, 3, 0), 0.08);
const baum = new Baum('b', new Vec3(0, 0, 6), { durchmesser: 0.4, hoehe: 10 });
const basis = Bauwerk.leer().mitStange(links).mitStange(rechts).mitBaum(baum);
const regel = new StolperfalleRule(2);
const pruefe = (s: Seil) => regel.pruefe(new Analyse(basis.mitSeil(s)));

describe('StolperfalleRule (R7)', () => {
  it('meldet ein tiefes Querseil zwischen zwei Bauten', () => {
    const h = pruefe(new Seil('q', new Vec3(0, 1, 0), new Vec3(4, 1, 0)));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R7', betroffeneTeile: ['q'] });
    expect(h[0]?.text).toBe('Seil hängt tief: Stolper- oder Halsgefahr. Höher spannen oder gut sichtbar markieren.');
  });

  it('meldet ein tiefes Seil vom Bau zum Baum', () => {
    expect(pruefe(new Seil('zb', new Vec3(0, 1.5, 0), new Vec3(0, 1.5, 5.8)))).toHaveLength(1);
  });

  it('schweigt bei hohen Querseilen und genau an der Grenze', () => {
    expect(pruefe(new Seil('hoch', new Vec3(0, 2.5, 0), new Vec3(4, 2.5, 0)))).toEqual([]);
    expect(pruefe(new Seil('grenze', new Vec3(0, 2, 0), new Vec3(4, 2, 0)))).toEqual([]);
  });

  it('meldet Seile zum Hering nie', () => {
    expect(pruefe(new Seil('h', new Vec3(0, 1, 0), new Vec3(2, 0, 0)))).toEqual([]);
  });

  it('überlässt Seile mit freiem Ende R8', () => {
    expect(pruefe(new Seil('f', new Vec3(0, 1, 0), new Vec3(2, 1, 2)))).toEqual([]);
  });
});
