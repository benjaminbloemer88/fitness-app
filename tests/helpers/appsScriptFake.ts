/**
 * Nachgebautes Google-Doc + Attrappen der Google-Dienste, um apps-script/Code.gs
 * in einer Sandbox (node:vm) auszuführen.
 */
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import type { DocBlock, DocSnapshot } from '../../src/domain/docSnapshot';

export const H = {
  NORMAL: 'NORMAL',
  TITLE: 'TITLE',
  SUBTITLE: 'SUBTITLE',
  HEADING1: 'HEADING1',
  HEADING2: 'HEADING2',
  HEADING3: 'HEADING3',
  HEADING4: 'HEADING4',
  HEADING5: 'HEADING5',
  HEADING6: 'HEADING6',
};

export class Zelle {
  bold = false;
  italic = false;
  constructor(public text: string) {}
  getText() {
    return this.text;
  }
  setText(t: string) {
    this.text = t;
    return this;
  }
  editAsText() {
    return {
      getText: () => this.text,
      setBold: (b: boolean) => (this.bold = b),
      setItalic: (i: boolean) => (this.italic = i),
    };
  }
}
export class Zeile {
  constructor(public zellen: Zelle[]) {}
  getNumCells() {
    return this.zellen.length;
  }
  getCell(i: number) {
    return this.zellen[i]!;
  }
  appendTableCell(t: string) {
    const z = new Zelle(t);
    this.zellen.push(z);
    return z;
  }
  copy() {
    return new Zeile(this.zellen.map((z) => Object.assign(new Zelle(z.text), { italic: z.italic, bold: z.bold })));
  }
}
export class Tabelle {
  constructor(public zeilen: Zeile[]) {}
  getType() {
    return 'TABLE';
  }
  asTable() {
    return this;
  }
  getNumRows() {
    return this.zeilen.length;
  }
  getRow(i: number) {
    return this.zeilen[i]!;
  }
  appendTableRow(z?: Zeile) {
    const neu = z ?? new Zeile([]);
    this.zeilen.push(neu);
    return neu;
  }
}
export class Absatz {
  constructor(
    public text: string,
    public heading: string,
  ) {}
  getType() {
    return 'PARAGRAPH';
  }
  asParagraph() {
    return this;
  }
  getText() {
    return this.text;
  }
  getHeading() {
    return this.heading;
  }
  setHeading(h: string) {
    this.heading = h;
    return this;
  }
}
export type Element = Absatz | Tabelle;
export class Body {
  constructor(public kinder: Element[]) {}
  getNumChildren() {
    return this.kinder.length;
  }
  getChild(i: number) {
    return this.kinder[i]!;
  }
  getChildIndex(el: Element) {
    return this.kinder.indexOf(el);
  }
  insertParagraph(i: number, text: string) {
    const p = new Absatz(text, H.NORMAL);
    this.kinder.splice(i, 0, p);
    return p;
  }
}

export type FakeDoc = ReturnType<typeof baueDoc>;

/** Baut aus einem DocSnapshot ein Fake-Doc. Zellen mit „*…*“ werden kursiv (wie die Vorlage im echten Doc). */
export function baueDoc(snapshot: DocSnapshot) {
  const kinder: Element[] = snapshot.bloecke.map((b: DocBlock) => {
    if (b.typ === 'tabelle') {
      return new Tabelle(b.zeilen.map((z) => new Zeile(z.map((t) => Object.assign(new Zelle(t), { italic: t.startsWith('*') })))));
    }
    return new Absatz(b.text, b.typ === 'ueberschrift' ? `HEADING${b.ebene}` : H.NORMAL);
  });
  const body = new Body(kinder);
  return { body, getName: () => snapshot.titel, getBody: () => body, saveAndClose: () => undefined };
}

/** Lädt Code.gs in eine Sandbox und gibt eine Funktion zurück, die doPost aufruft. */
export function ladeSkript(doc: FakeDoc, eigenschaften: Record<string, string>) {
  const kontext = createContext({
    DocumentApp: {
      getActiveDocument: () => doc,
      ElementType: { PARAGRAPH: 'PARAGRAPH', TABLE: 'TABLE', LIST_ITEM: 'LIST_ITEM' },
      ParagraphHeading: H,
    },
    ContentService: { createTextOutput: (s: string) => ({ setMimeType: () => s }), MimeType: { JSON: 'JSON' } },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => eigenschaften[k] ?? null,
        setProperty: (k: string, v: string) => (eigenschaften[k] = v),
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
    Utilities: { sleep: () => undefined, getUuid: () => crypto.randomUUID() },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/test/exec' }) },
    console: { log: () => undefined },
    JSON,
  });
  runInContext(readFileSync(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8'), kontext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (anfrage: object): any => JSON.parse(kontext.doPost({ postData: { contents: JSON.stringify(anfrage) } }));
}

/** Eine DocBridge, die direkt mit dem Skript in der Sandbox spricht (wie BridgeClient, nur ohne Netz). */
export function sandboxBridge(rufe: ReturnType<typeof ladeSkript>, schluessel: string) {
  const mit = (aktion: string, daten: object = {}) => {
    const antwort = rufe({ aktion, schluessel, ...daten });
    if (!antwort.ok) throw new Error(antwort.fehler);
    return antwort;
  };
  return {
    lesen: async () => {
      const a = mit('lesen');
      return { titel: a.titel as string, bloecke: a.bloecke as DocBlock[] };
    },
    anhaengen: async (zeilen: { id: string; zellen: string[] }[]) => {
      const a = mit('anhaengen', { zeilen });
      return { angehaengt: a.angehaengt as string[], schonVorhanden: a.schonVorhanden as string[] };
    },
    korrigieren: async (id: string, zellen: string[]) => ({ korrigiert: mit('korrigieren', { id, zellen }).korrigiert as boolean }),
    planDatenAnlegen: async (json: string) => {
      mit('planDatenAnlegen', { json });
    },
  };
}
