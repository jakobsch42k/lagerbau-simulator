import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { PlatzregelEinstellungen } from '../rules/platz/PlatzregelEinstellungen';
import { BauwerkSerializer } from './BauwerkSerializer';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const einstellungen = PlatzregelEinstellungen.standard().mitAus('P3', true).mitWert('P1_MIN_ABSTAND_FEUER_ZELT_M', 4);
const objekte = serializer.zuJson(kochstelle()).objekte;

describe('Platzregeln im Datenformat (Spec E6, D4)', () => {
  it('schreibt sie als platzregeln und liest sie zurück (Version bleibt 7)', () => {
    const json = serializer.zuJson(kochstelle().mitPlatzregelEinstellungen(einstellungen));
    expect(json.version).toBe(7);
    expect(json.platzregeln).toEqual({ aus: ['P3'], werte: { P1_MIN_ABSTAND_FEUER_ZELT_M: 4 } });
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(zurueck.platzregelEinstellungen.istAus('P3')).toBe(true);
    expect(zurueck.platzregelEinstellungen.wert('P1_MIN_ABSTAND_FEUER_ZELT_M')).toBe(4);
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });

  it('lässt das Feld weg, solange alles auf Standard steht', () => {
    const json = serializer.zuJson(kochstelle());
    expect('platzregeln' in json).toBe(false);
    expect(serializer.ausJson(json).platzregelEinstellungen.istStandard).toBe(true);
  });

  it('Regel- und Platzregel-Einstellungen sind unabhängig', () => {
    const json = serializer.zuJson(kochstelle().mitPlatzregelEinstellungen(einstellungen));
    expect('regeln' in json).toBe(false);
  });

  it('eine Datei ohne platzregeln (v1 bis v7) lädt mit Standard', () => {
    for (const version of [4, 5, 6, 7]) {
      const g = serializer.ausJson({ version, objekte: version >= 6 ? objekte : [] , ...(version < 6 ? { stangen: [], seile: [], baeume: [], planen: [], gruppen: [] } : {}) });
      expect(g.platzregelEinstellungen.istStandard).toBe(true);
    }
  });

  it.each([
    [{ aus: ['P9'] }, 'unbekannte Platzregel P9'],
    [{ werte: { P9_X: 1 } }, 'unbekannter Platzregelwert P9_X'],
    [{ werte: { P1_MIN_ABSTAND_FEUER_ZELT_M: -1 } }, 'Wert muss größer als 0 sein'],
    [{ werte: { P6_KRONENRADIUS_FAKTOR: 2 } }, 'Faktor muss zwischen 0 und 1 liegen'],
  ])('lehnt %j ab', (platzregeln, meldung) => {
    expect(() => serializer.ausJson({ version: 7, objekte, platzregeln })).toThrow(`Ungültige Bauwerk-Daten: ${meldung}`);
  });

  it('reist mit dem Link', () => {
    const codec = new UrlCodec();
    const zurueck = codec.ausHash(codec.alsHash(kochstelle().mitPlatzregelEinstellungen(einstellungen)));
    expect(zurueck?.platzregelEinstellungen.istAus('P3')).toBe(true);
    expect(zurueck?.platzregelEinstellungen.wert('P1_MIN_ABSTAND_FEUER_ZELT_M')).toBe(4);
  });
});
