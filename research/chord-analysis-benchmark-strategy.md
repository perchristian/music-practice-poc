# Systematisk benchmarkstrategi for akkordanalyse

Dato: 2026-07-21

Statusoppdatering 2026-07-23: Denne rapporten definerte Phase 2J-piloten, som nå
er gjennomført og har en konsumert holdout. Den nye prioriterte
Chord Reliability Validation Gate, med en ny datasplitt, målrettede
skjermopptak, stemme-/bass-/ornamenthypoteser og repeterte seksjoner, er definert
i [`chord-reliability-validation-plan.md`](./chord-reliability-validation-plan.md).
Den opprinnelige holdouten skal ikke gjenbrukes til tuning.

## Konklusjon

Den manuelle arbeidsflyten med å laste opp tilfeldige sanger og lage en egen
akkordfasit bør ikke være hovedmetoden for Phase 2J. Den bør erstattes med en
reproduserbar benchmark som kjører dagens analyzer direkte mot lyd med
tidsjusterte referanseakkorder.

Den beste hovedkilden er nå **RWC Popular Music Database (RWC-P)**. Dette er en
viktig endring fra eldre vurderinger av akkorddatasett: RWC-lyden ble offentlig
tilgjengelig på nett i februar 2026 under CC BY-NC 4.0. RWC-P inneholder 100
ferdigproduserte poplåter i WAV, og det kuraterte annotation-repositoriet har
akkorder og beats med filnavn som matcher lyden. Akkordfilene er enkle
semikolonseparerte intervaller med start, slutt og akkordnavn, med 10 ms
oppløsning. Det gir den nærmeste tilgjengelige kombinasjonen av realistisk
instrumentering, komplett lyd og direkte fasit med liten adapterkostnad.

Anbefalt strategi er **top-down med diagnostisk tilbakesporing**:

1. Kjør først en representativ RWC-P-pilot på 12 hele sanger.
2. Hvis den feiler, bruk referansetiming og et lite sett kontrollerte
   datasett/ablations for å finne ut om feilen ligger i timing, akkordrot,
   akkordkvalitet eller instrumentblanding.
3. Endre én analyseidé om gangen og godta den bare når en fast utviklingsdel
   forbedres uten regresjon på en urørt holdout-del.
4. Bruk menneskelig lytting på de få verste eller mest tvetydige eksemplene,
   ikke som metode for å etablere hele fasiten.

Dette hopper direkte til relevant vanskelighetsgrad, men beholder en billig vei
tilbake til enklere, kontrollerte signaler når noe feiler.

## Hva den eksisterende rapporten dekker

[`Chord editor deep-research-report.md`](./Chord%20editor%20deep-research-report.md)
beskriver hvordan akkorder bør modelleres, presenteres og redigeres. Den støtter
prosjektets nåværende grid-first modell godt, men behandler audioanalyse som et
sekundært lag og definerer ikke en metode for å måle om analyzerens akkorder er
riktige. Denne rapporten fyller akkurat det gapet; den endrer ikke editorens
datamodell.

## Datasetvurdering

| Datasett | Lyd + tidsjusterte akkorder | Relevans | Tilpasning | Lisens / begrensning | Rolle |
| --- | --- | --- | --- | --- | --- |
| **RWC-P v2** | Ja; 100 komplette WAV-låter, kuraterte beats og akkorder | Høy: ferdigprodusert pop med sang og flere instrumenter | Lav: filnavn matcher; akkorder er `start;end;label` | CC BY-NC 4.0; evalueringsdata må holdes utenfor produkt/demo-distribusjon | **Primær benchmark** |
| **Tiny AAM / AAM** | Ja; miks, enkeltspor, MIDI, beats og akkorder | Middels: kontrollert poplignende 4/4, perfekt alignment, men syntetisk | Lav til middels: ARFF-adapter og MP3/WAV-konvertering | CC BY 4.0; Tiny AAM er 20 spor / 168 MB | **Diagnostisk fallback** |
| **GuitarSet** | Ja; 360 ekte gitaropptak med beats, key og to akkordlag | Middels: ekte anslag, komp/solo, fem stiler; ingen full bandmiks | Lav med JAMS/mirdata | CC BY 4.0; bare tre progresjonsfamilier; performed chords er maskinelt utledet | **Timbre-/spilleteknikkdiagnostikk** |
| **Schubert Winterreise** | Ja; to åpne fremføringer har audio-aligned harmony | Lav til middels: ekte piano + sang og rik harmoni, men klassisk Lied er langt fra mål-domenet | Middels: label- og alignmentadapter | Lyd har egne NC/ND-vilkår; betydelig vocabulary-gap | Sen stress-test, ikke startpunkt |
| **Isophonics / McGill Billboard** | Referanseakkorder ja, lyd nei | Høy musikalsk relevans | Høy: eksakt kommersiell lyd må skaffes lovlig og matches | Audio følger ikke annotationene | Ikke nødvendig så lenge RWC-P dekker piloten |
| **Slakh2100** | Aligned MIDI og multitrack, men ingen autoritativ akkordfasit | Nyttig for miks/separasjon, mindre direkte for akkorder | Middels/høy: akkordfasit må utledes fra MIDI | CC BY 4.0 | AAM er et bedre førstevalg |
| **ChoCo** | Symbolske akkorder, ikke sammenkoblet evalueringslyd | Nyttig for labelnormalisering og musikkologiske studier | Høy for audioevaluering | Varierer per delkorpus | Ikke egnet som hovedbenchmark |

