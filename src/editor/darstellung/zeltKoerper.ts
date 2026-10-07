import * as THREE from 'three';
import type { Vec3 } from '../../model/Vec3';
import type { Zelt } from '../../model/Zelt';
import { ZeltGeometrie } from '../../model/ZeltGeometrie';
import { VORBAU_STANGE, vorbauStangenX, vorbauStangenZ } from './doppelkegelKoerper';
import { kontrast, type TeilBauer } from './teilBauer';

/** Anzahl der Wandsektoren eines runden Zelts (Wand 1 bis 3). */
export const WAENDE = 3;
const BAND_HOEHE = 0.1; // m, Trauf- und Sockelband
const BAND_TIEFE = 0.06; // m
const KAPPE_RADIUS = 0.3; // m
const KAPPE_ANTEIL = 0.5; // Höhe der Kappe im Verhältnis zur Dachneigung: flacher als das Dach, damit sie nicht darin verschwindet
const STANGE = 0.06; // m, Kantenlänge der Giebelstangen
const FIRST_HOEHE = 0.07; // m
const FIRST_TIEFE = 0.09; // m
const GIEBEL_ABSTAND = 0.03; // m, die Stangen stehen knapp vor dem Giebel

/** Welcher Wandsektor (0 bis 2) zur k-ten Seite des Umrisses gehört. */
export const wandSektor = (k: number, seiten: number): number => Math.min(WAENDE - 1, Math.floor(((k + 0.5) / seiten) * WAENDE));

/**
 * Zubehör eines Zelts aus einfachen Körpern (Spec E4, Chunk D): Trauf- und Sockelband, Dachkappen, beim Satteldach Firstbalken
 * und Giebelstangen. Rechnet in lokalen Koordinaten (Zelt am Ursprung, ungedreht). Die Höhe `firsthoehe` wird nie überschritten.
 */
export class ZeltZubehoer {
  private readonly umriss: readonly Vec3[];
  private readonly dunkel: THREE.Color;

  constructor(
    private readonly z: Zelt,
    private readonly bauer: TeilBauer,
  ) {
    this.umriss = ZeltGeometrie.umriss(z);
    this.dunkel = kontrast(z.params.farbe);
  }

  alle(): THREE.Mesh[] {
    return [...this.baender(), ...this.kappen(), ...this.stangen()];
  }

  /** Band am Dachrand rundum; Sockelband am Boden nur dort, wo eine Wand steht. */
  private baender(): THREE.Mesh[] {
    const { aufbau, waende, wandhoehe } = this.z.params;
    const meshes: THREE.Mesh[] = [];
    this.umriss.forEach((a, k) => {
      const b = this.umriss[(k + 1) % this.umriss.length] as Vec3;
      meshes.push(this.band(a, b, wandhoehe));
      if (aufbau !== 'rund' || waende[wandSektor(k, this.umriss.length)]) meshes.push(this.band(a, b, BAND_HOEHE / 2));
    });
    return meshes;
  }

  private band(a: Vec3, b: Vec3, y: number): THREE.Mesh {
    const laenge = Math.hypot(b.x - a.x, b.z - a.z) + BAND_TIEFE;
    const m = this.bauer.mesh(new THREE.BoxGeometry(laenge, BAND_HOEHE, BAND_TIEFE), this.dunkel);
    m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
    m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    return m;
  }

  /** Kleine Kappe auf der Dachspitze, beim Doppelkegel auf beiden Spitzen. */
  private kappen(): THREE.Mesh[] {
    const { aufbau, breite, durchmesser, wandhoehe, firsthoehe } = this.z.params;
    if (aufbau === 'sattel' || firsthoehe <= wandhoehe) return [];
    const c = ZeltGeometrie.kegelHalbachse(this.z);
    const spitzen = aufbau === 'rund' ? [0] : [c, -c];
    const lauf = aufbau === 'rund' ? durchmesser / 2 : breite / 2;
    const hoehe = Math.max(0.04, (KAPPE_ANTEIL * KAPPE_RADIUS * (firsthoehe - wandhoehe)) / lauf);
    return spitzen.map((x) => {
      const m = this.bauer.mesh(new THREE.ConeGeometry(KAPPE_RADIUS, hoehe, 12), this.dunkel);
      m.position.set(x, firsthoehe - hoehe / 2, 0);
      return m;
    });
  }

  /** Satteldach: Firstbalken und je eine Stange vor den beiden Giebeln. */
  private stangen(): THREE.Mesh[] {
    const { aufbau, laenge, firsthoehe } = this.z.params;
    if (aufbau === 'doppelkegel') return this.eingangsStangen();
    if (aufbau !== 'sattel') return [];
    const first = this.bauer.mesh(new THREE.BoxGeometry(laenge, FIRST_HOEHE, FIRST_TIEFE), this.dunkel);
    first.position.set(0, firsthoehe - FIRST_HOEHE / 2, 0);
    const stangen = [1, -1].map((s) => {
      const m = this.bauer.mesh(new THREE.BoxGeometry(STANGE, firsthoehe, STANGE), this.dunkel);
      m.position.set((s * laenge) / 2 + s * GIEBEL_ABSTAND, firsthoehe / 2, 0);
      return m;
    });
    return [first, ...stangen];
  }

  /** Doppelkegel: Firststange zwischen den Mittelstangen und die beiden Eingangsstangen des Vorbaus. */
  private eingangsStangen(): THREE.Mesh[] {
    const c = ZeltGeometrie.kegelHalbachse(this.z);
    const first = this.bauer.mesh(new THREE.BoxGeometry(2 * c, FIRST_HOEHE, FIRST_TIEFE), this.dunkel);
    first.position.set(0, this.z.params.firsthoehe - FIRST_HOEHE / 2, 0);
    const stangen = [1, -1].map((s) => {
      const m = this.bauer.mesh(new THREE.BoxGeometry(STANGE, VORBAU_STANGE, STANGE), this.dunkel);
      m.position.set(s * vorbauStangenX(), VORBAU_STANGE / 2, vorbauStangenZ(this.z));
      return m;
    });
    return [first, ...stangen];
  }
}
