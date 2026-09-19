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

12. **Ads and monetization** — `react-native-google-mobile-ads` (banner +
    interstitial) and `expo-iap` (the one-time "remove ads" purchase; not
    `expo-in-app-purchases`, which is deprecated, and not the bare
    `react-native-iap` package, which its own README says explicitly not to
    use under Expo - `expo-iap` is the Expo-flavoured wrapper around the same
    OpenIAP client). **Both are native modules** - see "Before you can build
    a dev client" below, this is the biggest infrastructure change in the
    project so far. `src/constants/ads.ts` holds the ad unit IDs (Google's
    own public test IDs for now, see that file), `src/iap/constants.ts` the
    one product SKU (`remove_ads`). `src/hooks/usePurchases.tsx`
    (`PurchasesProvider`/`usePurchases`) tracks ownership: reconciles against
    the store on connect via `getAvailablePurchases`, listens for a live
    purchase through `useIAP`'s `onPurchaseSuccess`, and caches the result
    locally (`src/storage/purchases.ts`) so ads stay off on every future
    launch before that store connection resolves - the cache is
    write-only-to-true, it can never turn ads back on, only the store can
    revoke a purchase. `src/ads/BannerAdBox.tsx` (shown at the bottom of
    `LevelsScreen` and `BoardsScreen`, not the board screen itself - didn't
    want it competing with the painting canvas) and
    `src/ads/LevelCompleteInterstitial.tsx` (non-visual, mounted in
    `LevelCompleteScreen`, shows once per level completed - not per board,
    that felt too frequent). `SettingsScreen` gained an "Ads" section: buy
    button with the store's live price once fetched, and "Restore
    purchases". Covered by `__tests__/purchases.test.tsx` and
    `__tests__/ads.test.tsx` - found and fixed one real bug along the way
    (see "Things worth knowing" below on the cache-vs-store race). Nothing
    about ad rendering or the purchase sheet itself can be seen from a
    remote container.

