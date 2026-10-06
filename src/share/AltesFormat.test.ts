import { describe, expect, it } from 'vitest';
import { Platzbedarf } from '../model/Platzbedarf';
import { BauwerkSerializer } from './BauwerkSerializer';

const serializer = new BauwerkSerializer();

type V3 = [number, number, number];

// Dieselben Daten wie in e2e/smoke.spec.ts (v1), e2e/abspannung.spec.ts (v2) und e2e/planen.spec.ts (v3).
const ABOCK_SPITZE: V3 = [0, Math.sqrt(2.2 ** 2 - 0.8 ** 2), 0];
const DREIBEIN_SPITZE: V3 = [2.5, Math.sqrt(2.2 ** 2 - 0.7 ** 2), 0];
const ABOCK = { id: 'abock', typ: 'abock', position: [0, 0, 0], drehung: Math.PI / 2, params: { stangenlaenge: 2.4, fussabstand: 1.6, riegelhoehe: 0.4, durchmesser: 0.08 } };
const DREIBEIN = { id: 'dreibein', typ: 'dreibein', position: [2.5, 0, 0], drehung: 0, params: { stangenlaenge: 2.4, fusskreisradius: 0.7, durchmesser: 0.08 } };
const seil = (id: string, x: number) => ({ id, start: ABOCK_SPITZE, ende: [x, 0, 0] });

/** Der First ragt wie bei Stange.zwischen an beiden Enden 0,2 m über die Spitzen hinaus. */
function first(): { id: string; start: V3; ende: V3; durchmesser: number } {
  const d = DREIBEIN_SPITZE.map((x, i) => x - ABOCK_SPITZE[i]!);
  const laenge = Math.hypot(...d);
  const r = d.map((x) => x / laenge);
  return {
    id: 'first',
    start: ABOCK_SPITZE.map((x, i) => x - r[i]! * 0.2) as V3,
    ende: DREIBEIN_SPITZE.map((x, i) => x + r[i]! * 0.2) as V3,
    durchmesser: 0.08,
  };
}

const V1 = { version: 1, gruppen: [ABOCK, DREIBEIN], stangen: [] };
const V2 = { version: 2, gruppen: [ABOCK], stangen: [], seile: [seil('l', -1.5), seil('r', 1.5)], baeume: [] };
const V3_DACH = {
  version: 3,
  gruppen: [ABOCK, DREIBEIN],
  stangen: [first()],
  seile: [],
  baeume: [],
  planen: [{ id: 'dach', start: ABOCK_SPITZE, ende: DREIBEIN_SPITZE, breite: 3, laenge: 4, form: 'satteldach', neigung: 30, seite: 1 }],
};

/** Was vom Lesen abhängt und man sieht: Reihenfolgen, Bünde, Haringe, Platzbedarf. */
function fingerabdruck(daten: unknown) {
  const b = serializer.ausJson(daten);
  const p = Platzbedarf.aus(b);
  return {
    objekte: b.objekte.map((o) => o.id),
    stangen: b.stangen().map((s) => s.id),
    buende: b.buende().map((x) => `${x.id}:${x.stangenIds.join('+')}`),
    haringe: b.haringe().map((h) => `${h.id}:${h.seilIds.join('+')}@${h.position.toArray().map((v) => v.toFixed(3)).join(',')}`),
    platz: p === null ? [] : [p.minX, p.maxX, p.minZ, p.maxZ],
  };
}

const imRahmen = (ist: readonly number[], soll: readonly number[]): void => {
  expect(ist).toHaveLength(soll.length);
  soll.forEach((w, i) => expect(ist[i]).toBeCloseTo(w, 2));
};

const ABOCK_STANGEN = ['abock-bein-0', 'abock-bein-1', 'abock-riegel'];
const DREIBEIN_STANGEN = ['dreibein-bein-0', 'dreibein-bein-1', 'dreibein-bein-2'];

