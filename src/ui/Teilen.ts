import type { Bauwerk } from '../model/Bauwerk';
import { BauwerkSerializer } from '../share/BauwerkSerializer';
import { pruefeDateigroesse } from '../share/grenzen';
import { LinkBasis } from '../share/LinkBasis';
import { UrlCodec } from '../share/UrlCodec';

/** Link kopieren, als Datei speichern und laden. */
export class Teilen {
  constructor(
    private readonly codec = new UrlCodec(),
    private readonly serializer = new BauwerkSerializer(),
  ) {}

  link(bauwerk: Bauwerk): string {
    return `${LinkBasis.aus(location)}${this.codec.alsHash(bauwerk)}`;
  }

  /** Nur der Hash-Teil (#b=…). Er passt in jede Adresse, auch in die des Windows-Programms. */
  hash(bauwerk: Bauwerk): string {
    return this.codec.alsHash(bauwerk);
  }

  async kopiereLink(bauwerk: Bauwerk): Promise<void> {
    await navigator.clipboard.writeText(this.link(bauwerk));
  }

  speichere(bauwerk: Bauwerk): void {
    const blob = new Blob([JSON.stringify(this.serializer.zuJson(bauwerk), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lagerbau.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async lade(datei: File): Promise<Bauwerk> {
    pruefeDateigroesse(datei.size);
    let daten: unknown;
    try {
      daten = JSON.parse(await datei.text());
    } catch {
      throw new Error('Die Datei ist kein gültiges JSON');
    }
    return this.serializer.ausJson(daten);
  }

  /** Bauwerk aus dem aktuellen Adress-Hash, null wenn keiner da ist. Wirft bei kaputtem Link. */
  ausAdresse(): Bauwerk | null {
    return this.codec.ausHash(location.hash);
  }
}
