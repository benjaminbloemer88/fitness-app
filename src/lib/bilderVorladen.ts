/**
 * Lädt die Übungsfotos aller Pläne vorab in den Cache – damit sie im Gym auch ohne Netz da sind.
 * Der Service Worker liefert sie dann aus demselben Cache („uebungsbilder“).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { db } from '../db/db';
import { bildUrls, findeUebungsInfo } from '../domain/uebungsKatalog';
import { useOnline } from '../hooks/daten';

export const BILDER_CACHE = 'uebungsbilder';

/** Holt alle noch fehlenden Fotos zu den Übungsnamen. */
export async function bilderVorladen(uebungen: string[]): Promise<number> {
  if (!('caches' in window)) return 0;
  const urls = [...new Set(uebungen.flatMap((n) => (findeUebungsInfo(n) ? bildUrls(findeUebungsInfo(n)!) : [])))];
  const cache = await caches.open(BILDER_CACHE);
  let neu = 0;
  for (const url of urls) {
    // ignoreVary: GitHub antwortet mit „Vary: Origin“ – sonst würde der Cache-Treffer nicht erkannt.
    if (await cache.match(url, { ignoreVary: true })) continue;
    try {
      const antwort = await fetch(url, { mode: 'cors' });
      if (antwort.ok) {
        await cache.put(url, antwort);
        neu++;
      }
    } catch {
      // offline oder blockiert – beim nächsten Mal erneut versuchen
    }
  }
  return neu;
}

/** Hook für App.tsx: lädt die Fotos, sobald Pläne da sind und das Gerät online ist. */
export function useBilderVorladen(): void {
  const online = useOnline();
  const namen = useLiveQuery(async () => {
    const plaene = await db.plaene.toArray();
    return [...new Set(plaene.flatMap((p) => p.plan.tage.flatMap((t) => t.uebungen.map((u) => u.name))))].sort().join('|');
  }, []);

  useEffect(() => {
    if (!online || !namen) return;
    // etwas warten, damit der Start der App nicht gebremst wird
    const t = window.setTimeout(() => void bilderVorladen(namen.split('|')), 3000);
    return () => window.clearTimeout(t);
  }, [online, namen]);
}
