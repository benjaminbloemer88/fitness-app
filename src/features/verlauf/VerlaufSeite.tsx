/**
 * Verlauf: Diagramme pro Übung (Top-Gewicht, geschätztes 1RM, Volumen),
 * Lauf-Pace, Gefühl und Einheiten pro Woche – plus Liste aller Einheiten.
 *
 * Diagrammregeln: eine y-Achse pro Diagramm, dünne Linien, Legende ab 2 Reihen,
 * Werte zusätzlich als Tabelle (Barrierefreiheit).
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SyncBadge } from '../../components/SyncBadge';
import { db } from '../../db/db';
import { useEinstellungen } from '../../db/einstellungen';
import { formatDezimal, formatPace } from '../../domain/calc';
import { isoZuKurz } from '../../domain/dates';
import {
  einheitenProWoche,
  fuehreZusammen,
  gefuehlVerlauf,
  paceVerlauf,
  uebungsNamen,
  uebungsVerlauf,
} from '../../domain/verlauf';
import { useEinheiten } from '../../hooks/daten';
import { EinheitKurz } from '../einheit/EinheitKurz';

/** Liest die Diagrammfarben aus den CSS-Variablen (SVG-Attribute verstehen kein var()). */
function useDiagrammFarben() {
  const { design } = useEinstellungen();
  const [farben, setFarben] = useState({ serie1: '#3987e5', serie2: '#d95926', raster: '#2c2c2a', achse: '#898781' });
  useEffect(() => {
    const lesen = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (name: string, ersatz: string) => s.getPropertyValue(name).trim() || ersatz;
      setFarben({ serie1: v('--serie-1', '#3987e5'), serie2: v('--serie-2', '#d95926'), raster: v('--raster', '#2c2c2a'), achse: v('--achse', '#898781') });
    };
    lesen();
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', lesen);
    return () => mq.removeEventListener('change', lesen);
  }, [design]);
  return farben;
}

const tooltipStil = {
  contentStyle: { background: 'var(--flaeche)', border: '1px solid var(--rand)', borderRadius: 12, color: 'var(--text)' },
  itemStyle: { color: 'var(--text)' },
  labelStyle: { color: 'var(--text-2)' },
};

function DiagrammKarte({ titel, unter, anzahl, kinder, tabelle }: { titel: string; unter?: string; anzahl: number; kinder: ReactNode; tabelle: ReactNode }) {
  return (
    <section className="karte">
      <div>
        <h3>{titel}</h3>
        {unter && <div className="klein gedaempft">{unter}</div>}
      </div>
      {anzahl === 0 ? (
        <p className="gedaempft klein">Noch keine Daten.</p>
      ) : anzahl < 2 ? (
        <p className="gedaempft klein">Ab 2 Einheiten erscheint hier ein Diagramm.</p>
      ) : (
        <div className="diagramm">{kinder}</div>
      )}
      {anzahl > 0 && tabelle && (
        <details>
          <summary>Werte als Tabelle</summary>
          {tabelle}
        </details>
      )}
    </section>
  );
}

