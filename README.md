# Unsere Spielhalle

https://ottiauswien.github.io/Bubble/

Drei Spiele mit eigener Grafik und Steuerung:

- **Bubble Klassisch:** Feld abräumen, Wandsprünge, Levels.
- **Kugelkette:** bewegte Kette, Dreiergruppen, Kettenreaktionen. Der Ausgang muss frei bleiben.
- **Luna Sprung:** kurzes Jump-and-Run-Testlevel mit variabler Sprunghöhe, 25 freiwilligen Kristallen, drei Schluchten, Plattformen, drei Gegnern, Rückkehrfahne und Sternentor.

`play.html?mode=classic` und `play.html?mode=chain` öffnen Bubble direkt. `runner.html` startet das Jump-and-Run. Übersicht: `index.html`.

Die Bubble-Modi speichern ihre abgeschlossenen Levels getrennt. Luna speichert Abschluss und beste Kristallausbeute. Alle Spiele funktionieren ohne Anmeldung und ohne zusätzliche Abhängigkeiten. Helle Kugeln und eindeutige Symbole helfen beim Unterscheiden ohne Farberkennung.

## Luna steuern

Pfeiltasten links/rechts oder A/D; Springen mit Leertaste, Pfeil hoch oder W. Am Handy Richtung gedrückt halten und gleichzeitig Springen antippen. Länger halten springt höher. P/Escape pausiert. Auf Gegner springen besiegt sie; seitlicher Kontakt oder ein Sturz setzt zur Rückkehrfahne zurück. Kein Zeitlimit, unbegrenzte Wiederanläufe.

## Tests

`node test/game.test.cjs` — 34 Tests.

`node test/runner.test.cjs` — 16 Tests, einschließlich eines vollständigen Durchlaufs mit normalen Steuerbefehlen ohne Sturz.

DOM/Canvas und Bildraten wurden simuliert. Browser-, GPU- und echte Touch-Prüfungen waren in der Entwicklungsumgebung mangels Browsersteuerung nicht verfügbar.

GitHub Pages: Branch `main`, Verzeichnis `/ (root)`.