### Hvorfor RWC-P bør velges

RWC 2.0 løser det viktigste praktiske problemet som eldre chord-recognition
benchmarker hadde: annotationsfilene var tilgjengelige, men den eksakte lyden
var vanskelig eller umulig å distribuere. Den offisielle 2026-utgaven tilbyr
original master-lyd, og det kuraterte repositoriet tilbyr konsistente filnavn,
metadata, beats og akkorder. RWC-P-arkivet er 4,1 GB, som er en akseptabel
engangskostnad for en stabil lokal benchmark, men det skal ikke sjekkes inn i
Git.

Begrensningen er lisensen: CC BY-NC 4.0 betyr at korpuset er egnet til intern
POC-evaluering og forskning, men ikke bør bli en distribuert produktressurs.
Benchmarkkoden, manifestet og aggregerte måleresultater kan være
versjonskontrollert; lyden skal ligge i en ekstern katalog angitt med for
eksempel `CHORD_BENCHMARK_DATA_DIR`.

Kilder:

- [RWC Music Database v2 på Zenodo](https://zenodo.org/records/18656623)
- [RWC 2.0 annotations og filkontrakt](https://github.com/rwc-music/rwc-annotations)
- [RWC chord-format](https://github.com/rwc-music/rwc-annotations/tree/main/01_annotations_preprocessed/chords)
- [RWC Revisited (TISMIR 2026)](https://transactions.ismir.net/articles/10.5334/tismir.326)

### Hvorfor AAM og GuitarSet fortsatt er verdifulle

AAM gir eksakt symbolsk/audio-alignment og både full miks og enkeltspor. Dermed
kan samme musikalske fasit måles som eksempelvis harmonisk instrument alene,
harmoni + bass, harmoni + bass + trommer og full miks. Det er en mye raskere
måte å finne instrumenteringsfeil på enn å gjette ut fra en kommersiell sang.
Tiny AAM gir 20 MP3-baserte testspor i ett arkiv på 168 MB; den fulle AAM-utgaven
har 3 000 spor, men er unødvendig før den lille utgaven har vist verdi. AAMs
nåværende generering er hovedsakelig stødig 4/4 og ordinær major/minor-harmoni,
så gode AAM-resultater er ikke bevis på god real-world-kvalitet.

GuitarSet består av 360 cirka 30-sekunders ekte akustiske gitaropptak fra seks
musikere, fem stiler, to tempi og comp/solo-varianter. Hver JAMS-fil har beats,
downbeats, key og både instructed og performed chord annotations. Den
instruerte annotasjonen kommer fra lead sheet; den utførte annotasjonen er
utledet fra noteannotasjonene med segmentering og rot fra lead sheet. Bruk
derfor instructed chords som primær musikalsk referanse og forskjellen mot
performed chords som et tegn på annotasjons-/utførelsestvetydighet, ikke som to
uavhengige menneskelige fasiter.

Kilder:

- [Tiny AAM](https://zenodo.org/records/6771120)
- [Full AAM](https://zenodo.org/records/5794629)
- [AAM-artikkel og begrensninger](https://link.springer.com/article/10.1186/s13636-023-00278-7)
- [GuitarSet](https://zenodo.org/records/3371780)
- [GuitarSet-innhold og annotation provenance](https://guitarset.weebly.com/)
- [mirdata GuitarSet-loader](https://mirdata.readthedocs.io/en/stable/_modules/mirdata/datasets/guitarset.html)

## Benchmarkdesign

### Ikke bygg en lang enkel-til-vanskelig stige

«Vanskelighet» er ikke én akse. En enkel I–V–vi–IV-progresjon kan være vanskelig
i en tett miks, mens en harmonisk avansert progresjon kan være enkel på solo
piano. Testmatrisen bør derfor skille minst disse aksene:

- timing: referansebeats mot analyzerens egne beats
- miks: full miks mot ideelle harmoniske/bass-spor
- chord vocabulary: major/minor mot sevenths, sus, diminished og OOV-labels
- endringstetthet: få mot mange akkordskifter per minutt
- harmonisk tvetydighet: root, inversion/bass og konkurrerende kvaliteter
- akustikk: syntetisk, ekte enkeltinstrument og ekte ferdig miks

En liten pilot kan dekke disse aksene bedre enn mange tilfeldig valgte sanger.

### Automatisk utvalg av RWC-pilot

Ikke velg sanger etter magefølelse. Les alle RWC-P-annotationer og metadata, og
beregn per låt:

- akkordskifter per minutt
- antall unike root/quality-kombinasjoner
- label-entropi
- andel utenfor major/minor
- andel utenfor analyzerens nåværende vocabulary
- tempo og låtvarighet
- instrumentantall fra `LiveInstruments`

Velg 12 sanger som dekker lav, median og høy verdi på disse aksene. Fordel dem
før første analyzerendring i:

- 8 development-sanger som kan brukes til feilanalyse og justering
- 4 holdout-sanger som kun brukes til regresjonskontroll

Når metoden er stabil, kjøres alle 100 RWC-P-låter som avsluttende kontroll.
Holdouten må ikke byttes fordi en endring gjør det dårlig der.

### To obligatoriske analysepass

Kjør samme lyd i to moduser:

1. **Oracle timing:** bygg analysevinduer fra RWC-beats/downbeats. Dette måler i
   hovedsak chord evidence, root og quality uten at feil beatgrid dominerer.
2. **End-to-end timing:** bruk analyzerens egne beat-, meter- og downbeatvalg.
   Dette måler det brukeren faktisk får før manuell timingkorreksjon.

Forskjellen mellom passene er mer handlingsrettet enn én totalscore:

- Begge dårlige: arbeid med chroma, stem-evidence, root/quality eller vocabulary.
- Oracle god, end-to-end dårlig: arbeid med beat/downbeat/segmentering, ikke
  akkordtemplater.
- Root god, quality dårlig: behold pitch-evidence og arbeid med kvalitetsvalg.
- WCSR rimelig, men svært mange cues: arbeid med segmentering/smoothing eller
  konservativ presentasjon.

Et valgfritt tredje pass kan bruke eksisterende Demucs-støttespillere på bare
de fire verste development-sangene. Ikke bruk CPU-tid på Demucs for hele
korpuset før full-mix-resultatet viser at stem-evidence sannsynligvis er
flaskehalsen.

### Standardiserte målinger

Bruk Harte/JAMS-labelsyntaks og `mir_eval` i et separat evalueringsmiljø. Det
hindrer at `C`, `C:maj` og enharmoniske skrivemåter behandles som ulike bare på
grunn av tekstformat. `mir_eval.chord` tilbyr de etablerte, varighetsvektede
sammenligningene som MIREX bruker.

Rapporter minst:

| Måling | Formål |
| --- | --- |
| Root WCSR | Er grunntonen riktig over tid? |
| MajMin WCSR | Er root og grunnleggende major/minor riktig? Dette er primær POC-måling. |
| Triads og MIREX WCSR | Mer detaljert harmonisk kvalitet uten å gjøre eksakt fritekstlikhet til hovedmål. |
| Boundary precision/recall/F1 | Finner analyzeren faktiske skifter uten å legge til for mange? |
| Predikerte/reference skifter per minutt | Avdekker den nåværende 279-cue-typen oversplitting direkte. |
| OOV-varighet | Hvor mye av fasiten kan dagens vocabulary i det hele tatt uttrykke? |
| Kjøretid og real-time factor | Sikrer at kvalitetsgevinst ikke gjør demoen ubrukelig treg. |

For boundary-måling: slå sammen like naboakkorder, fjern filstart/-slutt som
grenser, og match resterende skifter med en eksplisitt toleranse, eksempelvis
100 ms og 250 ms. Vis begge; ikke gjem timingproblemer bak én romslig toleranse.

Kilder:

- [`mir_eval.chord` og WCSR-komparatorer](https://mir-eval.readthedocs.io/latest/api/chord.html)
- [MIREX Audio Chord Estimation](https://music-ir.org/mirex/wiki/2025:Audio_Chord_Estimation)
- [JAMS chord-syntaks](https://jams.readthedocs.io/en/stable/namespaces/chord.html)

### Automatisk feilklassifisering

Runneren bør skrive én kort JSON- og Markdown-rapport med:

- totalscore og track-median for hvert pass
- resultater per kompleksitetsgruppe
- fem største regresjoner og fem svakeste spor
- root-confusion matrix
- feil der root er riktig, men quality er feil
- ekstra og manglende boundaries
- OOV-labeler sortert etter varighet
- analyzerens cues/min mot referansens changes/min

Dette erstatter store deler av dagens manuelle klassifisering av «false extra»,
«missing», «wrong root» og «wrong quality». Mennesket lytter bare til de
utvalgte radene rapporten ikke kan forklare.

## Beslutningsporter og tilbakesporing

Absolutte kvalitetsterskler bør ikke låses før første baseline, men selve
beslutningsreglene kan låses nå.

### Port 0: Evalueringsharness er troverdig

- reference mot reference gir 100 % på alle relevante labelmål
- en bevisst semitonetransponert prediction feiler root som forventet
- splitting/merging av like naboetiketter endrer ikke WCSR
- RWC filnavn, start/slutt og varighet valideres før analyse

Hvis dette feiler, stopp. Ikke tolk analyzerresultater.

### Port 1: Hopp direkte til realistisk RWC-pilot

Kjør 12-sangspiloten end-to-end og med oracle timing. Ikke gjør flere
heuristikkendringer først.

Hvis oracle-resultatet er klart bedre enn end-to-end, gå tilbake bare til
timingdiagnostikk. Hvis begge er svake, gå tilbake til de fem svakeste sporene
med AAM-miksablations og eventuelt GuitarSet. Det er ikke nødvendig å kjøre en
lang sekvens fra isolerte C-dur-akkorder og oppover.

### Port 2: En endring må generalisere

En analyzerendring kan beholdes når den:

- forbedrer primærmålet på development med en praktisk margin; start med minst
  2 prosentpoeng MajMin WCSR eller en tydelig reduksjon i feil skifter
- ikke forverrer holdout med mer enn 1 prosentpoeng
- forbedrer medianen eller et flertall av sporene, ikke bare én lang låt
- ikke øker cues/min, kjøretid eller OOV-adferd på en måte som skader POC-en

Etter to mislykkede heuristikkforsøk mot samme feilklasse bør vi stoppe lokal
parameterjustering og kjøre en ferdig analyzer som kontroll.

## Sammenlign med en ekstern baseline før større omskriving

Den første eksterne kontrollen bør være **Chordino/NNLS Chroma**. Den er en
klassisk åpen Vamp-plugin som gir tidsstemplede chord estimates og harmonic
change values. Kjør den gjennom samme normalisering og `mir_eval`-rapport, ikke
som en separat subjektiv demo.

Beslutningsregel:

- Hvis dagens analyzer er omtrent på nivå med Chordino på primærmål og har
  bedre integrasjon/kjøretid, fortsett med den enklere lokale løsningen.
- Hvis Chordino er konsistent mer enn omtrent 5 prosentpoeng bedre på RWC
  holdout, vurder en adapter eller å låne dens front-end/sekvensidé før flere
  egne templater finjusteres.
- Gå først til tunge modeller som BTC/Transformer dersom både dagens analyzer
  og Chordino er utilstrekkelige for læringscues. BTC er en relevant
  forskningsbaseline, men bringer modellvekter, PyTorch og større installasjons-
  og lisensrisiko inn i real mode.

`madmom` kan gjenkjenne major/minor med ferdige CNN/CRF-modeller, men den smale
24+N-vokabularen og eldre Python-stakken gjør den mindre egnet som første
produktkandidat. Essentia har beat-bundet chord detection og kan være en senere
lettvektsbakeoff, men er ikke nødvendig for å etablere benchmarken.

Kilder:

- [Chordino/NNLS Chroma](https://isophonics.net/nnls-chroma)
- [madmom chord recognition](https://madmom.readthedocs.io/en/v0.15/modules/features/chords.html)
- [BTC-artikkel](https://archives.ismir.net/ismir2019/paper/000075.pdf)
- [Essentia ChordsDetectionBeats](https://mtg.github.io/essentia.js/docs/api/Essentia.html#ChordsDetectionBeats)

## Token- og iterasjonsøkonomi

Selve benchmarkkjøringen bruker lokal CPU og ingen modelltoken. Tokenkostnaden
kommer når et menneske eller Codex leser råresultater og gjør kodeendringer.
Derfor bør runneren komprimere evidensen før neste arbeidsøkt.

Anbefalt rytme:

1. Én implementasjonsøkt bygger adapter, metrikk og fast manifest.
2. Én baselinekjøring produserer aggregert rapport og de fem viktigste
   feileksemplene.
3. Én økt velger den største generaliserte feilklassen og gjør høyst én
   analyseendring.
4. Hele development + holdout kjøres automatisk på nytt.
5. Etter to ikke-generaliserende endringer: stopp og sammenlign Chordino i
   stedet for flere små parameterforsøk.

Dette gir større, evidensbaserte sprang og eksplisitt rollback. Før/etter-JSON
beholdes, og analyzerendringer ligger i fokuserte commits som kan reverseres.

## Minimal implementasjon for dette prosjektet

Neste vertikale oppgave bør være en **benchmark-harness**, ikke en ny
akkordheuristikk.

Foreslått leveranse:

1. `scripts/benchmark-chords.js` kjører den allerede eksporterte
   `analyzeHarmonyFromAudio` direkte, uten å opprette library jobs.
2. Et lite RWC-adapterlag leser metadata, beats og `start;end;chord`.
3. Et eksternt Python eval-miljø, for eksempel `requirements-eval.txt`, pinner
   `mir_eval`; dette må aldri bli en mock-mode dependency.
4. Et versjonskontrollert manifest låser development/holdout og datasetversjon,
   men inneholder ikke audio.
5. Runneren støtter `--timing oracle|estimated|both`,
   `--split development|holdout|all`, `--track` og `--limit`. Development er
   standardvalget slik at holdout ikke åpnes ved et uhell.
6. Resultater skrives til en ignorert artefaktkatalog, mens en liten aggregert
   baseline kan sjekkes inn som dokumentasjon.
7. Testene verifiserer labelnormalisering og Port 0 uten å laste ned RWC.
8. `scripts/extract-rwc-pilot.js` verifiserer arkivets MD5 og trekker bare ut
   de 12 låste WAV-filene, ikke hele korpuset.

Media bør konverteres til samme PCM16-WAV-kontrakt som real mode. Etter at
RWC-baseline er stabil kan 3–4 holdoutspor også kjøres gjennom en deterministisk
AAC/MOV-transkoding for å måle codec-delen av screen-recording gapet. Det er
fortsatt ikke en erstatning for noen få ekte iOS-opptak, men gjør den manuelle
delen langt mindre.

Implementasjonsmerknad: RWC-P-akkordannotasjonene går vanligvis omtrent to
sekunder forbi den frigitte v2-WAV-filen. Adapteren bruker derfor den offisielle
metadata-lengden, validerer den mot dekodet WAV og lar `mir_eval` klippe det
siste annotasjonsintervallet ved lydgrensen. Oppsett og konkrete kommandoer ligger i
`benchmarks/README.md`.

## Anbefalt beslutning

- **Gjør RWC-P v2 til primær Phase 2J-benchmark.**
- **Bruk Tiny AAM og GuitarSet kun som diagnostiske tilbakesporingsverktøy.**
- **Mål oracle timing og end-to-end separat.**
- **Bruk Root/MajMin/Triads/MIREX WCSR, boundary F1, cue density og kjøretid.**
- **Hold 4 av pilotens 12 sanger urørt som holdout.**
- **Sammenlign med Chordino etter to mislykkede lokale forbedringsforsøk eller
  tidligere dersom baselinegapet er stort.**
- **Behold 2–3 ekte skjermopptak som siste domenesjekk, ikke som fasitkorpus.**

Dette gir raskere og mer pålitelige svar enn å transkribere flere tilfeldige
sanger manuelt, samtidig som arbeidsflyten fortsatt tester det prosjektet
faktisk trenger: nyttige akkordcues fra realistisk, ferdig mikset lyd.
