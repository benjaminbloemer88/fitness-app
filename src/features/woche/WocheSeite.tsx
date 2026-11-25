/**
 * Wochenansicht (Variante B): oben eine Wochenleiste Mo–So mit Punkten je Einheit,
 * darunter „Als Nächstes“ als Karten und „Erledigt“ als kompakte Liste.
 * Ruhetage und freie Tage erscheinen nur in der Leiste.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { IconHaken, IconHeute, IconKreuz, IconLauf, IconWeiter, IconZurueck } from '../../components/Icons';
import { SyncBadge } from '../../components/SyncBadge';
import { db } from '../../db/db';
import { usePlanung } from '../../db/verschiebungen';
import { formatDezimal } from '../../domain/calc';
import { formatTagKurz, isoZuDeutsch, isoZuKurz, montagDerWoche, plusTage, WOCHENTAGE_KURZ, zerlegeIso } from '../../domain/dates';
import type { EffektiveEinheit } from '../../domain/wochenplan';
import { useHeute } from '../../hooks/daten';
import { kurzTitel as kurzTitelVonTag, planStatus } from '../../lib/anzeige';

const QUELLE_TEXT = { json: 'Plan aus Plan-Daten (JSON)', tabelle: 'Plan aus der Plantabelle', testdaten: 'Testdaten' } as const;

const statusVon = planStatus;
const kurzTitel = (e: EffektiveEinheit) => kurzTitelVonTag(e.tag);

function TypIcon({ typ }: { typ: 'gym' | 'lauf' | 'ruhe' }) {
  return <div className={`icon-kachel ${typ === 'lauf' ? 'lauf' : 'gym'}`}>{typ === 'lauf' ? <IconLauf /> : <IconHeute />}</div>;
}

export function WocheSeite() {
  const heute = useHeute();
  const navigate = useNavigate();
  const planung = usePlanung();
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);

  const wochen = (planung?.plaene ?? []).map((p) => p.wocheVon).sort();
  const aktuelleWoche = montagDerWoche(heute);
  const standard = wochen.includes(aktuelleWoche) ? aktuelleWoche : (wochen.find((w) => w > aktuelleWoche) ?? wochen.at(-1) ?? aktuelleWoche);
  const wocheVon = gewaehlt ?? standard;
  const wocheBis = plusTage(wocheVon, 6);
  const index = wochen.indexOf(wocheVon);

  // Einheiten, die in dieser Woche erfasst wurden oder zu ihren Plantagen gehören
  const einheiten = useLiveQuery(
    async () => {
      const [nachDatum, nachPlan] = await Promise.all([
        db.einheiten.where('datum').between(wocheVon, wocheBis, true, true).toArray(),
        db.einheiten.where('planDatum').between(wocheVon, wocheBis, true, true).toArray(),
      ]);
      return [...new Map([...nachDatum, ...nachPlan].map((e) => [e.id, e])).values()];
    },
    [wocheVon],
    [],
  );

  if (!planung) return <main className="seite" />;
  const eintrag = planung.plaene.find((p) => p.wocheVon === wocheVon);
  const inWoche = (d: string) => d >= wocheVon && d <= wocheBis;

  // Alle Einheiten dieser Planwoche – plus solche, die aus einer anderen Woche hierher verschoben wurden
  const einheitenDerWoche = planung.effektiv.filter((e) => inWoche(e.tag.datum) || inWoche(e.datum));
  const mitStatus = einheitenDerWoche.map((e) => ({ e, status: statusVon(e.tag.datum, einheiten) }));
  const offen = mitStatus.filter((x) => x.status === 'offen' || x.status === 'laeuft').sort((a, b) => a.e.datum.localeCompare(b.e.datum));
  const fertig = mitStatus.filter((x) => x.status === 'erledigt' || x.status === 'ausgelassen').sort((a, b) => a.e.datum.localeCompare(b.e.datum));
  const extras = einheiten.filter((e) => e.planDatum === null && e.status !== 'laeuft');
  const erledigtAnzahl = mitStatus.filter((x) => x.status === 'erledigt').length;
  const tage = Array.from({ length: 7 }, (_, i) => plusTage(wocheVon, i));

  return (
    <main className="seite">
      <header className="kopf">
        <div>
          <h1>Woche</h1>
          <div className="unterzeile">
            {einheitenDerWoche.length > 0 ? `${erledigtAnzahl} von ${einheitenDerWoche.length} Einheiten erledigt` : 'kein Training geplant'}
          </div>
        </div>
        <SyncBadge />
      </header>

      <div className="wochen-navi">
        <button className="knopf icon leise" disabled={index <= 0} onClick={() => setGewaehlt(wochen[index - 1] ?? null)} aria-label="Vorige Woche">
          <IconZurueck />
        </button>
        <span className="fett">
          {isoZuKurz(wocheVon)} – {isoZuDeutsch(wocheBis)}
        </span>
        <button
          className="knopf icon leise"
          disabled={index < 0 || index >= wochen.length - 1}
          onClick={() => setGewaehlt(wochen[index + 1] ?? null)}
          aria-label="Nächste Woche"
        >
          <IconWeiter />
        </button>
      </div>

      {/* Wochenleiste: ein Punkt je Einheit – gefüllt = erledigt, Ring = offen */}
      <div className="wochenleiste" role="list" aria-label="Tage der Woche">
        {tage.map((datum, i) => {
          const amTag = mitStatus.filter((x) => x.e.datum === datum);
          const beschreibung = amTag.length
            ? amTag.map((x) => `${kurzTitel(x.e)}: ${x.status === 'erledigt' ? 'erledigt' : x.status === 'ausgelassen' ? 'ausgelassen' : 'offen'}`).join(', ')
            : 'frei';
          return (
            <button
              key={datum}
              role="listitem"
              className={`tag-pill${datum === heute ? ' heute' : ''}`}
              disabled={amTag.length === 0}
              onClick={() => amTag[0] && navigate(`/tag/${amTag[0].e.tag.datum}`)}
              aria-label={`${WOCHENTAGE_KURZ[i]} ${isoZuKurz(datum)}: ${beschreibung}`}
            >
              <span className="wt">{WOCHENTAGE_KURZ[i]}</span>
              <span className="nr">{zerlegeIso(datum).tag}</span>
              <span className="punkte">
                {amTag.slice(0, 3).map(({ e, status }) => {
                  const art = status === 'ausgelassen' ? 'ausgelassen' : status === 'offen' && datum < heute ? 'verpasst' : e.tag.typ === 'lauf' ? 'lauf' : 'gym';
                  return <span key={e.tag.datum} className={`punkt ${art}${status === 'erledigt' || status === 'ausgelassen' ? ' voll' : ''}`} />;
                })}
              </span>
            </button>
          );
        })}
      </div>

      {!eintrag && einheitenDerWoche.length === 0 && <div className="hinweis warn">Für diese Woche ist kein Plan gespeichert.</div>}

      {/* Als Nächstes */}
      {offen.length > 0 && <div className="abschnitt-titel">Als Nächstes</div>}
      {offen.map(({ e, status }, i) => {
        const meta =
          e.tag.typ === 'lauf'
            ? [e.tag.lauf ? `${formatDezimal(e.tag.lauf.distanz_km)} km` : null, e.tag.dauer_min ? `${e.tag.dauer_min} Min` : null]
            : [e.tag.dauer_min ? `${e.tag.dauer_min} Min` : null, `${e.tag.uebungen.length} Übungen`];
        return (
          <Link key={e.tag.datum} to={`/tag/${e.tag.datum}`} className={`einheit-karte${i === 0 ? ' naechste' : ''}`}>
            <TypIcon typ={e.tag.typ} />
            <div>
              <div className="titel">{kurzTitel(e)}</div>
              <div className="meta">
                <span>{[formatTagKurz(e.datum), ...meta].filter(Boolean).join(' · ')}</span>
                {status === 'laeuft' && <span className="mini-chip" style={{ color: 'var(--info)' }}>läuft</span>}
                {e.datum === heute && status !== 'laeuft' && <span className="mini-chip" style={{ color: 'var(--akzent)' }}>heute</span>}
                {e.datum < heute && <span className="mini-chip" style={{ color: 'var(--warn)' }}>verpasst</span>}
                {e.verschobenVon && <span>↷ von {formatTagKurz(e.verschobenVon)}</span>}
              </div>
            </div>
            <IconWeiter width={20} height={20} className="gedaempft" />
          </Link>
        );
      })}

      {/* Erledigt */}
      {(fertig.length > 0 || extras.length > 0) && <div className="abschnitt-titel">Erledigt</div>}
      {(fertig.length > 0 || extras.length > 0) && (
        <div className="erledigt-liste">
          {fertig.map(({ e, status }) => (
            <Link key={e.tag.datum} to={`/tag/${e.tag.datum}`} className="erledigt-zeile">
              <span>
                <span className="fett">{kurzTitel(e)}</span>
                <span className="gedaempft">
                  {' '}
                  · {formatTagKurz(e.datum)}
                  {e.verschobenVon ? ` · ↷ von ${formatTagKurz(e.verschobenVon)}` : ''}
                  {status === 'ausgelassen' ? ' · ausgelassen' : ''}
                </span>
              </span>
              {status === 'erledigt' ? <IconHaken style={{ color: 'var(--ok)' }} aria-label="erledigt" /> : <IconKreuz style={{ color: 'var(--fehler)' }} aria-label="ausgelassen" />}
            </Link>
          ))}
          {extras.map((e) => (
            <div key={e.id} className="erledigt-zeile">
              <span>
                <span className="fett">{e.titel}</span>
                <span className="gedaempft"> · {formatTagKurz(e.datum)} · extra</span>
              </span>
              <IconHaken style={{ color: 'var(--ok)' }} aria-label="erledigt" />
            </div>
          ))}
        </div>
      )}

      {offen.length === 0 && fertig.length > 0 && <div className="hinweis ok">Alle Einheiten dieser Woche sind erledigt. 💪</div>}

      {eintrag && <p className="klein gedaempft zentriert">{QUELLE_TEXT[eintrag.quelle]}</p>}
    </main>
  );
}
