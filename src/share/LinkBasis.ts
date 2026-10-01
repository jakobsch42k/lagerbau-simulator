/** Adresse der Web-Version. Geteilte Links aus dem Windows-Programm zeigen hierhin (Spec D5). */
export const OEFFENTLICHE_ADRESSE = 'https://jakobsch42k.github.io/lagerbau-simulator/';

/** Der Teil von `location`, den die Link-Basis braucht. Ohne DOM, damit sie testbar bleibt. */
export interface Ort {
  readonly protocol: string;
  readonly origin: string;
  readonly pathname: string;
}

/** Basis-Adresse, an die ein geteilter Link den Hash (#b=…) hängt. */
export class LinkBasis {
  static aus(ort: Ort): string {
    return ort.protocol === 'file:' ? OEFFENTLICHE_ADRESSE : `${ort.origin}${ort.pathname}`;
  }

  /** Meldung, wenn das Kopieren in die Zwischenablage scheitert. Das Windows-Programm hat keine Adresszeile. */
  static kopierFehlerText(ort: Ort): string {
    return ort.protocol === 'file:' ? 'Kopieren nicht möglich.' : 'Kopieren nicht möglich. Der Link steht in der Adresszeile.';
  }
}
