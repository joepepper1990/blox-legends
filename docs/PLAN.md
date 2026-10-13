# Blox Legends v2: Development Plan (Revision 3.1)

> **Revision 3.1 (approved design, technical decisions finalised).** Section **§19** records the final decisions on the offline economy, recoverable saves, authentication and security, and the curriculum release schedule. **Where §19 conflicts with §8.4, §10 or §14, §19 wins.** §20 defines the first implementation phase. In particular, the Backpack, pocket pets and egg leases are **removed**. Everything else in Revision 3 stands.

Revision 2 was approved in principle. This revision resolves the 10 issues raised in review and adds an implementation order and release criteria. The parts that were already sound are kept, stated briefly: curriculum, ten realms, pets and evolution tiers, treadmills, bosses, rewards, accessibility and educational principles.

## 0. Issues and how Revision 3 resolves them

| # | Issue raised | Resolution | Section |
|---|---|---|---|
| 1 | The "once every 3 days" recipe rule would run dry at 2 hours a day | The fixed rule is replaced with **least-recently-used selection plus 3 hard rules**. A design-level simulation shows **no dead ends over 90 days at 2 hours a day** of adventure-only play. The same simulation, run on the real recipe catalogue, is a release criterion. | §5 |
| 2 | Negative coins after offline play on both iPads | **Server-authoritative economy with "Backpack and Bank" escrow.** No balance can ever go negative. Offline he spends only what that iPad safely holds. Some actions say clearly that they **need internet**. | §10.3 |
| 3 | Egg guarantees split per iPad | **One shared egg sequence per profile.** Outcomes are fixed by egg number, and each iPad borrows blocks of numbers. Guarantees hold across both iPads and can't be gamed. | §8.4, §10.3 |
| 4 | Parents shouldn't have to be Supabase team members; PIN-only protection | **Parent accounts** (email + password, custom email sender), **separate restricted device accounts** created by a parent-only pairing function, **parent actions checked by the server**, and a fresh parent sign-in for changes. The PIN covers only viewing and small, server-capped time extensions. | §10.4 |
| 5 | Restore performance (92k ops in 2–5 s) was unrealistic | **Validated snapshots** plus recent ops; full history in the background. Realistic targets: **≤ 20 s from a snapshot, ≤ 2 min full rebuild** on an older iPad, resumable with progress. | §10.5 |
| 6 | Freshness rules conflict (90-day bans vs facts vs spaced review vs unseen boss items) | **Three item classes** (facts, procedural, authored), each with its own repetition rule, plus **assessment reserves** that can't run out | §6.3, §6.4 |
| 7 | Launch scope | Release 1 focuses on educational content, gameplay and reliable saving. Extra achievements and cosmetics move to 1.x. **Christmas 2026 is provisional.** | §14 |
| 8 | Content workload | Quantified per term and over 3 years, with sustainability measures | §9.2 |
| 9 | Contradictions | Exactly **10 mechanics plus Boss Arena** at launch; separate repetition rules for facts and reasoning; offline daily-limit gap stated honestly | §4, §6.3, §10.6, §17 |
| 10 | Test the whole experience | A **whole-session simulator** (persona-driven 2-hour days). The design-level run shows 0 stalls over 90 days. It's also a release criterion. | §2, §16 |

---

## 1. Principles (unchanged)

In priority order:
1. **Correctness and safety.**
2. **Variety.**
3. **Genuine learning.**
4. **Longevity.**
5. **Reliability.**
6. **Fun.**

**Learning drives progression; entertainment makes him want to continue learning.**

Hard rules:
- Every currency is earned through learning or parent-verified learning activities. **No real money.**
- **Boosts, pets, gear, speed and abilities never affect** marking, mastery evidence, difficulty, timers or boss requirements.
- No required learning is gated behind speed, abilities or purchases.
- No pressure mechanics: no losable streaks, no expiring rewards, no near-miss animations.
- Read-aloud, reading-friendly UI, short activity blocks, break prompts and parent limits remain.

---

## 2. Capacity and sessions

**Shape of play.**
- 5–15-minute activity blocks.
- A 3-minute movement break every 30 minutes.
- A **45-minute session cap** by default (the parent can raise it to 60), so 2 hours means 2–3 sessions. The simulation below deliberately used **longer 60-minute sessions**, the harder case for per-session variety.
- A parent-set **combined** daily limit (default 25 minutes, up to 120).
- **Hard cap of 250 questions a day,** plus the reward taper (§8.1). After the taper starts, question density drops and gameplay share rises.

**Design-level whole-session simulation** (Revision 3 evidence; run with no files written). Setup:
- 120 minutes a day for 90 days: two 60-minute sessions with breaks.
- A child persona who rarely repeats the same activity type twice in a row.
- Activity menu: portals, adventures, tower, daily dungeon, story, short passages, boss, Bolt's Mix, free play.
- Weekly episode allowance, daily authored allowances, tower cap, boss readiness from week 3.

| Measure (90 days) | Result |
|---|---|
| Moments with no fresh activity available ("stalls") | **0** |
| Minimum distinct activity types per 60-minute session | **3** |
| Minimum distinct mechanics per session | **6** |
| Minimum subjects per session | **3** (daily quests guarantee all 4 each day) |
| Questions per day, average / maximum, **before the cap** | 219 / 285 → **the 250 cap and the taper are needed and enforced** |
| Non-question share of time | **40%** (target band 30–45%) |
| New authored items per day | about 19 (within the allowances) |

**Release criterion:** the real simulator (§16) must reproduce these properties using the actual content packs and the real scheduler, mastery and adventure code.

**Expected load after the cap and taper:**

| Profile | Questions a day | Over 3 years |
|---|---|---|
| Casual (20 min) | about 38 | about 35k |
| Regular (60 min) | about 100 | about 95k |
| Heavy (120 min) | about 180, never above 250 | about 175k |

---

## 3. Realms and terms (approved; unchanged)

There are 10 realms, each tied to a school term:
- Autumn Woods (Y3 Aut), Frost Peaks (Y3 Spr), Sunny Shores (Y3 Sum)
- Ninja Valley (Y4 Aut), Crystal Caves (Y4 Spr), Jungle Ruins (Y4 Sum, MTC)
- Volcano Forge (Y5 Aut, Trials begin), Sky Kingdom (Y5 Spr), Cyber City (Y5 Sum, mocks)
- Legends' Citadel (summer 2029, Y6 pre-teach and the final boss)
- Then **Legends League** after the test.

**Each realm has:**
- 4 zones: Number, Word, Code (verbal reasoning), Shape (non-verbal and spatial).
- **16 portals**, Bolt's Mix, 4 zone bosses and a realm boss.
- Adventure gates.

**Realm opening.**
- Realms open **by school calendar**, or early once the previous realm boss is beaten, within the parent's maximum lead (default 1 term), and only when the content has been released.
- Past realms never lock, and catch-up quests support him if he falls behind.

**Evolution after mastery.**
- Legend bands 3–5 and Remixes that mix in his current skills.
- Hidden areas reached with later abilities, holding lore, cosmetics, secret puzzle rooms and Echo Bosses.
- Seasonal skins and termly Echo Quests (retention checks).
- **Difficulty follows his demonstrated ability**, never the realm's year label.

**Curriculum spine** (approved in Revision 1; data-driven so it can follow the new National Curriculum from September 2028 and any Kent or Shepway format change):

