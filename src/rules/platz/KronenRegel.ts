import { Baum } from '../../model/Baum';
import { Grundriss } from '../../model/Grundriss';
import { type Hinweis, hinweis } from '../Rule';
import { namenText, richtwertText } from './formate';
import type { PlatzKontext } from './PlatzKontext';
import type { PlatzRegel } from './PlatzRegel';
import type { PlatzRegelName } from './PlatzregelEinstellungen';

/** P6 (Spec E6, D1): Zelt unter der Krone eines Baums. Der Kronenradius ist Faktor × Baumhöhe (geschätzt, das Modell kennt keine Krone). */
export class KronenRegel implements PlatzRegel {
  readonly name: PlatzRegelName = 'P6';

  constructor(private readonly faktor: number) {}

  pruefe(k: PlatzKontext): readonly Hinweis[] {
    const baeume = k.mit('baum');
    return k.mit('zelt').flatMap((zelt) =>
      baeume.flatMap((eintrag) => {
        const baum = eintrag.objekt;
        if (!(baum instanceof Baum)) return [];
        const krone = Grundriss.kreis({ x: baum.position.x, z: baum.position.z }, this.faktor * baum.params.hoehe);
        if (!krone.ueberlappt(zelt.grundriss)) return [];
        return [
          hinweis(
            this.name,
            `Faustregel (Empfehlung VDE, Blitz und Astbruch; Kronengröße geschätzt): ${namenText(zelt.name)} steht unter der Krone eines Baums (Höhe ${richtwertText(baum.params.hoehe)} m).`,
            [zelt.objekt.id, baum.id],
            'warnung',
          ),
        ];
      }),
    );
  }
}
