export type P2 = readonly [number, number];

const kreuz = (o: P2, a: P2, b: P2): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Konvexe Hülle (Andrew's Monotone Chain), gegen den Uhrzeigersinn, ohne kollineare Punkte. */
export function konvexeHuelle(punkte: readonly P2[]): P2[] {
  const p = [...punkte].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const halbe = (folge: readonly P2[]): P2[] => {
    const kette: P2[] = [];
    for (const q of folge) {
      while (kette.length >= 2 && kreuz(kette[kette.length - 2] as P2, kette[kette.length - 1] as P2, q) <= 0) kette.pop();
      kette.push(q);
    }
    return kette.slice(0, -1);
  };
  return [...halbe(p), ...halbe([...p].reverse())];
}

/** Kleinste Breite der Punktwolke (Abstand zweier paralleler Stützgeraden). 0, wenn alles auf einer Linie liegt. */
export function minimaleBreite(punkte: readonly P2[]): number {
  const h = konvexeHuelle(punkte);
  if (h.length < 3) return 0;
  return Math.min(
    ...h.map((a, i) => {
      const b = h[(i + 1) % h.length] as P2;
      const lx = b[0] - a[0];
      const lz = b[1] - a[1];
      const laenge = Math.hypot(lx, lz);
      return Math.max(...h.map((q) => Math.abs((q[0] - a[0]) * lz - (q[1] - a[1]) * lx) / laenge));
    }),
  );
}
