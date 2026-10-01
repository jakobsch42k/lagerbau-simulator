import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { BauwerkSerializer } from './BauwerkSerializer';
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
