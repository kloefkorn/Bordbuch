# Bordbuch – digitales Logbuch für die Motoryacht

Eine Web-App (PWA), die sich wie eine normale App auf dem Homescreen installieren lässt, offline funktioniert und ohne Claude läuft. Alle Daten liegen zunächst auf dem Handy (IndexedDB) und werden – wenn eingerichtet – mit deinem OneDrive abgeglichen.

## Inhalt des Ordners

| Datei | Zweck |
|---|---|
| `index.html` | Seitengerüst und Gestaltung der App |
| `app.js` | Der gesamte Programmcode |
| `sw.js` | Service Worker – macht die App offline-fähig, merkt sich angesehene Kartenausschnitte |
| `manifest.webmanifest` | App-Name, Icon, Vollbild-Modus |
| `icon-192.png`, `icon-512.png` | App-Icons |
| `leaflet/` (Ordner) | Kartenbibliothek Leaflet 1.9.4 (BSD-Lizenz), aus dem offiziellen Quellcode gebaut – wird nicht mehr von fremden Servern geladen |
| `ANLEITUNG.md` | Diese Anleitung |

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
- **Beim allerersten Start** fragt die App nach Bootsname (Pflicht), Bootsmodell (freiwillig), Skipper und Steuermann (Pflicht) und ob OneDrive genutzt werden soll. Alles lässt sich später in den Einstellungen ändern.

### Die App an Bekannte weitergeben
Einfach die Adresse der App (zum Beispiel `https://<benutzername>.github.io/bordbuch/`) weitergeben. Jeder installiert sie auf seinem eigenen Gerät; die Daten bleiben getrennt auf dem jeweiligen Gerät bzw. im eigenen OneDrive. Ein eigenes GitHub-Konto brauchen Bekannte nicht. Wer OneDrive nutzen möchte, schaltet es einfach ein und meldet sich mit dem eigenen Microsoft-Konto an – die Daten landen nur im eigenen OneDrive.

## 3. Bedienung

- **Start (Motor gestartet):** speichert den Fahrtbeginn (Datum, Uhrzeit, GPS-Position) und startet die Aufzeichnung der Strecke.
- **Stop (Motor ausgeschaltet):** speichert das Fahrtende und beendet die Aufzeichnung (mit Sicherheitsabfrage).
- Während der Fahrt: **„Ereignis notieren“** setzt einen Kommentar an die aktuelle Position (Schleuse, Manöver …).
- Sobald Internet da ist, werden automatisch nachgeladen: Ortsnamen von Fahrtbeginn und Fahrtende (OpenStreetMap) und das Wetter zum jeweiligen Zeitpunkt (Open-Meteo: Beschreibung, Temperatur in °C, Wind mit Richtung und Böen in km/h).
- **Boot:** In der Kopfzeile stehen Bootsmodell und Bootsname aus der Ersteinrichtung. Antippen zum Ändern – das Boot wird bei jeder neuen Fahrt mitgespeichert.
- **Menü ☰ → Fahrten:** Über den Papierkorb unten rechts auf jeder Fahrt lässt sie sich direkt in der Übersicht löschen (mit Sicherheitsabfrage). Filter nach Boot (Standard: das eingestellte Boot, oder „Alle Boote“), Skipper, Steuermann, Person an Bord und Zeitraum von/bis. Bei gewähltem Steuermann wird zusätzlich angezeigt, wie viele Kilometer und Stunden diese Person selbst gesteuert hat. Für die Auswahl werden Anzahl, Gesamtstrecke und Gesamtdauer angezeigt. In einer Fahrt: Karte mit Track, Dauer, Strecke in km, Durchschnitts- und Höchstgeschwindigkeit in km/h, Wetter, Fahrtkommentar. In die Karte zoomen und auf Punkt oder Linie tippen zeigt Uhrzeit, Geschwindigkeit und ein Kommentarfeld. Kommentierte Punkte werden orange hervorgehoben. Seezeichen von OpenSeaMap sind standardmäßig eingeblendet; abschaltbar unter Einstellungen → Karte oder über das Ebenen-Symbol in der Karte.
- **Skipper, Steuermann, Pax (unter dem Stop-Knopf):** Voreingestellt sind die Namen aus der Ersteinrichtung, wählbar auch „Weiterer Skipper …“ / „Weiterer Steuermann …“ (Name eingeben, erscheint danach dauerhaft in der Auswahl).
  - Der Skipper wird beim Start festgelegt und ist während der Fahrt gesperrt.
  - Der Steuermann kann jederzeit während der Fahrt gewechselt werden; jeder Wechsel wird mit Uhrzeit gespeichert. In der Fahrt siehst du, wer wann wie viele Kilometer gesteuert hat.
  - Pax: Anzahl der Personen an Bord (1 bis 12). Danach fragt die App, ob du die Namen jetzt oder später eingeben möchtest. Skipper und Steuerleute zählen automatisch mit. Fehlende Namen trägst du später unter Fahrten → Fahrt → „Namen nachtragen“ ein.
  - Vor Fahrtbeginn sind Skipper und Steuermann frei wählbar. Kommt eine neue Person dazu, obwohl alle Plätze belegt sind, fragt die App, ob die bisherige Person an Bord bleibt (eine Person mehr) oder ersetzt wird.
  - Während der Fahrt stehen als Steuermann nur noch die Personen an Bord zur Auswahl, sobald alle namentlich erfasst sind. „Weiterer Steuermann …“ erscheint erst wieder, wenn die Personenzahl erhöht wird.
  - Wurde die letzte Fahrt vor weniger als 48 Stunden beendet, sind Skipper, Personenzahl und alle Personen an Bord aus dieser Fahrt vorbelegt. Sonst gilt die Voreinstellung (Skipper und Steuermann aus der Ersteinrichtung, 2 Personen).
