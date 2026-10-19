# Bordbuch – digitales Logbuch für die Motoryacht

Eine Web-App (PWA), die sich wie eine normale App auf dem Homescreen installieren lässt, offline funktioniert und ohne Claude läuft. Alle Daten liegen zunächst auf dem Handy (IndexedDB) und werden – wenn eingerichtet – mit deinem OneDrive abgeglichen.

## Inhalt des Ordners

| Datei | Zweck |
|---|---|
| `index.html` | Die komplette App |
| `sw.js` | Service Worker – macht die App offline-fähig, merkt sich angesehene Kartenausschnitte |
| `manifest.webmanifest` | App-Name, Icon, Vollbild-Modus |
| `icon-192.png`, `icon-512.png` | App-Icons |

## 1. Online stellen (einmalig, kostenlos)

GPS und Offline-Modus funktionieren nur über **HTTPS**. Die App muss deshalb einmal auf einem Webspace liegen. Danach braucht sie den Server kaum noch.

**Variante A – GitHub Pages**
1. Kostenloses Konto auf github.com anlegen, neues öffentliches Repository erstellen, zum Beispiel `bordbuch`.
2. „Add file → Upload files“, alle Dateien dieses Ordners hochladen.
3. Settings → Pages → Branch `main` / Ordner `/ (root)` → Save.
4. Nach etwa 1 Minute ist die App unter `https://<benutzername>.github.io/bordbuch/` erreichbar.

**Variante B – Netlify oder Cloudflare Pages**
Kostenloses Konto anlegen und den Ordner per Drag & Drop hochladen.

Eigene Daten landen nie auf diesem Server – er liefert nur die App-Dateien aus.

## 2. Auf dem Handy installieren

- **iPhone:** Adresse in **Safari** öffnen → Teilen-Symbol → „Zum Home-Bildschirm“. Danach immer über das Icon starten. Nur so bleiben die Daten dauerhaft gespeichert.
- **Android:** In Chrome öffnen → Menü ⋮ → „App installieren“.
- Beim ersten Tippen auf „Start“ den Standortzugriff erlauben. Unter iOS: Einstellungen → Datenschutz → Ortungsdienste → Safari-Websites → „Beim Verwenden“ + „Genauer Standort“.
- Einmal mit Internet öffnen, damit Karte und App-Dateien zwischengespeichert werden.

## 3. Bedienung

- **Start (Motor gestartet):** speichert den Fahrtbeginn (Datum, Uhrzeit, GPS-Position) und startet die Aufzeichnung der Strecke.
- **Stop (Motor ausgeschaltet):** speichert das Fahrtende und beendet die Aufzeichnung (mit Sicherheitsabfrage).
- Während der Fahrt: **„Ereignis notieren“** setzt einen Kommentar an die aktuelle Position (Schleuse, Manöver …).
- Sobald Internet da ist, werden automatisch nachgeladen: Ortsnamen von Fahrtbeginn und Fahrtende (OpenStreetMap) und das Wetter zum jeweiligen Zeitpunkt (Open-Meteo: Beschreibung, Temperatur in °C, Wind mit Richtung und Böen in km/h).
- **Boot:** In der Kopfzeile steht Bootsbezeichnung und Bootsname (Standard: Sessa C42 HT „Blue Moon“). Antippen zum Ändern – das Boot wird bei jeder neuen Fahrt mitgespeichert.
- **Menü ☰ → Fahrten:** Filter nach Boot (Standard „Blue Moon“, oder „Alle Boote“), Skipper, Steuermann und Zeitraum von/bis. Bei gewähltem Steuermann wird zusätzlich angezeigt, wie viele Kilometer und Stunden diese Person selbst gesteuert hat. Für die Auswahl werden Anzahl, Gesamtstrecke und Gesamtdauer angezeigt. In einer Fahrt: Karte mit Track, Dauer, Strecke in km, Durchschnitts- und Höchstgeschwindigkeit in km/h, Wetter, Fahrtkommentar. In die Karte zoomen und auf Punkt oder Linie tippen zeigt Uhrzeit, Geschwindigkeit und ein Kommentarfeld. Kommentierte Punkte werden orange hervorgehoben. Ebenen-Schalter: Seezeichen von OpenSeaMap einblenden.
- **Skipper, Steuermann, Pax (unter dem Stop-Knopf):** Voreingestellt ist jeweils „Arne Klöfkorn“, wählbar auch „Anja Klöfkorn“ oder „Weiterer Skipper …“ / „Weiterer Steuermann …“ (Name eingeben, erscheint danach dauerhaft in der Auswahl).
  - Der Skipper wird beim Start festgelegt und ist während der Fahrt gesperrt.
  - Der Steuermann kann jederzeit während der Fahrt gewechselt werden; jeder Wechsel wird mit Uhrzeit gespeichert. In der Fahrt siehst du, wer wann wie viele Kilometer gesteuert hat.
  - Pax: Anzahl der Personen an Bord (1 bis 12). Danach fragt die App, ob du die Namen jetzt oder später eingeben möchtest. Skipper und Steuerleute zählen automatisch mit. Fehlende Namen trägst du später unter Fahrten → Fahrt → „Namen nachtragen“ ein.
  - Vor Fahrtbeginn sind Skipper und Steuermann frei wählbar. Kommt eine neue Person dazu, obwohl alle Plätze belegt sind, fragt die App, ob die bisherige Person an Bord bleibt (eine Person mehr) oder ersetzt wird.
  - Während der Fahrt stehen als Steuermann nur noch die Personen an Bord zur Auswahl, sobald alle namentlich erfasst sind. „Weiterer Steuermann …“ erscheint erst wieder, wenn die Personenzahl erhöht wird.
  - Wurde die letzte Fahrt vor weniger als 48 Stunden beendet, sind Skipper, Personenzahl und alle Personen an Bord aus dieser Fahrt vorbelegt. Sonst gilt die Voreinstellung (Arne Klöfkorn, 2 Personen).
