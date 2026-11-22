/**
 * Einmalige Erzeugung der Plan-Daten (JSON) aus der Plantabelle.
 * Zeigt den erkannten Plan zur Kontrolle und schreibt ihn erst nach Bestätigung ins Doc.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { IconZurueck } from '../../components/Icons';
import { PlanTagKarte } from '../../components/PlanTagKarte';
import { neuesterPlan } from '../../db/einheiten';
import { syncEingerichtet, useEinstellungen } from '../../db/einstellungen';
import { isoZuDeutsch } from '../../domain/dates';
import { planAlsJson } from '../../domain/planSchema';
import { planDatenInsDoc } from '../../sync/syncDienst';

export function PlanDatenSeite() {
  const navigate = useNavigate();
  const e = useEinstellungen();
  const eintrag = useLiveQuery(() => neuesterPlan(), []);
  const [meldung, setMeldung] = useState<{ text: string; art: 'ok' | 'fehler' } | null>(null);
  const [schreibt, setSchreibt] = useState(false);

  if (eintrag === undefined) return <main className="seite" />;
  const passt = eintrag?.quelle === 'tabelle' && eintrag.jsonStatus === 'fehlt';

  const schreiben = async () => {
    if (!eintrag) return;
    if (
      !window.confirm(
        `Plan-Daten für ${isoZuDeutsch(eintrag.plan.woche_von)} – ${isoZuDeutsch(eintrag.plan.woche_bis)} jetzt ins Doc schreiben?\n\n` +
          'Eingefügt wird nur der neue Abschnitt „Plan-Daten (für die App – nicht bearbeiten)“ direkt vor dem Log. Sonst ändert sich nichts.',
      )
    )
      return;
    setSchreibt(true);
    try {
      const r = await planDatenInsDoc(eintrag.plan);
      setMeldung({ text: r.quelle === 'json' ? 'Fertig – die App liest den Plan jetzt aus den Plan-Daten.' : 'Geschrieben, aber die Plan-Daten wurden nicht erkannt.', art: r.quelle === 'json' ? 'ok' : 'fehler' });
    } catch (err) {
      setMeldung({ text: (err as Error).message, art: 'fehler' });
    } finally {
      setSchreibt(false);
    }
  };

  return (
    <main className="seite ohne-nav">
      <header className="kopf-links">
        <button className="knopf icon leise" onClick={() => navigate(-1)} aria-label="Zurück">
          <IconZurueck />
        </button>
        <div>
          <h1 style={{ fontSize: '1.3rem' }}>Plan-Daten erzeugen</h1>
          {eintrag && (
            <div className="klein gedaempft">
              {isoZuDeutsch(eintrag.plan.woche_von)} – {isoZuDeutsch(eintrag.plan.woche_bis)}
            </div>
          )}
        </div>
      </header>

      {meldung && <div className={`hinweis ${meldung.art}`}>{meldung.text}</div>}

      {!passt ? (
        <div className="hinweis">Nichts zu tun – die Plan-Daten sind im Doc vorhanden (oder der Plan stammt noch aus den Testdaten).</div>
      ) : (
        <>
          <div className="hinweis warn">
            So hat die App die Plantabelle verstanden. Bitte kurz prüfen: Übungen, Sätze × Wdh., Gewichte, „kalibrieren“. Erst nach deiner Bestätigung wird
            etwas ins Doc geschrieben.
          </div>
          {eintrag.plan.tage.map((tag) => (
            <PlanTagKarte key={tag.datum} tag={tag} zeigeDatum />
          ))}
          <details className="karte">
            <summary>JSON ansehen</summary>
            <pre className="logvorschau" style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(JSON.parse(planAlsJson(eintrag.plan)), null, 1)}
            </pre>
          </details>
          <div className="unten-fixiert">
            <div className="unten-fixiert-innen">
              <button className="knopf primaer gross block" disabled={schreibt || !syncEingerichtet(e) || meldung?.art === 'ok'} onClick={() => void schreiben()}>
                {schreibt ? 'Schreibe …' : 'Passt – ins Doc schreiben'}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
