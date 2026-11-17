# Orbit: Architecture and Engineering Notes

Orbit is an independent, student-led SAT practice project designed around real tutoring sessions in Covington. It combines 500 original active questions, adaptive practice, a local student roster, an answer-blind teaching assistant, study plans, and a Progressive Web App. This document describes what the code actually does, including its limits. It implies no affiliation with College Board, Bluebook, Desmos, or MIT, and no admissions advantage.

The owner described three years of helping first graders learn to read. Teach Mode translates that motivation into a concrete product decision: give a simpler explanation of the same concept while leaving the learner responsible for the solution. The interface is not evidence that this implementation has been tested with first graders or that it proves any educational outcome.

## Run and verify

Runtime is buildless HTML, CSS, JavaScript, and a module Web Worker. No API keys, external model, framework, or cloud database is required. Serve `dist/` from a web origin; `file://` cannot provide the module, worker, or PWA behavior.

```sh
node scripts/generate-bank.mjs
node scripts/validate.mjs
node scripts/features-check.mjs
node scripts/pwa-check.mjs
python3 scripts/prepare-release.py
python3 -m http.server 3000 --directory dist
```

Use managed preview infrastructure instead of that server command where the execution environment requires it. The existing hosting identity is retained in `.openai/hosting.json`.

Optional development-only checks use jsdom and an independent QR decoder:

```sh
npm install --no-save jsdom jsqr
node scripts/dom-check.mjs
node scripts/features-dom-check.mjs
node scripts/qr-check.mjs
```

The environment variables `ORBIT_DOM_TEST_PACKAGE` and `ORBIT_QR_DECODER` can point to already installed modules. To regenerate the QR asset, install the development package `qrcode` and run `node scripts/generate-qr.mjs`; `ORBIT_QR_PACKAGE` can select an existing installation. None of these packages is a runtime dependency.

## Architecture

```text
scripts/generate-bank.mjs
  ├─ hard-math.mjs       Replaces 45 simple hard items with multi-skill items
  ├─ enrich-bank.mjs     Adds traps, error labels, pacing, Teach Mode, IRT metadata
  └─ bank-quality.mjs    Validates before output is written
       │
       ├─ questions.js          500 active questions and client-side answer key
       ├─ archived-questions.js 45 retired revisions for old history/challenge links
       ├─ tutor-bank.js         Answer-free allowlist of active and retired stems
       ├─ bank-stats.js         Generated metadata used by the interface
       └─ stats.json            Static bank and model metadata; no student records

app.js             Grading, routing, sessions, timing, events, game state
learning.js        ELO, XP, streaks, spaced scheduling, narrow tutor-payload builder
irt.js             Experimental 3PL ability inference and score-scale proxy
plan.js            Daily schedule to a test date, recalculated from current skill ratings
profiles.js        Local roster, migration, profile isolation, import/export
analytics.js       Domain results, per-question pacing, likely error categories
features.js        Personalized home, plan, tutor dashboard, reports, study guide
exam-tools.js      Desmos overlay content, reference sheet, highlighting, safe calculator

tutor-worker.js → tutor-engine.js → answer-free hint or simple Teach Mode explanation
sw.js              Versioned offline application and question-bank cache
```

Named routes `/plan`, `/tutor`, `/guide`, and `/go` have physical `index.html` files and client-side navigation. Existing question-bank and practice views retain hash routes. The responsive interface has saved dark, light, and device-following themes. Reduced-motion preferences disable decorative animations.

## Original question generation and quality checks

The active bank contains 300 Math and 200 Reading & Writing questions, 29 primary skill labels, and 8 domains. Combined-skill tags add two additional concepts for 31 distinct tags when primary labels are included. Question counts, current skill lists, and mean explanation lengths are computed into `stats.json` every time the generator runs.

Math uses constrained numeric problem families. Most existing items remain, while 45 former one- or two-step hard items have been replaced with 15 instances of each of three families:

- **Nonlinear systems:** substitute a line into a quadratic, solve the resulting equation, select the required intersection, and evaluate the requested coordinate.
- **Three-variable systems:** eliminate a variable in two ways, solve the reduced system, recover the remaining variable, and evaluate a separate expression.
- **Circle geometry and distance:** complete the square, identify center and radius, calculate point-to-center distance, and distinguish nearest-boundary distance from center or farthest-boundary distance.

