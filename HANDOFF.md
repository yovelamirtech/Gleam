# Handoff notes

Working notes for whichever agent picks this project up next, kept up to
date as work happens rather than written once at the end. `BUILD_PLAN.md`
is still the source of truth for what the app should be and tracks each
section's status inline (look for "**עדכון:**" / strikethrough); this file
is the shorter, task-oriented view: what's done, what's next, and anything
a fresh agent would otherwise have to rediscover the hard way.

## Done

Roughly in build order — see `README.md`'s "What is built" for the fuller
technical writeup of each:

1. **Board painting screen** — the whole core mechanic: tray swipe, strip
   drag/rotate/place, exact stone economy, pan/zoom, placement order kept
   for the replay. `src/game/`, `src/ui/`, `src/screens/BoardScreen.tsx`.
2. **Image prep script** (`tools/prep-images/`) — turns a source image into
   a level's 48 board JSON files plus a preview. 7 levels generated so far
   (`assets/levels/`): sample-lagoon, bicycletrex, lasertoaster, library,
   robocat, tacopenguin, view.
3. **Prepared-level artwork on the levels/boards walls** — `LevelsScreen`
   and `BoardsScreen` show each prepared level's real preview image
   (cropped per board); `src/game/levels/index.ts` is the levelId ->
   prepared-level registry `BoardRoute` reads from.
4. **Settings screen** — sound/music toggles (persisted only, no audio
   engine reads them yet), an about row, reset-progress. Gear icon on the
   levels and boards walls, not yet on the board screen itself.
