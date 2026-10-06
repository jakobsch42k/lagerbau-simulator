import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from './ABock';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { Dreibein } from './Dreibein';
import { type Bewegung, bewege } from './Mitbewegung';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_DREIBEIN, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

const abock = new ABock('abock', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK);
const dreibein = new Dreibein('dreibein', new Vec3(2.5, 0, 0), 0, STANDARD_DREIBEIN);
const BAU = ['abock', 'dreibein', 'first'];
const dv = new Vec3(10, 0, 5);
const schieben = (v: Vec3 = dv): Bewegung => ({ art: 'verschiebung', dv: v });
const gleich = (a: Vec3 | undefined, b: Vec3): boolean => a !== undefined && a.equals(b, 1e-9);
const mitBaum = (): Bauwerk => kochstelle().mitBaum(new Baum('baum', new Vec3(-4, 0, 0), STANDARD_BAUM));

describe('bewege: Verschieben', () => {
  it('lässt das Bauwerk gleich, wenn nichts bewegt wird', () => {
    const b = kochstelle();
    expect(bewege(b, [], schieben())).toBe(b);
    expect(bewege(b, ['gibtsnicht'], schieben())).toBe(b);
  });

  it('bewegt die gewählten Objekte um dv', () => {
    const neu = bewege(kochstelle(), BAU, schieben());
    expect(neu.gruppe('abock')?.position.equals(new Vec3(10, 0, 5), 1e-9)).toBe(true);
    const first = kochstelle().stange('first');
    expect(gleich(neu.stange('first')?.start, (first?.start ?? Vec3.NULL).add(dv))).toBe(true);
    expect(gleich(neu.stange('first')?.ende, (first?.ende ?? Vec3.NULL).add(dv))).toBe(true);
  });

  it('nimmt für eine Stange einer Baugruppe die ganze Baugruppe und wertet doppelte ids einmal', () => {
    const b = kochstelle();
    const neu = bewege(b, ['abock-bein-0', 'abock'], schieben());
    expect(neu.gruppe('abock')?.position.x).toBeCloseTo(10);
    expect(neu.gruppe('dreibein')).toBe(b.gruppe('dreibein'));
  });

  it('Abspannung Bau → Haring wandert ganz mit', () => {
    const b = kochstelle().mitSeil(new Seil('s', abock.spitze(), new Vec3(-1.5, 0, 1)));
    const s = bewege(b, BAU, schieben()).seil('s');
    expect(gleich(s?.start, abock.spitze().add(dv))).toBe(true);
    expect(gleich(s?.ende, new Vec3(8.5, 0, 6))).toBe(true);
  });

  it('Seil Bau → Baum: das Baum-Ende bleibt, das Seil wird neu gespannt', () => {
    const baumEnde = new Vec3(-3.85, 3, 0);
    const b = mitBaum().mitSeil(new Seil('s', abock.spitze(), baumEnde));
    const neu = bewege(b, BAU, schieben(new Vec3(1, 0, 0)));
    expect(gleich(neu.seil('s')?.ende, baumEnde)).toBe(true);
    expect(gleich(neu.seil('s')?.start, abock.spitze().add(new Vec3(1, 0, 0)))).toBe(true);
    expect(neu.baum('baum')).toBe(b.baum('baum'));
  });

  it('Seil zwischen zwei nicht bewegten Teilen bleibt identisch', () => {
    const b = kochstelle().mitSeil(new Seil('s', new Vec3(20, 0, 20), new Vec3(22, 0, 20)));
    expect(bewege(b, BAU, schieben()).seil('s')).toBe(b.seil('s'));
  });

  it('Seil an einem nicht bewegten Teil samt Haring bleibt identisch', () => {
    const bein = dreibein.stangen()[0];
    const mitte = bein ? bein.start.add(bein.ende).scale(0.5) : Vec3.NULL;
    const b = kochstelle().mitSeil(new Seil('s', mitte, new Vec3(4, 0, 2)));
    expect(bewege(b, ['abock', 'first'], schieben()).seil('s')).toBe(b.seil('s'));
  });

  it('Plane mit beiden Enden am Bau wandert mit', () => {
    const b = kochstelle().mitPlane(new Plane('p', abock.spitze(), dreibein.spitze(), STANDARD_PLANE));
    const p = bewege(b, BAU, schieben()).plane('p');
    expect(gleich(p?.start, abock.spitze().add(dv))).toBe(true);
    expect(gleich(p?.ende, dreibein.spitze().add(dv))).toBe(true);
    expect(p?.params).toBe(STANDARD_PLANE);
  });

  it('Plane mit einem Ende am Baum wird mit gleichen Maßen neu gespannt', () => {
    const baumEnde = new Vec3(-3.85, 3, 0);
    const b = mitBaum().mitPlane(new Plane('p', abock.spitze(), baumEnde, STANDARD_PLANE));
    const p = bewege(b, BAU, schieben(new Vec3(0, 0, 1))).plane('p');
    expect(gleich(p?.start, abock.spitze().add(new Vec3(0, 0, 1)))).toBe(true);
    expect(gleich(p?.ende, baumEnde)).toBe(true);
    expect(p?.params).toBe(STANDARD_PLANE);
  });

  it('lehnt die ganze Bewegung ab, wenn eine Plane zu steil würde; das Bauwerk bleibt', () => {
    const b = kochstelle().mitPlane(new Plane('p', abock.spitze(), new Vec3(3, 5, 0), STANDARD_PLANE));
    const aktion = (): unknown => bewege(b, ['abock'], schieben(new Vec3(3, 0, 0)));
    expect(aktion).toThrow(RangeError);
    expect(aktion).toThrow(/^Verschieben nicht möglich: Aufhängelinie zu steil\.$/);
  });

  it('lehnt ab, wenn ein Seil zu kurz würde', () => {
    const b = mitBaum().mitSeil(new Seil('s', abock.spitze(), new Vec3(-3.85, abock.spitze().y, 0)));
    expect(() => bewege(b, BAU, schieben(new Vec3(-3.85, 0, 0)))).toThrow(/^Verschieben nicht möglich: /);
  });

  it('lässt die Höhe unverändert, auch wenn dv.y gesetzt ist', () => {
    const b = kochstelle().mitSeil(new Seil('s', abock.spitze(), new Vec3(-1.5, 0, 1)));
    const neu = bewege(b, BAU, schieben(new Vec3(1, 7, 1)));
    expect(neu.stange('first')?.start.y).toBeCloseTo(kochstelle().stange('first')?.start.y ?? NaN);
    expect(neu.seil('s')?.ende.y).toBe(0);
    expect(neu.seil('s')?.start.y).toBeCloseTo(abock.spitze().y);
  });

  it('zieht Seile an den Ösen einer bewegten Plane mit', () => {
    const plane = new Plane('p', new Vec3(0, 3, 10), new Vec3(4, 3, 10), STANDARD_PLANE);
    const oese = plane.oesen[0] as Vec3;
    const b = Bauwerk.leer().mitPlane(plane).mitSeil(new Seil('s', oese, new Vec3(-1, 0, 10)));
    const neu = bewege(b, ['p'], schieben());
    expect(gleich(neu.seil('s')?.start, oese.add(dv))).toBe(true);
    expect(gleich(neu.seil('s')?.ende, new Vec3(9, 0, 15))).toBe(true);
  });
});

