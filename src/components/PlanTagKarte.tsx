/**
 * Zeigt einen Plantag: Titel, Dauer, Hinweis und die Übungen bzw. den Lauf mit Zielwerten.
 * Ein Tipp auf eine Übung öffnet die Übungs-Infos. Mit `tauschbar` kann man dort
 * eine Alternative wählen; getauschte Übungen erscheinen dann hier mit „statt …“.
 */
import { useState } from 'react';
import { regelEntfernen, uebungTauschen, useErsetzungen } from '../db/ersetzungen';
import { formatDezimal } from '../domain/calc';
import { formatTagLang } from '../domain/dates';
import { regelFuer, uebungenMitErsetzungen, type AngezeigteUebung } from '../domain/ersetzungen';
import type { PlanTag, Uebung } from '../domain/planSchema';
import { UebungsInfoDialog } from './UebungsInfoDialog';

/** „3 × 8 × 57,5 kg“, „3 × 12“ – bei getauschten Übungen ohne Zielgewicht */
export function zielText(u: Uebung, ersetzt = false): string {
  const basis = `${u.saetze} × ${u.wdh}`;
  if (u.gewicht_kg !== null && !ersetzt) return `${basis} × ${formatDezimal(u.gewicht_kg)} kg`;
  return basis;
}

interface Props {
  tag: PlanTag;
  zeigeDatum?: boolean;
  /** Anzuzeigendes Datum, falls die Einheit verschoben wurde (sonst das Plandatum). */
  datum?: string;
  hervorheben?: boolean;
  /** Übungen tauschen erlauben (und getauschte anzeigen). Aus für die reine Plan-Ansicht. */
  tauschbar?: boolean;
}

export function PlanTagKarte({ tag, zeigeDatum = false, datum, hervorheben = false, tauschbar = false }: Props) {
  const [info, setInfo] = useState<number | null>(null);
  const ersetzungen = useErsetzungen();
  const liste: AngezeigteUebung[] = tauschbar
    ? uebungenMitErsetzungen(tag, ersetzungen)
    : tag.uebungen.map((u) => ({ original: u, name: u.name, ersetzung: null }));
  const offen = info !== null ? liste[info] : undefined;

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

      {liste.length > 0 && (
        <ul className="uebungsliste">
          {liste.map((a, i) => (
            <li key={`${a.original.name}-${i}`}>
              <button className="uebung-zeile" onClick={() => setInfo(i)} aria-label={`${a.name}: Infos${tauschbar ? ' und tauschen' : ''}`}>
                <div>
                  <div className="fett">
                    {a.name}
                    <i className="info-punkt" aria-hidden="true">
                      i
                    </i>
                  </div>
                  {a.ersetzung ? (
                    <div className="klein" style={{ color: 'var(--info)' }}>
                      ⇄ statt {a.original.name}
                    </div>
                  ) : (
                    a.original.hinweis && <div className="klein gedaempft">{a.original.hinweis}</div>
                  )}
                </div>
                <div className="ziel">{zielText(a.original, a.ersetzung !== null)}</div>
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

      {offen && (
        <UebungsInfoDialog
          name={offen.name}
          onSchliessen={() => setInfo(null)}
          tausch={
            tauschbar
              ? {
                  original: offen.original.name,
                  aktuell: offen.name,
                  regelAktiv: regelFuer(ersetzungen, offen.original.name) !== null,
                  onWaehlen: (neu, immer) => uebungTauschen(tag.datum, offen.original.name, neu, immer),
                  onRegelLoeschen: () => regelEntfernen(offen.original.name),
                }
              : undefined
          }
        />
      )}
    </section>
  );
}
