import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Bauwerk } from '../model/Bauwerk';
import { Vec3 } from '../model/Vec3';
import { type AnsichtsArt, dreiDEinpassen, MIN_BODEN, nordwinkelGrad, planEinpassen, rahmenUm, sichtbarePunkte } from './Ansicht';

const OEFFNUNGSWINKEL_GRAD = 50;
const PLAN_HOEHE = 100; // m, die Planansicht schaut von hier senkrecht nach unten
const PLAN_MIN_ZOOM = 0.001;
/** Die Far-Plane der 3D-Kamera ist mindestens so lang (m) und sonst ein Vielfaches der Bodengröße. */
const MIN_FAR = 200;
const FAR_PRO_BODEN = 6;
/** Beim Auszoomen in der Planansicht soll der ganze Boden noch ins Bild passen (Anteil der Boden-Kantenlänge als halbe Höhe). */
const PLAN_HALBE_HOEHE_PRO_BODEN = 2;
const PLAN_MAX_ZOOM = 50;
/** Anfangsausschnitt der Planansicht: der Boden mit 40 m Seitenlänge samt Rand. */
const PLAN_START_HALBE_HOEHE = 22;
/** Norden (-z) ist in der Planansicht oben. */
const NORDEN = new THREE.Vector3(0, 0, -1);

/**
 * Die zwei Kameras der Szene (Spec E1, D5): perspektivisch mit Orbit-Steuerung (3D) und orthografisch von oben (Plan: Norden oben,
 * Ziehen verschiebt, Mausrad zoomt, kein Drehen). Jede Kamera hat ihre eigene Steuerung und behält ihre Lage beim Umschalten.
 */
export class Kameras {
  readonly perspektive = new THREE.PerspectiveCamera(OEFFNUNGSWINKEL_GRAD, 1, 0.1, 200);
  readonly plan = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, PLAN_HOEHE * 2);
  private readonly steuerung3d: OrbitControls;
  private readonly steuerungPlan: OrbitControls;
  private art: AnsichtsArt = 'drei-d';
  private seitenverhaeltnis = 1;
  private hoehePx = 1;

  constructor(leinwand: HTMLCanvasElement) {
    this.perspektive.position.set(5, 4, 6);
    this.plan.up.copy(NORDEN);
    this.plan.position.set(0, PLAN_HOEHE, 0);
    this.plan.zoom = 1 / PLAN_START_HALBE_HOEHE;
    this.steuerung3d = new OrbitControls(this.perspektive, leinwand);
    this.steuerung3d.target.set(1.2, 1, 0);
    this.steuerungPlan = new OrbitControls(this.plan, leinwand);
    this.steuerungPlan.enableRotate = false;
    this.steuerungPlan.screenSpacePanning = true;
    this.steuerungPlan.minZoom = PLAN_MIN_ZOOM;
    this.steuerungPlan.maxZoom = PLAN_MAX_ZOOM;
    this.steuerungPlan.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    this.steuerungPlan.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
    this.steuerungPlan.target.set(0, 0, 0);
    this.steuerungPlan.update();
    this.setzeArt('drei-d');
  }

  get ansicht(): AnsichtsArt {
    return this.art;
  }

  get aktiv(): THREE.Camera {
    return this.art === 'plan' ? this.plan : this.perspektive;
  }

  setzeArt(art: AnsichtsArt): void {
    this.art = art;
    this.steuerung3d.enabled = art === 'drei-d';
    this.steuerungPlan.enabled = art === 'plan';
  }

  /** Sperrt oder gibt die Maus-Steuerung der gerade aktiven Kamera frei (beim Ziehen eines Objekts oder Rahmens). */
  setzeSteuerung(aktiv: boolean): void {
    (this.art === 'plan' ? this.steuerungPlan : this.steuerung3d).enabled = aktiv;
  }

  update(): void {
    (this.art === 'plan' ? this.steuerungPlan : this.steuerung3d).update();
  }

  passeGroesseAn(breite: number, hoehe: number): void {
    this.seitenverhaeltnis = breite / Math.max(hoehe, 1);
    this.hoehePx = Math.max(hoehe, 1);
    this.perspektive.aspect = this.seitenverhaeltnis;
    this.perspektive.updateProjectionMatrix();
    this.plan.left = -this.seitenverhaeltnis;
    this.plan.right = this.seitenverhaeltnis;
    this.plan.updateProjectionMatrix();
  }

  /**
   * Die Reichweite wächst mit dem Boden (Spec E2, D3): Far-Plane der 3D-Kamera und kleinster Zoom der Planansicht.
   * `groesse` ist die Kantenlänge des Bodens in m; bei 40 m bleibt alles wie vorher.
   */
  setzeBodengroesse(groesse: number): void {
    const far = Math.max(MIN_FAR, groesse * FAR_PRO_BODEN);
    if (far !== this.perspektive.far) {
      this.perspektive.far = far;
      this.perspektive.updateProjectionMatrix();
    }
    this.steuerungPlan.minZoom = Math.min(PLAN_MIN_ZOOM, 1 / (Math.max(groesse, MIN_BODEN) * PLAN_HALBE_HOEHE_PRO_BODEN));
  }

  /** Drehung des Nordpfeils in Grad im Uhrzeigersinn: in der Planansicht immer 0, in 3D nach dem Azimut. */
  nordwinkelGrad(): number {
    if (this.art === 'plan') return 0;
    const richtung = this.perspektive.getWorldDirection(new THREE.Vector3());
    return nordwinkelGrad(richtung.x, richtung.z);
  }

  /** Wohin „oben“ der Pfeiltasten zeigt: in der Planansicht Norden, in 3D die Blickrichtung (nur waagrecht). */
  blickrichtung(): Vec3 {
    if (this.art === 'plan') return new Vec3(0, 0, -1);
    const richtung = this.perspektive.getWorldDirection(new THREE.Vector3());
    return new Vec3(richtung.x, 0, richtung.z);
  }

  /** Meter pro Pixel in der Planansicht (für die Maßstabsleiste). */
  planMeterProPixel(): number {
    return 2 / this.plan.zoom / this.hoehePx;
  }

  /** „Alles zeigen“: passt die aktive Kamera so ein, dass alle Platzpunkte und Objekte mit 10 % Rand sichtbar sind. */
  zeigeAlles(bauwerk: Bauwerk): void {
    const rahmen = rahmenUm(sichtbarePunkte(bauwerk));
    if (this.art === 'plan') return this.passePlanAn(rahmen);
    const { ziel, abstand } = dreiDEinpassen(rahmen, this.seitenverhaeltnis, OEFFNUNGSWINKEL_GRAD);
    const blick = new THREE.Vector3().subVectors(this.steuerung3d.target, this.perspektive.position).normalize();
    this.steuerung3d.target.set(ziel.x, ziel.y, ziel.z);
    this.perspektive.position.copy(this.steuerung3d.target).addScaledVector(blick, -abstand);
    this.steuerung3d.update();
  }

  private passePlanAn(rahmen: ReturnType<typeof rahmenUm>): void {
    const { mitteX, mitteZ, halbeHoehe } = planEinpassen(rahmen, this.seitenverhaeltnis);
    this.steuerungPlan.target.set(mitteX, 0, mitteZ);
    this.plan.position.set(mitteX, PLAN_HOEHE, mitteZ);
    this.plan.zoom = THREE.MathUtils.clamp(1 / halbeHoehe, this.steuerungPlan.minZoom, PLAN_MAX_ZOOM);
    this.plan.updateProjectionMatrix();
    this.steuerungPlan.update();
  }
}
