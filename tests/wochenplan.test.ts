import { describe, expect, it } from 'vitest';
import { beispielDoc } from '../src/data/beispielDoc';
import { planAusSnapshot } from '../src/domain/planLaden';
import { effektiveEinheiten, einheitenAm, offeneEinheitenAb, verschiebe, wegVerschoben } from '../src/domain/wochenplan';

const tage = planAusSnapshot(beispielDoc).plan!.tage;
const titel = (e: { tag: { titel: string } }[]) => e.map((x) => x.tag.titel);

describe('Verschiebungen', () => {
  it('ohne Verschiebung: Trainingstage an ihrem Plandatum, Ruhetage fehlen', () => {
    const eff = effektiveEinheiten(tage, []);
    expect(eff.map((e) => e.datum)).toEqual(['2026-11-23', '2026-11-25', '2026-11-27', '2026-11-28']);
    expect(eff.every((e) => e.verschobenVon === null)).toBe(true);
  });

  it('„heute statt morgen“: Gym A von Mo auf So davor', () => {
    const v = verschiebe(effektiveEinheiten(tage, []), [], '2026-11-23', '2026-11-22');
    expect(v).toEqual([{ planDatum: '2026-11-23', zielDatum: '2026-11-22' }]);
    const eff = effektiveEinheiten(tage, v);
    expect(titel(einheitenAm(eff, '2026-11-22'))).toEqual(['Gym A – Ganzkörper']);
    expect(einheitenAm(eff, '2026-11-23')).toEqual([]);
    expect(wegVerschoben(eff, '2026-11-23')[0]!.datum).toBe('2026-11-22');
    expect(eff[0]!.verschobenVon).toBe('2026-11-23');
  });

  it('auf einen belegten Tag: ohne Tauschen liegen beide dort, mit Tauschen wird getauscht', () => {
    const eff = effektiveEinheiten(tage, []);
    const beide = effektiveEinheiten(tage, verschiebe(eff, [], '2026-11-25', '2026-11-27'));
    expect(titel(einheitenAm(beide, '2026-11-27'))).toEqual(['Gym B – Ganzkörper', 'Gym C – Ganzkörper']);

    const getauscht = effektiveEinheiten(tage, verschiebe(eff, [], '2026-11-25', '2026-11-27', true));
    expect(titel(einheitenAm(getauscht, '2026-11-27'))).toEqual(['Gym B – Ganzkörper']);
    expect(titel(einheitenAm(getauscht, '2026-11-25'))).toEqual(['Gym C – Ganzkörper']);
  });

  it('zurück aufs Plandatum hebt die Verschiebung auf', () => {
    const v1 = verschiebe(effektiveEinheiten(tage, []), [], '2026-11-25', '2026-11-26');
    const v2 = verschiebe(effektiveEinheiten(tage, v1), v1, '2026-11-25', '2026-11-25');
    expect(v2).toEqual([]);
  });

  it('Tauschen mit einer schon verschobenen Einheit', () => {
    // Gym B → Do, dann Gym C (Fr) mit Do tauschen → Gym B landet auf Fr
    const v1 = verschiebe(effektiveEinheiten(tage, []), [], '2026-11-25', '2026-11-26');
    const v2 = verschiebe(effektiveEinheiten(tage, v1), v1, '2026-11-27', '2026-11-26', true);
    const eff = effektiveEinheiten(tage, v2);
    expect(titel(einheitenAm(eff, '2026-11-26'))).toEqual(['Gym C – Ganzkörper']);
    expect(titel(einheitenAm(eff, '2026-11-27'))).toEqual(['Gym B – Ganzkörper']);
  });

  it('offene Einheiten ab heute, ohne erledigte', () => {
    const eff = effektiveEinheiten(tage, []);
    const offen = offeneEinheitenAb(eff, '2026-11-24', new Set(['2026-11-25']));
    expect(titel(offen)).toEqual(['Gym C – Ganzkörper', 'Lauf – locker']);
  });
});
