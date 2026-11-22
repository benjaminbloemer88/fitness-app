/**
 * Fitness-App ↔ Google-Doc „Trainingsplan & Log“ – Apps-Script-Brücke
 *
 * Dieses Skript wird im Doc unter „Erweiterungen → Apps Script“ eingefügt und als
 * Web-App bereitgestellt. Die Fitness-App spricht ausschließlich mit diesem Skript.
 *
 * Was das Skript kann – und NUR das:
 *   ping              – Verbindung testen
 *   lesen             – Überschriften, Absätze und Tabellen des Docs als Text liefern
 *   anhaengen         – neue Zeilen an die Log-Tabelle anhängen (leere Zeilen am Ende
 *                       zuerst füllen); Zeilen, deren [app:xxxx]-Kennung schon im Doc
 *                       steht, werden übersprungen
 *   korrigieren       – eine Zeile ersetzen, die die App selbst geschrieben hat
 *                       (erkennbar an ihrer [app:xxxx]-Kennung)
 *   planDatenAnlegen  – den Abschnitt „Plan-Daten“ einmalig vor dem Log einfügen,
 *                       nur wenn noch kein PLAN-JSON-START im Doc steht
 *
 * Profil, Wochenplan, Planarchiv und fremde Log-Zeilen werden nie verändert.
 *
 * @OnlyCurrentDoc  ← das Skript bekommt nur Zugriff auf DIESES Doc
 */

var LOG_SPALTEN = 5;
var MARKER_START = 'PLAN-JSON-START';
var MARKER_ENDE = 'PLAN-JSON-END';
var PLAN_DATEN_TITEL = 'Plan-Daten (für die App – nicht bearbeiten)';
var ID_MUSTER = /^[a-z0-9]{3,12}$/;

// ───────────────────────── Einrichtung (im Editor ausführen) ─────────────────────────

/** Einmal im Editor ausführen: erzeugt den geheimen Schlüssel und zeigt ihn im Protokoll. */
function schluesselErzeugen() {
  var schluessel = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40);
  PropertiesService.getScriptProperties().setProperty('SCHLUESSEL', schluessel);
  console.log('Neuer Schlüssel (in der App unter Einstellungen → Google-Doc-Sync eintragen):\n' + schluessel);
}

/** Zeigt, ob alles bereit ist (Doc, Schlüssel, Log-Tabelle, Web-App-URL). */
function einrichtungPruefen() {
  var dok = dok_();
  var schluessel = PropertiesService.getScriptProperties().getProperty('SCHLUESSEL');
  var url = ScriptApp.getService().getUrl();
  console.log('Doc: ' + dok.getName());
  console.log('Schlüssel vorhanden: ' + (schluessel ? 'ja' : 'NEIN – schluesselErzeugen ausführen'));
  console.log('Log-Tabelle gefunden: ' + (logTabelle_(dok.getBody()) ? 'ja' : 'NEIN'));
  console.log('Plan-Daten vorhanden: ' + (enthaeltMarker_(dok.getBody()) ? 'ja' : 'nein'));
  console.log('Web-App-URL: ' + (url || 'noch nicht bereitgestellt'));
}

// ───────────────────────── Web-App ─────────────────────────

function doGet() {
  return json_({ ok: true, hinweis: 'Fitness-Brücke aktiv. Die App spricht per POST mit diesem Skript.' });
}

function doPost(e) {
  var antwort;
  try {
    var anfrage = JSON.parse(e && e.postData && e.postData.contents ? e.postData.contents : '{}');
    pruefeSchluessel_(anfrage.schluessel);
    antwort = verarbeite_(anfrage);
  } catch (fehler) {
    antwort = { ok: false, fehler: String(fehler && fehler.message ? fehler.message : fehler) };
  }
  return json_(antwort);
}

function verarbeite_(anfrage) {
  switch (anfrage.aktion) {
    case 'ping':
      return { ok: true, titel: dok_().getName() };
    case 'lesen':
      return lesen_();
    case 'anhaengen':
      return mitSperre_(function () {
        return anhaengen_(anfrage.zeilen);
      });
    case 'korrigieren':
      return mitSperre_(function () {
        return korrigieren_(anfrage.id, anfrage.zellen);
      });
    case 'planDatenAnlegen':
      return mitSperre_(function () {
        return planDatenAnlegen_(anfrage.json);
      });
    default:
      throw new Error('Unbekannte Aktion: ' + anfrage.aktion);
  }
}

