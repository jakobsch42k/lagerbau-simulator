import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Luftbild } from '../model/Luftbild';
import { Bodenbild, BODEN_HOEHEN } from './Bodenbild';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const JPG = 'data:image/jpeg;base64,/9j/4AAQ';
const bild = (daten = PNG, mpp = 0.5, deckkraft = 1): Luftbild => new Luftbild(daten, 200, 100, mpp, deckkraft);

function frisch() {
  const lader = vi.fn((_daten: string) => new THREE.Texture());
  const b = new Bodenbild(lader);
  const bildMesh = (): THREE.Mesh | undefined => b.wurzel.children.find((k) => k.name === 'luftbild') as THREE.Mesh | undefined;
  const material = (): THREE.MeshBasicMaterial => bildMesh()?.material as THREE.MeshBasicMaterial;
  const raster = (): THREE.Object3D => b.wurzel.children.find((k) => k.name === 'raster') as THREE.Object3D;
  return { b, lader, bildMesh, material, raster };
}

describe('Bodenbild (Spec E2, D3)', () => {
  it('zeigt ohne Luftbild den 40 × 40 m großen Boden mit Raster', () => {
    const { b, bildMesh, raster } = frisch();
    expect(bildMesh()).toBeUndefined();
    expect([b.boden.scale.x, b.boden.scale.y]).toEqual([40, 40]);
    expect(raster().visible).toBe(true);
    expect(b.groesse).toBe(40);
  });

  it('legt das Bild mittig auf den Ursprung, Norden oben (−z), in Bildgröße und mit der Deckkraft', () => {
    const { b, bildMesh, material } = frisch();
    b.zeige(bild(PNG, 0.5, 0.4));
    const m = bildMesh()!;
    expect([m.scale.x, m.scale.y]).toEqual([100, 50]);
    expect(material().opacity).toBe(0.4);
    expect(material().transparent).toBe(true);
    // Die Oberkante des Bildes (+y der Fläche) zeigt nach Norden (−z), die Fläche selbst nach oben.
    const oben = new THREE.Vector3(0, 1, 0).applyEuler(m.rotation);
    const normale = new THREE.Vector3(0, 0, 1).applyEuler(m.rotation);
    expect([oben.x, oben.y, oben.z].map((v) => Math.round(v) + 0)).toEqual([0, 0, -1]);
    expect([normale.x, normale.y, normale.z].map((v) => Math.round(v) + 0)).toEqual([0, 1, 0]);
    expect([m.position.x, m.position.z]).toEqual([0, 0]);
    expect(m.position.y).toBeGreaterThan(0);
  });

  it('die Bodenfläche wächst mit dem Bild: mindestens Bild + 20 m', () => {
    const { b } = frisch();
    b.zeige(bild(PNG, 0.5));
    expect([b.boden.scale.x, b.boden.scale.y]).toEqual([120, 70]);
    expect(b.groesse).toBe(120);
    b.zeige(bild(PNG, 0.01));
    expect([b.boden.scale.x, b.boden.scale.y]).toEqual([40, 40]);
    expect(b.groesse).toBe(40);
  });

  it('das Raster ist mit Bild zunächst aus, lässt sich umschalten und kommt ohne Bild zurück', () => {
    const { b, raster } = frisch();
    b.zeige(bild());
    expect(raster().visible).toBe(false);
    expect(b.rasterSichtbar).toBe(false);
    b.setzeRaster(true);
    expect(raster().visible).toBe(true);
    b.zeige(bild(PNG, 0.4)); // anderer Maßstab, dasselbe Bild: Der Schalter bleibt
    expect(raster().visible).toBe(true);
    b.zeige(null);
    expect(raster().visible).toBe(true);
    b.zeige(bild());
    expect(raster().visible).toBe(false);
  });

  it('baut die Textur nur neu, wenn sich das Bild ändert, nicht bei Maßstab und Deckkraft', () => {
    const { b, lader, bildMesh, material } = frisch();
    const l = bild();
    b.zeige(l);
    b.zeige(l);
    expect(lader).toHaveBeenCalledTimes(1);
    const textur = material().map;
    b.zeige(l.mitMassstab(0.25).mitDeckkraft(0.3));
    expect(lader).toHaveBeenCalledTimes(1);
    expect(material().map).toBe(textur);
    expect([bildMesh()!.scale.x, bildMesh()!.scale.y]).toEqual([50, 25]);
    expect(material().opacity).toBe(0.3);
    b.zeige(bild(JPG));
    expect(lader).toHaveBeenCalledTimes(2);
    expect(lader).toHaveBeenLastCalledWith(JPG);
  });

  it('gibt die alte Textur frei und entfernt das Bild mit null', () => {
    const { b, bildMesh, material } = frisch();
    b.zeige(bild());
    const frei = vi.spyOn(material().map!, 'dispose');
    b.zeige(bild(JPG));
    expect(frei).toHaveBeenCalled();
    b.zeige(null);
    expect(bildMesh()).toBeUndefined();
  });

  it('die Vorschau der Deckkraft ändert nur das Material, und ohne Bild nichts', () => {
    const { b, material } = frisch();
    expect(() => b.zeigeDeckkraft(0.5)).not.toThrow();
    b.zeige(bild());
    b.zeigeDeckkraft(0.25);
    expect(material().opacity).toBe(0.25);
  });

  it('schichtet Boden < Bild < Raster; Zonen (E3, y = 0,005) und Planen liegen darüber', () => {
    expect(BODEN_HOEHEN.boden).toBeLessThan(BODEN_HOEHEN.bild);
    expect(BODEN_HOEHEN.bild).toBeLessThan(BODEN_HOEHEN.raster);
    expect(BODEN_HOEHEN.raster).toBeLessThan(0.005);
    expect(BODEN_HOEHEN.bild).toBeLessThanOrEqual(0.001);
    expect(BODEN_HOEHEN.boden).toBeLessThanOrEqual(-0.05);
    const { b, bildMesh, raster } = frisch();
    b.zeige(bild());
    expect(b.boden.position.y).toBe(BODEN_HOEHEN.boden);
    expect(bildMesh()!.position.y).toBe(BODEN_HOEHEN.bild);
    expect(raster().position.y).toBe(BODEN_HOEHEN.raster);
    b.zeige(bild(PNG, 2)); // Raster wird neu gebaut
    expect(raster().position.y).toBe(BODEN_HOEHEN.raster);
  });

  it('zeichnet das Raster nicht über 3D-Objekte (Tiefentest an) und das Bild nicht in die Tiefe', () => {
    const { b, material, raster } = frisch();
    b.zeige(bild());
    const m = (raster() as THREE.GridHelper).material as THREE.Material;
    expect(m.depthTest).toBe(true);
    expect(material().depthWrite).toBe(false);
    expect(material().polygonOffset).toBe(true);
  });

  it('gibt beim Neubau des Rasters auch dessen Material frei', () => {
    const { b, raster } = frisch();
    const altMaterial = (raster() as THREE.GridHelper).material as THREE.Material;
    const frei = vi.spyOn(altMaterial, 'dispose');
    b.zeige(bild());
    expect(frei).toHaveBeenCalled();
  });
});
