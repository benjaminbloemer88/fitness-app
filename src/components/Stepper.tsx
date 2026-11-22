/**
 * Großer Zahlen-Eingeber: [−]  57,5  [+]
 * Mit verschwitzten Fingern bedienbar; Tippen auf die Zahl öffnet die Tastatur.
 */
import { useEffect, useState } from 'react';
import { formatDezimal, parseDezimal } from '../domain/calc';

interface Props {
  label: string;
  wert: number | null;
  schritt: number;
  min?: number;
  max?: number;
  einheit?: string;
  /** Platzhalter, wenn kein Wert gesetzt ist (z. B. bei „kalibrieren“). */
  leerText?: string;
  onChange: (wert: number | null) => void;
}

export function Stepper({ label, wert, schritt, min = 0, max = 9999, einheit, leerText = '–', onChange }: Props) {
  // Während des Tippens halten wir den Text separat, damit „57,“ nicht sofort zu „57“ wird.
  const [text, setText] = useState(wert === null ? '' : formatDezimal(wert));
  const [fokus, setFokus] = useState(false);

  useEffect(() => {
    if (!fokus) setText(wert === null ? '' : formatDezimal(wert));
  }, [wert, fokus]);

  const begrenzen = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  const aendern = (delta: number) => {
    // Ohne Startwert beginnt „+“ beim ersten Schritt
    const basis = wert ?? (delta > 0 ? 0 : min);
    onChange(begrenzen(basis + delta));
  };

  return (
    <div>
      <div className="stepper-label">{label}</div>
      <div className="stepper">
        <button type="button" className="knopf" aria-label={`${label} verringern`} onClick={() => aendern(-schritt)}>
          −
        </button>
        <input
          className="stepper-wert"
          inputMode="decimal"
          aria-label={label}
          placeholder={leerText}
          value={fokus ? text : wert === null ? '' : `${formatDezimal(wert)}${einheit ? ` ${einheit}` : ''}`}
          onFocus={(e) => {
            setFokus(true);
            setText(wert === null ? '' : formatDezimal(wert));
            requestAnimationFrame(() => e.target.select());
          }}
          onChange={(e) => {
            setText(e.target.value);
            const zahl = parseDezimal(e.target.value);
            if (zahl !== null) onChange(begrenzen(zahl));
            else if (e.target.value.trim() === '') onChange(null);
          }}
          onBlur={() => setFokus(false)}
        />
        <button type="button" className="knopf" aria-label={`${label} erhöhen`} onClick={() => aendern(schritt)}>
          +
        </button>
      </div>
    </div>
  );
}
