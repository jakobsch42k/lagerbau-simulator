import { describe, expect, it } from 'vitest';
import { Linie } from './Linie';
import type { LinienParams } from './params';
import { Vec3 } from './Vec3';

const p = (x: number, z: number): Vec3 => new Vec3(x, 0, z);
const PARAMS: LinienParams = { name: 'Zufahrt', typ: 'weg', breite: 1, farbe: '#a68a64' };
const PUNKTE = [p(0, 0), p(3, 0), p(3, 4)];

describe('Linie', () => {
  it('Länge ist die Summe der Abschnitte', () => {
    const l = new Linie('l1', PUNKTE, PARAMS);
    expect(l.laenge()).toBeCloseTo(7);
    expect(l.art).toBe('linie');
  });

  it('prüft alle Parameter mit deutschen Meldungen', () => {
    expect(() => new Linie('l', [p(0, 0)], PARAMS)).toThrow('Eine Linie braucht mindestens 2 Punkte.');
    expect(() => new Linie('l', PUNKTE, { ...PARAMS, name: ' ' })).toThrow('Name muss 1 bis 40 Zeichen lang sein');
    expect(() => new Linie('l', PUNKTE, { ...PARAMS, farbe: '#12' })).toThrow('Farbe muss ein Hexwert');
    expect(() => new Linie('l', PUNKTE, { ...PARAMS, typ: 'mauer' as never })).toThrow('Typ muss Weg, Zaun oder Grenze sein');
    expect(() => new Linie('l', PUNKTE, { ...PARAMS, breite: 0 })).toThrow('Breite muss größer als 0 sein');
    expect(() => new Linie('l', PUNKTE, { ...PARAMS, breite: Number.NaN })).toThrow('Breite muss größer als 0 sein');
    expect(() => new Linie('l', [p(0, 0), p(Number.POSITIVE_INFINITY, 0)], PARAMS)).toThrow('Die Punkte müssen endlich sein');
  });

  it('Breite zählt nur beim Weg', () => {
    expect(new Linie('l', PUNKTE, { ...PARAMS, typ: 'zaun', breite: 0 }).params.typ).toBe('zaun');
    expect(new Linie('l', PUNKTE, { ...PARAMS, typ: 'grenze', breite: -3 }).params.typ).toBe('grenze');
  });

  it('eine Linie darf sich kreuzen', () => {
    expect(new Linie('l', [p(0, 0), p(4, 4), p(4, 0), p(0, 4)], PARAMS).laenge()).toBeGreaterThan(0);
  });

  it('verschobenUm und gedreht', () => {
    const l = new Linie('l', PUNKTE, PARAMS);
    const v = l.verschobenUm(new Vec3(2, 9, -1));
    expect(v.punkte.map((q) => q.toArray())).toEqual([
      [2, 0, -1],
      [5, 0, -1],
      [5, 0, 3],
    ]);
    expect(l.drehpunkt().toArray()).toEqual([1.5, 0, 2]);
    const d = l.gedreht(Math.PI / 2);
    expect(d.laenge()).toBeCloseTo(7);
    expect(d.drehpunkt().x).toBeCloseTo(1.5);
    expect(d.drehpunkt().z).toBeCloseTo(2);
    expect(l.gedreht(Math.PI, p(0, 0)).punkte[1]?.x).toBeCloseTo(-3);
  });

  it('mitParams, mitId, mitEcken, platzPunkte', () => {
    const l = new Linie('l', PUNKTE, PARAMS);
    expect(l.mitParams({ ...PARAMS, typ: 'zaun' }).params.typ).toBe('zaun');
    expect(l.mitId('x').ids()).toEqual(['x']);
    expect(l.mitEcken([p(0, 0), p(1, 0)]).laenge()).toBeCloseTo(1);
    expect(() => l.mitEcken([p(0, 0)])).toThrow('Eine Linie braucht mindestens 2 Punkte.');
    expect(l.platzPunkte()).toHaveLength(3);
  });
});
