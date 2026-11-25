/**
 * Schlankes Verlaufsdiagramm (Linie oder Balken) ohne Pop-up:
 * Tippen oder mit dem Finger darüberwischen wählt einen Punkt; der Wert wird
 * außerhalb (über dem Diagramm) angezeigt. Vertikales Scrollen der Seite bleibt möglich.
 * Mit der Tastatur: Pfeiltasten links/rechts.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { isoZuKurz } from '../domain/dates';

export interface DiagrammPunkt {
  datum: string;
  wert: number;
}

interface Props {
  punkte: DiagrammPunkt[];
  art: 'linie' | 'balken';
  auswahl: number;
  onAuswahl: (index: number) => void;
  formatY: (n: number) => string;
  /** Kleinere Werte oben (z. B. Pace: schneller = besser) */
  umgekehrt?: boolean;
  beschriftung: string;
  /** X-Beschriftung (Standard: „23.11.“) */
  formatX?: (datum: string) => string;
}

const HOEHE = 200;
const RAND = { links: 46, rechts: 14, oben: 14, unten: 26 };

/** „Schöne“ Achsenwerte (1, 2, 2,5, 5 × 10^n) für etwa 3–5 Linien. */
function achsenwerte(min: number, max: number): number[] {
  const spanne = max - min || 1;
  const roh = spanne / 4;
  const basis = 10 ** Math.floor(Math.log10(roh));
  const schritt = [1, 2, 2.5, 5, 10].map((f) => f * basis).find((s) => s >= roh) ?? roh;
  const werte: number[] = [];
  for (let v = Math.ceil(min / schritt) * schritt; v <= max + 1e-9; v += schritt) werte.push(Number(v.toFixed(6)));
  return werte;
}

