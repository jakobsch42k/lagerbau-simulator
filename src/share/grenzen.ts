/** Obergrenzen für geteilte Links und Dateien. Keine Regelschwellen, sondern Schutz vor feindlichen Eingaben. */
export const MAX_HASH_ZEICHEN = 200_000;
export const MAX_JSON_ZEICHEN = 1_000_000;
export const MAX_TEILE = 500;

/** Wirft, wenn eine Datei zu groß ist, um sie zu lesen. Prüft die Größe vor dem Einlesen. */
export function pruefeDateigroesse(bytes: number): void {
  if (bytes > MAX_JSON_ZEICHEN) throw new Error('Die Datei ist kein gültiges JSON');
}
