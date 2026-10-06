import LZString from 'lz-string';
import { describe, expect, it, vi } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Plane } from '../model/Plane';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Teilen } from '../ui/Teilen';
import { BauwerkSerializer } from './BauwerkSerializer';
import { MAX_HASH_ZEICHEN, MAX_JSON_ZEICHEN, MAX_TEILE, pruefeDateigroesse } from './grenzen';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const codec = new UrlCodec();

const planeJson = { id: 'p', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'eben', neigung: 30, seite: 1 };
const v3 = (planen: readonly object[]) => ({ version: 3, gruppen: [], stangen: [], seile: [], baeume: [], planen });
const seilJson = { art: 'seil', id: 's', start: [0, 2, 0], ende: [2, 0, 0] };

/** Fester Zufall (mulberry32), damit die Größentests immer dieselben Daten haben. */
function zufall(saat: number): () => number {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('BauwerkSerializer', () => {
  it('speichert Gruppen als Parameter und nur freie Stangen einzeln', () => {
    const json = serializer.zuJson(kochstelle());
    expect(json.version).toBe(4);
    expect(json.objekte.map((o) => `${o.art}:${o.id}`)).toEqual(['abock:abock', 'dreibein:dreibein', 'stange:first']);
    expect(json.objekte[1]).toEqual({ art: 'dreibein', id: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: STANDARD_DREIBEIN });
  });

  it('übersteht die Rundreise über JSON-Text unverändert', () => {
    const json = serializer.zuJson(kochstelle());
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
    expect(zurueck.stangen()).toHaveLength(7);
  });

  it.each([
    ['kein Objekt', 'hallo'],
    ['falsche Version', { version: 5, objekte: [] }],
    ['v3 ohne Planen-Liste', { version: 3, gruppen: [], stangen: [], seile: [], baeume: [] }],
    ['Plane mit unbekannter Form', v3([{ ...planeJson, form: 'schief' }])],
    ['Plane mit Seite 0', v3([{ ...planeJson, seite: 0 }])],
    ['Plane ohne Neigung', v3([{ ...planeJson, neigung: undefined }])],
    ['Plane im Boden', v3([{ ...planeJson, start: [0, 0.5, 0], ende: [4, 0.5, 0], neigung: 90 }])],
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
    ['v4 ohne Objektliste', { version: 4, gruppen: [] }],
    ['v4 mit unbekannter Art', { version: 4, objekte: [{ art: 'vierbein', id: 'v' }] }],
    ['v4-Objekt ohne Art', { version: 4, objekte: [{ id: 'x', start: [0, 2, 0], ende: [2, 0, 0] }] }],
    ['v4 mit doppelter id', { version: 4, objekte: [seilJson, seilJson] }],
  ])('lehnt ungültige Daten ab: %s', (_name, daten) => {
    expect(() => serializer.ausJson(daten)).toThrow(/^Ungültige Bauwerk-Daten: /);
  });

  it('übersteht die Rundreise mit Seilen und Bäumen', () => {
    const b = kochstelle()
      .mitBaum(new Baum('baum', new Vec3(6, 0, 0), { durchmesser: 0.4, hoehe: 9 }))
      .mitSeil(new Seil('seil', new Vec3(0, 2, 0), new Vec3(1.5, 0, 0)));
    const json = serializer.zuJson(b);
    expect(json.objekte.filter((o) => o.art === 'seil')).toEqual([{ art: 'seil', id: 'seil', start: [0, 2, 0], ende: [1.5, 0, 0] }]);
    expect(json.objekte.filter((o) => o.art === 'baum')).toEqual([{ art: 'baum', id: 'baum', position: [6, 0, 0], durchmesser: 0.4, hoehe: 9 }]);
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

  it('übersteht die Rundreise mit Planen (Version 4)', () => {
    const plane = new Plane('plane', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, form: 'satteldach' });
    const json = serializer.zuJson(kochstelle().mitPlane(plane));
    expect(json.version).toBe(4);
    expect(json.objekte.filter((o) => o.art === 'plane')).toEqual([
      { art: 'plane', id: 'plane', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'satteldach', neigung: 30, seite: 1 },
    ]);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(serializer.zuJson(zurueck)).toEqual(json);
  });

  it('liest v2-Daten ohne Planen', () => {
    const b = serializer.ausJson({ version: 2, gruppen: [], stangen: [], seile: [], baeume: [] });
    expect(b.planen).toEqual([]);
  });

  it('zählt Planen zu den Teilen', () => {
    const planen = Array.from({ length: MAX_TEILE }, (_, i) => ({ ...planeJson, id: `plane${i}` }));
    expect(serializer.ausJson(v3(planen)).planen).toHaveLength(MAX_TEILE);
    expect(() => serializer.ausJson(v3([...planen, { ...planeJson, id: 'zuviel' }]))).toThrow(/^Ungültige Bauwerk-Daten: /);
  });

  it('schreibt alle Arten in der Reihenfolge des Bauwerks und liest sie in derselben Reihenfolge zurück', () => {
    const b = Bauwerk.von([
      new Seil('seil', new Vec3(0, 2, 0), new Vec3(1.5, 0, 0)),
      ...kochstelle().objekte,
      new Plane('plane', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE),
      new Baum('baum', new Vec3(6, 0, 0), { durchmesser: 0.4, hoehe: 9 }),
    ]);
    const json = serializer.zuJson(b);
    expect(json.objekte.map((o) => o.art)).toEqual(['seil', 'abock', 'dreibein', 'stange', 'plane', 'baum']);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(json)));
    expect(zurueck.objekte.map((o) => o.id)).toEqual(['seil', 'abock', 'dreibein', 'first', 'plane', 'baum']);
    expect(serializer.zuJson(zurueck)).toEqual(json);
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

  it('erlaubt 2000 Teile (Spec v3, D3)', () => {
    expect(MAX_TEILE).toBe(2000);
  });

  it('packt MAX_TEILE Stangen mit Zufallskoordinaten im Zentimeter-Raster in einen Link unter MAX_HASH_ZEICHEN', () => {
    const r = zufall(4);
    const cm = (min: number, max: number): number => Math.round((min + r() * (max - min)) * 100) / 100;
    const hex = (): string => Math.floor(r() * 0x100000000).toString(16).padStart(8, '0');
    const b = Bauwerk.von(
      Array.from(
        { length: MAX_TEILE },
        () => new Stange(`stange-${hex()}`, new Vec3(cm(-20, 20), 0, cm(-20, 20)), new Vec3(cm(-20, 20), cm(1, 4), cm(-20, 20)), 0.08),
      ),
    );
    const hash = codec.alsHash(b);
    expect(hash.length).toBeLessThan(MAX_HASH_ZEICHEN);
    expect(codec.ausHash(hash)?.objekte).toHaveLength(MAX_TEILE);
  });

  it('lädt eine gespeicherte Datei mit MAX_TEILE Planen voller Genauigkeit und lehnt ein Teil mehr ab', async () => {
    const r = zufall(7);
    const planen = Array.from({ length: MAX_TEILE + 1 }, (_, i) => {
      const start = new Vec3(r() * 40 - 20, 2 + r(), r() * 40 - 20);
      const ende = start.add(new Vec3(3 + r(), r() - 0.5, r() - 0.5));
      return new Plane(`plane-${i.toString(16).padStart(8, '0')}`, start, ende, { ...STANDARD_PLANE, form: 'satteldach' });
    });
    // Wie Teilen.speichere: eingerücktes JSON. Planen sind die Art mit den meisten Feldern, also die größte Datei.
    const datei = (n: number): File =>
      new File([JSON.stringify(serializer.zuJson(Bauwerk.von(planen.slice(0, n))), null, 2)], 'lagerbau.json', { type: 'application/json' });
    const voll = datei(MAX_TEILE);
    expect(voll.size).toBeLessThanOrEqual(MAX_JSON_ZEICHEN);
    expect((await new Teilen().lade(voll)).objekte).toHaveLength(MAX_TEILE);
    await expect(new Teilen().lade(datei(MAX_TEILE + 1))).rejects.toThrow(`Ungültige Bauwerk-Daten: mehr als ${MAX_TEILE} Teile`);
  });
});
