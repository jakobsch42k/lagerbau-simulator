import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { STANDARD_ABOCK, STANDARD_BAUM } from './params';
import { Platzbedarf } from './Platzbedarf';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

describe('Platzbedarf', () => {
  it('umschließt alle Füße, längere Seite zuerst', () => {
    const p = Platzbedarf.aus(kochstelle());
    expect(p?.laenge).toBeCloseTo(3.2, 9);
    expect(p?.breite).toBeCloseTo(1.6, 9);
  });

  it('zählt Heringe mit und Bäume nicht', () => {
    const abock = new ABock('a', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
    const b = Bauwerk.leer()
      .mitGruppe(abock)
      .mitSeil(new Seil('l', abock.spitze(), new Vec3(-1.5, 0, 0)))
      .mitSeil(new Seil('r', abock.spitze(), new Vec3(1.5, 0, 0)))
      .mitBaum(new Baum('baum', new Vec3(20, 0, 20), STANDARD_BAUM));
    const p = Platzbedarf.aus(b);
    expect(p?.laenge).toBeCloseTo(3, 9);
    expect(p?.breite).toBeCloseTo(1.6, 9);
  });

  it('gibt es ohne Füße und Heringe nicht', () => {
    expect(Platzbedarf.aus(Bauwerk.leer())).toBeNull();
    expect(Platzbedarf.aus(Bauwerk.leer().mitBaum(new Baum('b', Vec3.NULL, STANDARD_BAUM)))).toBeNull();
  });
});
