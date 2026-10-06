import type { ObjektArt, PlatzierenMehrpunkt } from '../arten/ObjektArt';
import type { ArtName } from '../model/LagerObjekt';
import { Vec3 } from '../model/Vec3';
import type { Treffer } from './SnapService';
import type { EditorKontext, Werkzeug, Zeichnung } from './Werkzeuge';

/** Punkte, die näher als das beieinander liegen, sind derselbe Punkt: So setzt der zweite Klick eines Doppelklicks keinen doppelten Punkt. */
const GLEICHER_PUNKT = 0.05; // m

/**
 * Zeichnet ein Objekt aus beliebig vielen Punkten (Zone, Linie; Spec E3, D1): Jeder Klick setzt einen Punkt, Doppelklick oder Enter schließt ab,
 * Esc oder ein Werkzeugwechsel bricht ab. Die Punkte rasten wie bei Seil und Stange auf Einrastpunkte (dazu Ecken von Zonen und Linien),
 * sonst aufs Raster, und liegen am Boden. Wirft das Modell beim Abschluss (zu wenige Punkte, Selbstschnitt), bleibt die Zeichnung stehen.
 * Ein Klickziel hat das Werkzeug nicht: Klicks gehen auf den Boden, auch wenn dort schon eine Zone liegt.
 */
export class ZeichenTool implements Werkzeug {
  readonly klickZiele: readonly ArtName[] = [];
  /** Wird bei jeder Änderung ersetzt, damit die Szene sie an der Identität erkennt. */
  private aktuell: Zeichnung | null = null;

  constructor(
    private readonly art: ObjektArt,
    private readonly platzieren: PlatzierenMehrpunkt,
  ) {}

  get name(): ArtName {
    return this.art.name;
  }

  get angefangen(): Vec3 | null {
    return null;
  }

  get zeichnung(): Zeichnung | null {
    return this.aktuell;
  }

  onKlick(treffer: Treffer, k: EditorKontext): void {
    const gesnappt = k.snap.snap(treffer, k.bauwerk, false).punkt;
    const punkt = new Vec3(gesnappt.x, 0, gesnappt.z);
    const punkte = this.aktuell?.punkte ?? [];
    const letzter = punkte.at(-1);
    if (letzter && letzter.distanceTo(punkt) < GLEICHER_PUNKT) return;
    this.aktuell = { punkte: [...punkte, punkt], geschlossen: this.platzieren.geschlossen };
  }

  onDoppelklick(_treffer: Treffer, k: EditorKontext): void {
    this.onBestaetigen(k);
  }

  /** Schließt ab; ohne Punkte passiert nichts. Der Editor fängt den RangeError des Modells und zeigt die Meldung. */
  onBestaetigen(k: EditorKontext): void {
    if (!this.aktuell) return;
    const objekt = this.platzieren.erzeuge(k.neueId(this.art.name), this.ohneDoppelEnde(this.aktuell));
    k.aendere(k.bauwerk.mit(objekt));
    k.waehle(objekt.id);
    this.aktuell = null;
  }

  abbrechen(): void {
    this.aktuell = null;
  }

  /** Ein Klick zurück auf den ersten Punkt schließt das Vieleck, ohne dass die Ecke doppelt vorkommt. */
  private ohneDoppelEnde(z: Zeichnung): readonly Vec3[] {
    const erster = z.punkte[0];
    const letzter = z.punkte.at(-1);
    const doppelt = z.geschlossen && z.punkte.length > 1 && erster !== undefined && letzter !== undefined && erster.distanceTo(letzter) < GLEICHER_PUNKT;
    return doppelt ? z.punkte.slice(0, -1) : z.punkte;
  }
}
