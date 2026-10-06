import * as THREE from 'three';
import type { Messung } from './Messung';

const FARBE = 0xd9480f;
const MARKE_RADIUS = 0.08; // m

/** Zeigt die Messung (Spec E1, D5): Linie mit Endmarken in der Szene und die Länge als Text über der Mitte. */
export class Messanzeige {
  readonly wurzel = new THREE.Group();
  private readonly beschriftung = document.createElement('div');
  private mitte: THREE.Vector3 | null = null;

  constructor(container: HTMLElement) {
    this.beschriftung.id = 'messung';
    this.beschriftung.hidden = true;
    container.appendChild(this.beschriftung);
  }

  zeige(messung: Messung | null): void {
    this.wurzel.clear();
    this.mitte = null;
    this.beschriftung.hidden = true;
    if (!messung) return;
    const von = new THREE.Vector3(messung.von.x, messung.von.y, messung.von.z);
    this.wurzel.add(this.marke(von));
    if (!messung.bis) return;
    const bis = new THREE.Vector3(messung.bis.x, messung.bis.y, messung.bis.z);
    const linie = new THREE.Line(new THREE.BufferGeometry().setFromPoints([von, bis]), new THREE.LineBasicMaterial({ color: FARBE, depthTest: false }));
    linie.renderOrder = 10;
    this.wurzel.add(linie, this.marke(bis));
    this.mitte = von.clone().add(bis).multiplyScalar(0.5);
    this.beschriftung.textContent = messung.text;
    this.beschriftung.hidden = false;
  }

  /** Setzt den Text auf die Bildschirmstelle der Mitte; jedes Bild aufrufen. */
  positioniere(kamera: THREE.Camera, breite: number, hoehe: number): void {
    if (!this.mitte) return;
    const ndc = this.mitte.clone().project(kamera);
    this.beschriftung.style.left = `${((ndc.x + 1) / 2) * breite}px`;
    this.beschriftung.style.top = `${((1 - ndc.y) / 2) * hoehe}px`;
  }

  private marke(ort: THREE.Vector3): THREE.Mesh {
    const marke = new THREE.Mesh(new THREE.SphereGeometry(MARKE_RADIUS), new THREE.MeshBasicMaterial({ color: FARBE, depthTest: false }));
    marke.position.copy(ort);
    marke.renderOrder = 10;
    return marke;
  }
}
