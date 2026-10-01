import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { RuleEngine } from './RuleEngine';
import { standardRegeln } from './standardRegeln';

// Läuft mit den Schwellwerten aus constants.ts (R6 30°–60°: die Seile hier haben ca. 54°).
const engine = new RuleEngine(standardRegeln());
const abock = new ABock('abock', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK); // A-Ebene ist x = 0
const seil = (id: string, x: number) => new Seil(id, abock.spitze(), new Vec3(x, 0, 0));
const abgespannt = Bauwerk.leer().mitGruppe(abock).mitSeil(seil('l', -1.5)).mitSeil(seil('r', 1.5));
const regeln = (b: Bauwerk) => engine.pruefe(b).map((h) => h.regel);

describe('Abgespannter A-Bock mit allen Regeln', () => {
  it('beidseitig abgespannt: keine Hinweise', () => {
    expect(engine.pruefe(abgespannt)).toEqual([]);
  });

  it('nur einseitig abgespannt: nur R1', () => {
    expect(regeln(Bauwerk.leer().mitGruppe(abock).mitSeil(seil('r', 1.5)))).toEqual(['R1']);
  });

  it('A-Bock nach dem Abspannen verschoben: Seile hängen in der Luft, R1 meldet wieder', () => {
    const verschoben = abgespannt.ersetzeGruppe(abock.verschoben(new Vec3(1, 0, 0)));
    const r = regeln(verschoben);
    expect(r).toContain('R1');
    expect(r.filter((x) => x === 'R8')).toHaveLength(2);
  });

  it('Baum gelöscht, an dem ein Seil hing: R8 meldet das Seil', () => {
    const baum = new Baum('baum', new Vec3(0, 0, 6), { durchmesser: 0.4, hoehe: 10 });
    const zumBaum = new Seil('zb', abock.spitze(), new Vec3(0, abock.spitze().y, 5.8));
    const mitBaum = abgespannt.mitBaum(baum).mitSeil(zumBaum);
    expect(regeln(mitBaum)).not.toContain('R8');
    expect(regeln(mitBaum.ohne('baum'))).toContain('R8');
  });
});
