# Plan: hemsidan och projekten

Beslut (2026-10-17): **varje projekt får ett eget repo och en egen deploy.** Hemsidan är bara
en startsida med länkar till projekten och innehåller inga projekt själv.

## Bakgrund

- `guitarPractice` (Next.js, inloggning, Postgres, pm2 på VPS:en, deploy via GitHub Actions vid
  push till `main`) har i praktiken blivit hela hemsidan på `ingemar.berghult.com`. Startsidan
  visar kort från `lib/tools.ts`.
- Namnet känns missvisande eftersom repot har fått två jobb: gitarrverktyg och hemsida. När
  startsidan flyttar ut stämmer namnet igen.
- `stenhagenGame` är ett statiskt spel (HTML, JS, PNG) utan byggsteg. Det ska inte kopieras in
  i guitarPractice.

## Målbild

```
ingemar.berghult.com/              → hemsidan: kort med länkar till projekten
ingemar.berghult.com/stenhagen/    → spelet, statiska filer som Nginx serverar direkt
guitar.ingemar.berghult.com/       → gitarrverktygen (Next.js, oförändrad kod)
```

- **Statiska projekt** ligger i undermappar. Deras GitHub Action skickar filerna med rsync till
  en mapp på VPS:en, och Nginx serverar dem med `location /namn/ { alias ...; index index.html; }`.
  Ingen Node-process behövs.
- **Appar med server** ligger på subdomäner. En Next-app under en undermapp skulle kräva
  `basePath`, och på en subdomän behövs ingen kodändring. Inloggningscookien hör då bara till
  appen.
- **Nginx-konfiguration och dokumentation** hör hemma i `../vps-infra` (se `RUNBOOK-new-app.md`,
  `SERVER.md` och `apps/*.md`, bland annat `apps/guitar-practice.md`).

## Steg

### 1. Spelet får en egen deploy (nästa steg)
Filerna är klara. Det som återstår körs för hand enligt runbooken i
`vps-infra/apps/stenhagen.md` (server, CI-nyckel, Nginx, GitHub-repo, secrets, push).

- [x] Läs `../vps-infra/RUNBOOK-new-app.md` och `SERVER.md`. Spelet följer FLASH-mönstret
      (release-kataloger och symlänken `current`, egen CI-nyckel), men utan byggsteg.
- [x] Lägg till `.github/workflows/deploy.yml` i `stenhagenGame`: rsync av `index.html`,
      `manifest.webmanifest`, `js/` och `assets/` (inte `images/`, `docs/` eller `GAME_DESIGN.md`)
      till `/home/deploy/stenhagen/releases/<sha>/`, med hälsokontroll och återställning.
- [x] Lägg till `location /stenhagen/`-block i `guitarPractice/deploy/nginx/guitar-practice.conf`
      och dokumentera appen i `vps-infra/apps/stenhagen.md`.
- [ ] Lägg in blocken i serverns vhost (runbook steg 3).
- [ ] Skapa ett GitHub-repo för `stenhagenGame` (det saknar remote i dag), sätt secrets och pusha.
- [x] Lägg till ett kort i guitarPractice `lib/tools.ts` som pekar på `/stenhagen/` (fältet
      `external` ger en vanlig `<a>`). Det är en tillfällig lösning tills hemsidan har brutits ut.
- [ ] Pusha guitarPractice med kortet först när spelet svarar live (runbook steg 7).

### 2. Hemsidan bryts ut (när nästa projekt läggs till)
- [ ] Ta reda på om det befintliga repot `../portfolio` kan bli hemsidan, eller om ett nytt repo
      `hemsida` behövs.
- [ ] Hemsidan ska ha en lista med projekten (titel, beskrivning, länk) och en egen deploy. Den kan
      gärna vara helt statisk.
- [ ] Flytta guitarPractice till `guitar.ingemar.berghult.com`: DNS-post, Nginx `server`-block och
      certbot. Ta bort startsidan och kortlistan ur guitarPractice, eller gör om dem till en
      startsida bara för gitarrverktygen.
- [ ] Lägg in omdirigeringar (301) i Nginx från gamla adresser (`/tab-editor`, `/fretboard`,
      `/library`, `/login`) till subdomänen, så att bokmärken fortsätter att fungera.
- [ ] Uppdatera `vps-infra/apps/guitar-practice.md`.

### 3. Varje nytt projekt
Ett eget repo med deploy, ett `location`-block eller en subdomän i Nginx, en fil i
`vps-infra/apps/` och en rad i hemsidans projektlista.

## Bra att veta
- Spelet har relativa sökvägar (`js/...`, `assets/...`), så det fungerar i vilken undermapp som
  helst.
- Spelet finns också publicerat som en privat claude.ai-artefakt för test på mobilen:
  https://claude.ai/artifact/4cpt1xj5TGhgudb2nAi81Y. Artefaktsidan byggs från `index.html` utan
  de yttre html/head/body-taggarna och uppdateras inte automatiskt.
- guitarPractice-sajten är på engelska. Spelet och projektbeskrivningarna är på svenska. Bestäm
  språk för hemsidan när den bryts ut.
