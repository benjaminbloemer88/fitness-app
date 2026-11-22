/**
 * Zeigt einen Plantag: Titel, Dauer, Hinweis und die Übungen bzw. den Lauf mit Zielwerten.
 */
import { formatDezimal } from '../domain/calc';
import { formatTagLang } from '../domain/dates';
import type { PlanTag, Uebung } from '../domain/planSchema';

/** „3 × 8 × 57,5 kg“, „3 × 12 · kalibrieren“, „3 × 6 · Körpergewicht“ */
export function zielText(u: Uebung): string {
  const basis = `${u.saetze} × ${u.wdh}`;
  if (u.gewicht_kg !== null) return `${basis} × ${formatDezimal(u.gewicht_kg)} kg`;
  return basis;
}

/** Kurzer Hinweis unter der Übung („kalibrieren“, „leicht“ …). */
export function zielHinweis(u: Uebung): string | null {
  return u.hinweis;
}

export function PlanTagKarte({ tag, zeigeDatum = false, hervorheben = false }: { tag: PlanTag; zeigeDatum?: boolean; hervorheben?: boolean }) {
  return (
    <section className={`karte${hervorheben ? ' hervorgehoben' : ''}`}>
      <div className="zeile zwischen">
        <div>
          {zeigeDatum && <div className="klein gedaempft">{formatTagLang(tag.datum)}</div>}
          <h2 style={{ margin: 0 }}>{tag.titel}</h2>
        </div>
        {tag.dauer_min !== null && <span className="abzeichen">ca. {tag.dauer_min} Min.</span>}
      </div>
      {tag.hinweis && <p className="gedaempft klein">{tag.hinweis}</p>}

      {tag.uebungen.length > 0 && (
        <ul className="uebungsliste">
          {tag.uebungen.map((u, i) => (
            <li key={`${u.name}-${i}`}>
              <div>
                <div className="fett">{u.name}</div>
                {zielHinweis(u) && <div className="klein gedaempft">{zielHinweis(u)}</div>}
              </div>
              <div className="ziel">{zielText(u)}</div>
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
    </section>
  );
}
