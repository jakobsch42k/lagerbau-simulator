import * as THREE from 'three';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import { baueAbleitungen } from './darstellung/Ableitungen';
import { type Darstellungen, teilDaten } from './darstellung/Darstellung';
import { kugel } from './darstellung/formen';
import { START } from './darstellung/materialien';
import { standardDarstellungen } from './darstellung/standardDarstellungen';
import type { Treffer } from './SnapService';

interface Eintrag {
  readonly objekt: LagerObjekt;
  readonly gruppe: THREE.Group;
}

/**
 * Die Meshes zum Bauwerk, ohne Renderer und Kamera (Spec v3, D5). Baut nur neu, was sich geändert hat:
 * Ein Objekt, das `===` dem letzten gleicht, behält seine Gruppe; Auswahl und Markierung tauschen nur Materialien.
 */
export class SzenenInhalt {
  readonly wurzel = new THREE.Group();
  private readonly eintraege = new Map<string, Eintrag>();
  private ableitungen: { readonly bauwerk: Bauwerk; readonly gruppe: THREE.Group } | null = null;
  private start: { readonly punkt: Vec3; readonly mesh: THREE.Mesh } | null = null;

  constructor(
    private readonly darstellungen: Darstellungen = standardDarstellungen(),
    private readonly arten: ObjektRegister = standardArten(),
  ) {}

  zeige(bauwerk: Bauwerk, markiert: ReadonlySet<string>, stangenStart: Vec3 | null): void {
    this.gleicheObjekteAb(bauwerk);
    this.gleicheAbleitungenAb(bauwerk);
    this.gleicheStartAb(stangenStart);
    this.faerbe(markiert);
  }

  /** Meshes, die einen Klick fangen: Arten mit Klickverhalten `immer` stets, die anderen nur, wenn das Werkzeug sie nennt (Spec v2b, D2). */
  ziele(klickZiele: readonly ArtName[]): THREE.Object3D[] {
    const ziele: THREE.Object3D[] = [];
    for (const { gruppe } of this.eintraege.values()) {
      gruppe.traverse((k) => {
        const daten = teilDaten(k);
        if (daten?.klickbar && (this.arten.art(daten.art).klick === 'immer' || klickZiele.includes(daten.art))) ziele.push(k);
      });
    }
    return ziele;
  }

  /** Der Treffer zu einem getroffenen Mesh; null, wenn es zu keinem Objekt gehört. */
  static treffer(objekt: THREE.Object3D, punkt: Vec3): Treffer | null {
    const daten = teilDaten(objekt);
    return daten ? { art: 'objekt', objektArt: daten.art, id: daten.teilId, punkt } : null;
  }

  private gleicheObjekteAb(bauwerk: Bauwerk): void {
    const ids = new Set<string>();
    for (const o of bauwerk.objekte) {
      ids.add(o.id);
      const alt = this.eintraege.get(o.id);
      if (alt?.objekt === o) continue;
      if (alt) this.entferne(alt.gruppe);
      const gruppe = this.darstellungen[o.art].baue(o);
      gruppe.name = o.id;
      this.wurzel.add(gruppe);
      this.eintraege.set(o.id, { objekt: o, gruppe });
    }
    for (const [id, { gruppe }] of this.eintraege) {
      if (ids.has(id)) continue;
      this.entferne(gruppe);
      this.eintraege.delete(id);
    }
  }

  private gleicheAbleitungenAb(bauwerk: Bauwerk): void {
    if (this.ableitungen?.bauwerk === bauwerk) return;
    if (this.ableitungen) this.entferne(this.ableitungen.gruppe);
    const gruppe = baueAbleitungen(bauwerk);
    this.wurzel.add(gruppe);
    this.ableitungen = { bauwerk, gruppe };
  }

  /** Die Startkugel hängt nicht am Bauwerk: Beim ersten Klick eines Zwei-Klick-Werkzeugs ändert sich nur `stangenStart`. */
  private gleicheStartAb(punkt: Vec3 | null): void {
    if ((this.start?.punkt ?? null) === punkt) return;
    if (this.start) this.entferne(this.start.mesh);
    this.start = null;
    if (punkt === null) return;
    const mesh = kugel(punkt, 0.1, START);
    mesh.name = 'start';
    this.wurzel.add(mesh);
    this.start = { punkt, mesh };
  }

  private faerbe(markiert: ReadonlySet<string>): void {
    for (const { gruppe } of this.eintraege.values()) {
      gruppe.traverse((k) => {
        const daten = teilDaten(k);
        if (!(k instanceof THREE.Mesh) || !daten?.markiert) return;
        k.material = markiert.has(daten.teilId) || markiert.has(daten.objektId) ? daten.markiert : daten.normal;
      });
    }
  }

  /** Nimmt etwas aus der Szene und gibt seine Geometrie frei; die Materialien sind geteilt und bleiben. */
  private entferne(objekt: THREE.Object3D): void {
    this.wurzel.remove(objekt);
    objekt.traverse((k) => {
      if (k instanceof THREE.Mesh || k instanceof THREE.Line) k.geometry.dispose();
    });
  }
}
