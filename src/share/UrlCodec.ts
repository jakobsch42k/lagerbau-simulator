import LZString from 'lz-string';
import type { Bauwerk } from '../model/Bauwerk';
import { BauwerkSerializer, type Gelesen } from './BauwerkSerializer';
import { MAX_HASH_ZEICHEN, MAX_JSON_ZEICHEN } from './grenzen';

/** Packt ein Bauwerk komprimiert in den URL-Hash (#b=…) und wieder heraus. Ein Luftbild steckt nicht im Link (Spec E2, D4). */
export class UrlCodec {
  static readonly PRAEFIX = '#b=';

  constructor(private readonly serializer = new BauwerkSerializer()) {}

  kodiere(bauwerk: Bauwerk): string {
    return LZString.compressToEncodedURIComponent(JSON.stringify(this.serializer.zuJson(bauwerk, 'link')));
  }

  dekodiere(text: string): Bauwerk {
    return this.dekodiereMitHinweis(text).bauwerk;
  }

  /** Wie `dekodiere`, sagt aber auch, ob der Link ein Luftbild nur angekündigt hat (es steckt nur in der Datei). */
  dekodiereMitHinweis(text: string): Gelesen {
    let daten: unknown;
    try {
      const json = LZString.decompressFromEncodedURIComponent(text);
      if (!json || json.length > MAX_JSON_ZEICHEN) throw new Error('leer oder zu groß');
      daten = JSON.parse(json);
    } catch {
      throw new Error('Link ist beschädigt');
    }
    return this.serializer.liesMitHinweis(daten);
  }

  alsHash(bauwerk: Bauwerk): string {
    return UrlCodec.PRAEFIX + this.kodiere(bauwerk);
  }

  ausHash(hash: string): Bauwerk | null {
    const text = this.nutzlast(hash);
    return text === null ? null : this.dekodiere(text);
  }

  ausHashMitHinweis(hash: string): Gelesen | null {
    const text = this.nutzlast(hash);
    return text === null ? null : this.dekodiereMitHinweis(text);
  }

  /** Der Text hinter `#b=`; null, wenn der Hash kein Bauwerk enthält. Zu lange Hashes sind beschädigt. */
  private nutzlast(hash: string): string | null {
    if (hash.length > MAX_HASH_ZEICHEN) throw new Error('Link ist beschädigt');
    return hash.startsWith(UrlCodec.PRAEFIX) ? hash.slice(UrlCodec.PRAEFIX.length) : null;
  }
}
