import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vec3 } from '../../model/Vec3';
import { Zelt } from '../../model/Zelt';
import { findeZeltVorlage, paramsAusZeltVorlage, ZELT_VORLAGEN } from './vorlagen';

const QUELLE = readFileSync(new URL('./vorlagen.ts', import.meta.url), 'utf8');

describe('Zelt-Vorlagen (Spec E4, D2)', () => {
  it('enthalten die sechs Vorlagen der Tabelle in dieser Reihenfolge', () => {
    expect(ZELT_VORLAGEN.map((v) => [v.schluessel, v.aufbau, v.wandhoehe, v.firsthoehe, v.abspannungen, v.seillaenge, v.haringAbstand])).toEqual([
      ['jurte5', 'rund', 1.65, 3.25, 10, 3, 2],
      ['jurte6', 'rund', 1.65, 2.62, 12, 3, 2],
      ['jurte8', 'rund', 1.65, 3.17, 16, 3, 2],
      ['hanger', 'sattel', 1.75, 2.15, 8, 3, 1],
      ['doppelkegler', 'doppelkegel', 0.4, 2.75, 20, 3, 1],
      ['eigenes', 'sattel', 1.8, 2.4, 4, 3, 1],
    ]);
    expect(ZELT_VORLAGEN.filter((v) => v.aufbau === 'rund').map((v) => [v.durchmesser, v.ecken])).toEqual([
      [5.08, 10],
      [6.07, 12],
      [8.05, 16],
    ]);
    expect(ZELT_VORLAGEN.filter((v) => v.aufbau !== 'rund').map((v) => [v.laenge, v.breite])).toEqual([
      [6, 4.5],
      [5.55, 4],
      [4, 3],
    ]);
  });

  it('haben Namen und Farben der Spec', () => {
    expect(ZELT_VORLAGEN.map((v) => [v.name, v.farbe])).toEqual([
      ['Jurte 5er', '#4a4a4a'],
      ['Jurte 6er', '#4a4a4a'],
      ['Jurte 8er', '#4a4a4a'],
      ['Hanger (Platzhalter)', '#8a8a6a'],
      ['Doppelkegler', '#6b7a4a'],
      ['Eigenes', '#9a9a9a'],
    ]);
    expect(new Set(ZELT_VORLAGEN.map((v) => v.schluessel)).size).toBe(6);
  });

  it('bestehen alle die Prüfung des Modells und behalten alle Wände', () => {
    for (const v of ZELT_VORLAGEN) {
      const p = paramsAusZeltVorlage(v);
      expect(() => new Zelt('z', Vec3.NULL, p), v.schluessel).not.toThrow();
      expect(p.vorlage).toBe(v.schluessel);
      expect(p.waende).toEqual([true, true, true]);
    }
  });

  it('findeZeltVorlage kennt die Schlüssel', () => {
    expect(findeZeltVorlage('hanger')?.label).toBe('Hanger (Platzhalter)');
    expect(findeZeltVorlage('gibtsnicht')).toBeUndefined();
  });

  it('die Quelldatei trägt in jeder Vorlage zu jedem Wert eine CHECK-MANUALLY-Zeile', () => {
    const feld = /^\s+(\w+):/;
    const block = QUELLE.slice(QUELLE.indexOf('ZELT_VORLAGEN: readonly'));
    const zeilen = block.split('\n').filter((z) => feld.test(z) && !/^\s+(schluessel|label|name):/.test(z));
    expect(zeilen.length).toBeGreaterThanOrEqual(6 * 11);
    for (const z of zeilen) expect(z, z).toContain('CHECK MANUALLY:');
    for (const v of ZELT_VORLAGEN) expect(QUELLE, v.schluessel).toContain(`schluessel: '${v.schluessel}'`);
  });
});
