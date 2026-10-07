import * as THREE from 'three';
import type { Zelt } from '../../model/Zelt';
import type { Darstellung } from './Darstellung';

/** Platzhalter bis Chunk B (Spec E4, D4): eine leere Gruppe, damit das Register vollständig ist. */
export class ZeltDarstellung implements Darstellung<Zelt> {
  baue(_o: Zelt): THREE.Group {
    return new THREE.Group();
  }
}
