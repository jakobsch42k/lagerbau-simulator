import { describe, expect, it } from 'vitest';
import { Linie } from '../model/Linie';
import { STANDARD_LINIE, STANDARD_ZONE } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Zone } from '../model/Zone';
import type { Roh } from '../share/lesen';
import { LinieArt } from './LinieArt';
import type { PanelAuswahl, PanelFarbe, PanelFeld, PanelText } from './ObjektArt';
import { ZoneArt } from './ZoneArt';

const p = (x: number, z: number): Vec3 => new Vec3(x, 0, z);
const mehrpunkt = (art: ZoneArt | LinieArt): Extract<typeof art.platzieren, { modus: 'mehrpunkt' }> => {
  if (art.platzieren.modus !== 'mehrpunkt') throw new Error('Modus mehrpunkt erwartet');
  return art.platzieren;
};

describe('ZoneArt', () => {
  const art = new ZoneArt();
  const z = new Zone('z', [p(0, 0), p(20, 0), p(20, 15), p(0, 15)], { name: 'Küche', farbe: '#112233', deckkraft: 60 });

  it('Metadaten: Klick wahlweise, zählt nicht zum Platzbedarf, keine Ösen', () => {
    expect([art.name, art.label, art.klick, art.zaehltZumPlatzbedarf, art.hatOesen]).toEqual(['zone', 'Zone', 'wahlweise', false, false]);
    expect(art.istVon(z)).toBe(true);
    expect(art.beiTreffer()).toBeNull();
  });

  it('Mehrpunkt-Platzieren: geschlossen, mindestens 3, Startwerte (40 %); zu wenige Punkte werfen die Meldung des Modells', () => {
    const platz = mehrpunkt(art);
    expect([platz.mindestpunkte, platz.geschlossen]).toEqual([3, true]);
    const neu = platz.erzeuge('x', [p(0, 0), p(2, 0), p(0, 2)]) as Zone;
    expect(neu.params).toEqual(STANDARD_ZONE);
    expect(STANDARD_ZONE.deckkraft).toBe(40);
    expect(() => platz.erzeuge('x', [p(0, 0), p(2, 0)])).toThrow('Eine Zone braucht mindestens 3 Ecken.');
  });

  it('Fangpunkte: jede Ecke als `ecke`', () => {
    expect(art.fangpunkte(z).map((f) => [f.art, f.punkt.toArray()])).toEqual([
      ['ecke', [0, 0, 0]],
      ['ecke', [20, 0, 0]],
      ['ecke', [20, 0, 15]],
      ['ecke', [0, 0, 15]],
    ]);
  });

  it('Rundlauf über JSON', () => {
    const json = art.zuJson(z);
    expect(Object.keys(json)).toEqual(['art', 'id', 'name', 'farbe', 'deckkraft', 'punkte']);
    const zurueck = art.ausJson(JSON.parse(JSON.stringify(json)) as Roh);
    expect(zurueck.params).toEqual(z.params);
    expect(zurueck.punkte.map((q) => q.toArray())).toEqual(z.punkte.map((q) => q.toArray()));
  });

  it('JSON-Fehler mit Meldung', () => {
    const json = art.zuJson(z);
    expect(() => art.ausJson({ ...json, punkte: 'x' })).toThrow('punkte ist keine Liste');
    expect(() => art.ausJson({ ...json, punkte: [[0, 0, 0], [1, 0, 0]] })).toThrow('Eine Zone braucht mindestens 3 Ecken.');
    expect(() => art.ausJson({ ...json, punkte: [[0, 0, 0], [4, 0, 4], [4, 0, 0], [0, 0, 4]] })).toThrow('nicht selbst schneiden');
    expect(() => art.ausJson({ ...json, deckkraft: 500 })).toThrow('Deckkraft');
    expect(() => art.ausJson({ ...json, name: 5 })).toThrow('name');
  });

  it('Panel: Name, Farbe, Deckkraft; Info mit Fläche in deutschem Zahlenformat', () => {
    const spec = art.panel(z);
    expect(spec.felder.map((f) => f.schluessel)).toEqual(['name', 'farbe', 'deckkraft']);
    expect((spec.felder[0] as PanelText).art).toBe('text');
    expect((spec.felder[1] as PanelFarbe).art).toBe('farbe');
    expect((spec.felder[2] as PanelFeld).label).toBe('Deckkraft (%)');
    expect(spec.werte).toEqual({ name: 'Küche', farbe: '#112233', deckkraft: 60 });
    expect(spec.info).toBe('Fläche 300 m²');
    expect(art.panel(new Zone('k', [p(0, 0), p(1.5, 0), p(0, 2)], STANDARD_ZONE)).info).toBe('Fläche 1,5 m²');
  });

  it('Panel: mit() übernimmt Werte und prüft neu', () => {
    const spec = art.panel(z);
    expect((spec.mit({ ...spec.werte, deckkraft: 10 }) as Zone).params.deckkraft).toBe(10);
    expect((spec.mit({ ...spec.werte, name: 'Wiese' }) as Zone).punkte).toHaveLength(4);
    expect(() => spec.mit({ ...spec.werte, deckkraft: 101 })).toThrow('Deckkraft muss zwischen 0 und 100 % liegen');
    expect(() => spec.mit({ ...spec.werte, name: '' })).toThrow('Name muss 1 bis 40 Zeichen lang sein');
  });
});

