/**
 * Wochenansicht: Plan Mo–So mit Status je Tag (erledigt / offen / ausgelassen / Ruhe).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { IconWeiter, IconZurueck } from '../../components/Icons';
import { SyncBadge } from '../../components/SyncBadge';
import { db } from '../../db/db';
import { isoZuDeutsch, isoZuKurz, montagDerWoche, plusTage, WOCHENTAGE_KURZ, wochentagIndex } from '../../domain/dates';
import type { Einheit } from '../../domain/einheit';
import type { PlanTag } from '../../domain/planSchema';
import { useAllePlaene, useHeute } from '../../hooks/daten';

const QUELLE_TEXT = { json: 'aus Plan-Daten (JSON)', tabelle: 'aus der Plantabelle', testdaten: 'Testdaten' } as const;

function tagStatus(tag: PlanTag, einheiten: Einheit[], heute: string) {
  if (tag.typ === 'ruhe') return <span className="gedaempft">–</span>;
  const zumTag = einheiten.filter((e) => e.planDatum === tag.datum);
  if (zumTag.some((e) => e.status === 'abgeschlossen')) return <span className="abzeichen ok">✓ erledigt</span>;
  if (zumTag.some((e) => e.status === 'ausgelassen')) return <span className="abzeichen fehler">✗ ausgelassen</span>;
  if (zumTag.some((e) => e.status === 'laeuft')) return <span className="abzeichen info">läuft</span>;
  return <span className={`abzeichen${tag.datum < heute ? ' warn' : ''}`}>○ offen</span>;
}

export function WocheSeite() {
  const heute = useHeute();
  const plaene = useAllePlaene();
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);

  // Standard: aktuelle Woche, sonst die nächstliegende Woche mit Plan
  const wochen = plaene.map((p) => p.wocheVon).sort();
  const aktuelleWoche = montagDerWoche(heute);
  const standard = wochen.includes(aktuelleWoche) ? aktuelleWoche : (wochen.find((w) => w > aktuelleWoche) ?? wochen.at(-1) ?? aktuelleWoche);
  const wocheVon = gewaehlt ?? standard;
  const eintrag = plaene.find((p) => p.wocheVon === wocheVon);
  const index = wochen.indexOf(wocheVon);

  const einheiten = useLiveQuery(
    () => db.einheiten.where('datum').between(wocheVon, plusTage(wocheVon, 6), true, true).toArray(),
    [wocheVon],
    [],
  );
  // Einheiten, die zu Plantagen dieser Woche gehören (auch wenn an anderem Datum erfasst)
  const zuPlantagen = useLiveQuery(
    () => db.einheiten.where('planDatum').between(wocheVon, plusTage(wocheVon, 6), true, true).toArray(),
    [wocheVon],
    [],
  );
  const extras = einheiten.filter((e) => e.planDatum === null);

  return (
    <main className="seite">
      <header className="kopf">
        <div>
          <h1>Woche</h1>
          <div className="unterzeile">
            {isoZuKurz(wocheVon)} – {isoZuDeutsch(plusTage(wocheVon, 6))}
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

      {eintrag?.plan.tage.map((tag) => (
        <Link key={tag.datum} to={`/tag/${tag.datum}`} className={`wochentag${tag.datum === heute ? ' heute' : ''}`}>
          <div className="datum">
            {WOCHENTAGE_KURZ[wochentagIndex(tag.datum)]}
            <div className="klein gedaempft">{isoZuKurz(tag.datum)}</div>
          </div>
          <div>
            <div className="fett">{tag.titel}</div>
            {tag.dauer_min !== null && <div className="klein gedaempft">ca. {tag.dauer_min} Min.</div>}
          </div>
          {tagStatus(tag, zuPlantagen, heute)}
        </Link>
      ))}

      {extras.length > 0 && (
        <section className="stapel">
          <h2>Zusätzlich</h2>
          {extras.map((e) => (
            <div key={e.id} className="wochentag">
              <div className="datum">
                {WOCHENTAGE_KURZ[wochentagIndex(e.datum)]}
                <div className="klein gedaempft">{isoZuKurz(e.datum)}</div>
              </div>
              <div className="fett">{e.titel}</div>
              <span className="abzeichen ok">✓</span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
