/**
 * Startseite „Heute“: die Einheit(en) des Tages – unter Berücksichtigung von Verschiebungen.
 * An freien Tagen: Hinweis, nächste Einheit und „Heute trainieren?“ mit den offenen Einheiten.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { PlanTagKarte } from '../../components/PlanTagKarte';
import { SyncBadge } from '../../components/SyncBadge';
import { db } from '../../db/db';
import { planTag, starteEinheit, starteFreieEinheit } from '../../db/einheiten';
import { einheitVerschieben, usePlanung } from '../../db/verschiebungen';
import { formatTagKurz, formatTagLang, montagDerWoche } from '../../domain/dates';
import { einheitenAm, offeneEinheitenAb, wegVerschoben, type EffektiveEinheit } from '../../domain/wochenplan';
import { useHeute } from '../../hooks/daten';
import { audioVorbereiten } from '../../lib/feedback';
import { EinheitKurz } from '../einheit/EinheitKurz';
import { TagAktionen } from '../tag/TagAktionen';

export function HeuteSeite() {
  const heute = useHeute();
  const navigate = useNavigate();
  const planung = usePlanung();
  // Einheiten von heute, die zu keinem heutigen Plantag gehören (frei oder von anderem Tag nachgetragen)
  const sonstige = useLiveQuery(() => db.einheiten.where('datum').equals(heute).toArray(), [heute], []);

  if (!planung) return <main className="seite" />;

  const planEintrag = planung.plaene.find((p) => p.wocheVon === montagDerWoche(heute)) ?? null;
  const planTagHeute = planEintrag ? planTag(planEintrag.plan, heute) : undefined;
  const heuteGeplant = einheitenAm(planung.effektiv, heute);
  const wegVonHeute = wegVerschoben(planung.effektiv, heute);
  // Offene Einheiten ab Montag dieser Woche (auch verpasste), ohne die von heute
  const offen = offeneEinheitenAb(planung.effektiv, montagDerWoche(heute), planung.fertig).filter((e) => e.datum !== heute);
  const naechste = offen.find((e) => e.datum > heute) ?? null;
  const heutePlanDaten = new Set(heuteGeplant.map((e) => e.tag.datum));
  const weitere = sonstige.filter((e) => !e.planDatum || !heutePlanDaten.has(e.planDatum));

  const frei = async (typ: 'gym' | 'lauf') => {
    audioVorbereiten();
    const id = await starteFreieEinheit(typ, typ === 'lauf' ? 'Lauf – extra' : 'Gym – frei', heute);
    navigate(typ === 'lauf' ? `/lauf/${id}` : `/training/${id}`);
  };

  /** Offene Einheit auf heute holen und direkt starten. */
  const heuteMachen = async (e: EffektiveEinheit) => {
    audioVorbereiten();
    await einheitVerschieben(e.tag.datum, heute);
    const id = await starteEinheit(e.tag, heute);
    navigate(e.tag.typ === 'lauf' ? `/lauf/${id}` : `/training/${id}`);
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
          {planEintrag.quelle === 'tabelle' && planEintrag.jsonStatus === 'fehlt' && h.includes('Plan-Daten') && (
            <>
              {' '}
              <Link to="/plan-daten">Plan-Daten jetzt erzeugen …</Link>
            </>
          )}
        </div>
      ))}

      {/* Einheiten, die heute stattfinden (auch hierher verschobene) */}
      {heuteGeplant.map((e) => (
        <section key={e.tag.datum} className="stapel">
          <PlanTagKarte tag={e.tag} hervorheben />
          <TagAktionen eintrag={e} heute={heute} />
        </section>
      ))}

      {heuteGeplant.length === 0 && (
        <section className="karte">
          <h2 style={{ margin: 0 }}>{planTagHeute ? 'Heute frei 😌' : 'Kein Plan für heute'}</h2>
          {wegVonHeute.length > 0 && (
            <p className="gedaempft">
              {wegVonHeute.map((e) => `${e.tag.titel} ist auf ${formatTagKurz(e.datum)} verschoben.`).join(' ')}
            </p>
          )}
          {planTagHeute?.typ === 'ruhe' && <p className="gedaempft">{planTagHeute.hinweis ?? 'Erholung ist Teil des Trainings.'}</p>}
          {!planEintrag && (
            <p className="gedaempft">
              Für diese Woche ist noch kein Plan da. Sobald der Coach ihn ins Doc geschrieben hat, lädt die App ihn automatisch.
            </p>
          )}
        </section>
      )}

      {weitere.length > 0 && <h2 style={{ marginTop: 8 }}>Heute erfasst</h2>}
      {weitere.map((e) => (
        <EinheitKurz key={e.id} einheit={e} />
      ))}

      {/* Nächste Einheit (an freien Tagen ausführlich) */}
      {heuteGeplant.length === 0 && naechste && (
        <>
          <h2 style={{ marginTop: 8 }}>Nächste Einheit</h2>
          <PlanTagKarte tag={naechste.tag} zeigeDatum datum={naechste.datum} />
          <Link className="knopf block" to={`/tag/${naechste.tag.datum}`}>
            Ansehen · {formatTagKurz(naechste.datum)}
          </Link>
        </>
      )}

      {/* Heute lieber eine andere Einheit machen? */}
      {offen.length > 0 && (
        <section className="karte">
          <h3>{heuteGeplant.length ? 'Lieber etwas anderes?' : 'Heute trainieren?'}</h3>
          <p className="klein gedaempft">Holt die Einheit auf heute und startet sie. Der Plan im Doc bleibt, im Log steht „geplant für …“.</p>
          {offen.slice(0, 4).map((e) => (
            <div key={e.tag.datum} className="zeile zwischen">
              <div>
                <div className="fett">{e.tag.titel}</div>
                <div className="klein gedaempft">{formatTagKurz(e.datum)}</div>
              </div>
              <button className="knopf" onClick={() => void heuteMachen(e)}>
                Heute machen
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="stapel" style={{ marginTop: 8 }}>
        <div className="klein gedaempft">Zusätzlich trainiert?</div>
        <div className="zeile">
          <button className="knopf block" onClick={() => void frei('lauf')}>
            + Extra-Lauf
          </button>
          <button className="knopf block" onClick={() => void frei('gym')}>
            + Freies Training
          </button>
        </div>
      </section>
    </main>
  );
}
