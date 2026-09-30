import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { SpreizungRule } from './SpreizungRule';

const regel = new SpreizungRule(10, 35);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));

describe('SpreizungRule (R4)', () => {
  it('Test 5: meldet sehr steile Beine', () => {
    const d = new Dreibein('d', Vec3.NULL, 0, { stangenlaenge: 4, fusskreisradius: 0.5, durchmesser: 0.08 });
    const h = pruefe(Bauwerk.leer().mitGruppe(d));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R4', betroffeneTeile: ['d'] });
    expect(h[0]?.text).toMatch(/^Beine sehr steil \(8°\)/);
  });

  it('Test 6: meldet sehr flach gespreizte Beine', () => {
    const d = new Dreibein('d', Vec3.NULL, 0, { stangenlaenge: 2.4, fusskreisradius: 2.0, durchmesser: 0.08 });
    expect(pruefe(Bauwerk.leer().mitGruppe(d))[0]?.text).toMatch(/^Beine sehr flach gespreizt \(65°\)/);
  });

  it('schweigt bei Standard-Dreibein und Standard-A-Bock', () => {
    const b = Bauwerk.leer()
      .mitGruppe(new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN))
      .mitGruppe(new ABock('a', new Vec3(4, 0, 0), 0, STANDARD_ABOCK));
    expect(pruefe(b)).toEqual([]);
  });
});