- **S.O.S (roter Knopf links):** öffnet sofort das Notfallfenster: MRCC Bremen mit UKW-Kanal 16 und 70 (DSC) und der Notrufnummer +49 421 53687-0 (antippen ruft direkt an), darunter alle Bootsdaten, die laufend aktualisierte GPS-Position groß und zum Vorlesen ausgeschrieben sowie die Anzahl der Personen an Bord. Funktioniert auch ohne Internet.
- **Tanken (kleiner Knopf mit Zapfsäule):** öffnet die Eingabe für getankte Liter, Preis je Liter und Kraftstoffart (voreingestellt „Diesel“). Datum, Uhrzeit, Ort und Boot werden automatisch gespeichert; Datum und Uhrzeit lassen sich ändern, wenn du nachträglich einträgst. „Vollgetankt“ bleibt angehakt, wenn der Tank voll ist; bei einer Teilbetankung den Haken entfernen.
- **Menü ☰ → Verbrauch:** Kilometer und Fahrzeit seit dem letzten Tanken, getankte Liter, Kosten, Durchschnittspreis, Verbrauch in Litern je Kilometer und je Stunde sowie Kosten je Kilometer. Filter nach Boot (Standard „Blue Moon“), Kraftstoffart und Zeitraum. Ein Tipp auf einen Tankvorgang öffnet ihn zum Ändern; mit dem Papierkorb in der Zeile wird er gelöscht. CSV-Export für Excel.
  Berechnung: getankte Liter ÷ gefahrene Kilometer zwischen zwei Tankvorgängen mit „Vollgetankt“; Teilbetankungen dazwischen werden mitgezählt. Der erste Tankvorgang ist nur der Ausgangswert.
- **Einstellungen → Boot:** zusätzlich MMSI, Callsign, Bootskennzeichen, Länge, Breite, Höhe (je in Metern) und Verdrängung (in Tonnen). Diese Angaben gehören fest zum Bootsnamen, werden mit OneDrive abgeglichen und im Notfallfenster angezeigt.
- **Einstellungen → Skipper / Steuermann:** selbst hinzugefügte Namen für künftige Fahrten entfernen; vergangene Fahrten bleiben unverändert.
- **Einstellungen → Kraftstoffarten:** weitere Kraftstoffarten hinzufügen (zum Beispiel Super E10) oder selbst angelegte wieder entfernen.
- **Menü ☰ → Kommentare:** alle Kommentare als Tabelle, durchsuchbar, Tipp auf eine Zeile springt zur Stelle in der Karte. CSV-Export für Excel.
- Pro Fahrt: **GPX-Export** (zum Beispiel für Navionics, OpenCPN, Google Earth).

### Wichtig: GPS im Hintergrund
Ein Browser darf GPS nur aufzeichnen, solange die App sichtbar ist. Deshalb hält die App während der Fahrt das Display an. Wird das Handy gesperrt oder eine andere App geöffnet, pausiert die Aufzeichnung; beim Zurückkehren läuft sie weiter und die Lücke wird als gerade Linie verbunden. Für lange Fahrten: Handy an Strom, App offen lassen. Auch ein Neustart oder Absturz verliert nichts – jede Position wird sofort gespeichert und die laufende Fahrt beim nächsten Öffnen fortgesetzt.

## 4. Geräteübergreifend: OneDrive (automatisch)

Die App spricht direkt mit deinem OneDrive. Dafür braucht sie eine eigene, kostenlose „App-Registrierung“ bei Microsoft (etwa 5 Minuten, einmalig):

1. Mit deinem Microsoft-Konto auf **https://portal.azure.com** anmelden → „App-Registrierungen“ → „Neue Registrierung“.
2. Name: `Bordbuch`. Unterstützte Kontotypen: **„Konten in einem beliebigen Organisationsverzeichnis und persönliche Microsoft-Konten“**.
3. Umleitungs-URI: Plattform **„Single-Page-Anwendung (SPA)“**, Adresse genau wie in der App unter Einstellungen angezeigt, zum Beispiel `https://<benutzername>.github.io/bordbuch/`.
4. Registrieren → die **Anwendungs-ID (Client-ID)** kopieren.
5. In der App: ☰ → Einstellungen → Client-ID einfügen → „Mit OneDrive verbinden“ → anmelden und zustimmen.
6. Auf jedem weiteren Gerät dieselbe Adresse öffnen, dieselbe Client-ID eintragen, mit demselben Microsoft-Konto verbinden.

