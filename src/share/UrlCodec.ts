import LZString from 'lz-string';
import type { Bauwerk } from '../model/Bauwerk';
import { BauwerkSerializer } from './BauwerkSerializer';

/** Packt ein Bauwerk komprimiert in den URL-Hash (#b=…) und wieder heraus. */
export class UrlCodec {
  static readonly PRAEFIX = '#b=';

  constructor(private readonly serializer = new BauwerkSerializer()) {}

  kodiere(bauwerk: Bauwerk): string {
    return LZString.compressToEncodedURIComponent(JSON.stringify(this.serializer.zuJson(bauwerk)));
  }

  dekodiere(text: string): Bauwerk {
    let daten: unknown;
    try {
      const json = LZString.decompressFromEncodedURIComponent(text);
      if (!json) throw new Error('leer');
      daten = JSON.parse(json);
    } catch {
      throw new Error('Link ist beschädigt');
    }
    return this.serializer.ausJson(daten);
  }

  alsHash(bauwerk: Bauwerk): string {
    return UrlCodec.PRAEFIX + this.kodiere(bauwerk);
  }

  ausHash(hash: string): Bauwerk | null {
    return hash.startsWith(UrlCodec.PRAEFIX) ? this.dekodiere(hash.slice(UrlCodec.PRAEFIX.length)) : null;
  }
}
