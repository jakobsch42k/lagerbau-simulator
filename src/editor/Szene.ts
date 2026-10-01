import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Bauwerk } from '../model/Bauwerk';
import type { Bund } from '../model/Bund';
import type { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import type { Treffer } from './SnapService';

const HOLZ = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
const MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f });
const SEIL = new THREE.MeshLambertMaterial({ color: 0xe8d9a0 });
const START = new THREE.MeshLambertMaterial({ color: 0x2f6f3e });
const Y_ACHSE = new THREE.Vector3(0, 1, 0);

/** three.js-Darstellung. Kennt das Modell nur lesend und liefert Klick-Treffer zurück. */
export class Szene {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly kamera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  private readonly szene = new THREE.Scene();
  private readonly steuerung: OrbitControls;
  private readonly bau = new THREE.Group();
  private readonly boden: THREE.Mesh;
  private readonly raycaster = new THREE.Raycaster();

  constructor(private readonly container: HTMLElement) {
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
    this.szene.add(new THREE.HemisphereLight(0xffffff, 0x556644, 1.2), sonne, this.boden, new THREE.GridHelper(40, 40, 0x5d8a3f, 0x6b9a4b), this.bau);
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

  zeige(bauwerk: Bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void {
    for (const kind of this.bau.children) (kind as THREE.Mesh).geometry.dispose();
    this.bau.clear();
    for (const s of bauwerk.stangen()) {
      const istMarkiert = markiert.has(s.id) || (s.gruppeId !== null && markiert.has(s.gruppeId));
      this.bau.add(this.stangenMesh(s, istMarkiert));
    }
    for (const b of bauwerk.buende()) this.bau.add(this.kugel(b.position, 0.07, SEIL));
    if (stangenStart) this.bau.add(this.kugel(stangenStart, 0.1, START));
  }

  treffer(e: PointerEvent): Treffer | null {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    const stangen = this.bau.children.filter((k) => typeof k.userData.stangeId === 'string');
    const aufStange = this.raycaster.intersectObjects(stangen, false)[0];
    if (aufStange) {
      const p = aufStange.point;
      return { art: 'stange', punkt: new Vec3(p.x, p.y, p.z), stangeId: aufStange.object.userData.stangeId as string };
    }
    const aufBoden = this.raycaster.intersectObject(this.boden, false)[0];
    return aufBoden ? { art: 'boden', punkt: new Vec3(aufBoden.point.x, 0, aufBoden.point.z) } : null;
  }

  private stangenMesh(s: Stange, markiert: boolean): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(s.durchmesser / 2, s.durchmesser / 2, s.laenge, 12), markiert ? MARKIERT : HOLZ);
    const mitte = s.start.add(s.ende).scale(0.5);
    const r = s.richtung;
    mesh.position.set(mitte.x, mitte.y, mitte.z);
    mesh.quaternion.setFromUnitVectors(Y_ACHSE, new THREE.Vector3(r.x, r.y, r.z));
    mesh.userData.stangeId = s.id;
    return mesh;
  }

  private kugel(p: Bund['position'], radius: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material);
    mesh.position.set(p.x, p.y, p.z);
    return mesh;
  }

  private passeGroesseAn(): void {
    const { clientWidth: breite, clientHeight: hoehe } = this.container;
    this.renderer.setSize(breite, hoehe, false);
    this.kamera.aspect = breite / Math.max(hoehe, 1);
    this.kamera.updateProjectionMatrix();
  }
}
