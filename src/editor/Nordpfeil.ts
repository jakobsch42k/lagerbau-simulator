/** Der Nordpfeil oben rechts im Ansichtsfenster (Spec E2, D3): in der Planansicht nach oben, in 3D mit der Kamera gedreht. */
export class Nordpfeil {
  private readonly pfeil = document.createElement('div');
  private letzterWinkel = Number.NaN;

  constructor(container: HTMLElement) {
    this.pfeil.id = 'nordpfeil';
    this.pfeil.title = 'Norden';
    this.pfeil.setAttribute('aria-label', 'Nordpfeil');
    const spitze = document.createElement('span');
    spitze.className = 'nordpfeil-spitze';
    const n = document.createElement('span');
    n.className = 'nordpfeil-n';
    n.textContent = 'N';
    this.pfeil.append(spitze, n);
    container.appendChild(this.pfeil);
    this.drehe(0);
  }

  /** Dreht den Pfeil um `grad` im Uhrzeigersinn; jedes Bild aufrufen, schreibt nur bei Änderung. */
  drehe(grad: number): void {
    const gerundet = Math.round(grad * 10) / 10;
    if (gerundet === this.letzterWinkel) return;
    this.letzterWinkel = gerundet;
    this.pfeil.style.transform = `rotate(${gerundet}deg)`;
  }
}
