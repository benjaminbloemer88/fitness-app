/**
 * Kompakte Anzeige einer erfassten Einheit: Status, Log-Text, Sync-Status, Aktionen.
 * Wird auf „Heute“, im Tagesdetail und im Verlauf genutzt.
 */
import { useNavigate } from 'react-router';
import { db } from '../../db/db';
import { loescheEinheit } from '../../db/einheiten';
import { synchronisieren } from '../../sync/syncDienst';
import { einreihen } from '../../sync/syncQueue';
import { formatTagKurz } from '../../domain/dates';
import type { Einheit } from '../../domain/einheit';
import { erzeugeLogZeile } from '../../domain/logFormat';

export function statusAbzeichen(e: Einheit) {
  if (e.status === 'laeuft') return <span className="abzeichen info">läuft</span>;
  if (e.status === 'ausgelassen') return <span className="abzeichen fehler">✗ ausgelassen</span>;
  return <span className="abzeichen ok">✓ erledigt</span>;
}

export function syncAbzeichen(e: Einheit) {
  if (e.status === 'laeuft' || e.sync === null) return null;
  if (e.sync === 'synchronisiert') {
    const geaendert = e.logZeile && JSON.stringify(e.logZeile) !== JSON.stringify(erzeugeLogZeile(e));
    return geaendert ? <span className="abzeichen warn">lokal geändert</span> : <span className="abzeichen ok">im Doc</span>;
  }
  if (e.sync === 'fehler') return <span className="abzeichen fehler" title={e.syncFehler ?? ''}>Sync-Fehler</span>;
  return <span className="abzeichen warn">wartet auf Sync</span>;
}

export function EinheitKurz({ einheit, zeigeDatum = false }: { einheit: Einheit; zeigeDatum?: boolean }) {
  const navigate = useNavigate();
  const zeile = einheit.status === 'laeuft' ? null : erzeugeLogZeile(einheit);

  const bearbeiten = () => navigate(einheit.typ === 'lauf' ? `/lauf/${einheit.id}` : `/training/${einheit.id}`);
  // Nach einem Fehler (oder wenn die Zeile im Doc fehlt) neu anhängen. Die Brücke verhindert Doppelte.
  const erneutSenden = async () => {
    await einreihen(db, einheit.id, 'anhaengen');
    await synchronisieren().catch(() => undefined);
  };

  const loeschen = async () => {
    if (!window.confirm(`„${einheit.titel}“ vom ${formatTagKurz(einheit.datum)} wirklich löschen? Das lässt sich nicht rückgängig machen.`)) return;
    try {
      await loescheEinheit(einheit.id);
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  return (
    <div className="karte">
      <div className="zeile zwischen umbruch">
        <div>
          {zeigeDatum && <div className="klein gedaempft">{formatTagKurz(einheit.datum)}</div>}
          <h3>{einheit.titel}</h3>
        </div>
        <div className="zeile umbruch">
          {statusAbzeichen(einheit)}
          {syncAbzeichen(einheit)}
        </div>
      </div>
      {zeile && (
        <p className="klein">
          {zeile.wasGemacht || <span className="gedaempft">(nichts erfasst)</span>}
          {zeile.gefuehl && zeile.gefuehl !== '–' ? <span className="gedaempft"> · Gefühl {zeile.gefuehl}</span> : null}
        </p>
      )}
      {zeile && <p className="klein gedaempft">{zeile.anmerkungen}</p>}
      {einheit.sync === 'fehler' && einheit.syncFehler && <div className="hinweis fehler">{einheit.syncFehler}</div>}
      <div className="zeile umbruch">
        {einheit.status === 'laeuft' ? (
          <button className="knopf primaer" onClick={bearbeiten}>
            Weiter
          </button>
        ) : einheit.status === 'abgeschlossen' ? (
          <button className="knopf" onClick={bearbeiten}>
            Bearbeiten
          </button>
        ) : null}
        {einheit.sync === 'fehler' && (
          <button className="knopf" onClick={() => void erneutSenden()}>
            Erneut senden
          </button>
        )}
        {einheit.sync !== 'synchronisiert' && (
          <button className="knopf gefahr" onClick={loeschen}>
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}
