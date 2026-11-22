/** Detail eines Plantags (aus der Wochenansicht geöffnet). */
import { useNavigate, useParams } from 'react-router';
import { IconZurueck } from '../../components/Icons';
import { PlanTagKarte } from '../../components/PlanTagKarte';
import { planTag } from '../../db/einheiten';
import { formatTagLang } from '../../domain/dates';
import { useHeute, usePlanFuerDatum } from '../../hooks/daten';
import { TagAktionen } from './TagAktionen';

export function TagSeite() {
  const { datum = '' } = useParams();
  const navigate = useNavigate();
  const heute = useHeute();
  const planEintrag = usePlanFuerDatum(datum);
  if (planEintrag === undefined) return <main className="seite" />;
  const tag = planEintrag ? planTag(planEintrag.plan, datum) : undefined;

  return (
    <main className="seite">
      <header className="kopf-links">
        <button className="knopf icon leise" onClick={() => navigate(-1)} aria-label="Zurück">
          <IconZurueck />
        </button>
        <div>
          <h1>{formatTagLang(datum)}</h1>
        </div>
      </header>
      {!tag ? (
        <div className="hinweis warn">Für diesen Tag gibt es keinen Plan.</div>
      ) : (
        <>
          <PlanTagKarte tag={tag} />
          {tag.typ === 'ruhe' ? <div className="hinweis">Ruhetag.</div> : <TagAktionen tag={tag} heute={heute} />}
        </>
      )}
    </main>
  );
}
