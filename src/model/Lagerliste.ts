import type { ObjektRegister } from '../arten/ObjektRegister';
import { Bau } from './Bau';
import { Bauwerk } from './Bauwerk';
import type { LagerObjekt } from './LagerObjekt';
import { Materialliste } from './Materialliste';
import { MaterialPosten } from './MaterialPosten';

/** Ein Bau-Block: `bau` ist null bei „Ohne Bau“ (Spec E5, Entscheidung 9). */
export interface BauZeile {
  readonly bau: Bau | null;
  readonly name: string;
  readonly liste: Materialliste;
}

/** Ein Block der Zelte oder Platz-Objekte: `anzahl` = Zahl der Objekte, `posten` summiert. */
export interface GruppenBlock {
  readonly titel: string;
  readonly anzahl: number;
  readonly posten: readonly MaterialPosten[];
}

/**
 * Die Summe fürs ganze Lager (Spec E5, D3). `bau` ist eine Materialliste über das ganze Bauwerk (Stangen, Seile, Haringe, Planen, Platzbedarf),
 * damit ein gemeinsamer Haring nicht doppelt zählt; `posten` fasst Seile, Haringe und Planen der Bauten mit den Beiträgen aller
 * Zelte und Platz-Objekte zusammen (Seile und Abspannseile nach Länge, Haringe als eine Zeile).
 */
export interface Gesamtsumme {
  readonly bau: Materialliste;
  readonly posten: readonly MaterialPosten[];
}

export const OHNE_BAU = 'Ohne Bau';

const zahl = (x: number): string => String(x).replace('.', ',');

/** Posten, die `Materialliste` für die Bau-Arten zählt, im Format der Lagerliste. */
function bauPosten(m: Materialliste): MaterialPosten[] {
  return [
    ...m.seile.map((s): MaterialPosten => ({ kategorie: MaterialPosten.SEIL_KATEGORIE, bezeichnung: `Seil ${s.laenge} m`, menge: s.anzahl, einheit: 'Stk' })),
    ...(m.anzahlHaringe > 0 ? [{ kategorie: 'Haring', bezeichnung: 'Haring', menge: m.anzahlHaringe, einheit: 'Stk' } as const] : []),
    ...m.planen.map((p): MaterialPosten => ({ kategorie: 'Plane', bezeichnung: `Plane ${zahl(p.breite)} × ${zahl(p.laenge)} m`, menge: p.anzahl, einheit: 'Stk' })),
  ];
}

/** Alles, was man für das ganze Lager einpacken muss, gruppiert nach Bau, Zelttyp und Platz-Objekt (Spec E5, D3). */
export class Lagerliste {
  private constructor(
    readonly baue: readonly BauZeile[],
    readonly zelte: readonly GruppenBlock[],
    readonly platz: readonly GruppenBlock[],
    readonly gesamt: Gesamtsumme,
  ) {}

  /** Die Liste fragt je Objekt nur `register.fuer(o).material`; sie kennt keine Art einzeln. */
  static aus(bauwerk: Bauwerk, register: ObjektRegister, zugabeProEnde: number): Lagerliste {
    const platzbedarfFilter = register.zaehltZumPlatzbedarf;
    const baue = Lagerliste.bauZeilen(bauwerk, zugabeProEnde, platzbedarfFilter);
    const zelte = new Gruppierung();
    const platz = new Gruppierung();
    for (const o of bauwerk.objekte) {
      const art = register.fuer(o);
      const ziel = art.materialGruppe === 'zelt' ? zelte : art.materialGruppe === 'platz' ? platz : null;
      const beitrag = ziel === null ? undefined : art.material?.(o, { zugabeProEnde });
      if (ziel !== null && beitrag !== undefined && beitrag.posten.length > 0) ziel.fuegeEin(beitrag.gruppe, beitrag.posten);
    }
    const ganz = Materialliste.aus(bauwerk, zugabeProEnde, platzbedarfFilter);
    const gesamt = { bau: ganz, posten: MaterialPosten.summiere([...bauPosten(ganz), ...zelte.allePosten(), ...platz.allePosten()]) };
    return new Lagerliste(baue, zelte.bloecke(), platz.bloecke(), gesamt);
  }

  /** Je Bau ein Block; jedes Objekt zählt genau einmal (ein Seil zwischen zwei Bauten beim Bau mit dem ersten Objekt), dazu „Ohne Bau“. */
  private static bauZeilen(bauwerk: Bauwerk, zugabeProEnde: number, filter: (o: LagerObjekt) => boolean): BauZeile[] {
    const belegt = new Set<string>();
    const zeilen: BauZeile[] = [];
    const liste = (ids: readonly string[]): Materialliste => {
      const objekte = ids.flatMap((id) => bauwerk.objekt(id) ?? []);
      return Materialliste.aus(Bauwerk.von(objekte, bauwerk.regelEinstellungen), zugabeProEnde, filter);
    };
    for (const bau of Bau.alle(bauwerk)) {
      const ids = bau.objektIds.filter((id) => !belegt.has(id));
      ids.forEach((id) => belegt.add(id));
      zeilen.push({ bau, name: bauwerk.bauName(bau), liste: liste(ids) });
    }
    const ohne = Bau.ohneBau(bauwerk).filter((id) => !belegt.has(id));
    if (ohne.length > 0) zeilen.push({ bau: null, name: OHNE_BAU, liste: liste(ohne) });
    return zeilen;
  }
}

/** Sammelt Beiträge nach Titel in der Reihenfolge des ersten Auftretens. */
class Gruppierung {
  private readonly eintraege = new Map<string, { anzahl: number; posten: MaterialPosten[] }>();

  fuegeEin(titel: string, posten: readonly MaterialPosten[]): void {
    const alt = this.eintraege.get(titel) ?? { anzahl: 0, posten: [] };
    this.eintraege.set(titel, { anzahl: alt.anzahl + 1, posten: [...alt.posten, ...posten] });
  }

  bloecke(): GruppenBlock[] {
    return [...this.eintraege].map(([titel, e]) => ({ titel, anzahl: e.anzahl, posten: MaterialPosten.summiere(e.posten) }));
  }

  allePosten(): MaterialPosten[] {
    return [...this.eintraege.values()].flatMap((e) => e.posten);
  }
}
