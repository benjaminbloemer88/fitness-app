/**
 * Sichtbare Sync-Anzeige oben rechts. Tippen führt zu den Sync-Einstellungen.
 */
import { Link } from 'react-router';
import { syncEingerichtet, useEinstellungen } from '../db/einstellungen';
import { useOnline, useSyncZustand } from '../hooks/daten';

export function SyncBadge() {
  const { offen, fehler } = useSyncZustand();
  const einstellungen = useEinstellungen();
  const online = useOnline();

  let klasse = 'ok';
  let text = 'Alles im Doc';
  if (offen > 0) {
    klasse = fehler ? 'fehler' : 'warn';
    text = fehler ? `${offen} Sync-Fehler` : `${offen} wartet`;
    if (!syncEingerichtet(einstellungen)) {
      klasse = 'warn';
      text = `${offen} nur lokal`;
    }
  } else if (!syncEingerichtet(einstellungen)) {
    klasse = 'info';
    text = 'Lokal';
  }

  return (
    <Link to="/einstellungen#sync" className={`abzeichen ${klasse}`} aria-label={`Sync-Status: ${text}${online ? '' : ', offline'}`}>
      {online ? '●' : '○'} {text}
    </Link>
  );
}
