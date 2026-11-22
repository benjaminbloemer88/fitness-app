/**
 * Einstellungen für den Google-Doc-Sync: Web-App-URL und Schlüssel der Apps-Script-Brücke,
 * Verbindung testen, Status und „Jetzt abgleichen“.
 */
import { useEffect, useState } from 'react';
import { speichereEinstellungen, syncEingerichtet, useEinstellungen } from '../../db/einstellungen';
import { useOnline, useSyncZustand } from '../../hooks/daten';
import { allesAbgleichen, useSyncDienst, verbindungTesten } from '../../sync/syncDienst';

/** Fügt Text aus der Zwischenablage ein (falls der Browser es erlaubt). */
async function ausZwischenablage(): Promise<string | null> {
  try {
    return (await navigator.clipboard.readText()).trim();
  } catch {
    return null;
  }
}

export function SyncEinstellungen() {
  const e = useEinstellungen();
  const offen = useSyncZustand().offen;
  const dienst = useSyncDienst();
  const online = useOnline();
  const [url, setUrl] = useState(e.bridgeUrl);
  const [schluessel, setSchluessel] = useState(e.bridgeSchluessel);
  const [meldung, setMeldung] = useState<{ text: string; art: 'ok' | 'fehler' | 'warn' } | null>(null);
  const [beschaeftigt, setBeschaeftigt] = useState(false);

  // Gespeicherte Werte übernehmen, sobald sie aus der Datenbank geladen sind
  useEffect(() => {
    setUrl(e.bridgeUrl);
    setSchluessel(e.bridgeSchluessel);
  }, [e.bridgeUrl, e.bridgeSchluessel]);

  const eingerichtet = syncEingerichtet(e);
  const geaendert = url.trim() !== e.bridgeUrl || schluessel.trim() !== e.bridgeSchluessel;

  const pruefenUndSpeichern = async () => {
    setBeschaeftigt(true);
    setMeldung(null);
    try {
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url.trim())) {
        throw new Error('Die URL sollte so aussehen: https://script.google.com/macros/s/…/exec');
      }
      const titel = await verbindungTesten(url, schluessel);
      await speichereEinstellungen({ bridgeUrl: url.trim(), bridgeSchluessel: schluessel.trim() });
      setMeldung({ text: `Verbunden mit „${titel}“. Plan und Log werden jetzt geladen.`, art: 'ok' });
    } catch (err) {
      setMeldung({ text: (err as Error).message, art: 'fehler' });
    } finally {
      setBeschaeftigt(false);
    }
  };

  const jetztAbgleichen = async () => {
    setMeldung(null);
    try {
      const r = await allesAbgleichen();
      const quelle = r.quelle === 'json' ? 'aus den Plan-Daten' : r.quelle === 'tabelle' ? 'aus der Plantabelle' : 'nicht gefunden';
      setMeldung({
        text: `Plan ${quelle} geladen, ${r.logZeilen} Log-Zeilen übernommen.${r.vermisst.length ? ` ${r.vermisst.length} eigene Zeile(n) fehlen im Doc – siehe Verlauf.` : ''}`,
        art: r.vermisst.length || r.quelle !== 'json' ? 'warn' : 'ok',
      });
    } catch (err) {
      setMeldung({ text: (err as Error).message, art: 'fehler' });
    }
  };

  const trennen = async () => {
    if (!window.confirm('Verbindung zum Doc trennen? Einträge bleiben lokal gespeichert und warten auf den nächsten Sync.')) return;
    await speichereEinstellungen({ bridgeUrl: '', bridgeSchluessel: '' });
    setMeldung({ text: 'Verbindung getrennt.', art: 'ok' });
  };

  let status: { text: string; art: string };
  if (!eingerichtet) status = { text: `Noch nicht eingerichtet – Einträge bleiben lokal (${offen} warten).`, art: 'warn' };
  else if (dienst.laeuft) status = { text: 'Abgleich läuft …', art: '' };
  else if (!online) status = { text: `Offline – ${offen} Einträge warten. Der Sync startet automatisch, sobald Netz da ist.`, art: 'warn' };
  else if (dienst.fehler) status = { text: `Fehler: ${dienst.fehler}`, art: 'fehler' };
  else if (offen > 0) status = { text: `${offen} Einträge warten auf den Sync.`, art: 'warn' };
  else status = { text: `Alles im Doc.${dienst.letzterAbgleich ? ` Letzter Abgleich: ${new Date(dienst.letzterAbgleich).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}`, art: 'ok' };

  return (
    <section className="karte" id="sync">
      <h2>Google-Doc-Sync</h2>
      <div className={`hinweis ${status.art}`}>{status.text}</div>
      {meldung && <div className={`hinweis ${meldung.art}`}>{meldung.text}</div>}

      {eingerichtet && (
        <button className="knopf primaer" disabled={dienst.laeuft || !online} onClick={() => void jetztAbgleichen()}>
          Jetzt abgleichen (Plan laden + senden)
        </button>
      )}

      <label className="feld">
        <span>Web-App-URL der Brücke</span>
        <div className="zeile">
          <input className="eingabe" inputMode="url" autoComplete="off" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(x) => setUrl(x.target.value)} />
          <button className="knopf" type="button" onClick={async () => setUrl((await ausZwischenablage()) ?? url)}>
            Einfügen
          </button>
        </div>
      </label>
      <label className="feld">
        <span>Geheimer Schlüssel</span>
        <div className="zeile">
          <input className="eingabe" type="password" autoComplete="off" value={schluessel} onChange={(x) => setSchluessel(x.target.value)} />
          <button className="knopf" type="button" onClick={async () => setSchluessel((await ausZwischenablage()) ?? schluessel)}>
            Einfügen
          </button>
        </div>
      </label>
      <button className="knopf" disabled={beschaeftigt || !url.trim() || !schluessel.trim() || (!geaendert && eingerichtet)} onClick={() => void pruefenUndSpeichern()}>
        {beschaeftigt ? 'Prüfe …' : 'Verbindung testen & speichern'}
      </button>
      {eingerichtet && (
        <button className="knopf leise" onClick={() => void trennen()}>
          Verbindung trennen
        </button>
      )}
      <p className="klein gedaempft">URL und Schlüssel bleiben nur auf diesem Gerät. Die App schreibt nur neue Log-Zeilen; Profil, Plan und Archiv bleiben unberührt.</p>
    </section>
  );
}