- **S.O.S (roter Knopf links):** öffnet sofort das Notfallfenster: MRCC Bremen mit UKW-Kanal 16 und 70 (DSC) und der Notrufnummer +49 421 53687-0 (antippen ruft direkt an), darunter alle Bootsdaten, die laufend aktualisierte GPS-Position groß und zum Vorlesen ausgeschrieben sowie die Anzahl der Personen an Bord. Funktioniert auch ohne Internet.
- **Tanken (kleiner Knopf mit Zapfsäule):** öffnet die Eingabe für getankte Liter, Preis je Liter und Kraftstoffart (voreingestellt „Diesel“). Datum, Uhrzeit, Ort und Boot werden automatisch gespeichert; Datum und Uhrzeit lassen sich ändern, wenn du nachträglich einträgst. „Vollgetankt“ bleibt angehakt, wenn der Tank voll ist; bei einer Teilbetankung den Haken entfernen.
- **Menü ☰ → Verbrauch:** Kilometer und Fahrzeit seit dem letzten Tanken, getankte Liter, Kosten, Durchschnittspreis, die zwischen den Tankvorgängen gefahrene Strecke, Verbrauch in Litern je Kilometer und je Stunde sowie Kosten je Kilometer. Filter nach Boot (Standard: das eingestellte Boot), Kraftstoffart und Zeitraum. Ein Tipp auf einen Tankvorgang öffnet ihn zum Ändern; mit dem Papierkorb in der Zeile wird er gelöscht. CSV-Export für Excel.
  Berechnung: getankte Liter ÷ gefahrene Kilometer zwischen zwei Tankvorgängen mit „Vollgetankt“; Teilbetankungen dazwischen werden mitgezählt. Der erste Tankvorgang ist nur der Ausgangswert.
- **Einstellungen → Boot:** zusätzlich MMSI, Callsign, Bootskennzeichen, Länge, Breite, Höhe (je in Metern) und Verdrängung (in Tonnen). Diese Angaben gehören fest zum Bootsnamen, werden mit OneDrive abgeglichen und im Notfallfenster angezeigt.
- **Einstellungen → Skipper / Steuermann:** Namen für künftige Fahrten entfernen; vergangene Fahrten bleiben unverändert. Die Namenslisten und die Kraftstoffarten werden über OneDrive zwischen deinen Geräten abgeglichen (auch Löschungen). Die Einstellungen zur Aufzeichnung und das aktuell gewählte Boot bleiben bewusst je Gerät.
- **Einstellungen → Kraftstoffarten:** weitere Kraftstoffarten hinzufügen (zum Beispiel Super E10) oder selbst angelegte wieder entfernen.
- **Sicherheitsunterweisung:** Sind beim Start mehr als eine Person an Bord, fragt die App „Sicherheitsunterweisung der Crew durchgeführt?“ (Ja/Nein). Die Antwort wird mit der Fahrt gespeichert und erscheint in der Fahrt und im PDF.
- **Logbucheintrag als PDF:** In einer beendeten Fahrt erstellt „Logbucheintrag als PDF exportieren“ ein PDF mit Fahrtdaten, Wetter, Besatzung, Sicherheitsunterweisung, Tankvorgängen, Kommentaren, Streckenskizze und einer Unterschriftenzeile für den Skipper mit Datum und Uhrzeit der Erstellung. Das PDF wird auf dem Gerät gespeichert (Teilen-Menü → „In Dateien sichern“) und – wenn OneDrive eingeschaltet ist – in `OneDrive/Apps/Bordbuch/pdf/` abgelegt. Frühere Exporte stehen unter der Fahrt und lassen sich erneut öffnen.
- **Einstellungen → Boot → Bootsart:** Auswahl Motorboot oder Segelboot. Die Bootsart gehört fest zum Bootsnamen und erscheint im Notfallfenster und im PDF.
- **Einstellungen → Einheiten:** „Kilometer und km/h“ (Standard) oder „Seemeilen (sm) und Knoten (kn)“. Gilt für alle Anzeigen, Verbrauch, Wind und das PDF.
- **Datenschutz:** Menü ☰ → „Datenschutz“ (auch unter Einstellungen und in der Hilfe) erklärt, welche Dienste wann kontaktiert werden und welche Daten dabei übertragen werden.
- **Menü ☰ → Kommentare:** alle Kommentare als Tabelle, durchsuchbar, Tipp auf eine Zeile springt zur Stelle in der Karte. CSV-Export für Excel.
- Pro Fahrt: **GPX-Export** (zum Beispiel für Navionics, OpenCPN, Google Earth).

