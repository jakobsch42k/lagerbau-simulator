import type { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';
import { BODEN_RASTER, SNAP_RADIUS } from './konstanten';

export type Treffer =
  | { readonly art: 'boden'; readonly punkt: Vec3 }
  | { readonly art: 'stange'; readonly punkt: Vec3; readonly stangeId: string }
  | { readonly art: 'baum'; readonly punkt: Vec3; readonly baumId: string }
  | { readonly art: 'seil'; readonly punkt: Vec3; readonly seilId: string };

export type SnapArt = 'spitze' | 'bund' | 'ende' | 'stange' | 'baum' | 'boden';

export interface SnapPunkt {
  readonly punkt: Vec3;
  readonly art: SnapArt;
}

/** Macht aus einem Mausklick einen eindeutigen 3D-Punkt, nie einen freien Tiefenklick. */
export class SnapService {
  constructor(
    private readonly radius = SNAP_RADIUS,
    private readonly raster = BODEN_RASTER,
  ) {}

  snap(treffer: Treffer, bauwerk: Bauwerk): SnapPunkt {
    const kandidat = this.naechsterKandidat(treffer.punkt, bauwerk);
    if (kandidat) return kandidat;
    if (treffer.art === 'stange') {
      const stange = bauwerk.stange(treffer.stangeId);
      if (stange) return { punkt: stange.naechsterPunkt(treffer.punkt), art: 'stange' };
    }
    // Am Stamm zählt der getroffene Oberflächenpunkt; die Verankerung erkennt ihn als „Baum“.
    if (treffer.art === 'baum' && bauwerk.baum(treffer.baumId)) return { punkt: treffer.punkt, art: 'baum' };
    return { punkt: this.aufRaster(treffer.punkt), art: 'boden' };
  }

  aufRaster(p: Vec3): Vec3 {
    const runde = (x: number): number => Math.round(x / this.raster) * this.raster;
    return new Vec3(runde(p.x), 0, runde(p.z));
  }

  private naechsterKandidat(p: Vec3, bauwerk: Bauwerk): SnapPunkt | null {
    const kandidaten: SnapPunkt[] = [
      ...bauwerk.gruppen.map((g) => ({ punkt: g.spitze(), art: 'spitze' as const })),
      ...bauwerk.buende().map((b) => ({ punkt: b.position, art: 'bund' as const })),
      ...bauwerk.stangen().flatMap((s) => s.endpunkte().map((e) => ({ punkt: e, art: 'ende' as const }))),
    ];
    const priority: Record<string, number> = { spitze: 0, bund: 1, ende: 2 };
    return kandidaten.reduce<SnapPunkt | null>((bester, k) => {
      const d = k.punkt.distanceTo(p);
      if (d > this.radius) return bester;
      if (bester === null) return k;
      const besterDist = bester.punkt.distanceTo(p);
      if (d < besterDist - 1e-9) return k;
      if (Math.abs(d - besterDist) < 1e-9 && priority[k.art] < priority[bester.art]) return k;
      return bester;
    }, null);
  }
}
