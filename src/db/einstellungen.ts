/**
 * App-Einstellungen: liegen als ein Eintrag in der Tabelle „einstellungen“.
 * Fehlende Werte werden mit den Standardwerten aufgefüllt.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FitnessDB } from './db';

export interface Einstellungen {
  /** Standard-Pause zwischen Sätzen in Sekunden. */
  pauseSek: number;
  /** Schrittweite der +/–-Knöpfe beim Gewicht. */
  gewichtSchritt: number;
  /** Bildschirm während des Trainings anlassen. */
  bildschirmAn: boolean;
  vibration: boolean;
  ton: boolean;
  /** Für späteres Volumen von Körpergewichtsübungen. */
  koerpergewichtKg: number;
  design: 'dunkel' | 'hell' | 'system';
  /** Web-App-URL der Apps-Script-Brücke (leer = Sync nicht eingerichtet). */
  bridgeUrl: string;
  /** Geheimer Schlüssel für die Brücke – bleibt nur auf diesem Gerät. */
  bridgeSchluessel: string;
}

export const STANDARD_EINSTELLUNGEN: Einstellungen = {
  pauseSek: 120,
  gewichtSchritt: 2.5,
  bildschirmAn: true,
  vibration: true,
  ton: true,
  koerpergewichtKg: 85,
  design: 'dunkel',
  bridgeUrl: '',
  bridgeSchluessel: '',
};

const SCHLUESSEL = 'app';

export async function ladeEinstellungen(datenbank: FitnessDB = db): Promise<Einstellungen> {
  const eintrag = await datenbank.einstellungen.get(SCHLUESSEL);
  return { ...STANDARD_EINSTELLUNGEN, ...((eintrag?.wert as Partial<Einstellungen>) ?? {}) };
}

export async function speichereEinstellungen(teil: Partial<Einstellungen>, datenbank: FitnessDB = db): Promise<void> {
  const aktuell = await ladeEinstellungen(datenbank);
  await datenbank.einstellungen.put({ schluessel: SCHLUESSEL, wert: { ...aktuell, ...teil } });
}

/** React-Hook: Einstellungen, die sich automatisch aktualisieren. */
export function useEinstellungen(): Einstellungen {
  return useLiveQuery(() => ladeEinstellungen(), [], STANDARD_EINSTELLUNGEN);
}

export function syncEingerichtet(e: Einstellungen): boolean {
  return e.bridgeUrl.trim() !== '' && e.bridgeSchluessel.trim() !== '';
}
