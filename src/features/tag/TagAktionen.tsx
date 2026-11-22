/**
 * Aktionen zu einem Plantag: starten / weiter / nachtragen / vorziehen / ausgelassen,
 * plus die bereits erfassten Einheiten dieses Tages.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router';
import { einheitenZumTag, starteEinheit } from '../../db/einheiten';
import type { PlanTag } from '../../domain/planSchema';
import { audioVorbereiten } from '../../lib/feedback';
import { EinheitKurz } from '../einheit/EinheitKurz';

export function TagAktionen({ tag, heute }: { tag: PlanTag; heute: string }) {
  const navigate = useNavigate();
  const einheiten = useLiveQuery(() => einheitenZumTag(tag.datum), [tag.datum], []);
  if (tag.typ === 'ruhe') return null;

  const laufend = einheiten.find((e) => e.status === 'laeuft');
  const fertig = einheiten.filter((e) => e.status !== 'laeuft');

  const starten = async () => {
    audioVorbereiten(); // erster Tipp → Ton für den Pausen-Timer freischalten
    // Vergangene Tage werden mit ihrem Plandatum nachgetragen, sonst gilt heute.
    const datum = tag.datum < heute ? tag.datum : heute;
    const id = await starteEinheit(tag, datum);
    navigate(tag.typ === 'lauf' ? `/lauf/${id}` : `/training/${id}`);
  };

  const startText =
    tag.datum < heute ? 'Nachtragen' : tag.datum > heute ? 'Heute vorziehen' : tag.typ === 'lauf' ? 'Lauf erfassen' : 'Training starten';

  return (
    <div className="stapel">
      {fertig.map((e) => (
        <EinheitKurz key={e.id} einheit={e} />
      ))}
      {laufend ? (
        <button className="knopf primaer gross block" onClick={() => navigate(laufend.typ === 'lauf' ? `/lauf/${laufend.id}` : `/training/${laufend.id}`)}>
          Weiter: {laufend.titel}
        </button>
      ) : (
        fertig.length === 0 && (
          <>
            <button className={`knopf gross block${tag.datum > heute ? '' : ' primaer'}`} onClick={starten}>
              {startText}
            </button>
            <button className="knopf block leise" onClick={() => navigate(`/auslassen/${tag.datum}`)}>
              Einheit ausgelassen …
            </button>
          </>
        )
      )}
    </div>
  );
}
