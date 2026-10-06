import { pruefeFarbe, pruefeText } from './farbe';
import type { LagerObjekt } from './LagerObjekt';
import type { PlatzobjektParams } from './params';
import { Vec3 } from './Vec3';

export const MAX_NAME_ZEICHEN = 40;

/** Ein einfaches Ding am Boden: Feuerstelle, Fahnenmast, Latrine … Kreis oder Rechteck mit Höhe und Farbe (Spec E3, D1). */
export class Platzobjekt implements LagerObjekt {
  readonly art = 'platzobjekt' as const;
  readonly position: Vec3;

  constructor(
    readonly id: string,
    position: Vec3,
    readonly params: PlatzobjektParams,
    /** Drehung um die senkrechte Achse, positiv wie `Baugruppe.drehung`. */
    readonly drehungRad: number = 0,
  ) {
    const { vorlage, name, form, breite, laenge, hoehe, farbe } = params;
    if (vorlage.length === 0) throw new RangeError('Vorlage fehlt');
    pruefeText(name, MAX_NAME_ZEICHEN, 'Name');
    if (form !== 'kreis' && form !== 'rechteck') throw new RangeError('Form muss Kreis oder Rechteck sein');
    if (!(Number.isFinite(breite) && breite > 0)) throw new RangeError(`${form === 'kreis' ? 'Durchmesser' : 'Breite'} muss größer als 0 sein`);
    if (form === 'rechteck' && !(Number.isFinite(laenge) && laenge > 0)) throw new RangeError('Länge muss größer als 0 sein');
    if (!(Number.isFinite(hoehe) && hoehe >= 0)) throw new RangeError('Höhe darf nicht negativ sein');
    pruefeFarbe(farbe);
    if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) throw new RangeError('Die Position muss endlich sein');
    if (!Number.isFinite(drehungRad)) throw new RangeError('Drehung muss eine endliche Zahl sein');
    this.position = new Vec3(position.x, 0, position.z);
  }

  mitParams(params: PlatzobjektParams): Platzobjekt {
    return new Platzobjekt(this.id, this.position, params, this.drehungRad);
  }

  ids(): readonly string[] {
    return [this.id];
  }

  mitId(id: string): Platzobjekt {
    return new Platzobjekt(id, this.position, this.params, this.drehungRad);
  }

  drehpunkt(): Vec3 {
    return this.position;
  }

  /** Das Objekt bleibt am Boden: Der Konstruktor setzt y wieder auf 0. */
  verschobenUm(dv: Vec3): Platzobjekt {
    return new Platzobjekt(this.id, this.position.add(dv), this.params, this.drehungRad);
  }

  /** Ohne `um` um die eigene Position; die eigene Drehung wächst mit. */
  gedreht(winkelRad: number, um: Vec3 = this.position): Platzobjekt {
    return new Platzobjekt(this.id, this.position.gedrehtUmY(winkelRad, um), this.params, this.drehungRad + winkelRad);
  }

  /** Die vier Ecken des Rechtecks, beim Kreis vier Punkte am Rand, jeweils mit der Drehung. Für Rahmen, Drehpunkt und „Alles zeigen“, nicht für den Platzbedarf. */
  platzPunkte(): readonly Vec3[] {
    const { form, breite, laenge } = this.params;
    const r = breite / 2;
    const h = laenge / 2;
    const lokal =
      form === 'kreis'
        ? [new Vec3(r, 0, 0), new Vec3(0, 0, r), new Vec3(-r, 0, 0), new Vec3(0, 0, -r)]
        : [new Vec3(r, 0, h), new Vec3(-r, 0, h), new Vec3(-r, 0, -h), new Vec3(r, 0, -h)];
    return lokal.map((p) => p.gedrehtUmY(this.drehungRad).add(this.position));
  }
}
