/**
 * Meldet, wenn eine neue App-Version bereitsteht. Das Update wird erst
 * auf Tipp aktiv – so startet die App nie mitten im Training neu.
 */
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdateBanner() {
  const {
    needRefresh: [neuVerfuegbar, setNeuVerfuegbar],
    offlineReady: [offlineBereit, setOfflineBereit],
    updateServiceWorker,
  } = useRegisterSW();

  if (neuVerfuegbar) {
    return (
      <div className="update-banner karte hervorgehoben" role="status">
        <div className="fett">Neue Version verfügbar</div>
        <div className="zeile">
          <button className="knopf block" onClick={() => setNeuVerfuegbar(false)}>
            Später
          </button>
          <button className="knopf primaer block" onClick={() => void updateServiceWorker(true)}>
            Neu laden
          </button>
        </div>
      </div>
    );
  }
  if (offlineBereit) {
    return (
      <div className="update-banner hinweis ok" role="status" onClick={() => setOfflineBereit(false)}>
        Die App ist jetzt offline nutzbar. ✓
      </div>
    );
  }
  return null;
}