| Realm | Maths | English | Reasoning |
|---|---|---|---|
| Y3 Aut | Place value to 1,000; add and subtract 3-digit numbers; ×3 ×4 ×8 | Prefixes, -ly, Y3/4 words; conjunctions, prepositions, adverbs, a/an | Alphabet, codes, easy synonyms and antonyms, odd ones out, compound words; non-verbal series and odd one out; cubes |
| Y3 Spr | 2-digit × and ÷ 1-digit; length and perimeter; fractions A; mass and capacity | -ation, -ous, -ture/-sure, -sion; inverted commas; present perfect | Hidden word, missing 3-letter word, insert a letter; analogies, reflections; rotations, fold-and-punch introduction |
| Y3 Sum | Fractions B; money; time; angles and lines; statistics | -tion/-ssion/-cian, ch, -gue/-que, sc, ei/eigh/ey; homophones 1 | Letter connections, number series, word connections; 2×2 matrices; nets |
| Y4 Aut | Place value to 10,000; negative numbers; rounding; area; ×6 ×7 ×9 ×11 ×12 | Possessive -s; Standard English; noun phrases; fronted adverbials | Letters for numbers, complete the sum, move a letter; non-verbal codes, similarities; hidden shapes |
| Y4 Spr | Factor pairs; ×÷10 and 100; short division; km; fractions; decimals A | Speech punctuation; plural possessive apostrophes; pronouns | Word–number codes, make a word, logic; 3×3 matrices; fold-and-punch |
| Y4 Sum | Decimals B; money; time; shape and symmetry; coordinates; **MTC** | Homophones 2; Y3/4 list complete; "spot the mistake" | All 21 verbal reasoning types at Y4 level; mixed non-verbal |
| Y5 Aut | Place value to 1,000,000; Roman numerals; primes, squares, cubes; fractions A | -cious/-tious, -cial/-tial; relative clauses; modal verbs | **Kent Trials begin** |
| Y5 Spr | Long multiplication; short division; fractions × whole numbers; decimals and % | -ant/-ent, -able/-ible, -fer; parenthesis | Test-level verbal and non-verbal; spatial speed |
| Y5 Sum | Angles; reflection and translation; decimals; volume; imperial units | ough, silent letters, ei after c; homophones 3; Y5/6 list | Monthly Kent and Shepway mocks; Writing Quest |
| Summer 2029 | **Y6 pre-teach:** ratio, algebra, BIDMAS, % of amounts, mean, area of triangles, angles in polygons | Passive, subjunctive, colons and semi-colons, hyphens | Weekly full mocks; final boss |

### Autumn Woods portals (Release 1), with each portal's mechanic

| Zone | Portals (mechanic) | Boss |
|---|---|---|
| Number | Glass Bridge (Choice Path) · Ladder Climb (Climb/Race) · Mining Caverns (Mine/Dig) · Bridge Builder (Construct) | Magma Calculator Golem |
| Word | Keyboard Escape: Spell Run (Type Floor) · Story Library (Read & Seek) · Fishing Lake (Collect & Sort) · Lava Floor: Grammar Grab (Choice Path) | Quill Gremlin King |
| Code | Code Vault (Logic Lock) · Ladder Climb: Word Sprint (Climb/Race) · Keyboard Escape: Missing Letters (Type Floor) · Lava Floor: Odd Ones Out (Choice Path) | Riddle Sphinx |
| Shape | Pattern Temple: Sequences (Pattern Plates) · Pattern Temple: Mirrors (Pattern Plates) · Build Lab with Rebuild (Pattern Plates + Construct) · Lava Floor: Shape Showdown (Choice Path) | Prism Drake |
| — | Bolt's Mix (mixed mechanics) | **Autumn Titan** (realm boss) |

Each portal's content is unchanged from Revision 2. Base movement is always enough to finish every portal.

---

## 4. Mechanics: exactly 10 at launch, plus the Boss Arena

1. **Choice Path:** panels, doors, lava tiles.
2. **Construct:** planks, stepping stones, stairs, towers, paths, shape assembly, Rebuild.
3. **Collect & Sort:** catch or collect the items that fit a rule.
4. **Chase/Escape:** used in adventures.
5. **Climb/Race.**
6. **Type Floor:** spell or type.
7. **Logic Lock:** levers, codes, ordering, Venn gates.
8. **Mine/Dig.**
9. **Pattern Plates:** non-verbal and spatial panels.
10. **Read & Seek:** reading screens, and clues that lead to treasure.

Plus the **Boss Arena**, an encounter system that isn't counted as a mechanic. Each later term adds 1–2 mechanics (Survive/Defend, Race track, Doors, Tycoon, Grow-a-Garden, Tower Defense, MTC, Trials, Writing Studio…).

**Rules for every mechanic:**
- **The item is chosen first, then a compatible mechanic,** so no subject gets crowded out.
- **Hazards pause while a question is open.** Only the question phase is timed, and movement never counts towards mastery.
- **Unlimited retries with a new variant.** A wrong answer never uses up keys, planks or paths, so he can't get stuck.
- **A fixed 60 Hz physics step.** Levels are validated against the worst-case movement range with a 15% margin, at 30, 60 and 120 fps.
- **Each mechanic declares its formats and label sizes;** content that doesn't fit is rejected by validation.

---

## 5. Adventure Engine: freshness redesigned and checked

### 5.1 What counts as "meaningfully different"

From strongest to weakest:
1. **Mechanic** (the gameplay verb).
2. **Recipe variant**, an authored *structural* option that changes the thinking. For Construct: span by sum, sequence stones or equivalent planks. Every recipe must have **at least 3 variants**, checked in CI.
3. **Objective:** exit, collect, build, rescue or treasure.
4. **Twist:** lava, darkness, moving platforms, low gravity, conveyor, wind, ice, a guardian, or none.
5. Theme, then layout seed, then question content. These never count as variety on their own.

A room's **gameplay signature** = (mechanic, recipe, variant, twist, objective). Theme, layout and questions are excluded, so random layouts can't pass for variety.

### 5.2 The new freshness rules

**Hard rules:**
- **H1:** no mechanic twice in a row, and at most 2 of any mechanic per adventure, so each adventure has at least 4 distinct mechanics.
- **H2:** no identical room signature twice in the same day.
- **H3:** no recipe variant twice in the same session.
- **H4:** no identical adventure (type × ordered mechanic sequence) within 30 days.
- **Daily dungeon:** unique per date; its seed includes the generator version, so both iPads agree.

**Soft preference:** among valid rooms, choose by **least-recently-used**, measured in rooms played rather than calendar days, with slight jitter. That gives the longest possible gap between repeats at any amount of play.

### 5.3 Capacity at launch

The catalogue is 10 mechanics × 3 recipes × 3 variants, with each recipe allowing about 5 twists (including none) and about 1.6 objectives. That gives **about 735 gameplay signatures**.

Each termly update adds 8–12 recipes, which is about 250–350 more signatures.

### 5.4 Design-level 90-day evidence (Revision 3 simulation)

| Scenario | Dead ends | Gap before an identical room repeats (P10 / P50 / P90) | Rooms not seen in the previous 7 days | Distinct recipe variants a day |
|---|---|---|---|---|
| **Worst case:** 120 minutes a day *all* in adventures and tower, about 96 rooms a day, 90 days, no content updates | **0** | 7.4 / 7.6 / 7.9 days | **99.9%** | 60–73 of 90 |
| **Realistic:** about 60% of 120 minutes in adventures and tower, about 56 rooms a day | **0** | 12.7 / 13.1 / 13.6 days | 100% | 43–54 |

At the extreme, an exact room combination comes back about once a week. Even then it has a different theme, layout and questions, and that's before any content updates. The Frost Peaks update roughly doubles the gap.

### 5.5 Release criterion

The same simulation, run on the **real** recipe catalogue at 96 rooms a day for 90 days, must show:
- 0 dead ends;
- P10 repeat gap ≥ 7 days;
- ≥ 95% of rooms not seen in the previous 7 days;
- ≥ 40 distinct recipe variants a day;
- H1–H4 never violated.

### 5.6 Assembly and validation (from Revision 2)

- Seeded mission graph with locks and keys, branches (choose a subject route), secret and rest rooms, and puzzle → action → reward pacing.
- Recipes picked to fit the scheduler's items.
- Merged and instanced modular kit pieces.
- **Solvability with base movement only** (reachability search plus a headless bot at 30, 60 and 120 fps); keys reachable before locks; no soft-locks; draw-call and triangle budgets; generation under 150 ms.
- Rooms take 40–120 seconds; adventures are 6–8 rooms (8–12 minutes).

### 5.7 Endless Tower

