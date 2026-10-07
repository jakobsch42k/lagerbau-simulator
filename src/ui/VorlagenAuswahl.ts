import type { VorlagenWahl } from '../arten/VorlagenWahl';

/** Das Auswahlfeld zu einem Vorlagen-Werkzeug (Platz-Objekt, Zelt): Die gewählte Vorlage bleibt aktiv, bis man eine andere wählt (Spec E3, D2). */
export class VorlagenAuswahl {
  constructor(
    private readonly select: HTMLSelectElement,
    private readonly wahl: VorlagenWahl,
    /** Nach einer Wahl, z. B. um das Werkzeug zu aktivieren. */
    private readonly gewaehlt: () => void,
  ) {
    for (const v of wahl.vorlagen) {
      const option = document.createElement('option');
      option.value = v.schluessel;
      option.textContent = v.label;
      select.append(option);
    }
    select.value = wahl.aktuell.schluessel;
    select.addEventListener('change', () => {
      this.wahl.setze(this.select.value);
      this.gewaehlt();
    });
  }
}
