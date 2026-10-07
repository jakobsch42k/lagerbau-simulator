import * as THREE from 'three';
import type { Luftbild } from '../model/Luftbild';
import { bodenGroesse } from './Ansicht';

const BODEN_FARBE = 0x7fae5a;
const RASTER_FARBEN = [0x5d8a3f, 0x6b9a4b] as const;
/** Mehr Linien als diese zeichnet das Raster nicht; auf großen Flächen werden die Felder größer als 1 m. */
const MAX_RASTER_LINIEN = 400;
/**
 * Senkrechte Schichtung des Bodens (m), von unten nach oben: neutrale Fläche, Luftbild, Raster.
 * Die Fläche liegt 5 cm tiefer, damit sie auch auf 300 m Entfernung nicht mit dem Bild flackert (Tiefenfehler bis ~5 cm);
 * zusätzlich hat das Bild ein `polygonOffset`. Alles, was Nutzer zeichnen, liegt darüber: Planen ab y = 0, und die Zonen
 * (Spec E3) als flache Flächen bei y = 0,005, also über Bild und Raster; Wege (0,007) liegen knapp über den Zonen, damit ein Weg über einer Zone
 * sichtbar bleibt, und die Grenzlinien (0,009) darüber. Das Raster hat weiter Tiefentest, damit es nie über 3D-Objekten liegt.
 */
export const BODEN_HOEHEN = { boden: -0.05, bild: 0.001, raster: 0.002, zone: 0.005, weg: 0.007, linie: 0.009 } as const;
const ANISOTROPIE = 8;

type TexturLader = (daten: string) => THREE.Texture;

const ladeTextur: TexturLader = (daten) => {
  const textur = new THREE.TextureLoader().load(daten);
  textur.colorSpace = THREE.SRGBColorSpace;
  textur.anisotropy = ANISOTROPIE;
  return textur;
};

/**
 * Der Boden der Szene (Spec E2, D3): eine neutrale Fläche (mindestens 40 × 40 m, mindestens Bild + 20 m), das Raster und, wenn es ein
 * Luftbild gibt, das Bild darauf (immer genordet, mittig auf dem Ursprung). Die Textur wird nur neu gebaut, wenn sich das Bild
 * selbst ändert, nicht bei Maßstab oder Deckkraft. Mit Bild ist das Raster zunächst aus.
 */
export class Bodenbild {
  readonly wurzel = new THREE.Group();
  /** Die neutrale Fläche; Klicks auf den Boden treffen sie (das Bild liegt darauf und braucht keinen eigenen Treffer). */
  readonly boden: THREE.Mesh;
  private raster: THREE.GridHelper;
  private rasterGroesse = 0;
  private aktuell: Luftbild | null = null;
  private bild: { readonly mesh: THREE.Mesh; readonly material: THREE.MeshBasicMaterial } | null = null;

  constructor(private readonly laden: TexturLader = ladeTextur) {
    this.boden = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ color: BODEN_FARBE }));
    this.boden.rotation.x = -Math.PI / 2;
    this.boden.position.y = BODEN_HOEHEN.boden;
    this.raster = this.baueRaster(40);
    this.wurzel.add(this.boden, this.raster);
    this.passeBodenAn(null);
  }

  /** Kantenlänge des größeren Bodenmaßes (m); danach richten sich Kamera-Reichweite und Zoom. */
  get groesse(): number {
    return this.rasterGroesse;
  }

  get rasterSichtbar(): boolean {
    return this.raster.visible;
  }

  /** Zeigt das Luftbild des Bauwerks (oder keines). Gleiche Instanz wie zuletzt: nichts passiert. */
  zeige(luftbild: Luftbild | null): void {
    if (luftbild === this.aktuell) return;
    const altDaten = this.aktuell?.daten;
    this.aktuell = luftbild;
    this.passeBodenAn(luftbild);
    if (luftbild === null) return this.entferneBild();
    if (this.bild === null || altDaten !== luftbild.daten) this.neuesBild(luftbild);
    this.passeBildAn(luftbild);
  }

  setzeRaster(an: boolean): void {
    this.raster.visible = an;
  }

  /** Vorschau beim Ziehen des Reglers: nur das Material, ohne Verlauf. */
  zeigeDeckkraft(deckkraft: number): void {
    if (this.bild) this.bild.material.opacity = deckkraft;
  }

  /** Ein anderes Bild (oder das erste) deckt das Raster zu: Es ist danach aus. Dasselbe Bild mit anderem Maßstab lässt die Wahl stehen. */
  private neuesBild(luftbild: Luftbild): void {
    this.abraeumen();
    const material = new THREE.MeshBasicMaterial({ map: this.laden(luftbild.daten), transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    mesh.name = 'luftbild';
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = BODEN_HOEHEN.bild;
    mesh.renderOrder = -1;
    this.wurzel.add(mesh);
    this.bild = { mesh, material };
    this.setzeRaster(false);
  }

  private passeBildAn(luftbild: Luftbild): void {
    if (!this.bild) return;
    this.bild.mesh.scale.set(luftbild.breiteM, luftbild.hoeheM, 1);
    this.bild.material.opacity = luftbild.deckkraft;
  }

  private entferneBild(): void {
    this.abraeumen();
    this.setzeRaster(true);
  }

  private abraeumen(): void {
    if (!this.bild) return;
    this.wurzel.remove(this.bild.mesh);
    this.bild.mesh.geometry.dispose();
    this.bild.material.map?.dispose();
    this.bild.material.dispose();
    this.bild = null;
  }

  private passeBodenAn(luftbild: Luftbild | null): void {
    const { breite, tiefe } = bodenGroesse(luftbild);
    this.boden.scale.set(breite, tiefe, 1);
    const kante = Math.max(breite, tiefe);
    if (kante === this.rasterGroesse) return;
    const sichtbar = this.raster.visible;
    this.wurzel.remove(this.raster);
    this.gibRasterFrei(this.raster);
    this.raster = this.baueRaster(kante);
    this.raster.visible = sichtbar;
    this.wurzel.add(this.raster);
  }

  private baueRaster(kante: number): THREE.GridHelper {
    this.rasterGroesse = kante;
    const raster = new THREE.GridHelper(kante, Math.min(Math.round(kante), MAX_RASTER_LINIEN), RASTER_FARBEN[0], RASTER_FARBEN[1]);
    raster.name = 'raster';
    raster.position.y = BODEN_HOEHEN.raster;
    return raster;
  }

  private gibRasterFrei(raster: THREE.GridHelper): void {
    raster.geometry.dispose();
    const materialien = Array.isArray(raster.material) ? raster.material : [raster.material];
    materialien.forEach((m) => m.dispose());
  }
}
