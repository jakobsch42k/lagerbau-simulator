import type { Bauwerk } from '../model/Bauwerk';
import type { Vec3 } from '../model/Vec3';
import { DREH_SCHRITT } from './konstanten';
import { SnapService, type Treffer } from './SnapService';
import { Verlauf } from './Verlauf';
import { type EditorKontext, erzeugeWerkzeug, type Werkzeug, type WerkzeugName } from './Werkzeuge';

export interface EditorZustand {
  readonly bauwerk: Bauwerk;
  readonly auswahl: string | null;
  readonly markiert: ReadonlySet<string>;
  readonly werkzeug: WerkzeugName;
  readonly stangenStart: Vec3 | null;
  readonly meldung: string | null;
  readonly kannRueckgaengig: boolean;
  readonly kannWiederholen: boolean;
}

export interface EditorOptionen {
  readonly snap?: SnapService;
  readonly neueId?: (praefix: string) => string;
}

const zufallsId = (praefix: string): string => `${praefix}-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Controller: hält Undo-Verlauf, Auswahl, Markierung und aktives Werkzeug.
 * Jede öffentliche Methode meldet den neuen Zustand genau einmal an die Beobachter.
 */
export class Editor implements EditorKontext {
  readonly snap: SnapService;
  private verlauf: Verlauf<Bauwerk>;
  private auswahlId: string | null = null;
  private markiertIds: ReadonlySet<string> = new Set();
  private werkzeug: Werkzeug = erzeugeWerkzeug('auswahl');
  private meldung: string | null = null;
  private readonly beobachter: ((z: EditorZustand) => void)[] = [];
  private readonly idErzeuger: (praefix: string) => string;

  constructor(anfang: Bauwerk, optionen: EditorOptionen = {}) {
    this.verlauf = Verlauf.start(anfang);
    this.snap = optionen.snap ?? new SnapService();
    this.idErzeuger = optionen.neueId ?? zufallsId;
  }

  get bauwerk(): Bauwerk {
    return this.verlauf.aktuell;
  }

  /** Ob Klicks auf Seile ankommen sollen (nur im Auswahl-Werkzeug). */
  get trifftSeile(): boolean {
    return this.werkzeug.trifftSeile;
  }

  aendere(neu: Bauwerk): void {
    this.verlauf = this.verlauf.mit(neu);
    this.markiertIds = new Set();
  }

  waehle(id: string | null): void {
    this.auswahlId = id;
  }

  neueId(praefix: string): string {
    return this.idErzeuger(praefix);
  }

  abonniere(beobachter: (z: EditorZustand) => void): void {
    this.beobachter.push(beobachter);
    beobachter(this.zustand());
  }

  zustand(): EditorZustand {
    const auswahl = this.auswahlId !== null && this.bauwerk.enthaelt(this.auswahlId) ? this.auswahlId : null;
    return {
      bauwerk: this.bauwerk,
      auswahl,
      markiert: this.markiertIds,
      werkzeug: this.werkzeug.name,
      stangenStart: this.werkzeug.angefangen,
      meldung: this.meldung,
      kannRueckgaengig: this.verlauf.kannRueckgaengig,
      kannWiederholen: this.verlauf.kannWiederholen,
    };
  }

  klick(treffer: Treffer): void {
    this.fuehreAus(() => this.werkzeug.onKlick(treffer, this));
  }

  waehleWerkzeug(name: WerkzeugName): void {
    this.werkzeug.abbrechen();
    this.werkzeug = erzeugeWerkzeug(name);
    this.melde();
  }

  setzeBauwerk(bauwerk: Bauwerk): void {
    this.fuehreAus(() => {
      this.auswahlId = null;
      this.aendere(bauwerk);
    });
  }

  /**
   * Änderung aus dem Parameter-Panel. Die Änderung selbst muss innerhalb der Funktion passieren, damit ein RangeError abgefangen wird.
   * Gibt false zurück, wenn der Editor die Änderung abgelehnt hat (die Meldung steht dann im Zustand).
   */
  aendereMit(aenderung: (b: Bauwerk) => Bauwerk): boolean {
    return this.fuehreAus(() => this.aendere(aenderung(this.bauwerk)));
  }

  loescheAuswahl(): void {
    const id = this.zustand().auswahl;
    if (id === null) return;
    this.fuehreAus(() => {
      this.auswahlId = null;
      this.aendere(this.bauwerk.ohne(id));
    });
  }

  dreheAuswahl(winkel = DREH_SCHRITT): void {
    const id = this.zustand().auswahl;
    const gruppe = id === null ? undefined : this.bauwerk.gruppe(id);
    if (!gruppe) return;
    this.aendereMit((b) => b.ersetzeGruppe(gruppe.gedreht(winkel)));
  }

  rueckgaengig(): void {
    this.verlauf = this.verlauf.rueckgaengig();
    this.markiertIds = new Set();
    this.melde();
  }

  wiederholen(): void {
    this.verlauf = this.verlauf.wiederholen();
    this.markiertIds = new Set();
    this.melde();
  }

  markiere(ids: readonly string[]): void {
    this.markiertIds = new Set(ids);
    this.melde();
  }

  zeigeMeldung(text: string | null): void {
    this.meldung = text;
    this.melde();
  }

  /** Tastenkürzel. Liefert true, wenn die Taste behandelt wurde. */
  taste(taste: string, strg: boolean): boolean {
    const klein = taste.toLowerCase();
    if (strg && klein === 'z') this.rueckgaengig();
    else if (strg && klein === 'y') this.wiederholen();
    else if (!strg && (taste === 'Delete' || taste === 'Backspace')) this.loescheAuswahl();
    else if (!strg && klein === 'r') this.dreheAuswahl();
    else if (taste === 'Escape') {
      this.werkzeug.abbrechen();
      this.auswahlId = null;
      this.melde();
    } else return false;
    return true;
  }

  private fuehreAus(aktion: () => void): boolean {
    let uebernommen = true;
    try {
      aktion();
      this.meldung = null;
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
      this.meldung = e.message;
      uebernommen = false;
    }
    this.melde();
    return uebernommen;
  }

  private melde(): void {
    const z = this.zustand();
    this.beobachter.forEach((b) => b(z));
  }
}
