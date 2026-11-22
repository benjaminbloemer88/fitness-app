/**
 * Sichtbare Sync-Anzeige oben rechts. Tippen führt zu den Sync-Einstellungen.
 */
import { Link } from 'react-router';
import { syncEingerichtet, useEinstellungen } from '../db/einstellungen';
import { useOnline, useSyncZustand } from '../hooks/daten';
import { useSyncDienst } from '../sync/syncDienst';

export function SyncBadge() {
  const { offen, fehler: auftragsFehler } = useSyncZustand();
  const dienst = useSyncDienst();
  const einstellungen = useEinstellungen();
  const online = useOnline();
  const eingerichtet = syncEingerichtet(einstellungen);

  let klasse = 'ok';
  let text = '✓ im Doc';
  if (!eingerichtet) {
    klasse = offen > 0 ? 'warn' : 'info';
    text = offen > 0 ? `${offen} nur lokal` : 'Lokal';
  } else if (dienst.laeuft) {
    klasse = 'info';
    text = '↻ Sync …';
  } else if (!online) {
    klasse = offen > 0 ? 'warn' : 'info';
    text = offen > 0 ? `offline · ${offen} wartet` : 'offline';
  } else if (dienst.fehler || auftragsFehler) {
    klasse = 'fehler';
    text = offen > 0 ? `! ${offen} nicht gesendet` : '! Sync-Fehler';
  } else if (offen > 0) {
    klasse = 'warn';
    text = `${offen} wartet`;
  }

  return (
    <Link to="/einstellungen#sync" className={`abzeichen ${klasse}`} aria-label={`Sync-Status: ${text}`}>
      {text}
    </Link>
  );
}
