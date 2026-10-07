/** Ein Punkt am Bildschirm in Pixeln. */
export interface Pixel {
  readonly x: number;
  readonly y: number;
}

/** Der Index des nächsten Griffs im Radius (Pixel); null, wenn keiner nah genug ist. */
export function naherGriff(maus: Pixel, ecken: readonly Pixel[], radius: number): number | null {
  let bester: number | null = null;
  let besterAbstand = radius;
  ecken.forEach((p, i) => {
    const d = Math.hypot(p.x - maus.x, p.y - maus.y);
    if (d <= besterAbstand) {
      bester = i;
      besterAbstand = d;
    }
  });
  return bester;
}

function abstandZurStrecke(p: Pixel, a: Pixel, b: Pixel): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const quadrat = dx * dx + dy * dy;
  const t = quadrat === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / quadrat));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Der Index der nächsten Kante im Radius (Pixel), das ist die Start-Ecke der Kante; die Schlusskante gibt es nur bei `geschlossen`. */
export function naheKante(maus: Pixel, ecken: readonly Pixel[], geschlossen: boolean, radius: number): number | null {
  const anzahl = geschlossen ? ecken.length : ecken.length - 1;
  let bester: number | null = null;
  let besterAbstand = radius;
  for (let i = 0; i < anzahl; i++) {
    const a = ecken[i];
    const b = ecken[(i + 1) % ecken.length];
    if (!a || !b) continue;
    const d = abstandZurStrecke(maus, a, b);
    if (d <= besterAbstand) {
      bester = i;
      besterAbstand = d;
    }
  }
  return bester;
}
