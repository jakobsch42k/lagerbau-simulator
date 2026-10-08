import { describe, expect, it } from 'vitest';
import { Beschriftung } from '../model/Beschriftung';
import { Linie } from '../model/Linie';
import { STANDARD_BESCHRIFTUNG, STANDARD_LINIE, STANDARD_ZONE } from '../model/params';
import { Platzobjekt } from '../model/Platzobjekt';
import { Vec3 } from '../model/Vec3';
import { Zelt } from '../model/Zelt';
import { JURTE6 } from '../model/Zelt.testdaten';
import { Zone } from '../model/Zone';
import { findeVorlage, paramsAusVorlage } from './platz/vorlagen';
import { standardArten } from './standardArten';

const register = standardArten();
const CTX = { zugabeProEnde: 0.5 };

describe('Material über das Register (Spec E5, D1)', () => {
  it('materialGruppe: sechs Bau-Arten bau, Zelt zelt, alle Platz-Arten platz', () => {
    const gruppen = Object.fromEntries(register.alle.map((a) => [a.name, a.materialGruppe]));
    expect(gruppen).toEqual({
      stange: 'bau', abock: 'bau', dreibein: 'bau', seil: 'bau', baum: 'bau', plane: 'bau',
      zelt: 'zelt', platzobjekt: 'platz', linie: 'platz', beschriftung: 'platz', zone: 'platz',
    });
  });

  it('nur Zelt, Platz-Objekt und Linie haben `material`', () => {
    expect(register.alle.filter((a) => a.material !== undefined).map((a) => a.name).sort()).toEqual(['linie', 'platzobjekt', 'zelt']);
  });

  it('Zelt: Zelt, Haringe und Abspannseile mit Vorlagennamen als Gruppe', () => {
    const z = new Zelt('z', Vec3.NULL, { ...JURTE6, name: 'Küchenzelt' });
    expect(register.fuer(z).material?.(z, CTX)).toEqual({
      gruppe: 'Jurte 6er',
      posten: [
        { kategorie: 'Zelt', bezeichnung: 'Jurte 6er', menge: 1, einheit: 'Stk' },
        { kategorie: 'Haring', bezeichnung: 'Haring', menge: 12, einheit: 'Stk' },
        { kategorie: 'Seil', bezeichnung: 'Abspannseil 4 m', menge: 12, einheit: 'Stk' },
      ],
    });
  });

  it('Zelt: Seillänge folgt der Zugabe je Ende (Formel der Bauten)', () => {
    const z = new Zelt('z', Vec3.NULL, { ...JURTE6, seillaenge: 3.2 });
    const seil = register.fuer(z).material?.(z, { zugabeProEnde: 0.25 }).posten[2];
    expect(seil?.bezeichnung).toBe('Abspannseil 4 m');
  });

  it('Platz-Objekt: ein Stück unter dem Vorlagennamen', () => {
    const v = findeVorlage('feuerstelle');
    const p = new Platzobjekt('p', Vec3.NULL, paramsAusVorlage(v as NonNullable<typeof v>));
    expect(register.fuer(p).material?.(p, CTX)).toEqual({ gruppe: 'Feuerstelle', posten: [{ kategorie: 'Platz', bezeichnung: 'Feuerstelle', menge: 1, einheit: 'Stk' }] });
  });

  it('Zaun: Länge auf 0,1 m gerundet; Weg und Grenze liefern nichts', () => {
    const punkte = [Vec3.NULL, new Vec3(20.04, 0, 0)];
    const zaun = new Linie('l', punkte, { ...STANDARD_LINIE, typ: 'zaun' });
    expect(register.fuer(zaun).material?.(zaun, CTX)).toEqual({ gruppe: 'Zaun', posten: [{ kategorie: 'Zaun', bezeichnung: 'Zaun', menge: 20, einheit: 'm' }] });
    for (const typ of ['weg', 'grenze'] as const) {
      const l = new Linie('l', punkte, { ...STANDARD_LINIE, typ });
      expect(register.fuer(l).material?.(l, CTX).posten).toEqual([]);
    }
  });

  it('Beschriftung und Zone liefern keinen Beitrag', () => {
    const b = new Beschriftung('b', Vec3.NULL, STANDARD_BESCHRIFTUNG);
    const z = new Zone('zo', [Vec3.NULL, new Vec3(1, 0, 0), new Vec3(0, 0, 1)], STANDARD_ZONE);
    expect(register.fuer(b).material).toBeUndefined();
    expect(register.fuer(z).material).toBeUndefined();
  });
});
