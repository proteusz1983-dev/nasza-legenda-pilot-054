# Pakiet audio ElevenLabs

Nie kopiuj ręcznie przypadkowych MP3. Uruchom `GENERUJ_GLOSY_ELEVENLABS.bat`.

Generator:

- pobiera dostępne głosy;
- dobiera pięć ról;
- korzysta z endpointu Text to Dialogue i modelu `eleven_v3`;
- zapisuje po jednym pliku dialogowym na scenę;
- wywołuje Forced Alignment;
- dopisuje czasy napisów do `story-graph.json`;
- dodaje pliki do pamięci offline aplikacji.
