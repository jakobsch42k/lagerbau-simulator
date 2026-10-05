import type { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';
import { BODEN_RASTER, SNAP_RADIUS } from './konstanten';

export type Treffer =
  | { readonly art: 'boden'; readonly punkt: Vec3 }
  | { readonly art: 'stange'; readonly punkt: Vec3; readonly stangeId: string }
  | { readonly art: 'baum'; readonly punkt: Vec3; readonly baumId: string }
  | { readonly art: 'seil'; readonly punkt: Vec3; readonly seilId: string }
  | { readonly art: 'plane'; readonly punkt: Vec3; readonly planeId: string };

export type SnapArt = 'spitze' | 'bund' | 'ende' | 'oese' | 'stange' | 'baum' | 'boden';

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

  /** @param mitOesen nur im Seil-Werkzeug: Planen-Ösen sind dann Fangpunkte (Spec v2b, D2). */
  snap(treffer: Treffer, bauwerk: Bauwerk, mitOesen = false): SnapPunkt {
    // Ein Klick auf eine Plane rastet auf eine Spitze, einen Bund oder ein Ende in Reichweite ein, sonst auf ihre nächste Öse, egal wie weit; so hängt kein Seilende in der Luft.
    if (mitOesen && treffer.art === 'plane') {
      const baut = this.naechsterKandidat(treffer.punkt, bauwerk, false);
      if (baut) return baut;
      const plane = bauwerk.plane(treffer.planeId);
      if (plane) return { punkt: plane.naechsteOese(treffer.punkt), art: 'oese' };
    }
    const kandidat = this.naechsterKandidat(treffer.punkt, bauwerk, mitOesen);
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

  private naechsterKandidat(p: Vec3, bauwerk: Bauwerk, mitOesen: boolean): SnapPunkt | null {
    const kandidaten: SnapPunkt[] = [
      ...bauwerk.gruppen.map((g) => ({ punkt: g.spitze(), art: 'spitze' as const })),
      ...bauwerk.buende().map((b) => ({ punkt: b.position, art: 'bund' as const })),
      ...bauwerk.stangen().flatMap((s) => s.endpunkte().map((e) => ({ punkt: e, art: 'ende' as const }))),
      ...(mitOesen ? bauwerk.planen.flatMap((pl) => pl.oesen.map((o) => ({ punkt: o, art: 'oese' as const }))) : []),
    ];
    const priority: Record<string, number> = { spitze: 0, bund: 1, ende: 2, oese: 3 };
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
