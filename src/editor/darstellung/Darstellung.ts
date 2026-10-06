import type * as THREE from 'three';
import type { ArtName, LagerObjekt } from '../../model/LagerObjekt';

/** Was ein Mesh über sich weiß (Spec v3, D2): wem es gehört, welcher Teil es ist, ob es Klicks fängt und wie es hervorgehoben wird. */
export interface TeilDaten {
  readonly objektId: string;
  readonly teilId: string;
  readonly art: ArtName;
  /** Fängt Klicks. Nicht das dünne sichtbare Seil (dafür gibt es den Greifmantel) und nicht die Baumkrone. */
  readonly klickbar: boolean;
  readonly normal: THREE.Material;
  /** Material, wenn der Teil oder sein Objekt markiert oder ausgewählt ist; null: bleibt immer gleich. */
  readonly markiert: THREE.Material | null;
}

/** Baut alle Meshes eines Objekts im Normalzustand. Die Geometrie gehört der Gruppe, die Materialien sind geteilt. */
export interface Darstellung<T extends LagerObjekt = LagerObjekt> {
  baue(o: T): THREE.Group;
}

/** Je Art genau eine Darstellung; der Typ erzwingt, dass eine neue Art eine bekommt. */
export type Darstellungen = Readonly<Record<ArtName, Darstellung>>;

export function alsTeil<M extends THREE.Mesh>(mesh: M, daten: TeilDaten): M {
  mesh.userData.teil = daten;
  return mesh;
}

export function teilDaten(o: THREE.Object3D): TeilDaten | undefined {
  return o.userData.teil as TeilDaten | undefined;
}
