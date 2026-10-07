import * as THREE from 'three';
import type { PlatzobjektParams } from '../../model/params';
import { UNSICHTBAR } from './materialien';
import { kontrast, ton, type TeilBauer } from './teilBauer';

/** Unter dieser Höhe (m) bleibt jedes Objekt ein einfacher Körper: für Einzelheiten ist kein Platz. */
export const MIN_DETAIL_HOEHE = 0.1;
const SEGMENTE = 24;
const STEIN_FARBE = 0x8a8a8a;
const ASCHE_FARBE = 0x3b302a;
const GOLD = 0xd4a017;
const TUER_FARBE = 0x4a3524;
const SCHEIT_FARBE = 0x6b4226;

/** Meshes eines Platz-Objekts in lokalen Koordinaten (Mitte am Ursprung, Boden bei y = 0, Oberkante bei y = h). */
type Bau = (p: PlatzobjektParams, h: number, bauer: TeilBauer) => THREE.Object3D[];

const zylinder = (r: number, h: number): THREE.CylinderGeometry => new THREE.CylinderGeometry(r, r, h, SEGMENTE);
const setze = <M extends THREE.Object3D>(m: M, x: number, y: number, z: number): M => {
  m.position.set(x, y, z);
  return m;
};

/** Einfacher Körper (Zylinder oder Quader) in der Farbe des Objekts: für „Eigenes“ und alles, was keine eigene Form hat. */
const einfach: Bau = (p, h, bauer) => {
  const geo = p.form === 'kreis' ? zylinder(p.breite / 2, h) : new THREE.BoxGeometry(p.breite, h, p.laenge);
  return [setze(bauer.mesh(geo, p.farbe), 0, h / 2, 0)];
};

/** Steinring mit Aschebett, drei Scheiten und Flamme in der Farbe des Objekts. */
const feuerstelle: Bau = (p, h, bauer) => {
  const r = p.breite / 2;
  const dick = r * 0.28;
  const innen = r - dick;
  const n = Math.max(8, Math.round((Math.PI * r) / 0.25));
  const breiteStein = ((2 * Math.PI * (r - dick / 2)) / n) * 0.85;
  const stein = new THREE.BoxGeometry(dick, h, breiteStein);
  // Mittelradius so, dass auch die Außenecken der Steine im Kreis bleiben.
  const mitte = Math.sqrt(r * r - (breiteStein / 2) ** 2) - dick / 2;
  const teile: THREE.Object3D[] = [];
  for (let k = 0; k < n; k++) {
    const w = (2 * Math.PI * k) / n;
    const s = bauer.mesh(stein, k % 2 ? STEIN_FARBE : ton(STEIN_FARBE, 0.85));
    s.rotation.y = -w;
    teile.push(setze(s, Math.cos(w) * mitte, h / 2, Math.sin(w) * mitte));
  }
  const asche = h * 0.35;
  teile.push(setze(bauer.mesh(zylinder(innen, asche), ASCHE_FARBE), 0, asche / 2, 0));
  const dm = Math.min(h * 0.2, innen * 0.25);
  for (let k = 0; k < 3; k++) {
    const m = bauer.mesh(zylinder(dm, innen * 1.6), SCHEIT_FARBE);
    m.rotation.order = 'YXZ';
    m.rotation.y = (k * Math.PI) / 3;
    m.rotation.z = Math.PI / 2;
    teile.push(setze(m, 0, asche + dm, 0));
  }
  const flamme = h - asche - dm;
  for (const [x, z, f] of [[0, 0, 1], [0.35, 0.1, 0.65], [-0.2, -0.3, 0.7]] as const) {
    const kegel = bauer.mesh(new THREE.ConeGeometry(innen * 0.28, flamme * f, 8), p.farbe);
    teile.push(setze(kegel, x * innen, h - (flamme * f) / 2, z * innen));
  }
  return teile;
};

/** Gemauerter Rand mit Wasserfläche in der Farbe des Objekts. */
const wasserstelle: Bau = (p, h, bauer) => {
  const r = p.breite / 2;
  const dick = r * 0.15;
  const rand = bauer.mesh(new THREE.CylinderGeometry(r, r, h, SEGMENTE, 1, true), STEIN_FARBE, THREE.DoubleSide);
  const deckel = bauer.mesh(new THREE.RingGeometry(r - dick, r, SEGMENTE), ton(STEIN_FARBE, 1.2), THREE.DoubleSide);
  deckel.rotation.x = -Math.PI / 2;
  const wasser = bauer.mesh(new THREE.CircleGeometry(r - dick, SEGMENTE), p.farbe, THREE.DoubleSide);
  wasser.rotation.x = -Math.PI / 2;
  return [setze(rand, 0, h / 2, 0), setze(deckel, 0, h, 0), setze(wasser, 0, h * 0.9, 0)];
};

