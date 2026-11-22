/**
 * Wochenansicht: Mo–So mit den Einheiten an ihrem (ggf. verschobenen) Tag
 * und Status je Einheit (erledigt / offen / ausgelassen).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { IconWeiter, IconZurueck } from '../../components/Icons';
import { SyncBadge } from '../../components/SyncBadge';
import { db } from '../../db/db';
import { usePlanung } from '../../db/verschiebungen';
import { formatTagKurz, isoZuDeutsch, isoZuKurz, montagDerWoche, plusTage, WOCHENTAGE_KURZ, wochentagIndex } from '../../domain/dates';
import type { Einheit } from '../../domain/einheit';
import type { PlanTag } from '../../domain/planSchema';
import { einheitenAm } from '../../domain/wochenplan';
import { useHeute } from '../../hooks/daten';

const QUELLE_TEXT = { json: 'aus Plan-Daten (JSON)', tabelle: 'aus der Plantabelle', testdaten: 'Testdaten' } as const;

function status(tag: PlanTag, einheiten: Einheit[], datum: string, heute: string) {
  const zumTag = einheiten.filter((e) => e.planDatum === tag.datum);
  if (zumTag.some((e) => e.status === 'abgeschlossen')) return <span className="abzeichen ok">✓ erledigt</span>;
  if (zumTag.some((e) => e.status === 'ausgelassen')) return <span className="abzeichen fehler">✗ ausgelassen</span>;
  if (zumTag.some((e) => e.status === 'laeuft')) return <span className="abzeichen info">läuft</span>;
  return <span className={`abzeichen${datum < heute ? ' warn' : ''}`}>○ offen</span>;
}

function Datum({ datum }: { datum: string }) {
  return (
    <div className="datum">
      {WOCHENTAGE_KURZ[wochentagIndex(datum)]}
      <div className="klein gedaempft">{isoZuKurz(datum)}</div>
    </div>
  );
}

export function WocheSeite() {
  const heute = useHeute();
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
  const tageDerWoche = Array.from({ length: 7 }, (_, i) => plusTage(wocheVon, i));
  // Einheiten dieser Planwoche, die in eine andere Woche verschoben wurden
  const ausserhalb = planung.effektiv.filter((e) => e.tag.datum >= wocheVon && e.tag.datum <= wocheBis && (e.datum < wocheVon || e.datum > wocheBis));
  const extras = einheiten.filter((e) => e.planDatum === null);

  return (
    <main className="seite">
      <header className="kopf">
        <div>
          <h1>Woche</h1>
          <div className="unterzeile">
            {isoZuKurz(wocheVon)} – {isoZuDeutsch(wocheBis)}
          </div>
        </div>
        <SyncBadge />
      </header>

      <div className="zeile zwischen">
        <button className="knopf icon" disabled={index <= 0} onClick={() => setGewaehlt(wochen[index - 1] ?? null)} aria-label="Vorige Woche">
          <IconZurueck />
        </button>
        <span className="klein gedaempft">{eintrag ? `Plan ${QUELLE_TEXT[eintrag.quelle]}` : 'kein Plan'}</span>
        <button
          className="knopf icon"
          disabled={index < 0 || index >= wochen.length - 1}
          onClick={() => setGewaehlt(wochen[index + 1] ?? null)}
          aria-label="Nächste Woche"
        >
          <IconWeiter />
        </button>
      </div>

      {!eintrag && <div className="hinweis warn">Für diese Woche ist kein Plan gespeichert.</div>}

      {eintrag &&
        tageDerWoche.map((datum) => {
          const dort = einheitenAm(planung.effektiv, datum);
          if (dort.length === 0) {
            const plantag = eintrag.plan.tage.find((t) => t.datum === datum);
            const weg = planung.effektiv.find((e) => e.verschobenVon === datum);
            return (
              <div key={datum} className={`wochentag${datum === heute ? ' heute' : ''}`}>
                <Datum datum={datum} />
                <div>
                  <div className="fett">{weg ? 'frei' : (plantag?.titel ?? 'Ruhetag')}</div>
                  {weg && <div className="klein gedaempft">{weg.tag.titel} → {formatTagKurz(weg.datum)}</div>}
                </div>
                <span className="gedaempft">–</span>
              </div>
            );
          }
          return dort.map((e) => (
            <Link key={e.tag.datum} to={`/tag/${e.tag.datum}`} className={`wochentag${datum === heute ? ' heute' : ''}`}>
              <Datum datum={datum} />
              <div>
                <div className="fett">{e.tag.titel}</div>
                <div className="klein gedaempft">
                  {e.verschobenVon ? `↷ von ${formatTagKurz(e.verschobenVon)}` : e.tag.dauer_min !== null ? `ca. ${e.tag.dauer_min} Min.` : ''}
                </div>
              </div>
              {status(e.tag, einheiten, datum, heute)}
            </Link>
          ));
        })}

      {ausserhalb.length > 0 && (
        <section className="stapel">
          <h2>In eine andere Woche verschoben</h2>
          {ausserhalb.map((e) => (
            <Link key={e.tag.datum} to={`/tag/${e.tag.datum}`} className="wochentag">
              <Datum datum={e.datum} />
              <div>
                <div className="fett">{e.tag.titel}</div>
                <div className="klein gedaempft">↷ von {formatTagKurz(e.tag.datum)}</div>
              </div>
              {status(e.tag, einheiten, e.datum, heute)}
            </Link>
          ))}
        </section>
      )}

      {extras.length > 0 && (
        <section className="stapel">
          <h2>Zusätzlich</h2>
          {extras.map((e) => (
            <div key={e.id} className="wochentag">
              <Datum datum={e.datum} />
              <div className="fett">{e.titel}</div>
              <span className="abzeichen ok">✓</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
