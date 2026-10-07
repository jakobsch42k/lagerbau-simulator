import { HEX_FARBE } from './farbe';
import type { LagerObjekt } from './LagerObjekt';
import type { ZeltParams } from './params';
import { Vec3 } from './Vec3';
import { ZeltGeometrie } from './ZeltGeometrie';

export const MAX_ZELT_NAME = 40;
export const MAX_ZELT_MASS = 50;
const MAX_HARING_ABSTAND = 20;
const AUFBAUTEN: readonly string[] = ['rund', 'doppelkegel', 'sattel'];
const MASS_ZU_GROSS = `Maß darf höchstens ${MAX_ZELT_MASS} m betragen.`;

const mass = (wert: number, feld: string): void => {
  if (!(Number.isFinite(wert) && wert > 0)) throw new RangeError(`${feld} muss größer als 0 sein.`);
  if (wert > MAX_ZELT_MASS) throw new RangeError(MASS_ZU_GROSS);
};

const ganzeZahl = (wert: number, von: number, bis: number, fehler: string): void => {
  if (!(Number.isInteger(wert) && wert >= von && wert <= bis)) throw new RangeError(fehler);
};

/** Prüft alle Felder in der Reihenfolge der Spec E4, D1; der erste Fehler gewinnt. Der Serializer prüft über den Konstruktor. */
function pruefe(p: ZeltParams): void {
  if (p.vorlage.length === 0) throw new RangeError('Vorlage fehlt.');
  if (p.name.trim().length === 0 || p.name.length > MAX_ZELT_NAME) throw new RangeError(`Name muss 1 bis ${MAX_ZELT_NAME} Zeichen lang sein.`);
  if (!AUFBAUTEN.includes(p.aufbau)) throw new RangeError('Ungültige Form.');
  if (p.aufbau === 'rund') {
    mass(p.durchmesser, 'Durchmesser');
    ganzeZahl(p.ecken, 6, 24, 'Ecken: ganze Zahl von 6 bis 24.');
  } else {
    mass(p.laenge, 'Länge');
    mass(p.breite, 'Breite');
  }
  mass(p.wandhoehe, 'Wandhöhe');
  mass(p.firsthoehe, 'Firsthöhe');
  if (p.firsthoehe < p.wandhoehe) throw new RangeError('Firsthöhe muss mindestens so hoch wie die Wandhöhe sein.');
  if (!(Array.isArray(p.waende) && p.waende.length === 3 && p.waende.every((w) => typeof w === 'boolean'))) {
    throw new RangeError('Wände: drei Werte, je an oder aus.');
  }
  ganzeZahl(p.abspannungen, 0, 100, 'Abspannungen: ganze Zahl von 0 bis 100.');
  if (!(Number.isFinite(p.seillaenge) && p.seillaenge > 0)) throw new RangeError('Seillänge muss größer als 0 sein.');
  if (!(Number.isFinite(p.haringAbstand) && p.haringAbstand >= 0)) throw new RangeError('Haring-Abstand darf nicht negativ sein.');
  if (p.haringAbstand > MAX_HARING_ABSTAND) throw new RangeError(MASS_ZU_GROSS);
  if (!HEX_FARBE.test(p.farbe)) throw new RangeError('Ungültige Farbe.');
}

/** Ein Zelt als Ganzes (Spec E4, D1): Maße, Drehung, vereinfachter Körper; Haringe und Abspannung werden abgeleitet (`ZeltGeometrie`). */
export class Zelt implements LagerObjekt {
  readonly art = 'zelt' as const;
  readonly position: Vec3;

  constructor(
    readonly id: string,
    position: Vec3,
    readonly params: ZeltParams,
    /** Drehung um die senkrechte Achse, positiv wie `Baugruppe.drehung`. */
    readonly drehungRad: number = 0,
  ) {
    pruefe(params);
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) throw new RangeError('Die Position muss endlich sein.');
    if (!Number.isFinite(drehungRad)) throw new RangeError('Drehung muss eine endliche Zahl sein.');
    this.position = new Vec3(position.x, 0, position.z);
  }

  mitParams(params: ZeltParams): Zelt {
    return new Zelt(this.id, this.position, params, this.drehungRad);
  }

  ids(): readonly string[] {
    return [this.id];
  }

  mitId(id: string): Zelt {
    return new Zelt(id, this.position, this.params, this.drehungRad);
  }

  drehpunkt(): Vec3 {
    return this.position;
  }

  verschobenUm(dv: Vec3): Zelt {
    return new Zelt(this.id, this.position.add(dv), this.params, this.drehungRad);
  }

  /** Ohne `um` um die eigene Position; die eigene Drehung wächst mit. */
  gedreht(winkelRad: number, um: Vec3 = this.position): Zelt {
    return new Zelt(this.id, this.position.gedrehtUmY(winkelRad, um), this.params, this.drehungRad + winkelRad);
  }

  /** Umriss und Haringe: Die Haringe laufen so über den Platzbedarf, `Bauwerk.haringe()` kennt sie nicht (nichts doppelt). */
  platzPunkte(): readonly Vec3[] {
    return [...ZeltGeometrie.umriss(this), ...ZeltGeometrie.haringe(this)];
  }
}
