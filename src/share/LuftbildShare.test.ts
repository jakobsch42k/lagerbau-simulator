import LZString from 'lz-string';
import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { Bauwerk } from '../model/Bauwerk';
import { Luftbild, MAX_DATA_URL_ZEICHEN } from '../model/Luftbild';
import { Teilen } from '../ui/Teilen';
import { BauwerkSerializer } from './BauwerkSerializer';
import { MAX_DATEI_ZEICHEN, MAX_HASH_ZEICHEN } from './grenzen';
import { UrlCodec } from './UrlCodec';

const serializer = new BauwerkSerializer();
const codec = new UrlCodec();
const KOPF = 'data:image/png;base64,';
/** Zufälliges Base64 (nicht komprimierbar wie ein echtes Bild), damit die Link-Größe etwas aussagt. */
const rauschen = (n: number): string => {
  const z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let a = 12345;
  let s = '';
  for (let i = 0; i < n; i++) {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    s += z[a >>> 26];
  }
  return s;
};
const bild = (n = 2000): Luftbild => new Luftbild(KOPF + rauschen(n), 640, 480, 0.12, 0.6);

describe('Datenformat v5 mit Luftbild (Spec E2, D4)', () => {
  it('schreibt Version 5 und das Bild samt Maßstab und Deckkraft in die Datei', () => {
    const l = bild();
    const json = serializer.zuJson(Bauwerk.leer().mitLuftbild(l));
    expect(json.version).toBe(7);
    expect(json.luftbild).toEqual({ daten: l.daten, breitePx: 640, hoehePx: 480, meterProPixel: 0.12, deckkraft: 0.6 });
  });

  it('übersteht die Rundreise über JSON-Text mit Bild', () => {
    const l = bild();
    const b = kochstelle().mitLuftbild(l);
    const zurueck = serializer.ausJson(JSON.parse(JSON.stringify(serializer.zuJson(b))));
    expect(zurueck.luftbild).toEqual(l);
    expect(zurueck.objekte).toEqual(b.objekte);
  });

  it('übersteht die Rundreise ohne Bild: kein luftbild-Feld, kein Bild danach', () => {
    const json = serializer.zuJson(kochstelle());
    expect(json.version).toBe(7);
    expect('luftbild' in json).toBe(false);
    expect(serializer.ausJson(JSON.parse(JSON.stringify(json))).luftbild).toBeNull();
  });

  it('liest v1–v4 weiter, ohne Luftbild', () => {
    expect(serializer.ausJson({ version: 4, objekte: [] }).luftbild).toBeNull();
    expect(serializer.ausJson({ version: 3, gruppen: [], stangen: [], seile: [], baeume: [], planen: [] }).luftbild).toBeNull();
    expect(serializer.ausJson({ version: 1, gruppen: [], stangen: [] }).luftbild).toBeNull();
  });

  it('ein Luftbild-Feld in v4 wird ignoriert (es gehört erst zu v5)', () => {
    const l = bild();
    expect(serializer.ausJson({ version: 4, objekte: [], luftbild: serializer.zuJson(Bauwerk.leer().mitLuftbild(l)).luftbild }).luftbild).toBeNull();
  });

  it('lehnt kaputte Luftbild-Daten mit deutscher Meldung ab', () => {
    const gut = serializer.zuJson(Bauwerk.leer().mitLuftbild(bild())).luftbild as object;
    const fehler = (luftbild: unknown): string => {
      try {
        serializer.ausJson({ version: 5, objekte: [], luftbild });
      } catch (e) {
        return (e as Error).message;
      }
      return '';
    };
    expect(fehler({ ...gut, daten: 'data:image/gif;base64,AAAA' })).toBe('Ungültige Bauwerk-Daten: Ungültiges Bildformat (nur PNG oder JPEG)');
    expect(fehler({ ...gut, meterProPixel: 0 })).toBe('Ungültige Bauwerk-Daten: Maßstab muss größer als 0 sein');
    expect(fehler({ ...gut, deckkraft: 3 })).toBe('Ungültige Bauwerk-Daten: Deckkraft muss zwischen 0 und 100 % liegen');
    expect(fehler({ ...gut, breitePx: 'x' })).toContain('breitePx');
    expect(fehler({ ...gut, daten: undefined })).toContain('luftbild.daten');
    expect(fehler('bild')).toContain('luftbild ist kein Objekt');
  });

  it('„Bild zu groß“ bei einer Data-URL über 12 000 000 Zeichen', () => {
    const gut = serializer.zuJson(Bauwerk.leer().mitLuftbild(bild())).luftbild as object;
    const zuLang = { ...gut, daten: KOPF + 'A'.repeat(MAX_DATA_URL_ZEICHEN) };
    expect(() => serializer.ausJson({ version: 5, objekte: [], luftbild: zuLang })).toThrow('Ungültige Bauwerk-Daten: Bild zu groß');
  });
});

