import type { Editor, EditorZustand } from '../editor/Editor';
import { ABock } from '../model/ABock';
import type { Baum } from '../model/Baum';
import { Dreibein } from '../model/Dreibein';
import type { Plane } from '../model/Plane';
import type { Seil } from '../model/Seil';
import type { Stange } from '../model/Stange';
import type { PlanenForm, PlanenParams } from '../model/params';
import { Neuaufbau } from './Neuaufbau';

interface Feld<P> {
  readonly schluessel: keyof P & string;
  readonly label: string;
  readonly faktor: number; // Anzeige = Modellwert × faktor (Ø in cm, Rest in m)
  readonly schritt?: string; // Standard: 0.05 bei Metern, 1 bei Zentimetern
}

const PLANEN_FORMEN: readonly (readonly [PlanenForm, string])[] = [
  ['eben', 'eben'],
  ['satteldach', 'Satteldach'],
];

/** Anzeige-Text eines Modellwerts: auf drei Nachkommastellen gerundet, in Anzeige-Einheit. */
const anzeige = (wert: number, faktor: number): string => String(Math.round(wert * faktor * 1000) / 1000);

/** Formular für die ausgewählte Baugruppe, freie Stange, den Baum, das Seil oder die Plane. Ungültige Werte meldet der Editor. */
export class ParameterPanel {
  private readonly neuaufbau = new Neuaufbau();

  constructor(
    private readonly wurzel: HTMLElement,
    private readonly editor: Editor,
  ) {}

  zeige(z: EditorZustand): void {
    const id = z.auswahl;
    const bauwerk = z.bauwerk;
    const gruppe = id === null ? undefined : bauwerk.gruppe(id);
    const freieStange = id === null || gruppe ? undefined : bauwerk.stange(id);
    const baum = id === null ? undefined : bauwerk.baum(id);
    const seil = id === null ? undefined : bauwerk.seil(id);
    const plane = id === null ? undefined : bauwerk.plane(id);
    if (!this.neuaufbau.noetig(id, gruppe ?? freieStange ?? baum ?? seil ?? plane ?? null)) return;
    this.wurzel.replaceChildren();
    if (gruppe instanceof Dreibein) this.dreibeinFormular(gruppe);
    else if (gruppe instanceof ABock) this.aBockFormular(gruppe);
    else if (freieStange) this.stangenFormular(freieStange);
    else if (baum) this.baumFormular(baum);
    else if (seil) this.seilInfo(seil);
    else if (plane) this.planeFormular(plane);
  }

