# Apps-Script-Brücke einrichten (ca. 10 Minuten)

Die Brücke ist ein kleines Skript **im Google-Doc selbst**. Die Fitness-App spricht nur mit diesem
Skript; es kann ausschließlich den Plan lesen, Log-Zeilen anhängen, eigene `[app:…]`-Zeilen
korrigieren und einmalig die Plan-Daten anlegen. Dank `@OnlyCurrentDoc` hat es nur Zugriff auf
dieses eine Doc.

> **Erst an einer Kopie testen**, dann dieselben Schritte im echten Doc wiederholen.

## 1. Kopie des Docs anlegen (nur für den Test)

1. Das Doc „Trainingsplan & Log“ öffnen → **Datei → Kopie erstellen**.
2. Name: `Trainingsplan & Log – TEST` → **Kopie erstellen**. Die Kopie öffnet sich.

## 2. Skript einfügen

1. Im (kopierten) Doc: **Erweiterungen → Apps Script**. Ein neues Projekt öffnet sich.
2. Oben links auf „Unbenanntes Projekt“ klicken → Name `Fitness-Brücke` → **Umbenennen**.
3. Den gesamten Inhalt von `Code.gs` löschen und den Inhalt von
   [`apps-script/Code.gs`](https://github.com/benjaminbloemer88/fitness-app/blob/main/apps-script/Code.gs)
   einfügen (auf GitHub: Symbol **„Copy raw file“**).
4. **Speichern** (Strg + S).

## 3. Schlüssel erzeugen und Zugriff erlauben

1. Oben in der Funktionsauswahl **`schluesselErzeugen`** wählen → **Ausführen**.
2. Beim ersten Mal fragt Google nach Berechtigungen:
   **Berechtigungen prüfen** → dein Konto wählen →
   „Google hat diese App nicht überprüft“ → **Erweitert** → **Zu Fitness-Brücke wechseln (unsicher)** → **Zulassen**.
   (Das ist normal für eigene Skripte. Erlaubt wird nur der Zugriff auf *dieses* Doc.)
3. Unten im **Ausführungsprotokoll** steht der neue Schlüssel (40 Zeichen) → kopieren.

## 4. Als Web-App bereitstellen

1. Oben rechts **Bereitstellen → Neue Bereitstellung**.
2. Beim Zahnrad „Typ auswählen“ → **Web-App**.
3. Beschreibung: `Fitness-App` · **Ausführen als: Ich** · **Zugriff: Jeder**.
4. **Bereitstellen** → die **Web-App-URL** (endet auf `/exec`) kopieren.

Optional: Funktion **`einrichtungPruefen`** ausführen – das Protokoll zeigt, ob Schlüssel,
Log-Tabelle und Web-App-URL gefunden wurden.

## 5. In der App eintragen

App öffnen → **Einstellungen → Google-Doc-Sync** → URL und Schlüssel einfügen →
**Verbindung testen & speichern**. Danach lädt die App Plan und Log und schickt wartende Einträge.

Tipp für den Test an der Kopie: am PC in Chrome unter
https://benjaminbloemer88.github.io/fitness-app/ einrichten. Die App am PC hat ihre eigenen
lokalen Daten – so bleiben Testeinträge vom Handy fern.

## Später: Skript aktualisieren

Ändert sich `Code.gs`, den neuen Inhalt einfügen, speichern und dann
**Bereitstellen → Bereitstellungen verwalten → ✏️ Bearbeiten → Version: Neue Version → Bereitstellen**.
So bleibt die Web-App-URL gleich.

## Sicherheit

- Wer die URL **und** den Schlüssel kennt, kann Zeilen ans Log anhängen – sonst nichts.
- Schlüssel neu erzeugen: `schluesselErzeugen` erneut ausführen und in der App neu eintragen.
- Abschalten: **Bereitstellen → Bereitstellungen verwalten → Archivieren**.
