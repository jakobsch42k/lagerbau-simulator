import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import type { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { FUSS_TOLERANZ, MIN_SEILLAENGE, MIN_STANGENLAENGE, STANDARD_DURCHMESSER, STANGEN_UEBERSTAND } from '../model/konstanten';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN } from '../model/params';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { SnapPunkt, SnapService, Treffer } from './SnapService';

export type WerkzeugName = 'dreibein' | 'abock' | 'stange' | 'seil' | 'baum' | 'auswahl';

/** Was ein Werkzeug vom Editor sehen und ändern darf. Diese Methoden benachrichtigen nicht. */
export interface EditorKontext {
  readonly bauwerk: Bauwerk;
  readonly snap: SnapService;
  aendere(neu: Bauwerk): void;
  waehle(id: string | null): void;
  neueId(praefix: string): string;
}

export interface Werkzeug {
  readonly name: WerkzeugName;
  readonly angefangen: Vec3 | null;
  /** Ob Seile Klicks fangen. Nur das Auswahl-Werkzeug will sie; sonst trifft der Strahl, was dahinter liegt. */
  readonly trifftSeile: boolean;
  onKlick(treffer: Treffer, kontext: EditorKontext): void;
  abbrechen(): void;
}

/** Setzt eine Baugruppe mit Standardmaßen auf den angeklickten Bodenpunkt. */
export class PlaceBaugruppeTool implements Werkzeug {
  readonly angefangen: Vec3 | null = null;
  readonly trifftSeile = false;

  constructor(readonly name: 'dreibein' | 'abock') {}

  onKlick(treffer: Treffer, k: EditorKontext): void {
    if (treffer.art !== 'boden') return;
    const position = k.snap.aufRaster(treffer.punkt);
    const id = k.neueId(this.name);
    const gruppe =
      this.name === 'dreibein' ? new Dreibein(id, position, 0, STANDARD_DREIBEIN) : new ABock(id, position, 0, STANDARD_ABOCK);
    k.aendere(k.bauwerk.mitGruppe(gruppe));
    k.waehle(id);
  }

  abbrechen(): void {}
}

/** Setzt einen Baum mit Startmaßen auf den angeklickten Bodenpunkt. */
export class PlaceBaumTool implements Werkzeug {
  readonly name = 'baum' as const;
  readonly angefangen: Vec3 | null = null;
  readonly trifftSeile = false;

  onKlick(treffer: Treffer, k: EditorKontext): void {
    if (treffer.art !== 'boden') return;
    const baum = new Baum(k.neueId('baum'), k.snap.aufRaster(treffer.punkt), STANDARD_BAUM);
    k.aendere(k.bauwerk.mitBaum(baum));
    k.waehle(baum.id);
  }

  abbrechen(): void {}
}

/** Zwei Klicks auf Einrastpunkte; liegen sie zu nah beieinander, passiert nichts. Unterklassen erzeugen daraus ein Teil. */
abstract class ZweiPunktWerkzeug implements Werkzeug {
  abstract readonly name: WerkzeugName;
  readonly trifftSeile = false;
  private start: SnapPunkt | null = null;

  constructor(private readonly mindestabstand: number) {}

  get angefangen(): Vec3 | null {
    return this.start?.punkt ?? null;
  }

  onKlick(treffer: Treffer, k: EditorKontext): void {
    const punkt = k.snap.snap(treffer, k.bauwerk);
    if (this.start === null) {
      this.start = punkt;
      return;
    }
    const start = this.start;
    this.start = null;
    if (start.punkt.distanceTo(punkt.punkt) < this.mindestabstand) return;
    this.erzeuge(start, punkt, k);
  }

  abbrechen(): void {
    this.start = null;
  }

  protected abstract erzeuge(start: SnapPunkt, ende: SnapPunkt, k: EditorKontext): void;
}

/** Zwei Klicks auf Einrastpunkte ergeben eine freie Stange; am Boden ohne Überstand. */
export class DrawStangeTool extends ZweiPunktWerkzeug {
  readonly name = 'stange' as const;

  constructor() {
    super(MIN_STANGENLAENGE);
  }

  protected erzeuge(start: SnapPunkt, ende: SnapPunkt, k: EditorKontext): void {
    const stange = Stange.zwischen(
      k.neueId('stange'),
      start.punkt,
      ende.punkt,
      STANDARD_DURCHMESSER,
      this.ueberstand(start),
      this.ueberstand(ende),
    );
    k.aendere(k.bauwerk.mitStange(stange));
    k.waehle(stange.id);
  }

  private ueberstand(p: SnapPunkt): number {
    return p.punkt.y <= FUSS_TOLERANZ ? 0 : STANGEN_UEBERSTAND;
  }
}

/** Zwei Klicks ergeben ein gerades Seil. Ein Ende am Boden wird automatisch ein Hering (Spec v2a, D1). */
export class DrawSeilTool extends ZweiPunktWerkzeug {
  readonly name = 'seil' as const;

  constructor() {
    super(MIN_SEILLAENGE);
  }

  protected erzeuge(start: SnapPunkt, ende: SnapPunkt, k: EditorKontext): void {
    const seil = new Seil(k.neueId('seil'), start.punkt, ende.punkt);
    k.aendere(k.bauwerk.mitSeil(seil));
    k.waehle(seil.id);
  }
}

/** Klick auf eine Stange wählt sie (bzw. ihre Gruppe), auf ein Seil oder einen Baum wählt diesen, auf den Boden hebt die Auswahl auf. */
export class SelectTool implements Werkzeug {
  readonly name = 'auswahl' as const;
  readonly angefangen: Vec3 | null = null;
  readonly trifftSeile = true;

  onKlick(treffer: Treffer, k: EditorKontext): void {
    switch (treffer.art) {
      case 'stange':
        k.waehle(k.bauwerk.auswahlIdFuer(treffer.stangeId));
        break;
      case 'baum':
        k.waehle(treffer.baumId);
        break;
      case 'seil':
        k.waehle(treffer.seilId);
        break;
      case 'boden':
        k.waehle(null);
        break;
    }
  }

  abbrechen(): void {}
}

export function erzeugeWerkzeug(name: WerkzeugName): Werkzeug {
  switch (name) {
    case 'dreibein':
    case 'abock':
      return new PlaceBaugruppeTool(name);
    case 'stange':
      return new DrawStangeTool();
    case 'seil':
      return new DrawSeilTool();
    case 'baum':
      return new PlaceBaumTool();
    case 'auswahl':
      return new SelectTool();
  }
}
