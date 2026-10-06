import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { RegelEinstellungen } from '../rules/RegelEinstellungen';
import { RuleEngine } from '../rules/RuleEngine';
import { standardRegeln } from '../rules/standardRegeln';
import { BauwerkSerializer } from './BauwerkSerializer';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const einstellungen = RegelEinstellungen.standard().mitAus('R4', true).mitWert('R4_MAX_BEINWINKEL_GRAD', 40);
const objekte = serializer.zuJson(kochstelle()).objekte;

describe('Regel-Einstellungen im Datenformat v4 (Spec v3, D8)', () => {
  it('schreibt sie als regeln und liest sie zurück', () => {
    const json = serializer.zuJson(kochstelle().mitRegelEinstellungen(einstellungen));
    expect(json.regeln).toEqual({ aus: ['R4'], werte: { R4_MAX_BEINWINKEL_GRAD: 40 } });
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(zurueck.regelEinstellungen.istAus('R4')).toBe(true);
    expect(zurueck.regelEinstellungen.wert('R4_MAX_BEINWINKEL_GRAD')).toBe(40);
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });

  it('lässt das Feld weg, solange alles auf Standard steht', () => {
    const json = serializer.zuJson(kochstelle());
    expect('regeln' in json).toBe(false);
    expect(serializer.ausJson(json).regelEinstellungen.istStandard).toBe(true);
  });

  it('gibt für eine v4-Datei ohne regeln genau die Hinweise von heute', () => {
    const ohneFirst = kochstelle().ohne('first');
    const gelesen = serializer.ausJson(JSON.parse(JSON.stringify(serializer.zuJson(ohneFirst))));
    const hinweise = RuleEngine.fuer(gelesen.regelEinstellungen).pruefe(gelesen);
    expect(hinweise).toEqual(new RuleEngine(standardRegeln()).pruefe(ohneFirst));
    expect(hinweise.length).toBeGreaterThan(0);
  });

  it('reist mit dem Link', () => {
    const codec = new UrlCodec();
    const zurueck = codec.ausHash(codec.alsHash(kochstelle().mitRegelEinstellungen(einstellungen)));
    expect(zurueck?.regelEinstellungen.istAus('R4')).toBe(true);
  });

  it('übergeht ein Feld regeln in den Versionen 1–3', () => {
    const v3 = { version: 3, gruppen: [], stangen: [], seile: [], baeume: [], planen: [], regeln: { aus: ['R4'] } };
    expect(serializer.ausJson(v3).regelEinstellungen.istStandard).toBe(true);
  });

  it.each<[string, unknown, string]>([
    ['kein Objekt', 'aus', 'regeln ist kein Objekt'],
    ['aus keine Liste', { aus: 'R4' }, 'regeln.aus ist keine Liste'],
    ['unbekannte Regel', { aus: ['R9'] }, 'unbekannte Regel R9'],
    ['unbekannter Wert', { werte: { R9_X: 1 } }, 'unbekannter Regelwert R9_X'],
    ['Wert keine Zahl', { werte: { R4_MAX_BEINWINKEL_GRAD: 'flach' } }, 'R4_MAX_BEINWINKEL_GRAD ist keine Zahl'],
    ['Winkel über 90°', { werte: { R4_MAX_BEINWINKEL_GRAD: 120 } }, 'Winkel muss zwischen 0 und 90° liegen'],
    ['Untergrenze über der Obergrenze', { werte: { R6_MIN_WINKEL_GRAD: 70 } }, 'Untergrenze muss kleiner als die Obergrenze sein'],
  ])('lehnt ab: %s', (_name, regeln, meldung) => {
    expect(() => serializer.ausJson({ version: 4, objekte, regeln })).toThrow(`Ungültige Bauwerk-Daten: ${meldung}`);
  });
});