- Floors come from the same signature pool and LRU, in **themed bands of 10**.
- A rest and treasure floor every 5 floors, a milestone mini-boss every 10th, and occasional special floors.
- The floor number scales **movement only**; questions come from mastery.
- **Up to 20 new floors a day.**
- A new season each term.
- A weekly seeded challenge against his own ghost.

### 5.8 Adventure types

- **Release 1:** Escape Room, Bridge Quest, Treasure Hunt, plus the daily dungeon and the Tower.
- **Later:** Obstacle Course, Survival Night, Mining Expedition, Logic Labyrinth, Puzzle Dungeon, Race, Boss Raid.

---

## 6. Educational content system

### 6.1 Skills (approved)

- About 250–420 skills by Y5, with **stable IDs that are never reused** (splits are handled by mapping).
- Each skill has an area, strand, realm, prerequisites, formats and target difficulty band per year.
- Each skill also has an **item class** (§6.3).

### 6.2 Pipelines (approved)

1. **Generated at runtime** (maths, algorithmic verbal reasoning, non-verbal, spatial). Every generator has an independent answer checker; non-verbal items get uniqueness proofs; every item has a stable fingerprint.
2. **Generated in advance, then checked** (word-based verbal reasoning from a curated 10–20k-word list).
3. **Authored, checked and released** (stories, passages, vocabulary, spelling, grammar, prompts, story and bosses).

Each authored item is reused across up to 8 formats, and items are tracked as (word, format, context).

### 6.3 Item classes and repetition rules

This replaces the conflicting Revision 2 rules.

| Class | Examples | Practice repetition | Spaced review | "New-question" measure | Boss assessment |
|---|---|---|---|---|---|
| **Fact** (finite set; memorising is the goal) | Number bonds, tables facts, alphabet positions, spelling words, word meanings | **Repetition is intended.** Scheduled per item by spaced repetition; fluency practice may repeat a fact within a session (at least 5 items apart). **No 90-day ban.** | Item level | **Delayed-recall accuracy** (first try on items not seen for 3+ days), plus fluency on direct-answer formats only | Delayed-recall items only (not seen for 3+ days), so it can never run out |
| **Procedural** (generated, large space) | 3-digit add and subtract, word problems, letter codes, series, non-verbal, spatial | Prefer unseen fingerprints. **An exact fingerprint isn't repeated within 90 days while unseen ones remain**; otherwise least-recently-used, and the item doesn't count as unseen. The same template is used at most twice per session. | **Skill level, with fresh variants** (never the same item) | **Unseen accuracy** (first exposures) | Drawn from the **assessment partition**: 15% of each skill's fingerprint space, reserved by hash and **never used in practice** |
| **Authored** (finite bank) | Grammar sentences, comprehension questions, word-based verbal reasoning items, short passages | Only new (within the weekly allowance) or a due review, at least 20 hours apart. After an error, asked again once in a different format (not counted as unseen). **Passages aren't repeated within 180 days** (re-reads come with the second question set). | Item level, by spaced repetition | Unseen accuracy on first (item, format) exposures | **Assessment reserve:** 20% of each term's items, used for nothing else until assessed, then released to practice |

**Capacity rule, checked in CI.** Each procedural skill's fingerprint space must be at least **3 × (its 90-day heavy-player demand + its assessment partition)** at every difficulty band. If a skill can't meet this, it's either reclassified as a Fact skill or its generator is expanded. Alphabet "next letter" (78 fingerprints) is therefore a Fact skill, and letter codes (about 9k fingerprints) are Procedural.

### 6.4 Assessment reserves can't run out

- **Boss attempts are limited to 3 a day.** Each takes about 16–20 questions.
- **Per realm, each zone's reserve must cover at least 3× the expected assessment demand:**
  - **Number and Shape:** generated assessment partitions, effectively unlimited.
  - **Code:** a partition, plus at least 300 reserved word-reasoning items.
  - **Word:** at least 80 grammar items, at least 8 short passages, plus delayed-recall spelling and vocabulary.
- **Fallback if a reserve is ever exhausted:** delayed-recall items plus transfer items made from the generators. The dashboard notes "assessment used review items". The boss stays valid and is never blocked.
- **Trials (Year 5)** have their own blueprint reserves, sized the same way.

### 6.5 Reading library, story and allowances (approved)

- **About 150 episodes** (≈1 a week, 2 in holidays), about 60 short passages a term, plus classics, fact files and poems.
- Allowances: spelling 4 a day (at most 15 a week), vocabulary 5 a day (at most 20 a week), grammar 10 a day, passages 2 a day. Catch-up is at most 2× after a missed week.
- **Misconception-aware feedback:** a worked explanation for the specific misconception, a matched follow-up 1–3 questions later, and a recheck the next day.
- Per-word pronunciation overrides. Pre-recorded audio is optional later.

---

## 7. Mastery engine v2 (approved, with measures clarified)

**Stages:**
1. Introduced.
2. Practising (3 correct).
3. **Accurate:**
   - Procedural and authored skills: ≥85% on the last 8 *first exposures* at the target band.
   - Fact skills: ≥90% over a spread covering ≥80% of the fact set.
4. **Applied:** ≥3 transfer items correct across ≥2 mechanics.
5. **Retained:** correct after a gap of ≥3 days and again after ≥7 days.
6. **Mastered:** ≥28 days after first reaching Accurate, a pass after a gap of ≥21 days, and Applied. Fact skills also need fluency (median ≤3 s, or ≤5 s on the "relaxed" setting) on direct-answer formats.

A failed 30/60/90-day review moves the skill to **Needs Refresh**. Seals already earned are kept.

**Other rules:**
- Rapid guesses give no evidence and no Learning Value. Three in a row trigger a friendly "slow down" pause.
- Hinted retries aren't first tries.
- Read-aloud never counts against him.

**Boss readiness:**
- All zone skills at Accurate or better.
- ≥70% of zone skills at Applied or better.
- Core skills Retained at least once.

**The boss fight:** questions come from the **assessment partitions and reserves** (§6.4) plus transfer items. Pass at ≥80% first try. At most 3 graded attempts a day. Dodging can never lose the fight.

---

## 8. Rewards, collection and economy

### 8.1 Learning Value and currencies (approved)

**LV per answer:**

| Answer | LV |
|---|---|
| New, frontier, due-review or unseen item | 1.0 |
| Transfer item | 1.2 |
| Fluency personal best | 0.5 |
| Correct after a hint | 0.4 |
| Seen before, or mastered and not due | 0.2 |
| Wrong but engaged | 0.2 |
| Rapid guess | 0 |

Badges (NEW!, Review, Tricky!, Effort) make the amounts understandable to him.

**Coins** = 10 per LV, multiplied by boosts, with a **daily taper:** 100% up to 100 LV, 50% up to 200, then 25% ("your pets are napping"). XP follows the same taper.

**Gems** come only from:
- stage promotions;
- bosses;
- the first perfect run per portal per day;
- the Daily Learning Goal chest;
- weekly chains;
- achievements;
- parent reward codes.

**Mastery Seals** come from skills reaching Mastered and from boss victories (1, 2 or 3).

**Learning Points** are lifetime LV. **Brain Fuel** is LV, stored per iPad, and is never earned while idle.

**Removed:** login and playtime gifts, hub coin pickups, hidden currency codes, losable streaks.

**Medals vs ranks:**
- **Run medals** (fun): Bronze for finishing, Silver ≥80%, Gold ≥95%, Perfect Crown 100%.
- **Portal ranks I–V** (learning): from the skill stages, with V (Diamond) when all are Mastered.

### 8.2 Rarity vs tier (approved)

- **Rarity belongs to the species and never changes:** Common, Uncommon, Rare, Epic, Ultra Rare, Legendary, Godly, BERSERK.
- **Evolution tier belongs to a pet stack and rises by merging 3:** Normal → Bronze → Silver → Gold → Platinum → Diamond → Galactic → Cosmic → Celestial → Omniversal, with multipliers 1, 1.5, 2.2, 3.2, 4.5, 6.5, 9, 13, 18 and 25.

### 8.3 Pets, merging and caps (approved; mechanics clarified in §10.3)

