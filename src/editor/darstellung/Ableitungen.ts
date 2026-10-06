import * as THREE from 'three';
import type { Bauwerk } from '../../model/Bauwerk';
import { Platzbedarf } from '../../model/Platzbedarf';
import type { Vec3 } from '../../model/Vec3';
import { kugel } from './formen';
import { HARING, PLATZ, SEIL } from './materialien';

/** Was aus dem ganzen Bauwerk abgeleitet wird: Bünde, Haringe und der Platzrahmen (Spec v3, D5). */
export function baueAbleitungen(bauwerk: Bauwerk): THREE.Group {
  const gruppe = new THREE.Group();
  gruppe.name = 'ableitungen';
  for (const b of bauwerk.buende()) gruppe.add(kugel(b.position, 0.07, SEIL));
  for (const h of bauwerk.haringe()) gruppe.add(haringMesh(h.position));
  const platz = Platzbedarf.aus(bauwerk);
  if (platz) gruppe.add(platzRahmen(platz));
  return gruppe;
}

function haringMesh(p: Vec3): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 8), HARING);
  mesh.position.set(p.x, 0.075, p.z);
  mesh.rotation.x = Math.PI; // Spitze nach unten, in den Boden
  return mesh;
}

function platzRahmen(p: Platzbedarf): THREE.LineLoop {
  const y = 0.01; // knapp über dem Boden, damit die Linie nicht flimmert
  const geometrie = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p.minX, y, p.minZ),
    new THREE.Vector3(p.maxX, y, p.minZ),
    new THREE.Vector3(p.maxX, y, p.maxZ),
    new THREE.Vector3(p.minX, y, p.maxZ),
  ]);
  const rahmen = new THREE.LineLoop(geometrie, PLATZ);
  rahmen.computeLineDistances();
  return rahmen;
}
