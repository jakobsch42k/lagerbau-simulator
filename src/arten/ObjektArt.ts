import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Roh } from '../share/lesen';

/** Ein Objekt im Datenformat v4: Art und id vorneweg, danach die Felder der Art wie in v3 (Spec v3, D3). */
export interface ObjektJson {
  readonly art: ArtName;
  readonly id: string;
  readonly [feld: string]: unknown;
}

/** Was der Editor über eine Objektart wissen muss, ohne three.js (Spec v3, D2). */
export interface ObjektArt<T extends LagerObjekt = LagerObjekt> {
  readonly name: ArtName;
  /** Anzeigename, z. B. als Überschrift im Panel. */
  readonly label: string;
  istVon(o: LagerObjekt): o is T;
  zuJson(o: T): ObjektJson;
  /** Wirft einen Error mit dem Feldnamen, wenn `roh` nicht passt. */
  ausJson(roh: Roh): T;
}
