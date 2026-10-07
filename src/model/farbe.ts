export const HEX_FARBE = /^#[0-9a-f]{6}$/i;

/** Wirft den Fehler des Modells, wenn `farbe` kein `#rrggbb` ist (Spec E3, D1). */
export function pruefeFarbe(farbe: string): void {
  if (!HEX_FARBE.test(farbe)) throw new RangeError('Farbe muss ein Hexwert wie #e8590c sein');
}

/** Ein Text mit 1 bis `max` Zeichen, der nicht nur aus Leerzeichen besteht. */
export function pruefeText(text: string, max: number, feld: string): void {
  if (text.trim().length === 0 || text.length > max) throw new RangeError(`${feld} muss 1 bis ${max} Zeichen lang sein`);
}
