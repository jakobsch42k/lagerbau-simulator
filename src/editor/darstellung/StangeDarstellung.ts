import * as THREE from 'three';
import type { ArtName } from '../../model/LagerObjekt';
import type { Stange } from '../../model/Stange';
import { alsTeil, type Darstellung } from './Darstellung';
import { zylinder } from './formen';
import { HOLZ, MARKIERT } from './materialien';

/** Eine Stange als Holzzylinder; auch für die Stangen einer Baugruppe (dann mit deren id und Art). */
export function stangenMesh(s: Stange, objektId: string, art: ArtName): THREE.Mesh {
  return alsTeil(zylinder(s.start, s.ende, s.durchmesser / 2, HOLZ), { objektId, teilId: s.id, art, klickbar: true, normal: HOLZ, markiert: MARKIERT });
}

export class StangeDarstellung implements Darstellung<Stange> {
  baue(s: Stange): THREE.Group {
    return new THREE.Group().add(stangenMesh(s, s.id, 'stange'));
  }
}
