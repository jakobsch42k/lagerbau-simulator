import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName } from '../model/LagerObjekt';
import { Vec3 } from '../model/Vec3';
import { standardDarstellungen } from './darstellung/standardDarstellungen';
import type { Treffer } from './SnapService';
import { SzenenInhalt } from './SzenenInhalt';

const BODEN_EBENE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** three.js mit Renderer, Kamera und Boden. Kennt das Modell nur lesend; die Meshes hält der SzenenInhalt. */
export class Szene {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly kamera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  private readonly szene = new THREE.Scene();
  private readonly steuerung: OrbitControls;
  private readonly inhalt: SzenenInhalt;
  private readonly boden: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();

  constructor(
    private readonly container: HTMLElement,
    arten: ObjektRegister = standardArten(),
  ) {
    this.inhalt = new SzenenInhalt(standardDarstellungen(), arten);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);
    this.kamera.position.set(5, 4, 6);
    this.steuerung = new OrbitControls(this.kamera, this.renderer.domElement);
    this.steuerung.target.set(1.2, 1, 0);
    this.szene.background = new THREE.Color(0xdfe9f3);
    const sonne = new THREE.DirectionalLight(0xffffff, 1.5);
    sonne.position.set(5, 10, 4);
    this.boden = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshLambertMaterial({ color: 0x7fae5a }));
    this.boden.rotation.x = -Math.PI / 2;
    this.szene.add(
      new THREE.HemisphereLight(0xffffff, 0x556644, 1.2),
      sonne,
      this.boden,
      new THREE.GridHelper(40, 40, 0x5d8a3f, 0x6b9a4b),
      this.inhalt.wurzel,
    );
    new ResizeObserver(() => this.passeGroesseAn()).observe(container);
    this.passeGroesseAn();
    this.renderer.setAnimationLoop(() => {
      this.steuerung.update();
      this.renderer.render(this.szene, this.kamera);
    });
  }

  get leinwand(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Baut nur neu, was sich geändert hat (Spec v3, D5). */
  zeige(bauwerk: Bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void {
    this.inhalt.zeige(bauwerk, markiert, stangenStart);
  }

  treffer(e: MouseEvent, klickZiele: readonly ArtName[]): Treffer | null {
    this.strahl(e);
    const getroffen = this.raycaster.intersectObjects(this.inhalt.ziele(klickZiele), false)[0];
    const treffer = getroffen ? SzenenInhalt.treffer(getroffen.object, new Vec3(getroffen.point.x, getroffen.point.y, getroffen.point.z)) : null;
    if (treffer) return treffer;
    const aufBoden = this.raycaster.intersectObject(this.boden, false)[0];
    return aufBoden ? { art: 'boden', punkt: new Vec3(aufBoden.point.x, 0, aufBoden.point.z) } : null;
  }

  /** Der Punkt auf dem Boden (y = 0) unter der Maus, auch jenseits der Bodenfläche; null, wenn der Strahl nicht nach unten zeigt. */
  bodenPunkt(e: MouseEvent): Vec3 | null {
    const punkt = this.strahl(e).intersectPlane(BODEN_EBENE, new THREE.Vector3());
    return punkt ? new Vec3(punkt.x, 0, punkt.z) : null;
  }

  /** Schaltet das Drehen und Zoomen mit der Maus ein oder aus (beim Ziehen eines Objekts aus). */
  setzeKamerasteuerung(aktiv: boolean): void {
    this.steuerung.enabled = aktiv;
  }

  /** Wohin die Kamera schaut, nur waagrecht; für „oben“ der Pfeiltasten. */
  blickrichtung(): Vec3 {
    const richtung = this.kamera.getWorldDirection(new THREE.Vector3());
    return new Vec3(richtung.x, 0, richtung.z);
  }

  private strahl(e: MouseEvent): THREE.Ray {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    return this.raycaster.ray;
  }

  private passeGroesseAn(): void {
    const { clientWidth: breite, clientHeight: hoehe } = this.container;
    this.renderer.setSize(breite, hoehe, false);
    this.kamera.aspect = breite / Math.max(hoehe, 1);
    this.kamera.updateProjectionMatrix();
  }
}
