import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { LosesSeilRule } from './LosesSeilRule';

const pfosten = new Stange('p', Vec3.NULL, new Vec3(0, 3, 0), 0.08);
const pruefe = (s: Seil) => new LosesSeilRule().pruefe(new Analyse(Bauwerk.leer().mitStange(pfosten).mitSeil(s)));

describe('LosesSeilRule (R8)', () => {
  it('meldet ein Seil mit einem Ende in der Luft', () => {
    const h = pruefe(new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 1, 0)));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R8', betroffeneTeile: ['s'] });
    expect(h[0]?.text).toBe('Seil hängt in der Luft: ein Ende ist nirgends befestigt.');
  });

  it('schweigt, wenn beide Enden verankert sind', () => {
    expect(pruefe(new Seil('s', new Vec3(0, 2, 0), new Vec3(2, 0, 0)))).toEqual([]);
  });
});
