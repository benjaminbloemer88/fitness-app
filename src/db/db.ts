/**
 * Lokale Datenbank (IndexedDB über Dexie).
 *
 * Alles wird zuerst hier gespeichert – die App funktioniert dadurch komplett
 * offline. Der Sync ins Google-Doc läuft später über die Warteschlange.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { Einheit } from '../domain/einheit';
import type { PlanQuelle } from '../domain/planLaden';
import type { Plan } from '../domain/planSchema';

export interface GespeicherterPlan {
  /** Montag der Woche (ISO) – Primärschlüssel. */
  wocheVon: string;
  plan: Plan;
  quelle: PlanQuelle;
  geladenAm: string;
  /** Hinweise beim Laden (z. B. „Plan aus Tabelle gelesen“). */
  hinweise: string[];
  /** Status des JSON-Blocks im Doc beim letzten Laden. */
  jsonStatus: 'ok' | 'fehlt' | 'ungueltig' | null;
}

export interface SyncAuftrag {
  id?: number;
  einheitId: string;
  aktion: 'anhaengen' | 'korrigieren';
  erstelltAm: string;
  versuche: number;
  letzterFehler: string | null;
}

export interface Einstellung {
  schluessel: string;
  wert: unknown;
}

/** Aus dem Doc importierte Log-Zeile (für den Verlauf). */
export interface ImportZeile {
  id?: number;
  datum: string | null;
  zellen: string[];
  appId: string | null;
  importiertAm: string;
}

/** Lokale Verschiebung eines Trainingstags (der Plan im Doc bleibt unverändert). */
export interface VerschiebungEintrag {
  planDatum: string;
  zielDatum: string;
  erstelltAm: string;
}

// ── Vorbereitet für später (noch ohne Oberfläche) ──
export interface KoerpergewichtEintrag {
  datum: string;
  kg: number;
}
export interface ProteinEintrag {
  id?: number;
  datum: string;
  gramm: number;
  notiz: string;
}

export class FitnessDB extends Dexie {
  plaene!: EntityTable<GespeicherterPlan, 'wocheVon'>;
  einheiten!: EntityTable<Einheit, 'id'>;
  syncQueue!: EntityTable<SyncAuftrag, 'id'>;
  einstellungen!: EntityTable<Einstellung, 'schluessel'>;
  logImport!: EntityTable<ImportZeile, 'id'>;
  koerpergewicht!: EntityTable<KoerpergewichtEintrag, 'datum'>;
  protein!: EntityTable<ProteinEintrag, 'id'>;
  verschiebungen!: EntityTable<VerschiebungEintrag, 'planDatum'>;

  constructor(name = 'fitness') {
    super(name);
    // Nur die Felder hinter dem Tabellennamen sind indiziert (für Abfragen), gespeichert wird das ganze Objekt.
    this.version(1).stores({
      plaene: 'wocheVon',
      einheiten: 'id, datum, planDatum, status, sync',
      syncQueue: '++id, einheitId',
      einstellungen: 'schluessel',
      logImport: '++id, datum, appId',
      koerpergewicht: 'datum',
      protein: '++id, datum',
    });
    // Version 2: Trainingstage verschieben. Dexie übernimmt alle bestehenden Daten automatisch.
    this.version(2).stores({
      verschiebungen: 'planDatum, zielDatum',
    });
  }
}

export const db = new FitnessDB();
