import { VORLAGEN, type VorlagenWahl } from '../arten/platz/vorlagen';

/** Das Auswahlfeld zum Werkzeug „Platz-Objekt“: Die gewählte Vorlage bleibt aktiv, bis man eine andere wählt (Spec E3, D2). */
export class VorlagenAuswahl {
  constructor(
    private readonly select: HTMLSelectElement,
    private readonly wahl: VorlagenWahl,
    /** Nach einer Wahl, z. B. um das Werkzeug zu aktivieren. */
    private readonly gewaehlt: () => void,
  ) {
    for (const v of VORLAGEN) {
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
