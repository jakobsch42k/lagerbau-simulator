import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import { DREH_SCHRITT } from './konstanten';
import { SnapService, type Treffer } from './SnapService';
import { Verlauf } from './Verlauf';
import { type EditorKontext, erzeugeWerkzeug, type Werkzeug, type WerkzeugName } from './Werkzeuge';

export interface EditorZustand {
  readonly bauwerk: Bauwerk;
  /** Alle ausgewählten Objekte (Spec v3, D6). Ids, die das Bauwerk nicht kennt, fallen heraus. */
  readonly ausgewaehlt: ReadonlySet<string>;
  /** Die eine ausgewählte id; null, wenn nichts oder mehr als ein Objekt ausgewählt ist. */
  readonly auswahl: string | null;
  readonly markiert: ReadonlySet<string>;
  readonly werkzeug: WerkzeugName;
  readonly stangenStart: Vec3 | null;
  readonly meldung: string | null;
  readonly kannRueckgaengig: boolean;
  readonly kannWiederholen: boolean;
}

export interface EditorOptionen {
  readonly arten?: ObjektRegister;
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
  private readonly arten: ObjektRegister;
  private verlauf: Verlauf<Bauwerk>;
  private ausgewaehltIds: ReadonlySet<string> = new Set();
  private markiertIds: ReadonlySet<string> = new Set();
  private werkzeug: Werkzeug;
  private meldung: string | null = null;
  private readonly beobachter: ((z: EditorZustand) => void)[] = [];
  private readonly idErzeuger: (praefix: string) => string;

  constructor(anfang: Bauwerk, optionen: EditorOptionen = {}) {
    this.verlauf = Verlauf.start(anfang);
    this.arten = optionen.arten ?? standardArten();
    this.snap = optionen.snap ?? new SnapService(this.arten);
    this.idErzeuger = optionen.neueId ?? zufallsId;
    this.werkzeug = erzeugeWerkzeug('auswahl', this.arten);
  }

  get bauwerk(): Bauwerk {
    return this.verlauf.aktuell;
  }

  /** Welche Seile oder Planen Klicks fangen sollen; hängt vom Werkzeug ab (Spec v2b, D2). */
  get klickZiele(): readonly ArtName[] {
    return this.werkzeug.klickZiele;
  }

  aendere(neu: Bauwerk): void {
    this.verlauf = this.verlauf.mit(neu);
    this.markiertIds = new Set();
  }

  waehle(id: string | null): void {
    this.ausgewaehltIds = id === null ? new Set() : new Set([id]);
  }

  /** Wählt mehrere Objekte auf einmal (Spec v3, D6). Die Bedienung dafür kommt mit E1. */
  waehleMehrere(ids: readonly string[]): void {
    this.ausgewaehltIds = new Set(ids);
    this.melde();
  }

  neueId(praefix: string): string {
    return this.idErzeuger(praefix);
  }

  abonniere(beobachter: (z: EditorZustand) => void): void {
    this.beobachter.push(beobachter);
    beobachter(this.zustand());
  }

  zustand(): EditorZustand {
    const ausgewaehlt: ReadonlySet<string> = new Set([...this.ausgewaehltIds].filter((id) => this.bauwerk.enthaelt(id)));
    return {
      bauwerk: this.bauwerk,
      ausgewaehlt,
      auswahl: ausgewaehlt.size === 1 ? ([...ausgewaehlt][0] ?? null) : null,
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
    this.werkzeug = erzeugeWerkzeug(name, this.arten);
    this.melde();
  }

  setzeBauwerk(bauwerk: Bauwerk): void {
    this.fuehreAus(() => {
      this.waehle(null);
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

  /**
   * Wendet `fn` auf mehrere Objekte an; das ergibt einen Undo-Schritt (Spec v3, D6). Unbekannte ids zählen nicht,
   * und ohne Änderung entsteht kein Schritt. Ein RangeError lehnt alles ab; die Meldung steht dann im Zustand.
   */
  aendereObjekte(ids: readonly string[], fn: (o: LagerObjekt) => LagerObjekt): boolean {
    return this.fuehreAus(() => {
      const neu = ids.reduce((b, id) => {
        const o = b.objekt(id);
        return o ? b.ersetze(fn(o)) : b;
      }, this.bauwerk);
      if (neu !== this.bauwerk) this.aendere(neu);
    });
  }

  loescheAuswahl(): void {
    const id = this.zustand().auswahl;
    if (id === null) return;
    this.fuehreAus(() => {
      this.waehle(null);
      this.aendere(this.bauwerk.ohne(id));
    });
  }

  /** Dreht wie bisher nur Baugruppen; das Drehen aller Arten kommt mit E1. */
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
      this.waehle(null);
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