describe('LinieArt', () => {
  const art = new LinieArt();
  const weg = new Linie('l', [p(0, 0), p(30, 0), p(30, 38.3)], { name: 'Zufahrt', typ: 'weg', breite: 2, farbe: '#a68a64' });

  it('Metadaten', () => {
    expect([art.name, art.label, art.klick, art.zaehltZumPlatzbedarf, art.hatOesen]).toEqual(['linie', 'Linie', 'wahlweise', false, false]);
    expect(art.istVon(weg)).toBe(true);
    expect(art.beiTreffer()).toBeNull();
  });

  it('Mehrpunkt-Platzieren: offen, mindestens 2, Startwerte (Weg, 1 m)', () => {
    const platz = mehrpunkt(art);
    expect([platz.mindestpunkte, platz.geschlossen]).toEqual([2, false]);
    expect((platz.erzeuge('x', [p(0, 0), p(2, 0)]) as Linie).params).toEqual(STANDARD_LINIE);
    expect(STANDARD_LINIE.breite).toBe(1);
    expect(() => platz.erzeuge('x', [p(0, 0)])).toThrow('Eine Linie braucht mindestens 2 Punkte.');
  });

  it('Fangpunkte: jeder Punkt als `ecke`', () => {
    expect(art.fangpunkte(weg).map((f) => f.art)).toEqual(['ecke', 'ecke', 'ecke']);
  });

  it('Rundlauf über JSON und Fehler', () => {
    const json = art.zuJson(weg);
    expect(Object.keys(json)).toEqual(['art', 'id', 'name', 'typ', 'breite', 'farbe', 'punkte']);
    const zurueck = art.ausJson(JSON.parse(JSON.stringify(json)) as Roh);
    expect(zurueck.params).toEqual(weg.params);
    expect(zurueck.punkte).toHaveLength(3);
    expect(() => art.ausJson({ ...json, punkte: [[0, 0, 0]] })).toThrow('Eine Linie braucht mindestens 2 Punkte.');
    expect(() => art.ausJson({ ...json, typ: 'mauer' })).toThrow('Typ muss Weg, Zaun oder Grenze sein');
    expect(() => art.ausJson({ ...json, breite: 'x' })).toThrow('breite');
  });

  it('Panel beim Weg: Name, Typ, Breite, Farbe; Info mit Länge', () => {
    const spec = art.panel(weg);
    expect(spec.felder.map((f) => f.schluessel)).toEqual(['name', 'typ', 'breite', 'farbe']);
    expect((spec.felder[1] as PanelAuswahl).optionen.map(([wert]) => wert)).toEqual(['weg', 'zaun', 'grenze']);
    expect(spec.info).toBe('Länge 68,3 m');
  });

  it('Panel bei Zaun und Grenze: ohne Breite', () => {
    const zaun = weg.mitParams({ ...weg.params, typ: 'zaun' });
    expect(art.panel(zaun).felder.map((f) => f.schluessel)).toEqual(['name', 'typ', 'farbe']);
    expect(art.panel(weg.mitParams({ ...weg.params, typ: 'grenze' })).felder.map((f) => f.schluessel)).toEqual(['name', 'typ', 'farbe']);
  });

  it('Panel: mit() wechselt den Typ und prüft die Breite nur beim Weg', () => {
    const spec = art.panel(weg);
    expect((spec.mit({ ...spec.werte, typ: 'zaun', breite: 0 }) as Linie).params.typ).toBe('zaun');
    expect(() => spec.mit({ ...spec.werte, breite: 0 })).toThrow('Breite muss größer als 0 sein');
    expect(() => spec.mit({ ...spec.werte, name: 'x'.repeat(41) })).toThrow('Name muss 1 bis 40 Zeichen lang sein');
  });
});
