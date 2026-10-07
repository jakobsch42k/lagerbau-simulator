import * as THREE from 'three';
import { Vec3 } from '../../model/Vec3';
import { Zelt } from '../../model/Zelt';
import { ZeltGeometrie } from '../../model/ZeltGeometrie';
import { alsTeil, type Darstellung } from './Darstellung';
import { HARING, ZELT_MARKIERT } from './materialien';
import { kontrast, ton, TeilBauer } from './teilBauer';
import { DoppelkegelKoerper, type Dreieck } from './doppelkegelKoerper';
import { textSprite } from './textSprite';
import { WAENDE, wandSektor, ZeltZubehoer } from './zeltKoerper';

const HARING_HOEHE = 0.3; // m
const HARING_RADIUS = 0.03; // m
const NAME_HOEHE = 0.5; // m, Schrifthöhe des Namens über dem Zelt
const NAME_ABSTAND = 0.1; // m zwischen Dachspitze und Namen
const SEIL_FARBE = 0xf0e6c8; // hell, hebt sich von Dach, Wiese und Haringen ab
const WAND_TON = 1.15; // Wände etwas heller als das Dach
const KANTEN_WINKEL = 5; // Grad: ab hier zeichnet die Kantenlinie eine Kante

type Ecken = readonly [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];

const punkt = (p: Vec3, y: number): THREE.Vector3 => new THREE.Vector3(p.x, y, p.z);

const geometrie = (dreiecke: readonly Dreieck[]): THREE.BufferGeometry => {
  const g = new THREE.BufferGeometry().setFromPoints(dreiecke.flat());
  g.computeVertexNormals();
  return g;
};

/** Ein senkrechtes Rechteck zwischen zwei Umrisspunkten, von y = 0 bis `hoehe`. */
const wandStueck = (a: Vec3, b: Vec3, hoehe: number): Dreieck[] => [
  [punkt(a, 0), punkt(b, 0), punkt(b, hoehe)],
  [punkt(a, 0), punkt(b, hoehe), punkt(a, hoehe)],
];

/**
 * Vereinfachter Körper eines Zelts (Spec E4, D4): Dach und Wände in der Farbe des Zelts, dazu Haringe und Abspannseile.
 * Alles liegt in einer Gruppe und wird nur neu gebaut, wenn sich das Zelt ändert. Gebaut wird in lokalen Koordinaten
 * (Zelt am Ursprung, ungedreht); die innere Gruppe trägt Position und Drehung.
 */
export class ZeltDarstellung implements Darstellung<Zelt> {
  baue(o: Zelt): THREE.Group {
    const lokal = new Zelt(o.id, Vec3.NULL, o.params);
    const bauer = new TeilBauer(o.id, 'zelt', ZELT_MARKIERT);
    const koerper = new THREE.Group();
    koerper.position.set(o.position.x, 0, o.position.z);
    // Wie Baugruppe.drehung: positiv dreht x nach z, in three.js ist das eine negative Drehung um y.
    koerper.rotation.y = -o.drehungRad;
    const [dach, ...waende] = this.teile(lokal);
    const wandFarbe = ton(o.params.farbe, WAND_TON);
    [dach, ...waende].forEach((dreiecke, i) => {
      const geo = geometrie(dreiecke ?? []);
      koerper.add(bauer.mesh(geo, i === 0 ? o.params.farbe : wandFarbe, THREE.DoubleSide), this.kanten(geo, o.id, o.params.farbe));
    });
    koerper.add(...new ZeltZubehoer(lokal, bauer).alle());
    koerper.add(...this.haringe(lokal));
    const seile = this.seile(lokal);
    if (seile) koerper.add(seile);
    const beschriftung = textSprite(o.params.name, '#1d2733', NAME_HOEHE);
    beschriftung.position.set(o.position.x, o.params.firsthoehe + NAME_ABSTAND + NAME_HOEHE / 2, o.position.z);
    return new THREE.Group().add(koerper, beschriftung);
  }

  /** Dach zuerst, dann die Wände (rund: Wand 1 bis 3, nur die eingeschalteten). */
  private teile(z: Zelt): Dreieck[][] {
    const { aufbau, waende, wandhoehe } = z.params;
    const umriss = ZeltGeometrie.umriss(z);
    const naechster = (k: number): Vec3 => umriss[(k + 1) % umriss.length] as Vec3;
    if (aufbau === 'rund') {
      const sektoren: Dreieck[][] = Array.from({ length: WAENDE }, () => []);
      umriss.forEach((a, k) => {
        const sektor = wandSektor(k, umriss.length);
        sektoren[sektor]?.push(...wandStueck(a, naechster(k), wandhoehe));
      });
      return [this.rundesDach(z, umriss), ...sektoren.filter((s, i) => waende[i] && s.length > 0)];
    }
    if (aufbau === 'doppelkegel') {
      const kegel = new DoppelkegelKoerper(z);
      return [kegel.dach(), kegel.wand()];
    }
    const wand = umriss.flatMap((a, k) => wandStueck(a, naechster(k), wandhoehe));
    return [this.satteldach(z, umriss), wand];
  }

