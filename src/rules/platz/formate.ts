const ZAHL = new Intl.NumberFormat('de-AT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const GRENZE = new Intl.NumberFormat('de-AT', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** Ein Abstand mit Komma und einer Nachkommastelle, z. B. „3,2“. */
export const meterText = (m: number): string => ZAHL.format(m);

/** Ein Richtwert, ganz oder mit einer Nachkommastelle, z. B. „5“ oder „2,5“. */
export const richtwertText = (m: number): string => GRENZE.format(m);

/** Ein Name in einfachen Anführungszeichen: ‚Jurte 6er‘. */
export const namenText = (name: string): string => `‚${name}‘`;
