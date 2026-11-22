/**
 * Lauf erfassen: Distanz und Zeit eingeben, die Pace wird automatisch berechnet.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { IconZurueck } from '../../components/Icons';
import { Stepper } from '../../components/Stepper';
import { aktualisiereEinheit, loescheEinheit, planTag } from '../../db/einheiten';
import { formatPace, paceSekProKm } from '../../domain/calc';
import { formatTagKurz } from '../../domain/dates';
import type { LaufErgebnis } from '../../domain/einheit';
import { LAUF_ARTEN } from '../../domain/planSchema';
import { useEinheit, usePlanFuerDatum } from '../../hooks/daten';

/** Eingabefeld für Std/Min/Sek – groß, nur Ziffern. */
function ZeitFeld({ label, wert, max, onChange }: { label: string; wert: number; max: number; onChange: (n: number) => void }) {
  return (
    <label className="feld" style={{ flex: 1 }}>
      <span>{label}</span>
      <input
        className="eingabe stepper-wert"
        inputMode="numeric"
        value={wert === 0 ? '' : String(wert)}
        placeholder="0"
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''));
          onChange(Math.min(max, Number.isFinite(n) ? n : 0));
        }}
      />
    </label>
  );
}

export function LaufSeite() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const einheit = useEinheit(id);
  const planEintrag = usePlanFuerDatum(einheit?.planDatum ?? '1970-01-01');
  const [lauf, setLauf] = useState<LaufErgebnis | null>(null);

  useEffect(() => {
    if (einheit && lauf === null) setLauf(einheit.lauf ?? { art: 'locker', distanzKm: null, dauerSek: null });
  }, [einheit, lauf]);
  useEffect(() => {
    if (lauf && einheit) void aktualisiereEinheit(einheit.id, { lauf });
    // nur bei Änderungen am Lauf speichern
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lauf]);

  if (einheit === undefined || (einheit && lauf === null)) return <main className="seite" />;
  if (einheit === null || lauf === null) return <main className="seite"><div className="hinweis fehler">Lauf nicht gefunden.</div></main>;

  const ziel = einheit.planDatum && planEintrag ? planTag(planEintrag.plan, einheit.planDatum)?.lauf : null;
  const sek = lauf.dauerSek ?? 0;
  const std = Math.floor(sek / 3600);
  const min = Math.floor((sek % 3600) / 60);
  const s = sek % 60;
  const setzeZeit = (h: number, m: number, x: number) => setLauf({ ...lauf, dauerSek: h * 3600 + m * 60 + x || null });
  const pace = paceSekProKm(lauf.distanzKm ?? 0, sek);
  const vollstaendig = (lauf.distanzKm ?? 0) > 0 && sek > 0;

  return (
    <main className="seite ohne-nav">
      <header className="kopf-links">
        <button className="knopf icon leise" onClick={() => navigate('/')} aria-label="Zurück">
          <IconZurueck />
        </button>
        <div>
          <h1 style={{ fontSize: '1.3rem' }}>{einheit.titel}</h1>
          <div className="klein gedaempft">{formatTagKurz(einheit.datum)}</div>
        </div>
      </header>

      {ziel && (
        <div className="hinweis">
          Ziel: {String(ziel.distanz_km).replace('.', ',')} km {ziel.art}
          {ziel.pace_von ? ` @ ${ziel.pace_von}${ziel.pace_bis && ziel.pace_bis !== ziel.pace_von ? `–${ziel.pace_bis}` : ''}/km` : ''}
          {ziel.hinweis ? ` · ${ziel.hinweis}` : ''}
        </div>
      )}

      <section className="karte">
        <Stepper label="Distanz (km)" wert={lauf.distanzKm} schritt={0.1} einheit="km" onChange={(w) => setLauf({ ...lauf, distanzKm: w })} />
        <div className="stepper-label">Zeit</div>
        <div className="zeile">
          <ZeitFeld label="Std." wert={std} max={9} onChange={(h) => setzeZeit(h, min, s)} />
          <ZeitFeld label="Min." wert={min} max={59} onChange={(m) => setzeZeit(std, m, s)} />
          <ZeitFeld label="Sek." wert={s} max={59} onChange={(x) => setzeZeit(std, min, x)} />
        </div>
        <div className="zeile zwischen" style={{ marginTop: 6 }}>
          <span className="gedaempft">Pace</span>
          <span className="pausenzeit">{pace ? `${formatPace(pace)} /km` : '–'}</span>
        </div>
      </section>

      <section className="karte">
        <div className="stepper-label">Laufart</div>
        <div className="zeile umbruch">
          {LAUF_ARTEN.map((art) => (
            <button key={art} className={`chip${lauf.art === art ? ' aktiv' : ''}`} onClick={() => setLauf({ ...lauf, art })}>
              {art}
            </button>
          ))}
        </div>
      </section>

      {einheit.sync !== 'synchronisiert' && (
        <button
          className="knopf gefahr"
          onClick={async () => {
            if (!window.confirm('Diesen Lauf verwerfen?')) return;
            await loescheEinheit(einheit.id);
            navigate('/', { replace: true });
          }}
        >
          Lauf verwerfen
        </button>
      )}

      <div className="unten-fixiert">
        <div className="unten-fixiert-innen">
          <button className="knopf primaer gross block" disabled={!vollstaendig} onClick={() => navigate(`/abschluss/${einheit.id}`)}>
            Weiter zum Abschluss
          </button>
        </div>
      </div>
    </main>
  );
}
