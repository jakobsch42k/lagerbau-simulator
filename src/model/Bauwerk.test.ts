import { describe, expect, it } from 'vitest';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { RegelEinstellungen } from '../rules/RegelEinstellungen';
import { Dreibein } from './Dreibein';
import { Luftbild } from './Luftbild';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from './params';
import { Stange } from './Stange';
import { Vec3 } from './Vec3';

const dreibein = new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN);
const abock = new ABock('a', new Vec3(4, 0, 0), 0, STANDARD_ABOCK);
const frei = new Stange('s', new Vec3(8, 0, 0), new Vec3(8, 2, 0), 0.08);
const voll = Bauwerk.leer().mitGruppe(dreibein).mitGruppe(abock).mitStange(frei);

describe('Bauwerk', () => {
  it('ist anfangs leer', () => {
    expect(Bauwerk.leer().istLeer).toBe(true);
    expect(Bauwerk.leer().stangen()).toHaveLength(0);
  });

  it('sammelt die Stangen aller Gruppen und die freien Stangen', () => {
    expect(voll.istLeer).toBe(false);
    expect(voll.stangen()).toHaveLength(3 + 3 + 1);
    expect(voll.gruppe('a')).toBe(abock);
    expect(voll.stange('d-bein-1')?.gruppeId).toBe('d');
    expect(voll.stange('gibtsnicht')).toBeUndefined();
  });

  it('bleibt beim Hinzufügen unverändert', () => {
    const basis = Bauwerk.leer();
    basis.mitGruppe(dreibein);
    expect(basis.istLeer).toBe(true);
  });

  it('lehnt doppelte IDs und Gruppenstangen als freie Stangen ab', () => {
    expect(() => voll.mitGruppe(dreibein)).toThrow(/schon vergeben/);
    expect(() => voll.mitStange(frei)).toThrow(/schon vergeben/);
    expect(() => Bauwerk.leer().mitStange(dreibein.stangen()[0] as Stange)).toThrow(/freie Stangen/);
  });

  it('ersetzt Gruppen und freie Stangen', () => {
    const neu = voll.ersetzeGruppe(dreibein.mitParams({ ...STANDARD_DREIBEIN, fusskreisradius: 0.9 }));
    expect((neu.gruppe('d') as Dreibein).params.fusskreisradius).toBe(0.9);
    expect(voll.ersetzeStange(frei.mitDurchmesser(0.12)).stange('s')?.durchmesser).toBe(0.12);
    expect(() => voll.ersetzeGruppe(new Dreibein('x', Vec3.NULL, 0, STANDARD_DREIBEIN))).toThrow(/gibt es nicht/);
    expect(() => voll.ersetzeStange(new Stange('x', Vec3.NULL, new Vec3(0, 1, 0), 0.08))).toThrow(/gibt es nicht/);
  });

  it('entfernt Gruppen und freie Stangen per ID', () => {
    expect(voll.ohne('d').stangen()).toHaveLength(4);
    expect(voll.ohne('s').stangen()).toHaveLength(6);
    expect(voll.ohne('unbekannt').stangen()).toHaveLength(7);
  });

  it('findet die Auswahl-ID einer Stange', () => {
    expect(voll.auswahlIdFuer('d-bein-2')).toBe('d');
    expect(voll.auswahlIdFuer('s')).toBe('s');
    expect(voll.enthaelt('a')).toBe(true);
    expect(voll.enthaelt('a-riegel')).toBe(true);
    expect(voll.enthaelt('nix')).toBe(false);
  });

  it('leitet Füße und Bünde aus der Geometrie ab', () => {
    const nurDreibein = Bauwerk.leer().mitGruppe(dreibein);
    expect(nurDreibein.fuesse()).toHaveLength(3);
    expect(nurDreibein.buende()).toHaveLength(1);
  });

  it('nimmt Seile und Bäume auf, findet und entfernt sie', () => {
    const seil = new Seil('seil', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
    const baum = new Baum('baum', new Vec3(5, 0, 5), STANDARD_BAUM);
    const b = Bauwerk.leer().mitSeil(seil).mitBaum(baum);
    expect(b.istLeer).toBe(false);
    expect(b.seil('seil')).toBe(seil);
    expect(b.baum('baum')).toBe(baum);
    expect(b.enthaelt('seil') && b.enthaelt('baum')).toBe(true);
    expect(b.ohne('seil').ohne('baum').istLeer).toBe(true);
    expect(b.seile).toHaveLength(1);
  });

  it('ersetzt Bäume und lehnt doppelte IDs über alle Teile ab', () => {
    const baum = new Baum('x', Vec3.NULL, STANDARD_BAUM);
    const b = Bauwerk.leer().mitBaum(baum);
    expect(b.ersetzeBaum(baum.mitParams({ durchmesser: 0.5, hoehe: 9 })).baum('x')?.params.hoehe).toBe(9);
    expect(() => b.mitSeil(new Seil('x', Vec3.NULL, new Vec3(1, 0, 0)))).toThrow('ID x ist schon vergeben');
    expect(() => b.ersetzeBaum(new Baum('y', Vec3.NULL, STANDARD_BAUM))).toThrow('Baum y gibt es nicht');
  });

  it('behält Seile und Bäume bei allen anderen Änderungen', () => {
    const mitPlatz = voll.mitBaum(new Baum('baum', new Vec3(20, 0, 0), STANDARD_BAUM)).mitSeil(new Seil('seil', new Vec3(8, 2, 0), new Vec3(10, 0, 0)));
    const geaendert = mitPlatz
      .ersetzeGruppe(dreibein.gedreht(0.1))
      .ersetzeStange(frei.mitDurchmesser(0.1))
      .ohne('a')
      .mitStange(new Stange('s2', new Vec3(12, 0, 0), new Vec3(12, 2, 0), 0.08));
    expect(geaendert.seile.map((s) => s.id)).toEqual(['seil']);
    expect(geaendert.baeume.map((b) => b.id)).toEqual(['baum']);
  });

  it('nimmt Planen auf, ersetzt und entfernt sie, ohne sich selbst zu ändern', () => {
    const plane = new Plane('pl', new Vec3(0, 2, 0), new Vec3(4, 2, 0), STANDARD_PLANE);
    const b = Bauwerk.leer().mitPlane(plane);
    expect(b.istLeer).toBe(false);
    expect(b.plane('pl')).toBe(plane);
    expect(b.enthaelt('pl')).toBe(true);
    const flach = plane.mitParams({ ...STANDARD_PLANE, neigungGrad: 0 });
    expect(b.ersetzePlane(flach).plane('pl')).toBe(flach);
    expect(b.plane('pl')).toBe(plane);
    expect(b.ohne('pl').istLeer).toBe(true);
    expect(() => b.mitPlane(plane)).toThrow('ID pl ist schon vergeben');
    expect(() => Bauwerk.leer().ersetzePlane(plane)).toThrow('Plane pl gibt es nicht');
  });

  it('kennt Planen in der Verankerung', () => {
    const plane = new Plane('pl', new Vec3(2, 1, -2), new Vec3(2, 1, 2), { ...STANDARD_PLANE, neigungGrad: 0, breite: 1 });
    expect(Bauwerk.leer().mitPlane(plane).verankerung(new Vec3(2, 1, 0))).toEqual({ art: 'plane', planeId: 'pl' });
  });
});

describe('Bauwerk als eine geordnete Liste (Spec v3, D1)', () => {
  const seil = new Seil('l', new Vec3(0, 2, 0), new Vec3(2, 0, 0));
  const baum = new Baum('b', new Vec3(9, 0, 0), STANDARD_BAUM);

  it('baut mit von in einem Schritt und behält die Reihenfolge', () => {
    const liste = [frei, seil, dreibein, baum];
    const b = Bauwerk.von(liste);
    expect(b.objekte.map((o) => o.id)).toEqual(['s', 'l', 'd', 'b']);
    b.objekte.forEach((o, i) => expect(o).toBe(liste[i]));
    expect(Bauwerk.von([]).istLeer).toBe(true);
  });

  it('lehnt in von doppelte ids ab, auch die einer Gruppenstange', () => {
    expect(() => Bauwerk.von([dreibein, dreibein])).toThrow('ID d ist schon vergeben');
    expect(() => Bauwerk.von([dreibein, new Stange('d-bein-1', Vec3.NULL, new Vec3(0, 1, 0), 0.08)])).toThrow('ID d-bein-1 ist schon vergeben');
  });

  it('hängt mit mit an und findet Objekte und Besitzer', () => {
    const b = Bauwerk.leer().mit(dreibein).mit(seil);
    expect(b.objekt('d')).toBe(dreibein);
    expect(b.objekt('d-bein-1')).toBeUndefined();
    expect(b.besitzer('d-bein-1')).toBe(dreibein);
    expect(b.besitzer('l')).toBe(seil);
    expect(b.besitzer('weg')).toBeUndefined();
    expect(() => b.mit(new Seil('d-bein-0', Vec3.NULL, new Vec3(1, 0, 0)))).toThrow('ID d-bein-0 ist schon vergeben');
  });

  it('lässt beim Ersetzen und Entfernen alle anderen Objekte unverändert (Identität)', () => {
    const b = Bauwerk.von([dreibein, abock, frei, seil, baum]);
    const gedreht = dreibein.gedreht(0.1);
    const neu = b.ersetze(gedreht);
    expect(neu.objekte[0]).toBe(gedreht);
    neu.objekte.slice(1).forEach((o, i) => expect(o).toBe(b.objekte[i + 1]));
    const ohne = b.ohne('a');
    expect(ohne.objekte.map((o) => o.id)).toEqual(['d', 's', 'l', 'b']);
    ohne.objekte.forEach((o) => expect(o).toBe(b.objekt(o.id)));
    expect(b.objekte).toHaveLength(5);
  });

  it('gibt bei unveränderten Objekten dasselbe Bauwerk zurück', () => {
    const b = Bauwerk.von([dreibein, seil]);
    expect(b.ersetze(dreibein)).toBe(b);
    expect(b.ohne('weg')).toBe(b);
  });

  it('lehnt beim Ersetzen unbekannte Objekte und fremde ids ab', () => {
    const b = Bauwerk.von([dreibein, new Stange('d-riegel', new Vec3(5, 0, 0), new Vec3(5, 1, 0), 0.08)]);
    expect(() => b.ersetze(seil)).toThrow('Objekt l gibt es nicht');
    // Ein A-Bock mit der id des Dreibeins brächte eine Stange „d-riegel“ mit; die steht schon frei herum.
    expect(() => b.ersetze(new ABock('d', Vec3.NULL, 0, STANDARD_ABOCK))).toThrow('ID d-riegel ist schon vergeben');
  });

  it('leitet die Stangen wie bisher ab: erst alle Gruppen, dann die freien Stangen', () => {
    const b = Bauwerk.leer().mitStange(frei).mitGruppe(dreibein);
    expect(b.objekte.map((o) => o.id)).toEqual(['s', 'd']);
    expect(b.stangen().map((s) => s.id)).toEqual(['d-bein-0', 'd-bein-1', 'd-bein-2', 's']);
    expect(b.gruppen[0]).toBe(dreibein);
    expect(b.freieStangen[0]).toBe(frei);
  });
});

describe('Regel-Einstellungen im Bauwerk (Spec v3, D8)', () => {
  it('hat standardmäßig alle Regeln an und keine Werte gesetzt', () => {
    expect(Bauwerk.leer().regelEinstellungen.istStandard).toBe(true);
    expect(Bauwerk.von([dreibein]).regelEinstellungen).toBe(RegelEinstellungen.standard());
  });

  it('tauscht die Einstellungen, ohne Objekte zu ändern, und behält sie bei allen Objekt-Änderungen', () => {
    const e = RegelEinstellungen.standard().mitAus('R4', true);
    const b = Bauwerk.von([dreibein, frei]).mitRegelEinstellungen(e);
    expect(b.regelEinstellungen).toBe(e);
    expect(b.objekte[0]).toBe(dreibein);
    expect(b.mitRegelEinstellungen(e)).toBe(b);
    const geaendert = b.mit(abock).ersetze(dreibein.gedreht(0.1)).ohne('s');
    expect(geaendert.regelEinstellungen).toBe(e);
    expect(Bauwerk.von([dreibein], e).regelEinstellungen).toBe(e);
  });
});

describe('Bauwerk mit Luftbild (Spec E2, D1)', () => {
  const l = Luftbild.vorlaeufig('data:image/png;base64,iVBORw0KGgo=', 200, 100);

  it('hat standardmäßig kein Luftbild und führt es nicht unter den Objekten', () => {
    expect(Bauwerk.leer().luftbild).toBeNull();
    const b = Bauwerk.leer().mitLuftbild(l);
    expect(b.luftbild).toBe(l);
    expect(b.objekte).toEqual([]);
    expect(b.istLeer).toBe(true);
  });

  it('mitLuftbild mit demselben Wert ergibt dasselbe Bauwerk, null entfernt das Bild', () => {
    const b = Bauwerk.leer().mitLuftbild(l);
    expect(b.mitLuftbild(l)).toBe(b);
    expect(b.mitLuftbild(null).luftbild).toBeNull();
    expect(Bauwerk.leer().mitLuftbild(null)).not.toBeNull();
  });

  it('bleibt beim Hinzufügen, Ersetzen, Entfernen und bei neuen Regel-Einstellungen erhalten', () => {
    const stange = new Stange('s', Vec3.NULL, new Vec3(0, 2, 0), 0.08);
    const b = Bauwerk.leer().mitLuftbild(l).mit(stange);
    expect(b.luftbild).toBe(l);
    expect(b.ersetze(new Stange('s', Vec3.NULL, new Vec3(0, 3, 0), 0.08)).luftbild).toBe(l);
    expect(b.ohne('s').luftbild).toBe(l);
    expect(b.mitRegelEinstellungen(RegelEinstellungen.von(['R1'], {})).luftbild).toBe(l);
    expect(b.mitLuftbild(null).objekte[0]).toBe(stange);
  });

  it('Bauwerk.von nimmt ein Luftbild an', () => {
    expect(Bauwerk.von([], RegelEinstellungen.standard(), l).luftbild).toBe(l);
  });
});
