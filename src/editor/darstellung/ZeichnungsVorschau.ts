import * as THREE from 'three';
import type { Zeichnung } from '../Werkzeuge';
import { kugel } from './formen';
import { START } from './materialien';

const PUNKT_RADIUS = 0.1; // m, wie die Startkugel der Zwei-Klick-Werkzeuge
const LINIEN_Y = 0.03; // m, knapp über allem, was am Boden liegt
const LINIEN_FARBE = 0x2f6f3e;

/**
 * Die Vorschau, solange „Zone zeichnen“ oder „Linie zeichnen“ Punkte sammelt: eine Kugel je Punkt und der Linienzug dazwischen
 * (bei einer Zone zum Vieleck geschlossen). Gehört nicht zum Bauwerk. Wird nur neu gebaut, wenn sich die Zeichnung (die Instanz) ändert.
 */
export class ZeichnungsVorschau {
  private aktuell: { readonly zeichnung: Zeichnung; readonly gruppe: THREE.Group } | null = null;

  constructor(private readonly wurzel: THREE.Object3D) {}

  zeige(zeichnung: Zeichnung | null): void {
    if ((this.aktuell?.zeichnung ?? null) === zeichnung) return;
    if (this.aktuell) this.entferne(this.aktuell.gruppe);
    this.aktuell = null;
    if (zeichnung === null) return;
    const gruppe = this.baue(zeichnung);
    this.wurzel.add(gruppe);
    this.aktuell = { zeichnung, gruppe };
  }

  private baue(zeichnung: Zeichnung): THREE.Group {
    const gruppe = new THREE.Group();
    gruppe.name = 'zeichnung';
    gruppe.add(...zeichnung.punkte.map((p) => kugel(p, PUNKT_RADIUS, START)));
    if (zeichnung.punkte.length > 1) {
      const lage = zeichnung.punkte.map((p) => new THREE.Vector3(p.x, LINIEN_Y, p.z));
      const material = new THREE.LineBasicMaterial({ color: LINIEN_FARBE });
      const geometrie = new THREE.BufferGeometry().setFromPoints(lage);
      gruppe.add(zeichnung.geschlossen ? new THREE.LineLoop(geometrie, material) : new THREE.Line(geometrie, material));
    }
    return gruppe;
  }

  private entferne(gruppe: THREE.Group): void {
    this.wurzel.remove(gruppe);
    gruppe.traverse((k) => {
      if (k instanceof THREE.Line) {
        k.geometry.dispose();
        (k.material as THREE.Material).dispose();
      } else if (k instanceof THREE.Mesh) k.geometry.dispose();
    });
  }
}
