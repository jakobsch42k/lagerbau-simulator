import * as THREE from 'three';
import type { Vec3 } from '../../model/Vec3';
import type { Zelt } from '../../model/Zelt';
import { ZeltGeometrie } from '../../model/ZeltGeometrie';

/** Ein Dreieck aus drei Punkten (lokale Koordinaten, y nach oben). */
export type Dreieck = readonly [THREE.Vector3, THREE.Vector3, THREE.Vector3];

const OHR_AUSZUG = 0.5; // m, die Traufe ist an jeder zweiten Ecke nach außen gezogen (dort greifen die Leinen an)
const OHR_SENKE = 0.05; // m, die Ohren hängen leicht unter der Wandoberkante
const MAX_KANTE = 1.0; // m, längere Kanten der Traufe werden unterteilt
const VORBAU_BREITE = 1.56; // m, = Abstand der Mittelstangen (BZW-Skizze)
const VORBAU_TIEFE = 1.2; // m, Abstand der Eingangsstangen von der Wand (Schätzung nach dem Foto)
const VORBAU_ANSATZ = 0.7; // m, so weit von der Mittelachse sitzt der Vorbau am Dach an
/** Höhe der beiden Eingangsstangen (Zeltstadt: 200 cm, davon einige cm im Boden). */
export const VORBAU_STANGE = 1.9;
/** Lage der Eingangsstangen: x = ±VORBAU_BREITE / 2, z = Breite / 2 + VORBAU_TIEFE. */
export const vorbauStangenX = (): number => VORBAU_BREITE / 2;
export const vorbauStangenZ = (z: Zelt): number => z.params.breite / 2 + VORBAU_TIEFE;

const v = (x: number, y: number, zz: number): THREE.Vector3 => new THREE.Vector3(x, y, zz);

/**
 * Körper des Doppelkegelzelts nach Zeltstadt-Foto und BZW-Skizze: Oval aus zwei Halbkreisen, niedrige Wand, Dach mit
 * First zwischen den Mittelstangen und nach außen gezogenen Ohren an der Traufe, Vorbau an der Längsseite (+z).
 * Erwartet ein Zelt am Ursprung ohne Drehung (lokale Koordinaten).
 */
export class DoppelkegelKoerper {
  private readonly c: number;
  private readonly ring: readonly Vec3[];

  constructor(private readonly z: Zelt) {
    this.c = ZeltGeometrie.kegelHalbachse(z);
    this.ring = this.unterteilt(ZeltGeometrie.umriss(z));
  }

  /** Dach über der Traufe (abwechselnd Wandecke und Ohr) plus Vorbaudach. */
  dach(): Dreieck[] {
    const { wandhoehe } = this.z.params;
    const traufe = this.ring.map((p, k) => this.traufPunkt(p, k % 2 === 1, wandhoehe));
    const dreiecke: Dreieck[] = [];
    traufe.forEach((a, k) => {
      const b = traufe[(k + 1) % traufe.length] as THREE.Vector3;
      const [sa, sb] = [this.spitze(a), this.spitze(b)];
      dreiecke.push([a, b, sb]);
      if (!sa.equals(sb)) dreiecke.push([a, sb, sa]);
    });
    return [...dreiecke, ...this.vorbauDach()];
  }

  /** Niedrige Wand rund um das Oval, dazu die Seitenteile des Vorbaus. */
  wand(): Dreieck[] {
    const { wandhoehe } = this.z.params;
    const wand = this.ring.flatMap((a, k) => {
      const b = this.ring[(k + 1) % this.ring.length] as Vec3;
      const [a0, b0] = [v(a.x, 0, a.z), v(b.x, 0, b.z)];
      return [
        [a0, b0, v(b.x, wandhoehe, b.z)],
        [a0, v(b.x, wandhoehe, b.z), v(a.x, wandhoehe, a.z)],
      ] as Dreieck[];
    });
    return [...wand, ...this.vorbauSeiten()];
  }

  /** Dachhöhe über der Geraden bei Abstand `tiefe` von der Mittelachse (First bis Wandoberkante an der Längsseite). */
  private dachHoehe(tiefe: number): number {
    const { wandhoehe, firsthoehe, breite } = this.z.params;
    return firsthoehe - ((firsthoehe - wandhoehe) * tiefe) / (breite / 2);
  }

  private vorbauDach(): Dreieck[] {
    const [x, zz] = [vorbauStangenX(), vorbauStangenZ(this.z)];
    const hinten = this.dachHoehe(VORBAU_ANSATZ);
    const [a, b, c, d] = [v(-x, hinten, VORBAU_ANSATZ), v(x, hinten, VORBAU_ANSATZ), v(x, VORBAU_STANGE, zz), v(-x, VORBAU_STANGE, zz)];
    return [
      [a, b, c],
      [a, c, d],
    ];
  }

  private vorbauSeiten(): Dreieck[] {
    const zz = vorbauStangenZ(this.z);
    const hinten = this.dachHoehe(VORBAU_ANSATZ);
    const wandZ = this.z.params.breite / 2;
    return [-1, 1].flatMap((s) => {
      const x = (s * VORBAU_BREITE) / 2;
      const [oben, vorn, fuss, wurzel] = [v(x, hinten, VORBAU_ANSATZ), v(x, VORBAU_STANGE, zz), v(x, 0, zz), v(x, 0, wandZ)];
      return [
        [oben, vorn, fuss],
        [oben, fuss, wurzel],
      ] as Dreieck[];
    });
  }

  /** Wandecke bleibt, Ohr wird von der Mittelachse weg nach außen gezogen. */
  private traufPunkt(p: Vec3, ohr: boolean, hoehe: number): THREE.Vector3 {
    if (!ohr) return v(p.x, hoehe, p.z);
    const qx = Math.max(-this.c, Math.min(this.c, p.x));
    const d = Math.max(Math.hypot(p.x - qx, p.z), 1e-9);
    return v(p.x + ((p.x - qx) / d) * OHR_AUSZUG, hoehe - OHR_SENKE, p.z + (p.z / d) * OHR_AUSZUG);
  }

  /** Punkt des Firsts (oder der Mittelstange), an dem die Traufstelle hängt. */
  private spitze(p: THREE.Vector3): THREE.Vector3 {
    return v(Math.max(-this.c, Math.min(this.c, p.x)), this.z.params.firsthoehe, 0);
  }

  private unterteilt(umriss: readonly Vec3[]): Vec3[] {
    return umriss.flatMap((a, k) => {
      const b = umriss[(k + 1) % umriss.length] as Vec3;
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / MAX_KANTE));
      return Array.from({ length: n }, (_, i) => a.add(b.sub(a).scale(i / n)));
    });
  }
}
