import { massstabsLaenge } from './Ansicht';

/** Die Maßstabsleiste unten links, nur in der Planansicht (Spec E1, D5). Beschriftung z. B. „10 m“. */
export class Massstabsleiste {
  private readonly leiste = document.createElement('div');
  private readonly balken = document.createElement('div');
  private readonly beschriftung = document.createElement('span');
  private letzteLaenge = 0;

  constructor(container: HTMLElement) {
    this.leiste.id = 'massstab';
    this.leiste.hidden = true;
    this.balken.className = 'massstab-balken';
    this.leiste.append(this.balken, this.beschriftung);
    container.appendChild(this.leiste);
  }

  /** Zeigt die Leiste mit passender Länge, oder blendet sie aus (3D). */
  zeige(sichtbar: boolean, meterProPixel: number): void {
    this.leiste.hidden = !sichtbar;
    if (!sichtbar) return;
    const { meter, pixel } = massstabsLaenge(meterProPixel);
    const breite = Math.round(pixel);
    if (breite === this.letzteLaenge) return;
    this.letzteLaenge = breite;
    this.balken.style.width = `${breite}px`;
    this.beschriftung.textContent = `${meter} m`;
  }
}
