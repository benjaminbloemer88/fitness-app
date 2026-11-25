/**
 * Startseite „Heute“ (Variante B): Datum über dem Titel der Einheit, die Übungen mit Fotos,
 * der Startknopf unten fixiert (mit dem Daumen erreichbar).
 * An freien Tagen: Hinweis, nächste Einheit und „Heute trainieren?“.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import { IconHaken, IconHeute, IconKreuz, IconLauf, IconWeiter } from '../../components/Icons';
import { SyncBadge } from '../../components/SyncBadge';
import { db } from '../../db/db';
import { planTag, starteEinheit, starteFreieEinheit } from '../../db/einheiten';
import { einheitVerschieben, usePlanung } from '../../db/verschiebungen';
import { formatTagKurz, formatTagLang, montagDerWoche } from '../../domain/dates';
import { einheitenAm, offeneEinheitenAb, wegVerschoben, type EffektiveEinheit } from '../../domain/wochenplan';
import { useHeute } from '../../hooks/daten';
import { kurzInfo, kurzTitel, planStatus, type PlanStatus } from '../../lib/anzeige';
import { audioVorbereiten } from '../../lib/feedback';
import { EinheitKurz } from '../einheit/EinheitKurz';
import { HeuteEinheit } from './HeuteEinheit';

/** Kompakte Karte einer Einheit (Link zum Tag) – wie in der Wochenansicht. */
function EinheitKarte({ e, hervorheben = false, status = 'offen' }: { e: EffektiveEinheit; hervorheben?: boolean; status?: PlanStatus }) {
  return (
    <Link to={`/tag/${e.tag.datum}`} className={`einheit-karte${hervorheben ? ' naechste' : ''}`}>
      <div className={`icon-kachel ${e.tag.typ === 'lauf' ? 'lauf' : 'gym'}`}>{e.tag.typ === 'lauf' ? <IconLauf /> : <IconHeute />}</div>
      <div>
        <div className="titel">{kurzTitel(e.tag)}</div>
        <div className="meta">{[formatTagKurz(e.datum), kurzInfo(e.tag)].filter(Boolean).join(' · ')}</div>
      </div>
      {status === 'erledigt' ? (
        <IconHaken width={22} height={22} style={{ color: 'var(--ok)' }} aria-label="erledigt" />
      ) : status === 'ausgelassen' ? (
        <IconKreuz width={22} height={22} style={{ color: 'var(--fehler)' }} aria-label="ausgelassen" />
      ) : (
        <IconWeiter width={20} height={20} className="gedaempft" />
      )}
    </Link>
  );
}

