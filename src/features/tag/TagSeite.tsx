/** Detail einer Einheit des Plans (aus der Wochenansicht geöffnet). Der Pfad enthält das Plandatum. */
import { useNavigate, useParams } from 'react-router';
import { IconZurueck } from '../../components/Icons';
import { PlanTagKarte } from '../../components/PlanTagKarte';
import { planTag } from '../../db/einheiten';
import { usePlanung } from '../../db/verschiebungen';
import { formatTagKurz, formatTagLang } from '../../domain/dates';
import { useHeute, usePlanFuerDatum } from '../../hooks/daten';
import { TagAktionen } from './TagAktionen';

export function TagSeite() {
  const { datum = '' } = useParams();
  const navigate = useNavigate();
  const heute = useHeute();
  const planEintrag = usePlanFuerDatum(datum);
  const planung = usePlanung();
  if (planEintrag === undefined || !planung) return <main className="seite" />;
  const tag = planEintrag ? planTag(planEintrag.plan, datum) : undefined;
  const eintrag = planung.effektiv.find((e) => e.tag.datum === datum);

  return (
    <main className="seite">
      <header className="kopf-links">
        <button className="knopf icon leise" onClick={() => navigate(-1)} aria-label="Zurück">
          <IconZurueck />
        </button>
        <div>
          <h1>{formatTagLang(eintrag?.datum ?? datum)}</h1>
          {eintrag?.verschobenVon && <div className="klein gedaempft">geplant für {formatTagKurz(eintrag.verschobenVon)}</div>}
        </div>
      </header>
      {!tag ? (
        <div className="hinweis warn">Für diesen Tag gibt es keinen Plan.</div>
      ) : (
        <>
          <PlanTagKarte tag={tag} tauschbar={tag.typ === 'gym'} />
          {tag.typ === 'ruhe' || !eintrag ? <div className="hinweis">Ruhetag.</div> : <TagAktionen eintrag={eintrag} heute={heute} />}
        </>
      )}
    </main>
  );
}
