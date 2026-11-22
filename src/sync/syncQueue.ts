/**
 * Sync-Warteschlange: abgeschlossene Einheiten → Log-Tabelle im Doc.
 *
 * Ablauf:
 * 1. Beim Speichern wird die Einheit lokal gesichert und ein Auftrag eingereiht.
 * 2. Sobald die App online ist (oder „Sync“ getippt wird), gehen alle offenen
 *    Aufträge in einem Rutsch an die Brücke.
 * 3. Die Brücke hängt nur Zeilen an, deren Kennung [app:xxxx] noch nicht im Doc
 *    steht. Dadurch entstehen keine Doppelten – auch wenn ein Sync abbricht und
 *    wiederholt wird.
 */
import type { Einheit } from '../domain/einheit';
import { erzeugeLogZeile, logZeileAlsZellen } from '../domain/logFormat';
import type { FitnessDB, SyncAuftrag } from '../db/db';

/** Was die Brücke zum Doc können muss (echte Umsetzung: bridgeClient.ts, in Tests: Attrappe). */
export interface LogBridge {
  anhaengen(zeilen: { id: string; zellen: string[] }[]): Promise<{ angehaengt: string[]; schonVorhanden: string[] }>;
  korrigieren(id: string, zellen: string[]): Promise<{ korrigiert: boolean }>;
}

export interface SyncBericht {
  gesendet: number;
  erfolgreich: number;
  fehler: string | null;
}

const jetzt = () => new Date().toISOString();

/** Reiht eine abgeschlossene/ausgelassene Einheit zum Anhängen ein (höchstens einmal). */
export async function einreihen(db: FitnessDB, einheitId: string, aktion: SyncAuftrag['aktion'] = 'anhaengen'): Promise<void> {
  await db.transaction('rw', db.syncQueue, db.einheiten, async () => {
    const vorhanden = await db.syncQueue.where('einheitId').equals(einheitId).first();
    if (!vorhanden) {
      await db.syncQueue.add({ einheitId, aktion, erstelltAm: jetzt(), versuche: 0, letzterFehler: null });
    } else if (vorhanden.aktion !== aktion && aktion === 'anhaengen') {
      await db.syncQueue.update(vorhanden.id!, { aktion });
    }
    await db.einheiten.update(einheitId, { sync: 'wartet', syncFehler: null });
  });
}

/** Anzahl offener Aufträge (für die Sync-Anzeige). */
export async function offeneAuftraege(db: FitnessDB): Promise<number> {
  return db.syncQueue.count();
}

let laeuftGerade = false;

/**
 * Arbeitet die Warteschlange ab. Läuft nie doppelt gleichzeitig.
 * Fehler werden am Auftrag und an der Einheit vermerkt; der Auftrag bleibt für den nächsten Versuch.
 */
export async function syncAusfuehren(db: FitnessDB, bridge: LogBridge): Promise<SyncBericht> {
  if (laeuftGerade) return { gesendet: 0, erfolgreich: 0, fehler: null };
  laeuftGerade = true;
  try {
    const auftraege = await db.syncQueue.orderBy('id').toArray();
    if (auftraege.length === 0) return { gesendet: 0, erfolgreich: 0, fehler: null };

    const einheiten = new Map<string, Einheit>();
    for (const a of auftraege) {
      const e = await db.einheiten.get(a.einheitId);
      if (e) einheiten.set(e.id, e);
      else await db.syncQueue.delete(a.id!); // Einheit wurde inzwischen gelöscht
    }

    const anhaengen = auftraege.filter((a) => a.aktion === 'anhaengen' && einheiten.has(a.einheitId));
    const korrigieren = auftraege.filter((a) => a.aktion === 'korrigieren' && einheiten.has(a.einheitId));
    let erfolgreich = 0;

    try {
      if (anhaengen.length) {
        const zeilen = anhaengen.map((a) => {
          const e = einheiten.get(a.einheitId)!;
          return { id: e.id, zellen: logZeileAlsZellen(erzeugeLogZeile(e)) };
        });
        const antwort = await bridge.anhaengen(zeilen);
        const bestaetigt = new Set([...antwort.angehaengt, ...antwort.schonVorhanden]);
        for (const a of anhaengen) {
          const e = einheiten.get(a.einheitId)!;
          if (bestaetigt.has(e.id)) {
            await markiereSynchronisiert(db, a, e);
            erfolgreich++;
          } else {
            await markiereFehler(db, a, 'Vom Doc nicht bestätigt');
          }
        }
      }
      for (const a of korrigieren) {
        const e = einheiten.get(a.einheitId)!;
        const { korrigiert } = await bridge.korrigieren(e.id, logZeileAlsZellen(erzeugeLogZeile(e)));
        if (korrigiert) {
          await markiereSynchronisiert(db, a, e);
          erfolgreich++;
        } else {
          await markiereFehler(db, a, 'Zeile im Doc nicht gefunden');
        }
      }
      return { gesendet: anhaengen.length + korrigieren.length, erfolgreich, fehler: null };
    } catch (e) {
      const text = e instanceof Error ? e.message : String(e);
      for (const a of [...anhaengen, ...korrigieren]) {
        const aktuell = await db.syncQueue.get(a.id!);
        if (aktuell) await markiereFehler(db, a, text);
      }
      return { gesendet: anhaengen.length + korrigieren.length, erfolgreich, fehler: text };
    }
  } finally {
    laeuftGerade = false;
  }
}

async function markiereSynchronisiert(db: FitnessDB, a: SyncAuftrag, e: Einheit) {
  await db.transaction('rw', db.syncQueue, db.einheiten, async () => {
    await db.syncQueue.delete(a.id!);
    await db.einheiten.update(e.id, { sync: 'synchronisiert', syncFehler: null, logZeile: erzeugeLogZeile(e) });
  });
}

async function markiereFehler(db: FitnessDB, a: SyncAuftrag, text: string) {
  await db.transaction('rw', db.syncQueue, db.einheiten, async () => {
    await db.syncQueue.update(a.id!, { versuche: a.versuche + 1, letzterFehler: text });
    await db.einheiten.update(a.einheitId, { sync: 'fehler', syncFehler: text });
  });
}
