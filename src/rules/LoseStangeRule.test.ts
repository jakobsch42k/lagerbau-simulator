import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { LoseStangeRule } from './LoseStangeRule';

const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
const pruefe = (b: Bauwerk) => new LoseStangeRule().pruefe(new Analyse(b));

describe('LoseStangeRule (R5)', () => {
  it('Test 7: meldet eine Stange, die nur an einem Bund hängt', () => {
    const ast = Stange.zwischen('ast', abock.spitze(), abock.spitze().add(new Vec3(1.5, 0, 0)), 0.08, 0.2, 0);
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitStange(ast))).toEqual([
      { regel: 'R5', schwere: 'warnung', text: 'Diese Stange hängt nur an einem Bund.', betroffeneTeile: ['ast'] },
    ]);
  });

  it('meldet eine frei stehende und eine schwebende Stange mit eigenem Text', () => {
    const steht = new Stange('steht', new Vec3(5, 0, 0), new Vec3(5, 2, 0), 0.08);
    const schwebt = new Stange('schwebt', new Vec3(8, 1, 0), new Vec3(8, 2, 0), 0.08);
    const texte = pruefe(Bauwerk.leer().mitStange(steht).mitStange(schwebt)).map((h) => h.text);
    expect(texte).toEqual(['Diese Stange steht frei, ohne Bund.', 'Diese Stange ist mit nichts verbunden.']);
  });

  it('schweigt bei A-Bock und liegender Stange', () => {
    const liegt = new Stange('liegt', new Vec3(5, 0, 0), new Vec3(7, 0, 0), 0.08);
    expect(pruefe(Bauwerk.leer().mitGruppe(abock).mitStange(liegt))).toEqual([]);
  });
});