// ───────────────────────── Lesen ─────────────────────────

function lesen_() {
  var dok = dok_();
  var body = dok.getBody();
  var bloecke = [];
  for (var i = 0; i < body.getNumChildren(); i++) {
    var el = body.getChild(i);
    var typ = el.getType();
    if (typ === DocumentApp.ElementType.PARAGRAPH) {
      var p = el.asParagraph();
      var ebene = ueberschriftsEbene_(p.getHeading());
      var text = p.getText();
      if (ebene > 0) bloecke.push({ typ: 'ueberschrift', ebene: ebene, text: text });
      else if (text.trim() !== '') bloecke.push({ typ: 'absatz', text: text });
    } else if (typ === DocumentApp.ElementType.LIST_ITEM) {
      bloecke.push({ typ: 'absatz', text: el.asListItem().getText() });
    } else if (typ === DocumentApp.ElementType.TABLE) {
      bloecke.push({ typ: 'tabelle', zeilen: tabelleLesen_(el.asTable()) });
    }
  }
  return { ok: true, titel: dok.getName(), bloecke: bloecke };
}

function ueberschriftsEbene_(h) {
  var H = DocumentApp.ParagraphHeading;
  if (h === H.TITLE || h === H.HEADING1) return 1;
  if (h === H.SUBTITLE || h === H.HEADING2) return 2;
  if (h === H.HEADING3) return 3;
  if (h === H.HEADING4) return 4;
  if (h === H.HEADING5) return 5;
  if (h === H.HEADING6) return 6;
  return 0;
}

function ebeneZuUeberschrift_(ebene) {
  var H = DocumentApp.ParagraphHeading;
  return [H.NORMAL, H.HEADING1, H.HEADING2, H.HEADING3, H.HEADING4, H.HEADING5, H.HEADING6][ebene] || H.HEADING2;
}

function tabelleLesen_(tabelle) {
  var zeilen = [];
  for (var r = 0; r < tabelle.getNumRows(); r++) {
    var zeile = tabelle.getRow(r);
    var zellen = [];
    for (var c = 0; c < zeile.getNumCells(); c++) zellen.push(zeile.getCell(c).getText());
    zeilen.push(zellen);
  }
  return zeilen;
}

// ───────────────────────── Log-Tabelle finden ─────────────────────────

