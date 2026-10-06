import type { ObjektRegister } from '../arten/ObjektRegister';
import { standardArten } from '../arten/standardArten';
import type { Bauwerk } from '../model/Bauwerk';
import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { Luftbild } from '../model/Luftbild';
import { massstabAusPunkten } from '../model/Massstab';
import { kopiere, mitte } from '../model/Duplikat';
import { bewege, mitgenommen } from '../model/Mitbewegung';
import { Vec3 } from '../model/Vec3';
import { idsImRechteck, type Rechteck } from './Rahmenwahl';
import type { Messung } from './Messung';
import { DREH_SCHRITT, DUPLIKAT_VERSATZ } from './konstanten';
import { SnapService, type Treffer } from './SnapService';
import type { EditorOptionen, EditorZustand } from './EditorZustand';
import { Tastatur } from './Tastatur';
import { Verlauf } from './Verlauf';
import { Ziehvorgang } from './Ziehvorgang';
import { Zwischenablage } from './Zwischenablage';
import { type EditorKontext, erzeugeWerkzeug, type KlickOptionen, type Werkzeug, type WerkzeugName } from './Werkzeuge';

export type { EditorOptionen, EditorZustand } from './EditorZustand';

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
  private readonly zwischenablage = new Zwischenablage();
  private readonly tastatur = new Tastatur(this);
  private mausPunkt: Vec3 | null = null;
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
      zeichnung: this.werkzeug.zeichnung ?? null,
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

  /** Enter: schließt eine Zeichnung (Zone, Linie) ab. Liefert false, wenn nichts gezeichnet wird; dann ist die Taste nicht behandelt. */
  bestaetige(): boolean {
    const werkzeug = this.werkzeug;
    if (!werkzeug.onBestaetigen || !werkzeug.zeichnung) return false;
    this.fuehreAus(() => werkzeug.onBestaetigen?.(this));
    return true;
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

  /** Lädt ein Luftbild als Boden (ein Undo-Schritt) und startet sofort das Werkzeug „Maßstab setzen“ (Spec E2, D2). */
  ladeLuftbild(luftbild: Luftbild): void {
    if (this.aendereMit((b) => b.mitLuftbild(luftbild))) this.waehleWerkzeug('massstab');
  }

  /**
   * „Übernehmen“ im Panel: Die zwei Klicks des Werkzeugs „Maßstab setzen“ sind `meter` lang (ein Undo-Schritt).
   * Danach ist wieder die Auswahl aktiv. Bei zu nahen Punkten oder Meter ≤ 0 bleibt alles, wie es war; die Meldung steht im Zustand.
   */
  setzeMassstab(meter: number): boolean {
    const strecke = this.messungWert;
    const ok = this.aendereMit((b) => {
      if (!b.luftbild) throw new RangeError('Kein Luftbild geladen');
      if (!strecke?.bis) throw new RangeError('Erst zwei Punkte auf dem Bild anklicken');
      return b.mitLuftbild(b.luftbild.mitMassstab(massstabAusPunkten(strecke.von, strecke.bis, meter, b.luftbild.meterProPixel)));
    });
    if (ok) this.waehleWerkzeug('auswahl');
    return ok;
  }

  /** Deckkraft des Luftbilds, 0 bis 1 (ein Undo-Schritt). */
  setzeDeckkraft(deckkraft: number): boolean {
    return this.aendereMit((b) => {
      if (!b.luftbild) throw new RangeError('Kein Luftbild geladen');
      return b.mitLuftbild(b.luftbild.mitDeckkraft(deckkraft));
    });
  }

  /** Entfernt das Luftbild (ein Undo-Schritt). Das Werkzeug „Maßstab setzen“ endet damit. */
  entferneLuftbild(): void {
    if (this.aendereMit((b) => b.mitLuftbild(null)) && this.werkzeug.name === 'massstab') this.waehleWerkzeug('auswahl');
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
    this.tastatur.setzeBlickrichtung(richtung);
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
    this.zwischenablage.merke(this.mitnahme());
  }

  /** Strg+V: fügt die Zwischenablage mit ihrem Mittelpunkt auf den Bodenpunkt unter der Maus (gerastert) ein, sonst um +1 m versetzt. */
  fuegeEin(): void {
    const dv = this.zwischenablage.einfuegeVersatz(this.mausPunkt && this.snap.aufRaster(this.mausPunkt));
    if (dv !== null) this.fuegeKopienEin(this.zwischenablage.objekte, dv);
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

  rueckgaengig(): void {
    this.springeImVerlauf(this.verlauf.rueckgaengig());
  }

  wiederholen(): void {
    this.springeImVerlauf(this.verlauf.wiederholen());
  }

  /** Ändert Undo/Redo das Luftbild, passen die Klickpunkte von „Maßstab setzen“ nicht mehr: Das Werkzeug endet samt Messung. */
  private springeImVerlauf(verlauf: Verlauf<Bauwerk>): void {
    const luftbildVorher = this.bauwerk.luftbild;
    this.verlauf = verlauf;
    this.markiertIds = new Set();
    if (this.werkzeug.name === 'massstab' && this.bauwerk.luftbild !== luftbildVorher) this.waehleWerkzeug('auswahl');
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
    return this.tastatur.verarbeite(taste, strg, umschalt);
  }

  /** Esc ohne Ziehen: Werkzeug und Messung zurücksetzen, Auswahl aufheben. */
  abbrechen(): void {
    this.werkzeug.abbrechen();
    this.messungWert = null;
    this.waehle(null);
    this.melde();
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
