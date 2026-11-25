/**
 * Verlauf – Detail (Variante A): eine Übung (bzw. Lauf, Gefühl, Einheiten pro Woche).
 * Kennzahl umschalten, Zeitraum wählen; der ausgewählte Wert steht fest über dem Diagramm.
 * Tippen oder Wischen im Diagramm (oder in der Liste) wählt einen Tag.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { IconZurueck } from '../../components/Icons';
import { VerlaufDiagramm, type DiagrammPunkt } from '../../components/VerlaufDiagramm';
import { formatDauer, formatDezimal, formatPace } from '../../domain/calc';
import { formatTagKurz, isoZuKurz, plusTage } from '../../domain/dates';
import { abDatum, einheitenProWoche, formatTausend, gefuehlVerlauf, paceVerlauf, uebungsVerlauf } from '../../domain/verlauf';
import { useHeute } from '../../hooks/daten';
import { mitVorzeichen, saetzeText, useVerlaufsDaten, ZEITRAEUME, type Zeitraum } from './daten';

interface Kennzahl {
  schluessel: string;
  text: string;
  art: 'linie' | 'balken';
  umgekehrt?: boolean;
  /** Werte im gewählten Zeitraum */
  punkte: DiagrammPunkt[];
  /** großer Wert über dem Diagramm */
  anzeige: (i: number) => { wert: string; einheit?: string };
  /** Vergleich mit dem Punkt davor */
  vergleich: (i: number) => string;
  /** Text einer Listenzeile */
  zeile: (i: number) => string;
  formatY: (n: number) => string;
  formatX?: (d: string) => string;
}

/** Eigener Zustand je Übung: beim Wechsel (z. B. Bankdrücken → Klimmzüge) startet die Ansicht neu. */
export function VerlaufDetailSeite() {
  const { art = 'uebung', name = '' } = useParams();
  return <VerlaufDetail key={`${art}/${name}`} art={art} name={decodeURIComponent(name)} />;
}

