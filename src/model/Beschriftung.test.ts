import { describe, expect, it } from 'vitest';
import { Beschriftung } from './Beschriftung';
import { STANDARD_BESCHRIFTUNG } from './params';
import { Vec3 } from './Vec3';

describe('Beschriftung', () => {
  const mit = (aenderung: Partial<typeof STANDARD_BESCHRIFTUNG>): Beschriftung =>
    new Beschriftung('b', Vec3.NULL, { ...STANDARD_BESCHRIFTUNG, ...aenderung });

  it('startet mit 1 m Schrifthöhe', () => {
    expect(STANDARD_BESCHRIFTUNG.groesse).toBe(1);
  });

  it.each([
    ['Text leer', { text: '' }, 'Text muss 1 bis 80 Zeichen lang sein'],
    ['Text nur Leerzeichen', { text: '  ' }, 'Text muss 1 bis 80 Zeichen lang sein'],
    ['Text zu lang', { text: 'x'.repeat(81) }, 'Text muss 1 bis 80 Zeichen lang sein'],
    ['Größe 0', { groesse: 0 }, 'Schrifthöhe muss größer als 0 sein'],
    ['Größe NaN', { groesse: Number.NaN }, 'Schrifthöhe muss größer als 0 sein'],
    ['Farbe', { farbe: 'blau' }, 'Farbe muss ein Hexwert wie #e8590c sein'],
  ])('lehnt ab: %s', (_n, aenderung, text) => {
    expect(() => mit(aenderung)).toThrow(new RangeError(text));
  });

  it('erlaubt 80 Zeichen und lehnt eine unendliche Position ab', () => {
    expect(mit({ text: 'x'.repeat(80) }).params.text).toHaveLength(80);
    expect(() => new Beschriftung('b', new Vec3(0, 0, Infinity), STANDARD_BESCHRIFTUNG)).toThrow('Die Position muss endlich sein');
  });

  it('kennt Art und ids, bleibt beim Verschieben am Boden und dreht seine Position', () => {
    const b = new Beschriftung('b', new Vec3(5, 0, 0), STANDARD_BESCHRIFTUNG);
    expect(b.art).toBe('beschriftung');
    expect(b.ids()).toEqual(['b']);
    expect(b.verschobenUm(new Vec3(1, 4, 1)).position.toArray()).toEqual([6, 0, 1]);
    expect(b.gedreht(1).position.toArray()).toEqual([5, 0, 0]);
    expect(b.gedreht(Math.PI / 2, Vec3.NULL).position.equals(new Vec3(0, 0, 5), 1e-9)).toBe(true);
    expect(b.drehpunkt().toArray()).toEqual([5, 0, 0]);
    expect(b.platzPunkte()).toEqual([b.position]);
    expect(b.mitId('c').id).toBe('c');
    expect(b.mitParams({ ...STANDARD_BESCHRIFTUNG, text: 'neu' }).params.text).toBe('neu');
  });
});
