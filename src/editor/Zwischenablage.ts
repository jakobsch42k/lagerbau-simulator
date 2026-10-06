import { mitte } from '../model/Duplikat';
import type { LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import { DUPLIKAT_VERSATZ } from './konstanten';

/** Die App-interne Zwischenablage für Strg+C / Strg+V (Spec E1, D3): merkt sich Objekte, nicht den Systemspeicher. */
export class Zwischenablage {
  private inhalt: readonly LagerObjekt[] = [];

  get objekte(): readonly LagerObjekt[] {
    return this.inhalt;
  }

  merke(objekte: readonly LagerObjekt[]): void {
    this.inhalt = objekte;
  }

  /**
   * Versatz fürs Einfügen: der Mittelpunkt des Inhalts landet auf `ziel` (dem gerasterten Bodenpunkt unter der Maus),
   * ohne Ziel um +1 m versetzt. null, wenn nichts in der Ablage ist.
   */
  einfuegeVersatz(ziel: Vec3 | null): Vec3 | null {
    const mittelpunkt = mitte(this.inhalt);
    if (mittelpunkt === null) return null;
    return ziel ? ziel.sub(mittelpunkt) : DUPLIKAT_VERSATZ;
  }
}
