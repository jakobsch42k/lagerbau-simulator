import { Vec3 } from './Vec3';

/** Toleranz für „liegt auf“ und „gleich“ in Metern. */
const EPS = 1e-9;

/** Fläche eines Vielecks am Boden (x/z) nach der Shoelace-Formel, in m². Unabhängig von der Umlaufrichtung; unter 3 Punkten 0. */
export function flaeche(punkte: readonly Vec3[]): number {
  if (punkte.length < 3) return 0;
  const summe = punkte.reduce((s, a, i) => {
    const b = punkte[(i + 1) % punkte.length] as Vec3;
    return s + (a.x * b.z - b.x * a.z);
  }, 0);
  return Math.abs(summe) / 2;
}

/** Länge eines offenen Linienzugs in m. */
export function pfadLaenge(punkte: readonly Vec3[]): number {
  return punkte.reduce((s, p, i) => (i === 0 ? 0 : s + p.distanceTo(punkte[i - 1] as Vec3)), 0);
}

/** Mitte des umschließenden Rechtecks, am Boden. Bei keinen Punkten der Ursprung. */
export function bboxMitte(punkte: readonly Vec3[]): Vec3 {
  if (punkte.length === 0) return Vec3.NULL;
  const xs = punkte.map((p) => p.x);
  const zs = punkte.map((p) => p.z);
  return new Vec3((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
}

/** Kreuzprodukt (b - a) x (c - a) in der x/z-Ebene. */
function drehsinn(a: Vec3, b: Vec3, c: Vec3): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

/** c liegt (bei drehsinn ≈ 0) im Rechteck von a und b, also auf der Strecke. */
function imBereich(a: Vec3, b: Vec3, c: Vec3): boolean {
  return (
    Math.min(a.x, b.x) - EPS <= c.x && c.x <= Math.max(a.x, b.x) + EPS && Math.min(a.z, b.z) - EPS <= c.z && c.z <= Math.max(a.z, b.z) + EPS
  );
}

/** Zwei Strecken haben mindestens einen Punkt gemeinsam (Berühren und Überlappen zählen). */
function streckenTreffen(a: Vec3, b: Vec3, c: Vec3, d: Vec3): boolean {
  const o1 = drehsinn(a, b, c);
  const o2 = drehsinn(a, b, d);
  const o3 = drehsinn(c, d, a);
  const o4 = drehsinn(c, d, b);
  const getrennt = (x: number, y: number): boolean => (x > EPS && y < -EPS) || (x < -EPS && y > EPS);
  if (getrennt(o1, o2) && getrennt(o3, o4)) return true;
  return (
    (Math.abs(o1) <= EPS && imBereich(a, b, c)) ||
    (Math.abs(o2) <= EPS && imBereich(a, b, d)) ||
    (Math.abs(o3) <= EPS && imBereich(c, d, a)) ||
    (Math.abs(o4) <= EPS && imBereich(c, d, b))
  );
}

/** Zwei Kanten mit gemeinsamer Ecke `b` (a-b und b-c) überlappen, wenn sie auf derselben Geraden liegen und c zurück Richtung a läuft. */
function laeuftZurueck(a: Vec3, b: Vec3, c: Vec3): boolean {
  const u = b.sub(a);
  const v = c.sub(b);
  const kreuz = u.x * v.z - u.z * v.x;
  return Math.abs(kreuz) <= EPS * Math.max(1, u.length() * v.length()) && u.x * v.x + u.z * v.z < 0;
}

/**
 * Ob sich ein geschlossenes Vieleck (letzte Ecke zurück zur ersten) selbst schneidet. Berühren zählt als Schnitt: eine Ecke auf einer
 * fremden Kante, zwei Ecken auf demselben Punkt, überlappende Kanten, eine Spitze, die auf der Kante zurückläuft, und eine doppelte Ecke
 * hintereinander. Eine Ecke, an der drei Punkte auf einer Geraden weiterlaufen, ist erlaubt.
 */
export function schneidetSichSelbst(punkte: readonly Vec3[]): boolean {
  const n = punkte.length;
  const ecke = (i: number): Vec3 => punkte[i % n] as Vec3;
  for (let i = 0; i < n; i++) {
    if (ecke(i).distanceTo(ecke(i + 1)) <= EPS) return true;
    if (laeuftZurueck(ecke(i), ecke(i + 1), ecke(i + 2))) return true;
    // Nicht benachbarte Kanten: j beginnt hinter der Nachbarkante; die letzte Kante grenzt an die erste.
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (streckenTreffen(ecke(i), ecke(i + 1), ecke(j), ecke(j + 1))) return true;
    }
  }
  return false;
}