describe('Teilen-Link und Datei mit Luftbild (Spec E2, D4)', () => {
  it('der Link lässt das Bild weg und schreibt { entfernt: true }', () => {
    const json = serializer.zuJson(kochstelle().mitLuftbild(bild()), 'link');
    expect(json.luftbild).toEqual({ entfernt: true });
    const hash = codec.alsHash(kochstelle().mitLuftbild(bild(100_000)));
    expect(hash.length).toBeLessThan(MAX_HASH_ZEICHEN);
    const text = LZString.decompressFromEncodedURIComponent(hash.slice(UrlCodec.PRAEFIX.length));
    expect(text).not.toContain('base64');
    expect(JSON.parse(text).luftbild).toEqual({ entfernt: true });
  });

  it('wer den Link öffnet, sieht den Plan ohne Bild und bekommt den Hinweis', () => {
    const b = kochstelle().mitLuftbild(bild());
    const gelesen = codec.ausHashMitHinweis(codec.alsHash(b));
    expect(gelesen?.luftbildEntfernt).toBe(true);
    expect(gelesen?.bauwerk.luftbild).toBeNull();
    expect(gelesen?.bauwerk.objekte).toEqual(b.objekte);
    expect(codec.ausHash(codec.alsHash(b))?.luftbild).toBeNull();
  });

  it('ein Link ohne Bild gibt keinen Hinweis; ein fremder Hash gibt null', () => {
    expect(codec.ausHashMitHinweis(codec.alsHash(kochstelle()))?.luftbildEntfernt).toBe(false);
    expect(codec.ausHashMitHinweis('#x=1')).toBeNull();
    expect(codec.ausHash('')).toBeNull();
    expect(() => codec.ausHashMitHinweis(`#b=${'A'.repeat(MAX_HASH_ZEICHEN)}`)).toThrow('Link ist beschädigt');
  });

  it('die Datei enthält das Bild und lädt es unverändert zurück', async () => {
    const b = kochstelle().mitLuftbild(bild(50_000));
    const datei = new File([JSON.stringify(serializer.zuJson(b), null, 2)], 'lagerbau.json', { type: 'application/json' });
    const geladen = await new Teilen().lade(datei);
    expect(geladen.luftbild).toEqual(b.luftbild);
  });

  it('eine Datei bis MAX_DATEI_ZEICHEN wird gelesen, eine größere vor dem Einlesen abgelehnt', async () => {
    const grenze = { size: MAX_DATEI_ZEICHEN, text: async () => '{}' } as unknown as File;
    await expect(new Teilen().lade(grenze)).rejects.toThrow('Ungültige Bauwerk-Daten');
    const zuGross = { size: MAX_DATEI_ZEICHEN + 1, text: async () => '{}' } as unknown as File;
    await expect(new Teilen().lade(zuGross)).rejects.toThrow('Die Datei ist kein gültiges JSON');
  });

  it('eine Datei mit dem größten erlaubten Bild passt unter die Dateigrenze', () => {
    const grenze = new Luftbild(KOPF + 'A'.repeat(MAX_DATA_URL_ZEICHEN - KOPF.length), 4096, 2048, 0.1, 1);
    const text = JSON.stringify(serializer.zuJson(Bauwerk.leer().mitLuftbild(grenze)), null, 2);
    expect(text.length).toBeLessThan(MAX_DATEI_ZEICHEN);
  });
});
