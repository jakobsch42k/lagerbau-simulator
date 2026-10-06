import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Beschriftung } from '../model/Beschriftung';
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
