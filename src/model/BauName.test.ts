import { describe, expect, it } from 'vitest';
import { kochstelle } from '../beispiele/kochstelle';
import { ABock } from './ABock';
import { Bau } from './Bau';
import { Baum } from './Baum';
import { Bauwerk } from './Bauwerk';
import { kopiere } from './Duplikat';
import { STANDARD_ABOCK, STANDARD_BAUM, STANDARD_PLANE } from './params';
import { Plane } from './Plane';
import { Seil } from './Seil';
import { Vec3 } from './Vec3';

const abock2 = (): ABock => new ABock('abock2', new Vec3(20, 0, 0), 0, STANDARD_ABOCK);
const zweiBauten = (): Bauwerk => kochstelle().mitGruppe(abock2());
const bauMit = (b: Bauwerk, id: string): Bau => Bau.von(b, id);

describe('Bau.alle / ohneBau / teilBauwerk (Spec E5, D2)', () => {
  it('ein Bau an der Kochstelle, mit erstem Objekt und Ids in Reihenfolge des Bauwerks', () => {
    const alle = Bau.alle(kochstelle());
    expect(alle).toHaveLength(1);
    expect(alle[0]?.objektIds).toEqual(['abock', 'dreibein', 'first']);
    expect(alle[0]?.erstesObjekt).toBe('abock');
  });

  it('zwei getrennte Bauten, geordnet nach dem ersten Objekt', () => {
    expect(Bau.alle(zweiBauten()).map((b) => b.erstesObjekt)).toEqual(['abock', 'abock2']);
    const umgekehrt = Bauwerk.von([abock2(), ...kochstelle().objekte]);
    expect(Bau.alle(umgekehrt).map((b) => b.erstesObjekt)).toEqual(['abock2', 'abock']);
  });

  it('leeres Bauwerk und nur Bäume haben keinen Bau', () => {
    expect(Bau.alle(Bauwerk.leer())).toEqual([]);
    expect(Bau.alle(Bauwerk.leer().mitBaum(new Baum('b', Vec3.NULL, STANDARD_BAUM)))).toEqual([]);
  });

  it('ohneBau: Plane zwischen zwei Bäumen und Seil Baum–Haring, in Reihenfolge des Bauwerks, ohne Bäume', () => {
    const b = zweiBauten()
      .mitBaum(new Baum('b1', new Vec3(30, 0, 0), STANDARD_BAUM))
      .mitBaum(new Baum('b2', new Vec3(34, 0, 0), STANDARD_BAUM))
      .mitSeil(new Seil('s', new Vec3(40, 3, 0), new Vec3(42, 0, 0)))
      .mitPlane(new Plane('p', new Vec3(30, 3, 0), new Vec3(34, 3, 0), STANDARD_PLANE));
    expect(Bau.ohneBau(b)).toEqual(['s', 'p']);
  });

  it('ohneBau ist leer, wenn jedes Seil und jede Plane an einem Bau hängt', () => {
    const b = kochstelle().mitSeil(new Seil('s', new ABock('x', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK).spitze(), new Vec3(-2, 0, 1)));
    expect(Bau.ohneBau(b)).toEqual([]);
  });

  it('teilBauwerk enthält genau die Objekte des Baus, ohne Bäume', () => {
    const b = zweiBauten().mitBaum(new Baum('b', new Vec3(-4, 0, 0), STANDARD_BAUM));
    const alle = Bau.alle(b);
    expect(alle[1]?.teilBauwerk(b).objekte.map((o) => o.id)).toEqual(['abock2']);
    expect(alle[0]?.teilBauwerk(b).objekte.map((o) => o.id)).toEqual(['abock', 'dreibein', 'first']);
  });

  it('teilBauwerk nimmt Regel-Einstellungen mit, aber weder Luftbild noch Namen', () => {
    const b = kochstelle().mitBauName(bauMit(kochstelle(), 'abock'), 'Küche');
    const teil = Bau.alle(b)[0]?.teilBauwerk(b);
    expect(teil?.regelEinstellungen).toBe(b.regelEinstellungen);
    expect(teil?.luftbild).toBeNull();
    expect(teil?.bauNamen.size).toBe(0);
  });
});

