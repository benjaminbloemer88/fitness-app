/**
 * Eine Übung im Workout-Modus.
 *
 * Zugeklappt: Name, Fortschritt („2/3“), Ziel.
 * Aufgeklappt: Ziel + „Letztes Mal“, die Sätze – der aktuelle Satz mit großen
 * Steppern für Gewicht und Wiederholungen und einem großen „Abhaken“-Knopf.
 */
import { useEffect, useRef, useState } from 'react';
import { Stepper } from '../../components/Stepper';
import { IconHaken, IconMehr } from '../../components/Icons';
import { formatDezimal } from '../../domain/calc';
import { isoZuKurz } from '../../domain/dates';
import { zerlegeWdh, type SatzErgebnis, type UebungErgebnis } from '../../domain/einheit';
import type { LetzteLeistung } from '../../db/einheiten';

interface Props {
  uebung: UebungErgebnis;
  offen: boolean;
  letzte: LetzteLeistung | null | undefined;
  gewichtSchritt: number;
  onKopfTipp: () => void;
  onAendern: (u: UebungErgebnis) => void;
  /** Satz wurde abgehakt; `uebungFertig` = alle Sätze dieser Übung erledigt. */
  onSatzAbgehakt: (uebungFertig: boolean) => void;
  onEntfernen: () => void;
}

/** „57,5 kg × 8“ bzw. „× 8“ bei Körpergewicht */
function satzText(s: SatzErgebnis, kg: boolean, einheitWdh: string): string {
  const wdh = s.wdh ?? '–';
  if (kg && s.kg) return `KG +${formatDezimal(s.kg)} kg × ${wdh}${einheitWdh}`;
  if (kg) return `KG × ${wdh}${einheitWdh}`;
  return `${s.kg !== null ? `${formatDezimal(s.kg)} kg` : '– kg'} × ${wdh}${einheitWdh}`;
}

