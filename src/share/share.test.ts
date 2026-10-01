import LZString from 'lz-string';
import { describe, expect, it, vi } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { BauwerkSerializer } from './BauwerkSerializer';
import { MAX_HASH_ZEICHEN, MAX_JSON_ZEICHEN, MAX_TEILE, pruefeDateigroesse } from './grenzen';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const codec = new UrlCodec();

describe('BauwerkSerializer', () => {
  it('speichert Gruppen als Parameter und nur freie Stangen einzeln', () => {
    const json = serializer.zuJson(kochstelle());
    expect(json.version).toBe(1);
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
    ['falsche Version', { version: 2, gruppen: [], stangen: [] }],
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
});
