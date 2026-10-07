import type { ArtName, LagerObjekt } from '../model/LagerObjekt';
import type { ObjektArt } from './ObjektArt';

/** Alle Objektarten des Planers, je Name genau eine (Spec v3, D2). Gebaut von `standardArten()`, wie `standardRegeln()`. */
export class ObjektRegister {
  private readonly nachName: ReadonlyMap<string, ObjektArt>;

  constructor(readonly alle: readonly ObjektArt[]) {
    const nachName = new Map<string, ObjektArt>();
    for (const art of alle) {
      if (nachName.has(art.name)) throw new Error(`Art ${art.name} ist doppelt registriert`);
      nachName.set(art.name, art);
    }
    this.nachName = nachName;
  }

  /** Die Art zu einem Namen aus Daten; undefined, wenn es sie nicht gibt. */
  finde(name: string): ObjektArt | undefined {
    return this.nachName.get(name);
  }

  art(name: ArtName): ObjektArt {
    const art = this.finde(name);
    if (!art) throw new Error(`Art ${name} ist nicht registriert`);
    return art;
  }

  /** Die Art eines Objekts. Wirft, wenn das Objekt nicht zu der Art passt, die es nennt. */
  artVon(o: LagerObjekt): ObjektArt {
    const { id, art: name } = o;
    const art = this.art(name);
    if (!art.istVon(o)) throw new Error(`${id} passt nicht zur Art ${name}`);
    return art;
  }

  /** Arten, die Klicks nur in Werkzeugen fangen, die sie nennen (Spec v2b, D2). */
  wahlweise(): readonly ArtName[] {
    return this.alle.filter((a) => a.klick === 'wahlweise').map((a) => a.name);
  }

  /** Ob ein Objekt zum Platzbedarf zählt (Spec E3, D3); Arten ohne Angabe zählen. Als Funktion für `Platzbedarf.aus`, das die Arten nicht kennt. */
  readonly zaehltZumPlatzbedarf = (o: LagerObjekt): boolean => this.art(o.art).zaehltZumPlatzbedarf ?? true;

  /** Arten mit Ösen, an denen ein Seil einrastet. */
  mitOesen(): readonly ArtName[] {
    return this.alle.filter((a) => a.hatOesen).map((a) => a.name);
  }
}