export function VerlaufSeite() {
  const einheiten = useEinheiten();
  const importe = useLiveQuery(() => db.logImport.toArray(), [], []);
  const farben = useDiagrammFarben();
  const eintraege = useMemo(() => fuehreZusammen(einheiten, importe, new Date().getFullYear()), [einheiten, importe]);
  const namen = useMemo(() => uebungsNamen(eintraege), [eintraege]);
  const [uebung, setUebung] = useState<string>('');
  const gewaehlt = uebung || namen[0] || '';
  const ue = useMemo(() => (gewaehlt ? uebungsVerlauf(eintraege, gewaehlt) : []), [eintraege, gewaehlt]);
  const pace = useMemo(() => paceVerlauf(eintraege), [eintraege]);
  const gefuehl = useMemo(() => gefuehlVerlauf(eintraege), [eintraege]);
  const proWoche = useMemo(() => einheitenProWoche(eintraege), [eintraege]);
  const liste = einheiten.filter((e) => e.status !== 'laeuft');

  const achse = { stroke: farben.raster, tick: { fill: farben.achse, fontSize: 12 }, tickLine: false };
  const raster = <CartesianGrid stroke={farben.raster} strokeDasharray="0" vertical={false} />;
  const xAchse = <XAxis dataKey="datum" tickFormatter={isoZuKurz} {...achse} minTickGap={16} />;
  const linie = (key: string, name: string, farbe: string) => (
    <Line type="monotone" dataKey={key} name={name} stroke={farbe} strokeWidth={2} dot={{ r: 4, strokeWidth: 0, fill: farbe }} activeDot={{ r: 6 }} isAnimationActive={false} />
  );

  return (
    <main className="seite">
      <header className="kopf">
        <h1>Verlauf</h1>
        <SyncBadge />
      </header>

      {/* ───── Übungen ───── */}
      <section className="karte">
        <label className="feld">
          <span>Übung</span>
          <select className="eingabe" value={gewaehlt} onChange={(e) => setUebung(e.target.value)} disabled={namen.length === 0}>
            {namen.length === 0 && <option>– noch keine Übungen erfasst –</option>}
            {namen.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </section>

      <DiagrammKarte
        titel="Top-Gewicht und geschätztes 1RM"
        unter="kg · 1RM nach Epley: Gewicht × (1 + Wdh./30)"
        anzahl={ue.length}
        kinder={
          <>
            <div className="legende">
              <span>
                <i style={{ background: farben.serie1 }} />
                Top-Gewicht
              </span>
              <span>
                <i style={{ background: farben.serie2 }} />
                geschätztes 1RM
              </span>
            </div>
            <ResponsiveContainer width="100%" height={196}>
              <LineChart data={ue} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                {raster}
                {xAchse}
                <YAxis {...achse} domain={['auto', 'auto']} />
                <Tooltip {...tooltipStil} labelFormatter={(l) => isoZuKurz(String(l))} formatter={(v) => `${formatDezimal(Number(v), 1)} kg`} />
                {linie('topKg', 'Top-Gewicht', farben.serie1)}
                {linie('e1rm', 'geschätztes 1RM', farben.serie2)}
              </LineChart>
            </ResponsiveContainer>
          </>
        }
        tabelle={
          <table className="wertetabelle">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Top kg</th>
                <th>1RM</th>
                <th>Volumen</th>
              </tr>
            </thead>
            <tbody>
              {ue.map((p) => (
                <tr key={p.datum}>
                  <td>{isoZuKurz(p.datum)}</td>
                  <td>{formatDezimal(p.topKg)}</td>
                  <td>{formatDezimal(p.e1rm, 1)}</td>
                  <td>{formatDezimal(p.volumen, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />

      <DiagrammKarte
        titel="Volumen"
        unter="kg · Sätze × Wdh. × Gewicht"
        anzahl={ue.length}
        kinder={
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              {raster}
              {xAchse}
              <YAxis {...achse} />
              <Tooltip {...tooltipStil} cursor={{ fill: farben.raster }} labelFormatter={(l) => isoZuKurz(String(l))} formatter={(v) => `${formatDezimal(Number(v), 0)} kg`} />
              <Bar dataKey="volumen" name="Volumen" fill={farben.serie1} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        }
        tabelle={null}
      />

      {/* ───── Laufen ───── */}
      <DiagrammKarte
        titel="Lauf-Pace"
        unter="min/km · oben = schneller"
        anzahl={pace.length}
        kinder={
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={pace} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              {raster}
              {xAchse}
              <YAxis {...achse} reversed domain={['dataMin - 10', 'dataMax + 10']} tickFormatter={(v) => formatPace(Number(v))} />
              <Tooltip {...tooltipStil} labelFormatter={(l) => isoZuKurz(String(l))} formatter={(v) => `${formatPace(Number(v))} /km`} />
              {linie('paceSek', 'Pace', farben.serie1)}
            </LineChart>
          </ResponsiveContainer>
        }
        tabelle={
          <table className="wertetabelle">
            <thead>
              <tr>
                <th>Datum</th>
                <th>km</th>
                <th>Pace</th>
              </tr>
            </thead>
            <tbody>
              {pace.map((p) => (
                <tr key={p.datum + p.km}>
                  <td>{isoZuKurz(p.datum)}</td>
                  <td>{formatDezimal(p.km)}</td>
                  <td>{formatPace(p.paceSek)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />

      {/* ───── Gefühl ───── */}
      <DiagrammKarte
        titel="Gefühl"
        unter="1 = sehr leicht · 10 = Maximum"
        anzahl={gefuehl.length}
        kinder={
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={gefuehl} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              {raster}
              {xAchse}
              <YAxis {...achse} domain={[1, 10]} ticks={[1, 4, 7, 10]} />
              <Tooltip {...tooltipStil} labelFormatter={(l) => isoZuKurz(String(l))} />
              {linie('gefuehl', 'Gefühl', farben.serie1)}
            </LineChart>
          </ResponsiveContainer>
        }
        tabelle={
          <table className="wertetabelle">
            <tbody>
              {gefuehl.map((g, i) => (
                <tr key={i}>
                  <td>{isoZuKurz(g.datum)}</td>
                  <td>{g.gefuehl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />

      {/* ───── Einheiten pro Woche ───── */}
      <DiagrammKarte
        titel="Einheiten pro Woche"
        unter="erledigt (ohne ausgelassene)"
        anzahl={proWoche.length}
        kinder={
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={proWoche} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              {raster}
              <XAxis dataKey="woche" tickFormatter={(w) => `KW ab ${isoZuKurz(String(w))}`} {...achse} />
              <YAxis {...achse} allowDecimals={false} />
              <Tooltip {...tooltipStil} cursor={{ fill: farben.raster }} labelFormatter={(l) => `Woche ab ${isoZuKurz(String(l))}`} />
              <Bar dataKey="anzahl" name="Einheiten" fill={farben.serie1} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        }
        tabelle={
          <table className="wertetabelle">
            <tbody>
              {proWoche.map((w) => (
                <tr key={w.woche}>
                  <td>ab {isoZuKurz(w.woche)}</td>
                  <td>{w.anzahl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      />

      {/* ───── Liste ───── */}
      <h2 style={{ marginTop: 8 }}>Alle Einheiten</h2>
      {liste.length === 0 && <p className="gedaempft">Noch keine Einheiten erfasst.</p>}
      {liste.map((e) => (
        <EinheitKurz key={e.id} einheit={e} zeigeDatum />
      ))}
    </main>
  );
}
