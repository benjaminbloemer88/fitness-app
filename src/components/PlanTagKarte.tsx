/**
 * Zeigt einen Plantag: Titel, Dauer, Hinweis und die Übungen bzw. den Lauf mit Zielwerten.
 * Ein Tipp auf eine Übung öffnet die Übungs-Infos (Fotos, Ausführung, Tipp).
 */
import { useState } from 'react';
import { formatDezimal } from '../domain/calc';
import { formatTagLang } from '../domain/dates';
import type { PlanTag, Uebung } from '../domain/planSchema';
import { UebungsInfoDialog } from './UebungsInfoDialog';

/** „3 × 8 × 57,5 kg“, „3 × 12“ */
export function zielText(u: Uebung): string {
  const basis = `${u.saetze} × ${u.wdh}`;
  if (u.gewicht_kg !== null) return `${basis} × ${formatDezimal(u.gewicht_kg)} kg`;
  return basis;
}

interface Props {
  tag: PlanTag;
  zeigeDatum?: boolean;
  /** Anzuzeigendes Datum, falls die Einheit verschoben wurde (sonst das Plandatum). */
  datum?: string;
  hervorheben?: boolean;
}

export function PlanTagKarte({ tag, zeigeDatum = false, datum, hervorheben = false }: Props) {
  const [info, setInfo] = useState<string | null>(null);
  return (
    <section className={`karte${hervorheben ? ' hervorgehoben' : ''}`}>
      <div className="zeile zwischen">
        <div>
          {zeigeDatum && (
            <div className="klein gedaempft">
              {formatTagLang(datum ?? tag.datum)}
              {datum && datum !== tag.datum ? ' (verschoben)' : ''}
            </div>
          )}
          <h2 style={{ margin: 0 }}>{tag.titel}</h2>
        </div>
        {tag.dauer_min !== null && <span className="abzeichen">ca. {tag.dauer_min} Min.</span>}
      </div>
      {tag.hinweis && <p className="gedaempft klein">{tag.hinweis}</p>}

      {tag.uebungen.length > 0 && (
        <ul className="uebungsliste">
          {tag.uebungen.map((u, i) => (
            <li key={`${u.name}-${i}`}>
              <button className="uebung-zeile" onClick={() => setInfo(u.name)} aria-label={`${u.name}: Infos anzeigen`}>
                <div>
                  <div className="fett">
                    {u.name}
                    <i className="info-punkt" aria-hidden="true">
                      i
                    </i>
                  </div>
                  {u.hinweis && <div className="klein gedaempft">{u.hinweis}</div>}
                </div>
                <div className="ziel">{zielText(u)}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {tag.lauf && (
        <div className="stapel">
          <div className="zeile zwischen">
            <span className="fett">
              {formatDezimal(tag.lauf.distanz_km)} km {tag.lauf.art}
            </span>
            {tag.lauf.pace_von && (
              <span className="ziel">
                {tag.lauf.pace_von}
                {tag.lauf.pace_bis && tag.lauf.pace_bis !== tag.lauf.pace_von ? `–${tag.lauf.pace_bis}` : ''} /km
              </span>
            )}
          </div>
          {tag.lauf.hinweis && <p className="klein gedaempft">{tag.lauf.hinweis}</p>}
        </div>
      )}

      {info && <UebungsInfoDialog name={info} onSchliessen={() => setInfo(null)} />}
    </section>
  );
}
