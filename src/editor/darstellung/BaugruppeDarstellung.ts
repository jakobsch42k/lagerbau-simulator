import * as THREE from 'three';
import type { Baugruppe } from '../../model/Baugruppe';
import type { Darstellung } from './Darstellung';
import { stangenMesh } from './StangeDarstellung';

/** Dreibein und A-Bock: ein Zylinder je Stange. Jede Stange lässt sich einzeln hervorheben (Hinweise markieren einzelne Stangen). */
export class BaugruppeDarstellung implements Darstellung<Baugruppe> {
  baue(g: Baugruppe): THREE.Group {
    return new THREE.Group().add(...g.stangen().map((s) => stangenMesh(s, g.id, g.art)));
  }
}
