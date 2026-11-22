/**
 * Client für die Apps-Script-Brücke im Google-Doc.
 *
 * Wir schicken einfache POST-Anfragen mit „text/plain“ – so braucht der Browser
 * keine CORS-Vorabanfrage, die Apps Script nicht beantworten könnte.
 */
import { z } from 'zod';
import type { DocSnapshot } from '../domain/docSnapshot';
import type { LogBridge } from './syncQueue';

const BlockSchema = z.discriminatedUnion('typ', [
  z.object({ typ: z.literal('ueberschrift'), ebene: z.number(), text: z.string() }),
  z.object({ typ: z.literal('absatz'), text: z.string() }),
  z.object({ typ: z.literal('tabelle'), zeilen: z.array(z.array(z.string())) }),
]);
const LesenSchema = z.object({ titel: z.string(), bloecke: z.array(BlockSchema) });
const AnhaengenSchema = z.object({ angehaengt: z.array(z.string()), schonVorhanden: z.array(z.string()) });
const KorrigierenSchema = z.object({ korrigiert: z.boolean() });
const PingSchema = z.object({ titel: z.string() });

const ZEITLIMIT_MS = 30_000;

export class BridgeClient implements LogBridge {
  constructor(
    private readonly url: string,
    private readonly schluessel: string,
  ) {}

  /** Eine Aktion der Brücke aufrufen; wirft bei Fehlern eine verständliche deutsche Meldung. */
  private async rufe(aktion: string, daten: Record<string, unknown> = {}): Promise<unknown> {
    const abbruch = new AbortController();
    const timer = window.setTimeout(() => abbruch.abort(), ZEITLIMIT_MS);
    try {
      const antwort = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ aktion, schluessel: this.schluessel, ...daten }),
        redirect: 'follow',
        signal: abbruch.signal,
      });
      if (!antwort.ok) throw new Error(`Die Brücke antwortet mit Fehler ${antwort.status}.`);
      const text = await antwort.text();
      let json: { ok?: boolean; fehler?: string };
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error('Unerwartete Antwort vom Doc. Ist die Web-App für „Jeder“ freigegeben und die URL vollständig (endet auf /exec)?');
      }
      if (!json.ok) throw new Error(json.fehler ?? 'Unbekannter Fehler der Brücke.');
      return json;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw new Error('Zeitüberschreitung – das Doc hat nicht geantwortet.');
      if (e instanceof TypeError) {
        throw new Error(
          navigator.onLine
            ? 'Keine Verbindung zur Brücke. Prüfe die Web-App-URL und dass der Zugriff auf „Jeder“ steht.'
            : 'Offline – der Sync läuft automatisch, sobald wieder Netz da ist.',
        );
      }
      throw e;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async ping(): Promise<string> {
    return PingSchema.parse(await this.rufe('ping')).titel;
  }

  async lesen(): Promise<DocSnapshot> {
    return LesenSchema.parse(await this.rufe('lesen'));
  }

  async anhaengen(zeilen: { id: string; zellen: string[] }[]) {
    return AnhaengenSchema.parse(await this.rufe('anhaengen', { zeilen }));
  }

  async korrigieren(id: string, zellen: string[]) {
    return KorrigierenSchema.parse(await this.rufe('korrigieren', { id, zellen }));
  }

  async planDatenAnlegen(json: string): Promise<void> {
    await this.rufe('planDatenAnlegen', { json });
  }
}
