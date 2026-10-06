import { Vec3 } from '../model/Vec3';
import { DREH_SCHRITT, PFEIL_SCHRITT, PFEIL_SCHRITT_GROSS } from './konstanten';

/** Was die Tastenkürzel vom Editor brauchen. */
export interface TastenBefehle {
  readonly zieht: boolean;
  auswahl(): ReadonlySet<string>;
  brichZiehenAb(): void;
  abbrechen(): void;
  rueckgaengig(): void;
  wiederholen(): void;
  waehleAlle(): void;
  dupliziere(): void;
  kopiereAuswahl(): void;
  fuegeEin(): void;
  loescheAuswahl(): void;
  dreheAuswahl(winkel: number): void;
  verschiebeAuswahl(dv: Vec3): boolean;
}

/** Übersetzt Tastenkürzel in Editor-Befehle (Spec E1, D3): Pfeile, R, Entf, Esc, Strg+Z/Y/A/D/C/V. */
export class Tastatur {
  /** Blickrichtung der Ansicht (waagrechter Anteil); „oben“ der Pfeiltasten. Standard Norden (-z), wie in der Planansicht. */
  private blick: Vec3 = new Vec3(0, 0, -1);

  constructor(private readonly editor: TastenBefehle) {}

  /** Für die Pfeiltasten: wohin „oben“ zeigt. Nur der waagrechte Anteil zählt. */
  setzeBlickrichtung(richtung: Vec3): void {
    this.blick = new Vec3(richtung.x, 0, richtung.z);
  }

  /** Liefert true, wenn die Taste behandelt wurde. */
  verarbeite(taste: string, strg: boolean, umschalt: boolean): boolean {
    if (taste === 'Escape') return this.escape();
    if (this.editor.zieht) return false;
    if (strg) return this.strgTaste(taste.toLowerCase());
    const klein = taste.toLowerCase();
    if (taste === 'Delete' || taste === 'Backspace') this.editor.loescheAuswahl();
    else if (klein === 'r') this.editor.dreheAuswahl(umschalt ? -DREH_SCHRITT : DREH_SCHRITT);
    else if (taste.startsWith('Arrow')) return this.pfeil(taste, umschalt);
    else return false;
    return true;
  }

  private escape(): boolean {
    if (this.editor.zieht) this.editor.brichZiehenAb();
    else this.editor.abbrechen();
    return true;
  }

  private strgTaste(klein: string): boolean {
    const befehle: Record<string, () => void> = {
      z: () => this.editor.rueckgaengig(),
      y: () => this.editor.wiederholen(),
      a: () => this.editor.waehleAlle(),
      d: () => this.editor.dupliziere(),
      c: () => this.editor.kopiereAuswahl(),
      v: () => this.editor.fuegeEin(),
    };
    const befehl = befehle[klein];
    befehl?.();
    return befehl !== undefined;
  }

  private pfeil(taste: string, gross: boolean): boolean {
    const dv = this.pfeilVersatz(taste, gross);
    if (dv === null || this.editor.auswahl().size === 0) return false;
    this.editor.verschiebeAuswahl(dv);
    return true;
  }

  /** Pfeiltaste → Verschiebung: „oben“ ist die auf die nächste Weltachse gerundete Blickrichtung. */
  private pfeilVersatz(taste: string, gross: boolean): Vec3 | null {
    const vorn = Math.abs(this.blick.x) > Math.abs(this.blick.z) ? new Vec3(Math.sign(this.blick.x), 0, 0) : new Vec3(0, 0, Math.sign(this.blick.z) || -1);
    const rechts = new Vec3(-vorn.z, 0, vorn.x);
    const richtung: Record<string, Vec3> = { ArrowUp: vorn, ArrowDown: vorn.scale(-1), ArrowRight: rechts, ArrowLeft: rechts.scale(-1) };
    return richtung[taste]?.scale(gross ? PFEIL_SCHRITT_GROSS : PFEIL_SCHRITT) ?? null;
  }
}
