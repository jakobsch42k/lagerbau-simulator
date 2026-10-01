/**
 * Entscheidet, ob ein Panel neu aufgebaut werden muss. Das Modell ist unveränderlich:
 * Eine Parameteränderung erzeugt ein neues Objekt, andere Zustandsänderungen (z. B. Meldungen) nicht.
 */
export class Neuaufbau {
  private id: string | null = null;
  private objekt: object | null = null;

  /** True, wenn Auswahl-ID oder Objekt-Referenz sich seit dem letzten Aufruf geändert haben. */
  noetig(id: string | null, objekt: object | null): boolean {
    const geaendert = id !== this.id || objekt !== this.objekt;
    this.id = id;
    this.objekt = objekt;
    return geaendert;
  }
}
