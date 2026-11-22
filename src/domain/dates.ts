/**
 * Datums-Helfer.
 *
 * Intern speichern wir Daten immer als ISO-Datum „JJJJ-MM-TT“ (ohne Uhrzeit).
 * Fürs Rechnen (z. B. „+3 Tage“) nutzen wir UTC, damit Sommer-/Winterzeit
 * keine Tage verschluckt. Für „heute“ nutzen wir die lokale Uhrzeit des Handys.
 */

export const WOCHENTAGE_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const WOCHENTAGE_LANG = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const;
const MONATE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

const zweistellig = (n: number) => String(n).padStart(2, '0');

/** Baut aus Jahr/Monat/Tag ein ISO-Datum. */
export function isoAus(jahr: number, monat: number, tag: number): string {
  return `${jahr}-${zweistellig(monat)}-${zweistellig(tag)}`;
}

/** Lokales Datum eines Date-Objekts als ISO-String. */
export function isoAusDate(d: Date): string {
  return isoAus(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Heutiges Datum (lokale Zeit). `jetzt` ist nur für Tests austauschbar. */
export function heuteISO(jetzt: Date = new Date()): string {
  return isoAusDate(jetzt);
}

/** Zerlegt „JJJJ-MM-TT“ in Zahlen. */
export function zerlegeIso(iso: string): { jahr: number; monat: number; tag: number } {
  const [jahr, monat, tag] = iso.split('-').map(Number);
  return { jahr: jahr ?? 0, monat: monat ?? 0, tag: tag ?? 0 };
}

function alsUtc(iso: string): Date {
  const { jahr, monat, tag } = zerlegeIso(iso);
  return new Date(Date.UTC(jahr, monat - 1, tag));
}

/** Addiert n Tage (n darf negativ sein). */
export function plusTage(iso: string, n: number): string {
  const d = alsUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoAus(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Tage zwischen zwei Daten (b - a). */
export function tageZwischen(a: string, b: string): number {
  return Math.round((alsUtc(b).getTime() - alsUtc(a).getTime()) / 86_400_000);
}

/** Wochentag: 0 = Montag … 6 = Sonntag. */
export function wochentagIndex(iso: string): number {
  return (alsUtc(iso).getUTCDay() + 6) % 7;
}

/** Montag der Woche, in der das Datum liegt. */
export function montagDerWoche(iso: string): string {
  return plusTage(iso, -wochentagIndex(iso));
}

/** „2026-11-23“ → „23.11.2026“ (Format fürs Log). */
export function isoZuDeutsch(iso: string): string {
  const { jahr, monat, tag } = zerlegeIso(iso);
  return `${zweistellig(tag)}.${zweistellig(monat)}.${jahr}`;
}

/** „2026-11-23“ → „23.11.“ */
export function isoZuKurz(iso: string): string {
  const { monat, tag } = zerlegeIso(iso);
  return `${zweistellig(tag)}.${zweistellig(monat)}.`;
}

/** „2026-11-23“ → „Montag, 23. November“ */
export function formatTagLang(iso: string): string {
  const { monat, tag } = zerlegeIso(iso);
  return `${WOCHENTAGE_LANG[wochentagIndex(iso)]}, ${tag}. ${MONATE[monat - 1]}`;
}

/** „2026-11-23“ → „Mo 23.11.“ */
export function formatTagKurz(iso: string): string {
  return `${WOCHENTAGE_KURZ[wochentagIndex(iso)]} ${isoZuKurz(iso)}`;
}

/**
 * Liest ein deutsches Datum tolerant: „23.11.2026“, „23.11.26“, „23.11.“, „23.11“.
 * Fehlt das Jahr, wird `fallbackJahr` genommen. Gibt null zurück, wenn nichts passt.
 */
export function deutschZuIso(text: string, fallbackJahr?: number): string | null {
  const m = text.match(/(\d{1,2})\.\s?(\d{1,2})\.?(?:\s?(\d{2,4}))?/);
  if (!m) return null;
  const tag = Number(m[1]);
  const monat = Number(m[2]);
  let jahr = m[3] ? Number(m[3]) : fallbackJahr;
  if (jahr === undefined) return null;
  if (jahr < 100) jahr += 2000;
  if (monat < 1 || monat > 12 || tag < 1 || tag > 31) return null;
  return isoAus(jahr, monat, tag);
}

/** Prüft, ob ein String ein ISO-Datum ist. */
export function istIsoDatum(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
