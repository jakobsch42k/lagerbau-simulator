import { describe, expect, it } from 'vitest';
import { Baum } from '../model/Baum';
import { STANDARD_BAUM } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { DUPLIKAT_VERSATZ } from './konstanten';
import { Zwischenablage } from './Zwischenablage';

describe('Zwischenablage', () => {
  it('ist anfangs leer und liefert dann keinen Einfüge-Versatz', () => {
    const z = new Zwischenablage();
    expect(z.objekte).toEqual([]);
    expect(z.einfuegeVersatz(new Vec3(1, 0, 1))).toBeNull();
  });

  it('setzt den Mittelpunkt auf das Ziel, ohne Ziel um +1 m versetzt', () => {
    const z = new Zwischenablage();
    z.merke([new Baum('b', new Vec3(2, 0, 4), STANDARD_BAUM)]);
    expect(z.einfuegeVersatz(new Vec3(5, 0, 5))?.equals(new Vec3(3, 0, 1), 1e-9)).toBe(true);
    expect(z.einfuegeVersatz(null)).toBe(DUPLIKAT_VERSATZ);
  });
});
