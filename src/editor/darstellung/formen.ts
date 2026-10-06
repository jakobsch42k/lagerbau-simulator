import * as THREE from 'three';
import type { Vec3 } from '../../model/Vec3';

const Y_ACHSE = new THREE.Vector3(0, 1, 0);

/** Zylinder von `von` nach `bis`, z. B. eine Stange oder ein Seil. */
export function zylinder(von: Vec3, bis: Vec3, radius: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, von.distanceTo(bis), 12), material);
  const mitte = von.add(bis).scale(0.5);
  const r = bis.sub(von).normalize();
  mesh.position.set(mitte.x, mitte.y, mitte.z);
  mesh.quaternion.setFromUnitVectors(Y_ACHSE, new THREE.Vector3(r.x, r.y, r.z));
  return mesh;
}

export function kugel(p: Vec3, radius: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material);
  mesh.position.set(p.x, p.y, p.z);
  return mesh;
}
