import { ABock } from '../model/ABock';
import type { Baugruppe } from '../model/Baugruppe';
import { Baum } from '../model/Baum';
import { Bauwerk } from '../model/Bauwerk';
import { Dreibein } from '../model/Dreibein';
import { Plane } from '../model/Plane';
import type { ABockParams, DreibeinParams, PlanenForm } from '../model/params';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { MAX_TEILE } from './grenzen';
import { liste, objekt, text, type V3, vektor, zahl } from './lesen';

export type GruppeJson =
  | { readonly id: string; readonly typ: 'dreibein'; readonly position: V3; readonly drehung: number; readonly params: DreibeinParams }
  | { readonly id: string; readonly typ: 'abock'; readonly position: V3; readonly drehung: number; readonly params: ABockParams };

export interface StangeJson {
  readonly id: string;
  readonly start: V3;
  readonly ende: V3;
  readonly durchmesser: number;
}

export interface SeilJson {
  readonly id: string;
  readonly start: V3;
  readonly ende: V3;
}

export interface BaumJson {
  readonly id: string;
  readonly position: V3;
  readonly durchmesser: number;
  readonly hoehe: number;
}

export interface PlaneJson {
  readonly id: string;
  readonly start: V3;
  readonly ende: V3;
  readonly breite: number;
  readonly laenge: number;
  readonly form: PlanenForm;
  /** Grad. */
  readonly neigung: number;
  readonly seite: 1 | -1;
}

export interface BauwerkJson {
  readonly version: 3;
  readonly gruppen: readonly GruppeJson[];
  readonly stangen: readonly StangeJson[];
  readonly seile: readonly SeilJson[];
  readonly baeume: readonly BaumJson[];
  readonly planen: readonly PlaneJson[];
}

/** Bauwerk ↔ JSON. Gruppen werden über ihre Parameter gespeichert, damit Links kurz bleiben. */
export class BauwerkSerializer {
  zuJson(bauwerk: Bauwerk): BauwerkJson {
    return {
      version: 3,
      gruppen: bauwerk.gruppen.map((g) => this.gruppeZuJson(g)),
      stangen: bauwerk.freieStangen.map((s) => ({
        id: s.id,
        start: s.start.toArray(),
        ende: s.ende.toArray(),
        durchmesser: s.durchmesser,
      })),
      seile: bauwerk.seile.map((s) => ({ id: s.id, start: s.start.toArray(), ende: s.ende.toArray() })),
      baeume: bauwerk.baeume.map((b) => ({
        id: b.id,
        position: b.position.toArray(),
        durchmesser: b.params.durchmesser,
        hoehe: b.params.hoehe,
      })),
      planen: bauwerk.planen.map((p) => ({
        id: p.id,
        start: p.start.toArray(),
        ende: p.ende.toArray(),
        breite: p.params.breite,
        laenge: p.params.laenge,
        form: p.params.form,
        neigung: p.params.neigungGrad,
        seite: p.params.seite,
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
    if (o.version !== 1 && o.version !== 2 && o.version !== 3) throw new Error('unbekannte Version');
    const rohGruppen = liste(o.gruppen, 'gruppen');
    const rohStangen = liste(o.stangen, 'stangen');
    // Version 1 kannte noch keine Seile und Bäume, Version 2 noch keine Planen.
    const rohSeile = o.version === 1 ? [] : liste(o.seile, 'seile');
    const rohBaeume = o.version === 1 ? [] : liste(o.baeume, 'baeume');
    const rohPlanen = o.version === 3 ? liste(o.planen, 'planen') : [];
    const anzahl = rohGruppen.length + rohStangen.length + rohSeile.length + rohBaeume.length + rohPlanen.length;
    if (anzahl > MAX_TEILE) throw new Error(`mehr als ${MAX_TEILE} Teile`);
    const mitGruppen = rohGruppen.map((g) => this.liesGruppe(g)).reduce((b, g) => b.mitGruppe(g), Bauwerk.leer());
    const mitStangen = rohStangen.map((s) => this.liesStange(s)).reduce((b, s) => b.mitStange(s), mitGruppen);
    const mitBaeumen = rohBaeume.map((b) => this.liesBaum(b)).reduce((bw, b) => bw.mitBaum(b), mitStangen);
    const mitPlanen = rohPlanen.map((p) => this.liesPlane(p)).reduce((b, p) => b.mitPlane(p), mitBaeumen);
    return rohSeile.map((s) => this.liesSeil(s)).reduce((b, s) => b.mitSeil(s), mitPlanen);
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

  private liesSeil(daten: unknown): Seil {
    const o = objekt(daten, 'Seil');
    return new Seil(text(o.id, 'id'), vektor(o.start, 'start'), vektor(o.ende, 'ende'));
  }

  private liesBaum(daten: unknown): Baum {
    const o = objekt(daten, 'Baum');
    return new Baum(text(o.id, 'id'), vektor(o.position, 'position'), {
      durchmesser: zahl(o.durchmesser, 'durchmesser'),
      hoehe: zahl(o.hoehe, 'hoehe'),
    });
  }

  private liesPlane(daten: unknown): Plane {
    const o = objekt(daten, 'Plane');
    const form = o.form;
    if (form !== 'eben' && form !== 'satteldach') throw new Error('form unbekannt');
    const seite = o.seite;
    if (seite !== 1 && seite !== -1) throw new Error('seite muss 1 oder -1 sein');
    return new Plane(text(o.id, 'id'), vektor(o.start, 'start'), vektor(o.ende, 'ende'), {
      breite: zahl(o.breite, 'breite'),
      laenge: zahl(o.laenge, 'laenge'),
      form,
      neigungGrad: zahl(o.neigung, 'neigung'),
      seite,
    });
  }
}
