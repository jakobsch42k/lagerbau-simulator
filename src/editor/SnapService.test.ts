import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { Baum } from '../model/Baum';
import { STANDARD_BAUM, STANDARD_DREIBEIN } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { SnapService } from './SnapService';

const dreibein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const bauwerk = Bauwerk.leer().mitGruppe(dreibein);
const snap = new SnapService();

describe('SnapService', () => {
  it('rundet freie Bodenpunkte aufs 10-cm-Raster', () => {
    const p = snap.snap({ art: 'boden', punkt: new Vec3(3.234, 0, 2.071) }, bauwerk);
    expect(p.art).toBe('boden');
    expect(p.punkt.equals(new Vec3(3.2, 0, 2.1), 1e-9)).toBe(true);
  });

  it('rastet nahe der Spitze auf die Spitze ein', () => {
    const p = snap.snap({ art: 'stange', punkt: dreibein.spitze().add(new Vec3(0.1, 0, 0)), stangeId: 'd-bein-0' }, bauwerk);
    expect(p.art).toBe('spitze');
    expect(p.punkt.equals(dreibein.spitze())).toBe(true);
  });

  it('rastet nahe eines Fußes auf das Stangenende ein', () => {
    const p = snap.snap({ art: 'boden', punkt: new Vec3(0.8, 0, 0.05) }, bauwerk);
    expect(p.art).toBe('ende');
    expect(p.punkt.equals(new Vec3(0.7, 0, 0), 1e-9)).toBe(true);
  });

  it('projiziert einen Treffer mitten auf einer Stange auf ihre Achse', () => {
    const bein = dreibein.stangen()[0];
    const mitte = bein!.start.add(bein!.ende).scale(0.5);
    const p = snap.snap({ art: 'stange', punkt: mitte.add(new Vec3(0, 0, 0.04)), stangeId: 'd-bein-0' }, bauwerk);
    expect(p.art).toBe('stange');
    expect(bein!.naechsterPunkt(p.punkt).distanceTo(p.punkt)).toBeLessThan(1e-9);
  });

  it('fällt bei einer unbekannten Stange auf das Raster zurück', () => {
    const p = snap.snap({ art: 'stange', punkt: new Vec3(5.04, 1, 5), stangeId: 'weg' }, bauwerk);
    expect(p.art).toBe('boden');
    expect(p.punkt.equals(new Vec3(5, 0, 5), 1e-9)).toBe(true);
  });

  it('rastet am Baumstamm genau am getroffenen Punkt ein', () => {
    const mitBaum = bauwerk.mitBaum(new Baum('b', new Vec3(5, 0, 0), STANDARD_BAUM));
    const p = snap.snap({ art: 'baum', punkt: new Vec3(4.85, 1.7, 0), baumId: 'b' }, mitBaum);
    expect(p.art).toBe('baum');
    expect(p.punkt.equals(new Vec3(4.85, 1.7, 0), 1e-9)).toBe(true);
  });

  it('nimmt bei einem unbekannten Baum den Boden darunter', () => {
    const p = snap.snap({ art: 'baum', punkt: new Vec3(4.87, 1.7, 0), baumId: 'weg' }, bauwerk);
    expect(p.art).toBe('boden');
    expect(p.punkt.equals(new Vec3(4.9, 0, 0), 1e-9)).toBe(true);
  });

  it('nimmt bei einem Seiltreffer fern von Einrastpunkten den Boden darunter', () => {
    const p = snap.snap({ art: 'seil', punkt: new Vec3(3, 1, 3), seilId: 's' }, bauwerk);
    expect(p.art).toBe('boden');
    expect(p.punkt.equals(new Vec3(3, 0, 3), 1e-9)).toBe(true);
  });
});
