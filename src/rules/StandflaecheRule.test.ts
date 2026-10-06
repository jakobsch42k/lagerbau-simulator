import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { StandflaecheRule } from './StandflaecheRule';

const regel = new StandflaecheRule(2.5, 0.5);
const pruefe = (b: Bauwerk) => regel.pruefe(new Analyse(b));
const schmal = new Dreibein('s', Vec3.NULL, 0, { stangenlaenge: 4, fusskreisradius: 0.5, durchmesser: 0.08 });

describe('StandflaecheRule (R3)', () => {
  it('Test 5: meldet ein hohes, schmales Dreibein', () => {
    const h = pruefe(Bauwerk.leer().mitGruppe(schmal));
    expect(h).toHaveLength(1);
    expect(h[0]?.regel).toBe('R3');
    expect(h[0]?.text).toBe('Hoch und schmal, Kippgefahr. Füße weiter auseinander oder abspannen.');
    expect([...(h[0]?.betroffeneTeile ?? [])].sort()).toEqual(['s-bein-0', 's-bein-1', 's-bein-2']);
  });

  it('schweigt beim Standard-Dreibein', () => {
    expect(pruefe(Bauwerk.leer().mitGruppe(new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN)))).toEqual([]);
  });

  it('meldet einen A-Bock, der nur auf einer Linie steht', () => {
    expect(pruefe(Bauwerk.leer().mitGruppe(new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK)))).toHaveLength(1);
  });

  it('prüft liegende, niedrige und schwebende Stangen nicht', () => {
    const liegt = new Stange('liegt', Vec3.NULL, new Vec3(2, 0, 0), 0.08);
    const schwebt = new Stange('schwebt', new Vec3(5, 1, 0), new Vec3(5, 2, 0), 0.08);
    expect(pruefe(Bauwerk.leer().mitStange(liegt).mitStange(schwebt))).toEqual([]);
  });

  it('bewertet zwei getrennte Bauten einzeln statt über die gemeinsame Hülle', () => {
    const breit = new Dreibein('b', new Vec3(10, 0, 0), 0, STANDARD_DREIBEIN);
    const h = pruefe(Bauwerk.leer().mitGruppe(schmal).mitGruppe(breit));
    expect(h).toHaveLength(1);
    expect(h[0]?.betroffeneTeile).toContain('s-bein-0');
    expect(h[0]?.betroffeneTeile).not.toContain('b-bein-0');
  });

  it('zählt die Haringe angebundener Seile zur Standfläche', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const allein = Bauwerk.leer().mitGruppe(abock);
    expect(pruefe(allein)).toHaveLength(1);
    const abgespannt = allein
      .mitSeil(new Seil('l', abock.spitze(), new Vec3(-1.5, 0, 0)))
      .mitSeil(new Seil('r', abock.spitze(), new Vec3(1.5, 0, 0)));
    expect(pruefe(abgespannt)).toEqual([]);
  });

  it('zählt Haringe von Seilen, die nicht am Bau hängen, nicht', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const fremd = new Seil('x', new Vec3(5, 2, 0), new Vec3(5, 0, 3));
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitSeil(fremd))).toHaveLength(1);
  });
});
