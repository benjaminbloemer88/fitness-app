/**
 * Hält den Bildschirm an, solange die Komponente sichtbar ist (z. B. im Training).
 * Nutzt die Screen Wake Lock API; wird nach dem Zurückkehren in die App neu angefordert.
 */
import { useEffect } from 'react';

export function useWakeLock(aktiv: boolean): void {
  useEffect(() => {
    if (!aktiv || !('wakeLock' in navigator)) return;
    let sperre: WakeLockSentinel | null = null;
    let beendet = false;

    const anfordern = async () => {
      try {
        if (document.visibilityState === 'visible' && !beendet) sperre = await navigator.wakeLock.request('screen');
      } catch {
        // z. B. Energiesparmodus – dann eben nicht.
      }
    };
    const beiSichtbarkeit = () => {
      if (document.visibilityState === 'visible') void anfordern();
    };

    void anfordern();
    document.addEventListener('visibilitychange', beiSichtbarkeit);
    return () => {
      beendet = true;
      document.removeEventListener('visibilitychange', beiSichtbarkeit);
      void sperre?.release().catch(() => undefined);
    };
  }, [aktiv]);
}
