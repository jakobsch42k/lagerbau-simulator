import * as THREE from 'three';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName } from '../model/LagerObjekt';
import { Vec3 } from '../model/Vec3';
import { standardDarstellungen } from './darstellung/standardDarstellungen';
import type { Treffer } from './SnapService';
import { SzenenInhalt } from './SzenenInhalt';
import type { AnsichtsArt } from './Ansicht';
import { Kameras } from './Kameras';
import { Massstabsleiste } from './Massstabsleiste';
import { Messanzeige } from './Messanzeige';
import type { Messung } from './Messung';

const BODEN_EBENE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** three.js mit Renderer, Kamera und Boden. Kennt das Modell nur lesend; die Meshes hält der SzenenInhalt. */
export class Szene {
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true });
  private readonly kameras: Kameras;
  private readonly massstab: Massstabsleiste;
  private readonly messanzeige: Messanzeige;
  private letzteMessung: Messung | null = null;
  private readonly szene = new THREE.Scene();
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
    this.kameras = new Kameras(this.renderer.domElement);
    this.massstab = new Massstabsleiste(container);
    this.messanzeige = new Messanzeige(container);
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
      this.messanzeige.wurzel,
    );
    new ResizeObserver(() => this.passeGroesseAn()).observe(container);
    this.passeGroesseAn();
    this.renderer.setAnimationLoop(() => {
      this.kameras.update();
      this.renderer.render(this.szene, this.kameras.aktiv);
      this.massstab.zeige(this.kameras.ansicht === 'plan', this.kameras.planMeterProPixel());
      this.messanzeige.positioniere(this.kameras.aktiv, this.container.clientWidth, this.container.clientHeight);
    });
  }

  get leinwand(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /** Baut nur neu, was sich geändert hat (Spec v3, D5). */
  zeige(bauwerk: Bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void {
    this.inhalt.zeige(bauwerk, markiert, stangenStart);
  }

  get ansicht(): AnsichtsArt {
    return this.kameras.ansicht;
  }

  /** Schaltet zwischen Plan (senkrecht von oben, Norden oben) und 3D um; jede Kamera behält ihre Lage. */
  setzeAnsicht(art: AnsichtsArt): void {
    this.kameras.setzeArt(art);
  }

  /** „Alles zeigen“ für die aktive Kamera. */
  zeigeAlles(bauwerk: Bauwerk): void {
    this.kameras.zeigeAlles(bauwerk);
  }

  zeigeMessung(messung: Messung | null): void {
    if (messung === this.letzteMessung) return;
    this.letzteMessung = messung;
    this.messanzeige.zeige(messung);
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

  /** Schaltet die Maus-Steuerung der Kamera ein oder aus (beim Ziehen eines Objekts oder Rahmens aus). */
  setzeKamerasteuerung(aktiv: boolean): void {
    this.kameras.setzeSteuerung(aktiv);
  }

  /** Wohin „oben“ der Pfeiltasten zeigt (Plan: Norden, 3D: Blickrichtung, nur waagrecht). */
  blickrichtung(): Vec3 {
    return this.kameras.blickrichtung();
  }

  private strahl(e: MouseEvent): THREE.Ray {
    const rect = this.leinwand.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.kameras.aktiv);
    return this.raycaster.ray;
  }

  private passeGroesseAn(): void {
    const { clientWidth: breite, clientHeight: hoehe } = this.container;
    this.renderer.setSize(breite, hoehe, false);
    this.kameras.passeGroesseAn(breite, hoehe);
  }
}
