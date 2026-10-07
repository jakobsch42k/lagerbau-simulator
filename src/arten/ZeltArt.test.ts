// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '../editor/Editor';
import { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';
import { Zelt } from '../model/Zelt';
import { ParameterPanel } from '../ui/ParameterPanel';
import type { PanelAuswahl, PanelFeld, Werte } from './ObjektArt';
import { standardArten } from './standardArten';
import { findeZeltVorlage, paramsAusZeltVorlage, ZELT_VORLAGEN, ZeltVorlagenWahl } from './zelt/vorlagen';
import { ZeltArt } from './ZeltArt';

const zeltAus = (schluessel: string, drehung = 0.5): Zelt => {
  const v = findeZeltVorlage(schluessel);
  if (!v) throw new Error('Vorlage fehlt');
  return new Zelt('z', new Vec3(1, 0, 2), paramsAusZeltVorlage(v), drehung);
};

const schluessel = (z: Zelt, art: ZeltArt): string[] => art.panel(z).felder.map((f) => f.schluessel);

describe('ZeltArt (Spec E4, D5)', () => {
  const wahl = new ZeltVorlagenWahl();
  const art = new ZeltArt(wahl);

  it('Metadaten', () => {
    expect([art.name, art.label, art.klick, art.hatOesen]).toEqual(['zelt', 'Zelt', 'wahlweise', false]);
    expect(art.fangpunkte()).toEqual([]);
    expect(art.beiTreffer()).toBeNull();
    expect(art.platzieren.modus).toBe('punkt');
  });

  it('ist im Standardregister genau einmal registriert', () => {
    expect(standardArten().alle.filter((a) => a.name === 'zelt')).toHaveLength(1);
  });

  it('setzt mit der zuletzt gewählten Vorlage, Drehung 0; sie bleibt aktiv', () => {
    wahl.setze('doppelkegler');
    if (art.platzieren.modus !== 'punkt') throw new Error('Modus');
    const a = art.platzieren.erzeuge('a', new Vec3(1, 0, 1)) as Zelt;
    const b = art.platzieren.erzeuge('b', new Vec3(9, 0, 1)) as Zelt;
    expect([a.params.vorlage, b.params.vorlage, a.drehungRad]).toEqual(['doppelkegler', 'doppelkegler', 0]);
  });

  it('Meldung nach dem Setzen nennt den Namen', () => {
    expect(art.meldungNachSetzen(zeltAus('jurte6'))).toBe('Zelt gesetzt: Jurte 6er');
    expect(art.meldungNachSetzen(zeltAus('hanger'))).toBe('Zelt gesetzt: Hanger (Platzhalter)');
  });

  it('Panel: Felder je Form', () => {
    expect(schluessel(zeltAus('jurte6'), art)).toEqual([
      'vorlage', 'name', 'aufbau', 'durchmesser', 'ecken', 'wand1', 'wand2', 'wand3',
      'wandhoehe', 'firsthoehe', 'abspannungen', 'seillaenge', 'haringAbstand', 'drehung', 'farbe',
    ]);
    expect(schluessel(zeltAus('hanger'), art)).toEqual([
      'vorlage', 'name', 'aufbau', 'laenge', 'breite',
      'wandhoehe', 'firsthoehe', 'abspannungen', 'seillaenge', 'haringAbstand', 'drehung', 'farbe',
    ]);
    const felder = art.panel(zeltAus('hanger')).felder;
    expect((felder[3] as PanelFeld).schritt).toBe('0.5');
    expect((felder[0] as PanelAuswahl).optionen).toHaveLength(ZELT_VORLAGEN.length);
    const wand = art.panel(zeltAus('jurte6')).felder[6] as PanelAuswahl;
    expect([wand.label, wand.optionen]).toEqual(['Wand 2', [['an', 'an'], ['aus', 'aus']]]);
  });

  it('Panel: Info nutzt die echte Fläche, Haringe und Seillänge', () => {
    expect(art.panel(zeltAus('jurte6')).info).toBe('Fläche 28 m² · 12 Haringe · Seil je 3,0 m');
  });

  it('Panel: Drehung in Grad, unveränderte Werte lassen die Drehung exakt', () => {
    const spec = art.panel(zeltAus('jurte6', 0.5));
    expect(spec.werte.drehung).toBeCloseTo((0.5 * 180) / Math.PI, 2);
    expect((spec.mit(spec.werte) as Zelt).drehungRad).toBe(0.5);
    expect((spec.mit({ ...spec.werte, drehung: 90 }) as Zelt).drehungRad).toBeCloseTo(Math.PI / 2, 10);
  });

  it('Panel: Wand 2 aus ergibt waende [true, false, true]', () => {
    const spec = art.panel(zeltAus('jurte6'));
    expect(spec.werte).toMatchObject({ wand1: 'an', wand2: 'an', wand3: 'an' });
    const neu = spec.mit({ ...spec.werte, wand2: 'aus' }) as Zelt;
    expect(neu.params.waende).toEqual([true, false, true]);
    expect(neu.position).toEqual(zeltAus('jurte6').position);
  });

  it('Panel: Vorlagenwechsel setzt alle Maße zurück, behält Lage und Drehung', () => {
    const o = zeltAus('jurte6');
    const veraendert = o.mitParams({ ...o.params, name: 'Mein Zelt', durchmesser: 7, waende: [false, true, true], farbe: '#000000' });
    const spec = art.panel(veraendert);
    const neu = spec.mit({ ...spec.werte, vorlage: 'hanger' }) as Zelt;
    const hanger = findeZeltVorlage('hanger');
    expect(hanger && neu.params).toEqual(hanger && paramsAusZeltVorlage(hanger));
    expect([neu.id, neu.drehungRad, neu.position.x]).toEqual(['z', 0.5, 1]);
    expect(() => spec.mit({ ...spec.werte, vorlage: 'xyz' })).toThrow('Unbekannte Vorlage');
  });

  it('Panel: ungültige Werte werfen die Meldung des Modells', () => {
    const spec = art.panel(zeltAus('jurte6'));
    expect(() => spec.mit({ ...spec.werte, ecken: 30 })).toThrow(RangeError);
    expect(() => spec.mit({ ...spec.werte, name: '' })).toThrow(RangeError);
  });

  it('Vorlagenwechsel im Editor ist genau ein Undo-Schritt', () => {
    const editor = new Editor(Bauwerk.leer().mit(zeltAus('jurte6')));
    const spec = art.panel(zeltAus('jurte6'));
    const werte: Werte = { ...spec.werte, vorlage: 'doppelkegler' };
    expect(editor.aendereMit((b) => b.ersetze(spec.mit(werte)))).toBe(true);
    expect((editor.bauwerk.objekt('z') as Zelt).params.vorlage).toBe('doppelkegler');
    editor.rueckgaengig();
    expect((editor.bauwerk.objekt('z') as Zelt).params.vorlage).toBe('jurte6');
    expect(editor.zustand().kannRueckgaengig).toBe(false);
  });

  it('im ParameterPanel springt ein ungültiger Wert zurück, Wand 2 aus gilt', () => {
    const wurzel = document.createElement('section');
    const editor = new Editor(Bauwerk.leer().mit(zeltAus('jurte6')));
    const panel = new ParameterPanel(wurzel, editor);
    editor.abonniere((z) => panel.zeige(z));
    editor.waehle('z');
    panel.zeige(editor.zustand());
    const ecken = [...wurzel.querySelectorAll('label')].find((l) => l.textContent?.startsWith('Ecken'))?.querySelector('input');
    if (!ecken) throw new Error('Feld fehlt');
    ecken.value = '30';
    ecken.dispatchEvent(new Event('change'));
    expect(editor.zustand().meldung).not.toBeNull();
    expect(ecken.value).toBe('12');
    const wand2 = [...wurzel.querySelectorAll('label')].find((l) => l.textContent?.startsWith('Wand 2'))?.querySelector('select');
    if (!wand2) throw new Error('Wand fehlt');
    wand2.value = 'aus';
    wand2.dispatchEvent(new Event('change'));
    expect((editor.bauwerk.objekt('z') as Zelt).params.waende).toEqual([true, false, true]);
  });

  it('Rundlauf über JSON', () => {
    const o = zeltAus('doppelkegler');
    expect(art.ausJson(JSON.parse(JSON.stringify(art.zuJson(o)))).params).toEqual(o.params);
  });

  it('lehnt falsche Wahrheitswerte ab', () => {
    const json = JSON.parse(JSON.stringify(art.zuJson(zeltAus('jurte6'))));
    expect(() => art.ausJson({ ...json, waende: [true, 1, true] })).toThrow('waende');
  });
});