export function VerlaufDiagramm({ punkte, art, auswahl, onAuswahl, formatY, umgekehrt = false, beschriftung, formatX = isoZuKurz }: Props) {
  const huelle = useRef<HTMLDivElement>(null);
  const [breite, setBreite] = useState(320);

  // Breite messen (das Diagramm zeichnet in echten Pixeln, damit Schrift nicht verzerrt)
  useEffect(() => {
    const el = huelle.current;
    if (!el) return;
    const beobachter = new ResizeObserver(([e]) => e && setBreite(Math.max(200, e.contentRect.width)));
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  const n = punkte.length;
  const w = breite - RAND.links - RAND.rechts;
  const h = HOEHE - RAND.oben - RAND.unten;
  const werte = punkte.map((p) => p.wert);
  let lo = art === 'balken' ? 0 : Math.min(...werte);
  let hi = Math.max(...werte);
  if (art === 'linie') {
    const puffer = (hi - lo) * 0.15 || Math.max(1, Math.abs(hi) * 0.05);
    lo -= puffer;
    hi += puffer;
  } else {
    hi = hi * 1.1 || 1;
  }
  const ticks = achsenwerte(lo, hi).filter((t) => t >= lo && t <= hi);
  const y = (v: number) => {
    const anteil = (v - lo) / (hi - lo || 1);
    return RAND.oben + (umgekehrt ? anteil : 1 - anteil) * h;
  };
  const band = n > 0 ? w / n : w;
  const x = (i: number) => (art === 'balken' ? RAND.links + band * (i + 0.5) : n === 1 ? RAND.links + w / 2 : RAND.links + (i * w) / (n - 1));
  const sel = Math.min(Math.max(auswahl, 0), n - 1);

  const indexAus = (clientX: number, ziel: Element) => {
    const r = ziel.getBoundingClientRect();
    const px = clientX - r.left - RAND.links;
    const i = art === 'balken' ? Math.floor(px / band) : n === 1 ? 0 : Math.round((px / w) * (n - 1));
    return Math.min(Math.max(i, 0), n - 1);
  };
  const beiZeiger = (e: PointerEvent<SVGSVGElement>) => {
    if (e.type === 'pointerdown') e.currentTarget.setPointerCapture(e.pointerId);
    if (e.type === 'pointermove' && e.pointerType !== 'mouse' && e.buttons === 0) return;
    const i = indexAus(e.clientX, e.currentTarget);
    if (i !== sel) onAuswahl(i);
  };
  const beiTaste = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowLeft' && sel > 0) onAuswahl(sel - 1);
    if (e.key === 'ArrowRight' && sel < n - 1) onAuswahl(sel + 1);
  };

  // X-Beschriftungen: bei wenigen Punkten alle, sonst Anfang, Mitte, Ende
  const xLabels = n <= 6 ? punkte.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <div ref={huelle} className="vd">
      {n > 0 && (
        <svg
          width={breite}
          height={HOEHE}
          role="img"
          aria-label={`${beschriftung}. Ausgewählt: ${formatX(punkte[sel]!.datum)}, ${formatY(punkte[sel]!.wert)}. Pfeiltasten wechseln den Punkt.`}
          tabIndex={0}
          onPointerDown={beiZeiger}
          onPointerMove={beiZeiger}
          onKeyDown={beiTaste}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="vd-raster" x1={RAND.links} x2={breite - RAND.rechts} y1={y(t)} y2={y(t)} />
              <text className="vd-achse" x={RAND.links - 8} y={y(t) + 4} textAnchor="end">
                {formatY(t)}
              </text>
            </g>
          ))}
          {xLabels.map((i) => (
            <text key={i} className={`vd-achse${i === sel ? ' aktiv' : ''}`} x={x(i)} y={HOEHE - 6} textAnchor={n > 1 && i === 0 && art === 'linie' ? 'start' : n > 1 && i === n - 1 && art === 'linie' ? 'end' : 'middle'}>
              {formatX(punkte[i]!.datum)}
            </text>
          ))}

          {art === 'balken' &&
            punkte.map((p, i) => {
              const bw = Math.min(36, band * 0.6);
              const oben = y(p.wert);
              const unten = y(0);
              const r = Math.min(4, (unten - oben) / 2);
              const links = x(i) - bw / 2;
              // nur oben abgerundet, unten bündig mit der Grundlinie
              const pfad = `M${links},${unten} V${oben + r} Q${links},${oben} ${links + r},${oben} H${links + bw - r} Q${links + bw},${oben} ${links + bw},${oben + r} V${unten} Z`;
              return <path key={p.datum + i} d={pfad} className={`vd-balken${i === sel ? ' aktiv' : ''}`} />;
            })}

          {art === 'linie' && (
            <>
              {n > 1 && <polyline className="vd-linie" points={punkte.map((p, i) => `${x(i)},${y(p.wert)}`).join(' ')} />}
              {punkte.map((p, i) => (
                <circle key={p.datum + i} className="vd-punkt" cx={x(i)} cy={y(p.wert)} r={3.5} />
              ))}
            </>
          )}

          {/* Markierung des ausgewählten Punkts */}
          <line className="vd-markierung" x1={x(sel)} x2={x(sel)} y1={RAND.oben} y2={RAND.oben + h} />
          {art === 'linie' && <circle className="vd-auswahl" cx={x(sel)} cy={y(punkte[sel]!.wert)} r={7} />}

          {/* große, unsichtbare Fläche für Finger und Maus */}
          <rect x={0} y={0} width={breite} height={HOEHE} fill="transparent" />
        </svg>
      )}
    </div>
  );
}

/** Mini-Kurve für Übersichtskarten (ohne Achsen). */
export function Sparkline({ werte, umgekehrt = false, klasse = '' }: { werte: number[]; umgekehrt?: boolean; klasse?: string }) {
  if (werte.length === 0) return <svg className="sparkline" viewBox="0 0 72 24" aria-hidden="true" />;
  const lo = Math.min(...werte);
  const hi = Math.max(...werte);
  const yv = (v: number) => {
    const anteil = hi === lo ? 0.5 : (v - lo) / (hi - lo);
    return 3 + (umgekehrt ? anteil : 1 - anteil) * 18;
  };
  const xv = (i: number) => (werte.length === 1 ? 36 : 3 + (i * 66) / (werte.length - 1));
  return (
    <svg className={`sparkline ${klasse}`} viewBox="0 0 72 24" aria-hidden="true">
      {werte.length > 1 && <polyline points={werte.map((v, i) => `${xv(i)},${yv(v)}`).join(' ')} />}
      <circle cx={xv(werte.length - 1)} cy={yv(werte.at(-1)!)} r={2.5} />
    </svg>
  );
}