/** Normalisiert Zellentext für Vergleiche: Kleinbuchstaben, ohne Sternchen/Backslashes. */
function norm_(text) {
  return String(text).replace(/[*\\]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function istLogKopf_(zeile) {
  if (zeile.getNumCells() < LOG_SPALTEN) return false;
  var z = [];
  for (var c = 0; c < LOG_SPALTEN; c++) z.push(norm_(zeile.getCell(c).getText()));
  return (
    z[0] === 'datum' &&
    z[1] === 'einheit' &&
    z[2].indexOf('was gemacht') === 0 &&
    z[3].indexOf('gefühl') === 0 &&
    z[4].indexOf('anmerkungen') === 0
  );
}

/** Die Log-Tabelle ist die (einzige) Tabelle mit der Kopfzeile Datum | Einheit | Was gemacht | Gefühl | Anmerkungen. */
function logTabelle_(body) {
  var gefunden = null;
  for (var i = 0; i < body.getNumChildren(); i++) {
    var el = body.getChild(i);
    if (el.getType() !== DocumentApp.ElementType.TABLE) continue;
    var t = el.asTable();
    if (t.getNumRows() > 0 && istLogKopf_(t.getRow(0))) {
      if (gefunden) throw new Error('Mehr als eine Log-Tabelle gefunden – aus Sicherheit wird nichts geschrieben.');
      gefunden = t;
    }
  }
  return gefunden;
}

function zeilenText_(zeile) {
  var teile = [];
  for (var c = 0; c < zeile.getNumCells(); c++) teile.push(zeile.getCell(c).getText());
  return teile.join(' | ');
}

function istLeer_(zeile) {
  return zeilenText_(zeile).replace(/[|\s]/g, '') === '';
}

function appIds_(tabelle) {
  var ids = {};
  for (var r = 1; r < tabelle.getNumRows(); r++) {
    var text = zeilenText_(tabelle.getRow(r));
    var muster = /\[app:([a-z0-9]{3,12})\]/gi;
    var m;
    while ((m = muster.exec(text)) !== null) ids[m[1].toLowerCase()] = r;
  }
  return ids;
}

// ───────────────────────── Schreiben ─────────────────────────

function pruefeZeile_(zeile) {
  if (!zeile || !ID_MUSTER.test(String(zeile.id))) throw new Error('Ungültige Kennung.');
  var zellen = zeile.zellen;
  if (!Array.isArray(zellen) || zellen.length !== LOG_SPALTEN) throw new Error('Eine Log-Zeile braucht genau 5 Zellen.');
  for (var i = 0; i < zellen.length; i++) {
    if (typeof zellen[i] !== 'string' || zellen[i].length > 2000) throw new Error('Ungültiger Zelleninhalt.');
  }
  if (zellen[4].indexOf('[app:' + zeile.id + ']') < 0) throw new Error('Die Anmerkungen müssen die Kennung [app:' + zeile.id + '] enthalten.');
}

function fuelleZeile_(zeile, zellen) {
  for (var c = 0; c < LOG_SPALTEN; c++) {
    var zelle = zeile.getCell(c);
    zelle.setText(zellen[c]);
    var text = zelle.editAsText();
    if (text.getText().length > 0) {
      text.setBold(false);
      text.setItalic(false);
    }
  }
}

/** Erste freie Zeile NACH dem letzten Eintrag (damit die Reihenfolge stimmt). */
function freieZeile_(tabelle) {
  var letzteBelegte = 0;
  for (var r = tabelle.getNumRows() - 1; r >= 1; r--) {
    if (!istLeer_(tabelle.getRow(r))) {
      letzteBelegte = r;
      break;
    }
  }
  for (var k = letzteBelegte + 1; k < tabelle.getNumRows(); k++) {
    var zeile = tabelle.getRow(k);
    if (zeile.getNumCells() >= LOG_SPALTEN && istLeer_(zeile)) return zeile;
  }
  return null;
}

function neueZeile_(tabelle) {
  var letzte = tabelle.getRow(tabelle.getNumRows() - 1);
  if (letzte.getNumCells() >= LOG_SPALTEN) return tabelle.appendTableRow(letzte.copy());
  var zeile = tabelle.appendTableRow();
  for (var c = 0; c < LOG_SPALTEN; c++) zeile.appendTableCell('');
  return zeile;
}

function anhaengen_(zeilen) {
  if (!Array.isArray(zeilen) || zeilen.length === 0) throw new Error('Keine Zeilen übergeben.');
  if (zeilen.length > 50) throw new Error('Zu viele Zeilen auf einmal.');
  zeilen.forEach(pruefeZeile_);

  var tabelle = logTabelle_(dok_().getBody());
  if (!tabelle) throw new Error('Log-Tabelle nicht gefunden (Kopfzeile: Datum | Einheit | Was gemacht | Gefühl 1–10 | Anmerkungen).');

  var vorhanden = appIds_(tabelle);
  var angehaengt = [];
  var schonVorhanden = [];
  zeilen.forEach(function (z) {
    if (vorhanden[z.id] !== undefined) {
      schonVorhanden.push(z.id);
      return;
    }
    var ziel = freieZeile_(tabelle) || neueZeile_(tabelle);
    fuelleZeile_(ziel, z.zellen);
    vorhanden[z.id] = -1;
    angehaengt.push(z.id);
  });
  return { ok: true, angehaengt: angehaengt, schonVorhanden: schonVorhanden };
}

function korrigieren_(id, zellen) {
  pruefeZeile_({ id: id, zellen: zellen });
  var tabelle = logTabelle_(dok_().getBody());
  if (!tabelle) throw new Error('Log-Tabelle nicht gefunden.');
  var treffer = [];
  for (var r = 1; r < tabelle.getNumRows(); r++) {
    if (zeilenText_(tabelle.getRow(r)).toLowerCase().indexOf('[app:' + id + ']') >= 0) treffer.push(r);
  }
  if (treffer.length !== 1) return { ok: true, korrigiert: false, treffer: treffer.length };
  fuelleZeile_(tabelle.getRow(treffer[0]), zellen);
  return { ok: true, korrigiert: true };
}

function enthaeltMarker_(body) {
  for (var i = 0; i < body.getNumChildren(); i++) {
    var el = body.getChild(i);
    var typ = el.getType();
    if (typ !== DocumentApp.ElementType.PARAGRAPH && typ !== DocumentApp.ElementType.LIST_ITEM) continue;
    var text = (typ === DocumentApp.ElementType.PARAGRAPH ? el.asParagraph() : el.asListItem()).getText();
    if (text.replace(/\\/g, '').indexOf(MARKER_START) >= 0) return true;
  }
  return false;
}

function planDatenAnlegen_(json) {
  var body = dok_().getBody();
  if (enthaeltMarker_(body)) throw new Error('Im Doc stehen schon Plan-Daten – es wird nichts überschrieben.');

  var plan;
  try {
    plan = JSON.parse(json);
  } catch (e) {
    throw new Error('Die Plan-Daten sind kein gültiges JSON.');
  }
  if (!plan || plan.version !== 1 || !Array.isArray(plan.tage) || plan.tage.length !== 7) {
    throw new Error('Die Plan-Daten entsprechen nicht dem Schema (version 1, genau 7 Tage).');
  }

  // Einfügepunkt: die Überschrift direkt über der Log-Tabelle (also nach dem Wochenplan, vor dem Log).
  var tabelle = logTabelle_(body);
  if (!tabelle) throw new Error('Log-Tabelle nicht gefunden.');
  var index = body.getChildIndex(tabelle);
  var ueberschrift = null;
  for (var i = index - 1; i >= 0; i--) {
    var el = body.getChild(i);
    if (el.getType() === DocumentApp.ElementType.PARAGRAPH && ueberschriftsEbene_(el.asParagraph().getHeading()) > 0) {
      ueberschrift = el.asParagraph();
      index = i;
      break;
    }
  }
  if (!ueberschrift) throw new Error('Überschrift „Log“ nicht gefunden.');
  var ebene = ueberschriftsEbene_(ueberschrift.getHeading());

  body.insertParagraph(index, PLAN_DATEN_TITEL).setHeading(ebeneZuUeberschrift_(ebene));
  body.insertParagraph(index + 1, MARKER_START).setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.insertParagraph(index + 2, JSON.stringify(plan)).setHeading(DocumentApp.ParagraphHeading.NORMAL);
  body.insertParagraph(index + 3, MARKER_ENDE).setHeading(DocumentApp.ParagraphHeading.NORMAL);
  return { ok: true };
}

// ───────────────────────── Hilfsfunktionen ─────────────────────────

function dok_() {
  var dok = DocumentApp.getActiveDocument();
  if (!dok) throw new Error('Kein Doc – das Skript muss über „Erweiterungen → Apps Script“ im Doc angelegt werden.');
  return dok;
}

function pruefeSchluessel_(schluessel) {
  var soll = PropertiesService.getScriptProperties().getProperty('SCHLUESSEL');
  if (!soll) throw new Error('Im Skript ist noch kein Schlüssel eingerichtet (Funktion schluesselErzeugen ausführen).');
  if (typeof schluessel !== 'string' || schluessel.length !== soll.length) {
    Utilities.sleep(800);
    throw new Error('Falscher Schlüssel.');
  }
  var unterschied = 0;
  for (var i = 0; i < soll.length; i++) unterschied |= soll.charCodeAt(i) ^ schluessel.charCodeAt(i);
  if (unterschied !== 0) {
    Utilities.sleep(800);
    throw new Error('Falscher Schlüssel.');
  }
}

function mitSperre_(fn) {
  var sperre = LockService.getScriptLock();
  sperre.waitLock(20000);
  try {
    var ergebnis = fn();
    dok_().saveAndClose();
    return ergebnis;
  } finally {
    sperre.releaseLock();
  }
}

function json_(objekt) {
  return ContentService.createTextOutput(JSON.stringify(objekt)).setMimeType(ContentService.MimeType.JSON);
}
