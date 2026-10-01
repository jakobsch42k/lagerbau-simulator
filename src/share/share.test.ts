import LZString from 'lz-string';
import { describe, expect, it, vi } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { BauwerkSerializer } from './BauwerkSerializer';
import { MAX_HASH_ZEICHEN, MAX_JSON_ZEICHEN, MAX_TEILE, pruefeDateigroesse } from './grenzen';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const codec = new UrlCodec();

describe('BauwerkSerializer', () => {
  it('speichert Gruppen als Parameter und nur freie Stangen einzeln', () => {
    const json = serializer.zuJson(kochstelle());
    expect(json.version).toBe(2);
    expect(json.gruppen.map((g) => g.typ)).toEqual(['abock', 'dreibein']);
    expect(json.stangen.map((s) => s.id)).toEqual(['first']);
  });

  it('übersteht die Rundreise über JSON-Text unverändert', () => {
    const json = serializer.zuJson(kochstelle());
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
    expect(zurueck.stangen()).toHaveLength(7);
  });

  it.each([
    ['kein Objekt', 'hallo'],
    ['falsche Version', { version: 3, gruppen: [], stangen: [], seile: [], baeume: [] }],
    ['v2 ohne Seil-Liste', { version: 2, gruppen: [], stangen: [], baeume: [] }],
    ['zu kurzes Seil', { version: 2, gruppen: [], stangen: [], seile: [{ id: 's', start: [0, 0, 0], ende: [0.1, 0, 0] }], baeume: [] }],
    ['Baum ohne Höhe', { version: 2, gruppen: [], stangen: [], seile: [], baeume: [{ id: 'b', position: [0, 0, 0], durchmesser: 0.3, hoehe: 0 }] }],
    ['gruppen keine Liste', { version: 1, gruppen: 'x', stangen: [] }],
    ['unbekannter Typ', { version: 1, gruppen: [{ id: 'g', typ: 'vierbein', position: [0, 0, 0], drehung: 0, params: {} }], stangen: [] }],
    ['Zahl fehlt', { version: 1, gruppen: [{ id: 'g', typ: 'dreibein', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4 } }], stangen: [] }],
    ['unmögliche Maße', { version: 1, gruppen: [{ id: 'g', typ: 'dreibein', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 5, durchmesser: 0.08 } }], stangen: [] }],
    ['überlaufende Stangenlänge', { version: 1, gruppen: [{ id: 'g', typ: 'dreibein', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 1e200, fusskreisradius: 0.7, durchmesser: 0.08 } }], stangen: [] }],
    ['Vektor zu kurz', { version: 1, gruppen: [], stangen: [{ id: 's', start: [0, 0], ende: [0, 2, 0], durchmesser: 0.08 }] }],
    ['leere ID', { version: 1, gruppen: [], stangen: [{ id: '', start: [0, 0, 0], ende: [0, 2, 0], durchmesser: 0.08 }] }],
  ])('lehnt ungültige Daten ab: %s', (_name, daten) => {
    expect(() => serializer.ausJson(daten)).toThrow(/^Ungültige Bauwerk-Daten: /);
  });

  it('übersteht die Rundreise mit Seilen und Bäumen', () => {
    const b = kochstelle()
      .mitBaum(new Baum('baum', new Vec3(6, 0, 0), { durchmesser: 0.4, hoehe: 9 }))
      .mitSeil(new Seil('seil', new Vec3(0, 2, 0), new Vec3(1.5, 0, 0)));
    const json = serializer.zuJson(b);
    expect(json.seile).toEqual([{ id: 'seil', start: [0, 2, 0], ende: [1.5, 0, 0] }]);
    expect(json.baeume).toEqual([{ id: 'baum', position: [6, 0, 0], durchmesser: 0.4, hoehe: 9 }]);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });

  it('liest alte v1-Daten ohne Seile und Bäume', () => {
    const v1 = { version: 1, gruppen: [], stangen: [{ id: 's', start: [0, 0, 0], ende: [0, 2, 0], durchmesser: 0.08 }] };
    const b = serializer.ausJson(v1);
    expect(b.freieStangen).toHaveLength(1);
    expect(b.seile).toEqual([]);
    expect(b.baeume).toEqual([]);
  });
});