- **The 26 approved species:** 21 from eggs plus 5 Guardians. About 6–8 new species per realm, plus event pets.
- **Equip slots:** 3, rising to 8.
- **Merging:** 3 of a kind always merge, one step per tap. Named pets are protected.
- **Mastery Seals for the top merges:** Galactic 1, Cosmic 2, Celestial 3, Omniversal 5.
- **Realm tier caps:** Y3 Platinum, Y4 Galactic, Y5 Celestial, summer 2029 Omniversal.
- **Guardians:** non-mergeable and upgraded in place to cap −2, −1, then the cap. The Omniversal Guardian comes from the final boss with ≥80% of skills Mastered.
- **Targets** (median best pet at end of Y3 / Y4 / Y5):
  - Casual: Gold / Diamond / Cosmic.
  - Regular and Heavy: Platinum / Galactic / Celestial.
  - Heavy is never more than 1 tier above casual.
  - The last 10% of the collection is mastery-only.

### 8.4 Eggs and shared guarantees (redesigned)

**Each egg type has one shared, numbered sequence per profile** (egg #1, #2, #3…).
- The outcome of egg #k is a **pure function of (profile seed, egg type, k)**, so both iPads, and the server, compute the same result.
- Guarantees are **properties of the sequence itself:**
  - every aligned block of 12 egg numbers contains at least one Rare-or-better;
  - every aligned block of 150 contains at least one Legendary-or-better.
- They therefore hold for the profile **whichever iPad hatches**.

**How numbers are handed out (Revision 3.1: hatching needs internet; no leases):**
- Each hatch is **one atomic server transaction:**
  1. take the next egg number for that egg type;
  2. charge the coins;
  3. compute the outcome;
  4. add the pet;
  5. record it under an idempotency key.
- **No number is ever issued twice.**

**Why it can't be gamed:**
- Switching iPads, restoring a backup or reinstalling can't reset or reroll anything, because outcomes are fixed per number and numbers are issued once.
- **Luck** (from pet boosts) only affects an optional **tier-bump** roll for that number. The server computes the luck itself from the equipped pets stored on the server.

**Odds and limits:**
- Displayed odds are those of the sequence.
- **At most 5 hatches a day per profile,** enforced by the server.
- No near-miss animations.
- The parent can switch eggs to choose-a-pet vouchers.

### 8.5 Treadmills, speed and rebirth (approved)

- **Tiers:** Rusty Rollers → … → Infinity Loop.
- **Unlocks:** Learning Points plus realm gates (tiers 1–3 in Y3, 4–5 in Y4, 6–8 in Y5, 9–10 in summer 2029). The top tiers also cost Seals.
- **Training:** Brain Fuel only, no idle gains.
- **Speed:** capped movement curve (at most ×1.5), never needed for learning.
- **Rebirth:** at most 2 per realm.

### 8.6 Gear, abilities, achievements and events (approved)

- **Gear:** 6 slots, rarity, +1 to +5 upgrades (top levels need Seals), set bonuses. Boss *loot* only, never damage.
- **Abilities:** Double Jump, Triple Jump, Dash, Glide, Super Jump, Coils, Magnet, Teleport, boss-only Shield and Slow-Mo. They open optional areas only.
- **Quests:** 3 daily (at least 2 learning, 1 review) and weekly chains.
- **Achievements, titles, Hall of Legends.**
- **Monthly and seasonal events,** with no fear-of-missing-out: event pets return in a later year.
- **Launch quantities** are set in §14.

---

## 9. Live content and the production workload

### 9.1 Cadence (approved)

| Cadence | What changes |
|---|---|
| **Daily** | Generated: quests, daily dungeon, tower, Bolt's Mix |
| **Weekly** | Generated: chain structure and challenge seed. Authored: 1–2 episodes unlock from the term pack |
| **Monthly** | An authored event pack, prepared in a batch each term |
| **Seasonal** | Skins and collectibles, prepared once a year |
| **Termly** | Major realm update |

Content, recipes and themes are data. CI validates, GitHub Pages deploys, and the iPads update all at once.

### 9.2 Workload, quantified

**Per term (×10 terms):**

| Workstream | Output | My development sessions* | Parent time |
|---|---|---|---|
| Story episodes | 15 episodes (~12k words) + ~250 questions (2 sets) | 1.5 | Spot-check 3 episodes (~30 min) |
| Short passages | 60 (~7k words) + ~180 questions | 1 | — |
| Banks | 150 vocabulary, 100 spelling (sentences, misspellings), 250 grammar, 25 word-problem templates, 40 word-reasoning lists (thousands of generated, checked items), assessment reserves | 1.5 | Spot-check 30 items (~20 min) |
| Mechanics | 1–2 new (code, tests, solvability bot) | 1–2 | — |
| Realm pack | Theme kit, 16 portal configs, 5 bosses, 8–12 recipes (×3 variants), 6–8 pets, a gear set, 3 monthly event packs | 2 | — |
| QA and release | Simulations, budgets, fixes | 0.5–1 | Real-iPad gate on both iPads (~1 h) |
| **Total per term** | | **≈ 7.5–9 sessions** | **≈ 2–2.5 hours** |

\*A "session" is one focused Claude Code working session of a few hours, started by you.

**Over 3 years:**
- **Release 1:** about 15–20 sessions.
- **Ongoing:** about 75–90 sessions (~2–3 a month).
- **Output:** about 150 episodes (~120k words), about 600 short passages (~70k words), about 1,500 vocabulary entries, about 1,000 spelling words, about 2,500 grammar items, about 250 word-problem templates, about 25 mechanics, about 110 recipes, about 70 pets and about 50 bosses.

**Keeping it sustainable:**
1. **Work one term ahead,** with a buffer. Each pack is due at least 4 weeks before its term.
2. **A "minimum viable term" fallback** if time is short: generated skills plus 8 episodes plus the core banks. Legend modes, tower and adventures carry variety, and story episodes can be finished mid-term.
3. **Reuse through parameters:** bosses are a parts spec plus an attack set plus a phase script; pets are about 30-line specs; recipes reuse mechanics.
4. **Monthly events batched** in each term's pack.
5. **Automated validation** keeps checking cheap. Parent spot-checks are optional, and flagged items are fixed in the next release.
6. **An optional reminder routine** six weeks before each term to start the update session (set up with your permission).

---

## 10. Data, sync and accounts (redesigned)

### 10.1 Three kinds of data, three rules

| Kind | Examples | Where it's authoritative | Offline behaviour |
|---|---|---|---|
| **Learning (additive)** | Run attempts, play minutes, speed gains, reading progress, reports | **Append-only op log**, merged by order-independent rules | Fully offline; can't conflict |
| **Economy (conserved)** | Coins, gems, Seals, pets, eggs, unlocks, upgrades, once-per-profile rewards | **Server ledger** (Supabase Postgres functions: atomic, idempotent, enforcing non-negative balances) | Limited by device escrow (§10.3); some actions **need internet** |
| **Settings (parent-owned)** | Limits, focus topics, egg mode, maximum lead | **Server settings table, writable only by parents** | iPads use the last synced copy |

### 10.2 Learning op log (from Revision 2)

- Ops are keyed `(profile_id, device_id, n)`, where `n` is the iPad's own gap-free counter. The op and counter are written in one IndexedDB transaction.
- **Pull:** for each device, `n > cursor`. Push ignores duplicates. Keyset pagination of 1,000 rows (the Supabase API's default maximum).
- Each skill's state is rebuilt from its attempts in (t, device, n) order. Late arrivals rebuild only the skills they touch.
- **Clock:** offset taken from the server time on every sync; future-dated ops are flagged.
- **Learning rewards** (coins from each answer) are calculated **once**, on the iPad that earned them, and recorded in the run op.
- **Equip:** latest change wins. If the equipped stack no longer exists, it falls back to the best remaining pet of that species, with a toast: "Your Ember Fox evolved on the other iPad!"

### 10.3 Economy (simplified in Revision 3.1; full detail in §19.1)

There is no debt and there are no silent changes.

- **The server ledger is the only authority** for coins, gems, Seals, pets, egg sequences, unlocks and claimed rewards.
- **Every spend is an online, atomic, idempotent server transaction:** hatching, merging, buying and upgrading gear and abilities, treadmill tiers, rebirth, gem and Seal spends.
- **Earning works fully offline.** Coins and other per-answer rewards are recorded in learning ops and credited once on sync.
- **No Backpack, no pocket pets, no egg leases.**
- **What he sees:** coins = Bank balance + "+N coming" (earned on this iPad, not yet synced). Shop, Hatchery and Fusion show a friendly "Connect to Wi-Fi" badge when offline.

**Once-per-profile rewards** (boss first-defeat, Guardians, daily-goal chest, daily dungeon chest, quest chests, stage-promotion gems, Seals):
- Earned offline, they appear as **"Ready! Opens when you're online"** chests.
- Opening calls a server claim keyed by the reward ID. The first claim wins; a second iPad sees "Already opened on the other iPad".
- **A reward is never shown as opened and then taken back.**

**Trade-off, accepted by the parent:** spending needs internet. In return there is **no negative balance, no duplicated purchase and no inventory changing behind his back**, and there are far fewer moving parts.

### 10.4 Accounts and permissions

- **Parent accounts:**
  - Email + password, with email verification and password reset through a **custom email sender** configured in Supabase Auth. The simplest option is the parent's Gmail with an app password; Brevo or Resend also work.
  - **No Supabase project membership is needed.**
  - Both parents sign up during setup; the owner creates the profile and the second parent joins with a one-time code.
  - Then **public sign-ups are switched off**.
- **Device accounts:**
  - Each iPad gets its **own restricted account**, created by a parent-only server function, `pair-device` (a Supabase Edge Function).
  - The function's admin key lives only in Supabase's server environment, never in the app or the repo.
  - The iPad signs in with that device account. The session persists, so **Freddie never logs in**.
  - The device's credentials are stored on the iPad so it can quietly re-sign-in if a refresh is lost.
- **Permissions, enforced on the server (row-level rules plus role checks inside every function):**
  - **Device role:** read the profile; add its own learning ops; call gameplay functions (purchase, hatch, lease, merge, claim, settle).
  - **Parent role:** change settings; create reward codes; pair or revoke devices; invite a parent; re-grant reserves; export or delete data.
  - A device token **can't** perform parent actions, whatever the PIN.
- **On the iPad:**
  - **Changing anything requires a parent sign-in** (step-up). That session is kept in memory only and signs out after 10 minutes.
  - The **PIN** opens the read-only dashboard and allows a **small time extension, capped per day by a parent setting that the server enforces**.
  - **Parents' phones** can stay signed in to a dashboard-only view (after Release 1).
- **Device revocation** removes access immediately.
- **Audit log:** every parent action is recorded.

### 10.5 Snapshots and restore performance

**Validated snapshots:**
- **What a snapshot holds:** learning state per skill (stage, milestone timestamps, counters, the last 60 attempts), item spaced-repetition states, daily history totals, and the **frontier** it covers (per-device `n`).
- **Who makes it:** a **fully synced** iPad, weekly or every 2,000 new attempts.
- **Format and storage:** canonical JSON with a SHA-256 hash, compressed (about 1–3 MB), stored in Supabase Storage (1 GB free). The last 8 are kept.
- **How it's verified:** when the other iPad reaches the same frontier, it computes its own hash.
  - Match → **verified**.
  - Mismatch → flagged in the dashboard, and a full rebuild from history is scheduled.
  - Each iPad also occasionally rebuilds a random sample of skills from full history and compares.
- **The economy isn't in snapshots.** It's read directly from the server ledger: a few hundred rows.

**Restore paths (heavy profile after 3 years; ~26k run ops, ~30 MB of history):**

| Path | Steps | Target on an older iPad (A12, iPadOS 17) at about 5–10 Mbps |
|---|---|---|
| **From a snapshot** (normal) | Latest verified snapshot + ledger state + ops since the snapshot (≤ 1 week) → bulk write in batches of 500 | **≤ 20 s to playable** |
| **Full history** (fallback or background) | 27+ pages of 1,000 rows by keyset, 3 parallel streams, compressed, resumable per page; parse and store in yielding batches; rebuild per-skill state (~175–400k attempts) | **≤ 2 min, in the background.** He can play straight away from the snapshot. A progress bar shows the status. |

- **On each iPad (Revision 3.1):** the **complete learning log from all devices**, never pruned (worst case about 60 MB over 3 years), plus snapshots and a cached copy of the server economy state. Each iPad is a genuine full replica. The cloud keeps everything too.
- **Storage:** about 60 MB in the database plus about 24 MB of snapshots, within the free plan.
- **The targets are release criteria,** measured on a synthetic 3-year dataset and on his real iPads.

### 10.6 Offline limitations (stated honestly)

- **Combined daily limit.**
  - Each iPad records play minutes per day.
  - The combined total is exact whenever both iPads have synced.
  - **If both iPads are used offline on the same day, each can only enforce the limit with what it knows.** Each iPad always enforces the full limit locally, so the worst case is up to 2× the limit on such a day.
  - That's unlikely, since he usually plays on only one iPad a day. The dashboard flags it after sync.
- **Taper and hatch cap.** These use the best-known daily totals while offline, so the same small overshoot can happen. It is never a debt.
- **No background sync on iPads.** The start screen and dashboard show each iPad's "last synced" time.
- **Supabase down or paused.** He plays on with Backpack, pocket and queued chests; online-only actions wait.
  - The dashboard says "Cloud asleep since …" with the steps to wake it.
  - An optional backup job every 3 days keeps the project active (a private repo with a read-only database role).

### 10.7 Backups and migration (approved)

- Each iPad is a full replica of learning data. Monthly export prompt; file import merges with no duplicates.
- **v1 import:** paste v1's backup code. v1 coins go into the **Bank** as a one-time keyed credit. v1 "mastered" becomes **Accurate (unverified)**, with a retention check due.
- **File-based fallback** if the cloud is ever unavailable for a long time: export and import learning ops, while economy actions are queued until a ledger is available.

---

## 11. Grown-ups dashboard v2 (approved, with additions)

### 1. Learning

- Skills learned, secure and mastered.
- **Accuracy on new questions** (procedural and authored) and **remembering after a break** (facts and reviews). Both show minimum sample sizes and confidence bands.
- Retention rate.
- Skills needing reinforcement, with their misconceptions.
- Expected vs actual progress.
- Boss results, plus a note if an assessment used review items.
- Improvement over time.

### 2. Time

- Daily and weekly time combined across iPads, split into learning and play.
- Sessions and breaks.
- Same-day-offline overshoot flags.

### 3. Settings (parent sign-in required to change)

- Daily limit, session cap, breaks.
- Difficulty and timers, maximum lead.
- Focus topics.
- Hatches a day, egg mode, Backpack reserve, PIN extension cap.
- Daily goal, keyboard layout, read-aloud.
- Reward codes.

### 4. Devices and data

- Per-iPad sync status, last sync and clock warnings.
- Snapshot verification status.
- Backup and restore.
- Pair or revoke devices.
- Re-grant a lost Backpack.
- Content issue reports.

---

## 12. Architecture (updated)

```
src/
  game.js (M)        shell: async go(), fixed 60 Hz step, grant() (only place boosts apply), run pipeline, events
  core/              events  registry  perf  test-hooks
  data/  (N)         db (IndexedDB)  ops (learning log, device counter, clock offset)  reduce (order-independent learning
                     rules, equip LWW)  sync (push/pull, keyset paging, status)  ledger-client (Bank/Backpack/pocket/leases,
                     offline queue, settle)  snapshot (build, hash, verify, restore)  auth (device session, parent step-up)
                     backup (gzip export/import)  import-v1
  learning/ (M)      skills/  question (v2, fingerprint, item class)  mastery (stages)  scheduler (classes, allowances,
                     freshness, assessment partitions/reserves, catch-up)  misconceptions  calendar  gen/  banks/
  content/  (N)      realms/y3-aut/{realm, portals, banks/, passages/, recipes/, story, bosses}  shared/{wordlist, dictionary}
  mechanics/ (N)     choice-path construct collect-sort chase climb type-floor logic-lock mine pattern-plates read-seek
                     boss-arena
  adventure/ (N)     mission  recipes (signatures, variants)  select (LRU + H1–H4)  assemble  validate (reachability, bot)  tower
  play/ (N)          room (extends World)  question-source  run  answer/ (pads cards keypad keyboard3d answer-bar plank-picker)
  economy/ (N)       constants  learning-value  rarity  tiers  pets  egg-sequence (pure outcome function + guarantees)
                     seals  boosts  gear  abilities  treadmills  achievements  quests  events   (shared with tests and sims)
  engine/ (M)        player (fixed step, abilities, clamp, hurt)  fx (instanced)  batch  models  pets3d  hazards  nvr-draw  kit
  worlds/ (M)        hub → Blox City   realm (data-driven)
  ui/ (M)            results pets hatch realm-map quests achievements gym sync-status backpack parent/
vendor/              three · supabase-js UMD (offline)
supabase/            migrations/ (tables, RLS, ledger functions: purchase, hatch_lease, settle, merge, claim_reward, regrant;
                     settings; audit; read-only backup role)  functions/pair-device  catalog seed generated from economy/
                     constants in CI (one source of prices)  SETUP.md
tools/sim/           learner model · session simulator · adventure capacity · economy · restore benchmark
tests/               unit · sim · sync · ledger · rls · adventure · e2e
```

**Layering:**
- `learning/`, `economy/`, `data/` (logic), `adventure/` (logic) and `content/` are pure.
- `learning/` never imports `economy/`.
- `Game.answer()` is the only path to mastery.
- The economy rules live in **one JS source**. The server functions use a **catalogue table generated from it in CI**, so prices and caps are never hand-copied. The egg-outcome function is pure JS; the server only issues egg numbers and checks recorded claims.

---

## 13. Hosting and deployment

- **GitHub repo `blox-legends`**: code and content only. The Supabase URL and publishable key are safe to include.
- **GitHub Pages** hosting.
- **CI:** unit, ledger, RLS, sync, adventure and content tests on every push; simulations nightly and on content changes. On release, migrations and the Edge Function are deployed using a Supabase access token stored as a GitHub secret. Pasting the SQL manually remains a fallback.
- **Supabase setup** (`SETUP.md`):
  1. Free project in the London region.
  2. Custom email sender.
  3. Both parents sign up; create the profile.
  4. Switch sign-ups off.
  5. Pair both iPads.
  6. Optional private backup repo with a read-only role.
- **The Claude preview page** remains a demo only.

---

## 14. Releases and release criteria

**Christmas 2026 is a provisional target.**

| Release | Scope | Must pass before release |
|---|---|---|
| **R0 "Safe Harbour"** | GitHub Pages hosting, IndexedDB ops, v1 import, backup export/import, versioned updates, fixed physics. Today's gameplay. | v1 import on his real iPad(s) matches coins, cosmetics and learning-record counts exactly; backup round trip on an iPad; 7 days offline with no data loss; obby beatable at 30 and 60 fps; update with no mixed versions; all tests green |
| **R0.6 "Two iPads"** | Parent and device accounts, pairing, learning sync, **ledger with Bank, Backpack, pocket and egg leases**, once-per-profile claims, snapshots, restore, dashboard sync panel | 10k-case convergence tests; ledger tests (never negative, idempotent, concurrent purchases, offline settle always passes); RLS and role tests (device can't do parent actions); **two-iPad field test** of the offline/online scenario list; restore ≤ 20 s from a snapshot and ≤ 2 min full on an older iPad with the 3-year synthetic dataset |
| **R0.8 "Learning Core"** | Skills, question v2 with fingerprints and item classes, mastery stages, scheduler, misconceptions, content validation; obby, vault and lab ported to mechanics | 100% answer checkers; capacity rule for every procedural skill; mastery sims (memorisation resistance, delayed recall, readiness); reserve-size checks |
| **R0.9 "Autumn Woods Playable"** | **10 mechanics**, 16 portals, Bolt's Mix, 4 zone bosses + Autumn Titan, episodes 1–8 + extracts, all Y3 Autumn banks and reserves, Realm world + Term Tracker; basic coins and eggs | Content validation 100%; every portal played on a real iPad; boss assessment drawn only from partitions and reserves; session sim (0 stalls, caps respected) |
| **R1.0 "Autumn Woods Complete"** (first major release) | Adventure Engine (30 recipes × ≥3 variants, 4 objectives, 8 twists, 3 themes), Escape Room / Bridge Quest / Treasure Hunt, daily dungeon, **Tower v1**; full core economy (LV and taper, gems, Seals, 26 pets, shared-sequence eggs, merging with caps, Guardians); treadmill tiers 1–3 + Brain Fuel; abilities (double jump, dash, glide, magnet); daily quests + weekly chain; **~40 achievements**; **starter gear (~12 items)**; Blox City hub; dashboard v2 | **Adventure capacity sim** on the real catalogue (§5.5); **whole-session sim** (§16: 0 stalls; ≥3 activity types, ≥5 mechanics and ≥3 subjects per 60-minute session; ≤250 questions a day; 30–45% non-question time); economy sims (targets and caps, Gamer ≤40%); draw-call budgets and a 2-hour soak on real iPads; **full real-iPad gate on both iPads**; no open data-safety or correctness bugs |
| **R1.x** (incremental) | More achievements (to ~120), more gear and sets, cosmetics, **rebirth**, monthly events and seasonal skins, Legend Mode/Remix/Echo, phone dashboard, more mechanics and adventure types | Per-feature tests + real-iPad check |
| **Termly packs** (Frost Peaks first) | Realm content, mechanics, recipes, pets, bosses | Content validation; capacity and session sims with the new content; reserve sizes; real-iPad gate; **≥4 weeks before the term** (Frost Peaks: as soon as possible after R1.0, while R0.9's Autumn Woods covers January) |

**Provisional timing:**
- R0 and R0.6 within roughly the first 3–4 weeks after setup.
- **R0.9 targeted for Christmas 2026.**
- **R1.0 in early 2027.**
- Frost Peaks follows R1.0.

The order protects his progress and the two-iPad setup first, then learning content, then the wider game.

---

## 15. Implementation order and dependencies

1. **S0 (parent and me):** GitHub repo and app access; Supabase project; custom email sender; push v1; Pages; CI; e2e baseline → R0 prep.
2. **S1 Data safety:** IndexedDB ops, v1 import, backup, versioned service worker, fixed physics → **R0**.
3. **S2 Accounts and ledger:** schema, RLS, ledger functions, `pair-device`, parent step-up, Bank/Backpack/pocket/leases, claims, learning sync, snapshots, restore, sync status → **R0.6**. *(Needs S1 and Supabase.)*
4. **S3 Learning core:** skills, fingerprints, item classes, mastery, scheduler, assessment partitions, content validation, calendar → **R0.8**. *(Needs S1; can run in parallel with S2.)*
5. **S4 Mechanics:** the 10 mechanics + Boss Arena; port obby, vault and lab first. *(Needs S3.)*
6. **S5 Autumn Woods content and portals, plus bosses** → **R0.9**. *(Needs S3 and S4.)*
7. **S6 Adventure Engine and Tower;** capacity sim on the real catalogue. *(Needs S4.)*
8. **S7 Economy completion:** pets UI, merges, Guardians, treadmills, abilities, quests, achievements; economy sims. *(Needs S2 and S5.)*
9. **S8 Blox City, dashboard v2, performance, full sims, two-iPad gate** → **R1.0**.
10. **Then:** R1.x features and termly packs on a one-term-ahead cadence.

**Dependencies on you:**
- Repo plus app access.
- Supabase project and email sender.
- Both parents signing up.
- Both iPads available for pairing and the release gates.
- About 2–2.5 hours a term for spot-checks and testing.

---

## 16. Verification

- **Unit tests:**
  - Generators and answer checkers; non-verbal uniqueness; fingerprints stay stable when distractors shuffle.
  - **Capacity rule** per procedural skill; bank schemas; reserves ≥3× demand.
  - Mastery stages (facts vs procedural vs authored); calendar.
  - LV and taper; egg-sequence guarantees (every aligned 12- and 150-block); **boost isolation** (byte-identical mastery with and without boosts).
- **Ledger tests** against a local Postgres in CI:
  - Concurrent purchases from 2 devices never go below zero.
  - Idempotent retries.
  - Offline settles always pass for honest clients.
  - Lease atomicity: no egg number issued twice.
  - Claims granted once.
  - Re-grants parent-only.
  - Catalogue prices match `economy/constants`.
- **RLS and role tests:** the device role is denied every parent function and other profiles; anonymous requests are denied; a revoked device loses access immediately.
- **Sync tests:**
  - 10k-case property tests over 3 simulated devices with partitions and duplicates: learning state converges.
  - Equip fallback.
  - Clock skew.
  - Version skew.
  - Crash atomicity.
  - Snapshot hash agreement across devices; a mismatch triggers a rebuild.
  - Restore benchmark (synthetic 3-year heavy dataset; paging, resume after interruption, timing).
- **Simulations (`tools/sim`, 50 seeds):**
  - **Personas:** Casual, Regular, Heavy × slow, average, fast learners, plus a Gamer.
  - **Learner model:** learning curve, forgetting, memorisation bonus; devices alternate weekly, with 15% of sessions starting unsynced.
  - **Session simulator:** persona-driven 2-hour days built from the real activity menu, scheduler, allowances, boss readiness, freshness, adventure selection and caps. Asserts:
    - 0 stalls;
    - ≥3 activity types, ≥5 mechanics and ≥3 subjects per 60-minute session, and all 4 subjects per day;
    - ≤250 questions a day;
    - 30–45% non-question time.
    - It also reports question source mix and LV.
  - **Adventure capacity:** 96 and 56 rooms a day × 90 days (§5.5), then 3 years with termly growth.
  - **Educational freshness:**
    - no procedural fingerprint repeated within 90 days while the space allows;
    - bank days-to-exhaustion at allowances is longer than the term;
    - reserves never depleted at 3 attempts a day;
    - unseen accuracy isn't inflated by memorisation.
  - **Economy:** §8.3 targets and caps; Gamer ≤40% of an honest learner's coins per minute; offline Backpack use never blocks normal play.
- **End-to-end (Playwright, iPad-sized touch viewport):**
  - Each mechanic and portal; a boss.
  - Hatch and merge offline (pocket) and online.
  - Two browser contexts going offline/online: purchase, claim, egg-number behaviour.
  - Budgets; 2-hour memory soak.
- **Real-iPad gate (both iPads) for every release:**
  - New content played.
  - `?perf=1` frame rate, touch controls, read-aloud.
  - **Offline on one iPad, then online on the other** (the scenario list).
  - Restore timing on the older iPad.

---

## 17. Contradictions resolved in Revision 3

| Contradiction | Resolution |
|---|---|
| Launch mechanics 6 vs 10 vs 11 | **Exactly 10 mechanics plus Boss Arena** (§4); each portal is mapped to one |
| "Once every 3 days" recipe rule vs 2 hours a day | LRU plus H1–H4, with simulated evidence and a release criterion (§5) |
| Negative "repaying" balances | Bank/Backpack escrow; online-only list; queued chests; no debt (§10.3) |
| Per-iPad pity counters | One shared numbered egg sequence with leased blocks (§8.4) |
| Supabase team membership; PIN-only protection | Parent accounts with a custom email sender; restricted device accounts; server-enforced roles; parent step-up (§10.4) |
| 2–5 s restore of about 92k ops | Snapshot ≤20 s, full rebuild ≤2 min in the background (§10.5) |
| 90-day no-repeat vs fact fluency vs spaced review vs unseen boss items | Three item classes plus assessment partitions and reserves (§6.3–6.4) |
| Facts and reasoning sharing repetition rules | Separate rules and measures: delayed recall vs unseen accuracy (§6.3, §7, §11) |
| Combined daily limit while offline | Best-known totals; worst case 2× when both iPads are offline the same day; flagged afterwards (§10.6) |
| Tower 10 floors a day vs heavy play | 20 a day, drawn from the shared LRU pool (§5.7) |
| About 120 achievements and wide cosmetics at launch | About 40 achievements and starter gear in R1.0; the rest in R1.x (§14) |
| Christmas as a firm date | Provisional; R0.9 targeted for Christmas (§14) |

Earlier resolutions from Revision 2 still apply: medals vs ranks, Petdex of 260, rarity vs tier, no house building, base movement always sufficient, no boss damage boost, realm caps and Seals, PIN hashing.

---

## 18. Risks and trade-offs

- **Online-only shop actions** are the price of no debt and no duplicates. The Backpack, pocket merges and queued chests keep offline play rewarding.
- **Edge Function and ledger functions** add server code. It's kept small: a handful of atomic functions, prices generated from one source, and tests against a real Postgres in CI.
- **Supabase Free** pauses after 7 days idle and has no backups. Mitigated by iPad replicas, exports, the optional backup job (which also keeps it awake) and offline-first play. Pro is optional later.
- **Content authoring** (~120k words of fiction plus banks) is the largest ongoing cost. It's quantified in §9.2, worked one term ahead, and has a fallback.
- **Simulations prove capacity and correctness, not enjoyment.** Freddie's reactions after each release steer what gets expanded.
- **Release 1 is still substantial.** R0 and R0.6 ship first, so his progress and the two iPads are safe while the rest is built.

---

## 19. Revision 3.1: final technical decisions

### 19.1 Simplified economy (supersedes the Backpack, pocket pets and egg leases)

| Works offline | Needs internet (atomic server transaction) |
|---|---|
| All learning, portals, adventures, tower, bosses (assessment), story, treadmill training (Brain Fuel is per iPad), equipping, speed gains, quests progress, **earning** coins, XP and Learning Points | Egg hatching · pet merging · gear and ability purchases and upgrades · treadmill tier purchases · rebirth · any gem or Mastery Seal spend · opening once-per-profile reward chests |

- **One authority.** The server ledger (Postgres functions) holds balances, pet stacks (`count ≥ 0` constraint), egg sequences, unlocks, claimed reward keys, achievements and the server copy of equipped pets.
- **Idempotent transactions.** Every transaction carries a client-generated idempotency key (`tx_id`). A retry returns the original result and is never applied twice.
- **Earning offline.** Each learning run op records its reward (coins, XP, Learning Points), worked out once on the iPad. On sync, `credit_run(device_id, n)` credits it **once**, keyed by the op's `(device_id, n)`.
- **Once-per-profile rewards** (boss first-defeat, Guardians, daily-goal or dungeon or quest chests, stage gems, Seals) wait offline as "Ready! Opens when you're online" chests. `claim_reward(key)` grants each one once.
- **Hatching** is a single server transaction: take the next egg number, charge, compute the outcome, add the pet. The guarantees (Rare+ in every 12, Legendary+ in every 150) are properties of the shared sequence. The 5-a-day cap is enforced by the server. **No leases.**
- **Merging** is a single server transaction: −3 at tier t, +1 at tier t+1. Seals are checked, and the tier cap is enforced.
- **The child's view:**
  - Coins show the Bank balance plus "+N coming" for unsynced earnings.
  - A spend first syncs earnings, then calls the transaction.
  - Offline, the Shop, Hatchery and Fusion show "Connect to Wi-Fi to hatch/merge/buy".
  - Nothing is ever taken back, and no balance can go negative.
- **Removed:** Backpack, reserves, pocket pets, offline merges, egg leases and the lost-Backpack re-grant. Only the plain idempotent transaction log remains.

### 19.2 Recoverable saves and the backup format

**Replica rule:** every iPad stores the **complete** learning log from all devices (no pruning) **plus** the last-synced copy of the server economy state and settings.

**Backup file** (`.bloxbak`): gzip JSON, optionally encrypted with a parent passphrase (AES-GCM via WebCrypto).

| Section | Contents | Restores |
|---|---|---|
| `header` | Format version, app version, created, profile ID, source device, **op frontier** (per-device max `n`), **ledger version** (server transaction sequence and hash), SHA-256 of the payload | Integrity, identity, de-duplication |
| `learning` | **Every learning op** from every device: attempts with fingerprints, reward records, boss assessment results, reading progress, play minutes, speed gains, records, reports | Learning history, mastery, previously seen questions, spaced-review data, bosses (learning side), records, time history |
| `derived` | Mastery and spaced-repetition snapshot plus its hash (makes restoring faster; rebuilt from `learning` and checked) | Fast restore |
| `economy` | Balances (coins, gems, Seals), pet stacks by species and tier, Guardians, Petdex discoveries, egg sequence positions, unlocks (gear, abilities, treadmill tiers, upgrade levels, rebirths, cosmetics), **claimed reward keys**, achievements, and the full transaction log since the last snapshot | Pets and evolution, inventory, currencies, unlocks, achievements |
| `settings` | Parent settings (limits, focus topics, egg mode, maximum lead…) plus their version | Parent settings |
| `prefs` | Equipment and loadout, keyboard layout, read-aloud, Term Tracker overrides | Everything else that persists |

**Import rules (no duplication is possible):**
1. **Learning ops always merge by `(device_id, n)`.** Ops already present are ignored, so importing an old backup adds nothing twice.
2. **Run rewards are keyed by `(device_id, n)`.** An old backup can only credit runs that were **never** credited; that's real recovery of lost play, and never double credit.
3. **The economy section is never added onto an existing cloud profile.** The server ledger stays authoritative. Economy data from a backup is used only:
   - (a) to create a **brand-new, empty** cloud profile. `restore_profile_from_backup` is parent-only, refuses any profile that already has ledger rows, and records the backup ID so it can't be restored twice. Restoring claimed reward keys and egg sequence positions **prevents rewards being re-opened and eggs re-rolled**.
   - (b) in **Standalone mode**.
4. **Standalone mode** is the parent's explicit choice when the cloud is unavailable long-term, and it's how the game runs before cloud sync exists (R0):
   - **Exactly one** iPad is the economy authority, applying the same atomic rules locally.
   - Moving to another iPad, or back to a cloud, goes through a backup into an **empty** profile.
   - **There are never two economy authorities, so there's never a merge conflict.**
   - **Pre-cloud iPads joining the cloud** for the first time each contribute their standalone economy **once**, keyed `migrate:<deviceId>`: coins added together, pets and unlocks combined.
5. **Every import:**
   - shows a preview first ("Backup from 12 Jan 2027: 3,240 coins, 41 pets, 1,920 answers");
   - saves an automatic safety snapshot of the current state;
   - assigns a **new device ID**.
   - Validation: checksum, schema version, and refusal of unknown future versions.

**Independent of Supabase:** a backup on its own can rebuild the complete game in Standalone mode, with no server needed.

### 19.3 Authentication and data security

- **Revoked devices:** every RLS policy and every server function checks `memberships.revoked_at is null` **for the calling user on every request**. It doesn't rely on token claims, so revocation takes effect at once. The parent-only `revoke-device` function also calls the admin sign-out, so refresh tokens die. Access-token expiry is 1 hour.
- **Parent step-up never touches Freddie's session:**
  - A **separate Supabase client** with `persistSession:false`, an in-memory store, its own `storageKey` and no auto-refresh.
  - It's thrown away after the action, or after 10 minutes.
  - The device client and its stored session are never replaced. A test checks the device session is byte-identical before and after.
- **Trusting rewards calculated offline** (proportionate to a family game). The client is trusted, but the server enforces bounds in `credit_run`:
  - the device membership must be active;
  - idempotent by `(device_id, n)`;
  - op time no more than 10 minutes in the future and no more than 180 days old;
  - attempts must fit the run's duration (at least 2 seconds per question);
  - coins at most `questions × max per-question coins × max boost`;
  - a per-profile daily credit cap (above the taper's ceiling).
  - Anything out of bounds is **capped and recorded** as an anomaly on the dashboard, never silently dropped.
  - Unique rewards still go through `claim_reward`, with key uniqueness and daily caps.
- **Snapshots and backups:**
  - Snapshots live in a **private** Supabase Storage bucket at `profile/<id>/<device>/…`.
  - Policies: **read** = active members of that profile; **write** = an active device, to its own path only; **delete** = parents; **no public URLs**.
  - Backup files stay on the parent's device or iCloud, with an optional passphrase.
  - The optional GitHub backup job uses a **read-only** database role, encrypts with a passphrase stored as a GitHub secret, and writes to a **private** repo.
- **Secrets:** the publishable key only in the app. The admin key lives only in the Supabase Edge Function environment. No secret is ever in the repo or the browser.

### 19.4 Protecting the curriculum release schedule

- **Two release trains:**
  - **Curriculum** (realm content packs: skills and generators, banks, story episodes, portals on **existing** mechanics, bosses on the Boss Arena, assessment reserves).
  - **Game features** (new mechanics, adventure types, cosmetics, events, collection, achievements).
- **Content packs depend only on the Learning Core plus existing mechanics plus the realm and boss framework.** New mechanics are optional extras: if one isn't ready, its portal uses a fallback mechanic mapping, and optional systems stay behind feature flags.
- **Curriculum release criteria are educational only:** validation, capacity and reserves, and real-iPad play of the portals. None depend on adventure, economy or cosmetic features.
- **Schedule:**
  - Autumn Woods Playable (R0.9) is the platform target for Christmas (provisional).
  - **The Frost Peaks pack ships for the start of Spring term (≈5 Jan 2027) on the R0.9 platform, regardless of R1.0's status.**
  - The Sunny Shores pack ships by February half-term.
  - From then on, **≥4 weeks ahead of each term**, aiming for one term ahead.

---

## 20. First implementation phase (independently safe): S0 + S1 → R0 "Safe Harbour"

**Goal:** a hosted, offline-first version of today's game with a robust save foundation. **No cloud infrastructure** is deployed in this phase, and the live Claude preview is left untouched.

1. **Repository and hosting.**
   - Push the existing local repo to the parent's `blox-legends` GitHub repo. If it's still missing, keep committing locally and ask the parent to create it.
   - Add GitHub Actions CI (unit tests plus Playwright e2e) and a GitHub Pages deploy workflow.
2. **Protect v1 progress.**
   - The live preview stays unchanged; its existing backup code remains the export route.
   - The new app adds "Import progress from the old game" (paste the code), keyed `migrate:v1:<hash>` so it applies once.
   - On the same origin, the v1 localStorage save is migrated automatically and **left in place**.
3. **IndexedDB save foundation** (`src/data/`):
   - `db.js` provides stores `meta`, `ops`, `state` and `snapshots`.
   - `ops.js` is the append-only learning log: one op per run, holding the attempts and that run's reward record.
   - `store.js` keeps today's `Save` API for the game but persists to IndexedDB in **Standalone mode** (the local economy authority), with debounced writes plus immediate writes after runs and purchases.
   - Requests `navigator.storage.persist()`; falls back to localStorage with a warning.
   - Daily rolling local snapshots (keep 14).
4. **Manual backup and restore** (`src/data/backup.js`):
   - The `.bloxbak` format from §19.2 (gzip, SHA-256, optional passphrase).
   - Export through the iPad share sheet, with a download fallback.
   - Import with preview, safety snapshot, a **replace** restore in Standalone mode, learning-op merge and a new device ID.
   - Accessed from the grown-ups area.
5. **Physics and updates:**
   - A **fixed 60 Hz physics step** with interpolation for rendering.
   - A **versioned service worker:** `tools/precache.mjs` generates the manifest, and caches swap all at once. "Update ready" appears in the hub. A minimum data-format version is checked.
6. **Automated baseline testing:**
   - Existing unit tests, plus data-layer unit tests (an in-memory IndexedDB shim).
   - Playwright e2e covering boot, the portals, the save surviving a reload, the backup round trip, v1 import, offline reload through the service worker, and the obby beatable at 30 and 60 fps (fixed step).

**R0 exit criteria** (§14): everything above green; v1 import verified on his real iPad; backup round trip on an iPad; 7 days of offline use with no data loss.
