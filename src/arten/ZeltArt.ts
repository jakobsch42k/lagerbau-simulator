import type { LagerObjekt } from '../model/LagerObjekt';
import type { ZeltAufbau, ZeltParams } from '../model/params';
import { Zelt } from '../model/Zelt';
import { ZeltGeometrie } from '../model/ZeltGeometrie';
import { freierText, liste, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { textWert, zahlText, zahlWert } from './gemeinsam';
import { type MaterialBeitrag, seilLaenge } from '../model/MaterialPosten';
import type { MaterialKontext, ObjektArt, ObjektJson, PanelAuswahl, PanelEingabe, PanelSpec, PlatzierenPunkt, Werte } from './ObjektArt';
import { findeZeltVorlage, paramsAusZeltVorlage, ZELT_VORLAGEN, ZeltVorlagenWahl } from './zelt/vorlagen';

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

const GRAD_JE_RAD = 180 / Math.PI;
const AUFBAU: readonly (readonly [ZeltAufbau, string])[] = [
  ['rund', 'Rund (Jurte)'],
  ['sattel', 'Sattel'],
];
const AN_AUS: readonly (readonly [string, string])[] = [
  ['an', 'an'],
  ['aus', 'aus'],
];
const WAENDE = ['wand1', 'wand2', 'wand3'] as const;

/** Drehung im Panel: Grad auf zwei Stellen, 0 bis unter 360. */
const gradImPanel = (rad: number): number => Math.round((((rad * GRAD_JE_RAD) % 360) + 360) % 360 * 100) / 100;

const zehntel = (wert: number): string => wert.toLocaleString('de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const wahrheitswert = (d: unknown, name: string): boolean => {
  if (typeof d !== 'boolean') throw new Error(`${name} ist kein Wahrheitswert`);
  return d;
};

/** Zelt (Spec E4, D5): ein Klick setzt eines mit der gewählten Vorlage; alle Maße sind danach je Zelt einstellbar. */
export class ZeltArt implements ObjektArt<Zelt> {
  readonly name = 'zelt' as const;
  readonly label = 'Zelt';
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = false;
  readonly materialGruppe = 'zelt' as const;
  readonly platzieren: PlatzierenPunkt;

  constructor(readonly vorlagen: ZeltVorlagenWahl = new ZeltVorlagenWahl()) {
    this.platzieren = {
      modus: 'punkt',
      erzeuge: (id, position) => new Zelt(id, position, paramsAusZeltVorlage(this.vorlagen.aktuell)),
    };
  }

  /** Zelt, Haringe und Abspannseile (Spec E5, D1); die Gruppe ist der Vorlagenname, nicht der Name des einzelnen Zelts. */
  material(o: Zelt, ctx: MaterialKontext): MaterialBeitrag {
    const { vorlage, name, abspannungen, seillaenge } = o.params;
    const titel = findeZeltVorlage(vorlage)?.label ?? name;
    return {
      gruppe: titel,
      posten: [
        { kategorie: 'Zelt', bezeichnung: titel, menge: 1, einheit: 'Stk' },
        { kategorie: 'Haring', bezeichnung: 'Haring', menge: abspannungen, einheit: 'Stk' },
        { kategorie: 'Seil', bezeichnung: `Abspannseil ${seilLaenge(seillaenge, ctx.zugabeProEnde)} m`, menge: abspannungen, einheit: 'Stk' },
      ],
    };
  }

  /** Statuszeile nach dem Setzen. */
  meldungNachSetzen(o: Zelt): string {
    return `Zelt gesetzt: ${o.params.name}`;
  }

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
    const p = o.params;
    const rund = p.aufbau === 'rund';
    const fest = p.aufbau === 'doppelkegel'; // feste Bauart: Maße, Form und Leinen sind nicht einstellbar
    const zahl = (schluessel: string, label: string, schritt?: string): PanelEingabe => ({ schluessel, label, faktor: 1, ...(schritt ? { schritt } : {}) });
    const wand = (nr: number): PanelAuswahl => ({ art: 'auswahl', schluessel: `wand${nr + 1}`, label: `Wand ${nr + 1}`, optionen: AN_AUS });
    const festeFelder: readonly PanelEingabe[] = [
      { art: 'auswahl', schluessel: 'vorlage', label: 'Vorlage', optionen: ZELT_VORLAGEN.map((v) => [v.schluessel, v.label] as const) },
      { art: 'text', schluessel: 'name', label: 'Name' },
      zahl('drehung', 'Drehung (°)', '1'),
      { art: 'farbe', schluessel: 'farbe', label: 'Farbe' },
    ];
    const felder: readonly PanelEingabe[] = fest ? festeFelder : [
      { art: 'auswahl', schluessel: 'vorlage', label: 'Vorlage', optionen: ZELT_VORLAGEN.map((v) => [v.schluessel, v.label] as const) },
      { art: 'text', schluessel: 'name', label: 'Name' },
      { art: 'auswahl', schluessel: 'aufbau', label: 'Form', optionen: AUFBAU },
      ...(rund
        ? [zahl('durchmesser', 'Durchmesser (m)'), zahl('ecken', 'Ecken', '1'), wand(0), wand(1), wand(2)]
        : [zahl('laenge', 'Länge (m)', '0.5'), zahl('breite', 'Breite (m)', '0.5')]),
      zahl('wandhoehe', 'Wandhöhe (m)'),
      zahl('firsthoehe', 'Firsthöhe (m)'),
      zahl('abspannungen', 'Abspannungen', '1'),
      zahl('seillaenge', 'Seillänge (m)'),
      zahl('haringAbstand', 'Haring-Abstand (m)'),
      zahl('drehung', 'Drehung (°)', '1'),
      { art: 'farbe', schluessel: 'farbe', label: 'Farbe' },
    ];
    const werte: Werte = {
      vorlage: p.vorlage,
      name: p.name,
      aufbau: p.aufbau,
      durchmesser: p.durchmesser,
      ecken: p.ecken,
      laenge: p.laenge,
      breite: p.breite,
      wand1: p.waende[0] ? 'an' : 'aus',
      wand2: p.waende[1] ? 'an' : 'aus',
      wand3: p.waende[2] ? 'an' : 'aus',
      wandhoehe: p.wandhoehe,
      firsthoehe: p.firsthoehe,
      abspannungen: p.abspannungen,
      seillaenge: p.seillaenge,
      haringAbstand: p.haringAbstand,
      drehung: gradImPanel(o.drehungRad),
      farbe: p.farbe,
    };
    const haringe = p.abspannungen === 1 ? '1 Haring' : `${p.abspannungen} Haringe`;
    const info = `Fläche ${zahlText(ZeltGeometrie.flaeche(o), 0)} m² · ${haringe} · Seil je ${zehntel(p.seillaenge)} m`;
    return { felder, werte, info, extras: [], mit: (w) => this.mitWerten(o, w) };
  }

  /** Ein Vorlagenwechsel setzt alle Maße auf die der Vorlage (ein Schritt, Lage und Drehung bleiben); sonst gelten die Werte des Panels. */
  private mitWerten(o: Zelt, w: Werte): Zelt {
    const schluessel = textWert(w, 'vorlage');
    if (schluessel !== o.params.vorlage) {
      const vorlage = findeZeltVorlage(schluessel);
      if (!vorlage) throw new RangeError('Unbekannte Vorlage');
      return o.mitParams(paramsAusZeltVorlage(vorlage));
    }
    if (o.params.aufbau === 'doppelkegel') {
      const grad = zahlWert(w, 'drehung');
      const drehung = grad === gradImPanel(o.drehungRad) ? o.drehungRad : grad / GRAD_JE_RAD;
      return new Zelt(o.id, o.position, { ...o.params, name: textWert(w, 'name'), farbe: textWert(w, 'farbe') }, drehung);
    }
    const params: ZeltParams = {
      vorlage: schluessel,
      name: textWert(w, 'name'),
      aufbau: textWert(w, 'aufbau') as ZeltAufbau,
      durchmesser: zahlWert(w, 'durchmesser'),
      ecken: zahlWert(w, 'ecken'),
      laenge: zahlWert(w, 'laenge'),
      breite: zahlWert(w, 'breite'),
      wandhoehe: zahlWert(w, 'wandhoehe'),
      firsthoehe: zahlWert(w, 'firsthoehe'),
      waende: WAENDE.map((n) => textWert(w, n) !== 'aus') as unknown as readonly [boolean, boolean, boolean],
      abspannungen: zahlWert(w, 'abspannungen'),
      seillaenge: zahlWert(w, 'seillaenge'),
      haringAbstand: zahlWert(w, 'haringAbstand'),
      farbe: textWert(w, 'farbe'),
    };
    const grad = zahlWert(w, 'drehung');
    const drehung = grad === gradImPanel(o.drehungRad) ? o.drehungRad : grad / GRAD_JE_RAD;
    return new Zelt(o.id, o.position, params, drehung);
  }

  fangpunkte(): readonly [] {
    return [];
  }

  beiTreffer(): null {
    return null;
  }
}
