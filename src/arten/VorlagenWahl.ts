/** Eine Vorlage, wie die Auswahl im Werkzeug sie braucht: Schlüssel und Text. */
export interface VorlagenEintrag {
  readonly schluessel: string;
  readonly label: string;
}

/**
 * Die im Werkzeug gewählte Vorlage einer Art (Platz-Objekt, Zelt). Sie bleibt aktiv, bis man eine andere wählt (Spec E3, D2; E4, D2).
 * Die erste Vorlage der Liste ist der Start.
 */
export class VorlagenWahl<V extends VorlagenEintrag = VorlagenEintrag> {
  private gewaehlt: V;

  constructor(readonly vorlagen: readonly V[]) {
    this.gewaehlt = vorlagen[0] as V;
  }

  get aktuell(): V {
    return this.gewaehlt;
  }

  setze(schluessel: string): void {
    const v = this.vorlagen.find((x) => x.schluessel === schluessel);
    if (!v) throw new RangeError('Unbekannte Vorlage');
    this.gewaehlt = v;
  }
}
