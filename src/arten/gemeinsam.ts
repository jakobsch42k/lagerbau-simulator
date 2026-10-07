import type { Baugruppe } from '../model/Baugruppe';
import type { Stange } from '../model/Stange';
import type { Vec3 } from '../model/Vec3';
import type { Fangpunkt, Werte } from './ObjektArt';

/** Eine Zahl aus den Panel-Werten; alles andere wird NaN, und das Modell lehnt es mit seiner eigenen Meldung ab. */
export function zahlWert(werte: Werte, schluessel: string): number {
  const wert = werte[schluessel];
  return typeof wert === 'number' ? wert : Number.NaN;
}

/** Ein Text aus den Panel-Werten; alles andere wird '', und das Modell lehnt es ab. */
export function textWert(werte: Werte, schluessel: string): string {
  const wert = werte[schluessel];
  return typeof wert === 'string' ? wert : '';
}

/** Eine Zahl für Infozeilen im deutschen Format (48,3), mit höchstens `nachkomma` Stellen. */
export function zahlText(wert: number, nachkomma: number): string {
  return new Intl.NumberFormat('de-AT', { maximumFractionDigits: nachkomma }).format(wert);
}

export function stangenEnden(stangen: readonly Stange[]): Fangpunkt[] {
  return stangen.flatMap((s) => s.endpunkte().map((punkt): Fangpunkt => ({ punkt, art: 'ende' })));
}

/** Spitze und Stangenenden jeder Baugruppe (Spec v1). */
export function baugruppenFang(g: Baugruppe): Fangpunkt[] {
  return [{ punkt: g.spitze(), art: 'spitze' }, ...stangenEnden(g.stangen())];
}

/** Klick auf eine der Stangen: der nächste Punkt auf ihrer Achse; null, wenn die Teil-id nicht dazugehört. */
export function aufStange(stangen: readonly Stange[], teilId: string, punkt: Vec3): Fangpunkt | null {
  const stange = stangen.find((s) => s.id === teilId);
  return stange ? { punkt: stange.naechsterPunkt(punkt), art: 'stange' } : null;
}

export function baugruppenInfo(g: Baugruppe): string {
  return `Höhe ${g.hoehe().toFixed(2)} m · Beinwinkel ${g.beinwinkelGrad().toFixed(0)}° · R dreht`;
}
