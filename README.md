# Blox Legends

A Roblox-style game for iPad that quietly trains the skills tested in the Kent Test and the Shepway
Test (11+). Players run, jump and explore a blocky world. Every gate, glass panel and door is a
question, and an adaptive engine keeps each one pitched at the right level.

## What's in the game now

| World | Looks like | Actually training |
|---|---|---|
| **Hub** | Floating island, portals, shop, daily chest | Choosing what to play; rewards |
| **Glass Bridge** (obby) | Jump onto the glass with the right answer; wrong glass smashes | Number bonds, adding and taking away, all times tables to 12×12, division facts, doubles and halves |
| **Code Vault** | Stone doors with codes carved on them; step on the right rune tile | Alphabet fluency, letter positions (E5 J10 O15 T20 Y25), letter codes, decoding, letter series, mirror codes (GL verbal reasoning) |
| **Build Lab** | Builds on pedestals; step on the pad by your answer | Counting cubes (including hidden ones), spotting rotations vs mirror images, bird's-eye views (spatial reasoning) |

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

- **31 skills**, each with prerequisites. They're listed in `skills.js`.
- **Mastery.** Each skill's level is a smoothed accuracy score. Four straight right answers on a new skill fast-tracks it, which acts as built-in placement.
- **Choosing questions.** The engine teaches the earliest skill that's open but not yet mastered. It mixes in spaced reviews of mastered skills (10 min, 1, 3, 7 and 21 days), and adds more review when recent accuracy drops below about 85%.
- **Generated questions.** All questions are made by code, so there are endless fresh ones. Tests check every generated question has exactly one right answer.

## Grown-ups area

Tap the gear icon. You'll set a 4-digit PIN the first time. Inside:

- Progress against the September 2029 target, and the status of every skill.
- Today's minutes and accuracy.
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
npm test          # unit tests: generators, mastery, physics, level checks, saves, backups
npm run e2e       # browser tests (Playwright): boot, play, save, backup/restore, v1 import, offline, updates
npm run serve     # build, then http://localhost:8080
```

Every push runs both test suites on GitHub Actions. Pushes to `main` publish to GitHub Pages only if every test passes.

```
index.html, styles.css, manifest.webmanifest
src/main.js, src/game.js        game shell, fixed 60 Hz physics loop, rewards, time limit
src/update.js, tools/           update prompt; build + service-worker template
src/data/                       IndexedDB store, learning log, backups (.bloxbak), v1 import, fallback store
src/engine/                     player + physics, touch controls, camera, UI, sound, speech, effects
src/worlds/                     hub, obby (maths), vault (verbal), lab (spatial)
src/learning/                   skills, generators, adaptive mastery engine, question fingerprints
src/shop.js, src/parent.js      shop and grown-ups dashboard
tests/, tests/e2e/              node --test suites; Playwright browser tests
docs/PLAN.md                    the three-year development plan
```

## Roadmap

The full three-year plan is in [`docs/PLAN.md`](docs/PLAN.md). Next releases:

1. **R0 "Safe Harbour"** (this version): hosting, IndexedDB saves, backups, v1 import, fixed-step physics, versioned updates, automated tests.
2. **R0.6 "Two iPads":** parent and device accounts, learning sync and a server-side coin ledger.
3. **R0.8 "Learning Core":** skill stages, item classes and the new scheduler.
4. **R0.9 "Autumn Woods Playable":** 10 mechanics, 16 portals and bosses for Year 3 Autumn.

Licences: three.js (MIT, `vendor/THREE-LICENSE`), Lexend (SIL OFL, `fonts/LEXEND-LICENSE`).
