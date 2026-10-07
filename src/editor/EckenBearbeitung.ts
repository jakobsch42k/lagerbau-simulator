import type { Bauwerk } from '../model/Bauwerk';
import { hatEcken, type HatEcken } from '../model/LagerObjekt';
import type { Vec3 } from '../model/Vec3';
import { EckenZiehen, punktAufKante } from './Ecken';
import type { EckenAnzeige, EditorZustand } from './EditorZustand';

/** Was die Ecken-Bearbeitung vom Editor braucht (der Editor reicht seine privaten Teile als Funktionen durch). */
export interface EckenHost {
  bauwerk(): Bauwerk;
  zustand(): EditorZustand;
  /** Das Bauwerk samt laufender Ziehen-Vorschau. */
  anzeigeBauwerk(): Bauwerk;
  istAuswahlWerkzeug(): boolean;
  aendere(neu: Bauwerk): void;
  fuehreAus(aktion: () => void): boolean;
  /** Startet ein Ziehen, löscht die Meldung und benachrichtigt die Beobachter. */
  beginneZug(zug: EckenZiehen): void;
}

/** Ecken-Bearbeitung (Spec E3): gewählter Griff, Ziehen, Einfügen und Entfernen von Ecken eines einzeln gewählten Objekts. */
export class EckenBearbeitung {
  /** Der gewählte Griff (gehört zu genau einem Objekt). */
  private wahl: { readonly id: string; readonly index: number } | null = null;

  constructor(private readonly host: EckenHost) {}

  /** Der Griff bleibt nur, wenn dasselbe Objekt allein ausgewählt bleibt. */
  behalteFuer(ids: ReadonlySet<string>): void {
    if (this.wahl && !(ids.size === 1 && ids.has(this.wahl.id))) this.wahl = null;
  }

  verwirfWahl(): void {
    this.wahl = null;
  }

  anzeige(id: string | null): EckenAnzeige | null {
    if (id === null || !this.host.istAuswahlWerkzeug()) return null;
    const o = this.host.anzeigeBauwerk().objekt(id);
    if (!o || !hatEcken(o)) return null;
    return { punkte: o.ecken(), geschlossen: o.eckenGeschlossen, gewaehlt: this.wahl?.id === id ? this.wahl.index : null };
  }

  /** Das einzeln ausgewählte Objekt mit Ecken, solange es Griffe zeigt; sonst null. */
  private objekt(): HatEcken | null {
    const z = this.host.zustand();
    const id = z.ecken ? z.auswahl : null;
    const o = id === null ? undefined : this.host.bauwerk().objekt(id);
    return o && hatEcken(o) ? o : null;
  }

  /** Griff gewählt und Ziehen begonnen. Liefert false, wenn die Auswahl keine Griffe hat oder der Index fehlt. */
  beginneZiehen(index: number): boolean {
    const o = this.objekt();
    if (!o || index < 0 || index >= o.ecken().length) return false;
    this.wahl = { id: o.id, index };
    this.host.beginneZug(EckenZiehen.start(this.host.bauwerk(), o.id, index));
    return true;
  }

  fuegeEin(kante: number, boden: Vec3): boolean {
    const o = this.objekt();
    const ecken = o?.ecken() ?? [];
    const a = ecken[kante];
    const b = o?.eckenGeschlossen ? ecken[(kante + 1) % ecken.length] : ecken[kante + 1];
    if (!o || !a || !b) return false;
    const punkt = punktAufKante(a, b, boden);
    return this.host.fuehreAus(() => {
      this.host.aendere(this.host.bauwerk().ersetze(o.mitEcken([...ecken.slice(0, kante + 1), punkt, ...ecken.slice(kante + 1)])));
      this.wahl = { id: o.id, index: kante + 1 };
    });
  }

  /** Liefert false, wenn kein Griff gewählt ist; sonst ist die Taste behandelt. */
  entferne(): boolean {
    const index = this.host.zustand().ecken?.gewaehlt ?? null;
    const o = this.objekt();
    if (index === null || !o) return false;
    this.host.fuehreAus(() => {
      this.host.aendere(this.host.bauwerk().ersetze(o.mitEcken(o.ecken().filter((_, i) => i !== index))));
      this.wahl = null;
    });
    return true;
  }
}
