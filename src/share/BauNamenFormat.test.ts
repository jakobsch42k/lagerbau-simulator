import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from '../model/ABock';
import { Bau } from '../model/Bau';
import { Bauwerk } from '../model/Bauwerk';
import { STANDARD_ABOCK } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { BauwerkSerializer } from './BauwerkSerializer';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const benannt = (): Bauwerk => kochstelle().mitBauName(Bau.von(kochstelle(), 'abock'), 'Küche');
const objekte = serializer.zuJson(kochstelle()).objekte;

describe('bauNamen im Datenformat v7 (Spec E5, D6)', () => {
  it('schreibt sie als Objekt-id → Name, bleibt bei Version 7 und liest sie zurück', () => {
    const json = serializer.zuJson(benannt());
    expect(json.version).toBe(7);
    expect(json.bauNamen).toEqual({ abock: 'Küche' });
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect([...zurueck.bauNamen]).toEqual([['abock', 'Küche']]);
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });

  it('lässt das Feld weg, solange kein Bau einen Namen hat', () => {
    expect('bauNamen' in serializer.zuJson(kochstelle())).toBe(false);
  });

  it('lässt Einträge zu nicht mehr vorhandenen ids beim Schreiben weg', () => {
    const b = Bauwerk.von(kochstelle().objekte, undefined, null, new Map([['abock', 'Küche'], ['weg', 'Geist']]));
    expect(serializer.zuJson(b).bauNamen).toEqual({ abock: 'Küche' });
    expect('bauNamen' in serializer.zuJson(Bauwerk.von(kochstelle().objekte, undefined, null, new Map([['weg', 'Geist']])))).toBe(false);
  });

  it('die Namen reisen mit dem Link', () => {
    const codec = new UrlCodec();
    const zurueck = codec.ausHash(codec.alsHash(benannt()));
    expect(zurueck?.bauNamen.get('abock')).toBe('Küche');
  });

  it('eine Datei ohne bauNamen lädt unverändert (v7 und v4)', () => {
    for (const version of [4, 7]) {
      const b = serializer.ausJson({ version, objekte });
      expect(b.bauNamen.size).toBe(0);
      expect(b.objekte.map((o) => o.id)).toEqual(kochstelle().objekte.map((o) => o.id));
    }
  });

  it('Version 1–3 und ein Feld bauNamen dort: ignoriert', () => {
    const v3 = { version: 3, gruppen: [], stangen: [], seile: [], baeume: [], planen: [], bauNamen: { x: 'Name' } };
    expect(serializer.ausJson(v3).bauNamen.size).toBe(0);
  });

  it('Einträge zu unbekannten ids werden beim Lesen übergangen', () => {
    const b = serializer.ausJson({ version: 7, objekte, bauNamen: { abock: 'Küche', geist: 'Weg' } });
    expect([...b.bauNamen]).toEqual([['abock', 'Küche']]);
  });

  it('trimmt Namen beim Lesen', () => {
    expect(serializer.ausJson({ version: 7, objekte, bauNamen: { abock: '  Küche ' } }).bauNamen.get('abock')).toBe('Küche');
  });

  it('übergeht unbekannte Felder, statt abzulehnen (ein neueres Feld macht keine v8 nötig)', () => {
    expect(() => serializer.ausJson({ version: 7, objekte, irgendwasNeues: 1 })).not.toThrow();
  });

  it('bewahrt Namen mehrerer Bauten in der Reihenfolge des Bauwerks', () => {
    const b = kochstelle().mitGruppe(new ABock('abock2', new Vec3(20, 0, 0), 0, STANDARD_ABOCK));
    const zwei = b.mitBauName(Bau.alle(b)[1] as Bau, 'Lager').mitBauName(Bau.alle(b)[0] as Bau, 'Küche');
    expect(Object.keys(serializer.zuJson(zwei).bauNamen ?? {})).toEqual(['abock', 'abock2']);
  });

  it.each<[string, unknown, string]>([
    ['kein Objekt', 'x', 'bauNamen ist kein Objekt'],
    ['Name kein Text', { abock: 3 }, 'bauNamen.abock ist kein Text'],
    ['leerer Name', { abock: '  ' }, 'bauNamen.abock: Name muss 1 bis 40 Zeichen lang sein.'],
    ['zu langer Name', { abock: 'x'.repeat(41) }, 'bauNamen.abock: Name muss 1 bis 40 Zeichen lang sein.'],
  ])('lehnt ab: %s', (_name, bauNamen, meldung) => {
    expect(() => serializer.ausJson({ version: 7, objekte, bauNamen })).toThrow(`Ungültige Bauwerk-Daten: ${meldung}`);
  });
});
