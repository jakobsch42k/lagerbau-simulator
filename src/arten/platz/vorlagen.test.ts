import { describe, expect, it } from 'vitest';
import { findeVorlage, paramsAusVorlage, VORLAGEN, VorlagenWahl } from './vorlagen';

describe('Vorlagen (Spec E3, D2)', () => {
  it('enthalten die Tabelle der Spec', () => {
    expect(VORLAGEN.map((v) => [v.label, v.form, v.breite, v.form === 'kreis' ? v.breite : v.laenge, v.hoehe])).toEqual([
      ['Feuerstelle', 'kreis', 1.5, 1.5, 0.3],
      ['Fahnenmast', 'kreis', 0.2, 0.2, 8],
      ['Latrine/WC', 'rechteck', 1.5, 1.5, 2],
      ['Wasserstelle', 'kreis', 1, 1, 1],
      ['Holzlager', 'rechteck', 3, 2, 1],
      ['Eigenes', 'rechteck', 2, 2, 1],
    ]);
  });

  it('haben eindeutige Schlüssel und gültige Hexfarben', () => {
    expect(new Set(VORLAGEN.map((v) => v.schluessel)).size).toBe(VORLAGEN.length);
    for (const v of VORLAGEN) expect(v.farbe).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('liefern alle Felder eines Platz-Objekts', () => {
    const f = findeVorlage('feuerstelle');
    expect(f && paramsAusVorlage(f)).toEqual({ vorlage: 'feuerstelle', name: 'Feuerstelle', form: 'kreis', breite: 1.5, laenge: 1.5, hoehe: 0.3, farbe: f?.farbe });
    expect(findeVorlage('gibtsnicht')).toBeUndefined();
  });

  it('VorlagenWahl: Start Feuerstelle, bleibt nach dem Setzen aktiv, lehnt Unbekanntes ab', () => {
    const wahl = new VorlagenWahl();
    expect(wahl.aktuell.schluessel).toBe('feuerstelle');
    wahl.setze('holzlager');
    expect(wahl.aktuell.label).toBe('Holzlager');
    expect(() => wahl.setze('xyz')).toThrow(RangeError);
    expect(wahl.aktuell.schluessel).toBe('holzlager');
  });
});
