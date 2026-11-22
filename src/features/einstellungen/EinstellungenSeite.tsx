/**
 * Einstellungen: Training (Pause, Gewichtsschritt …), Darstellung, Google-Doc-Sync,
 * Plan, Backup (Export/Import) und Daten löschen.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import { Stepper } from '../../components/Stepper';
import { erstelleBackup, loescheAlles, pruefeBackup, spieleBackupEin } from '../../db/backup';
import { db } from '../../db/db';
import { neuesterPlan, testplanLaden } from '../../db/einheiten';
import { speichereEinstellungen, syncEingerichtet, useEinstellungen, type Einstellungen } from '../../db/einstellungen';
import { formatDauer } from '../../domain/calc';
import { heuteISO, isoZuDeutsch } from '../../domain/dates';
import { useSyncZustand } from '../../hooks/daten';

const SCHRITTE = [0.5, 1, 1.25, 2.5];
const QUELLE_TEXT = { json: 'Plan-Daten (JSON)', tabelle: 'Plantabelle (Fallback)', testdaten: 'Testdaten' } as const;

export function EinstellungenSeite() {
  const e = useEinstellungen();
  const sync = useSyncZustand();
  const plan = useLiveQuery(() => neuesterPlan(), []);
  const dateiEingabe = useRef<HTMLInputElement>(null);
  const [meldung, setMeldung] = useState<{ text: string; art: 'ok' | 'fehler' } | null>(null);
  const setze = (teil: Partial<Einstellungen>) => void speichereEinstellungen(teil);

  const exportieren = async () => {
    const backup = await erstelleBackup(db);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-backup-${heuteISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMeldung({ text: 'Backup wurde heruntergeladen.', art: 'ok' });
  };

  const importieren = async (datei: File) => {
    try {
      const backup = pruefeBackup(JSON.parse(await datei.text()));
      const anzahl = backup.daten.einheiten.length;
      if (!window.confirm(`Backup vom ${isoZuDeutsch(backup.exportiertAm.slice(0, 10))} mit ${anzahl} Einheiten einspielen? Alle aktuellen lokalen Daten werden ersetzt.`)) return;
      await spieleBackupEin(db, backup);
      setMeldung({ text: `Backup eingespielt (${anzahl} Einheiten).`, art: 'ok' });
    } catch (err) {
      setMeldung({ text: (err as Error).message, art: 'fehler' });
    }
  };

  const allesLoeschen = async () => {
    if (!window.confirm('Wirklich ALLE lokalen Daten löschen (Einheiten, Pläne, Warteschlange)? Einträge, die schon im Doc stehen, bleiben dort erhalten. Das lässt sich nicht rückgängig machen.')) return;
    await loescheAlles(db);
    await testplanLaden(db);
    setMeldung({ text: 'Lokale Daten gelöscht.', art: 'ok' });
  };

  return (
    <main className="seite">
      <header className="kopf">
        <h1>Einstellungen</h1>
      </header>

      {meldung && <div className={`hinweis ${meldung.art}`}>{meldung.text}</div>}

      <section className="karte">
        <h2>Training</h2>
        <Stepper
          label={`Pause zwischen Sätzen (${formatDauer(e.pauseSek)} min)`}
          wert={e.pauseSek}
          schritt={15}
          min={15}
          max={600}
          einheit="s"
          onChange={(w) => w !== null && setze({ pauseSek: w })}
        />
        <div>
          <div className="stepper-label">Gewichtsschritt bei + / −</div>
          <div className="zeile umbruch">
            {SCHRITTE.map((s) => (
              <button key={s} className={`chip${e.gewichtSchritt === s ? ' aktiv' : ''}`} onClick={() => setze({ gewichtSchritt: s })}>
                {String(s).replace('.', ',')} kg
              </button>
            ))}
          </div>
        </div>
        <label className="schalter">
          <span>Bildschirm im Training anlassen</span>
          <input type="checkbox" checked={e.bildschirmAn} onChange={(x) => setze({ bildschirmAn: x.target.checked })} />
        </label>
        <label className="schalter">
          <span>Vibration am Ende der Pause</span>
          <input type="checkbox" checked={e.vibration} onChange={(x) => setze({ vibration: x.target.checked })} />
        </label>
        <label className="schalter">
          <span>Ton am Ende der Pause</span>
          <input type="checkbox" checked={e.ton} onChange={(x) => setze({ ton: x.target.checked })} />
        </label>
        <Stepper label="Körpergewicht" wert={e.koerpergewichtKg} schritt={0.5} min={30} max={250} einheit="kg" onChange={(w) => w !== null && setze({ koerpergewichtKg: w })} />
      </section>

      <section className="karte">
        <h2>Darstellung</h2>
        <div className="zeile umbruch">
          {(
            [
              ['dunkel', 'Dunkel'],
              ['hell', 'Hell'],
              ['system', 'wie System'],
            ] as const
          ).map(([wert, text]) => (
            <button key={wert} className={`chip${e.design === wert ? ' aktiv' : ''}`} onClick={() => setze({ design: wert })}>
              {text}
            </button>
          ))}
        </div>
      </section>

      <section className="karte" id="sync">
        <h2>Google-Doc-Sync</h2>
        {!syncEingerichtet(e) ? (
          <div className="hinweis warn">
            Noch nicht eingerichtet – alle Einträge werden lokal gespeichert ({sync.offen} warten). Die Verbindung zum Doc über die Apps-Script-Brücke
            richten wir im nächsten Schritt ein.
          </div>
        ) : (
          <div className={`hinweis ${sync.fehler ? 'fehler' : sync.offen ? 'warn' : 'ok'}`}>
            {sync.offen === 0 ? 'Alles synchronisiert.' : `${sync.offen} Einträge warten.`} {sync.fehler ? `Letzter Fehler: ${sync.fehler}` : ''}
          </div>
        )}
        <label className="feld">
          <span>Web-App-URL der Brücke</span>
          <input
            className="eingabe"
            inputMode="url"
            placeholder="https://script.google.com/macros/s/…/exec"
            value={e.bridgeUrl}
            onChange={(x) => setze({ bridgeUrl: x.target.value.trim() })}
          />
        </label>
        <label className="feld">
          <span>Geheimer Schlüssel</span>
          <input className="eingabe" type="password" autoComplete="off" value={e.bridgeSchluessel} onChange={(x) => setze({ bridgeSchluessel: x.target.value.trim() })} />
        </label>
        <p className="klein gedaempft">URL und Schlüssel bleiben nur auf diesem Gerät gespeichert.</p>
      </section>

      <section className="karte">
        <h2>Plan</h2>
        {plan ? (
          <p className="klein">
            Woche ab {isoZuDeutsch(plan.wocheVon)} · Quelle: {QUELLE_TEXT[plan.quelle]} · geladen am {isoZuDeutsch(plan.geladenAm.slice(0, 10))}
          </p>
        ) : (
          <p className="klein gedaempft">Kein Plan gespeichert.</p>
        )}
        <button className="knopf" disabled title="Kommt mit dem Doc-Sync">
          Plan neu laden (ab Doc-Sync)
        </button>
        <button
          className="knopf leise"
          onClick={async () => {
            await testplanLaden(db, true);
            setMeldung({ text: 'Testplan 23.–29.11.2026 neu geladen.', art: 'ok' });
          }}
        >
          Testplan neu laden
        </button>
      </section>

      <section className="karte">
        <h2>Backup</h2>
        <p className="klein gedaempft">Sichert alle lokalen Daten als JSON-Datei (z. B. vor einem Handywechsel).</p>
        <button className="knopf" onClick={() => void exportieren()}>
          Backup exportieren
        </button>
        <button className="knopf" onClick={() => dateiEingabe.current?.click()}>
          Backup importieren …
        </button>
        <input
          ref={dateiEingabe}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(x) => {
            const datei = x.target.files?.[0];
            if (datei) void importieren(datei);
            x.target.value = '';
          }}
        />
      </section>

      <section className="karte">
        <h2>Daten</h2>
        <button className="knopf gefahr" onClick={() => void allesLoeschen()}>
          Alle lokalen Daten löschen
        </button>
        <p className="klein gedaempft">Version {__APP_VERSION__}</p>
      </section>
    </main>
  );
}