Die Fahrten liegen dann als einzelne Dateien in `OneDrive/Apps/Bordbuch/trips/`, die Tankvorgänge in `OneDrive/Apps/Bordbuch/fuel/`. Die App hat nur Zugriff auf diesen eigenen Ordner. Abgleich: beim Öffnen, bei neuer Internetverbindung, nach jeder Fahrt und jedem Kommentar, sowie alle 5 Minuten. Bei Konflikten gewinnt die zuletzt geänderte Fassung einer Fahrt.

Hinweis: Microsoft lässt reine Web-Apps grundsätzlich nur 24 Stunden ohne erneute Anmeldung arbeiten; das lässt sich auch in der Azure-Registrierung nicht verlängern. Die App erneuert die Anmeldung deshalb ab etwa 18 Stunden automatisch beim Öffnen (kurzer Seitenwechsel zu Microsoft und zurück, ohne Eingabe) – nie während einer laufenden Fahrt. Damit das klappt, bei der Microsoft-Anmeldung „Angemeldet bleiben?“ mit **Ja** beantworten. Nur wenn Microsoft trotzdem eine Eingabe verlangt, steht oben „bitte neu verbinden“; bis dahin bleibt alles lokal gespeichert und wird danach nachsynchronisiert.

## 5. iCloud

Apple erlaubt Web-Apps keinen direkten Zugriff auf iCloud Drive (dafür wäre eine native App mit kostenpflichtigem Apple-Entwicklerkonto nötig). Weg über Datensicherung:

- ☰ → Einstellungen → **„Sicherung exportieren“** → Teilen-Menü → „In Dateien sichern“ → iCloud Drive.
- Auf einem anderen Gerät: **„Sicherung importieren“** → Datei wählen. Fahrten werden zusammengeführt, nicht doppelt angelegt.

Wer automatischen Abgleich zwischen iPhone, iPad und Mac möchte, nimmt am einfachsten OneDrive (läuft auch auf Apple-Geräten).

## 6. Einstellungen zur Aufzeichnung

- Mindestabstand zwischen Wegpunkten: 10 m (Standard)
- Spätestens alle 30 s ein Wegpunkt
- Positionen ungenauer als 50 m werden verworfen
- Drift am Liegeplatz wird nicht als Strecke gezählt.

## Datenquellen

Karten © OpenStreetMap-Mitwirkende, Seezeichen © OpenSeaMap, Ortsnamen über Nominatim (OpenStreetMap), Wetter von Open-Meteo.com (CC BY 4.0). Alle kostenlos und ohne API-Schlüssel.

## Versionen

Die Versionsnummer steht klein unten links auf der Startseite und in den Einstellungen. Kleine Änderungen erhöhen die Nummer um 0.1, größere die ganze Zahl.

| Version | Änderungen |
|---|---|
| 1.0 | Erstversion: Aufzeichnung, Karte, Kommentare, OneDrive |
| 1.1 | Alles ausgeschrieben, metrische Einheiten |
| 1.2 | Runde Start/Stop-Knöpfe, Boot in der Kopfzeile, Fahrtenfilter |
| 2.0 | Tanken und Auswertung „Verbrauch“, Kraftstoffarten, Versionsnummer |
| 3.0 | Besatzung: Skipper, Steuermann (mit Wechseln während der Fahrt), Personen an Bord; Tankknopf neben Start/Stop; Tankvorgang in der Liste löschen |
| 3.1 | Personen an Bord standardmäßig 2 |
| 3.2 | Datumsfelder „Von“/„Bis“ im Filter an die übrigen Felder angepasst |
| 3.3 | Updates kommen zuverlässig an (App lädt online immer die neueste Version); Knopf „Nach neuer Version suchen“ in den Einstellungen |
| 3.4 | „Personen an Bord“ auf der Startseite als größere Schaltfläche im Stil der übrigen Felder |
| 4.0 | Bootsdaten (MMSI, Callsign, Kennzeichen, Maße, Verdrängung) und S.O.S-Notfallfenster |
| 4.1 | Steuermann-Auswahl auf die Personen an Bord begrenzt; Besatzung der letzten Fahrt (bis 48 Stunden) vorbelegt |
| 4.2 | Vor Fahrtbeginn Skipper und Steuermann wieder frei wählbar (mit Frage „bleibt an Bord / ersetzen“) |
| 4.3 | Anzeige „Aufzeichnung läuft“ im Stil der Knöpfe (Instrumentenanzeigen mit Chromrand) |
| 4.4 | OneDrive-Anmeldung wird vor Ablauf automatisch im Hintergrund erneuert |
