/**
 * Rechenfunktionen: Zahlenformat, Zeiten, Pace, geschätztes 1RM, Volumen.
 * Alles reine Funktionen ohne Seiteneffekte → leicht zu testen.
 */

/** Zahl im deutschen Format mit Dezimalkomma, ohne überflüssige Nullen: 57.5 → „57,5“, 60 → „60“. */
export function formatDezimal(n: number, maxStellen = 2): string {
  const gerundet = Number(n.toFixed(maxStellen));
  return String(gerundet).replace('.', ',');
}

/** Liest „57,5“ oder „57.5“ als Zahl. Gibt null zurück, wenn es keine Zahl ist. */
export function parseDezimal(text: string): number | null {
  const s = text.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Sekunden → „31:20“ bzw. ab einer Stunde „1:02:15“. */
export function formatDauer(sekunden: number): string {
  const s = Math.max(0, Math.round(sekunden));
  const std = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sek = s % 60;
  const mm = String(min).padStart(std > 0 ? 2 : 1, '0');
  const ss = String(sek).padStart(2, '0');
  return std > 0 ? `${std}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** „31:20“ → 1880, „1:02:15“ → 3735. Gibt null zurück, wenn das Format nicht passt. */
export function parseZeit(text: string): number | null {
  const teile = text.trim().split(':');
  if (teile.length < 2 || teile.length > 3 || teile.some((t) => !/^\d+$/.test(t))) return null;
  const zahlen = teile.map(Number);
  if (zahlen.length === 2) {
    const [m, s] = zahlen as [number, number];
    return s < 60 ? m * 60 + s : null;
  }
  const [h, m, s] = zahlen as [number, number, number];
  return m < 60 && s < 60 ? h * 3600 + m * 60 + s : null;
}

/** Pace in Sekunden pro km. */
export function paceSekProKm(distanzKm: number, dauerSek: number): number | null {
  if (!(distanzKm > 0) || !(dauerSek > 0)) return null;
  return dauerSek / distanzKm;
}

/** Pace als „6:16“ (auf ganze Sekunden gerundet). */
export function formatPace(sekProKm: number): string {
  const s = Math.round(sekProKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Geschätztes 1-Wiederholungs-Maximum nach Epley: Gewicht × (1 + Wdh / 30).
 * Bei genau 1 Wiederholung ist das 1RM das Gewicht selbst.
 */
export function epley1RM(kg: number, wdh: number): number {
  if (!(kg > 0) || !(wdh > 0)) return 0;
  if (wdh === 1) return kg;
  return kg * (1 + wdh / 30);
}

/** Volumen = Summe über alle Sätze von Gewicht × Wiederholungen. */
export function volumen(saetze: { kg: number | null; wdh: number | null }[]): number {
  return saetze.reduce((summe, s) => summe + (s.kg ?? 0) * (s.wdh ?? 0), 0);
}
