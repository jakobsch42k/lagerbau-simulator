import * as THREE from 'three';
import type { ArtName } from '../../model/LagerObjekt';
import { alsTeil } from './Darstellung';

/** Eine Farbe, die sich vom Grund abhebt: helle Farben werden dunkler, sehr dunkle heller. Für Kanten, Bänder und Kappen. */
export function kontrast(farbe: THREE.ColorRepresentation): THREE.Color {
  const c = new THREE.Color(farbe);
  return c.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace).l < 0.25 ? c.lerp(new THREE.Color(0xffffff), 0.4) : c.multiplyScalar(0.55);
}

/** Dieselbe Farbe heller (faktor > 1, Richtung Weiß) oder dunkler (faktor < 1). */
export function ton(farbe: THREE.ColorRepresentation, faktor: number): THREE.Color {
  const c = new THREE.Color(farbe);
  return faktor < 1 ? c.multiplyScalar(faktor) : c.lerp(new THREE.Color(0xffffff), faktor - 1);
}

/**
 * Baut die Meshes eines Objekts mit Teil-Daten (Objekt-id, Art, Auswahlmaterial) und eigenen, nach Farbe geteilten Materialien.
 * Die Szene gibt Materialien mit `userData.eigenesMaterial` frei (mehrfaches `dispose` ist harmlos).
 */
export class TeilBauer {
  private readonly materialien = new Map<string, THREE.MeshLambertMaterial>();

  constructor(
    private readonly objektId: string,
    private readonly art: ArtName,
    private readonly markiert: THREE.Material,
  ) {}

  /** Ein sichtbarer, klickbarer Teil; die Auswahl färbt ihn mit dem Auswahlmaterial um. */
  mesh(geometrie: THREE.BufferGeometry, farbe: THREE.ColorRepresentation, seite: THREE.Side = THREE.FrontSide): THREE.Mesh {
    const material = this.material(farbe, seite);
    const mesh = new THREE.Mesh(geometrie, material);
    mesh.userData.eigenesMaterial = true;
    return alsTeil(mesh, { objektId: this.objektId, teilId: this.objektId, art: this.art, klickbar: true, normal: material, markiert: this.markiert });
  }

  /** Unsichtbarer Klickkörper (hält die Trefferfläche, wenn der sichtbare Körper Lücken hat). */
  klickKoerper(geometrie: THREE.BufferGeometry, unsichtbar: THREE.Material): THREE.Mesh {
    return alsTeil(new THREE.Mesh(geometrie, unsichtbar), {
      objektId: this.objektId,
      teilId: this.objektId,
      art: this.art,
      klickbar: true,
      normal: unsichtbar,
      markiert: null,
    });
  }

  private material(farbe: THREE.ColorRepresentation, seite: THREE.Side): THREE.MeshLambertMaterial {
    const schluessel = `${new THREE.Color(farbe).getHexString()}/${seite}`;
    let m = this.materialien.get(schluessel);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: farbe, side: seite, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      this.materialien.set(schluessel, m);
    }
    return m;
  }
}
