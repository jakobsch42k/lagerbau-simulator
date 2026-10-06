import { zahlWert } from '../arten/gemeinsam';
import type { PanelAuswahl, PanelFeld, PanelKnopf, PanelSpec, Werte } from '../arten/ObjektArt';
import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Editor, EditorZustand } from '../editor/Editor';
import { Neuaufbau } from './Neuaufbau';

/** Übernimmt neue Werte ins Modell; false, wenn der Editor sie abgelehnt hat (die Meldung steht dann im Zustand). */
type Uebernehme = (werte: Werte) => boolean;

/** Anzeige-Text eines Modellwerts: auf drei Nachkommastellen gerundet, in Anzeige-Einheit. */
const anzeige = (wert: number, faktor: number): string => String(Math.round(wert * faktor * 1000) / 1000);

/** Formular für das ausgewählte Objekt, gebaut aus der Panel-Beschreibung seiner Art (Spec v3, D4). Ungültige Werte meldet der Editor. */
export class ParameterPanel {
  private readonly neuaufbau = new Neuaufbau();

  constructor(
    private readonly wurzel: HTMLElement,
    private readonly editor: Editor,
    private readonly arten: ObjektRegister = standardArten(),
  ) {}

  zeige(z: EditorZustand): void {
    const objekt = z.auswahl === null ? undefined : z.bauwerk.objekt(z.auswahl);
    if (!this.neuaufbau.noetig(z.auswahl, objekt ?? null)) return;
    this.wurzel.replaceChildren();
    if (!objekt) return;
    const art = this.arten.artVon(objekt);
    this.formular(art.label, art.panel(objekt));
  }

  private formular(titel: string, spec: PanelSpec): void {
    // Die Änderung passiert innerhalb von aendereMit, damit der Editor einen RangeError abfängt.
    const uebernehme: Uebernehme = (werte) => this.editor.aendereMit((b) => b.ersetze(spec.mit(werte)));
    const kopf = document.createElement('h2');
    kopf.textContent = titel;
    const eingaben = spec.felder.map((feld) => this.zahlenfeld(feld, spec.werte, uebernehme));
    const extras = spec.extras.map((extra) =>
      extra.art === 'auswahl' ? this.auswahlfeld(extra, spec.werte, uebernehme) : this.knopf(extra, spec.werte, uebernehme),
    );
    const infoZeile = document.createElement('p');
    infoZeile.textContent = spec.info;
    const loeschen = document.createElement('button');
    loeschen.textContent = 'Löschen (Entf)';
    loeschen.addEventListener('click', () => this.editor.loescheAuswahl());
    this.wurzel.append(kopf, ...eingaben, ...extras, infoZeile, loeschen);
  }

  private zahlenfeld(feld: PanelFeld, werte: Werte, uebernehme: Uebernehme): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = feld.label;
    const input = document.createElement('input');
    input.type = 'number';
    input.step = feld.schritt ?? (feld.faktor === 1 ? '0.05' : '1');
    const modellwert = anzeige(zahlWert(werte, feld.schluessel), feld.faktor);
    input.value = modellwert;
    input.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also baut das Panel nicht neu auf. Das Feld zeigt sonst einen Wert, den es nicht gibt.
      if (!uebernehme({ ...werte, [feld.schluessel]: Number(input.value) / feld.faktor })) input.value = modellwert;
    });
    label.append(input);
    return label;
  }

  private auswahlfeld(auswahl: PanelAuswahl, werte: Werte, uebernehme: Uebernehme): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'feld';
    label.textContent = auswahl.label;
    const select = document.createElement('select');
    for (const [wert, text] of auswahl.optionen) {
      const option = document.createElement('option');
      option.value = wert;
      option.textContent = text;
      select.append(option);
    }
    const modellwert = String(werte[auswahl.schluessel]);
    select.value = modellwert;
    select.addEventListener('change', () => {
      // Abgelehnt: Das Modell ist unverändert, also springt die Auswahl zurück, wie ein Zahlenfeld.
      if (!uebernehme({ ...werte, [auswahl.schluessel]: select.value })) select.value = modellwert;
    });
    label.append(select);
    return label;
  }

  private knopf(knopf: PanelKnopf, werte: Werte, uebernehme: Uebernehme): HTMLButtonElement {
    const element = document.createElement('button');
    element.textContent = knopf.text;
    element.addEventListener('click', () => uebernehme({ ...werte, ...knopf.aenderung }));
    return element;
  }
}
