import { describe, expect, it } from 'vitest';
import { ABock } from '../model/ABock';
import { Bauwerk } from '../model/Bauwerk';
import { BUND_CLUSTER_RADIUS } from '../model/konstanten';
import { Dreibein } from '../model/Dreibein';
import { Plane } from '../model/Plane';
import { STANDARD_ABOCK, STANDARD_DREIBEIN, STANDARD_PLANE } from '../model/params';
import { Seil } from '../model/Seil';
import { Vec3 } from '../model/Vec3';
import { Analyse } from './Analyse';
import { FesteKnoten } from './FesteKnoten';
import { type Knoten, KnotenGraph } from './KnotenGraph';
import { lagertor } from './lagertor.fixture';

function aufbau(b: Bauwerk) {
  const graph = new KnotenGraph(new Analyse(b));
  const fest = new FesteKnoten(new Analyse(b), graph);
  const bei = (p: Vec3): Knoten => graph.knoten.reduce((a, k) => (a.position.distanceTo(p) <= k.position.distanceTo(p) ? a : k));
  return { graph, fest, bei };
}

const abock = new ABock('abock', Vec3.NULL, Math.PI / 2, STANDARD_ABOCK); // A-Ebene ist x = 0
const spitze = abock.spitze();
const einzelnerABock = Bauwerk.leer().mitGruppe(abock);

describe('FesteKnoten', () => {
  it('Dreibein: alle Knoten sind fest', () => {
    const { graph, fest } = aufbau(Bauwerk.leer().mitGruppe(new Dreibein('d', Vec3.NULL, 0, STANDARD_DREIBEIN)));
    expect(graph.knoten.every((k) => fest.istFest(k))).toBe(true);
  });

  it('einzelner A-Bock: Füße fest, Spitze nicht (nur 2 Punkte, kippt seitlich)', () => {
    const { graph, fest, bei } = aufbau(einzelnerABock);
    expect(fest.istFest(bei(spitze))).toBe(false);
    expect(graph.knoten.filter((k) => k.seiten.has('boden')).every((k) => fest.istFest(k))).toBe(true);
  });

  it('A-Bock mit Seil von der Spitze quer zur A-Ebene zum Hering: Spitze fest', () => {
    const { fest, bei } = aufbau(einzelnerABock.mitSeil(new Seil('s', spitze, new Vec3(-1.5, 0, 0))));
    expect(fest.istFest(bei(spitze))).toBe(true);
  });

  it('Seil in der A-Ebene zum Hering: Spitze bleibt lose (Beine und Seil liegen in einer Ebene)', () => {
    const { fest, bei } = aufbau(einzelnerABock.mitSeil(new Seil('s', spitze, new Vec3(0, 0, 2))));
    expect(fest.istFest(bei(spitze))).toBe(false);
  });

  it('Lagertor ohne Seile: Spitzen nicht fest', () => {
    const { fest, bei } = aufbau(lagertor(false));
    expect(fest.istFest(bei(new Vec3(0, spitze.y, 0)))).toBe(false);
    expect(fest.istFest(bei(new Vec3(4, spitze.y, 0)))).toBe(false);
  });

  it('Lagertor mit Längsabspannung: alle Knoten fest', () => {
    const { graph, fest } = aufbau(lagertor(true));
    expect(graph.knoten.filter((k) => !fest.istFest(k))).toEqual([]);
  });

  it('Seil zwischen zwei Bau-Knoten: ein einzelner fester Nachbar macht die Spitze nicht fest', () => {
    const quer = lagertor(false).mitSeil(new Seil('x', new Vec3(0, spitze.y, 0), new Vec3(4, 0.3, 0)));
    const { fest, bei } = aufbau(quer);
    expect(fest.istFest(bei(new Vec3(0, spitze.y, 0)))).toBe(false);
  });

  it('Seil zwischen zwei Bau-Knoten gibt Festigkeit weiter: abgespannter A-Bock hält die Spitze des zweiten', () => {
    const zweiter = new ABock('zweiter', new Vec3(4, 0, 0), Math.PI / 2, STANDARD_ABOCK);
    const bau = einzelnerABock
      .mitGruppe(zweiter)
      .mitSeil(new Seil('quer', spitze, new Vec3(-1.5, 0, 0)))
      .mitSeil(new Seil('brueck', spitze, zweiter.spitze()));
    const { fest, bei } = aufbau(bau);
    expect(fest.istFest(bei(zweiter.spitze()))).toBe(true);
    expect(fest.istFest(aufbau(bau.ohne('quer')).bei(zweiter.spitze()))).toBe(false);
  });

  it('Seil zu einer Plane zählt nicht', () => {
    const plane = new Plane('pl', new Vec3(-1.5, 2.5, -2), new Vec3(-1.5, 2.5, 2), { ...STANDARD_PLANE, neigungGrad: 0 });
    const mitPlane = einzelnerABock.mitPlane(plane).mitSeil(new Seil('s', spitze, new Vec3(-1.5, 2.5, 0)));
    const { fest, bei } = aufbau(mitPlane);
    expect(new Analyse(mitPlane).verankerungVon('s')[1].art).toBe('plane');
    expect(fest.istFest(bei(spitze))).toBe(false);
  });

  it('freies Seilende zählt nicht', () => {
    const frei = einzelnerABock.mitSeil(new Seil('s', spitze, new Vec3(-1.5, 1, 0)));
    const { fest, bei } = aufbau(frei);
    expect(fest.istFest(bei(spitze))).toBe(false);
  });

  it('Seilende weiter als BUND_CLUSTER_RADIUS vom nächsten Knoten zählt nicht', () => {
    const nah = new Vec3(0, spitze.y + BUND_CLUSTER_RADIUS * 0.5, 0);
    const fern = new Vec3(0, spitze.y + BUND_CLUSTER_RADIUS * 2, 0);
    const zumHering = (start: Vec3) => einzelnerABock.mitSeil(new Seil('s', start, new Vec3(-1.5, 0, 0)));
    const mitNah = aufbau(zumHering(nah));
    const mitFern = aufbau(zumHering(fern));
    expect(mitNah.fest.istFest(mitNah.bei(spitze))).toBe(true);
    expect(mitFern.fest.istFest(mitFern.bei(spitze))).toBe(false);
  });
});