/** Mast: Steinsockel, nach oben schlanker, goldener Knauf. Alles innerhalb des Durchmessers. */
const fahnenmast: Bau = (p, h, bauer) => {
  const r = p.breite / 2;
  const sockel = Math.min(0.2, h * 0.1);
  const knauf = r * 0.7;
  const mast = h - sockel;
  return [
    setze(bauer.mesh(zylinder(r, sockel), STEIN_FARBE), 0, sockel / 2, 0),
    setze(bauer.mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.8, mast, 12), p.farbe), 0, sockel + mast / 2, 0),
    setze(bauer.mesh(new THREE.SphereGeometry(knauf, 12, 8), GOLD), 0, h - knauf, 0),
  ];
};

/** Häuschen mit Satteldach (First entlang der Länge) und Tür an der +z-Seite. */
const latrine: Bau = (p, h, bauer) => {
  const wand = h * 0.72;
  const dach = h - wand;
  const profil = new THREE.Shape([new THREE.Vector2(-p.breite / 2, 0), new THREE.Vector2(p.breite / 2, 0), new THREE.Vector2(0, dach)]);
  const prisma = new THREE.ExtrudeGeometry(profil, { depth: p.laenge, bevelEnabled: false });
  prisma.translate(0, 0, -p.laenge / 2);
  const tuerH = wand * 0.8;
  return [
    setze(bauer.mesh(new THREE.BoxGeometry(p.breite, wand, p.laenge), p.farbe), 0, wand / 2, 0),
    setze(bauer.mesh(prisma, kontrast(p.farbe)), 0, wand, 0),
    setze(bauer.mesh(new THREE.BoxGeometry(p.breite * 0.35, tuerH, 0.02), TUER_FARBE), 0, tuerH / 2, p.laenge / 2 - 0.01),
  ];
};

/** Palette mit Rundholz-Lagen (Stämme entlang der Breite) in zwei Holztönen; unsichtbarer Klickkörper über den ganzen Quader. */
const holzlager: Bau = (p, h, bauer) => {
  const pal = Math.min(0.1, h * 0.1);
  const stapel = h - pal;
  const lagen = Math.min(8, Math.max(1, Math.round(stapel / 0.25)));
  const r = stapel / (2 * lagen);
  const proLage = Math.max(1, Math.min(60, Math.floor(p.laenge / (2 * r))));
  const abstand = p.laenge / proLage;
  const stamm = zylinder(r, p.breite);
  const teile: THREE.Object3D[] = [setze(bauer.mesh(new THREE.BoxGeometry(p.breite, pal, p.laenge), ton(p.farbe, 0.6)), 0, pal / 2, 0)];
  for (let l = 0; l < lagen; l++) {
    for (let k = 0; k < proLage; k++) {
      const m = bauer.mesh(stamm, (k + l) % 2 ? p.farbe : ton(p.farbe, 1.18));
      m.rotation.z = Math.PI / 2;
      teile.push(setze(m, 0, pal + r + 2 * r * l, -p.laenge / 2 + abstand * (k + 0.5)));
    }
  }
  teile.push(setze(bauer.klickKoerper(new THREE.BoxGeometry(p.breite, h, p.laenge), UNSICHTBAR), 0, h / 2, 0));
  return teile;
};

/** Eigene Gestalt je Vorlage; sie gilt nur in der Form der Vorlage (ein Holzlager als Kreis ist ein einfacher Zylinder). */
const BAUER: Readonly<Record<string, { readonly form: 'kreis' | 'rechteck'; readonly bau: Bau }>> = {
  feuerstelle: { form: 'kreis', bau: feuerstelle },
  wasserstelle: { form: 'kreis', bau: wasserstelle },
  fahnenmast: { form: 'kreis', bau: fahnenmast },
  latrine: { form: 'rechteck', bau: latrine },
  holzlager: { form: 'rechteck', bau: holzlager },
};

/** Die Körper des Platz-Objekts: Gestalt der Vorlage, sonst (und bei Höhe unter `MIN_DETAIL_HOEHE`) ein einfacher Körper. */
export function platzKoerper(p: PlatzobjektParams, h: number, bauer: TeilBauer): THREE.Object3D[] {
  const eintrag = BAUER[p.vorlage];
  const bau = eintrag && eintrag.form === p.form && h >= MIN_DETAIL_HOEHE ? eintrag.bau : einfach;
  return bau(p, h, bauer);
}