### Wichtig: GPS im Hintergrund
Ein Browser darf GPS nur aufzeichnen, solange die App sichtbar ist. Deshalb hält die App während der Fahrt das Display an. Wird das Handy gesperrt oder eine andere App geöffnet, pausiert die Aufzeichnung; beim Zurückkehren läuft sie weiter und die Lücke wird als gerade Linie verbunden. Für lange Fahrten: Handy an Strom, App offen lassen. Auch ein Neustart oder Absturz verliert nichts – jede Position wird sofort gespeichert und die laufende Fahrt beim nächsten Öffnen fortgesetzt.

## 4. Geräteübergreifend: OneDrive (freiwillig)

OneDrive ist ausgeschaltet, bis du es in der Ersteinrichtung oder unter Einstellungen → „OneDrive-Synchronisation verwenden“ einschaltest. Ohne OneDrive bleiben alle Daten auf dem Gerät; gesichert wird dann über „Sicherung exportieren“ (Abschnitt 5).

Die App spricht direkt mit deinem OneDrive. Die nötige Microsoft-Registrierung (Client-ID `faa92145-a1d5-4ac5-8e41-66c5d2019548`) ist bereits eingebaut. Auf jedem Gerät genügt: Einstellungen → „OneDrive-Synchronisation verwenden“ einschalten → „Mit OneDrive verbinden“ → mit dem eigenen Microsoft-Konto anmelden.

Die Client-ID ist kein Geheimnis: Sie steht ohnehin in jeder Anmelde-Adresse. Anmeldungen damit funktionieren nur unter der in Azure eingetragenen Web-Adresse dieser App; jeder Nutzer sieht nur sein eigenes OneDrive und gibt den Zugriff selbst frei. Wichtig für den Betreiber: Die App-Registrierung in Azure nicht löschen und die Umleitungs-URI nicht ändern, sonst funktioniert der Abgleich bei allen Nutzern nicht mehr.

**Nur wer die App unter einer eigenen Web-Adresse betreibt**, braucht eine eigene Registrierung:

1. Mit dem Microsoft-Konto auf **https://portal.azure.com** anmelden → „App-Registrierungen“ → „Neue Registrierung“.
2. Name: `Bordbuch`. Unterstützte Kontotypen: **„Konten in einem beliebigen Organisationsverzeichnis und persönliche Microsoft-Konten“**.
3. Umleitungs-URI: Plattform **„Single-Page-Anwendung (SPA)“**, Adresse genau wie in der App unter Einstellungen → „Erweitert: eigene Client-ID“ angezeigt.
4. Registrieren → die **Anwendungs-ID (Client-ID)** kopieren und in der App unter „Erweitert: eigene Client-ID“ eintragen.

Die Fahrten liegen dann als einzelne Dateien in `OneDrive/Apps/Bordbuch/trips/`, die Tankvorgänge in `OneDrive/Apps/Bordbuch/fuel/`, die PDF-Logbucheinträge in `OneDrive/Apps/Bordbuch/pdf/`. Die App hat nur Zugriff auf diesen eigenen Ordner. Abgleich: beim Öffnen, bei neuer Internetverbindung, nach jeder Fahrt und jedem Kommentar, sowie alle 5 Minuten. Bei Konflikten gewinnt die zuletzt geänderte Fassung einer Fahrt.

