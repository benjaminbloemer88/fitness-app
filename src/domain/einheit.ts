/**
 * Datenmodell einer erfassten Trainingseinheit (so wird sie lokal gespeichert).
 */
import type { LaufArt, TagTyp } from './planSchema';

/** Ein Satz, wie er im Gym erfasst wird. */
export interface SatzErgebnis {
  kg: number | null;
  wdh: number | null;
  erledigt: boolean;
}

/** Zielwerte aus dem Plan (zur Anzeige und für das Log-Format). */
export interface UebungsZiel {
  saetze: number;
  wdh: string; // „8“, „10 je Bein“, „30 s“
  gewichtKg: number | null;
  hinweis: string | null;
}

export interface UebungErgebnis {
  name: string;
  /** Name der Übung im Plan – unterscheidet sich vom `name`, wenn getauscht wurde. null = ergänzt. */
  planName: string | null;
  ziel: UebungsZiel | null;
  koerpergewicht: boolean;
  saetze: SatzErgebnis[];
}

export interface LaufErgebnis {
  art: LaufArt;
  distanzKm: number | null;
  dauerSek: number | null;
}

export type EinheitStatus = 'laeuft' | 'abgeschlossen' | 'ausgelassen';
export type SyncStatus = 'wartet' | 'synchronisiert' | 'fehler';

/** Eine Zeile der Log-Tabelle, genau so, wie sie ins Doc geschrieben wird. */
export interface LogZeile {
  datum: string;
  einheit: string;
  wasGemacht: string;
  gefuehl: string;
  anmerkungen: string;
}

export interface Einheit {
  /** Kurze ID, steht als „[app:xxxx]“ in den Anmerkungen. */
  id: string;
  /** Tag, an dem trainiert wurde (ISO). */
  datum: string;
  /** Plantag, zu dem die Einheit gehört (ISO) – null bei Extra-Einheiten. */
  planDatum: string | null;
  titel: string;
  typ: Exclude<TagTyp, 'ruhe'>;
  status: EinheitStatus;
  uebungen: UebungErgebnis[];
  lauf: LaufErgebnis | null;
  gefuehl: number | null;
  anmerkungen: string;
  /** Grund, falls ausgelassen. */
  grund: string | null;
  gestartetAm: string;
  abgeschlossenAm: string | null;
  /** null, solange die Einheit noch läuft (nichts zu synchronisieren). */
  sync: SyncStatus | null;
  syncFehler: string | null;
  /** Die Zeile, die zuletzt ins Doc geschrieben wurde. */
  logZeile: LogZeile | null;
  /** Zeitpunkt des letzten erfolgreichen Syncs (für die Nachkontrolle). */
  synchronisiertAm?: string;
}

/** Kennung, mit der App-Zeilen im Doc erkannt werden. */
export function appKennung(id: string): string {
  return `[app:${id}]`;
}

/** Findet eine App-Kennung in einem Text (z. B. in den Anmerkungen). */
export function findeAppId(text: string): string | null {
  return text.match(/\[app:([a-z0-9]{3,12})\]/i)?.[1]?.toLowerCase() ?? null;
}

const ID_ZEICHEN = 'abcdefghijkmnpqrstuvwxyz23456789'; // ohne l, o, 0, 1 (leicht zu verwechseln)

/** Erzeugt eine neue, noch nicht vergebene 4-stellige ID. */
export function neueAppId(vergeben: Set<string>, zufall: () => number = Math.random): string {
  for (let versuch = 0; versuch < 1000; versuch++) {
    const laenge = versuch < 500 ? 4 : 6;
    let id = '';
    for (let i = 0; i < laenge; i++) id += ID_ZEICHEN[Math.floor(zufall() * ID_ZEICHEN.length)];
    if (!vergeben.has(id)) return id;
  }
  throw new Error('Keine freie ID gefunden');
}

/** Normalisierter Übungsname zum Vergleichen („Bankdrücken KH“ ≈ „bankdrücken kh“). */
export function uebungsSchluessel(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').replace(/[–-]/g, '-').trim();
}

/** „10 je Bein“ → { zahl: 10, zusatz: 'je Bein' }, „30 s“ → { 30, 's' }, „8–10“ → { 8, '' } */
export function zerlegeWdh(wdh: string): { zahl: number | null; zusatz: string } {
  const m = wdh.trim().match(/^(\d+)(?:\s*[–-]\s*\d+)?\s*(.*)$/);
  if (!m) return { zahl: null, zusatz: wdh.trim() };
  let zusatz = (m[2] ?? '').trim();
  if (/^(s|sek\.?|sekunden)$/i.test(zusatz)) zusatz = 's';
  return { zahl: Number(m[1]), zusatz };
}
