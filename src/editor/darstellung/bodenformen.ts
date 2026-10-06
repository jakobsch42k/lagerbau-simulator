import * as THREE from 'three';
import type { Vec3 } from '../../model/Vec3';

/** Segmente je Kreisscheibe an den Knicken eines Wegs. */
const KNICK_SEGMENTE = 24;

/** Dreiecke in der x/z-Ebene bei y = 0 (die Höhe setzt das Mesh über `position.y`, damit sie exakt bleibt). `dreiecke` sind Punktetripel. */
function ausDreiecken(dreiecke: readonly (readonly [number, number])[]): THREE.BufferGeometry {
  const lage = dreiecke.flatMap(([x, z]) => [x, 0, z]);
  const geometrie = new THREE.BufferGeometry();
  geometrie.setAttribute('position', new THREE.Float32BufferAttribute(lage, 3));
  geometrie.computeVertexNormals();
  return geometrie;
}

/** Eine ebene Fläche aus einem einfachen Vieleck (auch konkav), in n - 2 Dreiecke zerlegt. */
export function flaechenGeometrie(punkte: readonly Vec3[]): THREE.BufferGeometry {
  const kontur = punkte.map((p) => new THREE.Vector2(p.x, p.z));
  const dreiecke = THREE.ShapeUtils.triangulateShape(kontur, []);
  return ausDreiecken(dreiecke.flatMap((t) => t.map((i): [number, number] => [(punkte[i] as Vec3).x, (punkte[i] as Vec3).z])));
}

/** Ein Band der Breite `breite` entlang eines Linienzugs: je Abschnitt ein Rechteck, an Knicken eine Kreisscheibe, damit keine Lücke bleibt. */
export function bandGeometrie(punkte: readonly Vec3[], breite: number): THREE.BufferGeometry {
  const halb = breite / 2;
  const dreiecke: [number, number][] = [];
  for (let i = 1; i < punkte.length; i++) {
    const a = punkte[i - 1] as Vec3;
    const b = punkte[i] as Vec3;
    const laenge = a.distanceTo(b);
    if (laenge === 0) continue;
    const nx = (-(b.z - a.z) / laenge) * halb;
    const nz = ((b.x - a.x) / laenge) * halb;
    const [a1, a2, b1, b2]: [number, number][] = [
      [a.x + nx, a.z + nz],
      [a.x - nx, a.z - nz],
      [b.x + nx, b.z + nz],
      [b.x - nx, b.z - nz],
    ];
    dreiecke.push(a1, a2, b1, b1, a2, b2);
  }
  for (const p of punkte.slice(1, -1)) dreiecke.push(...scheibe(p, halb));
  return ausDreiecken(dreiecke);
}

function scheibe(mitte: Vec3, radius: number): [number, number][] {
  const rand = (k: number): [number, number] => {
    const w = (k * 2 * Math.PI) / KNICK_SEGMENTE;
    return [mitte.x + radius * Math.cos(w), mitte.z + radius * Math.sin(w)];
  };
  return Array.from({ length: KNICK_SEGMENTE }, (_, k): [number, number][] => [[mitte.x, mitte.z], rand(k), rand(k + 1)]).flat();
}