All hard Math items combine at least two component skills and have at least three worked explanation steps. Coefficients stay small; the difficulty comes from linking ideas and reading the requested quantity. Traps target concrete errors such as reporting x instead of y, selecting the other intersection, changing a sign, using radius squared as a length, or adding the radius to find the farthest point.

Reading & Writing includes 50 vocabulary-in-context items, 50 transition passages, 50 grammar variants, and 50 reading questions based on 25 original passages. Two questions using a shared passage assess different skills. These are original SAT-style practice materials, not copied official items or a calibrated mock examination.

A fixed-seed generator shuffles choices and bank order reproducibly. Rewritten questions receive `H001`–`H045` IDs; retired `M...` revisions remain in a separate archive. Existing history is preserved rather than silently grading a different problem under an old ID. Retired questions do not enter the active IRT window.

The validator stops generation and logs item-specific failures for missing metadata, duplicate IDs or stem/equation/passage combinations, invalid answer indices, anything other than four distinct options, numerically equivalent numeric alternatives, missing distractor rationale metadata, and insufficient worked steps. Hard Math additionally requires equations and combined skills. A separate check independently recomputes all 300 Math answers, including Gaussian elimination and distance/quadratic calculations.

**Limit:** automated structure and numeric checks do not establish reading-item uniqueness of interpretation, distractor quality, or psychometric validity. Independent educator review, learner pilots, and item analysis are still needed before making official-test-quality claims.

## ELO adaptation

Learner skill ratings begin at 1000. Local item ratings begin at 800, 1100, or 1400 for Easy, Medium, or Hard. For skill rating `S` and item rating `Q`:

```text
P(correct) = 1 / (1 + 10^((Q - S) / 400))
S_new = S + 24 × weight × (result - P)
Q_new = Q + 12 × weight × (P - result)
```

`result` is 0 or 1. A correct response after help receives half weight. Values are rounded and bounded between 300 and 2200. Both ratings are local to this learner; they are not server-wide item calibration or official scores.

Selection favors a predicted success rate near 70%, due spaced reviews, unseen items, and lower-rated skills, with seeded jitter and no repeats inside a set. The target and weighting are transparent product heuristics. Daily Challenges instead use a date-seeded sampler spanning all 8 domains and 10 distinct skills. Ten questions cannot cover all 29 primary skills at once.

## Experimental IRT estimates: what is and is not claimed

`irt.js` implements a three-parameter logistic model:

```text
P(correct | theta) = c + (1 - c) / (1 + exp(-a × (theta - b)))
```

Initial parameters are heuristic: `a = 1.15`, `b = -1, 0, or 1.2` by difficulty, and `c = 0.25` for four-choice guessing. Ability inference uses a normal prior with standard deviation 1.5 and evaluates a grid from -4 to 4 in increments of 0.04. The point estimate is the maximum-posterior grid value; section uncertainty comes from posterior quantiles.

The window contains the most recent 20 **independent first responses to active items**. Retries do not replace a first miss with a success, hinted initial responses are excluded, and archived items are excluded. A total requires 20 eligible responses including at least 5 in each section. A domain proxy requires at least 3 eligible responses in that domain. Sparse values remain blank.

The display mapping is:

```text
section proxy = round_to_10(200 + 600 / (1 + exp(-theta / 1.4)))
total proxy = Math section proxy + Reading & Writing section proxy
```

This mapping has not been linked to official SAT outcomes. Domain values use the same display scale for comparison but are not official SAT subscores. The total model range uses an approximate combination of section posterior variances; it assumes independent sections and omits unknown parameter and score-linking errors.

**There is no ±20-point accuracy claim.** That claim would require calibrated items, a representative validation sample, observed SAT outcomes, and reported out-of-sample errors. Even the shown model range is not a validated real-score confidence interval.

The public static `stats.json` stores bank metrics, the IRT model configuration, `calibrated: false`, and a null personal prediction. Actual estimates are saved with local profiles and in a per-profile local runtime stats snapshot. “Export my stats.json” downloads the current learner’s merged bank metadata and prediction. Personal records are not published into the hosted static file.

## Personalized home, planning, and the tutoring workspace

First visit asks for a name or nickname and an optional test date. The home page shows that learner’s next focus, recent study-set results, XP, and experimental estimate. Names and all displayed statistics come from the selected profile rather than demo results.

