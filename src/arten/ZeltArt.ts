import type { LagerObjekt } from '../model/LagerObjekt';
import type { ZeltAufbau } from '../model/params';
import { Zelt } from '../model/Zelt';
import { freierText, liste, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import type { ObjektArt, ObjektJson, PanelSpec, PlatzierenPunkt } from './ObjektArt';
import { paramsAusZeltVorlage, ZELT_VORLAGEN } from './zelt/vorlagen';

export interface ZeltJson extends ObjektJson {
  readonly art: 'zelt';
  readonly vorlage: string;
  readonly name: string;
  readonly aufbau: ZeltAufbau;
  readonly position: V3;
  readonly drehungRad: number;
  readonly durchmesser: number;
  readonly ecken: number;
  readonly laenge: number;
  readonly breite: number;
  readonly wandhoehe: number;
  readonly firsthoehe: number;
  readonly waende: readonly [boolean, boolean, boolean];
  readonly abspannungen: number;
  readonly seillaenge: number;
  readonly haringAbstand: number;
  readonly farbe: string;
}

const wahrheitswert = (d: unknown, name: string): boolean => {
  if (typeof d !== 'boolean') throw new Error(`${name} ist kein Wahrheitswert`);
  return d;
};

/**
 * Zelt (Spec E4, D5). Stand Chunk A: nur Codec für das Format v7, Platzieren mit der ersten Vorlage und ein leeres Panel,
 * damit das Register vollständig ist. Panel, Vorlagenwahl und Werkzeug kommen mit Chunk B.
 */
export class ZeltArt implements ObjektArt<Zelt> {
  readonly name = 'zelt' as const;
  readonly label = 'Zelt';
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = false;
  readonly platzieren: PlatzierenPunkt = {
    modus: 'punkt',
    erzeuge: (id, position) => new Zelt(id, position, paramsAusZeltVorlage(ZELT_VORLAGEN[0] as (typeof ZELT_VORLAGEN)[number])),
  };

  istVon(o: LagerObjekt): o is Zelt {
    return o instanceof Zelt;
  }

  zuJson(o: Zelt): ZeltJson {
    const p = o.params;
    return {
      art: 'zelt',
      id: o.id,
      vorlage: p.vorlage,
      name: p.name,
      aufbau: p.aufbau,
      position: o.position.toArray(),
      drehungRad: o.drehungRad,
      durchmesser: p.durchmesser,
      ecken: p.ecken,
      laenge: p.laenge,
      breite: p.breite,
      wandhoehe: p.wandhoehe,
      firsthoehe: p.firsthoehe,
      waende: p.waende,
      abspannungen: p.abspannungen,
      seillaenge: p.seillaenge,
      haringAbstand: p.haringAbstand,
      farbe: p.farbe,
    };
  }

  /** Alle Felder sind Pflicht; die Werte prüft das Modell mit seinen eigenen Meldungen. */
  ausJson(roh: Roh): Zelt {
    const w = liste(roh.waende, 'waende').map((b) => wahrheitswert(b, 'waende'));
    return new Zelt(
      text(roh.id, 'id'),
      vektor(roh.position, 'position'),
      {
        vorlage: text(roh.vorlage, 'vorlage'),
        name: freierText(roh.name, 'name'),
        aufbau: freierText(roh.aufbau, 'aufbau') as ZeltAufbau,
        durchmesser: zahl(roh.durchmesser, 'durchmesser'),
        ecken: zahl(roh.ecken, 'ecken'),
        laenge: zahl(roh.laenge, 'laenge'),
        breite: zahl(roh.breite, 'breite'),
        wandhoehe: zahl(roh.wandhoehe, 'wandhoehe'),
        firsthoehe: zahl(roh.firsthoehe, 'firsthoehe'),
        waende: w as unknown as readonly [boolean, boolean, boolean],
        abspannungen: zahl(roh.abspannungen, 'abspannungen'),
        seillaenge: zahl(roh.seillaenge, 'seillaenge'),
        haringAbstand: zahl(roh.haringAbstand, 'haringAbstand'),
        farbe: freierText(roh.farbe, 'farbe'),
      },
      zahl(roh.drehungRad, 'drehungRad'),
    );
  }

  panel(o: Zelt): PanelSpec {
    return { felder: [], werte: {}, info: '', extras: [], mit: () => o };
  }

  fangpunkte(): readonly [] {
    return [];
  }

  beiTreffer(): null {
    return null;
  }
}
