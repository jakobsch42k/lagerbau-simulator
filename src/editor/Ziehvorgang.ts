import type { Bauwerk } from '../model/Bauwerk';
import { bewege } from '../model/Mitbewegung';
import { Vec3 } from '../model/Vec3';
import { BODEN_RASTER } from './konstanten';

/**
 * Ein laufendes Ziehen (Spec E1, D3): Startpunkt am Boden, bewegte ids und der letzte Versatz samt Vorschau.
 * Unveränderlich; `mitZiel` liefert den nächsten Stand. Ändert nichts am Bauwerk, die Vorschau ist nur ein Zwischenstand.
 */
export class Ziehvorgang {
  private constructor(
    readonly basis: Bauwerk,
    readonly ids: readonly string[],
    private readonly startBoden: Vec3,
    /** Der letzte Versatz, gerundet auf `BODEN_RASTER`. */
    readonly versatz: Vec3,
    /** Das Bauwerk mit dem Versatz; null, wenn die Lage nicht geht (dann steht die Meldung in `fehler`). */
    readonly vorschau: Bauwerk | null,
    readonly fehler: string | null,
  ) {}

  static start(basis: Bauwerk, ids: readonly string[], startBoden: Vec3): Ziehvorgang {
    return new Ziehvorgang(basis, ids, startBoden, Vec3.NULL, null, null);
  }

  /** Der Stand für den Bodenpunkt unter der Maus; derselbe Versatz liefert denselben Vorgang zurück. */
  mitZiel(boden: Vec3): Ziehvorgang {
    const raster = (d: number): number => Math.round(d / BODEN_RASTER) * BODEN_RASTER;
    const versatz = new Vec3(raster(boden.x - this.startBoden.x), 0, raster(boden.z - this.startBoden.z));
    if (versatz.equals(this.versatz)) return this;
    return this.mitVersatz(versatz);
  }

  /** Das Bauwerk nach dem Ziehen; wirft den RangeError von `bewege`. */
  ergebnis(): Bauwerk {
    return bewege(this.basis, this.ids, { art: 'verschiebung', dv: this.versatz });
  }

  private mitVersatz(versatz: Vec3): Ziehvorgang {
    try {
      const vorschau = bewege(this.basis, this.ids, { art: 'verschiebung', dv: versatz });
      return new Ziehvorgang(this.basis, this.ids, this.startBoden, versatz, vorschau, null);
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      return new Ziehvorgang(this.basis, this.ids, this.startBoden, versatz, null, e.message);
    }
  }
}
