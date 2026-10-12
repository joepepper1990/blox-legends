# Blox Legends

A Roblox-style game for iPad that quietly trains the skills tested in the Kent Test and the Shepway
Test (11+). Players run, jump and explore a blocky world. Every gate, glass panel and door is a
question, and an adaptive engine keeps each one pitched at the right level.

## What's in this first version

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
- Read-aloud on/off, extra time, and backup/restore.

**Privacy:** no accounts, no ads, no purchases, no chat, and no data leaves the iPad.

## Putting it on the iPad

1. Open the game's web address in **Safari** on the iPad.
2. Tap **Share → Add to Home Screen**.
3. Open it from the new home-screen icon. It runs full-screen like an app and works offline after the first load.

Progress saves on the iPad. Use **Grown-ups → Backup** now and then to keep a copy.

## Developing

No build step. It's plain ES modules, with three.js and the Lexend font vendored.

```sh
npm test          # question-generator and mastery-engine tests
npm run serve     # http://localhost:8080
```

```
index.html, styles.css, sw.js, manifest.webmanifest
src/main.js, src/game.js        game shell, rewards, time limit
src/engine/                     player, touch controls, camera, UI, sound, speech, effects
src/worlds/                     hub, obby (maths), vault (verbal), lab (spatial)
src/learning/                   skills, generators, adaptive mastery engine
src/shop.js, src/parent.js      shop and grown-ups dashboard
tests/                          node --test suites
```

## Roadmap

1. Non-verbal reasoning world: pattern locks, series, matrices, odd one out.
2. Vocabulary pets: synonyms, antonyms and analogies.
3. Lore Library: short story chapters with comprehension questions.
4. Year 5 maths: fractions, decimals, percentages, area, angles.
5. Arena mode for Year 5: Kent-style timed multiple-choice sections and printable papers, plus a Shepway-style mixed on-screen test.

Licences: three.js (MIT, `vendor/THREE-LICENSE`), Lexend (SIL OFL, `fonts/LEXEND-LICENSE`).
