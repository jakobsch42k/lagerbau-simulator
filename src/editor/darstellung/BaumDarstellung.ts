import * as THREE from 'three';
import type { Baum } from '../../model/Baum';
import { alsTeil, type Darstellung } from './Darstellung';
import { KRONE, MARKIERT, STAMM } from './materialien';

export class BaumDarstellung implements Darstellung<Baum> {
  baue(b: Baum): THREE.Group {
    const { durchmesser, hoehe } = b.params;
    const basis = { objektId: b.id, teilId: b.id, art: 'baum' as const };
    const stamm = alsTeil(new THREE.Mesh(new THREE.CylinderGeometry(durchmesser / 2, durchmesser / 2, hoehe, 12), STAMM), {
      ...basis,
      klickbar: true,
      normal: STAMM,
      markiert: MARKIERT,
    });
    stamm.position.set(b.position.x, hoehe / 2, b.position.z);
    // Die Krone fängt wie bisher keine Klicks (offenes Minor aus v2a, docs/ki-lernlog.md) und wird nie hervorgehoben.
    const krone = alsTeil(new THREE.Mesh(new THREE.SphereGeometry(Math.max(1, hoehe * 0.25), 12, 8), KRONE), {
      ...basis,
      klickbar: false,
      normal: KRONE,
      markiert: null,
    });
    krone.position.set(b.position.x, hoehe, b.position.z);
    return new THREE.Group().add(stamm, krone);
  }
}