describe('UrlCodec', () => {
  it('übersteht die Rundreise über den Link-Hash', () => {
    const hash = codec.alsHash(kochstelle());
    expect(hash.startsWith('#b=')).toBe(true);
    const zurueck = codec.ausHash(hash);
    expect(zurueck && serializer.zuJson(zurueck)).toEqual(serializer.zuJson(kochstelle()));
  });

  it('liefert null, wenn der Link kein Bauwerk enthält', () => {
    expect(codec.ausHash('')).toBeNull();
    expect(codec.ausHash('#irgendwas')).toBeNull();
  });

  it('meldet einen beschädigten Link', () => {
    expect(() => codec.ausHash('#b=%%%kaputt')).toThrow(/Link ist beschädigt|Ungültige Bauwerk-Daten/);
    expect(() => codec.dekodiere('')).toThrow('Link ist beschädigt');
  });
});

describe('Größengrenzen', () => {
  const stangen = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `s${i}`, start: [i, 0, 0], ende: [i, 2, 0], durchmesser: 0.08 }));

  it('lehnt einen zu langen Hash ab, ohne ihn zu entpacken', () => {
    const c = new UrlCodec();
    // Gemockt: Ohne Grenze würde sonst wirklich entpackt, und lz-string kann Müll auf ein Vielfaches aufblähen.
    const entpacke = vi.spyOn(c, 'dekodiere').mockReturnValue(Bauwerk.leer());
    expect(() => c.ausHash(UrlCodec.PRAEFIX + 'A'.repeat(MAX_HASH_ZEICHEN))).toThrow('Link ist beschädigt');
    expect(entpacke).not.toHaveBeenCalled();
  });

  it('entpackt einen Hash, der genau an der Grenze liegt', () => {
    const c = new UrlCodec();
    const entpacke = vi.spyOn(c, 'dekodiere').mockReturnValue(Bauwerk.leer());
    c.ausHash(UrlCodec.PRAEFIX + 'A'.repeat(MAX_HASH_ZEICHEN - UrlCodec.PRAEFIX.length));
    expect(entpacke).toHaveBeenCalledOnce();
  });

  it('lehnt zu große entpackte Daten als beschädigten Link ab', () => {
    const json = JSON.stringify({ version: 1, gruppen: [], stangen: [], fuell: 'x'.repeat(MAX_JSON_ZEICHEN) });
    const text = LZString.compressToEncodedURIComponent(json);
    expect(text.length).toBeLessThan(MAX_HASH_ZEICHEN);
    expect(() => codec.dekodiere(text)).toThrow('Link ist beschädigt');
  });

  it('nimmt genau MAX_TEILE Teile an und lehnt einen mehr ab', () => {
    expect(serializer.ausJson({ version: 1, gruppen: [], stangen: stangen(MAX_TEILE) }).freieStangen).toHaveLength(MAX_TEILE);
    expect(() => serializer.ausJson({ version: 1, gruppen: [], stangen: stangen(MAX_TEILE + 1) })).toThrow(/^Ungültige Bauwerk-Daten: /);
  });

  it('zählt Gruppen und Stangen zusammen', () => {
    const gruppe = { id: 'g', typ: 'dreibein', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } };
    expect(() => serializer.ausJson({ version: 1, gruppen: [gruppe], stangen: stangen(MAX_TEILE) })).toThrow(/^Ungültige Bauwerk-Daten: /);
  });

  it('lehnt zu große Dateien vor dem Einlesen ab', () => {
    expect(() => pruefeDateigroesse(MAX_JSON_ZEICHEN)).not.toThrow();
    expect(() => pruefeDateigroesse(MAX_JSON_ZEICHEN + 1)).toThrow('Die Datei ist kein gültiges JSON');
  });

  it('zählt Seile und Bäume zu den Teilen', () => {
    const seile = Array.from({ length: MAX_TEILE }, (_, i) => ({ id: `seil${i}`, start: [i, 2, 0], ende: [i, 0, 1] }));
    const baum = { id: 'baum', position: [0, 0, 50], durchmesser: 0.3, hoehe: 8 };
    expect(serializer.ausJson({ version: 2, gruppen: [], stangen: [], seile, baeume: [] }).seile).toHaveLength(MAX_TEILE);
    expect(() => serializer.ausJson({ version: 2, gruppen: [], stangen: [], seile, baeume: [baum] })).toThrow(/^Ungültige Bauwerk-Daten: /);
  });
});
