import type { ObjektJson } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { Bauwerk } from '../model/Bauwerk';
import type { LagerObjekt } from '../model/LagerObjekt';
import { alteObjekte } from './AltesFormat';
import { MAX_TEILE } from './grenzen';
import { liste, objekt, type Roh, text } from './lesen';

/** Datenformat 4 (Spec v3, D3): eine Liste aller Objekte in der Reihenfolge des Bauwerks. */
export interface BauwerkJson {
  readonly version: 4;
  readonly objekte: readonly ObjektJson[];
}

/** Bauwerk ↔ JSON. Jede Art liest und schreibt ihre Objekte selbst; Gruppen über ihre Parameter, damit Links kurz bleiben. */
export class BauwerkSerializer {
  constructor(private readonly arten: ObjektRegister = standardArten()) {}

  zuJson(bauwerk: Bauwerk): BauwerkJson {
    return { version: 4, objekte: bauwerk.objekte.map((o) => this.arten.artVon(o).zuJson(o)) };
  }

  ausJson(daten: unknown): Bauwerk {
    try {
      return this.lies(daten);
    } catch (e) {
      throw new Error(`Ungültige Bauwerk-Daten: ${(e as Error).message}`);
    }
  }

  private lies(daten: unknown): Bauwerk {
    const roh = this.rohObjekte(objekt(daten, 'Bauwerk'));
    if (roh.length > MAX_TEILE) throw new Error(`mehr als ${MAX_TEILE} Teile`);
    return Bauwerk.von(roh.map((r) => this.liesObjekt(r)));
  }

  /** Version 4 bringt die Liste mit; 1–3 werden in ihrer alten Reihenfolge übersetzt. */
  private rohObjekte(o: Roh): readonly unknown[] {
    if (o.version === 4) return liste(o.objekte, 'objekte');
    if (o.version === 1 || o.version === 2 || o.version === 3) return alteObjekte(o);
    throw new Error('unbekannte Version');
  }

  private liesObjekt(daten: unknown): LagerObjekt {
    const roh = objekt(daten, 'Objekt');
    const name = text(roh.art, 'art');
    const art = this.arten.finde(name);
    if (!art) throw new Error(`unbekannte Art ${name}`);
    return art.ausJson(roh);
  }
}
