import type { LagerObjekt } from '../model/LagerObjekt';
import type { PlatzobjektForm } from '../model/params';
import { Platzobjekt } from '../model/Platzobjekt';
import { freierText, type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { textWert, zahlWert } from './gemeinsam';
import type { MaterialBeitrag } from '../model/MaterialPosten';
import type { ObjektArt, ObjektJson, PanelEingabe, PanelSpec, PlatzierenPunkt, Werte } from './ObjektArt';
import { findeVorlage, paramsAusVorlage, VORLAGEN, VorlagenWahl } from './platz/vorlagen';

export interface PlatzobjektJson extends ObjektJson {
  readonly art: 'platzobjekt';
  readonly position: V3;
  readonly drehung: number;
  readonly vorlage: string;
  readonly name: string;
  readonly form: PlatzobjektForm;
  readonly breite: number;
  readonly laenge: number;
  readonly hoehe: number;
  readonly farbe: string;
}

const FORMEN: readonly (readonly [PlatzobjektForm, string])[] = [
  ['kreis', 'Kreis'],
  ['rechteck', 'Rechteck'],
];

/** Platz-Objekt (Spec E3, D1): ein Klick setzt eines mit der gewählten Vorlage; alle Felder sind danach frei einstellbar. */
export class PlatzobjektArt implements ObjektArt<Platzobjekt> {
  readonly name = 'platzobjekt' as const;
  readonly label = 'Platz-Objekt';
  /** Nur in der Auswahl klickbar, damit ein flaches Objekt das Setzen von Bauten darauf nicht blockiert (wie Seil und Plane). */
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = false;
  readonly materialGruppe = 'platz' as const;
  readonly zaehltZumPlatzbedarf = false;
  readonly platzieren: PlatzierenPunkt;

  constructor(readonly vorlagen: VorlagenWahl = new VorlagenWahl()) {
    this.platzieren = {
      modus: 'punkt',
      erzeuge: (id, position) => new Platzobjekt(id, position, paramsAusVorlage(this.vorlagen.aktuell)),
    };
  }

  /** Ein Stück unter dem Vorlagennamen (Spec E5, D1). */
  material(o: Platzobjekt): MaterialBeitrag {
    const titel = findeVorlage(o.params.vorlage)?.label ?? o.params.name;
    return { gruppe: titel, posten: [{ kategorie: 'Platz', bezeichnung: titel, menge: 1, einheit: 'Stk' }] };
  }

  istVon(o: LagerObjekt): o is Platzobjekt {
    return o instanceof Platzobjekt;
  }

  zuJson(o: Platzobjekt): PlatzobjektJson {
    const { vorlage, name, form, breite, laenge, hoehe, farbe } = o.params;
    return { art: 'platzobjekt', id: o.id, position: o.position.toArray(), drehung: o.drehungRad, vorlage, name, form, breite, laenge, hoehe, farbe };
  }

  ausJson(roh: Roh): Platzobjekt {
    return new Platzobjekt(
      text(roh.id, 'id'),
      vektor(roh.position, 'position'),
      {
        vorlage: text(roh.vorlage, 'vorlage'),
        name: freierText(roh.name, 'name'),
        form: roh.form as PlatzobjektForm,
        breite: zahl(roh.breite, 'breite'),
        laenge: zahl(roh.laenge, 'laenge'),
        hoehe: zahl(roh.hoehe, 'hoehe'),
        farbe: freierText(roh.farbe, 'farbe'),
      },
      zahl(roh.drehung, 'drehung'),
    );
  }

  panel(o: Platzobjekt): PanelSpec {
    const { vorlage, name, form, breite, laenge, hoehe, farbe } = o.params;
    const rechteck = form === 'rechteck';
    const felder: readonly PanelEingabe[] = [
      { art: 'auswahl', schluessel: 'vorlage', label: 'Vorlage', optionen: VORLAGEN.map((v) => [v.schluessel, v.label] as const) },
      { art: 'text', schluessel: 'name', label: 'Name' },
      { art: 'auswahl', schluessel: 'form', label: 'Form', optionen: FORMEN },
      { schluessel: 'breite', label: rechteck ? 'Breite (m)' : 'Durchmesser (m)', faktor: 1 },
      ...(rechteck ? [{ schluessel: 'laenge', label: 'Länge (m)', faktor: 1 }] : []),
      { schluessel: 'hoehe', label: 'Höhe (m)', faktor: 1 },
      { art: 'farbe', schluessel: 'farbe', label: 'Farbe' },
    ];
    return {
      felder,
      werte: { vorlage, name, form, breite, laenge, hoehe, farbe },
      info: 'Steht auf dem Platz, zählt nicht zum Platzbedarf.',
      extras: [],
      mit: (w) => this.mitWerten(o, w),
    };
  }

  /** Ein Wechsel der Vorlage setzt alle Felder auf deren Werte (ein Schritt); sonst gelten die Werte des Panels. */
  private mitWerten(o: Platzobjekt, w: Werte): Platzobjekt {
    const schluessel = textWert(w, 'vorlage');
    if (schluessel !== o.params.vorlage) {
      const vorlage = findeVorlage(schluessel);
      if (!vorlage) throw new RangeError('Unbekannte Vorlage');
      return o.mitParams(paramsAusVorlage(vorlage));
    }
    return o.mitParams({
      vorlage: schluessel,
      name: textWert(w, 'name'),
      form: textWert(w, 'form') as PlatzobjektForm,
      breite: zahlWert(w, 'breite'),
      laenge: zahlWert(w, 'laenge'),
      hoehe: zahlWert(w, 'hoehe'),
      farbe: textWert(w, 'farbe'),
    });
  }

  fangpunkte(): readonly [] {
    return [];
  }

  beiTreffer(): null {
    return null;
  }
}
