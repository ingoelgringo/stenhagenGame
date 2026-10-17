# Spring i Stenhagen – speldesign

Ett oskyldigt sidscrollande spel för barn runt 8 år. Man är ett barn som springer, cyklar,
åker rullskridskor eller skateboard genom ett radhusområde och undviker katter, ormar,
öppna brunnar, småbarn och vuxna.

## Spela

Öppna `index.html` i en webbläsare. Det behövs inget byggsteg och ingen server.

| Kontroll | Tangentbord | Pekskärm |
|---|---|---|
| Hoppa (håll inne för högre hopp) | Mellanslag | HOPPA-knappen eller tryck på skärmen |
| Gå upp på trottoaren | Pil upp / W | ▲ |
| Gå ner på gatan | Pil ner / S | ▼ |
| Paus | P / Esc | II |
| Ljud av/på | M | – |

## Vad som finns i prototypen

**Två filer:** trottoaren (bak) och gatan (fram). Man hoppar över låga hinder och byter fil
för att komma förbi höga hinder. Det ger två sätt att lösa varje situation, vilket gör spelet
lätt att förstå men inte tråkigt.

**Fordon som sköld.** Man plockar upp cykel, rullskridskor eller skateboard från bubblor på
vägen. Varje fordon har sin egen känsla:

| Fordon | Fart | Hopp | Specialare |
|---|---|---|---|
| Springa | normal | bra | – |
| Cykel | snabbast | lågt | bäst när man ska hinna ikapp någon |
| Rullskridskor | snabb | bra | – |
| Skateboard | snabb | högst | kan hoppa över vuxna med barnvagn |

Krockar man när man åker något tappar man bara fordonet (så fungerar ringarna i Sonic).
Man förlorar aldrig ett hjärta direkt, och det känns snällt för yngre barn.

**Snälla krockar.** Ingen dör och ingen gör sig illa. Krockar man snubblar man och tappar fart,
katten hoppar undan och säger "Mjau!", och vuxna säger "Hallå där!". Brunnar ramlar man inte
ner i, man snubblar bara på kanten.

**Uppdrag:**

1. **Till lekparken** – en lätt introduktion med hjärtan och enklare hinder.
2. **Ikapp Ella!** – en jakt: kompisen cyklar mot kiosken och man ska hinna ikapp henne innan
   hon är framme. Krockar kostar tid.
3. **Vildsvinet!** – en flykt: ett nyfiket vildsvin "vill leka kull". Man ska ta sig hem.
4. **Mamma ropar** – en flykt med humor: mamma ropar "Det är fiskpinnar!". Man ska hinna lämna
   tillbaka Olles boll först.
5. **Fri lek** – oändligt läge där farten ökar och rekordet sparas.

I jakt och flykt är **avståndet själva livet**, i stället för hjärtan. Det syns i
förloppsindikatorn och som en pil med antal meter när den andra figuren är utanför bild.

## Mekanik hämtad från andra spel (research)

Det här är beprövade knep från runner-spel och plattformsspel som passar 8-åringar:

- **Variabel hopphöjd** (Mario): håller man inne knappen blir hoppet högre. Det är lätt att
  förstå och ger skickliga barn mer kontroll. *Finns.*
- **Hoppbuffert** (Celeste, de flesta moderna plattformsspel): trycker man hopp lite för tidigt
  sparas trycket 0,15 sekunder. Barn trycker ofta för tidigt. *Finns.*
- **Generösa träffytor**: hindren har mindre träffytor än det man ser. Man ska känna att man
  "nästan" krockade, inte att spelet fuskade. *Finns (80 %).*
- **Stjärnbågar som lär ut** (Super Mario Run, Subway Surfers): mynt i en båge över hindret
  visar hur man ska hoppa, utan att man behöver läsa något. *Finns.*
- **Gummiband** (Mario Kart): jagaren tappar aldrig bort en helt, och kompisen saktar in lite om
  man ligger långt efter. Då blir det spännande till slutet i stället för hopplöst. *Finns.*
- **Kort tid av osårbarhet efter en krock** med blinkande figur (klassisk arkadmekanik).
  Då slipper man att krocka flera gånger i rad. *Finns.*
- **Korta banor med tydligt mål** (Super Mario Run, Alto's Adventure-utmaningar): 20–40 sekunder
  per uppdrag passar barns uppmärksamhet bättre än ändlösa lopp. *Finns.*

## Idéer till nästa steg

**Fler hinder och föremål**
- Vattenpöl: man halkar till och blir lite långsammare, men inte stoppad.
- Rullande boll: rör sig mot en och studsar.
- Sopkärl på tömningsdag och en gräsklippare.
- Sandlåda: man fastnar och måste trycka snabbt för att komma loss.
- Fåglar som lyfter när man springer förbi (bara för stämningen).
- Grannens hund som vill följa med och springer bredvid en en stund.

**Fler mekaniker**
- **Hopp på saker:** studsa på en studsmatta på en gård, eller grinda med skateboarden längs
  staket och trottoarkanter (som i Tony Hawk) för extra poäng.
- **Glass-power-up:** under 5 sekunder springer man supersnabbt och hindren flyttar på sig.
- **Kortkommandon:** genvägar över gårdar (ett tredje "lager" bakom husen) som bara går att nå
  med ett högt skateboardhopp.
- **Samla-uppdrag:** "Hitta 5 försvunna kattungar och ta med dem hem" eller "Dela ut
  julkort till varje dörr" (stanna vid dörrarna i bakgrunden).
- **Årstider:** en vinterbana där man åker *riktiga skridskor* på en frusen damm och
  undviker snöbollar och pulkor. Det passar också bra för att variera bakgrunden.
- **Välj figur:** flera barn (olika hår, kläder och rullstol/sparkcykel som fordon).
- **Klistermärken:** stjärnor kan bytas mot klistermärken i ett album. Det belönar omspelning
  utan att det blir tävling.

**Teknik**
- Riktiga ljudeffekter och en enkel bakgrundsmelodi.
- Fler bakgrunder i samma stil (lekpark, skolgård, kiosk, skogsdunge) som byts när man närmar
  sig målet.
- Spriterna i `js/sprites.js` är ritade tecken för tecken och kan bytas mot riktiga
  pixelbilder (PNG) när vi har dem.

## Kodstruktur

- `index.html` – sidan, typsnitt och pekskärmsknappar.
- `js/sprites.js` – all pixelgrafik för figurer och hinder, ritad som textrader.
- `js/game.js` – spelloop, fysik, uppdrag, hinder, HUD och menyer.
  - `MISSIONS` – uppdragen. Här är det lättast att lägga till nya banor.
  - `OBSTACLES` – hindertyper (fart, vilka filer, repliker).
  - `VEHICLES` – fordonens fart och hopphöjd.
- `images/` – bakgrundsbilderna. De speglas och tonas ihop till en lång remsa.

Testläge för skärmdumpar: `index.html?demo=ella&t=120` startar ett uppdrag direkt och spolar
fram 120 bildrutor.