// Die erwarteten Werte wurden am 05.10.2026 vor E0 (Code-Stand 6b4d36d) mit dem alten Serializer gemessen; die Haring-ids nach der Umbenennung (8701ff1) erneut geprüft.
describe('Alte Formate 1–3 lesen wie vor E0 (Spec v3, D3)', () => {
  it('v1-Link aus e2e/smoke.spec.ts', () => {
    const f = fingerabdruck(V1);
    expect(f.objekte).toEqual(['abock', 'dreibein']);
    expect(f.stangen).toEqual([...ABOCK_STANGEN, ...DREIBEIN_STANGEN]);
    expect(f.buende).toEqual([
      'bund-0:abock-bein-0+abock-bein-1',
      'bund-1:abock-bein-0+abock-riegel',
      'bund-2:abock-bein-1+abock-riegel',
      'bund-3:dreibein-bein-0+dreibein-bein-1+dreibein-bein-2',
    ]);
    expect(f.haringe).toEqual([]);
    imRahmen(f.platz, [0, 3.2, -0.8, 0.8]);
  });

  it('v2-Link aus e2e/abspannung.spec.ts', () => {
    const f = fingerabdruck(V2);
    expect(f.objekte).toEqual(['abock', 'l', 'r']);
    expect(f.stangen).toEqual(ABOCK_STANGEN);
    expect(f.buende).toEqual(['bund-0:abock-bein-0+abock-bein-1', 'bund-1:abock-bein-0+abock-riegel', 'bund-2:abock-bein-1+abock-riegel']);
    expect(f.haringe).toEqual(['haring-0:l@-1.500,0.000,0.000', 'haring-1:r@1.500,0.000,0.000']);
    imRahmen(f.platz, [-1.5, 1.5, -0.8, 0.8]);
  });

  it('v3-Link aus e2e/planen.spec.ts', () => {
    const f = fingerabdruck(V3_DACH);
    expect(f.objekte).toEqual(['abock', 'dreibein', 'first', 'dach']);
    expect(f.stangen).toEqual([...ABOCK_STANGEN, ...DREIBEIN_STANGEN, 'first']);
    expect(f.buende).toEqual([
      'bund-0:abock-bein-0+abock-bein-1+first',
      'bund-1:abock-bein-0+abock-riegel',
      'bund-2:abock-bein-1+abock-riegel',
      'bund-3:dreibein-bein-0+dreibein-bein-1+dreibein-bein-2+first',
    ]);
    expect(f.haringe).toEqual([]);
    imRahmen(f.platz, [-0.75, 3.261, -1.299, 1.299]);
  });

  it('übersetzt die Listen in der alten Reihenfolge: Gruppen, Stangen, Bäume, Planen, Seile', () => {
    const daten = {
      version: 3,
      gruppen: [DREIBEIN],
      stangen: [{ id: 's', start: [8, 0, 0], ende: [8, 2, 0], durchmesser: 0.08 }],
      seile: [{ id: 'l', start: [8, 2, 0], ende: [9, 0, 0] }],
      baeume: [{ id: 'b', position: [20, 0, 0], durchmesser: 0.3, hoehe: 8 }],
      planen: [{ id: 'p', start: [0, 2, 5], ende: [4, 2, 5], breite: 3, laenge: 4, form: 'eben', neigung: 30, seite: 1 }],
    };
    const b = serializer.ausJson(daten);
    expect(b.objekte.map((o) => `${o.art}:${o.id}`)).toEqual(['dreibein:dreibein', 'stange:s', 'baum:b', 'plane:p', 'seil:l']);
    const v5 = serializer.zuJson(b);
    expect(v5.version).toBe(5);
    expect(v5.objekte.map((o) => o.id)).toEqual(['dreibein', 's', 'b', 'p', 'l']);
  });

  it('übergeht in v1 Seile, Bäume und Planen und in v2 Planen, auch wenn die Listen dastehen', () => {
    const plane = { id: 'p', start: [0, 2, 5], ende: [4, 2, 5], breite: 3, laenge: 4, form: 'eben', neigung: 30, seite: 1 };
    const seilDaten = { id: 'l', start: [0, 2, 0], ende: [2, 0, 0] };
    expect(serializer.ausJson({ version: 1, gruppen: [], stangen: [], seile: [seilDaten], planen: [plane] }).istLeer).toBe(true);
    const v2 = serializer.ausJson({ version: 2, gruppen: [], stangen: [], seile: [seilDaten], baeume: [], planen: [plane] });
    expect(v2.objekte.map((o) => o.id)).toEqual(['l']);
  });
});
