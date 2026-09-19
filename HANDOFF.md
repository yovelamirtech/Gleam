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
   the one the user confirmed.
6. **Level-complete celebration** — `LevelCompleteScreen` +
   `src/game/levelReplay.ts`: zoom out to the whole picture, a one-off
   sparkle sweep, every stone vanishing newest-first then reappearing
   oldest-first. Triggered from `BoardRoute` the moment a board's
   completion finishes the *level*, not just that board. **Not checked on
   a real device** for feel or frame rate — only the merge/ordering logic
   (`__tests__/levelReplay.test.ts`) is covered. The plan's "light
   zoom-in" during the vanish step (BUILD_PLAN.md, step 3) isn't
   implemented — only vanish/reappear themselves are.
7. **In-game stones restyled to match the icon** — `src/ui/drawStone.ts`
   now draws the same faceted-rhinestone shape as the app icon (8 wedges
   instead of the icon's 12, for cell-scale draw-call cost). Not profiled
   on a real device yet.
8. **Opening screens** — `SplashScreen` (the studio wordmark, then an
   auto-transition) and `TapToStartScreen` (the game's own icon, tap to
   enter the levels wall).
9. **Onboarding overlay** — `OnboardingOverlay`
   (`src/components/OnboardingOverlay.tsx`), wired into `BoardScreen`. Two
   steps, shown once ever (`gleam:onboarding:v1` in
   `src/storage/onboarding.ts`, not per board): the colour row, then the
   tray, each dimmed-around with a card above it and Skip/Next/Got it.
   `BoardScreen` measures both rows itself (`onLayout` on the wrapper
   `View`s around `ColorPicker`/`HudTray`, testIDs `color-picker-row` /
   `hud-tray-row`) so the overlay never needs hardcoded coordinates.
   `__tests__/onboarding.test.tsx` covers the sequence, skip, and the
   AsyncStorage flag persisting across a remount; nothing about it has
   been seen on an actual screen.
10. **Sound, music and haptics** — `expo-audio` + `expo-haptics`. A click
    on every placed stone, a chime on every finished board row, a fanfare
    on a finished board, a quiet looping ambient pad throughout, and a
    light haptic on every placement (haptics has no settings toggle - the
    plan lists none). `src/audio/useGameSounds.ts` (the three one-shots +
    haptic, gated by `settings.soundEnabled`) and
    `src/audio/BackgroundMusic.tsx` (the loop, gated by
    `settings.musicEnabled`, mounted once at the `App.tsx` root so it
    survives navigation). Both read from a new shared
    `SettingsProvider`/`useSettings` (`src/hooks/useSettings.tsx`) that
    replaces `SettingsScreen`'s old local `loadSettings()`/`saveSettings()`
    calls, so toggling a setting takes effect immediately everywhere
    instead of only on that screen's own state. "Row complete" didn't
    exist as a concept before this - `BoardSession.place()` now returns
    `completedRows: number[]` (`src/game/session.ts`), the board rows
    (of the 40-wide grid) that placement's cells just finished off; tested
    in `__tests__/session.test.ts`. **The four `assets/sounds/*.wav` files
    are placeholders**, not real sound design - synthesized directly in
    code by `tools/sound-gen/make-sounds.mjs` (a tick, two ascending
    chimes, a four-note fanfare, and a seamlessly-looping ambient pad; see
    that tool's README for how the loop avoids any click). Replace them
    with produced audio whenever it's ready; nothing else needs to change.
11. **Dev tools** — everything behind `DEV_TOOLS_ENABLED`
    (`src/constants/devTools.ts`, just React Native's own `__DEV__` - false
    in any release build, nothing to strip by hand). A central
    `DevToolsScreen` (a "Dev tools" row on `SettingsScreen`, shown only in
    dev): unlock every level/board (`unlockAll` in `src/storage/progress.ts`),
    jump straight to any level/board, reset progress, and an FPS overlay
    toggle (`src/components/FpsOverlay.tsx`, floats over every screen from
    the `App.tsx` root). Instant-complete
    (`BoardSession.completeInstantly()`) and the solution overlay (a new
    `showSolution` prop on `BoardCanvas`, a small colour swatch in every
    still-empty cell) live on `BoardScreen` itself instead - a small `🛠`
    button opens a panel with both, since they need a live board session.
    `DevStoneGalleryScreen` shows every palette colour's stone at a few
    sizes, free of any board or game state. Covered by
    `__tests__/devTools.test.tsx` and new cases in `session.test.ts`/
    `progress.test.ts`; not seen on an actual screen.

All of the above is on branch `claude/affectionate-cannon-z4do8h`. PR #8
(items 1-6) is merged into `main`; PR #9 (items 7-10) is open; item 11 is
this session's addition, not yet pushed to that PR when this note was
last edited. `npm run typecheck` and `npm test` are both clean as of this
file's last edit (191 tests).

## On-device checklist

Nothing in this project has been run on a real device or simulator this
whole build (remote container, nothing attached) — every item below is
still open, gathered here in one place per the user's request, to go
through together once a device is available rather than repeating
"not checked on a real device" scattered through this file:

- **Splash duration and layout** — is 1.4s the right beat before
  `SplashScreen` moves on; does `wordmark.png` read at the right size and
  position across phone sizes (`src/screens/SplashScreen.tsx`).
- **Tap-to-start layout** — does the icon/title/prompt sizing and spacing
  look right (`src/screens/TapToStartScreen.tsx`).
- **Onboarding overlay** — does the dim/spotlight band actually land on
  the colour row and tray row on a real layout (the estimate in
  `OnboardingOverlay`'s `CARD_HEIGHT_ESTIMATE` could be off for a longer
  system font size); does the card sit legibly above both, especially in
  landscape or on a short screen where `cardTop` clamps to `12`
  (`src/components/OnboardingOverlay.tsx`).
- **In-game stone restyle frame rate** — 8-wedge faceted stones instead of
  the old rounded-rect-plus-gradient one, up to 1600 per board redraw
  during a placement animation; drop to 6 wedges if it stutters
  (`src/ui/drawStone.ts`).
- **Level-complete celebration feel** — zoom-out, sparkle sweep,
  vanish/reappear timing and frame rate; only the ordering logic is
  covered by tests (`src/screens/LevelCompleteScreen.tsx`,
  `src/game/levelReplay.ts`).
- **Sound/music/haptics, all of it** — nothing about audio can be verified
  from a remote container: whether the four placeholder sounds
  (`assets/sounds/*.wav`, `tools/sound-gen/`) are actually audible at a
  sane volume, whether the background pad's loop point is truly seamless
  in practice (not just zero-crossing on paper), whether the click sound
  can be heard distinctly over rapid placements, and whether the light
  haptic (`Haptics.ImpactFeedbackStyle.Light`) feels right. Also: these
  are synthesized placeholders standing in for real sound design (see
  `tools/sound-gen/README.md`) — expect the user to want them replaced
  once heard, same as the app icon and stone restyle both took a few
  rounds.
- **Dev tools** — cosmetic only, but worth a glance: does the FPS overlay
  sit somewhere it doesn't block anything important on a real notch/insets
  layout (`src/components/FpsOverlay.tsx`); does the board screen's small
  `🛠` panel (`src/screens/BoardScreen.tsx`) overlap the exit button or the
  HUD at odd aspect ratios; does `DevStoneGalleryScreen`'s grid lay out
  sensibly at all four size options on a real screen width. None of this
  ships to players (`DEV_TOOLS_ENABLED` is `false` in any release build),
  so it's low priority relative to everything else on this list.

## Next up, in BUILD_PLAN.md order

1. ~~**Opening screens**~~ done — see "Done" item 8 above. Nothing else in
   מסכי פתיחה וניווט is outstanding (Levels/Board/Settings all exist). The
   user provided the studio logo as `assets/studio_logo/wordmark.svg`
   (plus two square icon variants, `icon-primary.svg`/`icon-appstore.svg`,
   not used in-app — they read as app-store-listing assets, not a splash
   asset; revisit if the user says otherwise). If the user replaces
   `wordmark.svg` later, re-render it to `wordmark.png` the same way
   `tools/app-icon` rasterizes its own SVG (see this file's git history
   for the one-off script — not kept as a `tools/`-style reusable one
   since this asset doesn't change often).
2. ~~**Restyle the in-game stones to match the icon**~~ done — see "Done"
   item 7 above.
3. ~~**Onboarding overlay**~~ done — see "Done" item 9 above.
4. **Ads & monetization** (AdMob banner + interstitial, one-time IAP to
   remove both) — nothing built yet. Needs its own research pass on
   current Expo-compatible libraries (`AGENTS.md`'s warning about Expo v57
   API drift applies especially here — training data may know an older,
   now-wrong integration path for AdMob under Expo).
5. ~~**Sound and music**~~ done — see "Done" item 10 above. Didn't end up
   looking at how the sibling apps wired `expo-audio`/`expo-haptics`
   (HANDOFF.md's earlier note here suggested that) — this session's read
   of the installed packages' own `.d.ts` files (empty README this SDK
   version) was enough, and the two apps' actual wiring wasn't checked.
   Worth a look if the on-device pass above turns up something odd.
6. ~~**Dev tools**~~ done — see "Done" item 11 above.
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
- **`Progress.onboardingSeen` (`src/storage/progress.ts`) is also dead** —
  a pre-existing field from PR #5, set to `false` at init and never read or
  written anywhere else. The real onboarding-seen flag this session built
  (see "Done" item 9) is a separate, unrelated key
  (`gleam:onboarding:v1`, `src/storage/onboarding.ts`) — not a fix for
  this field, and not something this session touched. Worth deleting in a
  pass that's actually about `Progress`'s shape, not in passing.
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
  build (remote container, no attached device) — see "On-device checklist"
  above for the running list of what to verify once one is available.
