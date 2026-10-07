import { describe, expect, it } from 'vitest';
import { Editor } from '../editor/Editor';
import { Bauwerk } from '../model/Bauwerk';
import { Platzobjekt } from '../model/Platzobjekt';
import { Vec3 } from '../model/Vec3';
import type { Roh } from '../share/lesen';
import type { PanelAuswahl, PanelFarbe, PanelFeld, PanelText, Werte } from './ObjektArt';
import { PlatzobjektArt } from './PlatzobjektArt';
import { findeVorlage, paramsAusVorlage, VORLAGEN, VorlagenWahl } from './platz/vorlagen';

const feuer = (): Platzobjekt => {
  const v = findeVorlage('feuerstelle');
  if (!v) throw new Error('Vorlage fehlt');
  return new Platzobjekt('p', new Vec3(1, 0, 2), paramsAusVorlage(v), 0.5);
};

describe('PlatzobjektArt', () => {
  const wahl = new VorlagenWahl();
  const art = new PlatzobjektArt(wahl);

  it('Metadaten: wahlweise klickbar, zählt nicht zum Platzbedarf, keine Ösen', () => {
    expect(art.name).toBe('platzobjekt');
    expect(art.label).toBe('Platz-Objekt');
    expect(art.klick).toBe('wahlweise');
    expect(art.zaehltZumPlatzbedarf).toBe(false);
    expect(art.hatOesen).toBe(false);
    expect(art.istVon(feuer())).toBe(true);
    expect(art.fangpunkte()).toEqual([]);
    expect(art.beiTreffer()).toBeNull();
  });

  it('Rundlauf über JSON', () => {
    const o = feuer();
    const json = art.zuJson(o);
    expect(Object.keys(json)).toEqual(['art', 'id', 'position', 'drehung', 'vorlage', 'name', 'form', 'breite', 'laenge', 'hoehe', 'farbe']);
    const zurueck = art.ausJson(JSON.parse(JSON.stringify(json)) as Roh);
    expect(zurueck.params).toEqual(o.params);
    expect(zurueck.drehungRad).toBe(0.5);
    expect(zurueck.position.toArray()).toEqual([1, 0, 2]);
  });

  it('lehnt falsche JSON-Felder ab', () => {
    const json = { ...art.zuJson(feuer()) } as Roh;
    expect(() => art.ausJson({ ...json, form: 'dreieck' })).toThrow('Form muss Kreis oder Rechteck sein');
    expect(() => art.ausJson({ ...json, name: 5 })).toThrow('name');
    expect(() => art.ausJson({ ...json, farbe: 'rot' })).toThrow('Farbe muss ein Hexwert');
    expect(() => art.ausJson({ ...json, breite: 'x' })).toThrow('breite');
  });

  it('setzt mit der zuletzt gewählten Vorlage; sie bleibt aktiv', () => {
    wahl.setze('fahnenmast');
    const platz = art.platzieren;
    if (platz.modus !== 'punkt') throw new Error('Modus');
    const a = platz.erzeuge('a', new Vec3(1, 0, 1)) as Platzobjekt;
    const b = platz.erzeuge('b', new Vec3(5, 0, 1)) as Platzobjekt;
    expect([a.params.vorlage, b.params.vorlage, a.params.hoehe]).toEqual(['fahnenmast', 'fahnenmast', 8]);
    expect(a.drehungRad).toBe(0);
  });

  it('Panel: Reihenfolge der Eingaben, Länge nur beim Rechteck', () => {
    const kreis = art.panel(feuer());
    expect(kreis.felder.map((f) => `${'art' in f ? f.art : 'zahl'}:${f.schluessel}`)).toEqual([
      'auswahl:vorlage',
      'text:name',
      'auswahl:form',
      'zahl:breite',
      'zahl:hoehe',
      'farbe:farbe',
    ]);
    expect((kreis.felder[3] as PanelFeld).label).toBe('Durchmesser (m)');
    expect((kreis.felder[0] as PanelAuswahl).optionen).toHaveLength(VORLAGEN.length);
    const rechteck = art.panel(feuer().mitParams({ ...feuer().params, form: 'rechteck' }));
    expect(rechteck.felder.map((f) => f.schluessel)).toEqual(['vorlage', 'name', 'form', 'breite', 'laenge', 'hoehe', 'farbe']);
    expect((rechteck.felder[3] as PanelFeld).label).toBe('Breite (m)');
    expect((rechteck.felder[1] as PanelText).art).toBe('text');
    expect((rechteck.felder[6] as PanelFarbe).art).toBe('farbe');
    expect(rechteck.extras).toEqual([]);
  });

  it('Panel: Werte ändern ein Feld und behalten Lage und Drehung', () => {
    const o = feuer();
    const spec = art.panel(o);
    const neu = spec.mit({ ...spec.werte, breite: 2 }) as Platzobjekt;
    expect(neu.params.breite).toBe(2);
    expect(neu.params.vorlage).toBe('feuerstelle');
    expect(neu.drehungRad).toBe(0.5);
    expect(neu.position).toEqual(o.position);
  });

  it('Panel: Vorlagenwechsel setzt alle Felder, auch wenn vorher alles geändert war', () => {
    const o = feuer().mitParams({ ...feuer().params, name: 'Mein Feuer', breite: 9, hoehe: 5, farbe: '#000000' });
    const spec = art.panel(o);
    const neu = spec.mit({ ...spec.werte, vorlage: 'holzlager' }) as Platzobjekt;
    const holz = findeVorlage('holzlager');
    expect(holz && neu.params).toEqual(holz && paramsAusVorlage(holz));
    expect(neu.id).toBe('p');
    expect(neu.drehungRad).toBe(0.5);
    expect(() => spec.mit({ ...spec.werte, vorlage: 'xyz' })).toThrow('Unbekannte Vorlage');
  });

  it('Panel: ungültige Werte werfen die Meldung des Modells', () => {
    const spec = art.panel(feuer());
    expect(() => spec.mit({ ...spec.werte, breite: 0 })).toThrow('Durchmesser muss größer als 0 sein');
    expect(() => spec.mit({ ...spec.werte, name: '' })).toThrow('Name muss 1 bis 40 Zeichen lang sein');
    expect(() => spec.mit({ ...spec.werte, hoehe: -1 })).toThrow('Höhe darf nicht negativ sein');
  });

  it('Vorlagenwechsel im Editor ist genau ein Undo-Schritt', () => {
    const editor = new Editor(Bauwerk.leer().mit(feuer()));
    const spec = art.panel(feuer());
    const werte: Werte = { ...spec.werte, vorlage: 'latrine' };
    expect(editor.aendereMit((b) => b.ersetze(spec.mit(werte)))).toBe(true);
    expect((editor.bauwerk.objekt('p') as Platzobjekt).params.vorlage).toBe('latrine');
    editor.rueckgaengig();
    expect((editor.bauwerk.objekt('p') as Platzobjekt).params.vorlage).toBe('feuerstelle');
    expect(editor.zustand().kannRueckgaengig).toBe(false);
  });
});
