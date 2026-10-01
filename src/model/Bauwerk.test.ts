import { describe, expect, it } from 'vitest';
import { ABock } from './ABock';
import { Bauwerk } from './Bauwerk';
import { Dreibein } from './Dreibein';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from './params';
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
});
