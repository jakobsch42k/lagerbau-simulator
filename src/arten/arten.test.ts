import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Baum } from '../model/Baum';
import { Beschriftung } from '../model/Beschriftung';
import { Dreibein } from '../model/Dreibein';
import { ART_NAMEN, type ArtName, type LagerObjekt } from '../model/LagerObjekt';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_BESCHRIFTUNG, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Plane } from '../model/Plane';
import { Platzobjekt } from '../model/Platzobjekt';
import { Seil } from '../model/Seil';
import { Stange } from '../model/Stange';
import { Linie } from '../model/Linie';
import { STANDARD_LINIE, STANDARD_ZONE } from '../model/params';
import { Vec3 } from '../model/Vec3';
import { Zelt } from '../model/Zelt';
import { JURTE6 } from '../model/Zelt.testdaten';
import { Zone } from '../model/Zone';
import { ObjektRegister } from './ObjektRegister';
import { SeilArt } from './SeilArt';
import { standardArten } from './standardArten';

const arten = standardArten();
const beispiele: readonly LagerObjekt[] = [
  new Dreibein('d', new Vec3(1, 0, 2), 0.5, STANDARD_DREIBEIN),
  new ABock('a', new Vec3(4, 0, 0), Math.PI / 2, STANDARD_ABOCK),
  new Stange('s', new Vec3(8, 0, 0), new Vec3(8, 2, 0), 0.08),
  new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0)),
  new Baum('b', new Vec3(5, 0, 5), STANDARD_BAUM),
  new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), { ...STANDARD_PLANE, form: 'satteldach' }),
  new Platzobjekt('po', new Vec3(2, 0, 3), { vorlage: 'holzlager', name: 'Holzlager', form: 'rechteck', breite: 3, laenge: 2, hoehe: 1, farbe: '#8b5a2b' }, 0.5),
  new Beschriftung('be', new Vec3(1, 0, 1), STANDARD_BESCHRIFTUNG),
  new Zone('zo', [new Vec3(0, 0, 0), new Vec3(6, 0, 0), new Vec3(6, 0, 4)], STANDARD_ZONE),
  new Linie('li', [new Vec3(0, 0, 0), new Vec3(6, 0, 4)], { ...STANDARD_LINIE, typ: 'zaun' }),
  new Zelt('ze', new Vec3(3, 0, 3), JURTE6, 0.5),
];
/** Die Felder je Art wie in v3, nur mit `art` vorneweg und bei Gruppen ohne `typ` (Spec v3, D3). */
const FELDER: Readonly<Record<ArtName, readonly string[]>> = {
  dreibein: ['art', 'id', 'position', 'drehung', 'params'],
  abock: ['art', 'id', 'position', 'drehung', 'params'],
  stange: ['art', 'id', 'start', 'ende', 'durchmesser'],
  seil: ['art', 'id', 'start', 'ende'],
  baum: ['art', 'id', 'position', 'durchmesser', 'hoehe'],
  plane: ['art', 'id', 'start', 'ende', 'breite', 'laenge', 'form', 'neigung', 'seite'],
  platzobjekt: ['art', 'id', 'position', 'drehung', 'vorlage', 'name', 'form', 'breite', 'laenge', 'hoehe', 'farbe'],
  beschriftung: ['art', 'id', 'position', 'text', 'groesse', 'farbe'],
  zone: ['art', 'id', 'name', 'farbe', 'deckkraft', 'punkte'],
  linie: ['art', 'id', 'name', 'typ', 'breite', 'farbe', 'punkte'],
  zelt: ['art', 'id', 'vorlage', 'name', 'aufbau', 'position', 'drehungRad', 'durchmesser', 'ecken', 'laenge', 'breite', 'wandhoehe', 'firsthoehe', 'waende', 'abspannungen', 'seillaenge', 'haringAbstand', 'farbe'],
};

