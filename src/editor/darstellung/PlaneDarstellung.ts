import * as THREE from 'three';
import type { Plane } from '../../model/Plane';
import { alsTeil, type Darstellung } from './Darstellung';
import { PLANE, PLANE_MARKIERT } from './materialien';

/** Jede Fläche als zwei Dreiecke. Ein Mesh pro Plane, damit ein Klick sie als Ganzes trifft. */
export class PlaneDarstellung implements Darstellung<Plane> {
  baue(p: Plane): THREE.Group {
    const ecken = p.flaechen.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]);
    const geometrie = new THREE.BufferGeometry().setFromPoints(ecken.map((v) => new THREE.Vector3(v.x, v.y, v.z)));
    geometrie.computeVertexNormals();
    const mesh = alsTeil(new THREE.Mesh(geometrie, PLANE), { objektId: p.id, teilId: p.id, art: 'plane', klickbar: true, normal: PLANE, markiert: PLANE_MARKIERT });
    return new THREE.Group().add(mesh);
  }
}