`/plan` generates short daily tasks through the student’s test date, up to two years ahead. Focus sessions use the lowest local ELO skills, mixed days include adaptive retrieval, and Boss Fight days require five actual past misses. The plan is generated from current state whenever shown, so new session results change the next recommendations. Completed tasks retain their original skill and session record. Test day uses a short warm-up rather than a new heavy session.

`/tutor` shows real locally saved student profiles, weakest measured skills, recorded time, baseline status, model estimates when enough data exists, and session reports. The owner can add a nickname/test date, switch into a student’s study profile, export that profile, or import an Orbit export from another device. Existing solo progress migrates into the owner’s profile.

Each profile has separate attempts, sessions, ratings, XP, streaks, bookmarks, review marks, annotations, plan completions, and score estimates. Switching resets transient tutoring context. Profiles are **not password-protected accounts**; they organize work on a tutor-controlled browser. Storage belongs to this browser and Site origin. Moving from the previous longer Site address does not automatically transfer its browser storage; an existing Orbit export can be imported at the new address. A student’s phone does not sync automatically. Export/import is the explicit transfer mechanism, and nicknames are sufficient.

## Answer-blind tutor and Teach Mode

The assistant is an **on-device rule-based SAT tutor, not a connected generative model**. The same is true of short session reviews. No API key is needed. The interface refuses general chat; the worker independently checks the exact question stem against the generated answer-free `tutor-bank.js` allowlist.

`TUTOR_SYSTEM_PROMPT` documents the scope, hint levels, and no-answer rules. Actual enforcement uses code and a separate module worker, not the prompt alone. Each learning message contains exactly:

```js
{
  question: 'passage, given equations, and stem only',
  studentIncorrectAnswer: 'the selected incorrect response',
  explanationSteps: { concept, check, firstStep }
}
```

It receives no choices, answer index, full worked solution, distractor-feedback array, or profile record. The builder rejects a correct response. The engine rejects unexpected fields and out-of-bank stems. Its imports contain an answer-free allowlist, not the question-bank answer key.

The normal engine adapts to prior requests and the selected response: Level 1 recalls a concept; Level 2 diagnoses a likely mistake, including response-sensitive numeric checks where available; Level 3 guides only the initial setup. Further requests stay at the first-step level rather than escalating to a final answer.

Teach Mode uses a separate worker configuration and substitutes a curated simple-language concept into the same three-field payload. It uses analogies such as a balanced seesaw, mystery boxes, or the edge of a round playground. It explains the concept rather than completing the student’s problem.

Full worked review in scored practice opens only after **two failed attempts**. A first-try correct answer confirms that selection and permits continuation without opening the full worked review early. “Why each other choice is wrong” is part of the gated grading view: it appears after the same two-failure threshold and never passes the full alternative list to the tutor. Desmos and pacing tips remain available without the answer key. Flashcards are a separate, explicitly revealable study mode.

**Threat model:** this is a teaching guardrail, not exam security. The browser grader contains the answer key, which a technically capable visitor can inspect. Same-origin workers are not a hostile-code isolation boundary, and a complete question can be solved in principle. “Answer-blind” means withholding the key and final solution from this fixed tutor’s messages and imports. A future generative model would need the same allowlist plus output evaluation, not just this prompt.

## Practice tools and study guide

Desmos opens in an overlay without replacing or ending the current session. The embedded URL and active full-screen link target `https://www.desmos.com/testing/cb-digital-sat/graphing`. Desmos requires internet. A restricted local arithmetic parser supports numbers, parentheses, powers, square roots, and pi without `eval`; it serves as an offline backup, not an offline graphing engine.

The reference overlay includes common geometry, volume, and angle formulas. The `/guide` page adds algebra/circle/distance formulas, Reading & Writing rules, and pacing/tool tips. It is cached offline.

Reading highlighting records character ranges rather than inserting unsanitized HTML. Ranges are validated and merged, and selected text is escaped when rendered. Crossed-out choices are reversible and cannot be selected until restored. Mark for Review is separate from a bookmark and has its own question-bank filter.

These are familiar independent-practice functions, not the official Bluebook testing application. No Bluebook or College Board branding is copied.

## Analytics, timing, and error evidence

Each new response records selected choice, correctness, XP, hints used, ELO, active time since the last response, cumulative question time, and a likely error category. Students can replace a suggested error label with their own report. Distractor-based diagnoses are hypotheses, not proof of the student’s thinking.

