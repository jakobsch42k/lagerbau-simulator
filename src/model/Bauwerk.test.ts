import { describe, expect, it } from 'vitest';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { Dreibein } from './Dreibein';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

const dreibein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const abock = new ABock('a', new Vec3(4, 0, 0), 0, STANDARD_ABOCK);
const frei = new Stange('s', new Vec3(8, 0, 0), new Vec3(8, 2, 0), 0.08);
const voll = Bauwerk.leer().mitGruppe(dreibein).mitGruppe(abock).mitStange(frei);

describe('Bauwerk', () => {
  it('ist anfangs leer', () => {
    expect(Bauwerk.leer().istLeer).toBe(true);
    expect(Bauwerk.leer().stangen()).toHaveLength(0);
  });

  it('sammelt die Stangen aller Gruppen und die freien Stangen', () => {
    expect(voll.istLeer).toBe(false);
    expect(voll.stangen()).toHaveLength(3 + 3 + 1);
    expect(voll.gruppe('a')).toBe(abock);
    expect(voll.stange('d-bein-1')?.gruppeId).toBe('d');
    expect(voll.stange('gibtsnicht')).toBeUndefined();
  });

  it('bleibt beim Hinzufügen unverändert', () => {
    const basis = Bauwerk.leer();
    basis.mitGruppe(dreibein);
    expect(basis.istLeer).toBe(true);
  });

  it('lehnt doppelte IDs und Gruppenstangen als freie Stangen ab', () => {
    expect(() => voll.mitGruppe(dreibein)).toThrow(/schon vergeben/);
    expect(() => voll.mitStange(frei)).toThrow(/schon vergeben/);
    expect(() => Bauwerk.leer().mitStange(dreibein.stangen()[0] as Stange)).toThrow(/freie Stangen/);
  });

  it('ersetzt Gruppen und freie Stangen', () => {
    const neu = voll.ersetzeGruppe(dreibein.mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 0.9 }));
    expect((neu.gruppe('d') as Dreibein).params.fusskreisradius).toBe(0.9);
    expect(voll.ersetzeStange(frei.mitDurchmesser(0.12)).stange('s')?.durchmesser).toBe(0.12);
    expect(() => voll.ersetzeGruppe(new Dreibein('x', Vec3.NULL, 0, STANDARD_DREIBEIN))).toThrow(/gibt es nicht/);
    expect(() => voll.ersetzeStange(new Stange('x', Vec3.NULL, new Vec3(0, 1, 0), 0.08))).toThrow(/gibt es nicht/);
  });

  it('entfernt Gruppen und freie Stangen per ID', () => {
    expect(voll.ohne('d').stangen()).toHaveLength(4);
    expect(voll.ohne('s').stangen()).toHaveLength(6);
    expect(voll.ohne('unbekannt').stangen()).toHaveLength(7);
  });

  it('findet die Auswahl-ID einer Stange', () => {
    expect(voll.auswahlIdFuer('d-bein-2')).toBe('d');
    expect(voll.auswahlIdFuer('s')).toBe('s');
    expect(voll.enthaelt('a')).toBe(true);
    expect(voll.enthaelt('a-riegel')).toBe(true);
    expect(voll.enthaelt('nix')).toBe(false);
  });

  it('leitet Füße und Bünde aus der Geometrie ab', () => {
    const nurDreibein = Bauwerk.leer().mitGruppe(dreibein);
    expect(nurDreibein.fuesse()).toHaveLength(3);
    expect(nurDreibein.buende()).toHaveLength(1);
  });

  it('nimmt Seile und Bäume auf, findet und entfernt sie', () => {
    const seil = new Seil('seil', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    const baum = new Baum('baum', new Vec3(5, 0, 5), STANDARD_BAUM);
    const b = Bauwerk.leer().mitSeil(seil).mitBaum(baum);
    expect(b.istLeer).toBe(false);
    expect(b.seil('seil')).toBe(seil);
    expect(b.baum('baum')).toBe(baum);
    expect(b.enthaelt('seil') && b.enthaelt('baum')).toBe(true);
    expect(b.ohne('seil').ohne('baum').istLeer).toBe(true);
    expect(b.seile).toHaveLength(1);
  });

  it('ersetzt Bäume und lehnt doppelte IDs über alle Teile ab', () => {
    const baum = new Baum('x', Vec3.NULL, STANDARD_BAUM);
    const b = Bauwerk.leer().mitBaum(baum);
    expect(b.ersetzeBaum(baum.mitParams({ durchmesser: 0.5, hoehe: 9 })).baum('x')?.params.hoehe).toBe(9);
    expect(() => b.mitSeil(new Seil('x', Vec3.NULL, new Vec3(1, 0, 0)))).toThrow('ID x ist schon vergeben');
    expect(() => b.ersetzeBaum(new Baum('y', Vec3.NULL, STANDARD_BAUM))).toThrow('Baum y gibt es nicht');
  });

  it('behält Seile und Bäume bei allen anderen Änderungen', () => {
    const mitPlatz = voll.mitBaum(new Baum('baum', new Vec3(20, 0, 0), STANDARD_BAUM)).mitSeil(new Seil('seil', new Vec3(8, 2, 0), new Vec3(10, 0, 0)));
    const geaendert = mitPlatz
      .ersetzeGruppe(dreibein.gedreht(0.1))
      .ersetzeStange(frei.mitDurchmesser(0.1))
      .ohne('a')
      .mitStange(new Stange('s2', new Vec3(12, 0, 0), new Vec3(12, 2, 0), 0.08));
    expect(geaendert.seile.map((s) => s.id)).toEqual(['seil']);
    expect(geaendert.baeume.map((b) => b.id)).toEqual(['baum']);
  });

  it('nimmt Planen auf, ersetzt und entfernt sie, ohne sich selbst zu ändern', () => {
    const plane = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);
    const b = Bauwerk.leer().mitPlane(plane);
    expect(b.istLeer).toBe(false);
    expect(b.plane('pl')).toBe(plane);
    expect(b.enthaelt('pl')).toBe(true);
    const flach = plane.mitParams({ ...STANDARD_PLANE, neigungGrad: 0 });
    expect(b.ersetzePlane(flach).plane('pl')).toBe(flach);
    expect(b.plane('pl')).toBe(plane);
    expect(b.ohne('pl').istLeer).toBe(true);
    expect(() => b.mitPlane(plane)).toThrow('ID pl ist schon vergeben');
    expect(() => Bauwerk.leer().ersetzePlane(plane)).toThrow('Plane pl gibt es nicht');
  });

  it('kennt Planen in der Verankerung', () => {
    const plane = new Plane('pl', new Vec3(2, 1, -2), new Vec3(2, 1, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    expect(Bauwerk.leer().mitPlane(plane).verankerung(new Vec3(2, 1, 0))).toEqual({ art: 'plane', planeId: 'pl' });
  });
});