describe('bewege: Drehen', () => {
  const um = new Vec3(1, 0, 1);
  const w = Math.PI / 2;
  const drehen: Bewegung = { art: 'drehung', winkelRad: w, um };

  it('dreht Bau, Abspannung samt Haring und Plane um denselben Punkt', () => {
    const haring = new Vec3(-1.5, 0, 1);
    const b = kochstelle()
      .mitSeil(new Seil('s', abock.spitze(), haring))
      .mitPlane(new Plane('p', abock.spitze(), dreibein.spitze(), STANDARD_PLANE));
    const neu = bewege(b, BAU, drehen);
    expect(gleich(neu.seil('s')?.ende, haring.gedrehtUmY(w, um))).toBe(true);
    expect(gleich(neu.seil('s')?.start, abock.spitze().gedrehtUmY(w, um))).toBe(true);
    expect(gleich(neu.plane('p')?.start, abock.spitze().gedrehtUmY(w, um))).toBe(true);
    expect(neu.seil('s')?.ende.y).toBe(0);
  });

  it('lässt unbeteiligte Seile gleich', () => {
    const b = kochstelle().mitSeil(new Seil('s', new Vec3(20, 0, 20), new Vec3(22, 0, 20)));
    expect(bewege(b, BAU, drehen).seil('s')).toBe(b.seil('s'));
  });
});