function VerlaufDetail({ art, name }: { art: string; name: string }) {
  const navigate = useNavigate();
  const heute = useHeute();
  const { eintraege } = useVerlaufsDaten();
  const [zeitraum, setZeitraum] = useState<Zeitraum>('3m');
  const [kennzahlWahl, setKennzahlWahl] = useState<string | null>(null);
  const [auswahl, setAuswahl] = useState<number | null>(null);

  const tage = ZEITRAEUME.find((z) => z.schluessel === zeitraum)?.tage ?? null;
  const ab = tage ? plusTage(heute, -tage) : null;
  const vorTag = (punkte: DiagrammPunkt[], i: number) => (i > 0 ? ` zum ${isoZuKurz(punkte[i - 1]!.datum)}` : '');

  // ── Kennzahlen je Art ──
  let titel = name;
  let kennzahlen: Kennzahl[] = [];
  if (art === 'uebung') {
    const daten = abDatum(uebungsVerlauf(eintraege, name), ab);
    const mitGewicht = daten.some((p) => p.topKg > 0);
    const gewicht: Kennzahl = {
      schluessel: 'gewicht',
      text: 'Gewicht',
      art: 'linie',
      punkte: daten.map((p) => ({ datum: p.datum, wert: p.topKg })),
      anzeige: (i) => ({ wert: `${formatDezimal(daten[i]!.topKg)} kg`, einheit: `× ${daten[i]!.wdhBeiTop}` }),
      vergleich: (i) => {
        if (i === 0) return 'erste Einheit im Zeitraum';
        const d = daten[i]!.topKg - daten[i - 1]!.topKg;
        const w = daten[i]!.wdhBeiTop - daten[i - 1]!.wdhBeiTop;
        return `${mitVorzeichen(d, ' kg')}${w !== 0 ? `, ${mitVorzeichen(w, ' Wdh.')}` : ''}${vorTag(gewicht.punkte, i)}`;
      },
      zeile: (i) => saetzeText(daten[i]!.saetze),
      formatY: (n) => formatDezimal(n),
    };
    const volumen: Kennzahl = {
      schluessel: 'volumen',
      text: 'Volumen',
      art: 'balken',
      punkte: daten.map((p) => ({ datum: p.datum, wert: p.volumen })),
      anzeige: (i) => ({ wert: formatTausend(daten[i]!.volumen), einheit: 'kg Volumen' }),
      vergleich: (i) => (i === 0 ? 'erste Einheit im Zeitraum' : `${mitVorzeichen(Math.round(daten[i]!.volumen - daten[i - 1]!.volumen), ' kg')}${vorTag(volumen.punkte, i)}`),
      zeile: (i) => `${saetzeText(daten[i]!.saetze)} · ${formatTausend(daten[i]!.volumen)} kg`,
      formatY: (n) => formatTausend(n),
    };
    const wdh: Kennzahl = {
      schluessel: 'wdh',
      text: 'Wdh.',
      art: 'linie',
      punkte: daten.map((p) => ({ datum: p.datum, wert: p.wdhGesamt })),
      anzeige: (i) => ({ wert: String(daten[i]!.wdhGesamt), einheit: 'Wdh. gesamt' }),
      vergleich: (i) => (i === 0 ? 'erste Einheit im Zeitraum' : `${mitVorzeichen(daten[i]!.wdhGesamt - daten[i - 1]!.wdhGesamt, ' Wdh.')}${vorTag(wdh.punkte, i)}`),
      zeile: (i) => saetzeText(daten[i]!.saetze),
      formatY: (n) => String(Math.round(n)),
    };
    kennzahlen = mitGewicht ? [gewicht, volumen, wdh] : [wdh];
  } else if (art === 'lauf') {
    titel = 'Laufen';
    const daten = abDatum(paceVerlauf(eintraege), ab);
    const pace: Kennzahl = {
      schluessel: 'pace',
      text: 'Pace',
      art: 'linie',
      umgekehrt: true,
      punkte: daten.map((p) => ({ datum: p.datum, wert: p.paceSek })),
      anzeige: (i) => ({ wert: formatPace(daten[i]!.paceSek), einheit: '/km' }),
      vergleich: (i) => {
        if (i === 0) return 'erster Lauf im Zeitraum';
        const d = daten[i]!.paceSek - daten[i - 1]!.paceSek;
        return d === 0 ? `gleiche Pace wie am ${isoZuKurz(daten[i - 1]!.datum)}` : `${Math.abs(d)} s ${d < 0 ? 'schneller' : 'langsamer'} als am ${isoZuKurz(daten[i - 1]!.datum)}`;
      },
      zeile: (i) => `${formatDezimal(daten[i]!.km)} km · ${formatDauer(daten[i]!.paceSek * daten[i]!.km)} · ${formatPace(daten[i]!.paceSek)} /km`,
      formatY: (n) => formatPace(n),
    };
    const distanz: Kennzahl = {
      schluessel: 'distanz',
      text: 'Distanz',
      art: 'balken',
      punkte: daten.map((p) => ({ datum: p.datum, wert: p.km })),
      anzeige: (i) => ({ wert: formatDezimal(daten[i]!.km), einheit: 'km' }),
      vergleich: (i) => (i === 0 ? 'erster Lauf im Zeitraum' : `${mitVorzeichen(daten[i]!.km - daten[i - 1]!.km, ' km')}${vorTag(distanz.punkte, i)}`),
      zeile: pace.zeile,
      formatY: (n) => formatDezimal(n, 1),
    };
    kennzahlen = [pace, distanz];
  } else if (art === 'gefuehl') {
    titel = 'Gefühl';
    const daten = abDatum(gefuehlVerlauf(eintraege), ab);
    const g: Kennzahl = {
      schluessel: 'gefuehl',
      text: 'Gefühl',
      art: 'linie',
      punkte: daten.map((p) => ({ datum: p.datum, wert: p.gefuehl })),
      anzeige: (i) => ({ wert: String(daten[i]!.gefuehl), einheit: '/ 10' }),
      vergleich: (i) => (i === 0 ? '1 = sehr leicht · 10 = Maximum' : `${mitVorzeichen(daten[i]!.gefuehl - daten[i - 1]!.gefuehl, '')}${vorTag(g.punkte, i)}`),
      zeile: (i) => `Gefühl ${daten[i]!.gefuehl}`,
      formatY: (n) => String(Math.round(n)),
    };
    kennzahlen = [g];
  } else {
    titel = 'Einheiten pro Woche';
    const daten = abDatum(einheitenProWoche(eintraege).map((w) => ({ datum: w.woche, anzahl: w.anzahl })), ab);
    const w: Kennzahl = {
      schluessel: 'wochen',
      text: 'Einheiten',
      art: 'balken',
      punkte: daten.map((p) => ({ datum: p.datum, wert: p.anzahl })),
      anzeige: (i) => ({ wert: String(daten[i]!.anzahl), einheit: daten[i]!.anzahl === 1 ? 'Einheit' : 'Einheiten' }),
      vergleich: (i) => (i === 0 ? `Woche ab ${isoZuKurz(daten[0]!.datum)}` : `${mitVorzeichen(daten[i]!.anzahl - daten[i - 1]!.anzahl, '')} zur Vorwoche`),
      zeile: (i) => `${daten[i]!.anzahl} ${daten[i]!.anzahl === 1 ? 'Einheit' : 'Einheiten'}`,
      formatY: (n) => String(Math.round(n)),
      formatX: (d) => `ab ${isoZuKurz(d)}`,
    };
    kennzahlen = [w];
  }

  const kz = kennzahlen.find((k) => k.schluessel === kennzahlWahl) ?? kennzahlen[0]!;
  const n = kz.punkte.length;
  const sel = auswahl !== null && auswahl < n ? auswahl : n - 1;
  const anzeige = n > 0 ? kz.anzeige(sel) : null;
  const formatX = kz.formatX ?? formatTagKurz;

  return (
    <main className="seite">
      <header className="kopf-links">
        <button className="knopf icon leise" onClick={() => navigate(-1)} aria-label="Zurück zum Verlauf">
          <IconZurueck />
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>{titel}</h1>
          <div className="klein gedaempft">
            {n} {art === 'wochen' ? 'Wochen' : art === 'lauf' ? 'Läufe' : 'Einheiten'} im Zeitraum
          </div>
        </div>
      </header>

      {kennzahlen.length > 1 && (
        <div className="segment" role="tablist" aria-label="Kennzahl">
          {kennzahlen.map((k) => (
            <button
              key={k.schluessel}
              role="tab"
              aria-selected={k === kz}
              className={k === kz ? 'aktiv' : ''}
              onClick={() => {
                setKennzahlWahl(k.schluessel);
                setAuswahl(null);
              }}
            >
              {k.text}
            </button>
          ))}
        </div>
      )}

      {/* Fester Wert über dem Diagramm – statt Pop-up */}
      {anzeige ? (
        <div aria-live="polite">
          <div className="klein gedaempft">{formatX(kz.punkte[sel]!.datum)}</div>
          <div className="anzeige-wert">
            {anzeige.wert} {anzeige.einheit && <small>{anzeige.einheit}</small>}
          </div>
          <div className="klein gedaempft">{kz.vergleich(sel)}</div>
        </div>
      ) : (
        <div className="hinweis">Im gewählten Zeitraum gibt es noch keine Daten.</div>
      )}

      {n > 0 && (
        <VerlaufDiagramm
          punkte={kz.punkte}
          art={kz.art}
          auswahl={sel}
          onAuswahl={setAuswahl}
          formatY={kz.formatY}
          formatX={kz.formatX}
          umgekehrt={kz.umgekehrt}
          beschriftung={`${titel}: ${kz.text}`}
        />
      )}

      <div className="zeile umbruch" style={{ justifyContent: 'center' }}>
        {ZEITRAEUME.map((z) => (
          <button
            key={z.schluessel}
            className={`chip${zeitraum === z.schluessel ? ' aktiv' : ''}`}
            onClick={() => {
              setZeitraum(z.schluessel);
              setAuswahl(null);
            }}
          >
            {z.text}
          </button>
        ))}
      </div>

      {n > 0 && (
        <>
          <div className="abschnitt-titel">{art === 'wochen' ? 'Wochen' : 'Einheiten'}</div>
          <section className="karte" style={{ paddingTop: 2, paddingBottom: 2 }}>
            {kz.punkte
              .map((p, i) => ({ p, i }))
              .reverse()
              .map(({ p, i }) => (
                <button key={p.datum + i} className={`verlauf-zeile${i === sel ? ' aktiv' : ''}`} onClick={() => setAuswahl(i)}>
                  <span className="fett">{formatX(p.datum)}</span>
                  <span className="gedaempft">{kz.zeile(i)}</span>
                </button>
              ))}
          </section>
        </>
      )}
    </main>
  );
}