describe('Bau-Name (Spec E5, D2)', () => {
  it('Standardname „Bau N“ nach Position in Bau.alle', () => {
    const b = zweiBauten();
    expect(b.bauName(bauMit(b, 'abock'))).toBe('Bau 1');
    expect(b.bauName(bauMit(b, 'abock2'))).toBe('Bau 2');
  });

  it('Umbenennen schreibt am ersten Objekt, löscht alte Einträge im Bau und trimmt', () => {
    const k = kochstelle();
    const b = Bauwerk.von(k.objekte, undefined, null, new Map([['first', 'Alt']]));
    const neu = b.mitBauName(bauMit(b, 'first'), '  Küche ');
    expect([...neu.bauNamen]).toEqual([['abock', 'Küche']]);
    expect(neu.bauName(bauMit(neu, 'dreibein'))).toBe('Küche');
  });

  it('leerer Name (oder null) entfernt alle Einträge: wieder „Bau N“', () => {
    const b = kochstelle();
    const benannt = b.mitBauName(bauMit(b, 'abock'), 'Küche');
    expect(benannt.mitBauName(bauMit(benannt, 'abock'), '   ').bauNamen.size).toBe(0);
    const ohneName = benannt.mitBauName(bauMit(benannt, 'abock'), null);
    expect(ohneName.bauName(bauMit(ohneName, 'abock'))).toBe('Bau 1');
  });

  it('Name über 40 Zeichen wirft die Meldung der Spec; 40 sind erlaubt', () => {
    const b = kochstelle();
    expect(() => b.mitBauName(bauMit(b, 'abock'), 'x'.repeat(41))).toThrow('Name muss 1 bis 40 Zeichen lang sein.');
    expect(b.mitBauName(bauMit(b, 'abock'), 'x'.repeat(40)).bauNamen.size).toBe(1);
  });

  it('der Eintrag des ersten Objekts, das einen hat, gilt', () => {
    const b = Bauwerk.von(kochstelle().objekte, undefined, null, new Map([['first', 'Firstbau']]));
    expect(b.bauName(bauMit(b, 'abock'))).toBe('Firstbau');
  });

  it('Namensträger gelöscht: der Name wandert zum ersten überlebenden Objekt des Baus', () => {
    const b = kochstelle();
    const benannt = b.mitBauName(bauMit(b, 'abock'), 'Küche');
    expect([...benannt.ohne('abock').bauNamen]).toEqual([['dreibein', 'Küche']]);
  });

  it('Namensträger gelöscht, nichts überlebt: der Eintrag entfällt', () => {
    const b = Bauwerk.leer().mitGruppe(new ABock('a', Vec3.NULL, 0, STANDARD_ABOCK));
    expect(b.mitBauName(bauMit(b, 'a'), 'Solo').ohne('a').bauNamen.size).toBe(0);
  });

  it('ein anderes Objekt zu löschen lässt die Namen unberührt', () => {
    const b = kochstelle();
    const benannt = b.mitBauName(bauMit(b, 'abock'), 'Küche');
    expect([...benannt.ohne('first').bauNamen]).toEqual([['abock', 'Küche']]);
  });

  it('Verbinden zweier benannter Bauten: der Teil weiter vorne gilt, der andere ruht und kommt beim Trennen zurück', () => {
    const [abock, dreibein, first] = kochstelle().objekte;
    const getrennt = Bauwerk.von([abock!, dreibein!]);
    const mitNamen = getrennt.mitBauName(bauMit(getrennt, 'abock'), 'Küche');
    const beide = mitNamen.mitBauName(bauMit(mitNamen, 'dreibein'), 'Lager');
    expect(beide.bauName(bauMit(beide, 'abock'))).toBe('Küche');
    expect(beide.bauName(bauMit(beide, 'dreibein'))).toBe('Lager');
    const verbunden = Bauwerk.von([abock!, dreibein!, first!], undefined, null, beide.bauNamen);
    expect(verbunden.bauName(bauMit(verbunden, 'first'))).toBe('Küche');
    expect(verbunden.bauNamen.get('dreibein')).toBe('Lager');
    const wiederGetrennt = verbunden.ohne('first');
    expect(wiederGetrennt.bauName(bauMit(wiederGetrennt, 'abock'))).toBe('Küche');
    expect(wiederGetrennt.bauName(bauMit(wiederGetrennt, 'dreibein'))).toBe('Lager');
  });

  it('Trennen: der Teil mit dem Namensträger behält ihn, der andere heißt „Bau N“', () => {
    const b = kochstelle();
    const getrennt = b.mitBauName(bauMit(b, 'abock'), 'Küche').ohne('first');
    expect(getrennt.bauName(bauMit(getrennt, 'abock'))).toBe('Küche');
    expect(getrennt.bauName(bauMit(getrennt, 'dreibein'))).toBe('Bau 2');
  });

  it('eine Kopie hat neue ids und damit den automatischen Namen', () => {
    const b = kochstelle();
    const benannt = b.mitBauName(bauMit(b, 'abock'), 'Küche');
    let n = 0;
    const { bauwerk, neueIds } = kopiere(benannt, benannt.objekte, new Vec3(10, 0, 0), (p) => `${p}-k${n++}`);
    expect(bauwerk.bauName(bauMit(bauwerk, 'abock'))).toBe('Küche');
    expect(bauwerk.bauName(bauMit(bauwerk, neueIds[0] as string))).toBe('Bau 2');
  });

  it('mit, ersetze, Regeln und Luftbild behalten die Namen', () => {
    const b = kochstelle();
    const benannt = b.mitBauName(bauMit(b, 'abock'), 'Küche');
    const weiter = benannt.mitBaum(new Baum('bm', Vec3.NULL, STANDARD_BAUM)).mitRegelEinstellungen(benannt.regelEinstellungen).mitLuftbild(null);
    expect(weiter.bauNamen.get('abock')).toBe('Küche');
    const baum = new Baum('bm', new Vec3(1, 0, 0), STANDARD_BAUM);
    expect(weiter.ersetze(baum).bauNamen.get('abock')).toBe('Küche');
  });
});
