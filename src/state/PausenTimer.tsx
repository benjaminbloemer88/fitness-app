/**
 * Pausen-Timer, der über alle Seiten hinweg weiterläuft.
 *
 * Wir speichern nur den Endzeitpunkt. Die Restzeit wird daraus berechnet –
 * so stimmt sie auch, wenn das Handy zwischendurch gesperrt war.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useEinstellungen } from '../db/einstellungen';
import { formatDauer } from '../domain/calc';
import { piepen, vibrieren } from '../lib/feedback';

interface PausenTimerWert {
  /** Restsekunden, null = kein Timer aktiv. */
  rest: number | null;
  /** true für ein paar Sekunden nach Ablauf (Anzeige „Weiter geht's“). */
  vorbei: boolean;
  starten: (sekunden?: number) => void;
  verlaengern: (sekunden: number) => void;
  stoppen: () => void;
}

const Kontext = createContext<PausenTimerWert | null>(null);
const SPEICHER = 'pause-endet-um';

function ladeEnde(): number | null {
  try {
    const wert = Number(localStorage.getItem(SPEICHER));
    return wert > Date.now() ? wert : null;
  } catch {
    return null;
  }
}
function speichereEnde(ende: number | null) {
  try {
    if (ende) localStorage.setItem(SPEICHER, String(ende));
    else localStorage.removeItem(SPEICHER);
  } catch {
    // Speicher nicht verfügbar – Timer läuft trotzdem.
  }
}

export function PausenTimerProvider({ children }: { children: ReactNode }) {
  const einstellungen = useEinstellungen();
  const [ende, setEnde] = useState<number | null>(ladeEnde);
  const [jetzt, setJetzt] = useState(Date.now());
  const [vorbei, setVorbei] = useState(false);
  const signalGegeben = useRef(false);

  // Solange ein Timer läuft, 4× pro Sekunde neu rechnen.
  useEffect(() => {
    if (ende === null) return;
    const id = window.setInterval(() => setJetzt(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [ende]);

  const rest = ende === null ? null : Math.max(0, Math.ceil((ende - jetzt) / 1000));

  // Ablauf: Vibration + Ton, dann kurz „vorbei“ anzeigen.
  useEffect(() => {
    if (rest !== 0 || signalGegeben.current) return;
    signalGegeben.current = true;
    if (einstellungen.vibration) vibrieren();
    if (einstellungen.ton) piepen();
    setVorbei(true);
    setEnde(null);
    speichereEnde(null);
  }, [rest, einstellungen.vibration, einstellungen.ton]);

  // Die Meldung „Weiter geht's“ nach 4 Sekunden ausblenden.
  useEffect(() => {
    if (!vorbei) return;
    const id = window.setTimeout(() => setVorbei(false), 4000);
    return () => window.clearTimeout(id);
  }, [vorbei]);

  const starten = useCallback(
    (sekunden?: number) => {
      const neu = Date.now() + (sekunden ?? einstellungen.pauseSek) * 1000;
      signalGegeben.current = false;
      setVorbei(false);
      setJetzt(Date.now());
      setEnde(neu);
      speichereEnde(neu);
    },
    [einstellungen.pauseSek],
  );
  const verlaengern = useCallback((sekunden: number) => {
    setEnde((alt) => {
      if (alt === null) return alt;
      const neu = Math.max(Date.now() + 1000, alt + sekunden * 1000);
      speichereEnde(neu);
      return neu;
    });
  }, []);
  const stoppen = useCallback(() => {
    setEnde(null);
    setVorbei(false);
    speichereEnde(null);
  }, []);

  const wert = useMemo(() => ({ rest, vorbei, starten, verlaengern, stoppen }), [rest, vorbei, starten, verlaengern, stoppen]);
  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function usePausenTimer(): PausenTimerWert {
  const wert = useContext(Kontext);
  if (!wert) throw new Error('usePausenTimer braucht den PausenTimerProvider');
  return wert;
}

/** Leiste mit großer Restzeit und Knöpfen −30 s / +30 s / Stopp. */
export function PausenLeiste() {
  const { rest, vorbei, verlaengern, stoppen } = usePausenTimer();
  if (rest === null && !vorbei) return null;
  if (vorbei) {
    return (
      <div className="pausenleiste vorbei" role="status">
        <div className="pausenzeit">Weiter geht's!</div>
        <span />
        <span />
        <button className="knopf icon" onClick={stoppen} aria-label="Schließen">
          ✕
        </button>
      </div>
    );
  }
  return (
    <div className="pausenleiste" role="timer" aria-live="off">
      <div>
        <div className="klein gedaempft">Pause</div>
        <div className="pausenzeit">{formatDauer(rest ?? 0)}</div>
      </div>
      <button className="knopf" onClick={() => verlaengern(-30)}>
        −30
      </button>
      <button className="knopf" onClick={() => verlaengern(30)}>
        +30
      </button>
      <button className="knopf icon" onClick={stoppen} aria-label="Pause beenden">
        ✕
      </button>
    </div>
  );
}
