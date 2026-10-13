# Blox Legends

A Roblox-style game for iPad that quietly trains the skills tested in the Kent Test and the Shepway
Test (11+). Players run, jump and explore a blocky world. Every gate, glass panel and door is a
question, and an adaptive engine keeps each one pitched at the right level.

## What's in the game now

| World | Looks like | Actually training |
|---|---|---|
| **Hub** | Floating island, portals, shop, daily chest | Choosing what to play; rewards |
| **Glass Bridge** (Choice Path) | Jump onto the glass with the right answer; wrong glass smashes | Number bonds, adding and taking away, times tables (Year 3: 3, 4, 8), division facts, doubles and halves, place value to 1,000, comparing and ordering, 10/100 more or less, counting in steps, mental adding and subtracting, missing numbers |
| **Code Vault** (Logic Lock) | Stone doors with puzzles on them; step on the right rune tile | Alphabet fluency, letter positions, letter codes, decoding, letter series, mirror codes, synonyms, antonyms, odd one out, compound words (GL verbal reasoning); column addition and subtraction; word problems |
| **Build Lab** (Pattern Plates) | Builds on pedestals and a puzzle board; step on the plate by your answer | Counting cubes (including hidden ones), rotations vs mirror images, bird's-eye views, shape patterns and shape odd-one-out (non-verbal reasoning) |

A skill he is good at also turns up in the other worlds in a new form (a times table as a story on a door, or as rows of blocks; a letter code on the glass; a turned build drawn on a door), so he learns to use it anywhere. The Word zone (Year 3/4 spellings, prefixes, -ly, a or an, conjunctions, prepositions, adverbs) is built and checked, and arrives with the Word portals in the next update.

Built to suit young players, including those who find focus or reading hard:

- **Short runs.** Each run takes 2–4 minutes, and the worlds keep changing.
- **Instant feedback.** Coins, sounds and confetti come straight away.
- **Everything is read aloud.** Every question and every answer choice is spoken, with a button to hear it again.
- **Easier-to-read text.** Lexend font on cream panels with dark text and generous spacing.
- **The alphabet strip is always on screen in the vault**, as on real papers. Helper numbers fade out as he improves.
- **Wrong answers teach a method instead of just saying "wrong":**
  - Bolt the robot explains a strategy.
  - The alphabet strip animates the hops.
  - Builds split into layers to count, or turn to show the match.
  - The camera flies overhead for bird's-eye-view questions.

## How the learning engine works (`src/learning/`)

- **55 skills** in four zones (Number, Code, Shape, Word), each with a stable id, prerequisites, the term it belongs to, and the formats and worlds it can appear in (`skills.js`). The Year 3 Autumn objectives are mapped to them (`curriculum.js`), and the school calendar decides which term's skills are open (`calendar.js`).
- **Questions** are generated (number, letter codes, cube builds, shape patterns) or drawn from checked banks (synonyms, spellings, grammar). Every question is checked by an **independent checker** that never sees how it was made, and must have exactly one right answer. Each wrong option is tagged with the **mistake** that leads to it, so a wrong answer gets the explanation for that exact mistake.
- **Six stages per skill:** introduced → practising → accurate (7 of 8 new questions right first time) → applied (right in other worlds) → retained (short checks after 3- and 7-day gaps) → mastered (a 21-day check, at least 28 days after accurate). Reviews 30, 60 and 90 days later can mark a skill "needs refresh". Questions answered in under the reading time are **rapid guesses**: they earn no coins and no progress.
- **What comes next** (`scheduler.js`): new learning from the first three skills in curriculum order, a follow-up a few questions after a mistake, the next-day recheck, due checks and reviews, one transfer question per run, and spaced repetition for facts. Practice never uses the questions kept for bosses (`assessment.js`).
- **Checked by simulation:** simulated learners (fast, average, slow, a memoriser, a forgetter, a rapid guesser, a heavy player) play months of real questions in the tests (`tools/sim/`, `docs/simulation-report.md`).

## Grown-ups area

Tap the gear icon. You'll set a 4-digit PIN the first time. Inside:

- **Term Tracker:** school year and term, this term's objectives and how they're going, against how much of the term he has been playing.
- **Skill map:** every skill's stage, accuracy on new questions and after a gap (shown as a range once there are enough answers), speed, and mistakes to watch.
- Today's minutes and accuracy.
- School-year settings: the year he's in Year 3, the term (if the school's dates differ), and how far ahead new learning may go.
- The **daily play limit**, which defaults to 25 minutes. When it runs out the portals "recharge" until tomorrow.
- Read-aloud on/off, extra time.
- **Saving and backups** (see below).
- **Progress from the old game:** paste the backup code from the first version to bring coins, outfits and skill records across. Each code can only be added once.

