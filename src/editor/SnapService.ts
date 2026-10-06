import type { FangArt, Fangpunkt } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName } from '../model/LagerObjekt';
import { Vec3 } from '../model/Vec3';
import { BODEN_RASTER, SNAP_RADIUS } from './konstanten';

/**
 * Was ein Klick getroffen hat (Spec v3, D4). Bei einem Objekt ist `id` die Teil-id (z. B. eine Stange einer Baugruppe)
 * und `objektArt` die Art des Objekts, dem der Teil gehört.
 */
export type Treffer =
  | { readonly art: 'boden'; readonly punkt: Vec3 }
  | { readonly art: 'objekt'; readonly objektArt: ArtName; readonly id: string; readonly punkt: Vec3 };

export type SnapArt = FangArt | 'boden';

export interface SnapPunkt {
  readonly punkt: Vec3;
  readonly art: SnapArt;
}

/** Vorrang bei gleichem Abstand: Spitze → Bund → Ende → Öse (Spec v1, v2b), zuletzt Ecken von Zonen und Linien (Spec E3). Stange und Baum kommen nur vom getroffenen Objekt. */
const VORRANG: Readonly<Record<FangArt, number>> = { spitze: 0, bund: 1, ende: 2, oese: 3, stange: 4, baum: 5, ecke: 6 };

/** Macht aus einem Mausklick einen eindeutigen 3D-Punkt, nie einen freien Tiefenklick. Die Fangpunkte liefern die Arten. */
export class SnapService {
  constructor(
    private readonly arten: ObjektRegister = standardArten(),
    private readonly radius = SNAP_RADIUS,
    private readonly raster = BODEN_RASTER,
  ) {}

  /** @param mitOesen nur im Seil-Werkzeug: Planen-Ösen sind dann Fangpunkte (Spec v2b, D2). */
  snap(treffer: Treffer, bauwerk: Bauwerk, mitOesen = false): SnapPunkt {
    const amObjekt = treffer.art === 'objekt' ? this.amGetroffenen(treffer, bauwerk, mitOesen) : null;
    // Eine Öse am getroffenen Objekt gilt egal wie weit, damit kein Seilende in der Luft hängt.
    // Spitze, Bund oder Ende in Reichweite gewinnen trotzdem (v2b, Review M-1).
    if (amObjekt?.art === 'oese') return this.naechsterKandidat(treffer.punkt, bauwerk, false) ?? amObjekt;
    return this.naechsterKandidat(treffer.punkt, bauwerk, mitOesen) ?? amObjekt ?? { punkt: this.aufRaster(treffer.punkt), art: 'boden' };
  }

  aufRaster(p: Vec3): Vec3 {
    const runde = (x: number): number => Math.round(x / this.raster) * this.raster;
    return new Vec3(runde(p.x), 0, runde(p.z));
  }

  /** Fangpunkt am getroffenen Objekt selbst, z. B. der Punkt auf der Achse der getroffenen Stange. Unbekannte ids: null. */
  private amGetroffenen(treffer: Extract<Treffer, { art: 'objekt' }>, bauwerk: Bauwerk, mitOesen: boolean): Fangpunkt | null {
    const besitzer = bauwerk.besitzer(treffer.id);
    return besitzer ? this.arten.artVon(besitzer).beiTreffer(besitzer, treffer.id, treffer.punkt, mitOesen) : null;
  }

  private naechsterKandidat(p: Vec3, bauwerk: Bauwerk, mitOesen: boolean): Fangpunkt | null {
    const kandidaten: Fangpunkt[] = [
      ...bauwerk.objekte.flatMap((o) => this.arten.artVon(o).fangpunkte(o, mitOesen)),
      ...bauwerk.buende().map((b): Fangpunkt => ({ punkt: b.position, art: 'bund' })),
    ];
    return kandidaten.reduce<Fangpunkt | null>((bester, k) => {
      const d = k.punkt.distanceTo(p);
      if (d > this.radius) return bester;
      if (bester === null) return k;
      const besterDist = bester.punkt.distanceTo(p);
      if (d < besterDist - 1e-9) return k;
      if (Math.abs(d - besterDist) < 1e-9 && VORRANG[k.art] < VORRANG[bester.art]) return k;
      return bester;
    }, null);
  }
}
