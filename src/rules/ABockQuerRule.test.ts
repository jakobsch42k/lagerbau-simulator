import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { ABockQuerRule } from './ABockQuerRule';
import { Analyse } from './Analyse';

const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK); // A-Ebene ist x = 0
const regel = new ABockQuerRule(30);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));
const seil = (id: string, x: number, z = 0) => new Seil(id, abock.spitze(), new Vec3(x, 0, z));
const mitSeilen = (...seile: Seil[]) => seile.reduce((b, s) => b.mitSeil(s), Bauwerk.leer().mitGruppe(abock));

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

  it('schweigt, wenn auf beiden Seiten der Ebene ein Seil hängt', () => {
    expect(pruefe(mitSeilen(seil('l', -1.5), seil('r', 1.5)))).toEqual([]);
  });

  it('meldet weiter bei nur einseitiger Abspannung', () => {
    expect(pruefe(mitSeilen(seil('r', 1.5)))).toHaveLength(1);
  });

  it('meldet weiter bei zwei Seilen auf derselben Seite', () => {
    expect(pruefe(mitSeilen(seil('r1', 1.5), seil('r2', 1.5, 0.5)))).toHaveLength(1);
  });

  it('zählt ein Seilende in der A-Ebene für keine Seite', () => {
    expect(pruefe(mitSeilen(seil('l', -1.5), seil('e', 0, 2)))).toHaveLength(1);
  });

  it('zählt ein Seil mit frei hängendem anderem Ende nicht', () => {
    const frei = new Seil('f', abock.spitze(), new Vec3(1.5, 1, 0));
    expect(pruefe(mitSeilen(seil('l', -1.5), frei))).toHaveLength(1);
  });
});
