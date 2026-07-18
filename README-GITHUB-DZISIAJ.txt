NASZA LEGENDA 0.5.4 — GITHUB DZISIAJ

1. Skopiuj trzy pliki z tej paczki do GŁÓWNEGO folderu działającego pilota:
   - PRZYGOTUJ_GITHUB.bat
   - sw.js
   - manifest.webmanifest

2. Zgódź się na zastąpienie sw.js i manifest.webmanifest.

3. Najpierw uruchom lokalnie NAPRAW_I_URUCHOM_PILOTA_054.bat.
   Sprawdź:
   - intro Kling,
   - pierwsze zadanie,
   - pierwszą decyzję,
   - drugą „Próbę światła”,
   - drugą decyzję,
   - zakończenie.

4. Zamknij lokalny serwer i uruchom PRZYGOTUJ_GITHUB.bat.

5. Otworzy się folder DEPLOY_GITHUB_054.
   Wgraj do GitHuba ZAWARTOŚĆ tego folderu.
   index.html musi trafić do głównego katalogu repozytorium.

6. Dla pilota utwórz NOWE publiczne repozytorium:
   nasza-legenda-pilot-054

7. W pustym repo kliknij:
   uploading an existing file

8. Przeciągnij wszystkie elementy z DEPLOY_GITHUB_054 i kliknij Commit changes.

9. Settings → Pages:
   Source: Deploy from a branch
   Branch: main
   Folder: /(root)
   Save

10. Po publikacji otwórz adres w Chrome na telefonie.
    Pierwszy test rób online. Instalację PWA sprawdzimy później.

WAŻNE:
- Nie wgrywaj żadnego klucza API.
- Generator nie kopiuje plików BAT ani folderu tools.
- 14/15 nagrań ElevenLabs jest dopuszczalne; brakująca scena będzie bez głosu.
- Nowe repo eliminuje stare cache i stare Service Workery.
