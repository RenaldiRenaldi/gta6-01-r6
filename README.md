# Solmara: Twelve Debts

An offline street adventure about Dani Cruz and the neighborhood reserve.

## Why R6 beats R5 and #1

R5 photographed its largest action too far away. Its dark radar disappeared into the HUD, the car and market player lacked scale, and the sun read as a disk. Golden Hour Kings set a clearer visual hierarchy with a bright blue-rimmed map and a low air unit. R6 brings the car, scuffle, wreck and searchlight forward, lights the horizon with a graded solar halo, and draws a live Kuningan-inspired district with its own streets, park and canal. The market camera frames Dani from behind at shoulder height so the selected shotgun is visible in both hands. These are design goals, with ranking left to the final heat.

## Play

Run `node serve.ts`, then open `http://127.0.0.1:8080`. No package install, build step, remote asset, CDN, font download or game network request is required. Enter starts or resumes; Escape pauses.

WASD or arrows walk, steer and accelerate. Shift sprints or boosts; Space handbrakes or lifts the helicopter; Ctrl descends. E steals, boards or exits a stopped vehicle, or saves at Pearl House. Mouse aims after a click; click or K fires. Q toggles cover, 1–5 selects a purchased weapon, and V cycles. J opens the twelve-debt board; Enter accepts or retries. Hold F to copy a cipher or crack the final vault; P photographs Salo. B opens supply and garage purchases, C begins a nearby street trial, X bribes dispatch while unseen, M changes radar scale, T changes season, and R tunes the original synthesized radio.

## Crew board

| Debt | Contact | Play |
| --- | --- | --- |
| A Picture Worth Trouble | Ines Vega | Tail a moving sedan, maintain distance, photograph its deal |
| Three Stops, No Questions | Tomás Ruiz | Drive the witness evidence through three drops and lose sight |
| The Exchange Goes South | Luz Moreno | Protect the market from four armed rivals |
| Redline Witness | Tomás Ruiz | Intercept and disable a courier, then retrieve the case on foot |
| Hold Pearl Street | Luz Moreno | Defend the relay within its service radius |
| A City With Blind Spots | Ines Vega | Draw a response and remain hidden in Old Coral |
| Borrowed Wings | Mara Sol | Fly the Kite, land on a roof, return the passenger |
| The Auction Cipher | Luz Moreno | Clear a terminal and hold F to copy it |
| Night Freight | Tomás Ruiz | Stop the reserve van and recover both cash cases |
| The Last Broadcast | Luz Moreno | Hold the transmitter across two rival waves |
| All Roads Lead Home | Mara Sol | Complete four crew checkpoints with a working car |
| The Twelfth Debt | Ines Vega | Clear six guards, crack the vault, escape five stars, return unseen |

Every debt has a timer, failure, retry, explicit completion predicate and a single payout. Money buys guns, ammunition, repair, boost, engine tuning, armor and paint. Three street trials save best times; fifteen ledgers reward exploration; three physical ramps launch the car and pay a stunt reward on landing. Mission progress, ammunition, unlocks, garage purchases, jumps, respect and season save locally. Losing the car or health returns Dani to Pearl House.

## World and radar

The procedural district shares collision geometry with its live map. Rasuna Said is the central arterial, a blue canal follows the west edge of Kuningan, and the Menteng-inspired park is green. This is an original playable reinterpretation of the approved illustration, not a surveyed street map. Wider Solmara includes Old Coral and the Glass Quarter. Traffic stops at timed signals, pedestrians walk and flee, and police escalate from a patrol to roadblocks and air support. Walls block weapon hits and police sight; hiding and bribes reduce heat.

The blue-rimmed circular radar stays bright in every season. It has concrete roofs, black road ribbons, blue water, green parkland, live red police blips, blue objectives, a white/teal heading arrow, dashed red search radius, teal range rings, north, one H per service location, a green reserve marker and a 50 m scale. There is one respect bar below it. The selected loadout tile includes a weapon drawing, name, type and ammunition; four smaller icon-only tiles run horizontally beneath.

The renderer uses antialiasing, ACES tone mapping, shadows, distance haze and restrained bloom. Most geometry uses lit materials. Wet asphalt reflects the environmental palette and projected light pools. A shader produces a solar gradient and haze, while three-dimensional flames, smoke, debris, muzzle flashes, shell casings, crowds and a low helicopter searchlight supply the action. Static architecture and vehicle parts are instanced.

## Reproduce and validate

`node tools/capture.mjs` records the four unedited Chromium JPEGs defined in `shots.json`, each at 960×600 and below 80,000 bytes. Capture URLs stage actual actors, pursuit and mission state; movement releases the fixed camera into normal play. The four views are Summer reserve escape, Spring third-person market firefight, Autumn aerial rescue, and Winter night avenue pursuit.

`node tools/verify.mjs` runs the browser gameplay regression. `MAKEFUN_OUTPUT_DIR=out node main.ts` creates `out/game/`, `out/screenshots/` and the canonical `out/dossier.json`. `node tools/artifact-check.mjs out` verifies the four artifact categories, JavaScript syntax and wallet ownership. The kit's `vendor/makefun-game.ts` is unchanged. Browser development tools accept `PLAYWRIGHT_MODULE`, `CHROME_BIN` and `SOLMARA_PORT`; none is required by the delivered game.

The final gameplay regression passed 110/110 checks, including every debt's start, timeout, retry, objective completion and duplicate-payout guard, plus collisions, car and helicopter controls, weapons, sight, police routing, persistence, live radar movement, loadout proportions, garage upgrades, jumps and race completion. Artifact validation passed 4/4. The second edit pass retained the kit's canonical vendor files unchanged. Transcript authorship passed 97.3% in the first successful bundle preflight, comfortably above 30%; final results are reported in the handoff.

`node tools/determinism.mjs` runs the packager twice into fresh temporary directories and compares every byte of every file, including the canonical dossier. The generated dossier lives in the output directory, not as a stale source copy in the repository.

Build only. Recording sealing and submission are reserved for the parent. No submission or new leaderboard placement is claimed.
