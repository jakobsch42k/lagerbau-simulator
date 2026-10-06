import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import { kopiere, mitte } from '../model/Duplikat';
import { bewege, mitgenommen } from '../model/Mitbewegung';
import { Vec3 } from '../model/Vec3';
import { idsImRechteck, type Rechteck } from './Rahmenwahl';
import type { Messung } from './Messung';
import { DREH_SCHRITT, DUPLIKAT_VERSATZ, PFEIL_SCHRITT, PFEIL_SCHRITT_GROSS } from './konstanten';
import { SnapService, type Treffer } from './SnapService';
import { Verlauf } from './Verlauf';
import { Ziehvorgang } from './Ziehvorgang';
import { type EditorKontext, erzeugeWerkzeug, type KlickOptionen, type Werkzeug, type WerkzeugName } from './Werkzeuge';

export interface EditorZustand {
  readonly bauwerk: Bauwerk;
  /** Beim Ziehen der Zwischenstand, den die Szene zeigt (kein Verlaufseintrag, die Hinweise rechnen am `bauwerk`); sonst null. */
  readonly vorschau: Bauwerk | null;
  /** Alle ausgewählten Objekte (Spec v3, D6). Ids, die das Bauwerk nicht kennt, fallen heraus. */
  readonly ausgewaehlt: ReadonlySet<string>;
  /** Die eine ausgewählte id; null, wenn nichts oder mehr als ein Objekt ausgewählt ist. */
  readonly auswahl: string | null;
  readonly markiert: ReadonlySet<string>;
  readonly werkzeug: WerkzeugName;
  readonly stangenStart: Vec3 | null;
  /** Die angezeigte Messung (nicht im Bauwerk, nicht gespeichert); sonst null. */
  readonly messung: Messung | null;
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
  private messungWert: Messung | null = null;
  private ziehen: Ziehvorgang | null = null;
  private zwischenablage: readonly LagerObjekt[] = [];
  private mausPunkt: Vec3 | null = null;
  /** Blickrichtung der Ansicht (waagrechter Anteil); „oben“ der Pfeiltasten. Standard Norden (-z), wie in der Planansicht. */
  private blick: Vec3 = new Vec3(0, 0, -1);
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

  auswahl(): ReadonlySet<string> {
    return this.zustand().ausgewaehlt;
  }

  setzeAuswahl(ids: Iterable<string>): void {
    this.ausgewaehltIds = new Set(ids);
  }

  /** Wählt mehrere Objekte auf einmal (Spec v3, D6). */
  waehleMehrere(ids: readonly string[]): void {
    this.ausgewaehltIds = new Set(ids);
    this.melde();
  }

  neueId(praefix: string): string {
    return this.idErzeuger(praefix);
  }

  setzeMessung(messung: Messung | null): void {
    this.messungWert = messung;
  }

  /** Rahmen-Auswahl der Planansicht: wählt alle Objekte im Rechteck (ersetzt die Auswahl). Nur im Auswahl-Werkzeug. */
  waehleImRahmen(rechteck: Rechteck): void {
    if (this.werkzeug.name !== 'auswahl') return;
    this.waehleMehrere(idsImRechteck(this.bauwerk, rechteck));
  }

  abonniere(beobachter: (z: EditorZustand) => void): void {
    this.beobachter.push(beobachter);
    beobachter(this.zustand());
  }

  zustand(): EditorZustand {
    const ausgewaehlt: ReadonlySet<string> = new Set([...this.ausgewaehltIds].filter((id) => this.bauwerk.enthaelt(id)));
    return {
      bauwerk: this.bauwerk,
      vorschau: this.ziehen?.vorschau ?? null,
      ausgewaehlt,
      auswahl: ausgewaehlt.size === 1 ? ([...ausgewaehlt][0] ?? null) : null,
      markiert: this.markiertIds,
      werkzeug: this.werkzeug.name,
      stangenStart: this.werkzeug.angefangen,
      messung: this.messungWert,
      meldung: this.meldung,
      kannRueckgaengig: this.verlauf.kannRueckgaengig,
      kannWiederholen: this.verlauf.kannWiederholen,
    };
  }

  klick(treffer: Treffer, optionen: KlickOptionen = {}): void {
    this.fuehreAus(() => this.werkzeug.onKlick(treffer, this, optionen));
  }

