import type { ObjektJson } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import { Bauwerk } from '../model/Bauwerk';
import type { LagerObjekt } from '../model/LagerObjekt';
import type { Luftbild } from '../model/Luftbild';
import { RegelEinstellungen } from '../rules/RegelEinstellungen';
import { alteObjekte } from './AltesFormat';
import { MAX_TEILE } from './grenzen';
import { liste, objekt, type Roh, text } from './lesen';
import { istEntfernt, type LuftbildEntferntJson, type LuftbildJson, luftbildAusJson, luftbildZuJson } from './LuftbildFormat';
import { type RegelnJson, regelnAusJson, regelnZuJson } from './RegelnFormat';

/** Datenformat 5 (Spec E2, D4): wie 4 (eine Liste aller Objekte in der Reihenfolge des Bauwerks), dazu optional das Luftbild. */
export interface BauwerkJson {
  readonly version: 5;
  readonly objekte: readonly ObjektJson[];
  /** Nur, wenn eine Regel aus ist oder ein Wert vom Standard abweicht (Spec v3, D8). */
  readonly regeln?: RegelnJson;
  /** In der Datei mit Bild, im Link nur `{ entfernt: true }`; fehlt, wenn es kein Luftbild gibt. */
  readonly luftbild?: LuftbildJson | LuftbildEntferntJson;
}

/** Wohin geschrieben wird: Eine Datei enthält das Bild, ein Link nicht (er wäre zu lang). */
export type Ziel = 'datei' | 'link';

/** Ein gelesenes Bauwerk; `luftbildEntfernt`, wenn die Daten (ein Link) ein Bild nur angekündigt, aber nicht enthalten haben. */
export interface Gelesen {
  readonly bauwerk: Bauwerk;
  readonly luftbildEntfernt: boolean;
}

interface BildLesung {
  readonly luftbild: Luftbild | null;
  readonly entfernt: boolean;
}

/** Bauwerk ↔ JSON. Jede Art liest und schreibt ihre Objekte selbst; Gruppen über ihre Parameter, damit Links kurz bleiben. */
export class BauwerkSerializer {
  constructor(private readonly arten: ObjektRegister = standardArten()) {}

  zuJson(bauwerk: Bauwerk, ziel: Ziel = 'datei'): BauwerkJson {
    const objekte = bauwerk.objekte.map((o) => this.arten.artVon(o).zuJson(o));
    const e = bauwerk.regelEinstellungen;
    const l = bauwerk.luftbild;
    return {
      version: 5,
      objekte,
      ...(e.istStandard ? {} : { regeln: regelnZuJson(e) }),
      ...(l === null ? {} : { luftbild: ziel === 'datei' ? luftbildZuJson(l) : { entfernt: true as const } }),
    };
  }

  ausJson(daten: unknown): Bauwerk {
    return this.liesMitHinweis(daten).bauwerk;
  }

  /** Wie `ausJson`, sagt aber auch, ob ein Luftbild nur angekündigt war (Link). */
  liesMitHinweis(daten: unknown): Gelesen {
    try {
      return this.lies(daten);
    } catch (e) {
      throw new Error(`Ungültige Bauwerk-Daten: ${(e as Error).message}`);
    }
  }

  private lies(daten: unknown): Gelesen {
    const o = objekt(daten, 'Bauwerk');
    const roh = this.rohObjekte(o);
    if (roh.length > MAX_TEILE) throw new Error(`mehr als ${MAX_TEILE} Teile`);
    // Ab Version 4 gibt es Regel-Einstellungen; fehlt das Feld, gelten die Standardwerte.
    const hatRegeln = o.version === 4 || o.version === 5;
    const regeln = hatRegeln && o.regeln !== undefined ? regelnAusJson(o.regeln) : RegelEinstellungen.standard();
    const bild = o.version === 5 && o.luftbild !== undefined ? this.liesLuftbild(o.luftbild) : { luftbild: null, entfernt: false };
    const bauwerk = Bauwerk.von(
      roh.map((r) => this.liesObjekt(r)),
      regeln,
      bild.luftbild,
    );
    return { bauwerk, luftbildEntfernt: bild.entfernt };
  }

  private liesLuftbild(d: unknown): BildLesung {
    return istEntfernt(objekt(d, 'luftbild')) ? { luftbild: null, entfernt: true } : { luftbild: luftbildAusJson(d), entfernt: false };
  }

  /** Ab Version 4 steht die Liste im Dokument; 1–3 werden in ihrer alten Reihenfolge übersetzt. */
  private rohObjekte(o: Roh): readonly unknown[] {
    if (o.version === 4 || o.version === 5) return liste(o.objekte, 'objekte');
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
