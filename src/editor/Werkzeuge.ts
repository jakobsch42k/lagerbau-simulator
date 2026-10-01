import { ABock } from '../model/ABock';
import type { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { FUSS_TOLERANZ, MIN_STANGENLAENGE, STANDARD_DURCHMESSER, STANGEN_UEBERSTAND } from '../model/konstanten';
import { STANDARD_ABOCK, STANDARD_DREIBEIN } from '../model/params';
import { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { SnapPunkt, SnapService, Treffer } from './SnapService';

export type WerkzeugName = 'dreibein' | 'abock' | 'stange' | 'auswahl';

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
  onKlick(treffer: Treffer, kontext: EditorKontext): void;
  abbrechen(): void;
}

/** Setzt eine Baugruppe mit Standardmaßen auf den angeklickten Bodenpunkt. */
export class PlaceBaugruppeTool implements Werkzeug {
  readonly angefangen: Vec3 | null = null;

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

/** Zwei Klicks auf Einrastpunkte ergeben eine freie Stange; am Boden ohne Überstand. */
export class DrawStangeTool implements Werkzeug {
  readonly name = 'stange' as const;
  private start: SnapPunkt | null = null;

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
    if (start.punkt.distanceTo(punkt.punkt) < MIN_STANGENLAENGE) return;
    const stange = Stange.zwischen(
      k.neueId('stange'),
      start.punkt,
      punkt.punkt,
      STANDARD_DURCHMESSER,
      this.ueberstand(start),
      this.ueberstand(punkt),
    );
    k.aendere(k.bauwerk.mitStange(stange));
    k.waehle(stange.id);
  }

  abbrechen(): void {
    this.start = null;
  }

  private ueberstand(p: SnapPunkt): number {
    return p.punkt.y <= FUSS_TOLERANZ ? 0 : STANGEN_UEBERSTAND;
  }
}

/** Klick auf eine Stange wählt sie (bzw. ihre Gruppe), Klick auf den Boden hebt die Auswahl auf. */
export class SelectTool implements Werkzeug {
  readonly name = 'auswahl' as const;
  readonly angefangen: Vec3 | null = null;

  onKlick(treffer: Treffer, k: EditorKontext): void {
    k.waehle(treffer.art === 'stange' ? k.bauwerk.auswahlIdFuer(treffer.stangeId) : null);
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
    case 'auswahl':
      return new SelectTool();
  }
}
