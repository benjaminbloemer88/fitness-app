/**
 * Abschluss einer Einheit: Datum, Gefühl 1–10, Anmerkungen, Vorschau der Log-Zeile.
 * Speichern = erst lokal, dann in die Sync-Warteschlange.
 * War die Einheit schon im Doc, wird die Korrektur erst nach Bestätigung gesendet.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { IconZurueck } from '../../components/Icons';
import { schliesseAb } from '../../db/einheiten';
import { erzeugeLogZeile, logZeileAlsZellen } from '../../domain/logFormat';
import { useEinheit } from '../../hooks/daten';
import { usePausenTimer } from '../../state/PausenTimer';
import { LogVorschau } from './LogVorschau';

const SCHNELL_NOTIZEN = ['gut geschlafen', 'schlecht geschlafen', 'müde', 'super Form', 'Beschwerden: '];

const GEFUEHL_TEXT: Record<number, string> = {
  1: 'sehr leicht',
  3: 'leicht',
  5: 'mittel',
  7: 'anstrengend',
  9: 'sehr hart',
  10: 'Maximum',
};

export function AbschlussSeite() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const einheit = useEinheit(id);
  const timer = usePausenTimer();
  const [datum, setDatum] = useState('');
  const [gefuehl, setGefuehl] = useState(7);
  const [anmerkungen, setAnmerkungen] = useState('');
  const [geladen, setGeladen] = useState(false);
  const [speichert, setSpeichert] = useState(false);

  useEffect(() => {
    if (einheit && !geladen) {
      setDatum(einheit.datum);
      setGefuehl(einheit.gefuehl ?? 7);
      setAnmerkungen(einheit.anmerkungen);
      setGeladen(true);
    }
  }, [einheit, geladen]);

  if (einheit === undefined || !geladen) return <main className="seite" />;
  if (einheit === null) return <main className="seite"><div className="hinweis fehler">Einheit nicht gefunden.</div></main>;

  const vorschau = erzeugeLogZeile({ ...einheit, datum, gefuehl, anmerkungen, status: 'abgeschlossen' });
  const leer = vorschau.wasGemacht.trim() === '';
  const istKorrektur = einheit.sync === 'synchronisiert';

  const speichern = async () => {
    if (istKorrektur) {
      const alt = einheit.logZeile ? logZeileAlsZellen(einheit.logZeile).join(' | ') : '(unbekannt)';
      const neu = logZeileAlsZellen(vorschau).join(' | ');
      if (alt === neu) {
        navigate('/', { replace: true });
        return;
      }
      if (!window.confirm(`Diese Zeile steht schon im Doc. Soll sie korrigiert werden?\n\nBisher:\n${alt}\n\nNeu:\n${neu}`)) return;
    }
    setSpeichert(true);
    await schliesseAb(einheit.id, { datum, gefuehl, anmerkungen: anmerkungen.trim() });
    timer.stoppen();
    navigate('/', { replace: true });
  };

  const notizHinzufuegen = (n: string) => setAnmerkungen((a) => (a.trim() ? `${a.trim()}, ${n}` : n));

  return (
    <main className="seite ohne-nav">
      <header className="kopf-links">
        <button className="knopf icon leise" onClick={() => navigate(-1)} aria-label="Zurück">
          <IconZurueck />
        </button>
        <div>
          <h1 style={{ fontSize: '1.3rem' }}>Abschluss</h1>
          <div className="klein gedaempft">{einheit.titel}</div>
        </div>
      </header>

      <section className="karte">
        <div className="zeile zwischen">
          <span className="fett">Gefühl</span>
          <span className="pausenzeit">
            {gefuehl}
            <span className="klein gedaempft"> / 10</span>
          </span>
        </div>
        <input
          type="range"
          className="regler"
          min={1}
          max={10}
          step={1}
          value={gefuehl}
          onChange={(e) => setGefuehl(Number(e.target.value))}
          aria-label="Gefühl von 1 (sehr leicht) bis 10 (Maximum)"
        />
        <div className="zeile zwischen klein gedaempft">
          <span>1 sehr leicht</span>
          <span>{GEFUEHL_TEXT[gefuehl] ?? ''}</span>
          <span>10 Maximum</span>
        </div>
      </section>

      <section className="karte">
        <label className="feld">
          <span>Anmerkungen (Schlaf, Beschwerden …)</span>
          <textarea className="eingabe" value={anmerkungen} onChange={(e) => setAnmerkungen(e.target.value)} />
        </label>
        <div className="zeile umbruch">
          {SCHNELL_NOTIZEN.map((n) => (
            <button key={n} className="chip" onClick={() => notizHinzufuegen(n)}>
              {n.replace(': ', '')}
            </button>
          ))}
        </div>
        <label className="feld">
          <span>Datum</span>
          <input className="eingabe" type="date" value={datum} onChange={(e) => e.target.value && setDatum(e.target.value)} />
        </label>
      </section>

      <section className="stapel">
        <div className="klein gedaempft">So kommt es ins Log:</div>
        <LogVorschau zeile={vorschau} />
      </section>

      {leer && <div className="hinweis warn">Noch nichts erfasst. Hake mindestens einen Satz ab oder speichere die Einheit als ausgelassen.</div>}

      {einheit.planDatum && !istKorrektur && (
        <button className="knopf leise" onClick={() => navigate(`/auslassen/${einheit.planDatum}`)}>
          Stattdessen als ausgelassen speichern …
        </button>
      )}

      <div className="unten-fixiert">
        <div className="unten-fixiert-innen">
          <button className="knopf primaer gross block" disabled={leer || speichert} onClick={() => void speichern()}>
            {istKorrektur ? 'Korrektur speichern' : 'Speichern'}
          </button>
        </div>
      </div>
    </main>
  );
}
