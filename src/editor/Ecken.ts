import type { Bauwerk } from '../model/Bauwerk';
import { hatEcken } from '../model/LagerObjekt';
import { Vec3 } from '../model/Vec3';
import { BODEN_RASTER } from './konstanten';
import type { Zug } from './Ziehvorgang';

/** Auf `BODEN_RASTER` gerundet (Spec E3: Ecken ziehen). `+ 0` macht aus -0 eine 0. */
export function aufBodenRaster(p: Vec3): Vec3 {
  const runde = (x: number): number => Math.round(x / BODEN_RASTER) * BODEN_RASTER + 0;
  return new Vec3(Number(runde(p.x).toFixed(6)) + 0, 0, Number(runde(p.z).toFixed(6)) + 0);
}

/**
 * Die Lage einer neuen Ecke auf der Kante a–b für einen Klick: der Lotpunkt auf der Kante, auf das Raster gerundet.
 * Fällt das auf eine vorhandene Ecke (sehr kurze Kante), gilt die genaue Lage statt einer doppelten Ecke.
 */
export function punktAufKante(a: Vec3, b: Vec3, klick: Vec3): Vec3 {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const quadrat = dx * dx + dz * dz;
  const t = quadrat === 0 ? 0 : Math.max(0, Math.min(1, ((klick.x - a.x) * dx + (klick.z - a.z) * dz) / quadrat));
  const lot = new Vec3(a.x + t * dx, 0, a.z + t * dz);
  const gerastert = aufBodenRaster(lot);
  return gerastert.distanceTo(a) < BODEN_RASTER / 2 || gerastert.distanceTo(b) < BODEN_RASTER / 2 ? lot : gerastert;
}

/** Ein laufendes Ziehen einer Ecke von Zone oder Linie (Spec E3): Zwischenstand wie beim `Ziehvorgang`, Ecke auf 0,1 m gerastert. */
export class EckenZiehen implements Zug {
  private constructor(
    private readonly basis: Bauwerk,
    private readonly id: string,
    private readonly index: number,
    private readonly ziel: Vec3 | null,
    readonly vorschau: Bauwerk | null,
    readonly fehler: string | null,
  ) {}

  static start(basis: Bauwerk, id: string, index: number): EckenZiehen {
    return new EckenZiehen(basis, id, index, null, null, null);
  }

  mitZiel(boden: Vec3): EckenZiehen {
    const ziel = aufBodenRaster(boden);
    if (this.ziel?.equals(ziel)) return this;
    if (ziel.equals(this.startPunkt())) return new EckenZiehen(this.basis, this.id, this.index, ziel, null, null);
    try {
      return new EckenZiehen(this.basis, this.id, this.index, ziel, this.ergebnisFuer(ziel), null);
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      return new EckenZiehen(this.basis, this.id, this.index, ziel, null, e.message);
    }
  }

  /** Das Bauwerk nach dem Ziehen; wirft den RangeError des Modells (Selbstschnitt). */
  ergebnis(): Bauwerk {
    return this.ergebnisFuer(this.ziel ?? this.startPunkt());
  }

  private startPunkt(): Vec3 {
    const o = this.basis.objekt(this.id);
    return (o && hatEcken(o) ? o.ecken()[this.index] : undefined) ?? Vec3.NULL;
  }

  private ergebnisFuer(ziel: Vec3): Bauwerk {
    const o = this.basis.objekt(this.id);
    if (!o || !hatEcken(o)) throw new RangeError('Dieses Objekt hat keine Ecken.');
    return this.basis.ersetze(o.mitEcken(o.ecken().map((p, i) => (i === this.index ? ziel : p))));
  }
}
