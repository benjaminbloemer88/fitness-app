/**
 * Einheit als ausgelassen speichern: Was gemacht = „ausgelassen“, Gefühl = „–“, Grund in den Anmerkungen.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { IconZurueck } from '../../components/Icons';
import { markiereAusgelassen, planTag } from '../../db/einheiten';
import { formatTagLang } from '../../domain/dates';
import { erzeugeLogZeile } from '../../domain/logFormat';
import { usePlanFuerDatum } from '../../hooks/daten';
import { usePausenTimer } from '../../state/PausenTimer';
import { LogVorschau } from './LogVorschau';

const GRUENDE = ['krank', 'keine Zeit', 'zu müde', 'Beschwerden', 'unterwegs'];

export function AuslassenSeite() {
  const { datum: planDatum = '' } = useParams();
  const navigate = useNavigate();
  const timer = usePausenTimer();
  const planEintrag = usePlanFuerDatum(planDatum);
  const [grund, setGrund] = useState('');
  const [anmerkungen, setAnmerkungen] = useState('');
  const [datum, setDatum] = useState(planDatum);

  if (planEintrag === undefined) return <main className="seite" />;
  const tag = planEintrag ? planTag(planEintrag.plan, planDatum) : undefined;
  if (!tag) return <main className="seite"><div className="hinweis fehler">Plantag nicht gefunden.</div></main>;

  const vorschau = erzeugeLogZeile({
    id: 'xxxx',
    datum,
    planDatum,
    titel: tag.titel,
    typ: tag.typ === 'lauf' ? 'lauf' : 'gym',
    status: 'ausgelassen',
    uebungen: [],
    lauf: null,
    gefuehl: null,
    anmerkungen,
    grund,
    gestartetAm: '',
    abgeschlossenAm: null,
    sync: null,
    syncFehler: null,
    logZeile: null,
  });

  const speichern = async () => {
    await markiereAusgelassen(tag, { datum, grund: grund.trim(), anmerkungen: anmerkungen.trim() });
    timer.stoppen();
    navigate('/', { replace: true });
  };

  return (
    <main className="seite ohne-nav">
      <header className="kopf-links">
        <button className="knopf icon leise" onClick={() => navigate(-1)} aria-label="Zurück">
          <IconZurueck />
        </button>
        <div>
          <h1 style={{ fontSize: '1.3rem' }}>Einheit ausgelassen</h1>
          <div className="klein gedaempft">
            {tag.titel} · {formatTagLang(planDatum)}
          </div>
        </div>
      </header>

      <section className="karte">
        <div className="stepper-label">Grund</div>
        <div className="zeile umbruch">
          {GRUENDE.map((g) => (
            <button key={g} className={`chip${grund === g ? ' aktiv' : ''}`} onClick={() => setGrund(g)}>
              {g}
            </button>
          ))}
        </div>
        <input className="eingabe" placeholder="oder eigener Grund" value={grund} onChange={(e) => setGrund(e.target.value)} />
        <label className="feld">
          <span>Weitere Anmerkungen (optional)</span>
          <textarea className="eingabe" value={anmerkungen} onChange={(e) => setAnmerkungen(e.target.value)} />
        </label>
        <label className="feld">
          <span>Datum</span>
          <input className="eingabe" type="date" value={datum} onChange={(e) => e.target.value && setDatum(e.target.value)} />
        </label>
      </section>

      <section className="stapel">
        <div className="klein gedaempft">So kommt es ins Log (Kennung wird beim Speichern vergeben):</div>
        <LogVorschau zeile={vorschau} />
      </section>

      <div className="unten-fixiert">
        <div className="unten-fixiert-innen">
          <button className="knopf primaer gross block" disabled={!grund.trim()} onClick={() => void speichern()}>
            Als ausgelassen speichern
          </button>
        </div>
      </div>
    </main>
  );
}
