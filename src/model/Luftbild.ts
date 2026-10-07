import { Vec3 } from './Vec3';

/** Längere Bildseite, ab der beim Laden verkleinert wird (Spec E2, D2). */
export const MAX_BILD_SEITE_PX = 4096;
/** Längste erlaubte Data-URL (Spec E2, D4); darüber „Bild zu groß“. */
export const MAX_DATA_URL_ZEICHEN = 12_000_000;
/** Beim Laden gilt vorläufig: Die längere Seite ist so lang (m). */
const VORLAEUFIGE_LAENGE_M = 100;
const DATA_URL = /^data:image\/(png|jpeg);base64,/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Das Luftbild als Boden (Spec E2, D1): ein Bild, das mittig auf dem Ursprung liegt, Norden oben (−z). Unveränderlich.
 * Es ist kein `LagerObjekt`: Es lässt sich nicht auswählen oder verschieben. Das Bild ist immer genordet; es gibt keine Drehung.
 */
export class Luftbild {
  constructor(
    /** Data-URL `data:image/png;base64,…` oder `data:image/jpeg;base64,…`. */
    readonly daten: string,
    readonly breitePx: number,
    readonly hoehePx: number,
    readonly meterProPixel: number,
    /** 0 (unsichtbar) bis 1 (deckend). */
    readonly deckkraft: number = 1,
  ) {
    const kopf = DATA_URL.exec(daten);
    if (!kopf || !BASE64.test(daten.slice(kopf[0].length))) throw new RangeError('Ungültiges Bildformat (nur PNG oder JPEG)');
    if (daten.length > MAX_DATA_URL_ZEICHEN) throw new RangeError('Bild zu groß');
    if (!Number.isInteger(breitePx) || !Number.isInteger(hoehePx) || breitePx <= 0 || hoehePx <= 0) {
      throw new RangeError('Bildgröße muss aus ganzen Pixeln bestehen');
    }
    if (!(meterProPixel > 0) || !Number.isFinite(meterProPixel)) throw new RangeError('Maßstab muss größer als 0 sein');
    if (!(deckkraft >= 0 && deckkraft <= 1)) throw new RangeError('Deckkraft muss zwischen 0 und 100 % liegen');
  }

  /** Ein frisch geladenes Bild: Die längere Seite ist 100 m lang, deckend. */
  static vorlaeufig(daten: string, breitePx: number, hoehePx: number): Luftbild {
    return new Luftbild(daten, breitePx, hoehePx, VORLAEUFIGE_LAENGE_M / Math.max(breitePx, hoehePx), 1);
  }

  /** Zielgröße beim Laden: Ist die längere Seite größer als 4096 px, schrumpft das Bild darauf (Seitenverhältnis bleibt). */
  static zielgroesse(breitePx: number, hoehePx: number): { readonly breitePx: number; readonly hoehePx: number; readonly verkleinert: boolean } {
    const laenger = Math.max(breitePx, hoehePx);
    if (laenger <= MAX_BILD_SEITE_PX) return { breitePx, hoehePx, verkleinert: false };
    const faktor = MAX_BILD_SEITE_PX / laenger;
    return { breitePx: Math.max(1, Math.round(breitePx * faktor)), hoehePx: Math.max(1, Math.round(hoehePx * faktor)), verkleinert: true };
  }

  get breiteM(): number {
    return this.breitePx * this.meterProPixel;
  }

  get hoeheM(): number {
    return this.hoehePx * this.meterProPixel;
  }

  /** Die vier Ecken am Boden: Nordwest, Nordost, Südost, Südwest. */
  ecken(): readonly Vec3[] {
    const x = this.breiteM / 2;
    const z = this.hoeheM / 2;
    return [new Vec3(-x, 0, -z), new Vec3(x, 0, -z), new Vec3(x, 0, z), new Vec3(-x, 0, z)];
  }

  mitMassstab(meterProPixel: number): Luftbild {
    return meterProPixel === this.meterProPixel ? this : new Luftbild(this.daten, this.breitePx, this.hoehePx, meterProPixel, this.deckkraft);
  }

  mitDeckkraft(deckkraft: number): Luftbild {
    return deckkraft === this.deckkraft ? this : new Luftbild(this.daten, this.breitePx, this.hoehePx, this.meterProPixel, deckkraft);
  }
}