export function HeuteSeite() {
  const heute = useHeute();
  const navigate = useNavigate();
  const planung = usePlanung();
  const heuteGeplant = planung ? einheitenAm(planung.effektiv, heute) : [];
  const planDaten = heuteGeplant.map((e) => e.tag.datum);

  // Erfasste Einheiten von heute und zu den heutigen Plantagen
  const einheiten = useLiveQuery(
    async () => {
      const [amTag, zuPlan] = await Promise.all([
        db.einheiten.where('datum').equals(heute).toArray(),
        planDaten.length ? db.einheiten.where('planDatum').anyOf(planDaten).toArray() : Promise.resolve([]),
      ]);
      return [...new Map([...amTag, ...zuPlan].map((e) => [e.id, e])).values()];
    },
    [heute, planDaten.join('|')],
    [],
  );

  if (!planung) return <main className="seite" />;

  const planEintrag = planung.plaene.find((p) => p.wocheVon === montagDerWoche(heute)) ?? null;
  const planTagHeute = planEintrag ? planTag(planEintrag.plan, heute) : undefined;
  const status = (e: EffektiveEinheit) => planStatus(e.tag.datum, einheiten);
  // Hauptsache heute: die erste noch offene (oder laufende) Einheit, sonst die erste erledigte
  const haupt = heuteGeplant.find((e) => status(e) === 'offen' || status(e) === 'laeuft') ?? heuteGeplant[0] ?? null;
  const auchHeute = heuteGeplant.filter((e) => e !== haupt);
  const hauptStatus = haupt ? status(haupt) : null;
  const wegVonHeute = wegVerschoben(planung.effektiv, heute);
  const offen = offeneEinheitenAb(planung.effektiv, montagDerWoche(heute), planung.fertig).filter((e) => e.datum !== heute);
  const naechste = offen.find((e) => e.datum > heute) ?? null;
  const sonstige = einheiten.filter((e) => e.datum === heute && (!e.planDatum || !planDaten.includes(e.planDatum)));
  const freierTag = haupt === null;
  const startbar = haupt !== null && (hauptStatus === 'offen' || hauptStatus === 'laeuft');

  const starten = async () => {
    if (!haupt) return;
    audioVorbereiten(); // erster Tipp → Ton für den Pausen-Timer freischalten
    const id = await starteEinheit(haupt.tag, heute);
    navigate(haupt.tag.typ === 'lauf' ? `/lauf/${id}` : `/training/${id}`);
  };

  const heuteMachen = async (e: EffektiveEinheit) => {
    audioVorbereiten();
    await einheitVerschieben(e.tag.datum, heute);
    const id = await starteEinheit(e.tag, heute);
    navigate(e.tag.typ === 'lauf' ? `/lauf/${id}` : `/training/${id}`);
  };

  const frei = async (typ: 'gym' | 'lauf') => {
    audioVorbereiten();
    const id = await starteFreieEinheit(typ, typ === 'lauf' ? 'Lauf – extra' : 'Gym – frei', heute);
    navigate(typ === 'lauf' ? `/lauf/${id}` : `/training/${id}`);
  };

  return (
    <main className={`seite${startbar ? ' mit-startleiste' : ''}`}>
      {/* Kopfzeile: Datum über dem Titel */}
      <header className="heute-kopf">
        <div>
          <div className="datum">{formatTagLang(heute)}</div>
          <h1>{haupt ? kurzTitel(haupt.tag) : planTagHeute || wegVonHeute.length ? 'Heute frei' : 'Kein Plan für heute'}</h1>
          <div className="meta">
            {haupt ? (
              <>
                <span>{kurzInfo(haupt.tag)}</span>
                {haupt.verschobenVon && <span>↷ von {formatTagKurz(haupt.verschobenVon)}</span>}
                {hauptStatus === 'laeuft' && <span className="mini-chip" style={{ color: 'var(--info)' }}>läuft</span>}
                {hauptStatus === 'erledigt' && <span className="mini-chip" style={{ color: 'var(--ok)' }}>✓ erledigt</span>}
                {hauptStatus === 'ausgelassen' && <span className="mini-chip" style={{ color: 'var(--fehler)' }}>ausgelassen</span>}
              </>
            ) : wegVonHeute.length ? (
              <span>{wegVonHeute.map((e) => `${kurzTitel(e.tag)} → ${formatTagKurz(e.datum)}`).join(' · ')}</span>
            ) : planTagHeute?.typ === 'ruhe' ? (
              <span>Ruhetag</span>
            ) : null}
          </div>
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

      {/* Die Einheit von heute */}
      {haupt && <HeuteEinheit eintrag={haupt} heute={heute} einheiten={einheiten.filter((e) => e.planDatum === haupt.tag.datum)} />}

      {auchHeute.length > 0 && <div className="abschnitt-titel">Auch heute</div>}
      {auchHeute.map((e) => (
        <EinheitKarte key={e.tag.datum} e={e} status={status(e)} />
      ))}

      {/* Freier Tag */}
      {freierTag && (
        <section className="karte">
          <p className="gedaempft" style={{ margin: 0 }}>
            {planTagHeute?.typ === 'ruhe'
              ? (planTagHeute.hinweis ?? 'Erholung ist Teil des Trainings.')
              : !planEintrag
                ? 'Für diese Woche ist noch kein Plan da. Sobald der Coach ihn ins Doc geschrieben hat, lädt die App ihn automatisch.'
                : 'Heute ist kein Training geplant.'}
          </p>
        </section>
      )}
      {freierTag && naechste && (
        <>
          <div className="abschnitt-titel">Als Nächstes</div>
          <EinheitKarte e={naechste} hervorheben />
        </>
      )}

      {sonstige.length > 0 && <div className="abschnitt-titel">Heute erfasst</div>}
      {sonstige.map((e) => (
        <EinheitKurz key={e.id} einheit={e} />
      ))}

      {/* Andere Einheit heute machen */}
      {offen.length > 0 && (
        <section className="karte">
          <h3>{freierTag ? 'Heute trainieren?' : 'Lieber etwas anderes?'}</h3>
          <p className="klein gedaempft">Holt die Einheit auf heute und startet sie. Im Log steht dann „geplant für …“.</p>
          {offen.slice(0, 4).map((e) => (
            <div key={e.tag.datum} className="zeile zwischen">
              <div>
                <div className="fett">{kurzTitel(e.tag)}</div>
                <div className="klein gedaempft">
                  {formatTagKurz(e.datum)}
                  {e.datum < heute ? ' · verpasst' : ''}
                </div>
              </div>
              <button className="knopf" onClick={() => void heuteMachen(e)}>
                Heute machen
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="stapel">
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

      {/* Startknopf unten fixiert */}
      {startbar && haupt && (
        <div className="start-leiste">
          <button className="knopf primaer gross block" onClick={() => void starten()}>
            {hauptStatus === 'laeuft' ? `Weiter: ${kurzTitel(haupt.tag)}` : haupt.tag.typ === 'lauf' ? '▶ Lauf erfassen' : '▶ Training starten'}
          </button>
        </div>
      )}
    </main>
  );
}
