import * as THREE from 'three';
import { Vec3 } from '../../model/Vec3';
import type { EckenAnzeige } from '../EditorZustand';
import { kugel } from './formen';

const GRIFF_RADIUS = 0.3; // m
const GRIFF_Y = 0.05; // m, über Zonen und Linien
const GRIFF = new THREE.MeshBasicMaterial({ color: 0xffd43b, depthTest: false });
const GRIFF_GEWAEHLT = new THREE.MeshBasicMaterial({ color: 0xd9480f, depthTest: false });

/** Die Griffe an den Ecken der ausgewählten Zone oder Linie (Spec E3). Gehört nicht zum Bauwerk; baut nur neu, wenn sich Lage oder gewählter Griff ändern. */
export class EckenGriffe {
  private aktuell: { readonly anzeige: EckenAnzeige; readonly gruppe: THREE.Group } | null = null;

  constructor(private readonly wurzel: THREE.Object3D) {}

  zeige(anzeige: EckenAnzeige | null): void {
    const alt = this.aktuell?.anzeige;
    if (alt === anzeige || (alt && anzeige && alt.punkte === anzeige.punkte && alt.gewaehlt === anzeige.gewaehlt)) return;
    if (this.aktuell) this.entferne(this.aktuell.gruppe);
    this.aktuell = null;
    if (anzeige === null) return;
    const gruppe = new THREE.Group();
    gruppe.name = 'eckengriffe';
    anzeige.punkte.forEach((p, i) => {
      const griff = kugel(new Vec3(p.x, GRIFF_Y, p.z), GRIFF_RADIUS, i === anzeige.gewaehlt ? GRIFF_GEWAEHLT : GRIFF);
      griff.renderOrder = 10;
      gruppe.add(griff);
    });
    this.wurzel.add(gruppe);
    this.aktuell = { anzeige, gruppe };
  }

  private entferne(gruppe: THREE.Group): void {
    this.wurzel.remove(gruppe);
    gruppe.traverse((k) => {
      if (k instanceof THREE.Mesh) k.geometry.dispose();
    });
  }
}