  private dreibeinFormular(g: Dreibein): void {
    this.formular(
      'Dreibein',
      [
        { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
        { schluessel: 'fusskreisradius', label: 'Fußkreisradius (m)', faktor: 1 },
        { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
      ],
      g.params,
      (p) => this.editor.aendereMit((b) => b.ersetzeGruppe(g.mitParams(p))),
      `Höhe ${g.hoehe().toFixed(2)} m · Beinwinkel ${g.beinwinkelGrad().toFixed(0)}° · R dreht`,
    );
  }

  private aBockFormular(g: ABock): void {
    this.formular(
      'A-Bock',
      [
        { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
        { schluessel: 'fussabstand', label: 'Fußabstand (m)', faktor: 1 },
        { schluessel: 'riegelhoehe', label: 'Riegelhöhe (m)', faktor: 1 },
        { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
      ],
      g.params,
      (p) => this.editor.aendereMit((b) => b.ersetzeGruppe(g.mitParams(p))),
      `Höhe ${g.hoehe().toFixed(2)} m · Beinwinkel ${g.beinwinkelGrad().toFixed(0)}° · R dreht`,
    );
  }

  private stangenFormular(s: Stange): void {
    this.formular(
      'Stange',
      [{ schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 }],
      { durchmesser: s.durchmesser },
      (p) => this.editor.aendereMit((b) => b.ersetzeStange(s.mitDurchmesser(p.durchmesser))),
      `Länge ${s.laenge.toFixed(2)} m`,
    );
  }

  private baumFormular(baum: Baum): void {
    this.formular(
      'Baum',
      [
        { schluessel: 'durchmesser', label: 'Stammdurchmesser (cm)', faktor: 100 },
        { schluessel: 'hoehe', label: 'Höhe (m)', faktor: 1 },
      ],
      baum.params,
      (p) => this.editor.aendereMit((b) => b.ersetzeBaum(baum.mitParams(p))),
      'Steht auf dem Platz, gehört nicht zum Bau.',
    );
  }

  private seilInfo(s: Seil): void {
    this.formular('Seil', [], {}, () => true, `Länge ${s.laenge.toFixed(2)} m · Winkel zum Boden ${s.winkelZumBodenGrad.toFixed(0)}°`);
  }

  private planeFormular(plane: Plane): void {
    const aendere = (p: PlanenParams): boolean => this.editor.aendereMit((b) => b.ersetzePlane(plane.mitParams(p)));
    this.formular(
      'Plane',
      [
        { schluessel: 'breite', label: 'Breite (m)', faktor: 1 },
        { schluessel: 'laenge', label: 'Länge (m)', faktor: 1 },
        { schluessel: 'neigungGrad', label: 'Neigung (°)', faktor: 1, schritt: '1' },
      ],
      plane.params,
      aendere,
      `Aufhängelinie ${plane.linienLaenge.toFixed(2)} m · zum Verschieben neu spannen`,
      [this.formAuswahl(plane, aendere), ...(plane.params.form === 'eben' ? [this.seitenKnopf(plane, aendere)] : [])],
    );
  }

  private formAuswahl(plane: Plane, aendere: (p: PlanenParams) => boolean): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = 'Form';
    const auswahl = document.createElement('select');
    for (const [wert, text] of PLANEN_FORMEN) {
      const option = document.createElement('option');
      option.value = wert;
      option.textContent = text;
      auswahl.append(option);
    }
    auswahl.value = plane.params.form;
    auswahl.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also springt die Auswahl zurück, wie ein Zahlenfeld.
      if (!aendere({ ...plane.params, form: auswahl.value as PlanenForm })) auswahl.value = plane.params.form;
    });
    label.append(auswahl);
    return label;
  }

  private seitenKnopf(plane: Plane, aendere: (p: PlanenParams) => boolean): HTMLButtonElement {
    const knopf = document.createElement('button');
    knopf.textContent = 'Seite wechseln';
    knopf.addEventListener('click', () => aendere({ ...plane.params, seite: plane.params.seite === 1 ? -1 : 1 }));
    return knopf;
  }

  private formular<P extends object>(
    titel: string,
    felder: readonly Feld<P>[],
    werte: P,
    uebernehme: (neu: P) => boolean,
    info: string,
    extras: readonly HTMLElement[] = [],
  ): void {
    const kopf = document.createElement('h2');
    kopf.textContent = titel;
    const eingaben = felder.map((feld) => {
      const label = document.createElement('label');
      label.className = 'feld';
      label.textContent = feld.label;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = feld.schritt ?? (feld.faktor === 1 ? '0.05' : '1');
      input.value = anzeige(werte[feld.schluessel] as number, feld.faktor);
      input.addEventListener('change', () => {
        const uebernommen = uebernehme({ ...werte, [feld.schluessel]: Number(input.value) / feld.faktor });
        // Abgelehnt: Das Modell ist unverändert, also baut das Panel nicht neu auf. Das Feld zeigt sonst einen Wert, den es nicht gibt.
        if (!uebernommen) input.value = anzeige(werte[feld.schluessel] as number, feld.faktor);
      });
      label.append(input);
      return label;
    });
    const infoZeile = document.createElement('p');
    infoZeile.textContent = info;
    const loeschen = document.createElement('button');
    loeschen.textContent = 'Löschen (Entf)';
    loeschen.addEventListener('click', () => this.editor.loescheAuswahl());
    this.wurzel.append(kopf, ...eingaben, ...extras, infoZeile, loeschen);
  }
}
