import type { Editor, EditorZustand } from '../editor/Editor';
import { ABock } from '../model/ABock';
import { Dreibein } from '../model/Dreibein';
import { Neuaufbau } from './Neuaufbau';

interface Feld<P> {
  readonly schluessel: keyof P & string;
  readonly label: string;
  readonly faktor: number; // Anzeige = Modellwert × faktor (Ø in cm, Rest in m)
}

/** Formular für die ausgewählte Baugruppe oder freie Stange. Ungültige Werte meldet der Editor. */
export class ParameterPanel {
  private readonly neuaufbau = new Neuaufbau();

  constructor(
    private readonly wurzel: HTMLElement,
    private readonly editor: Editor,
  ) {}

  zeige(z: EditorZustand): void {
    const gruppe = z.auswahl === null ? undefined : z.bauwerk.gruppe(z.auswahl);
    const freieStange = z.auswahl === null || gruppe ? undefined : z.bauwerk.stange(z.auswahl);
    if (!this.neuaufbau.noetig(z.auswahl, gruppe ?? freieStange ?? null)) return;
    this.wurzel.replaceChildren();
    if (z.auswahl === null) return;
    if (gruppe instanceof Dreibein) {
      this.formular(
        'Dreibein',
        [
          { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
          { schluessel: 'fusskreisradius', label: 'Fußkreisradius (m)', faktor: 1 },
          { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
        ],
        gruppe.params,
        (p) => this.editor.aendereMit((b) => b.ersetzeGruppe(gruppe.mitParams(p))),
        `Höhe ${gruppe.hoehe().toFixed(2)} m · Beinwinkel ${gruppe.beinwinkelGrad().toFixed(0)}° · R dreht`,
      );
    } else if (gruppe instanceof ABock) {
      this.formular(
        'A-Bock',
        [
          { schluessel: 'stangenlaenge', label: 'Stangenlänge (m)', faktor: 1 },
          { schluessel: 'fussabstand', label: 'Fußabstand (m)', faktor: 1 },
          { schluessel: 'riegelhoehe', label: 'Riegelhöhe (m)', faktor: 1 },
          { schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 },
        ],
        gruppe.params,
        (p) => this.editor.aendereMit((b) => b.ersetzeGruppe(gruppe.mitParams(p))),
        `Höhe ${gruppe.hoehe().toFixed(2)} m · Beinwinkel ${gruppe.beinwinkelGrad().toFixed(0)}° · R dreht`,
      );
    } else {
      const stange = freieStange;
      if (!stange) return;
      this.formular(
        'Stange',
        [{ schluessel: 'durchmesser', label: 'Ø (cm)', faktor: 100 }],
        { durchmesser: stange.durchmesser },
        (p) => this.editor.aendereMit((b) => b.ersetzeStange(stange.mitDurchmesser(p.durchmesser))),
        `Länge ${stange.laenge.toFixed(2)} m`,
      );
    }
  }

  private formular<P extends object>(
    titel: string,
    felder: readonly Feld<P>[],
    werte: P,
    uebernehme: (neu: P) => void,
    info: string,
  ): void {
    const kopf = document.createElement('h2');
    kopf.textContent = titel;
    const eingaben = felder.map((feld) => {
      const label = document.createElement('label');
      label.className = 'feld';
      label.textContent = feld.label;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = feld.faktor === 1 ? '0.05' : '1';
      input.value = String(Math.round((werte[feld.schluessel] as number) * feld.faktor * 1000) / 1000);
      input.addEventListener('change', () => uebernehme({ ...werte, [feld.schluessel]: Number(input.value) / feld.faktor }));
      label.append(input);
      return label;
    });
    const infoZeile = document.createElement('p');
    infoZeile.textContent = info;
    const loeschen = document.createElement('button');
    loeschen.textContent = 'Löschen (Entf)';
    loeschen.addEventListener('click', () => this.editor.loescheAuswahl());
    this.wurzel.append(kopf, ...eingaben, infoZeile, loeschen);
  }
}
