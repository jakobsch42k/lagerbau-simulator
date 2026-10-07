import { describe, expect, it } from 'vitest';
import { findeZeltVorlage, paramsAusZeltVorlage, ZELT_VORLAGEN } from '../arten/zelt/vorlagen';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';
import { Zelt } from '../model/Zelt';
import { BauwerkSerializer } from './BauwerkSerializer';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const zelte = ZELT_VORLAGEN.map((v, i) => new Zelt(`z${i}`, new Vec3(i * 10, 0, 0 - i), paramsAusZeltVorlage(v), 0.25 * i));
const bauwerk = zelte.reduce<Bauwerk>((b, z) => b.mit(z), kochstelle());
const ersteZeile = (b: Bauwerk): Record<string, unknown> => serializer.zuJson(b).objekte.at(-1) as Record<string, unknown>;

describe('Datenformat v7 (Spec E4, D6)', () => {
  it('schreibt Version 7 und alle Felder des Zelts', () => {
    const json = serializer.zuJson(Bauwerk.leer().mit(zelte[1] as Zelt));
    expect(json.version).toBe(7);
    expect(json.objekte[0]).toEqual({
      art: 'zelt',
      id: 'z1',
      vorlage: 'jurte6',
      name: 'Jurte 6er',
      aufbau: 'rund',
      position: [10, 0, -1],
      drehungRad: 0.25,
      durchmesser: 6.07,
      ecken: 12,
      laenge: 6.07,
      breite: 6.07,
      wandhoehe: 1.65,
      firsthoehe: 2.62,
      waende: [true, true, true],
      abspannungen: 12,
      seillaenge: 3,
      haringAbstand: 2,
      farbe: '#4a4a4a',
    });
  });

  it('Rundlauf über JSON-Text für alle Vorlagen, auch mit ausgeschalteter Wand', () => {
    const mitWand = bauwerk.ersetze((zelte[1] as Zelt).mitParams({ ...(zelte[1] as Zelt).params, waende: [true, false, true] }));
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(serializer.zuJson(mitWand))));
    for (const z of zelte) {
      const g = zurueck.objekt(z.id) as Zelt;
      expect(g.position.equals(z.position)).toBe(true);
      expect(g.drehungRad).toBe(z.drehungRad);
      expect(g.params).toEqual(z.id === 'z1' ? { ...z.params, waende: [true, false, true] } : z.params);
    }
    expect(serializer.zuJson(zurueck)).toEqual(serializer.zuJson(mitWand));
  });

  it('Rundlauf über den Link', () => {
    const codec = new UrlCodec();
    const zurueck = codec.dekodiere(codec.kodiere(bauwerk));
    expect(serializer.zuJson(zurueck)).toEqual(serializer.zuJson(bauwerk));
  });

  it('liest v1 bis v6 weiter', () => {
    const v6 = { ...serializer.zuJson(kochstelle()), version: 6 };
    expect(serializer.ausJson(v6).objekte).toHaveLength(kochstelle().objekte.length);
    const v4 = { ...serializer.zuJson(kochstelle()), version: 4 };
    expect(serializer.ausJson(v4).objekte).toHaveLength(kochstelle().objekte.length);
  });

  it('lehnt unbekannte Form, fehlende Felder und falsche Werte mit „Ungültige Bauwerk-Daten“ ab', () => {
    const json = serializer.zuJson(Bauwerk.leer().mit(zelte[0] as Zelt));
    const z = ersteZeile(Bauwerk.leer().mit(zelte[0] as Zelt));
    const mit = (a: Record<string, unknown>) => ({ ...json, objekte: [{ ...z, ...a }] });
    expect(() => serializer.ausJson(mit({ aufbau: 'kugel' }))).toThrow('Ungültige Bauwerk-Daten: Ungültige Form.');
    expect(() => serializer.ausJson(mit({ ecken: 30 }))).toThrow('Ungültige Bauwerk-Daten: Ecken: ganze Zahl von 6 bis 24.');
    expect(() => serializer.ausJson(mit({ farbe: 'rot' }))).toThrow('Ungültige Bauwerk-Daten: Ungültige Farbe.');
    expect(() => serializer.ausJson(mit({ waende: [true, 'ja', true] }))).toThrow('Ungültige Bauwerk-Daten');
    expect(() => serializer.ausJson(mit({ waende: [true, true] }))).toThrow('Ungültige Bauwerk-Daten');
    for (const feld of Object.keys(z).filter((k) => k !== 'art')) {
      const ohne = { ...z } as Record<string, unknown>;
      delete ohne[feld];
      expect(() => serializer.ausJson({ ...json, objekte: [ohne] }), feld).toThrow('Ungültige Bauwerk-Daten');
    }
  });

  it('unbekannte Version 8 bleibt abgelehnt', () => {
    expect(() => serializer.ausJson({ ...serializer.zuJson(kochstelle()), version: 8 })).toThrow('unbekannte Version');
  });

  it('die Vorlage hanger ist auffindbar (Gegenprobe der Testdaten)', () => {
    expect(findeZeltVorlage('hanger')).toBeDefined();
  });
});
