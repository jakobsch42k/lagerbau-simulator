import { liste, objekt, type Roh } from './lesen';

/** Ein Eintrag einer alten Liste, mit der Art, die sich aus der Liste ergibt (bei Gruppen aus `typ`). */
const mitArt =
  (name: string, art: (roh: Roh) => unknown) =>
  (d: unknown): Roh => {
    const roh = objekt(d, name);
    return { ...roh, art: art(roh) };
  };

/**
 * Übersetzt die fünf Listen der Formate 1–3 in Objekte im Format 4, in der alten Lesereihenfolge
 * Gruppen, Stangen, Bäume, Planen, Seile (Spec v3, D3). So bleiben Reihenfolge, Bünde und Haringe wie vorher.
 * Version 1 kannte noch keine Seile und Bäume, Version 2 noch keine Planen.
 */
export function alteObjekte(o: Roh): Roh[] {
  const gruppen = liste(o.gruppen, 'gruppen');
  const stangen = liste(o.stangen, 'stangen');
  const seile = o.version === 1 ? [] : liste(o.seile, 'seile');
  const baeume = o.version === 1 ? [] : liste(o.baeume, 'baeume');
  const planen = o.version === 3 ? liste(o.planen, 'planen') : [];
  return [
    ...gruppen.map(mitArt('Baugruppe', (roh) => roh.typ)),
    ...stangen.map(mitArt('Stange', () => 'stange')),
    ...baeume.map(mitArt('Baum', () => 'baum')),
    ...planen.map(mitArt('Plane', () => 'plane')),
    ...seile.map(mitArt('Seil', () => 'seil')),
  ];
}
