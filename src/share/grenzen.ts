/** Obergrenzen für geteilte Links und Dateien. Keine Regelschwellen, sondern Schutz vor feindlichen Eingaben. */
export const MAX_HASH_ZEICHEN = 200_000;
export const MAX_JSON_ZEICHEN = 1_000_000;
/** Spec v3, D3: ganze Lager. 2000 Stangen im Zentimeter-Raster passen in einen Link unter MAX_HASH_ZEICHEN (Test in share.test.ts). */
export const MAX_TEILE = 2000;

/** Wirft, wenn eine Datei zu groß ist, um sie zu lesen. Prüft die Größe vor dem Einlesen. */
export function pruefeDateigroesse(bytes: number): void {
  if (bytes > MAX_JSON_ZEICHEN) throw new Error('Die Datei ist kein gültiges JSON');
}