  /** Doppelklick: wählt den ganzen Bau. Werkzeuge ohne Doppelklick-Verhalten ignorieren ihn. */
  doppelklick(treffer: Treffer, optionen: KlickOptionen = {}): void {
    const werkzeug = this.werkzeug;
    if (werkzeug.onDoppelklick) this.fuehreAus(() => werkzeug.onDoppelklick?.(treffer, this, optionen));
  }

  waehleAlle(): void {
    this.waehleMehrere(this.bauwerk.objekte.map((o) => o.id));
  }

  waehleWerkzeug(name: WerkzeugName): void {
    this.werkzeug.abbrechen();
    this.messungWert = null;
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
      const neu = [...new Set(ids)].reduce((b, id) => {
        const o = b.objekt(id);
        return o ? b.ersetze(fn(o)) : b;
      }, this.bauwerk);
      if (neu !== this.bauwerk) this.aendere(neu);
    });
  }

  /** Löscht die ganze Auswahl in einem Undo-Schritt. */
  loescheAuswahl(): void {
    const ids = this.zustand().ausgewaehlt;
    if (ids.size === 0) return;
    this.fuehreAus(() => {
      this.waehle(null);
      this.aendere([...ids].reduce((b, id) => b.ohne(id), this.bauwerk));
    });
  }

  /**
   * Dreht die Auswahl um den Mittelpunkt ihrer Platzpunkte (bei Objekten ohne Platzpunkte um deren eigenen Drehpunkt),
   * samt Seilen und Planen (Spec E1, D3). Ein Undo-Schritt.
   */
  dreheAuswahl(winkel = DREH_SCHRITT): void {
    const ids = [...this.zustand().ausgewaehlt];
    const um = mitte(ids.flatMap((id) => this.bauwerk.objekt(id) ?? []));
    if (um === null) return;
    this.aendereMit((b) => bewege(b, ids, { art: 'drehung', winkelRad: winkel, um }));
  }

  /** Verschiebt die Auswahl samt Seilen und Planen waagrecht um `dv`. Ein Undo-Schritt; false, wenn nichts ausgewählt oder abgelehnt. */
  verschiebeAuswahl(dv: Vec3): boolean {
    const ids = [...this.zustand().ausgewaehlt];
    if (ids.length === 0) return false;
    return this.aendereMit((b) => bewege(b, ids, { art: 'verschiebung', dv }));
  }

  /** Für die Pfeiltasten: wohin „oben“ zeigt. Nur der waagrechte Anteil zählt. */
  setzeBlickrichtung(richtung: Vec3): void {
    this.blick = new Vec3(richtung.x, 0, richtung.z);
  }

  /** Der Bodenpunkt unter der Maus für Strg+V; null, wenn die Maus nicht über der Szene ist. Benachrichtigt nicht. */
  setzeMausPunkt(punkt: Vec3 | null): void {
    this.mausPunkt = punkt;
  }

  get zieht(): boolean {
    return this.ziehen !== null;
  }

  /**
   * Maus auf einem Objekt gedrückt, `startBoden` ist der Bodenpunkt darunter. Liefert true, wenn ein Ziehen beginnt.
   * Nur die Auswahl kann ziehen (siehe `Werkzeug.onZiehenStart`).
   */
  beginneZiehen(treffer: Treffer, startBoden: Vec3, optionen: KlickOptionen = {}): boolean {
    const werkzeug = this.werkzeug;
    if (!werkzeug.onZiehenStart) return false;
    let beginnt = false;
    this.fuehreAus(() => {
      beginnt = werkzeug.onZiehenStart?.(treffer, this, optionen) ?? false;
    });
    const ids = [...this.zustand().ausgewaehlt];
    if (beginnt && ids.length > 0) this.ziehen = Ziehvorgang.start(this.bauwerk, ids, startBoden);
    return this.ziehen !== null;
  }

  /** Maus beim Ziehen bewegt: zeigt den Zwischenstand, ohne Verlaufseintrag. Eine unmögliche Lage zeigt die Meldung. */
  ziehe(boden: Vec3): void {
    if (this.ziehen === null) return;
    const neu = this.ziehen.mitZiel(boden);
    if (neu === this.ziehen) return;
    this.ziehen = neu;
    this.meldung = neu.fehler;
    this.melde();
  }

  /** Maus losgelassen: ein Undo-Schritt, wenn sich etwas bewegt hat. Ist die Lage unmöglich, bleibt alles, wie es war. */
  beendeZiehen(): void {
    const vorgang = this.ziehen;
    if (vorgang === null) return;
    this.ziehen = null;
    if (vorgang.vorschau === null && vorgang.fehler === null) return this.melde();
    this.fuehreAus(() => this.aendere(vorgang.ergebnis()));
  }

  /** Esc oder Abbruch während des Ziehens: nichts ändert sich, die Auswahl bleibt. */
  brichZiehenAb(): void {
    if (this.ziehen === null) return;
    this.ziehen = null;
    this.meldung = null;
    this.melde();
  }

  /** Strg+D: kopiert die Auswahl samt mitwandernder Seile und Planen um +1 m; die Kopie ist danach ausgewählt. Ein Undo-Schritt. */
  dupliziere(): void {
    const objekte = this.mitnahme();
    if (objekte.length > 0) this.fuegeKopienEin(objekte, DUPLIKAT_VERSATZ);
  }

  /** Strg+C: merkt sich die Auswahl samt Mitnahme, nur innerhalb der App. */
  kopiereAuswahl(): void {
    this.zwischenablage = this.mitnahme();
  }

  /** Strg+V: fügt die Zwischenablage mit ihrem Mittelpunkt auf den Bodenpunkt unter der Maus (gerastert) ein, sonst um +1 m versetzt. */
  fuegeEin(): void {
    const mittelpunkt = mitte(this.zwischenablage);
    if (mittelpunkt === null) return;
    const ziel = this.mausPunkt && this.snap.aufRaster(this.mausPunkt);
    this.fuegeKopienEin(this.zwischenablage, ziel ? ziel.sub(mittelpunkt) : DUPLIKAT_VERSATZ);
  }

  private mitnahme(): readonly LagerObjekt[] {
    return mitgenommen(this.bauwerk, [...this.zustand().ausgewaehlt]);
  }

  private fuegeKopienEin(objekte: readonly LagerObjekt[], dv: Vec3): void {
    this.fuehreAus(() => {
      const kopie = kopiere(this.bauwerk, objekte, dv, (p) => this.neueId(p));
      this.aendere(kopie.bauwerk);
      this.setzeAuswahl(kopie.neueIds);
    });
  }

  /** Pfeiltaste → Verschiebung: „oben“ ist die auf die nächste Weltachse gerundete Blickrichtung. */
  private pfeilVersatz(taste: string, gross: boolean): Vec3 | null {
    const vorn = Math.abs(this.blick.x) > Math.abs(this.blick.z) ? new Vec3(Math.sign(this.blick.x), 0, 0) : new Vec3(0, 0, Math.sign(this.blick.z) || -1);
    const rechts = new Vec3(-vorn.z, 0, vorn.x);
    const richtung: Record<string, Vec3> = { ArrowUp: vorn, ArrowDown: vorn.scale(-1), ArrowRight: rechts, ArrowLeft: rechts.scale(-1) };
    return richtung[taste]?.scale(gross ? PFEIL_SCHRITT_GROSS : PFEIL_SCHRITT) ?? null;
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
  taste(taste: string, strg: boolean, umschalt = false): boolean {
    const klein = taste.toLowerCase();
    if (taste === 'Escape') return this.escape();
    if (this.ziehen !== null) return false;
    if (strg) return this.strgTaste(klein);
    if (taste === 'Delete' || taste === 'Backspace') this.loescheAuswahl();
    else if (klein === 'r') this.dreheAuswahl(umschalt ? -DREH_SCHRITT : DREH_SCHRITT);
    else if (taste.startsWith('Arrow')) return this.pfeil(taste, umschalt);
    else return false;
    return true;
  }

  private escape(): boolean {
    if (this.ziehen !== null) {
      this.brichZiehenAb();
      return true;
    }
    this.werkzeug.abbrechen();
    this.messungWert = null;
    this.waehle(null);
    this.melde();
    return true;
  }

  private strgTaste(klein: string): boolean {
    if (klein === 'z') this.rueckgaengig();
    else if (klein === 'y') this.wiederholen();
    else if (klein === 'a') this.waehleAlle();
    else if (klein === 'd') this.dupliziere();
    else if (klein === 'c') this.kopiereAuswahl();
    else if (klein === 'v') this.fuegeEin();
    else return false;
    return true;
  }

  private pfeil(taste: string, gross: boolean): boolean {
    const dv = this.pfeilVersatz(taste, gross);
    if (dv === null || this.zustand().ausgewaehlt.size === 0) return false;
    this.verschiebeAuswahl(dv);
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
