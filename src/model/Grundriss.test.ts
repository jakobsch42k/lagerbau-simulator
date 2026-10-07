import { describe, expect, it } from 'vitest';
import { Grundriss } from './Grundriss';

const mitte = { x: 0, z: 0 };

describe('Grundriss', () => {
  it('Abstand zweier achsparalleler Rechtecke von Kante zu Kante', () => {
    const a = Grundriss.rechteck(mitte, 2, 2, 0);
    const b = Grundriss.rechteck({ x: 5, z: 0 }, 2, 2, 0);
    expect(a.abstand(b)).toBeCloseTo(3);
    expect(b.abstand(a)).toBeCloseTo(3);
  });

  it('Abstand eines gedrehten Rechtecks', () => {
    const a = Grundriss.rechteck(mitte, 2, 2, 0);
    const b = Grundriss.rechteck({ x: 5, z: 0 }, 2, 2, Math.PI / 4);
    // Raute mit Halbdiagonale sqrt(2): linke Spitze bei x = 5 - sqrt(2)
    expect(a.abstand(b)).toBeCloseTo(5 - Math.SQRT2 - 1);
  });

  it('Abstand Kreis zu Rechteck liegt knapp über dem exakten Wert (24 Ecken)', () => {
    const k = Grundriss.kreis(mitte, 1);
    const r = Grundriss.rechteck({ x: 5, z: 0 }, 2, 2, 0);
    expect(k.abstand(r)).toBeGreaterThanOrEqual(3 - 1e-9);
    expect(k.abstand(r)).toBeLessThan(3.01);
  });

  it('Berührung ergibt 0 und überlappt nicht', () => {
    const a = Grundriss.rechteck(mitte, 2, 2, 0);
    const b = Grundriss.rechteck({ x: 2, z: 0 }, 2, 2, 0);
    expect(a.abstand(b)).toBe(0);
    expect(a.ueberlappt(b)).toBe(false);
  });

  it('Überlappung ergibt 0 und überlappt', () => {
    const a = Grundriss.rechteck(mitte, 2, 2, 0);
    const b = Grundriss.rechteck({ x: 1, z: 0 }, 2, 2, 0);
    expect(a.abstand(b)).toBe(0);
    expect(a.ueberlappt(b)).toBe(true);
  });

  it('eines im anderen ergibt 0 und überlappt', () => {
    const gross = Grundriss.rechteck(mitte, 10, 10, 0);
    const klein = Grundriss.kreis({ x: 1, z: 1 }, 0.5);
    expect(gross.abstand(klein)).toBe(0);
    expect(klein.abstand(gross)).toBe(0);
    expect(gross.ueberlappt(klein)).toBe(true);
  });

  it('kreuzende Rechtecke ohne Eckpunkt im anderen überlappen', () => {
    const a = Grundriss.rechteck(mitte, 10, 1, 0);
    const b = Grundriss.rechteck(mitte, 1, 10, 0);
    expect(a.ueberlappt(b)).toBe(true);
  });

  it('vieleck braucht mindestens 3 Punkte', () => {
    expect(() => Grundriss.vieleck([mitte, { x: 1, z: 0 }])).toThrow(RangeError);
  });

  it('kreis braucht Radius > 0, rechteck positive Maße', () => {
    expect(() => Grundriss.kreis(mitte, 0)).toThrow(RangeError);
    expect(() => Grundriss.rechteck(mitte, 0, 1, 0)).toThrow(RangeError);
  });
});
