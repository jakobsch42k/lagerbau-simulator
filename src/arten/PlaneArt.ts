import { FUSS_TOLERANZ, MIN_SEILLAENGE } from '../model/konstanten';
import type { LagerObjekt } from '../model/LagerObjekt';
import { type PlanenForm, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import type { Vec3 } from '../model/Vec3';
import { type Roh, text, type V3, vektor, zahl } from '../share/lesen';
import { textWert, zahlWert } from './gemeinsam';
import type { Fangpunkt, ObjektArt, ObjektJson, PanelExtra, PanelSpec, PlatzierenLinie } from './ObjektArt';

export interface PlaneJson extends ObjektJson {
  readonly art: 'plane';
  readonly start: V3;
  readonly ende: V3;
  readonly breite: number;
  readonly laenge: number;
  readonly form: PlanenForm;
  /** Grad. */
  readonly neigung: number;
  readonly seite: 1 | -1;
}

/** Beim Anlegen gibt es noch keine Plane, deren Maße man ändern könnte; die Meldung des Modells („Neigung, Breite oder Länge verringern“) passt nur zum Bearbeiten im Panel. */
const PLANE_BODEN_MODELLFEHLER = 'Plane reicht in den Boden';
const PLANE_BODEN_BEIM_ERSTELLEN = 'Plane reicht in den Boden: Aufhängelinie höher oder waagrechter spannen.';

const PLANEN_FORMEN: readonly (readonly [PlanenForm, string])[] = [
  ['eben', 'eben'],
  ['satteldach', 'Satteldach'],
];

/**
 * Startplane für „Plane spannen“ (Spec v2b, D2). Beide Enden am Boden: Bodenplane mit 0°. Sonst 30°, oder die größte ganze
 * Gradzahl darunter, bei der keine Öse im Boden liegt. Passt nicht einmal 0°, fliegt der RangeError bis zum Editor; der zeigt ihn als Meldung.
 */
function startPlane(id: string, start: Vec3, ende: Vec3): Plane {
  const amBoden = start.y <= FUSS_TOLERANZ && ende.y <= FUSS_TOLERANZ;
  for (let grad = amBoden ? 0 : STANDARD_PLANE.neigungGrad; ; grad -= 1) {
    try {
      return new Plane(id, start, ende, { ...STANDARD_PLANE, neigungGrad: grad });
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      if (grad === 0) throw e.message.startsWith(PLANE_BODEN_MODELLFEHLER) ? new RangeError(PLANE_BODEN_BEIM_ERSTELLEN) : e;
    }
  }
}

/** Plane an einer Aufhängelinie (Spec v2b). Im JSON heißt die Neigung `neigung`, im Modell `neigungGrad`. */
export class PlaneArt implements ObjektArt<Plane> {
  readonly name = 'plane' as const;
  readonly label = 'Plane';
  /** Eine große Plane soll das Setzen eines Dreibeins darunter nicht blockieren (Spec v2b, D2). */
  readonly klick = 'wahlweise' as const;
  readonly hatOesen = true;
  readonly materialGruppe = 'bau' as const;
  readonly platzieren: PlatzierenLinie = {
    modus: 'linie',
    mindestabstand: MIN_SEILLAENGE,
    fangtOesen: false,
    erzeuge: startPlane,
  };

  istVon(o: LagerObjekt): o is Plane {
    return o instanceof Plane;
  }

  zuJson(p: Plane): PlaneJson {
    const { breite, laenge, form, neigungGrad, seite } = p.params;
    return { art: 'plane', id: p.id, start: p.start.toArray(), ende: p.ende.toArray(), breite, laenge, form, neigung: neigungGrad, seite };
  }

  ausJson(roh: Roh): Plane {
    const form = roh.form;
    if (form !== 'eben' && form !== 'satteldach') throw new Error('form unbekannt');
    const seite = roh.seite;
    if (seite !== 1 && seite !== -1) throw new Error('seite muss 1 oder -1 sein');
    return new Plane(text(roh.id, 'id'), vektor(roh.start, 'start'), vektor(roh.ende, 'ende'), {
      breite: zahl(roh.breite, 'breite'),
      laenge: zahl(roh.laenge, 'laenge'),
      form,
      neigungGrad: zahl(roh.neigung, 'neigung'),
      seite,
    });
  }

  panel(p: Plane): PanelSpec {
    const { breite, laenge, form, neigungGrad, seite } = p.params;
    const formAuswahl: PanelExtra = { art: 'auswahl', schluessel: 'form', label: 'Form', optionen: PLANEN_FORMEN };
    // Beim Satteldach hängt die Plane zu beiden Seiten; die Seite wird gespeichert, wirkt aber nicht.
    const seitenKnopf: PanelExtra = { art: 'knopf', text: 'Seite wechseln', aenderung: { seite: -seite } };
    return {
      felder: [
        { schluessel: 'breite', label: 'Breite (m)', faktor: 1 },
        { schluessel: 'laenge', label: 'Länge (m)', faktor: 1 },
        { schluessel: 'neigungGrad', label: 'Neigung (°)', faktor: 1, schritt: '1' },
      ],
      werte: { breite, laenge, form, neigungGrad, seite },
      info: `Aufhängelinie ${p.linienLaenge.toFixed(2)} m · zum Verschieben neu spannen`,
      extras: form === 'eben' ? [formAuswahl, seitenKnopf] : [formAuswahl],
      mit: (w) =>
        p.mitParams({
          breite: zahlWert(w, 'breite'),
          laenge: zahlWert(w, 'laenge'),
          form: textWert(w, 'form') as PlanenForm,
          neigungGrad: zahlWert(w, 'neigungGrad'),
          seite: zahlWert(w, 'seite') as 1 | -1,
        }),
    };
  }

  /** Ösen sind nur im Seil-Werkzeug Fangpunkte (Spec v2b, D2). */
  fangpunkte(p: Plane, mitOesen: boolean): readonly Fangpunkt[] {
    return mitOesen ? p.oesen.map((punkt): Fangpunkt => ({ punkt, art: 'oese' })) : [];
  }

  /** Ein Klick auf die Plane rastet im Seil-Werkzeug auf ihre nächste Öse, egal wie weit; so hängt kein Seilende in der Luft. */
  beiTreffer(p: Plane, _teilId: string, punkt: Vec3, mitOesen: boolean): Fangpunkt | null {
    return mitOesen ? { punkt: p.naechsteOese(punkt), art: 'oese' } : null;
  }
}
