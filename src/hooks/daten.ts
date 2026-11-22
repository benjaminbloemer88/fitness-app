/**
 * React-Hooks, die Daten live aus der lokalen Datenbank lesen.
 * useLiveQuery sorgt dafür, dass sich die Oberfläche automatisch aktualisiert,
 * sobald sich etwas in der Datenbank ändert.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { planFuerDatum } from '../db/einheiten';
import { heuteISO } from '../domain/dates';

/** Heutiges Datum; aktualisiert sich, wenn die App über Mitternacht offen bleibt. */
export function useHeute(): string {
  const [heute, setHeute] = useState(heuteISO());
  useEffect(() => {
    const pruefen = () => setHeute(heuteISO());
    const id = window.setInterval(pruefen, 60_000);
    document.addEventListener('visibilitychange', pruefen);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', pruefen);
    };
  }, []);
  return heute;
}

/** Plan der Woche, in der das Datum liegt (undefined = lädt noch, null = keiner). */
export function usePlanFuerDatum(iso: string) {
  return useLiveQuery(async () => (await planFuerDatum(iso)) ?? null, [iso]);
}

/** Alle gespeicherten Pläne, neueste zuerst. */
export function useAllePlaene() {
  return useLiveQuery(() => db.plaene.orderBy('wocheVon').reverse().toArray(), [], []);
}

/** Alle Einheiten, neueste zuerst. */
export function useEinheiten() {
  return useLiveQuery(() => db.einheiten.orderBy('datum').reverse().toArray(), [], []);
}

export function useEinheit(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.einheiten.get(id)) ?? null) : null), [id]);
}

/** Zustand der Sync-Warteschlange für die Anzeige. */
export function useSyncZustand() {
  return useLiveQuery(
    async () => {
      const auftraege = await db.syncQueue.toArray();
      const fehler = auftraege.find((a) => a.letzterFehler)?.letzterFehler ?? null;
      return { offen: auftraege.length, fehler };
    },
    [],
    { offen: 0, fehler: null as string | null },
  );
}

/** Online/Offline-Status des Geräts. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const an = () => setOnline(true);
    const aus = () => setOnline(false);
    window.addEventListener('online', an);
    window.addEventListener('offline', aus);
    return () => {
      window.removeEventListener('online', an);
      window.removeEventListener('offline', aus);
    };
  }, []);
  return online;
}
