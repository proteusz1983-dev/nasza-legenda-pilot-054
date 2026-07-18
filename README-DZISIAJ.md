# Nasza Legenda 0.5.4 — pilot do pierwszych testów dzisiaj

Ta paczka jest **poprawką do Twojego obecnego folderu 0.5.3**, w którym masz już wygenerowane głosy ElevenLabs.

Nie używaj pustej pełnej wersji, bo stracisz lokalne nagrania. Poprawka zachowuje istniejące MP3 i generuje tylko nowe kwestie.

## Co zawiera pilot

Przebieg:

1. filmowe wprowadzenie;
2. próba odbiornika — 30 sekund;
3. pierwsza decyzja: odsłuchaj albo zabezpiecz;
4. konsekwencja pierwszej decyzji;
5. próba światła — 40 sekund;
6. ostatnia decyzja: wyślij ostrzeżenie albo zamknij pętlę;
7. jedno z czterech zakończeń;
8. krótka ankieta i wynik JSON.

Napisy mają przycisk **CC** i można je włączać albo wyłączać w trakcie filmu.

## Instalacja — 5 kroków

1. Zamknij działającą Naszą Legendę i czarne okno serwera.
2. Rozpakuj tę paczkę **bezpośrednio do obecnego folderu 0.5.3**.
3. Zgódź się na zastąpienie plików `app.js`, `styles.css`, `index.html` oraz plików w `tools`.
4. Uruchom `AKTUALIZUJ_PILOTA.bat`.
5. Uruchom `SPRAWDZ_PILOTA.bat`.

Po pierwszym sprawdzeniu zobaczysz informację, że brakuje nagrań nowych scen — to prawidłowe.

## Uzupełnienie tylko nowych głosów

1. W ElevenLabs skopiuj działający klucz API.
2. Uruchom `UZUPELNIJ_GLOSY_PILOTA.bat`.
3. Generator użyje tej samej obsady i **pominie wszystkie już istniejące sceny**.
4. Ponownie uruchom `SPRAWDZ_PILOTA.bat`.
5. Wynik powinien brzmieć: `Pakiet glosowy: KOMPLETNY`.

Następnie uruchom `START_LOCAL.bat`.

## Pierwsze testy

Najpierw wykonaj jeden przebieg sam, żeby sprawdzić technikę. Potem daj pilota 2–3 grupom bez tłumaczenia fabuły.

Na końcu każda grupa pobiera plik `wynik-pilot-nasza-legenda-054-....json`.

Najważniejsze pytania:

- Czy czuli, że oglądają interaktywny serial?
- Czy rozumieli, po co wykonują oba zadania?
- Czy decyzje wyglądały na mające konsekwencje?
- Czy chcą następnego odcinka?
- Jaki był największy problem?

## Zakres tej wersji

To nie jest finalny odcinek i nie dodajemy teraz marketplace, własnego generatora mowy ani własnego generatora filmów. Celem jest jeden pełny, mierzalny pilot, który da się przejść od początku do końca.
