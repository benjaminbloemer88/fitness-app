/**
 * Sync-Dienst für die Oberfläche: hält den Zustand (läuft / letzter Abgleich / Fehler)
 * und stößt den Abgleich automatisch an – beim Start, wenn das Netz zurückkommt,
 * wenn die App wieder in den Vordergrund kommt und sobald etwas in der Warteschlange liegt.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useSyncExternalStore } from 'react';
import { db } from '../db/db';
import { ladeEinstellungen, syncEingerichtet, useEinstellungen } from '../db/einstellungen';
import type { Plan } from '../domain/planSchema';
import { useOnline } from '../hooks/daten';
import { planDatenSchreiben, planUndLogLaden, type AbgleichErgebnis } from './abgleich';
import { BridgeClient } from './bridgeClient';
import { syncAusfuehren, type SyncBericht } from './syncQueue';

export interface SyncZustand {
  laeuft: boolean;
  letzterAbgleich: string | null;
  fehler: string | null;
}

let zustand: SyncZustand = { laeuft: false, letzterAbgleich: null, fehler: null };
const hoerer = new Set<() => void>();
function setze(teil: Partial<SyncZustand>) {
  zustand = { ...zustand, ...teil };
  hoerer.forEach((h) => h());
}

/** React-Hook: aktueller Sync-Zustand. */
export function useSyncDienst(): SyncZustand {
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => zustand,
  );
}

async function bridge(): Promise<BridgeClient> {
  const e = await ladeEinstellungen();
  if (!syncEingerichtet(e)) throw new Error('Der Doc-Sync ist noch nicht eingerichtet.');
  return new BridgeClient(e.bridgeUrl, e.bridgeSchluessel);
}

/** Führt eine Sync-Aktion aus und pflegt dabei den Zustand. */
async function mitZustand<T>(aktion: () => Promise<T>): Promise<T> {
  setze({ laeuft: true });
  try {
    const ergebnis = await aktion();
    setze({ laeuft: false, fehler: null, letzterAbgleich: new Date().toISOString() });
    return ergebnis;
  } catch (e) {
    setze({ laeuft: false, fehler: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

/** Verbindung testen – liefert den Titel des Docs. */
export async function verbindungTesten(url: string, schluessel: string): Promise<string> {
  return new BridgeClient(url.trim(), schluessel.trim()).ping();
}

/** Nur die Warteschlange abarbeiten (Einträge ins Doc schreiben). */
export async function synchronisieren(): Promise<SyncBericht> {
  return mitZustand(async () => {
    const bericht = await syncAusfuehren(db, await bridge());
    if (bericht.fehler) throw new Error(bericht.fehler);
    return bericht;
  });
}

/** Plan und Log neu laden, danach offene Einträge schreiben. */
export async function allesAbgleichen(): Promise<AbgleichErgebnis> {
  return mitZustand(async () => {
    const b = await bridge();
    const ergebnis = await planUndLogLaden(db, b);
    const bericht = await syncAusfuehren(db, b);
    if (bericht.fehler) throw new Error(bericht.fehler);
    return ergebnis;
  });
}

/** Plan-Daten (JSON) einmalig aus dem Plan erzeugen und ins Doc schreiben. */
export async function planDatenInsDoc(plan: Plan): Promise<AbgleichErgebnis> {
  return mitZustand(async () => planDatenSchreiben(db, await bridge(), plan));
}

let letzterPlanAbgleich = 0;
const PLAN_ABSTAND_MS = 5 * 60_000;
const WIEDERHOLEN_MS = 2 * 60_000;

/**
 * Automatischer Sync – einmal in App.tsx einbinden.
 * Fehler werden nur im Zustand vermerkt (Anzeige), nie als Popup.
 */
export function useAutoSync(): void {
  const e = useEinstellungen();
  const online = useOnline();
  const offen = useLiveQuery(() => db.syncQueue.count(), [], 0);
  const bereit = syncEingerichtet(e) && online;

  // Start, Netz zurück, Zugangsdaten geändert → Plan laden + Warteschlange abarbeiten
  useEffect(() => {
    if (!bereit) return;
    letzterPlanAbgleich = Date.now();
    void allesAbgleichen().catch(() => undefined);
  }, [bereit, e.bridgeUrl, e.bridgeSchluessel]);

  // App kommt wieder in den Vordergrund → höchstens alle 5 Minuten neu laden
  useEffect(() => {
    if (!bereit) return;
    const sichtbar = () => {
      if (document.visibilityState !== 'visible' || Date.now() - letzterPlanAbgleich < PLAN_ABSTAND_MS) return;
      letzterPlanAbgleich = Date.now();
      void allesAbgleichen().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', sichtbar);
    return () => document.removeEventListener('visibilitychange', sichtbar);
  }, [bereit]);

  // Neue Einträge in der Warteschlange → sofort senden; bei Fehlern alle 2 Minuten erneut
  useEffect(() => {
    if (!bereit || offen === 0) return;
    void synchronisieren().catch(() => undefined);
    const id = window.setInterval(() => void synchronisieren().catch(() => undefined), WIEDERHOLEN_MS);
    return () => window.clearInterval(id);
  }, [bereit, offen]);
}
