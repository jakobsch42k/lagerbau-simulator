import { describe, expect, it } from 'vitest';
import { Beschriftung } from '../model/Beschriftung';
import { STANDARD_BESCHRIFTUNG } from '../model/params';
import { Vec3 } from '../model/Vec3';
import type { Roh } from '../share/lesen';
import type { PanelFarbe, PanelFeld, PanelText } from './ObjektArt';
import { BeschriftungArt } from './BeschriftungArt';

describe('BeschriftungArt', () => {
  const art = new BeschriftungArt();
  const b = new Beschriftung('b', new Vec3(1, 0, 2), { text: 'Küche', groesse: 2, farbe: '#112233' });

  it('Metadaten', () => {
    expect([art.name, art.label, art.klick, art.zaehltZumPlatzbedarf, art.hatOesen]).toEqual(['beschriftung', 'Beschriftung', 'wahlweise', false, false]);
    expect(art.istVon(b)).toBe(true);
    expect(art.fangpunkte()).toEqual([]);
    expect(art.beiTreffer()).toBeNull();
  });

  it('setzt mit Startwerten (1 m)', () => {
    const platz = art.platzieren;
    if (platz.modus !== 'punkt') throw new Error('Modus');
    expect((platz.erzeuge('x', new Vec3(3, 0, 3)) as Beschriftung).params).toEqual(STANDARD_BESCHRIFTUNG);
  });

  it('Rundlauf über JSON und Fehler', () => {
    const json = art.zuJson(b);
    expect(Object.keys(json)).toEqual(['art', 'id', 'position', 'text', 'groesse', 'farbe']);
    expect(art.ausJson(JSON.parse(JSON.stringify(json)) as Roh).params).toEqual(b.params);
    expect(() => art.ausJson({ ...json, text: '' })).toThrow('Text muss 1 bis 80');
    expect(() => art.ausJson({ ...json, groesse: 0 })).toThrow('Schrifthöhe');
    expect(() => art.ausJson({ ...json, farbe: 'x' })).toThrow('Farbe');
  });

  it('Panel: Text, Größe, Farbe; ungültige Werte werfen', () => {
    const spec = art.panel(b);
    expect(spec.felder.map((f) => f.schluessel)).toEqual(['text', 'groesse', 'farbe']);
    expect((spec.felder[0] as PanelText).art).toBe('text');
    expect((spec.felder[1] as PanelFeld).label).toBe('Schrifthöhe (m)');
    expect((spec.felder[2] as PanelFarbe).art).toBe('farbe');
    expect((spec.mit({ ...spec.werte, text: 'Spielwiese' }) as Beschriftung).params.text).toBe('Spielwiese');
    expect(() => spec.mit({ ...spec.werte, text: 'x'.repeat(81) })).toThrow('Text muss 1 bis 80 Zeichen lang sein');
    expect(() => spec.mit({ ...spec.werte, groesse: -1 })).toThrow('Schrifthöhe muss größer als 0 sein');
  });
});