export function UebungKarte({ uebung, offen, letzte, gewichtSchritt, onKopfTipp, onAendern, onSatzAbgehakt, onEntfernen }: Props) {
  const ersterOffener = uebung.saetze.findIndex((s) => !s.erledigt);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const [menue, setMenue] = useState(false);
  const [neuerName, setNeuerName] = useState<string | null>(null);
  const karte = useRef<HTMLElement>(null);

  // Wird die Übung aufgeklappt (z. B. automatisch nach der letzten Satz der vorigen),
  // scrollen wir sie nach oben, falls sie nicht gut sichtbar ist.
  useEffect(() => {
    const el = karte.current;
    if (!offen || !el) return;
    const oben = el.getBoundingClientRect().top;
    if (oben < 0 || oben > window.innerHeight * 0.45) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [offen]);

  // Aktiver Satz: der angetippte, sonst der erste offene
  const aktiv = gewaehlt !== null && gewaehlt < uebung.saetze.length ? gewaehlt : ersterOffener;
  const erledigt = uebung.saetze.filter((s) => s.erledigt).length;
  const fertig = erledigt === uebung.saetze.length && uebung.saetze.length > 0;
  const { zusatz } = zerlegeWdh(uebung.ziel?.wdh ?? '');
  const sekunden = zusatz === 's';
  const einheitWdh = sekunden ? ' s' : '';
  const kalibrieren = /kalibrieren/i.test(uebung.ziel?.hinweis ?? '');

  /** Wert eines Satzes ändern; spätere, noch offene Sätze mit demselben alten Wert ziehen mit. */
  const setzeWert = (index: number, feld: 'kg' | 'wdh', wert: number | null) => {
    const alt = uebung.saetze[index]?.[feld] ?? null;
    const saetze = uebung.saetze.map((s, i) => {
      if (i === index) return { ...s, [feld]: wert };
      if (i > index && !s.erledigt && s[feld] === alt) return { ...s, [feld]: wert };
      return s;
    });
    onAendern({ ...uebung, saetze });
  };

  const abhaken = (index: number) => {
    const saetze = uebung.saetze.map((s, i) => (i === index ? { ...s, erledigt: true } : s));
    onAendern({ ...uebung, saetze });
    setGewaehlt(null);
    onSatzAbgehakt(saetze.every((s) => s.erledigt));
  };

  const rueckgaengig = (index: number) => {
    onAendern({ ...uebung, saetze: uebung.saetze.map((s, i) => (i === index ? { ...s, erledigt: false } : s)) });
  };

  const satzHinzufuegen = () => {
    const vorlage = uebung.saetze.at(-1) ?? { kg: null, wdh: zerlegeWdh(uebung.ziel?.wdh ?? '').zahl ?? 10, erledigt: false };
    onAendern({ ...uebung, saetze: [...uebung.saetze, { kg: vorlage.kg, wdh: vorlage.wdh, erledigt: false }] });
    setMenue(false);
  };

  const satzEntfernen = () => {
    const letzterOffener = uebung.saetze.map((s) => s.erledigt).lastIndexOf(false);
    if (letzterOffener < 0) return;
    onAendern({ ...uebung, saetze: uebung.saetze.filter((_, i) => i !== letzterOffener) });
    setMenue(false);
  };

  const zielZeile = uebung.ziel
    ? `${uebung.ziel.saetze} × ${uebung.ziel.wdh}${uebung.ziel.gewichtKg !== null ? ` × ${formatDezimal(uebung.ziel.gewichtKg)} kg` : ''}`
    : 'ergänzt';

  return (
    <section ref={karte} className={`uebung${offen ? ' offen' : ''}${fertig && !offen ? ' fertig' : ''}`}>
      <button className="uebung-kopf" onClick={onKopfTipp} aria-expanded={offen}>
        <div>
          <h3>{uebung.name}</h3>
          <div className="klein gedaempft">
            {zielZeile}
            {uebung.planName && uebung.planName !== uebung.name ? ` · statt ${uebung.planName}` : ''}
          </div>
        </div>
        <span className={`abzeichen${fertig ? ' ok' : ''}`}>
          {fertig ? '✓ ' : ''}
          {erledigt}/{uebung.saetze.length}
        </span>
      </button>

      {offen && (
        <div className="uebung-koerper">
          <div className="zeile zwischen">
            <div className="klein">
              {uebung.ziel?.hinweis && <div className="gedaempft">{kalibrieren ? 'kalibrieren: Gewicht selbst wählen (RIR 2)' : uebung.ziel.hinweis}</div>}
              <div>
                <span className="gedaempft">Letztes Mal: </span>
                {letzte ? (
                  <span className="fett">
                    {letzte.text} <span className="gedaempft">({isoZuKurz(letzte.datum)})</span>
                  </span>
                ) : (
                  <span className="gedaempft">–</span>
                )}
              </div>
            </div>
            <button className="knopf icon leise" onClick={() => setMenue((m) => !m)} aria-label="Weitere Aktionen">
              <IconMehr />
            </button>
          </div>

          {menue && (
            <div className="karte">
              {neuerName === null ? (
                <div className="stapel">
                  <button className="knopf block" onClick={() => setNeuerName(uebung.name)}>
                    Übung tauschen / umbenennen
                  </button>
                  <button className="knopf block" onClick={() => onAendern({ ...uebung, koerpergewicht: !uebung.koerpergewicht })}>
                    {uebung.koerpergewicht ? 'Mit Gewicht' : 'Körpergewicht (ohne kg)'}
                  </button>
                  <button className="knopf block" onClick={satzEntfernen}>
                    Letzten offenen Satz entfernen
                  </button>
                  <button
                    className="knopf block gefahr"
                    onClick={() => {
                      if (window.confirm(`„${uebung.name}“ aus diesem Training entfernen?`)) onEntfernen();
                    }}
                  >
                    Übung entfernen
                  </button>
                </div>
              ) : (
                <div className="stapel">
                  <label className="feld">
                    <span>Neuer Name</span>
                    <input className="eingabe" value={neuerName} onChange={(e) => setNeuerName(e.target.value)} autoFocus />
                  </label>
                  <div className="zeile">
                    <button className="knopf block" onClick={() => setNeuerName(null)}>
                      Abbrechen
                    </button>
                    <button
                      className="knopf primaer block"
                      disabled={!neuerName.trim()}
                      onClick={() => {
                        onAendern({ ...uebung, name: neuerName.trim() });
                        setNeuerName(null);
                        setMenue(false);
                      }}
                    >
                      Übernehmen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {uebung.saetze.map((s, i) => (
            <div key={i} className="stapel">
              <button className={`satz${s.erledigt ? ' erledigt' : ''}${i === aktiv ? ' aktiv' : ''}`} onClick={() => setGewaehlt(i)}>
                <span className="gedaempft">Satz {i + 1}</span>
                <span className="fett">{satzText(s, uebung.koerpergewicht, einheitWdh)}</span>
                <span className="haken">{s.erledigt ? <IconHaken width={22} height={22} /> : ''}</span>
              </button>

              {i === aktiv && (
                <div className="satz-editor">
                  {!uebung.koerpergewicht && (
                    <Stepper
                      label="Gewicht (kg)"
                      wert={s.kg}
                      schritt={gewichtSchritt}
                      einheit="kg"
                      leerText={kalibrieren ? 'wählen' : '–'}
                      onChange={(w) => setzeWert(i, 'kg', w)}
                    />
                  )}
                  <Stepper label={sekunden ? 'Sekunden' : 'Wiederholungen'} wert={s.wdh} schritt={sekunden ? 5 : 1} onChange={(w) => setzeWert(i, 'wdh', w)} />
                  {s.erledigt ? (
                    <div className="zeile">
                      <button className="knopf block" onClick={() => rueckgaengig(i)}>
                        Haken entfernen
                      </button>
                      <button className="knopf primaer block" onClick={() => setGewaehlt(null)}>
                        Fertig
                      </button>
                    </div>
                  ) : (
                    <button className="knopf primaer gross block" disabled={!s.wdh} onClick={() => abhaken(i)}>
                      <IconHaken width={26} height={26} /> Satz {i + 1} abhaken
                      {!uebung.koerpergewicht && s.kg === null ? ' (ohne Gewicht)' : ''}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          <button className="knopf leise" onClick={satzHinzufuegen}>
            + Satz hinzufügen
          </button>
        </div>
      )}
    </section>
  );
}