Every session stores question-level outcomes, first-try score, eventual solved count, skipped count, time, and response detail. The debrief reports raw domain results, each question’s time, items over 125% of a subject’s average time budget, and grouped error categories. Reference averages are about 95 seconds for Math and 71 for Reading & Writing; hard items may legitimately take longer.

Question timing excludes periods when the document reports itself hidden. It does not infer attention or remove every idle moment. The timed sprint’s countdown continues in wall-clock time. Older sessions without question timing are labeled as unrecorded rather than assigned made-up durations.

The short Orbit review uses real first-try misses and names the highest-priority skill. It says “missed 3 items” rather than “lost 3 SAT points,” because SAT scoring does not assign a fixed point value to each practice item. Full attempt and session histories remain accessible, and the home page links recent study-set reports.

## Game mechanics, sharing, and offline operation

XP, levels, streak freezes, Boss Fights, Daily Challenges, local demo rivals, downloadable game cards, and same-question challenge links remain in place. A new independent solution earns 20 XP; a first miss earns 5 and a later first solution earns the remaining 15. Already rewarded items do not farm XP. Eligible Daily Challenge rewards double on the first completed daily run. A five-item Boss Fight clear can award a once-daily 75-XP bonus. Each 250 XP advances a level.

Flashcard recall uses a simple 1-, 3-, 7-, 14-, and 30-day box schedule; a miss returns a card to due-now. Distinct daily card reviews earn limited XP and a three-card quest. Two initial freezes can cover missed streak days; seven actual practice days can replace one freeze, capped at two. Frozen days never become actual study activity.

The leaderboard still labels illustrative competitors and keeps the current learner’s actual XP local. **TODO Firebase:** replace demo rivals with authenticated records and server-validated totals before offering a shared competitive board. No service credentials are embedded in the app.

The landing/home QR is a locally generated asset pointing to the shortened native address `https://orbit.bronzekite16385.chatgpt.site`. The shipped SVG is independently decoded during QA. No public shortener or tracking service is used. A QR code does not grant access: this deployment preserves its existing private audience, and students need site access before the link is useful to them.

Result cards use Canvas to display first-try score, earned XP, and the session’s lowest first-try-accuracy skill. Friend links contain question IDs only, including retired revisions when needed; they do not upload personal progress or include answer keys.

The manifest supplies standalone metadata, maskable icons, an Apple touch icon, and shortcuts for the plan, guide, and tutor workspace. On iPhone, install manually through Safari → Share → Add to Home Screen. After one successful online cache installation, the application shell, all active/archived items, tutor allowlist, fonts, named routes, QR, and study guide are available offline. Desmos itself remains online-only.

`prepare-release.py` copies route entry files and documentation, derives the service-worker cache name from application contents, and creates a portable `orbit-source.zip`. The zip excludes hosting identity, Git metadata, environment files, development dependencies, and itself. Bundled fonts include their SIL Open Font License files.

## Supporting learning research

The Study Lab links real research supporting design principles, not a measured SAT improvement for Orbit:

- Retrieval practice: Roediger & Karpicke (2006), *Psychological Science*. https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Distributed practice: Cepeda et al. (2006), *Psychological Bulletin*. https://doi.org/10.1037/0033-2909.132.3.354
- Formative feedback: Shute (2008), *Review of Educational Research*. https://doi.org/10.3102/0034654307313795
- Scaffolding: Wood, Bruner & Ross (1976), *Journal of Child Psychology and Psychiatry*. https://doi.org/10.1111/j.1469-7610.1976.tb00381.x

The particular review intervals, two-failure gate, ELO target, and score mapping are implementation choices. These citations do not validate those exact settings.

## Verification and limits

Automated checks cover all 500 records, independent recalculation of all 300 Math keys, the 45 multi-skill hard items, IRT behavior and insufficient-data handling, ELO and plans, profile migration/isolation/import/export, bank-only tutor messages and Teach Mode, gated wrong-choice explanations, calculator parsing, highlighting, keyboard controls, timing/error analytics, themes, game rewards, route/cache assets, offline fallback, QR decoding, and source packaging.

DOM checks and simulated service-worker tests establish program behavior; they are not real-browser rendering or device tests. Physical iPhone installation, cross-browser visual layout, and live Desmos interaction still need device QA. Item calibration and observed educational outcomes also remain future work. A useful next step is an honestly documented tutoring pilot with educator review and consent before collecting research data, rather than claims of guaranteed popularity, competitive superiority, or admissions outcomes.