5. **App icon** — generated from code, not drawn by hand: see
   `tools/app-icon/`. **Went through 3 designs** based on live feedback;
   the current one (a round faceted rhinestone, 12 trapezoid facets around
   a centre "table", shaded by the app's fixed top-left light source) is
   the one the user confirmed. See "Next up" below — the user wants the
   in-game stones restyled to match this, and hasn't asked for the icon
   itself to change again.
6. **Level-complete celebration** — `LevelCompleteScreen` +
   `src/game/levelReplay.ts`: zoom out to the whole picture, a one-off
   sparkle sweep, every stone vanishing newest-first then reappearing
   oldest-first. Triggered from `BoardRoute` the moment a board's
   completion finishes the *level*, not just that board. **Not checked on
   a real device** for feel or frame rate — only the merge/ordering logic
   (`__tests__/levelReplay.test.ts`) is covered. The plan's "light
   zoom-in" during the vanish step (BUILD_PLAN.md, step 3) isn't
   implemented — only vanish/reappear themselves are.

All of the above is on branch `claude/laughing-clarke-url4me`, in one
open PR (yovelamirtech/Gleam#8, currently draft). `npm run typecheck` and
`npm test` are both clean as of this file's last edit (167+ tests).

## Next up, in BUILD_PLAN.md order

1. **Opening screens** (מסכי פתיחה וניווט) — splash with the studio logo ->
   "Tap to Start" with the game's own symbol. **Blocked on the user**: they
   said they'll upload the studio logo file "later" (session where this
   file was written) — check with them before starting this, don't invent
   a placeholder logo. The game's own "Tap to Start" symbol can reuse the
   app-icon rhinestone (see `tools/app-icon/`) once the stone restyle below
   lands, so it doesn't visually contradict the in-game look.
2. **Restyle the in-game stones to match the icon** — the user's own
   words: *"תעדכן את איך נראות אבני המשחק למשהו יותר כמו בלוגו"* ("update
   how the game's stones look to something more like the logo"). Right now
   `src/ui/drawStone.ts` draws a stone as a rounded square with a linear
   gradient, one diagonal facet line and an oval highlight — the *first*
   icon design's language, which the user rejected for not looking enough
   like a real diamond-painting rhinestone (see `tools/app-icon/README.md`
   and the git history of `tools/app-icon/make-icons.mjs` for the two
   rejected designs and the accepted one). The icon now in
   `tools/app-icon/make-icons.mjs`'s `rhinestone()` function — a circle of
   12 trapezoid facets radiating from a small flat centre circle, each a
   flat shade (not a gradient) picked by that facet's angle against the
   fixed top-left light source — is the shape language to bring into
   `drawStone.ts`. The hard part isn't the geometry (it's the same
   angle-vs-light-source shading `rhinestone()` already does, just at
   board-cell scale) but performance: a board redraws up to 1600 stones
   per frame during a placement animation and `BoardCanvas.tsx` already
   notes stones are cheap only because they're baked into one Skia
   `Picture`; 12 polygons per stone instead of today's one rounded rect +
   one line + one oval is roughly 5-10x the draw calls per stone. Profile
   on a real device before assuming that's fine, and consider fewer wedges
   (6-8?) at cell scale, where the icon's 12 is overkill anyway once cells
   are ~24px. `LevelCompleteCanvas.tsx` deliberately draws flat colour
   *without* the stone treatment because gradients/facets don't read at
   that zoom (320x240 cells on one screen) — that reasoning doesn't change
   just because `drawStone.ts` gets restyled, so leave it alone.
3. **Onboarding overlay** — first-visit tap targets on the board screen,
   shown once (AsyncStorage flag), skippable. Nothing built yet.
4. **Ads & monetization** (AdMob banner + interstitial, one-time IAP to
   remove both) — nothing built yet. Needs its own research pass on
   current Expo-compatible libraries (`AGENTS.md`'s warning about Expo v57
   API drift applies especially here — training data may know an older,
   now-wrong integration path for AdMob under Expo).
5. **Sound and music** — click/row/board-complete sounds, background
   music, haptics on placement. `src/storage/settings.ts` already has the
   on/off flags from the settings screen; nothing plays yet. Look at how
   the sibling apps `yovelamirtech/letter-wheel` and
   `yovelamirtech/bullseye-words` wired `expo-audio` and `expo-haptics`
   (both used it, not the older `expo-av`) before building this from
   scratch — same "style reference, not code to copy verbatim" spirit as
   the settings screen.
6. **Dev tools** — auto-unlock everything, jump to a specific board,
   instant-complete, solution overlay, FPS counter, free look at the
   faux-3D style. All gated behind one clear flag/menu per the plan so
   they're easy to strip before release. Nothing built yet.
7. **More source images for levels 8-20** — `LEVEL_COUNT` is 20
   (`src/constants/board.ts`), only 7 levels are prepared. The user
   provides source images; run `tools/prep-images` on them the same way
   PR #6 did.

## Things worth knowing that aren't obvious from the code alone

- **Two different "Placement" types exist** and it's easy to grab the
  wrong one: `src/game/types.ts`'s `Placement` (`{cell, color, order, at}`,
  used by `BoardSession`/`game/persistence.ts`, the *real* per-board
  progress store) vs. `src/storage/progress.ts`'s `Placement`
  (`{cell, colorIndex, order}`, no timestamp) inside `BoardProgress.placements`
  on the levels-wall `Progress` structure — that field is **always empty**
  (`markBoardCompleted` only ever carries over whatever was already there,
  which is nothing); it's dead/unused right now. If a future feature wants
  "what did this board look like" from the walls' own store, it isn't
  there — go through `game/persistence.ts` by board id string instead,
  the way `src/game/levelReplay.ts` does.
- **Cross-promotion links were explicitly rejected** — BUILD_PLAN.md
  originally asked for a "more games" section linking the studio's other
  titles in Settings. The user said no, they don't want that in the app at
  all; the two sibling repos were style reference only. Don't re-add it
  without being asked again.
- **The app icon took 3 rounds** to get right — don't be surprised if the
  in-game stone restyle (item 2 above) also needs a couple of passes
  against real screenshots/feedback rather than getting it right blind
  from a text description.
- **Nothing here has been run on a real device or simulator** this whole
  session (remote container, no attached device). Everything is verified
  by `npm run typecheck` + `npm test` + reading rendered PNGs for the icon.
  Anything animation- or performance-sensitive (the level-complete replay,
  and especially the stone restyle above) should get an actual on-device
  check before being called done.
