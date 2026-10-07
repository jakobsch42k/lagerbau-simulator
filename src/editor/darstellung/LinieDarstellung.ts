import * as THREE from 'three';
import type { Linie } from '../../model/Linie';
import { Vec3 } from '../../model/Vec3';
import { BODEN_HOEHEN } from '../Bodenbild';
import { bandGeometrie } from './bodenformen';
import { alsTeil, type Darstellung, type TeilDaten } from './Darstellung';
import { KLICKBAND_MARKIERT, MARKIERT, UNSICHTBAR } from './materialien';

const PFOSTEN_ABSTAND = 2; // m, höchstens so weit stehen zwei Pfosten auseinander (Spec E3, D1)
const PFOSTEN_HOEHE = 1; // m
const PFOSTEN_DICKE = 0.1; // m
const LATTE_DICKE = 0.06; // m
const STRICH = 0.5; // m, Länge eines Grenz-Strichs
const LUECKE = 0.3; // m, Lücke dazwischen
/** Breite der unsichtbaren Fläche, auf der man eine Grenze anklickt. */
const KLICKBAND_BREITE = 0.5; // m

/**
 * Linie je Typ (Spec E3, D1): Weg = flaches Band in der Breite (knapp über den Zonen), Zaun = Pfosten höchstens alle 2 m, 1 m hoch, mit Latte oben,
 * Grenze = gestrichelte Linie am Boden. Alle Teile gehören zur Linie und fangen Klicks (die Szene gibt sie nur in der Auswahl frei).
 */
export class LinieDarstellung implements Darstellung<Linie> {
  baue(l: Linie): THREE.Group {
    const { typ, farbe } = l.params;
    const gruppe = new THREE.Group();
    if (typ === 'weg') gruppe.add(this.weg(l, farbe));
    else if (typ === 'zaun') gruppe.add(...this.zaun(l, farbe));
    else gruppe.add(...this.grenze(l, farbe));
    return gruppe;
  }

  private daten(l: Linie, normal: THREE.Material, markiert: THREE.Material): TeilDaten {
    return { objektId: l.id, teilId: l.id, art: 'linie', klickbar: true, normal, markiert };
  }

  private weg(l: Linie, farbe: string): THREE.Mesh {
    const material = new THREE.MeshBasicMaterial({ color: farbe, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const band = alsTeil(new THREE.Mesh(bandGeometrie(l.punkte, l.params.breite), material), this.daten(l, material, MARKIERT));
    band.userData.eigenesMaterial = true;
    band.position.y = BODEN_HOEHEN.weg;
    return band;
  }

  /** Pfosten an jedem Punkt und dazwischen so viele, dass kein Abstand über 2 m liegt; zwischen den Pfostenköpfen läuft je Abschnitt eine Latte. */
  private zaun(l: Linie, farbe: string): THREE.Mesh[] {
    const material = new THREE.MeshLambertMaterial({ color: farbe });
    const teil = (geometrie: THREE.BufferGeometry): THREE.Mesh => {
      const mesh = alsTeil(new THREE.Mesh(geometrie, material), this.daten(l, material, MARKIERT));
      mesh.userData.eigenesMaterial = true;
      return mesh;
    };
    const pfosten: THREE.Mesh[] = [];
    const latten: THREE.Mesh[] = [];
    const setzePfosten = (p: Vec3): void => {
      const mesh = teil(new THREE.BoxGeometry(PFOSTEN_DICKE, PFOSTEN_HOEHE, PFOSTEN_DICKE));
      mesh.position.set(p.x, PFOSTEN_HOEHE / 2, p.z);
      pfosten.push(mesh);
    };
    l.punkte.forEach((a, i) => {
      const b = l.punkte[i + 1];
      if (!b) return setzePfosten(a);
      const teile = Math.max(1, Math.ceil(a.distanceTo(b) / PFOSTEN_ABSTAND));
      for (let k = 0; k < teile; k++) setzePfosten(a.add(b.sub(a).scale(k / teile)));
      const latte = teil(new THREE.BoxGeometry(a.distanceTo(b), LATTE_DICKE, LATTE_DICKE));
      latte.position.set((a.x + b.x) / 2, PFOSTEN_HOEHE - LATTE_DICKE / 2, (a.z + b.z) / 2);
      latte.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      latten.push(latte);
    });
    return [...pfosten, ...latten];
  }

  /** Eine gestrichelte Linie ist zu dünn zum Anklicken; darunter liegt deshalb eine unsichtbare Fläche, die bei Auswahl sichtbar wird. */
  private grenze(l: Linie, farbe: string): THREE.Object3D[] {
    const material = new THREE.LineDashedMaterial({ color: farbe, dashSize: STRICH, gapSize: LUECKE });
    const linie = new THREE.Line(new THREE.BufferGeometry().setFromPoints(l.punkte.map((p) => new THREE.Vector3(p.x, 0, p.z))), material);
    linie.computeLineDistances();
    linie.userData.eigenesMaterial = true;
    linie.position.y = BODEN_HOEHEN.linie;
    const klick = alsTeil(new THREE.Mesh(bandGeometrie(l.punkte, KLICKBAND_BREITE), UNSICHTBAR), this.daten(l, UNSICHTBAR, KLICKBAND_MARKIERT));
    klick.position.y = BODEN_HOEHEN.linie;
    return [linie, klick];
  }
}
