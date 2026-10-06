// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { VORLAGEN, VorlagenWahl } from '../arten/platz/vorlagen';
import { VorlagenAuswahl } from './VorlagenAuswahl';

describe('VorlagenAuswahl (Spec E3, D2)', () => {
  it('zeigt alle Vorlagen mit der aktuellen gewählt', () => {
    const wahl = new VorlagenWahl();
    const select = document.createElement('select');
    new VorlagenAuswahl(select, wahl, () => {});
    expect([...select.options].map((o) => o.textContent)).toEqual(VORLAGEN.map((v) => v.label));
    expect(select.value).toBe('feuerstelle');
  });

  it('eine Wahl setzt die Vorlage und meldet es (damit das Werkzeug aktiv wird)', () => {
    const wahl = new VorlagenWahl();
    const select = document.createElement('select');
    const gewaehlt = vi.fn();
    new VorlagenAuswahl(select, wahl, gewaehlt);
    select.value = 'wasserstelle';
    select.dispatchEvent(new Event('change'));
    expect(wahl.aktuell.schluessel).toBe('wasserstelle');
    expect(gewaehlt).toHaveBeenCalledOnce();
  });
});