**Privacy:** no accounts, no ads, no purchases, no chat, and no data leaves the iPad.

## Saving and backups

- **Progress saves on the iPad** in IndexedDB, after every run and every few seconds while playing. Every answer also goes into an append-only learning log, which will later sync between the two iPads.
- **Daily snapshots** of the whole save are kept for 14 days.
- **Backup files.** *Grown-ups → Save a backup file* creates a `.bloxbak` file and opens the iPad share sheet: save it to Files or iCloud Drive, or AirDrop it. You can protect it with a passphrase (AES-GCM encryption). Do this every few weeks.
- **Restore.** *Grown-ups → Restore from a backup file* shows what's in the backup first. Restoring **replaces** the progress on this iPad (it never adds to it, so coins can't be duplicated), and keeps a safety copy of what was there.
- **First version.** If the first version ran from the same web address, its save is brought over automatically on the first launch and left in place.
- **Upgrades.** When a new version changes how progress is stored, a safety copy of the old save is kept first, and skills mastered in the first version come across as "accurate (to check)" until a short check confirms them. An older version of the game will not overwrite progress saved by a newer one.

## Updates

New versions download in the background as one complete package. A **"✨ Update ready!"** button appears in the hub (never during a run). Tapping it saves, then restarts into the new version, so old and new files are never mixed.

## Putting it on the iPad

1. Open **https://joepepper1990.github.io/blox-legends/** in **Safari** on the iPad.
2. Tap **Share → Add to Home Screen**.
3. Open it from the new home-screen icon. It runs full-screen like an app and works offline after the first load.

## Developing

No build step for the app itself. It's plain ES modules, with three.js and the Lexend font vendored. `tools/build.mjs` copies the files into `_site/` and generates the versioned service worker.

```sh
npm install
npm test          # unit tests: generators, checkers, learner, scheduler, simulations, physics, saves, backups
npm run e2e       # browser tests (Playwright): every world, every question kind, saves, backups, v1 import, offline, updates
npm run serve     # build, then http://localhost:8080
node tools/validate-content.mjs   # content checks + capacity rule; writes docs/content-report.md
node tools/sim/sim.mjs 90 --md    # 90-day simulated learners; writes docs/simulation-report.md
```

Every push runs both test suites on GitHub Actions. Pushes to `main` publish to GitHub Pages only if every test passes.

```
index.html, styles.css, manifest.webmanifest
src/main.js, src/game.js        game shell, fixed 60 Hz physics loop, rewards, time limit
src/update.js, tools/           update prompt; build + service-worker template
src/data/                       IndexedDB store, learning log, backups (.bloxbak), v1 import, fallback store
src/engine/                     player + physics, touch controls, camera, UI, sound, speech, effects
src/worlds/                     hub, obby, vault, lab: layout and theme
src/mechanics/                  Choice Path, Logic Lock, Pattern Plates; what each can show; the shared board painter
src/play/run.js                 one run: asks the scheduler, times answers, records attempts
src/learning/                   skills, curriculum, calendar, generators, checkers, banks, learner model, scheduler, assessment
src/shop.js, src/parent.js      shop and grown-ups dashboard
tests/, tests/e2e/              node --test suites; Playwright browser tests
docs/PLAN.md                    the three-year development plan
```

## Roadmap

The full three-year plan is in [`docs/PLAN.md`](docs/PLAN.md). Next releases:

1. **R0 "Safe Harbour"** (done): hosting, IndexedDB saves, backups, v1 import, fixed-step physics, versioned updates, automated tests.
2. **R0.8 "Learning Core"** (this version, 0.3.0): skill registry, Year 3 Autumn content, independent checkers, six-stage learner model, scheduler, misconceptions, protected boss questions, Term Tracker.
3. **R0.9 "Autumn Woods Playable":** more mechanics, the Word portals, bosses for Year 3 Autumn, bigger word banks.
4. **R0.6 "Two iPads":** parent and device accounts, learning sync and a server-side coin ledger (cloud set-up first).

Licences: three.js (MIT, `vendor/THREE-LICENSE`), Lexend (SIL OFL, `fonts/LEXEND-LICENSE`).
