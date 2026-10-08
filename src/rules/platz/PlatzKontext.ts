import type { Grundriss } from '../../model/Grundriss';
import type { Bauwerk } from '../../model/Bauwerk';
import type { LagerObjekt } from '../../model/LagerObjekt';
import type { ObjektRegister } from '../../arten/ObjektRegister';
import type { Rolle } from '../../arten/platz/rollen';

/** Ein Objekt, wie die Platzregeln es sehen: Rolle, Name und Grundriss kommen über das Register, nie über die Art des Objekts. */
export interface PlatzEintrag {
  readonly objekt: LagerObjekt;
  readonly name: string;
  readonly grundriss: Grundriss;
}

/** Bauwerk und Register einmal ausgewertet (Spec E6, D3). Objekte ohne Rolle oder ohne Grundriss fehlen. */
export class PlatzKontext {
  private constructor(private readonly nachRolle: ReadonlyMap<Rolle, readonly PlatzEintrag[]>) {}

  static aus(bauwerk: Bauwerk, register: ObjektRegister): PlatzKontext {
    const nachRolle = new Map<Rolle, PlatzEintrag[]>();
    for (const objekt of bauwerk.objekte) {
      const art = register.artVon(objekt);
      const rolle = art.rolle?.(objekt) ?? null;
      const grundriss = art.grundriss?.(objekt) ?? null;
      if (rolle === null || grundriss === null) continue;
      const eintrag: PlatzEintrag = { objekt, name: art.anzeigeName?.(objekt) ?? art.label, grundriss };
      nachRolle.set(rolle, [...(nachRolle.get(rolle) ?? []), eintrag]);
    }
    return new PlatzKontext(nachRolle);
  }

  /** Alle Einträge mit einer dieser Rollen, in der Reihenfolge des Bauwerks. */
  eintraege(rollen: readonly Rolle[]): readonly PlatzEintrag[] {
    return rollen.flatMap((r) => this.mit(r));
  }

  /** Alle Einträge mit dieser Rolle, in der Reihenfolge des Bauwerks. */
  mit(rolle: Rolle): readonly PlatzEintrag[] {
    return this.nachRolle.get(rolle) ?? [];
  }
}
