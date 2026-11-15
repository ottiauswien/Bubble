# Unsere Spielhalle

https://ottiauswien.github.io/Bubble/

Die Startseite bietet zwei Spielvarianten: **Bubble Klassisch** (Feld abräumen, Wandsprünge) und **Kugelkette** (bewegte Kette auf einer Bahn, Dreiergruppen, Kettenreaktionen, Ausgang freihalten).

`play.html?mode=classic` und `play.html?mode=chain` öffnen den gewünschten Modus direkt. Im Spiel lässt sich ebenfalls umschalten. Ein laufendes Level startet beim Wechsel neu. Beide Modi speichern ihre abgeschlossenen Levels und Punktestände getrennt auf dem Gerät. Bestehender klassischer Fortschritt bleibt erhalten.

Helle Kugeln ohne Rot-Grün-Paarung und sechs eindeutige Vektorsymbole. Tempo-Regler 25–150 %, Pause, Kugeltausch, Zielhilfe. In der Kugelkette verlangsamt der Regler auch die laufende Kette. Alle Seiten laufen statisch ohne zusätzliche Abhängigkeiten.

## Tests

`node test/game.test.cjs`

34 automatisierte Tests: klassische Regeln, Kettenlogik, Einfügen, Reaktionen, Zulauf, Sieg/Niederlage, Moduswahl per Link, Moduswechsel, getrennter Fortschritt, kontrastreiche Symbole, simulierte 30/60/120/144 Hz und Zufallsspiele. DOM/Canvas werden simuliert; echte Browser-, Touch- und GPU-Prüfungen waren in der Entwicklungsumgebung mangels Browsersteuerung nicht verfügbar.

GitHub Pages: Branch `main`, Verzeichnis `/ (root)`.
