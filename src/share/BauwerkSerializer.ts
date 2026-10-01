import { ABock } from '../model/ABock';
import type { Baugruppe } from '../model/Baugruppe';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import type { ABockParams, DreibeinParams } from '../model/params';
import { Stange } from '../model/Stange';
import { Vec3 } from '../model/Vec3';
import { MAX_TEILE } from './grenzen';

type V3 = readonly [number, number, number];

export type GruppeJson =
  | { readonly id: string; readonly typ: 'dreibein'; readonly position: V3; readonly drehung: number; readonly params: DreibeinParams }
  | { readonly id: string; readonly typ: 'abock'; readonly position: V3; readonly drehung: number; readonly params: ABockParams };

export interface StangeJson {
  readonly id: string;
  readonly start: V3;
  readonly ende: V3;
  readonly durchmesser: number;
}

export interface BauwerkJson {
  readonly version: 1;
  readonly gruppen: readonly GruppeJson[];
  readonly stangen: readonly StangeJson[];
}

type Roh = Record<string, unknown>;

function objekt(d: unknown, name: string): Roh {
  if (typeof d !== 'object' || d === null || Array.isArray(d)) throw new Error(`${name} ist kein Objekt`);
  return d as Roh;
}

function liste(d: unknown, name: string): unknown[] {
  if (!Array.isArray(d)) throw new Error(`${name} ist keine Liste`);
  return d;
}

function zahl(d: unknown, name: string): number {
  if (typeof d !== 'number' || !Number.isFinite(d)) throw new Error(`${name} ist keine Zahl`);
  return d;
}

function text(d: unknown, name: string): string {
  if (typeof d !== 'string' || d.length === 0) throw new Error(`${name} fehlt`);
  return d;
}

function vektor(d: unknown, name: string): Vec3 {
  const l = liste(d, name);
  if (l.length !== 3) throw new Error(`${name} braucht drei Koordinaten`);
  return new Vec3(zahl(l[0], name), zahl(l[1], name), zahl(l[2], name));
}

/** Bauwerk ↔ JSON. Gruppen werden über ihre Parameter gespeichert, damit Links kurz bleiben. */
export class BauwerkSerializer {
  zuJson(bauwerk: Bauwerk): BauwerkJson {
    return {
      version: 1,
      gruppen: bauwerk.gruppen.map((g) => this.gruppeZuJson(g)),
      stangen: bauwerk.freieStangen.map((s) => ({
        id: s.id,
        start: s.start.toArray(),
        ende: s.ende.toArray(),
        durchmesser: s.durchmesser,
      })),
    };
  }

  ausJson(daten: unknown): Bauwerk {
    try {
      return this.lies(daten);
    } catch (e) {
      throw new Error(`Ungültige Bauwerk-Daten: ${(e as Error).message}`);
    }
  }

  private gruppeZuJson(g: Baugruppe): GruppeJson {
    const basis = { id: g.id, position: g.position.toArray(), drehung: g.drehung };
    if (g instanceof Dreibein) return { ...basis, typ: 'dreibein', params: g.params };
    if (g instanceof ABock) return { ...basis, typ: 'abock', params: g.params };
    throw new Error(`Unbekannte Baugruppe ${g.typ}`);
  }

  private lies(daten: unknown): Bauwerk {
    const o = objekt(daten, 'Bauwerk');
    if (o.version !== 1) throw new Error('unbekannte Version');
    const rohGruppen = liste(o.gruppen, 'gruppen');
    const rohStangen = liste(o.stangen, 'stangen');
    if (rohGruppen.length + rohStangen.length > MAX_TEILE) throw new Error(`mehr als ${MAX_TEILE} Teile`);
    const gruppen = rohGruppen.map((g) => this.liesGruppe(g));
    const stangen = rohStangen.map((s) => this.liesStange(s));
    const mitGruppen = gruppen.reduce((b, g) => b.mitGruppe(g), Bauwerk.leer());
    return stangen.reduce((b, s) => b.mitStange(s), mitGruppen);
  }

  private liesGruppe(daten: unknown): Baugruppe {
    const o = objekt(daten, 'Baugruppe');
    const id = text(o.id, 'id');
    const position = vektor(o.position, 'position');
    const drehung = zahl(o.drehung, 'drehung');
    const p = objekt(o.params, 'params');
    if (o.typ === 'dreibein') {
      return new Dreibein(id, position, drehung, {
        stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
        fusskreisradius: zahl(p.fusskreisradius, 'fusskreisradius'),
        durchmesser: zahl(p.durchmesser, 'durchmesser'),
      });
    }
    if (o.typ === 'abock') {
      return new ABock(id, position, drehung, {
        stangenlaenge: zahl(p.stangenlaenge, 'stangenlaenge'),
        fussabstand: zahl(p.fussabstand, 'fussabstand'),
        riegelhoehe: zahl(p.riegelhoehe, 'riegelhoehe'),
        durchmesser: zahl(p.durchmesser, 'durchmesser'),
      });
    }
    throw new Error(`unbekannter Baugruppen-Typ ${String(o.typ)}`);
  }

  private liesStange(daten: unknown): Stange {
    const o = objekt(daten, 'Stange');
    return new Stange(text(o.id, 'id'), vektor(o.start, 'start'), vektor(o.ende, 'ende'), zahl(o.durchmesser, 'durchmesser'));
  }
}