Hinweis: Microsoft lässt reine Web-Apps grundsätzlich nur 24 Stunden ohne erneute Anmeldung arbeiten; das lässt sich auch in der Azure-Registrierung nicht verlängern. Die App erneuert die Anmeldung deshalb ab etwa 18 Stunden automatisch beim Öffnen (kurzer Seitenwechsel zu Microsoft und zurück, ohne Eingabe) – nie während einer laufenden Fahrt. Damit das klappt, bei der Microsoft-Anmeldung „Angemeldet bleiben?“ mit **Ja** beantworten. Nur wenn Microsoft trotzdem eine Eingabe verlangt, steht oben „bitte neu verbinden“; bis dahin bleibt alles lokal gespeichert und wird danach nachsynchronisiert.

## 5. iCloud

Apple erlaubt Web-Apps keinen direkten Zugriff auf iCloud Drive (dafür wäre eine native App mit kostenpflichtigem Apple-Entwicklerkonto nötig). Weg über Datensicherung:

- ☰ → Einstellungen → **„Sicherung exportieren“** → Teilen-Menü → „In Dateien sichern“ → iCloud Drive.
- Auf einem anderen Gerät: **„Sicherung importieren“** → Datei wählen. Fahrten werden zusammengeführt, nicht doppelt angelegt.

Wer automatischen Abgleich zwischen iPhone, iPad und Mac möchte, nimmt am einfachsten OneDrive (läuft auch auf Apple-Geräten).

## 6. Einstellungen zur Aufzeichnung

- Mindestabstand zwischen Wegpunkten: 25 m (Standard)
- Spätestens alle 30 s ein Wegpunkt
- Positionen ungenauer als 50 m werden verworfen
- Drift am Liegeplatz wird nicht als Strecke gezählt.

## Sicherheit

- Die App lädt keinen fremden Programmcode: App und Kartenbibliothek liegen vollständig im eigenen Repository.
- Eine Sicherheitsrichtlinie (Content-Security-Policy in `index.html`) erlaubt Programmcode nur aus dem eigenen Repository und Verbindungen nur zu OpenStreetMap (Karte, Ortsnamen), OpenSeaMap, Open-Meteo und Microsoft (Anmeldung, OneDrive).
- Microsoft-Zugangstoken (1 Stunde gültig) liegen nur im Arbeitsspeicher. Der Refresh-Token (höchstens 24 Stunden gültig) wird verschlüsselt in der App-Datenbank gespeichert, mit einem nicht exportierbaren Schlüssel; er wird nie mit OneDrive synchronisiert. Token werden ausschließlich an graph.microsoft.com gesendet.
- Grenze jeder Web-App: Gegen Schadcode, der direkt in der App läuft, schützt keine Speicherart vollständig – auch keine Anmeldebibliothek wie MSAL. Deshalb verhindert die Sicherheitsrichtlinie, dass fremder Code überhaupt ausgeführt wird, und der Zugriff ist auf den App-Ordner im OneDrive beschränkt.
- Kartenausschnitte werden höchstens 1.500 Stück bzw. 90 Tage gespeichert (ca. 20–40 MB). Seezeichen werden nicht offline gespeichert.
- Wichtigster Schutz bleibt das GitHub-Konto des Betreibers: Zwei-Faktor-Anmeldung einschalten und niemandem Schreibrechte geben.

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
| 4.5 | Skipper-, Steuermann- und Kraftstofflisten werden geräteübergreifend abgeglichen |
| 4.6 | Verbrauch: „Gefahren“ zählt nur die Strecke zwischen erfassten Tankvorgängen |
| 4.7 | Fahrtenfilter „Person an Bord“ |
| 5.0 | Für alle nutzbar: keine fest hinterlegten Namen und Boote, Ersteinrichtung beim ersten Start, OneDrive abschaltbar, Hilfe in den Einstellungen |
| 5.1 | Microsoft-Client-ID eingebaut (keine Eingabe mehr nötig); Ersteinrichtung: „Skipper ist auch Steuermann“ vor dem Steuermann-Feld |
| 5.2 | Sicherheit: Kartenbibliothek im eigenen Repository, Programmcode in `app.js`, Sicherheitsrichtlinie (CSP) erlaubt nur die nötigen Dienste |
| 6.0 | Bootsart Motorboot/Segelboot, „Bootsmodell“ statt „Bootsbezeichnung“, Mindestabstand 25 m, Abfrage Sicherheitsunterweisung, Logbucheintrag als PDF (mit OneDrive) |
| 7.0 | Einheiten km/sm wählbar, Bootsart als Auswahlliste, Datenschutzerklärung, Anmeldedaten verschlüsselt statt im localStorage, Token nur an Microsoft Graph, Kartenspeicher begrenzt, vollständige Offline-Installation |
| 7.1 | Fahrten direkt in der Übersicht löschen; Seezeichen standardmäßig an, Einstellung unter „Karte“ |
