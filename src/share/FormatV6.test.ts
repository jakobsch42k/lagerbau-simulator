import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Beschriftung } from '../model/Beschriftung';
import { Linie } from '../model/Linie';
import { STANDARD_LINIE, STANDARD_ZONE } from '../model/params';
import { Zone } from '../model/Zone';
import { Platzobjekt } from '../model/Platzobjekt';
import { Vec3 } from '../model/Vec3';
import { BauwerkSerializer } from './BauwerkSerializer';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const feuer = new Platzobjekt('f', new Vec3(3, 0, -2), { vorlage: 'feuerstelle', name: 'Feuerstelle', form: 'kreis', breite: 1.5, laenge: 1.5, hoehe: 0, farbe: '#e8590c' }, 0.25);
const schild = new Beschriftung('t', new Vec3(1, 0, 1), { text: 'Küche', groesse: 2, farbe: '#112233' });
const bauwerk = kochstelle().mit(feuer).mit(schild);

describe('Datenformat v6 (Spec E3, D3)', () => {
  it('schreibt Version 6 mit den neuen Arten in `objekte`, in der Reihenfolge des Bauwerks', () => {
    const json = serializer.zuJson(bauwerk);
    expect(json.version).toBe(6);
    expect(json.objekte.slice(-2).map((o) => o.art)).toEqual(['platzobjekt', 'beschriftung']);
  });

  it('Rundlauf über JSON-Text bewahrt beide Arten samt Drehung', () => {
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(serializer.zuJson(bauwerk))));
    expect(zurueck.objekte.map((o) => o.id)).toEqual(bauwerk.objekte.map((o) => o.id));
    const f = zurueck.objekt('f') as Platzobjekt;
    expect(f.params).toEqual(feuer.params);
    expect(f.drehungRad).toBe(0.25);
    expect((zurueck.objekt('t') as Beschriftung).params).toEqual(schild.params);
    expect(serializer.zuJson(zurueck)).toEqual(serializer.zuJson(bauwerk));
  });

  it('Rundlauf über den Link (v6, ohne Bild)', () => {
    const codec = new UrlCodec();
    const zurueck = codec.dekodiere(codec.kodiere(bauwerk));
    expect(zurueck.objekte).toHaveLength(bauwerk.objekte.length);
    expect((zurueck.objekt('f') as Platzobjekt).params.name).toBe('Feuerstelle');
  });

  it('liest weiter v4 und v5 (ohne und mit Luftbild-Feld) und v1', () => {
    const objekte = serializer.zuJson(kochstelle()).objekte;
    expect(serializer.ausJson({ version: 4, objekte }).objekte).toHaveLength(objekte.length);
    expect(serializer.ausJson({ version: 5, objekte }).objekte).toHaveLength(objekte.length);
    expect(serializer.liesMitHinweis({ version: 5, objekte, luftbild: { entfernt: true } }).luftbildEntfernt).toBe(true);
    expect(serializer.liesMitHinweis({ version: 6, objekte, luftbild: { entfernt: true } }).luftbildEntfernt).toBe(true);
    expect(serializer.ausJson({ version: 1, gruppen: [], stangen: [] }).istLeer).toBe(true);
  });

  it('lehnt Platz-Objekte in älteren Versionen nicht stillschweigend um, aber ungültige Felder mit Meldung ab', () => {
    const json = serializer.zuJson(Bauwerk.leer().mit(feuer));
    const kaputt = { ...json, objekte: [{ ...json.objekte[0], breite: 0 }] };
    expect(() => serializer.ausJson(kaputt)).toThrow('Ungültige Bauwerk-Daten: Durchmesser muss größer als 0 sein');
    expect(() => serializer.ausJson({ ...json, version: 7 })).toThrow('unbekannte Version');
  });
});

describe('Datenformat v6: Zonen und Linien (Spec E3, D1, D3)', () => {
  const zone = new Zone('z', [new Vec3(0, 0, 0), new Vec3(10, 0, 0), new Vec3(10, 0, 6), new Vec3(0, 0, 6)], { name: 'Küche', farbe: '#112233', deckkraft: 65 });
  const weg = new Linie('w', [new Vec3(0, 0, 0), new Vec3(5, 0, 0), new Vec3(5, 0, 5)], { ...STANDARD_LINIE, name: 'Zufahrt', breite: 2.5 });
  const zaun = new Linie('f', [new Vec3(1, 0, 1), new Vec3(9, 0, 1)], { name: 'Zaun Nord', typ: 'zaun', breite: 1, farbe: '#7f5539' });
  const grenze = new Linie('g', [new Vec3(2, 0, 2), new Vec3(3, 0, 8)], { ...STANDARD_LINIE, typ: 'grenze', name: 'Grenze' });
  const mit = kochstelle().mit(zone).mit(weg).mit(zaun).mit(grenze);

  it('schreibt beide Arten in `objekte` und liest sie über JSON-Text zurück, auch im Link', () => {
    const json = serializer.zuJson(mit);
    expect(json.version).toBe(6);
    expect(json.objekte.slice(-4).map((o) => o.art)).toEqual(['zone', 'linie', 'linie', 'linie']);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
    expect((zurueck.objekt('z') as Zone).params).toEqual(zone.params);
    expect((zurueck.objekt('w') as Linie).punkte).toHaveLength(3);
    const codec = new UrlCodec();
    const link = codec.dekodiere(codec.kodiere(mit));
    expect(serializer.zuJson(link)).toEqual(json);
    expect((link.objekt('f') as Linie).params.typ).toBe('zaun');
  });

  it('Standardwerte der Zeichen-Werkzeuge überstehen den Rundlauf (Deckkraft 40, Weg 1 m)', () => {
    const b = Bauwerk.leer().mit(new Zone('z', [new Vec3(0, 0, 0), new Vec3(2, 0, 0), new Vec3(0, 0, 2)], STANDARD_ZONE));
    expect((serializer.ausJson(serializer.zuJson(b)).objekt('z') as Zone).params.deckkraft).toBe(40);
  });

  it('lehnt ungültige Zonen und Linien beim Lesen mit der Meldung des Modells ab', () => {
    const json = serializer.zuJson(Bauwerk.leer().mit(zone).mit(weg));
    const [z, l] = json.objekte;
    expect(() => serializer.ausJson({ ...json, objekte: [{ ...z, punkte: [[0, 0, 0], [1, 0, 0]] }] })).toThrow('Ungültige Bauwerk-Daten: Eine Zone braucht mindestens 3 Ecken.');
    expect(() => serializer.ausJson({ ...json, objekte: [{ ...z, punkte: [[0, 0, 0], [4, 0, 4], [4, 0, 0], [0, 0, 4]] }] })).toThrow('nicht selbst schneiden');
    expect(() => serializer.ausJson({ ...json, objekte: [{ ...l, punkte: [[0, 0, 0]] }] })).toThrow('Eine Linie braucht mindestens 2 Punkte.');
    expect(() => serializer.ausJson({ ...json, objekte: [{ ...l, typ: 'mauer' }] })).toThrow('Typ muss Weg, Zaun oder Grenze sein');
  });

  it('ältere Dateien (v4, v5) ohne Zonen und Linien lesen weiter', () => {
    const objekte = serializer.zuJson(kochstelle()).objekte;
    expect(serializer.ausJson({ version: 5, objekte }).objekte).toHaveLength(objekte.length);
  });
});
