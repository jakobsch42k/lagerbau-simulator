import type { Vec3 } from './Vec3';

/**
 * Alle Objektarten des Planers (Spec v3, D1). Eine neue Art kommt hier dazu, außerdem in `standardArten()` (src/arten)
 * und in `standardDarstellungen()` (src/editor/darstellung).
 */
export const ART_NAMEN = ['dreibein', 'abock', 'stange', 'seil', 'baum', 'plane', 'platzobjekt', 'beschriftung', 'zone', 'linie'] as const;
export type ArtName = (typeof ART_NAMEN)[number];

/** Gemeinsame Schnittstelle aller Objekte auf dem Platz. Unveränderlich: Jede Methode liefert ein neues Objekt. */
export interface LagerObjekt {
  readonly id: string;
  readonly art: ArtName;
  /** Eigene id und die ids aller Teile, z. B. der Stangen einer Baugruppe. */
  ids(): readonly string[];
  verschobenUm(dv: Vec3): LagerObjekt;
  /**
   * Um die senkrechte Achse durch `um` gedreht, Winkel in Bogenmaß, positiv wie `Baugruppe.drehung`.
   * Ohne `um`: Baugruppe und Baum um ihre Position, Stange, Seil und Plane um die Mitte zwischen Start und Ende.
   */
  gedreht(winkelRad: number, um?: Vec3): LagerObjekt;
  /** Eine Kopie mit neuer id (bei Baugruppen ändern sich damit auch die Stangen-ids); Lage und Maße bleiben. */
  mitId(id: string): LagerObjekt;
  /** Der eigene Drehpunkt, um den `gedreht` ohne `um` dreht: Position bei Baugruppe und Baum, Mitte bei Stange, Seil und Plane. */
  drehpunkt(): Vec3;
  /** Punkte, die der Platzbedarf umfasst: Füße bei Baugruppen und freien Stangen, Ösen bei Planen. */
  platzPunkte(): readonly Vec3[];
}

/** Fähigkeit „Ecken bearbeiten“ (Spec E3): Zone (geschlossen) und Linie (offen). `mitEcken` prüft neu und wirft einen RangeError. */
export interface HatEcken extends LagerObjekt {
  readonly eckenGeschlossen: boolean;
  ecken(): readonly Vec3[];
  mitEcken(punkte: readonly Vec3[]): HatEcken;
}

export function hatEcken(o: LagerObjekt): o is HatEcken {
  return 'eckenGeschlossen' in o && 'mitEcken' in o;
}
