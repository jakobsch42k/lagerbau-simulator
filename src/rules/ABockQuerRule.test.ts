import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { ABockQuerRule } from './ABockQuerRule';
import { Analyse } from './Analyse';

const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK); // A-Ebene ist x = 0
const regel = new ABockQuerRule(30);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));

describe('ABockQuerRule (R1)', () => {
  it('Test 1: meldet einen A-Bock ohne Querverbindung', () => {
    const h = pruefe(Bauwerk.leer().mitGruppe(abock));
    expect(h).toHaveLength(1);
    expect(h[0]).toMatchObject({ regel: 'R1', schwere: 'warnung', betroffeneTeile: ['a'] });
    expect(h[0]?.text).toBe('A-Bock kann seitlich umkippen, er braucht eine Querverbindung.');
  });

  it('schweigt, wenn eine Stütze quer zur A-Ebene an der Spitze hängt', () => {
    const stuetze = Stange.zwischen('s', abock.spitze(), new Vec3(1.5, 0, 0), 0.08, 0.2, 0);
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitStange(stuetze))).toEqual([]);
  });

  it('meldet weiter, wenn die angebundene Stange in der A-Ebene liegt', () => {
    const inEbene = Stange.zwischen('s', abock.spitze(), new Vec3(0, 0, 2), 0.08, 0.2, 0);
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitStange(inEbene))).toHaveLength(1);
  });
});
