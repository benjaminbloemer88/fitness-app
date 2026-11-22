/**
 * Startseite „Heute“: die Einheit des Tages. An Ruhetagen ein Hinweis und die nächste Einheit.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { PlanTagKarte } from '../../components/PlanTagKarte';
import { SyncBadge } from '../../components/SyncBadge';
import { db } from '../../db/db';
import { planTag, starteFreieEinheit } from '../../db/einheiten';
import { formatTagKurz, formatTagLang } from '../../domain/dates';
import type { PlanTag } from '../../domain/planSchema';
import { useAllePlaene, useHeute, usePlanFuerDatum } from '../../hooks/daten';
import { audioVorbereiten } from '../../lib/feedback';
import { EinheitKurz } from '../einheit/EinheitKurz';
import { TagAktionen } from '../tag/TagAktionen';

/** Nächster noch offener Trainingstag nach `heute` über alle gespeicherten Pläne. */
function naechsteEinheit(plaene: { plan: { tage: PlanTag[] } }[], heute: string, erledigt: Set<string>): PlanTag | null {
  const tage = plaene
    .flatMap((p) => p.plan.tage)
    .filter((t) => t.typ !== 'ruhe' && t.datum > heute && !erledigt.has(t.datum))
    .sort((a, b) => a.datum.localeCompare(b.datum));
  return tage[0] ?? null;
}

export function HeuteSeite() {
  const heute = useHeute();
  const navigate = useNavigate();
  const planEintrag = usePlanFuerDatum(heute);
  const plaene = useAllePlaene();
  // Freie Einheiten von heute (ohne Plantag)
  const freie = useLiveQuery(() => db.einheiten.where('datum').equals(heute).filter((e) => e.planDatum === null).toArray(), [heute], []);
  // Plantage, die schon erledigt/ausgelassen sind (z. B. vorgezogen) – und was heute schon vorgezogen wurde
  const fertigeEinheiten = useLiveQuery(() => db.einheiten.where('status').anyOf('abgeschlossen', 'ausgelassen').toArray(), [], []);
  const erledigt = new Set(fertigeEinheiten.flatMap((e) => (e.planDatum ? [e.planDatum] : [])));
  const heuteVorgezogen = fertigeEinheiten.filter((e) => e.datum === heute && e.planDatum !== null && e.planDatum !== heute);

  if (planEintrag === undefined) return <main className="seite" />;

  const tag = planEintrag ? planTag(planEintrag.plan, heute) : undefined;
  const naechste = naechsteEinheit(plaene, heute, erledigt);

  const frei = async (typ: 'gym' | 'lauf') => {
    audioVorbereiten();
    const id = await starteFreieEinheit(typ, typ === 'lauf' ? 'Lauf – extra' : 'Gym – frei', heute);
    navigate(typ === 'lauf' ? `/lauf/${id}` : `/training/${id}`);
  };

  return (
    <main className="seite">
      <header className="kopf">
        <div>
          <h1>Heute</h1>
          <div className="unterzeile">{formatTagLang(heute)}</div>
        </div>
        <SyncBadge />
      </header>

      {planEintrag?.hinweise.map((h) => (
        <div key={h} className={`hinweis${planEintrag.quelle === 'testdaten' ? '' : ' warn'}`}>
          {h}
        </div>
      ))}

      {tag && tag.typ !== 'ruhe' && (
        <>
          <PlanTagKarte tag={tag} hervorheben />
          <TagAktionen tag={tag} heute={heute} />
        </>
      )}

      {tag?.typ === 'ruhe' && (
        <section className="karte">
          <h2 style={{ margin: 0 }}>Ruhetag 😌</h2>
          <p className="gedaempft">{tag.hinweis ?? 'Erholung ist Teil des Trainings.'}</p>
        </section>
      )}

      {!tag && (
        <div className="hinweis warn">
          {naechste
            ? `Für diese Woche gibt es keinen Plan. Nächste offene Einheit: ${formatTagKurz(naechste.datum)}`
            : 'Kein aktueller Plan vorhanden. Sobald der Coach den neuen Plan ins Doc geschrieben hat: Einstellungen → „Plan neu laden“.'}
        </div>
      )}

      {(!tag || tag.typ === 'ruhe') && naechste && (
        <>
          <h2 style={{ marginTop: 8 }}>Nächste Einheit</h2>
          <PlanTagKarte tag={naechste} zeigeDatum />
          {/* Am Tag ohne Plan darf man die nächste Einheit direkt vorziehen */}
          {!tag ? (
            <TagAktionen tag={naechste} heute={heute} />
          ) : (
            <Link className="knopf block" to={`/tag/${naechste.datum}`}>
              Ansehen
            </Link>
          )}
        </>
      )}

      {heuteVorgezogen.length > 0 && <h2 style={{ marginTop: 8 }}>Heute erledigt</h2>}
      {heuteVorgezogen.map((e) => (
        <EinheitKurz key={e.id} einheit={e} />
      ))}

      {freie.map((e) => (
        <EinheitKurz key={e.id} einheit={e} />
      ))}

      <section className="stapel" style={{ marginTop: 8 }}>
        <div className="klein gedaempft">Zusätzlich trainiert?</div>
        <div className="zeile">
          <button className="knopf block" onClick={() => frei('lauf')}>
            + Extra-Lauf
          </button>
          <button className="knopf block" onClick={() => frei('gym')}>
            + Freies Training
          </button>
        </div>
      </section>
    </main>
  );
}