  /** Dunkle Kanten (Rippen, First, Trauf, Wandecken) als Linien, nicht klickbar. */
  private kanten(geo: THREE.BufferGeometry, id: string, farbe: string): THREE.LineSegments {
    const material = new THREE.LineBasicMaterial({ color: kontrast(farbe) });
    const linien = new THREE.LineSegments(new THREE.EdgesGeometry(geo, KANTEN_WINKEL), material);
    linien.userData.eigenesMaterial = true;
    return alsTeil(linien, { objektId: id, teilId: id, art: 'zelt', klickbar: false, normal: material, markiert: null });
  }

  private rundesDach(z: Zelt, umriss: readonly Vec3[]): Dreieck[] {
    const spitze = new THREE.Vector3(0, z.params.firsthoehe, 0);
    return umriss.map((a, k) => [punkt(a, z.params.wandhoehe), punkt(umriss[(k + 1) % umriss.length] as Vec3, z.params.wandhoehe), spitze]);
  }

  /** Traufecken des Rechtecks: (l/2, b/2), (-l/2, b/2), (-l/2, -b/2), (l/2, -b/2). */
  private ecken(z: Zelt, umriss: readonly Vec3[]): Ecken {
    return umriss.map((p) => punkt(p, z.params.wandhoehe)) as unknown as Ecken;
  }

  /** First entlang der Länge. */
  private satteldach(z: Zelt, umriss: readonly Vec3[]): Dreieck[] {
    const [c0, c1, c2, c3] = this.ecken(z, umriss);
    const vorn = new THREE.Vector3(c0.x, z.params.firsthoehe, 0);
    const hinten = new THREE.Vector3(c1.x, z.params.firsthoehe, 0);
    return [
      [c0, c1, hinten],
      [c0, hinten, vorn],
      [c2, c3, vorn],
      [c2, vorn, hinten],
      [c1, c2, hinten],
      [c3, c0, vorn],
    ];
  }

  private haringe(z: Zelt): THREE.Mesh[] {
    const zylinder = new THREE.CylinderGeometry(HARING_RADIUS, HARING_RADIUS, HARING_HOEHE, 8);
    return ZeltGeometrie.haringe(z).map((p) => {
      const mesh = new THREE.Mesh(zylinder, HARING);
      mesh.position.set(p.x, HARING_HOEHE / 2, p.z);
      return alsTeil(mesh, { objektId: z.id, teilId: z.id, art: 'zelt', klickbar: false, normal: HARING, markiert: null });
    });
  }

  /** Je Haring eine Linie zu dem Punkt der Traufe, den man von dort in Richtung Zeltmitte erreicht. */
  private seile(z: Zelt): THREE.LineSegments | null {
    const haringe = ZeltGeometrie.haringe(z);
    if (haringe.length === 0) return null;
    const punkte = haringe.flatMap((h) => {
      const ziel = this.traufPunkt(z, h);
      return [new THREE.Vector3(h.x, HARING_HOEHE, h.z), new THREE.Vector3(ziel.x, z.params.wandhoehe, ziel.z)];
    });
    const material = new THREE.LineBasicMaterial({ color: SEIL_FARBE });
    const linien = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(punkte), material);
    linien.userData.eigenesMaterial = true;
    linien.userData.rolle = 'seil';
    return alsTeil(linien, { objektId: z.id, teilId: z.id, art: 'zelt', klickbar: false, normal: material, markiert: null });
  }

  /** Punkt der Traufe, den man vom Haring in Richtung Zeltmitte erreicht (rund: Kreis, Doppelkegel: Oval, sonst Rechteckrand). */
  private traufPunkt(z: Zelt, h: Vec3): { x: number; z: number } {
    const { aufbau, durchmesser, laenge, breite } = z.params;
    if (aufbau === 'doppelkegel') {
      const c = ZeltGeometrie.kegelHalbachse(z);
      const qx = Math.max(-c, Math.min(c, h.x));
      const d = Math.max(Math.hypot(h.x - qx, h.z), 1e-9);
      return { x: qx + ((h.x - qx) / d) * (breite / 2), z: (h.z / d) * (breite / 2) };
    }
    const t =
      aufbau === 'rund'
        ? durchmesser / 2 / Math.hypot(h.x, h.z)
        : Math.min(laenge / 2 / Math.max(Math.abs(h.x), 1e-9), breite / 2 / Math.max(Math.abs(h.z), 1e-9));
    return { x: h.x * t, z: h.z * t };
  }
}