13. **First real feedback pass, after a written description of every item
    above** (no device, still - the user described what they saw and
    wanted from screenshots/memory, not a live test). Scoped to the
    clearly-bounded fixes only; the one big architectural ask (see "Next
    up" item 8 below) was deliberately deferred to its own round rather
    than folded in here:
    - **`centreBoardId()`** (`src/storage/progress.ts`) computed
      `floor(BOARDS_PER_LEVEL / 2)` = 24, which for an 8-wide wall is the
      left edge of the middle row, not the middle column. Fixed to use
      real row/col math (id 28).
    - **Airborne strip could be silently destroyed** by touching the tray
      again while stones were still hanging in the air (e.g. reaching to
      grab another one) - `trayTouched`/`trayDragged` in
      `BoardScreen.tsx` now ignore a fresh tray touch while
      `session.airborneStrip` is non-null, instead of starting a new lift
      that overwrote it.
    - **Rotation pivoted around the strip's first stone**, not its centre
      - `src/ui/airborneRotation.ts` (a new, independently unit-tested
      pure function) computes the offset needed to keep the centre fixed;
      `BoardScreen`'s `rotateStones` applies it to `stripX`/`stripY`.
    - **The airborne strip's visual position and its drop target used to
      be the same point**, so the "ghost" preview on the board sat
      exactly under the floating stones with no sense of hovering. Split
      into two offsets (`CARRY_OFFSET_Y` for the target, a new
      `CARRY_VISUAL_LIFT` on top of it purely for where the strip
      renders) plus a heavier drop shadow (`AirborneStrip.tsx`). Not
      checked on a real screen for feel.
    - **Tray and airborne stones looked like plain rounded squares**, not
      the faceted rhinestone the board itself uses. New
      `src/components/StoneIcon.tsx` (a small `drawStone` on its own tiny
      Skia canvas) replaces the old plain `View` rendering in both
      `HudTray.tsx` and `AirborneStrip.tsx`.
    - **Onboarding now advances itself** when the player actually does
      what the current step is pointing at (picks a colour; lifts a
      strip out of the tray), not only on an explicit "Next"/"Got it"
      tap - two new optional props on `OnboardingOverlay`
      (`advanceFromStep0`/`advanceFromStep1`, "bump this counter to
      advance") that `BoardScreen` feeds from the real interactions.
    - **A real audio bug**: `setAudioModeAsync` was never called anywhere
      in the app - the very plausible reason background music was never
      heard (iOS in particular needs an active session configured, and
      respects the ring/silent switch without one). Added to `App.tsx`.
    - **The click sound was inconsistent under rapid placements** - one
      shared player got `seekTo(0)` + `play()` called on it faster than
      those settled, racing with itself. `useGameSounds.ts` now cycles
      through a 4-player pool for clicks specifically (row/board fire
      rarely enough not to need it). Also re-synthesized the click itself
      to be lower-pitched and quieter (`tools/sound-gen/make-sounds.mjs`)
      per "too harsh" feedback.
    - **Settings toggles now confirm with a sound + light haptic when
      switched on** (never when switched off) - direct, ungated
      `useAudioPlayer`/`Haptics` calls in `SettingsScreen.tsx`, since the
      whole point is confirming "sound was off, now it's on" even while
      sound is (was) off.
    - **`SplashScreen`** now fades the wordmark in (650ms) and back out
      (550ms) on a plain white field instead of a hard cut, and
      **`TapToStartScreen`** got a few decorative `StoneIcon`s and a soft
      glow behind the game icon instead of a bare icon+text screen.
    - **`LevelsScreen`/`BoardsScreen` were missing top safe-area padding**
      - their headers could sit under the status bar/notch/Dynamic
      Island. Both now add `insets.top`, matching every other screen.
    - **Dev tools**: a new "Instantly finish level X and preview its
      complete screen" row solves every one of a level's 48 boards for
      real (not a blank shell) and marks it complete on the walls too,
      so `LevelCompleteScreen` can actually be previewed without playing
      a full level - the user specifically asked for this.
    - **Not done this round, deliberately deferred**: a landing animation
      when stones are placed (asked for, but risked being a bigger,
      riskier rendering change than the rest of this list combined - see
      "Next up" below); the "why is there no number telling me what
      colour goes where" complaint, which the user's own bigger ask (item
      8 below) folds into anyway once the whole picture is always
      visible and zoomable.
    Covered by new/extended tests: `__tests__/progress.test.ts`,
    `__tests__/BoardScreen.test.tsx`, `__tests__/airborneRotation.test.ts`
    (new), `__tests__/onboarding.test.tsx`, `__tests__/gameSounds.test.tsx`,
    `__tests__/settingsScreen.test.tsx` (new),
    `__tests__/devToolsScreen.test.tsx` (new), `__tests__/openingScreens.test.tsx`.

All of the above is on branch `claude/affectionate-cannon-z4do8h`. PR #8
(items 1-6) is merged into `main`; PR #9 (items 7-13) is open. `npm run
typecheck` and `npm test` are both clean as of this file's last edit
(218 tests).

## Ads/IAP and plain Expo Go

Item 12 pulled in `react-native-google-mobile-ads` and `expo-iap`, both
native modules - and `react-native-google-mobile-ads` specifically crashes
the *whole app on launch* under plain Expo Go, not just its own ad code:
it calls `TurboModuleRegistry.getEnforcing(...)` at the top of its own
module, the moment anything imports it, native module or not. A first
version of this work did `import MobileAds from 'react-native-google-mobile-ads'`
directly in `App.tsx` and broke Expo Go entirely as a result.

Fixed with one narrow seam: `src/ads/googleMobileAds.ts` is the only place
that package is required, wrapped in a `try`/`catch`, exporting `null` when
the native module isn't there. Every other ads file (`BannerAdBox.tsx`,
`LevelCompleteInterstitial.tsx`, `App.tsx`'s `MobileAds().initialize()`)
goes through that instead of importing the package directly, and renders/
does nothing when it's `null`. `src/constants/ads.ts` also stopped
importing `TestIds` from the package for the same reason - its two test ad
unit IDs are hardcoded there now, `Platform.select`'d the same way `TestIds`
itself is internally. `expo-iap` didn't need this: `useIAP`'s own
`initConnection` call is already wrapped in a try/catch inside the
package, so a missing store connection just leaves `connected: false`
rather than crashing.

Net effect: **everything except ads/IAP themselves is still testable
through plain `npx expo start` + Expo Go** - the board game, all screens,
sound/music/haptics, dev tools, onboarding. `__tests__/adsUnavailable.test.tsx`
covers the fallback path directly (mocks the package to throw, same as a
real missing native module would, and asserts nothing crashes). Ads
themselves - the banner, the interstitial, the purchase flow - still need
a real dev client to see rendered; see the next section for what that
needs.

## Before you can build a dev client

`npx expo start` now works fine for Expo Go, but a dev client is still the
only way to actually *see* ads or exercise the purchase flow, since Expo Go
can't load that native module at all. `eas.json` (new, this session) has a
`development` build profile ready (`developmentClient: true`), but building
it needs a few things only you can provide, since none of them exist yet:

1. **An Expo/EAS account** linked to this project (`eas login`, then `eas
   build:configure` sets `extra.eas.projectId` in `app.json` - not there
   yet). EAS builds run in the cloud, so once this is set up you can
   trigger a build and download the resulting `.apk`/`.ipa` straight from
   your phone at expo.dev - no local machine needed.
2. **`ios.bundleIdentifier` and `android.package`** in `app.json` - neither
   is set. These are permanent app identifiers (can't casually change
   later, and the store listings will be built around them), so this
   session left them for you to choose rather than guessing something like
   `com.yourstudio.gleam`.
3. **A real AdMob account** (App ID + ad unit IDs) - `app.json`'s
   `react-native-google-mobile-ads` plugin config and
   `src/constants/ads.ts` both currently hold Google's own published *test*
   IDs, which is safe to build and even publish with (they just show
   Google's test creative instead of real ads), but obviously earn nothing
   until swapped for real ones.
4. **The `remove_ads` in-app product**, created with that exact ID in both
   App Store Connect and the Google Play Console, before a real purchase
   (as opposed to a Play/TestFlight sandbox one) can succeed.

None of this blocks running the test suite or `npm run typecheck`, and
none of it blocks continuing to other BUILD_PLAN.md items in the
meantime - it only blocks actually installing a build on a phone from this
point forward.

## On-device checklist

Nothing in this project has been run on a real device or simulator this
whole build (remote container, nothing attached) — every item below is
still open, gathered here in one place per the user's request, to go
through together once a device is available rather than repeating
"not checked on a real device" scattered through this file:

- **Splash fade timing and layout** — is the 650ms fade-in/500ms hold/550ms
  fade-out beat right before `SplashScreen` moves on; does `wordmark.png`
  read at the right size and position across phone sizes
  (`src/screens/SplashScreen.tsx`).
- **Tap-to-start layout** — does the icon/title/prompt sizing and spacing
  look right, and do the new decorative `StoneIcon` sparkles and glow read
  as intentional rather than cluttered at real phone sizes
  (`src/screens/TapToStartScreen.tsx`).
- **This round's board-screen fixes, all unverified on a real screen**:
  does the airborne strip's new extra hover height
  (`CARRY_VISUAL_LIFT`) actually read as "floating above the board" or
  does it now feel too far from the finger; does the heavier drop shadow
  help or look odd; does rotating a strip around its centre feel natural;
  does `StoneIcon` (the tray/airborne stones' own tiny Skia canvas) look
  right and render fast enough at `AIRBORNE_STONE` (30px) and `TRAY_SLOT`
  (40px) sizes - it's a second Skia canvas per visible stone, on top of
  the board's own, and hasn't been profiled (`src/components/StoneIcon.tsx`,
  `src/screens/BoardScreen.tsx`, `src/components/HudTray.tsx`,
  `src/components/AirborneStrip.tsx`).
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
  sane volume (the missing `setAudioModeAsync` call was fixed this round -
  see "Done" item 13 - but that was diagnosed from reading the code, not
  from hearing it work), whether the background pad's loop point is truly
  seamless in practice (not just zero-crossing on paper), whether the
  retuned, pooled click sound now reads as "gentle" and distinct over
  rapid placements the way the user asked for, and whether the light
  haptic (`Haptics.ImpactFeedbackStyle.Light`) - on both the game itself
  and the new settings-toggle confirmation - feels right. Also: these are
  synthesized placeholders standing in for real sound design (see
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
- **Ads and IAP, all of it** — nothing here can be verified from a remote
  container at all, and it needs an actual dev-client build first (see
  "Before you can build a dev client" above), not just a device: does the
  banner's adaptive height look right at the bottom of `LevelsScreen`/
  `BoardsScreen` (`src/ads/BannerAdBox.tsx`) without shifting the grid
  awkwardly; does the interstitial's timing after a level completes feel
  right or too abrupt (`src/ads/LevelCompleteInterstitial.tsx`); does the
  real store purchase sheet for `remove_ads` work end to end once the
  product exists in App Store Connect/Play Console (test purchases only
  until then); does "Restore purchases" in `SettingsScreen` actually find a
  prior purchase after a reinstall.

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
4. ~~**Ads & monetization**~~ done — see "Done" item 12 above. Blocked from
   actually being tested on a device until the account/identifier setup in
   "Before you can build a dev client" above happens.
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
8. **The big one, explicitly deferred to its own round (user's own
   choice)**: replace board-by-board and level-by-level navigation with
   one continuous, freely zoomable/pannable canvas at each layer -
   inside a level, the player should always be "inside" the whole
   picture (all 48 boards visibly stitched together, only separated by a
   thin line) rather than entering one board screen at a time; the
   levels wall should work the same way (one giant wall of every level's
   artwork, only the centre one unlocked, free pan/zoom to browse
   without paging). This is not a small change - it touches navigation
   (no more separate `Boards`/`Board` routes, or they change meaning),
   the viewport/gesture code (`src/ui/viewport.ts` currently zooms/pans
   one 40x40 board, not a 320x240 whole-level canvas), and rendering
   performance is the real risk: the user *also* asked "how do we make
   performance better, because a full board is already getting hard to
   run" in the same message - and this change means rendering far more
   than one board at once, the opposite direction from what that request
   wants unless it's done carefully (tiled/virtualized rendering, only
   drawing what's on screen, something closer to what
   `LevelCompleteCanvas` already does at flattened/low fidelity for the
   celebration screen). Read that whole feedback message again before
   starting - it has the exact wording of what's wanted. No design or
   architecture decisions have been made yet; this needs its own
   planning pass, not just diving into code.

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
- **A real race in `usePurchases`, caught by its own test, not by inspection**
  — the local "ads removed" cache and the live store both call
  `setAdsRemoved`, and they resolve at different times. The first version
  set the cached value unconditionally on load; if the store's own
  `onPurchaseSuccess`/`getAvailablePurchases` reconciliation fired first
  (plausible - the cache read goes through `AsyncStorage`, itself async)
  and the cache turned out to be a stale `false` (e.g. the write from a
  *previous* purchase hadn't landed yet, or this is a fresh install after a
  restore), the cache's `then` would fire second and flip `adsRemoved` back
  to `false` right after the store had just confirmed it `true`. Fixed by
  making the cache read one-directional - `if (cached) setAdsRemoved(true)`,
  never `setAdsRemoved(cached)` - so it can only ever turn ads off sooner,
  never back on. `__tests__/purchases.test.tsx`'s "picks up a purchase
  already owned" test failed against the original code before this fix.
- **Nothing here has been run on a real device or simulator** this whole
  build (remote container, no attached device) — see "On-device checklist"
  above for the running list of what to verify once one is available.
