import * as THREE from 'three';
import type { Zone } from '../../model/Zone';
import { BODEN_HOEHEN } from '../Bodenbild';
import { flaechenGeometrie } from './bodenformen';
import { alsTeil, type Darstellung } from './Darstellung';
import { ZONE_MARKIERT } from './materialien';
import { textSprite } from './textSprite';

const NAME_HOEHE = 0.5; // m, Schrifthöhe des Namens in der Mitte
const NAME_Y = 0.3; // m über dem Boden

/**
 * Eine flache, durchscheinende Fläche bei y = 0,005 (Spec E3, D1), also über Bild und Raster und unter allem, was darauf steht.
 * Der Name steht in der Mitte des umschließenden Rechtecks und hängt am Schalter „Beschriftungen zeigen“.
 */
export class ZoneDarstellung implements Darstellung<Zone> {
  baue(z: Zone): THREE.Group {
    const { name, farbe, deckkraft } = z.params;
    const material = new THREE.MeshBasicMaterial({
      color: farbe,
      transparent: true,
      opacity: deckkraft / 100,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const flaeche = alsTeil(new THREE.Mesh(flaechenGeometrie(z.punkte), material), {
      objektId: z.id,
      teilId: z.id,
      art: 'zone',
      klickbar: true,
      normal: material,
      markiert: ZONE_MARKIERT,
    });
    flaeche.userData.eigenesMaterial = true;
    flaeche.position.y = BODEN_HOEHEN.zone;
    const mitte = z.drehpunkt();
    const beschriftung = textSprite(name, '#1d2733', NAME_HOEHE);
    beschriftung.position.set(mitte.x, NAME_Y, mitte.z);
    return new THREE.Group().add(flaeche, beschriftung);
  }
}
