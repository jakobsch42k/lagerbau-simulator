import type { ObjektRegister } from '../../arten/ObjektRegister';
import type { Bauwerk } from '../../model/Bauwerk';
import type { Hinweis } from '../Rule';
import { AbstandsRegel } from './AbstandsRegel';
import { KronenRegel } from './KronenRegel';
import { PlatzKontext } from './PlatzKontext';
import type { PlatzRegel } from './PlatzRegel';
import { type PlatzregelEinstellungen, type PlatzWertSchluessel } from './PlatzregelEinstellungen';
import { ABSTANDS_REGELN } from './standardPlatzRegeln';

const ABSTAND_SCHLUESSEL: Readonly<Record<string, PlatzWertSchluessel>> = {
  P1: 'P1_MIN_ABSTAND_FEUER_ZELT_M',
  P2: 'P2_MIN_ABSTAND_FEUER_HOLZ_M',
  P3: 'P3_MIN_ABSTAND_ZELT_ZELT_M',
  P4: 'P4_MIN_ABSTAND_LATRINE_WASSER_M',
  P5: 'P5_MIN_ABSTAND_LATRINE_KUECHE_M',
};

/** Prüft die Platzregeln P1 bis P6 (Spec E6, D3) mit den Einstellungen des Plans. Abgeschaltete Regeln entfallen. */
export class PlatzRegelEngine {
  private constructor(
    private readonly regeln: readonly PlatzRegel[],
    private readonly register: ObjektRegister,
  ) {}

  static fuer(e: PlatzregelEinstellungen, register: ObjektRegister): PlatzRegelEngine {
    const regeln: PlatzRegel[] = [
      ...ABSTANDS_REGELN.map((d) => new AbstandsRegel(d, e.wert(ABSTAND_SCHLUESSEL[d.name]))),
      new KronenRegel(e.wert('P6_KRONENRADIUS_FAKTOR')),
    ].filter((r) => !e.istAus(r.name));
    return new PlatzRegelEngine(regeln, register);
  }

  /** Ohne Platz-Objekte und Zelte kommt `[]` heraus: alte Dateien sehen keinen Unterschied. */
  pruefe(bauwerk: Bauwerk): Hinweis[] {
    if (this.regeln.length === 0) return [];
    const kontext = PlatzKontext.aus(bauwerk, this.register);
    return this.regeln.flatMap((r) => r.pruefe(kontext));
  }
}
