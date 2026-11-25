/**
 * Verlauf – Übersicht (Variante B): Kennzahlen, neue Bestleistungen,
 * je Übung aktueller Wert mit Mini-Kurve und Trend. Ein Tipp öffnet die Detailansicht.
 */
import { useState } from 'react';
import { Link } from 'react-router';
import { IconPokal } from '../../components/Icons';
import { SyncBadge } from '../../components/SyncBadge';
import { Sparkline } from '../../components/VerlaufDiagramm';
import { usePlanung } from '../../db/verschiebungen';
import { formatDezimal, formatPace } from '../../domain/calc';
import { formatTagKurz, monatsName, montagDerWoche, plusTage } from '../../domain/dates';
import { bestleistungen, einheitenProWoche, gefuehlVerlauf, paceVerlauf, uebungsNamen, uebungsVerlauf } from '../../domain/verlauf';
import { useHeute } from '../../hooks/daten';
import { planStatus } from '../../lib/anzeige';
import { EinheitKurz } from '../einheit/EinheitKurz';
import { mitVorzeichen, useVerlaufsDaten } from './daten';

export function VerlaufSeite() {
  const heute = useHeute();
  const planung = usePlanung();
  const { einheiten, eintraege } = useVerlaufsDaten();
  const [alleZeigen, setAlleZeigen] = useState(false);

  // ── Kennzahlen ──
  const montag = montagDerWoche(heute);
  const geplant = (planung?.effektiv ?? []).filter((e) => e.datum >= montag && e.datum <= plusTage(montag, 6));
  const erledigtWoche = geplant.filter((e) => planStatus(e.tag.datum, einheiten) === 'erledigt').length;
  const trainingsGesamt = eintraege.filter((e) => !e.ausgelassen).length;
  const monat = heute.slice(0, 7);
  const kmMonat = eintraege.filter((e) => e.datum.startsWith(monat) && e.lauf).reduce((s, e) => s + (e.lauf?.distanzKm ?? 0), 0);
  const gefuehl4w = gefuehlVerlauf(eintraege).filter((g) => g.datum >= plusTage(heute, -28));
  const gefuehlSchnitt = gefuehl4w.length ? gefuehl4w.reduce((s, g) => s + g.gefuehl, 0) / gefuehl4w.length : null;

  const rekorde = bestleistungen(eintraege, plusTage(heute, -28)).slice(0, 3);
  const pace = paceVerlauf(eintraege);
  const gefuehl = gefuehlVerlauf(eintraege);
  const wochen = einheitenProWoche(eintraege);
  const liste = einheiten.filter((e) => e.status !== 'laeuft');

  return (
    <main className="seite">
      <header className="kopf">
        <h1>Verlauf</h1>
        <SyncBadge />
      </header>

      <section className="kennzahlen" aria-label="Kennzahlen">
        <div className="kennzahl">
          <div className="klein gedaempft">Diese Woche</div>
          <div className="wert">
            {erledigtWoche}
            {geplant.length > 0 && <small> / {geplant.length}</small>}
          </div>
        </div>
        <div className="kennzahl">
          <div className="klein gedaempft">Trainings gesamt</div>
          <div className="wert">{trainingsGesamt}</div>
        </div>
        <div className="kennzahl">
          <div className="klein gedaempft">Gelaufen ({monatsName(heute)})</div>
          <div className="wert">
            {formatDezimal(kmMonat, 1)}
            <small> km</small>
          </div>
        </div>
        <div className="kennzahl">
          <div className="klein gedaempft">Ø Gefühl (4 Wochen)</div>
          <div className="wert">
            {gefuehlSchnitt !== null ? formatDezimal(gefuehlSchnitt, 1) : '–'}
            {gefuehlSchnitt !== null && <small> / 10</small>}
          </div>
        </div>
      </section>

      {/* ── Neue Bestleistungen ── */}
      <div className="abschnitt-titel">Neue Bestleistungen</div>
      <section className="karte" style={{ paddingTop: 4, paddingBottom: 4 }}>
        {rekorde.length === 0 ? (
          <p className="klein gedaempft" style={{ margin: '8px 0' }}>
            Noch keine in den letzten 4 Wochen. Sobald du eine Bestmarke übertriffst, steht sie hier.
          </p>
        ) : (
          rekorde.map((r) => (
            <div key={r.datum + r.titel} className="bestleistung">
              <IconPokal width={24} height={24} aria-hidden="true" />
              <div>
                <div className="fett">{r.titel}</div>
                <div className="klein gedaempft">
                  {formatTagKurz(r.datum)} · {r.text}
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {/* ── Übungen ── */}
      <div className="abschnitt-titel">Übungen</div>
      {uebungsNamen(eintraege).length === 0 && <p className="gedaempft klein">Noch keine Übungen erfasst.</p>}
      {uebungsNamen(eintraege).map((name) => {
        const punkte = uebungsVerlauf(eintraege, name);
        const letzter = punkte.at(-1)!;
        const vorher = punkte.at(-2);
        const mitGewicht = punkte.some((p) => p.topKg > 0);
        const wert = (p: typeof letzter) => (mitGewicht ? p.topKg : p.wdhBeiTop);
        let trend = '';
        let hoch = false;
        if (vorher) {
          const diff = wert(letzter) - wert(vorher);
          const wdhDiff = letzter.wdhBeiTop - vorher.wdhBeiTop;
          if (mitGewicht && diff !== 0) trend = mitVorzeichen(diff, ' kg');
          else if (wdhDiff !== 0) trend = mitVorzeichen(wdhDiff, ' Wdh.');
          else trend = '±0';
          hoch = diff > 0 || (diff === 0 && wdhDiff > 0);
        }
        return (
          <Link key={name} to={`/verlauf/uebung/${encodeURIComponent(name)}`} className="trend-karte">
            <div>
              <div className="fett">{name}</div>
              <div className="wert">{mitGewicht ? `${formatDezimal(letzter.topKg)} kg × ${letzter.wdhBeiTop}` : `${letzter.wdhBeiTop} Wdh.`}</div>
            </div>
            <Sparkline werte={punkte.slice(-8).map(wert)} klasse={hoch ? 'hoch' : ''} />
            <div className={`trend${hoch ? ' hoch' : ''}`}>{trend}</div>
          </Link>
        );
      })}

      {/* ── Laufen, Gefühl, Einheiten pro Woche ── */}
      {pace.length > 0 && (
        <Link to="/verlauf/lauf" className="trend-karte">
          <div>
            <div className="fett">Lauf-Pace</div>
            <div className="wert">
              {formatPace(pace.at(-1)!.paceSek)} /km · {formatDezimal(pace.at(-1)!.km)} km
            </div>
          </div>
          <Sparkline werte={pace.slice(-8).map((p) => p.paceSek)} umgekehrt klasse="lauf" />
          <div className={`trend${pace.length > 1 && pace.at(-1)!.paceSek < pace.at(-2)!.paceSek ? ' lauf' : ''}`}>
            {pace.length > 1 ? mitVorzeichen(pace.at(-1)!.paceSek - pace.at(-2)!.paceSek, ' s') : ''}
          </div>
        </Link>
      )}
      {gefuehl.length > 0 && (
        <Link to="/verlauf/gefuehl" className="trend-karte">
          <div>
            <div className="fett">Gefühl</div>
            <div className="wert">zuletzt {gefuehl.at(-1)!.gefuehl} / 10</div>
          </div>
          <Sparkline werte={gefuehl.slice(-8).map((g) => g.gefuehl)} />
          <div className="trend">{gefuehlSchnitt !== null ? `Ø ${formatDezimal(gefuehlSchnitt, 1)}` : ''}</div>
        </Link>
      )}
      {wochen.length > 0 && (
        <Link to="/verlauf/wochen" className="trend-karte">
          <div>
            <div className="fett">Einheiten pro Woche</div>
            <div className="wert">diese Woche {wochen.find((w) => w.woche === montag)?.anzahl ?? 0}</div>
          </div>
          <Sparkline werte={wochen.slice(-8).map((w) => w.anzahl)} />
          <div className="trend" />
        </Link>
      )}

      {/* ── Alle Einheiten (Bearbeiten/Löschen) ── */}
      <div className="abschnitt-titel">Alle Einheiten</div>
      {liste.length === 0 && <p className="gedaempft klein">Noch keine Einheiten erfasst.</p>}
      {(alleZeigen ? liste : liste.slice(0, 5)).map((e) => (
        <EinheitKurz key={e.id} einheit={e} zeigeDatum />
      ))}
      {liste.length > 5 && (
        <button className="knopf leise" onClick={() => setAlleZeigen((a) => !a)}>
          {alleZeigen ? 'Weniger anzeigen' : `Alle ${liste.length} anzeigen`}
        </button>
      )}
    </main>
  );
}
