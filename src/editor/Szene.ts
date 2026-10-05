import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Baum } from '../model/Baum';
import type { Bauwerk } from '../model/Bauwerk';
import { Platzbedarf } from '../model/Platzbedarf';
import type { Plane } from '../model/Plane';
import type { Seil } from '../model/Seil';
import type { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import type { Treffer } from './SnapService';
import type { KlickZiel } from './Werkzeuge';

const HOLZ = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
const MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f });
const SEIL = new THREE.MeshLambertMaterial({ color: 0xe8d9a0 });
const START = new THREE.MeshLambertMaterial({ color: 0x2f6f3e });
const STAMM = new THREE.MeshLambertMaterial({ color: 0x6b4226 });
const KRONE = new THREE.MeshLambertMaterial({ color: 0x3f7d3a });
const HERING = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
const UNSICHTBAR = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const PLATZ = new THREE.LineDashedMaterial({ color: 0x1d2733, dashSize: 0.2, gapSize: 0.1 });
// Beidseitig, damit man die Plane auch von unten sieht; polygonOffset verhindert Flimmern einer Bodenplane auf dem Boden.
const PLANE = new THREE.MeshLambertMaterial({ color: 0x7d7a4f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const PLANE_MARKIERT = new THREE.MeshLambertMaterial({ color: 0xd9480f, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const Y_ACHSE = new THREE.Vector3(0, 1, 0);
const SEIL_RADIUS = 0.005; // Ø 1 cm, nur optisch
const SEIL_GREIFRADIUS = 0.05; // unsichtbarer Mantel, damit man ein dünnes Seil anklicken kann
const ZIEL_SCHLUESSEL: Record<KlickZiel, string> = { seil: 'seilId', plane: 'planeId' };

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
    for (const s of bauwerk.seile) this.bau.add(...this.seilMeshes(s, markiert.has(s.id)));
    for (const h of bauwerk.heringe()) this.bau.add(this.heringMesh(h.position));
    for (const b of bauwerk.baeume) this.bau.add(...this.baumMeshes(b, markiert.has(b.id)));
    for (const p of bauwerk.planen) this.bau.add(this.planenMesh(p, markiert.has(p.id)));
    const platz = Platzbedarf.aus(bauwerk);
    if (platz) this.bau.add(this.platzRahmen(platz));
    if (stangenStart) this.bau.add(this.kugel(stangenStart, 0.1, START));
  }

  treffer(e: PointerEvent, klickZiele: readonly KlickZiel[]): Treffer | null {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kamera);
    const schluessel = ['stangeId', 'baumId', ...klickZiele.map((z) => ZIEL_SCHLUESSEL[z])];
    const ziele = this.bau.children.filter((k) => schluessel.some((name) => typeof k.userData[name] === 'string'));
    const getroffen = this.raycaster.intersectObjects(ziele, false)[0];
    if (getroffen) {
      const punkt = new Vec3(getroffen.point.x, getroffen.point.y, getroffen.point.z);
      const daten = getroffen.object.userData;
      if (typeof daten.stangeId === 'string') return { art: 'stange', punkt, stangeId: daten.stangeId };
      if (typeof daten.baumId === 'string') return { art: 'baum', punkt, baumId: daten.baumId };
      if (typeof daten.planeId === 'string') return { art: 'plane', punkt, planeId: daten.planeId };
      return { art: 'seil', punkt, seilId: daten.seilId as string };
    }
    const aufBoden = this.raycaster.intersectObject(this.boden, false)[0];
    return aufBoden ? { art: 'boden', punkt: new Vec3(aufBoden.point.x, 0, aufBoden.point.z) } : null;
  }

  private zylinder(von: Vec3, bis: Vec3, radius: number, material: THREE.Material): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, von.distanceTo(bis), 12), material);
    const mitte = von.add(bis).scale(0.5);
    const r = bis.sub(von).normalize();
    mesh.position.set(mitte.x, mitte.y, mitte.z);
    mesh.quaternion.setFromUnitVectors(Y_ACHSE, new THREE.Vector3(r.x, r.y, r.z));
    return mesh;
  }

  private stangenMesh(s: Stange, markiert: boolean): THREE.Mesh {
    const mesh = this.zylinder(s.start, s.ende, s.durchmesser / 2, markiert ? MARKIERT : HOLZ);
    mesh.userData.stangeId = s.id;
    return mesh;
  }

  private seilMeshes(s: Seil, markiert: boolean): THREE.Mesh[] {
    const sichtbar = this.zylinder(s.start, s.ende, SEIL_RADIUS, markiert ? MARKIERT : SEIL);
    const greifbar = this.zylinder(s.start, s.ende, SEIL_GREIFRADIUS, UNSICHTBAR);
    greifbar.userData.seilId = s.id;
    return [sichtbar, greifbar];
  }

  private heringMesh(p: Vec3): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 8), HERING);
    mesh.position.set(p.x, 0.075, p.z);
    mesh.rotation.x = Math.PI; // Spitze nach unten, in den Boden
    return mesh;
  }

  private baumMeshes(b: Baum, markiert: boolean): THREE.Mesh[] {
    const { durchmesser, hoehe } = b.params;
    const stamm = new THREE.Mesh(new THREE.CylinderGeometry(durchmesser / 2, durchmesser / 2, hoehe, 12), markiert ? MARKIERT : STAMM);
    stamm.position.set(b.position.x, hoehe / 2, b.position.z);
    stamm.userData.baumId = b.id;
    const krone = new THREE.Mesh(new THREE.SphereGeometry(Math.max(1, hoehe * 0.25), 12, 8), KRONE);
    krone.position.set(b.position.x, hoehe, b.position.z);
    return [stamm, krone];
  }

  /** Jede Fläche als zwei Dreiecke. Ein Mesh pro Plane, damit ein Klick sie als Ganzes trifft. */
  private planenMesh(p: Plane, markiert: boolean): THREE.Mesh {
    const ecken = p.flaechen.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]);
    const geometrie = new THREE.BufferGeometry().setFromPoints(ecken.map((v) => new THREE.Vector3(v.x, v.y, v.z)));
    geometrie.computeVertexNormals();
    const mesh = new THREE.Mesh(geometrie, markiert ? PLANE_MARKIERT : PLANE);
    mesh.userData.planeId = p.id;
    return mesh;
  }

  private platzRahmen(p: Platzbedarf): THREE.LineLoop {
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

  private kugel(p: Vec3, radius: number, material: THREE.Material): THREE.Mesh {
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
