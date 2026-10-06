import { pruefePunktabstand } from '../model/Massstab';
import { Vec3 } from '../model/Vec3';
import { Messung } from './Messung';
import type { Treffer } from './SnapService';
import type { EditorKontext, Werkzeug } from './Werkzeuge';

/**
 * Maßstab setzen (Spec E2, D2): zwei Klicks auf das Luftbild, ohne Einrasten. Die Strecke steht als `Messung` (ohne Beschriftung)
 * im Editor; die Meter dazu trägt das Panel ein (`Editor.setzeMassstab`). Zwei Punkte unter 10 px Abstand gelten nicht,
 * das Werkzeug bleibt aktiv. Ein weiterer Klick nach zwei Punkten beginnt eine neue Strecke.
 */
export class MassstabTool implements Werkzeug {
  readonly name = 'massstab' as const;
  readonly klickZiele = [] as const;
  private start: Vec3 | null = null;
  private fertig = false;

  get angefangen(): Vec3 | null {
    return null;
  }

  onKlick(treffer: Treffer, k: EditorKontext): void {
    const bild = k.bauwerk.luftbild;
    if (!bild) throw new RangeError('Kein Luftbild geladen');
    const punkt = new Vec3(treffer.punkt.x, 0, treffer.punkt.z);
    if (this.start === null || this.fertig) {
      this.start = punkt;
      this.fertig = false;
      k.setzeMessung(new Messung(punkt, null, false));
      return;
    }
    const start = this.start;
    try {
      pruefePunktabstand(start, punkt, bild.meterProPixel);
    } catch (e) {
      this.abbrechen();
      k.setzeMessung(null);
      throw e;
    }
    this.fertig = true;
    k.setzeMessung(new Messung(start, punkt, false));
  }

  abbrechen(): void {
    this.start = null;
    this.fertig = false;
  }
}