describe('ObjektRegister (Spec v3, D2)', () => {
  it('kennt jede Art genau einmal', () => {
    const namen = arten.alle.map((a) => a.name);
    expect(namen).toHaveLength(ART_NAMEN.length);
    expect([...namen].sort()).toEqual([...ART_NAMEN].sort());
  });

  it('lehnt eine doppelt registrierte Art ab', () => {
    expect(() => new ObjektRegister([new SeilArt(), new SeilArt()])).toThrow('Art seil ist doppelt registriert');
  });

  it('findet zu jedem Objekt seine Art; jede Art erkennt nur ihre eigenen Objekte', () => {
    for (const o of beispiele) {
      expect(arten.artVon(o).name).toBe(o.art);
      expect(arten.alle.filter((a) => a.istVon(o)).map((a) => a.name)).toEqual([o.art]);
    }
  });

  it('meldet unbekannte Namen und Objekte, die nicht zu ihrer Art passen', () => {
    expect(arten.finde('vierbein')).toBeUndefined();
    expect(() => arten.art('vierbein' as unknown as ArtName)).toThrow('Art vierbein ist nicht registriert');
    const falsch = { ...new Seil('x', Vec3.NULL, new Vec3(1, 0, 0)), art: 'stange' } as unknown as LagerObjekt;
    expect(() => arten.artVon(falsch)).toThrow('x passt nicht zur Art stange');
  });
});

describe('Platzbedarf je Art (Spec E3, D3)', () => {
  it('zählen alle Arten außer Platz-Objekt, Beschriftung, Zone und Linie', () => {
    expect(beispiele.filter((o) => !arten.zaehltZumPlatzbedarf(o)).map((o) => o.art)).toEqual(['platzobjekt', 'beschriftung', 'zone', 'linie']);
  });
});

describe('Codec je Art (Datenformat v4)', () => {
  it.each<[ArtName, LagerObjekt]>(beispiele.map((o): [ArtName, LagerObjekt] => [o.art, o]))('%s übersteht die Rundreise über JSON-Text', (_name, o) => {
    const art = arten.artVon(o);
    const json = art.zuJson(o);
    expect(Object.keys(json)).toEqual(FELDER[o.art]);
    expect([json.art, json.id]).toEqual([o.art, o.id]);
    const zurueck = art.ausJson(JSON.parse(JSON.stringify(json)));
    expect(art.istVon(zurueck)).toBe(true);
    expect(art.zuJson(zurueck)).toEqual(json);
  });

  it.each<[string, ArtName, Record<string, unknown>, string]>([
    ['Dreibein ohne Fußkreisradius', 'dreibein', { id: 'd', position: [0, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, durchmesser: 0.08 } }, 'fusskreisradius ist keine Zahl'],
    ['A-Bock ohne params', 'abock', { id: 'a', position: [0, 0, 0], drehung: 0 }, 'params ist kein Objekt'],
    ['Stange mit leerer id', 'stange', { id: '', start: [0, 0, 0], ende: [0, 2, 0], durchmesser: 0.08 }, 'id fehlt'],
    ['Seil mit kurzem Vektor', 'seil', { id: 'l', start: [0, 0], ende: [1, 0, 0] }, 'start braucht drei Koordinaten'],
    ['Baum ohne Höhe', 'baum', { id: 'b', position: [0, 0, 0], durchmesser: 0.3 }, 'hoehe ist keine Zahl'],
    ['Plane mit unbekannter Form', 'plane', { id: 'p', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'schief', neigung: 30, seite: 1 }, 'form unbekannt'],
    ['Plane mit Seite 0', 'plane', { id: 'p', start: [0, 2, 0], ende: [4, 2, 0], breite: 3, laenge: 4, form: 'eben', neigung: 30, seite: 0 }, 'seite muss 1 oder -1 sein'],
  ])('lehnt ab: %s', (_name, name, roh, meldung) => {
    expect(() => arten.art(name).ausJson(roh)).toThrow(meldung);
  });
});
