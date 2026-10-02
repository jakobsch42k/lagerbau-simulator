import { describe, expect, it } from 'vitest';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { Baum } from '../model/Baum';
import { Plane } from '../model/Plane';
import { STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { SnapService, type Treffer } from './SnapService';

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

  it('rastet im Seil-Werkzeug auf die nächste Öse einer getroffenen Plane ein, egal wie weit', () => {
    // Flach bei z = 5, Richtung −z; Ösen u. a. bei (0 | 2 | 3,5) und (2 | 2 | 5).
    const plane = new Plane('pl', new Vec3(0, 2, 5), new Vec3(4, 2, 5), { ...STANDARD_PLANE, neigungGrad: 0 });
    const mitPlane = bauwerk.mitPlane(plane);
    const treffer: Treffer = { art: 'plane', punkt: new Vec3(1.4, 2, 3.6), planeId: 'pl' };
    const p = snap.snap(treffer, mitPlane, true);
    expect(p.art).toBe('oese');
    expect(p.punkt.equals(new Vec3(0, 2, 3.5), 1e-9)).toBe(true);
    expect(snap.snap(treffer, mitPlane).art).toBe('boden');
  });

  it('nimmt Ösen nur im Seil-Werkzeug als nahe Fangpunkte', () => {
    const bodenplane = new Plane('bp', new Vec3(0, 0, 5), new Vec3(4, 0, 5), { ...STANDARD_PLANE, neigungGrad: 0 });
    const mitPlane = bauwerk.mitPlane(bodenplane);
    const klick: Treffer = { art: 'boden', punkt: new Vec3(2.1, 0, 4.9) };
    const mit = snap.snap(klick, mitPlane, true);
    expect(mit.art).toBe('oese');
    expect(mit.punkt.equals(new Vec3(2, 0, 5), 1e-9)).toBe(true);
    expect(snap.snap(klick, mitPlane).art).toBe('boden');
  });
});
