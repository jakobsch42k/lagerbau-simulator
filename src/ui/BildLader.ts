import { Luftbild } from '../model/Luftbild';

/** Größer als das lesen wir gar nicht erst ein (Bytes); die fertige Data-URL prüft `Luftbild` noch einmal. */
const MAX_BILDDATEI_BYTES = 50_000_000;
const JPEG_QUALITAET = 0.85;
const PNG_ODER_JPEG = /^data:image\/(png|jpeg);base64,/;

/**
 * Liest eine PNG- oder JPEG-Datei als Luftbild (Spec E2, D2): Ist die längere Seite größer als 4096 px, wird per Canvas auf 4096 px
 * verkleinert und als JPEG (Qualität 0,85) gespeichert, kleinere Bilder bleiben unverändert. Der Maßstab ist vorläufig:
 * die längere Seite 100 m. Wirft RangeError mit deutscher Meldung. Braucht den Browser (FileReader, Image, Canvas).
 */
export class BildLader {
  async lade(datei: File): Promise<Luftbild> {
    if (datei.size > MAX_BILDDATEI_BYTES) throw new RangeError('Bild zu groß');
    const daten = await this.lies(datei);
    if (!PNG_ODER_JPEG.test(daten)) throw new RangeError('Ungültiges Bildformat (nur PNG oder JPEG)');
    const bild = await this.dekodiere(daten);
    const ziel = Luftbild.zielgroesse(bild.naturalWidth, bild.naturalHeight);
    if (!ziel.verkleinert) return Luftbild.vorlaeufig(daten, ziel.breitePx, ziel.hoehePx);
    return Luftbild.vorlaeufig(this.verkleinere(bild, ziel.breitePx, ziel.hoehePx), ziel.breitePx, ziel.hoehePx);
  }

  private lies(datei: File): Promise<string> {
    return new Promise((ok, fehler) => {
      const leser = new FileReader();
      leser.onload = () => ok(String(leser.result));
      leser.onerror = () => fehler(new RangeError('Das Bild konnte nicht gelesen werden'));
      leser.readAsDataURL(datei);
    });
  }

  private dekodiere(daten: string): Promise<HTMLImageElement> {
    return new Promise((ok, fehler) => {
      const bild = new Image();
      bild.onload = () => ok(bild);
      bild.onerror = () => fehler(new RangeError('Das Bild konnte nicht gelesen werden'));
      bild.src = daten;
    });
  }

  private verkleinere(bild: HTMLImageElement, breite: number, hoehe: number): string {
    const leinwand = document.createElement('canvas');
    leinwand.width = breite;
    leinwand.height = hoehe;
    const stift = leinwand.getContext('2d');
    if (!stift) throw new RangeError('Das Bild konnte nicht verkleinert werden');
    // JPEG kennt keine Durchsichtigkeit: Ein PNG mit Alpha würde sonst schwarz.
    stift.fillStyle = '#fff';
    stift.fillRect(0, 0, breite, hoehe);
    stift.drawImage(bild, 0, 0, breite, hoehe);
    return leinwand.toDataURL('image/jpeg', JPEG_QUALITAET);
  }
}
