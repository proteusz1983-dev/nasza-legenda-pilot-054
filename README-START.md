# Nasza Legenda 0.5.3 — ElevenLabs v3 Dialogue

W tej wersji dialogi nie są generowane przez robotyczny głos przeglądarki. Generator tworzy osobne, wieloosobowe sceny audio w **ElevenLabs Eleven v3 Text to Dialogue**, a aplikacja synchronizuje z nimi podpisy postaci.

## Co jest gotowe

- 5 ról: Narrator, Kronikarz, Archiwistka, Cień i Głos z przyszłości;
- emocjonalne wskazówki aktorskie dla każdej kwestii;
- 8 wieloosobowych scen dialogowych;
- inne dialogi dla drogi „ODSŁUCHAJ” i „ZABEZPIECZ”;
- automatyczny dobór różnych głosów dostępnych na koncie ElevenLabs;
- próbka obsady przed zużyciem większej części limitu;
- automatyczne generowanie MP3;
- automatyczne wyrównanie napisów do nagrania;
- wcześniejsze pobieranie audio razem z klipami;
- natychmiastowe przejścia bez ekranu ładowania;
- bezpieczne podawanie klucza API — klucz nie jest zapisywany w plikach.

## Jednorazowe wygenerowanie głosów

1. Utwórz konto ElevenLabs i klucz API.
2. Rozpakuj cały folder aplikacji.
3. Kliknij dwa razy:

```text
GENERUJ_GLOSY_ELEVENLABS.bat
```

4. W czarnym oknie wpisz klucz API. Znaki nie będą widoczne.
5. Generator pobierze głosy dostępne na koncie i dobierze obsadę.
6. Otworzy się krótka próbka czterech postaci.
7. Wróć do czarnego okna:
   - naciśnij Enter albo wpisz `T`, gdy obsada pasuje;
   - wpisz `N`, gdy trzeba dobrać inne głosy.
8. Po zatwierdzeniu generator stworzy wszystkie dialogi i doda je do aplikacji.

Klucza API nie wklejaj do czatu i nie zapisuj w repozytorium GitHub.

## Uruchomienie aplikacji

Po zakończeniu generowania kliknij:

```text
START_LOCAL.bat
```

Otworzy się:

```text
http://localhost:8005
```

Na ekranie startowym musi pojawić się komunikat:

```text
PAKIET GŁOSOWY ELEVENLABS V3 GOTOWY
```

Naciśnij „ODSŁUCHAJ FRAGMENT OBSADY”, a następnie uruchom odcinek.

## Zmiana wybranego głosu

Generator zapisze użyte głosy w:

```text
episodes/signal-spoza-czasu/audio/elevenlabs/voice-cast-used.json
```

Ręczne identyfikatory głosów można wpisać w:

```text
tools/voice-cast.json
```

Potem ponownie uruchom `GENERUJ_GLOSY_ELEVENLABS.bat`. Puste pola oznaczają automatyczny dobór.

## GitHub Pages

Na GitHub wgrywaj dopiero folder **po wygenerowaniu MP3**. Muszą znaleźć się również pliki z katalogu:

```text
episodes/signal-spoza-czasu/audio/elevenlabs/
```

Po wgraniu odczekaj kilka minut i otwórz stronę w trybie incognito, aby ominąć starą pamięć podręczną.

## Ważne ograniczenie prototypu

Nagrania są teraz wspólne dla wszystkich grup. Imiona i nazwa grupy nadal pojawiają się na ekranie, ale nie są wypowiadane w gotowych MP3. Dynamiczne wypowiadanie dowolnych imion będzie wymagało później serwera generującego pakiet audio dla konkretnej grupy. Nie umieszczamy klucza ElevenLabs bezpośrednio w aplikacji internetowej, ponieważ użytkownicy mogliby go wykraść.

## Pliki techniczne

```text
tools/generate_elevenlabs_dialogue.py   generator audio i napisów
tools/voice-cast.json                   ręczne ustawienie voice_id
GENERUJ_GLOSY_ELEVENLABS.bat            bezpieczne uruchomienie generatora
ODTWORZ_PROBKE_GLOSOW.bat               ponowne odtworzenie próbki
story-graph.json                         graf fabuły i czasy napisów
audio/elevenlabs/*.mp3                  wygenerowane sceny dialogowe
```

Wersja: **0.5.3**


## Wklejanie klucza przez schowek Windows

1. W ElevenLabs kliknij **Copy** przy pełnym kluczu API.
2. Uruchom `GENERUJ_GLOSY_ELEVENLABS.bat`.
3. Naciśnij dowolny klawisz. Nie wpisujesz i nie wklejasz klucza w czarnym oknie.
4. Generator sam odczyta klucz ze schowka, a następnie wyczyści schowek.

Jeżeli pojawi się komunikat o gwiazdkach, skopiowano zamaskowaną wartość zamiast pełnego tajnego klucza. Utwórz wtedy nowy klucz i użyj przycisku **Copy** bezpośrednio po jego utworzeniu.
