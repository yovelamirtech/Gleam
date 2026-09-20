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

14. **The unified wall, levels-wall half only** — see "Next up" item 8's
    history below for the full ask; this round did the levels wall
    (`LevelsScreen`), not the board-level canvas, per the user's own
    priority call (levels wall first: lower-risk, no gameplay or Skia
    involved; investigate why the board is already slow before touching
    it - see the performance note in "Next up" item 8 below, now split
    into its own remaining item). `LevelsScreen` is now one continuous
    pannable/zoomable canvas of every level's full preview artwork
    (`src/ui/levelsWall.ts` for the pure grid-position/hit-test math,
    tested in `__tests__/levelsWall.test.ts`), replacing the old
    `ScrollView` grid of small tiles. Only the wall's *centre* level
    starts unlocked, matching the user's own wording ("רק אחת פתוחה
    במרכז") - previously it was level 0 (top-left). New
    `centreLevelId()` in `src/storage/progress.ts`, mirroring the
    existing `centreBoardId()`; `initialProgress()` now unlocks that
    instead of index 0 (`__tests__/progress.test.ts` covers it). Tapping
    an unlocked tile still navigates to the existing `BoardsScreen` -
    that screen, and the board-level unified canvas the user actually
    asked for first, are unchanged, see below. No Skia involved here at
    all: it's ~20 `ImageBackground`s inside one `Animated.View`
    transformed by the same pan/pinch viewport math `BoardScreen` already
    uses (`src/ui/viewport.ts`, unchanged - it was already generic over
    "canvas bounds", not hardcoded to one board's size). Locked levels
    render dimmed in place with a lock icon, same visual language as
    before, just positioned absolutely in the wall instead of being a
    separate grid tile. Covered by `__tests__/LevelsScreen.test.tsx`
    (new): every level renders as a tile, only the centre one starts
    unlocked, tapping an unlocked tile navigates, tapping a locked one
    does nothing. **Not seen on a real screen or device**, same caveat as
    everything else in this project.

All of the above is on branch `claude/continue-planned-work-vk64kd`. PR #8
(items 1-6) and PR #9 (items 7-13) are both merged into `main`. `npm run
typecheck` and `npm test` are both clean as of this file's last edit
(228 tests).

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

The user did the project's first real on-device test this round (Expo Go)
and hit a real bug immediately: the app launched fine and the levels wall
showed right after Tap to Start, then the whole app crashed on the very
first touch. Root cause: `react-native-worklets` (the engine
`react-native-reanimated` 4 uses) needs Metro's `inlineRequires` transform
enabled to initialise, and this project had no `metro.config.js` at all, so
Expo's own default (`inlineRequires` off) silently applied - the crash only
surfaces the moment a worklet actually runs, i.e. the first pan/pinch/tap,
which is why nothing looked wrong before that. Fixed by a new
`metro.config.js` (`transformer.getTransformOptions` -> `inlineRequires:
true`), shipped as its own PR against `main`
(`claude/fix-expo-go-worklets-crash`, independent of the unified-wall PR
since it's infrastructure, not feature work, and affects every
gesture-driven screen that already existed) as well as on the unified-wall
branch itself. **Not yet confirmed fixed on a real device** - the user found
the bug live but hadn't re-tested with the fix as of this note; do that
before assuming it's actually resolved, since this project cannot reproduce
or verify the crash from this environment at all (nothing here can run
Expo Go). If it turns out *not* to fix it, the versions themselves were
double-checked and are not the problem (`react-native-worklets@0.10.1` /
`react-native-reanimated@4.5.1` are exactly what Expo SDK 57 bundles) - look
next at whether New Architecture is actually enabled, and at
`babel.config.js`'s `react-native-worklets/plugin` ordering.

**A second, unrelated crash surfaced right after that first fix**:
`Uncaught (in promise, id: 0): "Error: Cannot find native module 'ExpoIap'"`.
`expo-iap` doesn't throw at *import* time when its native module is missing
(unlike `react-native-google-mobile-ads`, see "Ads/IAP and plain Expo Go"
below) - it resolves the module lazily through a Proxy. But `useIAP()`
itself registers its purchase-update/error listeners *before* its own
`initConnection` try/catch (read directly out of `expo-iap`'s own source,
`node_modules/expo-iap/build/useIAP.js`), and those listener functions
resolve the native module eagerly and throw synchronously when it's missing
- inside an `async` function nobody awaits, so it surfaces as an unhandled
promise rejection instead of the graceful "not connected" state the rest of
`useIAP` degrades to. Fixed the same way the ads module already handles
this class of bug: `src/hooks/usePurchases.tsx`'s `PurchasesProvider` now
checks `requireNativeModule('ExpoIap')` itself (the same call `expo-iap`
makes internally) *before* ever calling `useIAP`, splitting into
`LiveIapPurchasesProvider` (today's behaviour, unchanged) and
`DisabledPurchasesProvider` (cache-only, harmless no-op buy/restore).
`__tests__/iapUnavailable.test.tsx` proves the fallback. Also folded into
both the unified-wall branch and the `claude/fix-expo-go-worklets-crash` PR.

**A third crash remained after both of those fixes, and this one turned out
to be the real, root cause** - confirmed from the device's own crash log
(an `.ips` file the user pulled from Settings -> Privacy & Security ->
Analytics & Improvements -> Analytics Data and shared directly, after
Metro's own terminal showed nothing at all - only Skia deprecation
warnings, no error). The `.ips` file's faulting thread was unambiguous:

```
UIGestureRecognizer -> reanimated::handleEvent -> runSyncOnRuntime
  -> Hermes call() -> throwPendingError() -> uncaught -> abort()
```

A JS exception was being thrown *inside a worklet running on the UI
thread*, with nothing to catch it - a genuine crash, not an Expo Go/
environment quirk, and not something either of the first two fixes could
have touched. `LevelsScreen`'s tap gesture calls `levelAtPoint()` directly
from its `onEnd` worklet, but `levelAtPoint` (`src/ui/levelsWall.ts`) was
never marked `'worklet'` - unlike every other cross-thread helper in this
codebase (`src/ui/viewport.ts`'s functions all explicitly start with
`'worklet';`, exactly for this reason, per that file's own doc comment).
Under Reanimated 4, calling a plain (non-worklet) function from a
UI-thread worklet doesn't degrade gracefully - it crashes the whole app
natively, with nothing catchable on the JS side, which is exactly why nothing
showed up in Metro or as a red screen. This bug has been in already-merged
`main` code since the earlier unified-levels-wall PR (#10) - it predates
this session entirely, just never got exercised on a real device until now.
Fixed by adding the `'worklet'` directive to `levelAtPoint`. Checked every
other gesture worklet in the codebase (`BoardScreen.tsx`,
`UnifiedBoardScreen.tsx`, `LevelsScreen.tsx`'s own pan/pinch) for the same
pattern - all fine, either calling already-worklet-marked helpers
(`clampViewport`/`zoomAround`) or routing through `runOnJS` correctly.
Folded into both the unified-wall branch and
`claude/fix-expo-go-worklets-crash`. **Still not confirmed fixed on a real
device** as of this note - this is the third attempt, and only a real
device can confirm whether the app is now actually stable end to end (the
`.ips` file's precision this time makes it a much stronger fix than the
first two, but "the crash log points here" isn't the same as "verified
gone").

Nothing else in this project has been run on a real device or simulator
this whole build (remote container, nothing attached) — every item below is
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

## Done, continued

15. **Fixed the quadratic stones-picture rebuild in `BoardCanvas`** — the
    first of item 8's two split-off pieces (see "Next up" item 8's
    performance note below; the user picked "fix rebuild first, separate
    PR" when asked). Confirmed with the user before designing the fix.
    `stonesPicture`'s `useMemo` used to replay every past placement's
    `drawStone` calls from scratch on every single new placement -
    O(n) work at the n-th placement, O(n^2) total across a full board fill.
    New `src/ui/stoneBaking.ts` (`bakeBoundary`, tested directly in
    `__tests__/stoneBaking.test.ts`) is the pure batch-boundary math: a
    "baked" picture is kept per session in a ref, advanced one batch of
    `BAKE_BATCH_SIZE` (16) placements at a time by drawing the *previous*
    baked picture with a single `canvas.drawPicture()` call (not a replay of
    every stone already in it) plus that batch's own new stones; only the
    placements since the last batch boundary are replayed with `drawStone`
    on every placement, bounded to at most `BAKE_BATCH_SIZE - 1` stones.
    Total draw-call work across a full fill is now O(n * BAKE_BATCH_SIZE),
    not O(n^2). The baked cache resets whenever the `BoardSession` identity
    changes (a different board), detected inside the memo itself rather than
    a separate `useEffect`, to avoid a stale-cache render on the first frame
    of a new board. `BoardSession.history` only ever grows (no undo), so no
    shrink case to handle. **Not profiled on a real device** (see "On-device
    checklist") - this is the same "code-reading only" caveat as the rest of
    the performance note below; it should make a real difference given the
    O(n^2) -> O(n * batch) shape of the fix, but hasn't been measured. Also
    not yet started: the wall's 48x cell-count multiplier and the
    viewport-culling question the performance note raises below - this was
    deliberately scoped to the single-board rebuild cost alone, as its own
    separately-shippable step, per the plan the user confirmed.

16. **The unified wall, board-level half — an MVP, scoped down from the
    fullest reading of the ask.** `BoardsScreen`/`BoardRoute` are gone;
    `UnifiedBoardScreen` (`src/screens/UnifiedBoardScreen.tsx`) is the new
    'Boards' route target and does both their jobs. Pan/zoom over one
    continuous canvas of the whole level's 48 boards (mosaic tiles built
    from the same preview-artwork crop `BoardsScreen` used, now positioned
    by `src/ui/unifiedBoard.ts`'s wall-space geometry - tested directly in
    `__tests__/unifiedBoard.test.ts` - instead of a `flexWrap` grid); zoom in
    on a spot past `PLAYABLE_SCALE` (0.5, roughly 12px/cell) and the board
    at screen centre becomes live and playable, tracked continuously as you
    pan (`centreBoardAt`), not just on a tap. Locked boards dim with a lock
    overlay in place, same as before, just positioned on the wall instead of
    in a grid cell. `CELL` (the board-space pixel unit `BoardCanvas` already
    drew in) moved from `BoardCanvas.tsx` to `src/constants/board.ts` so the
    plain (non-Skia) wall-geometry module could share it without pulling
    `@shopify/react-native-skia` into code Jest needs to parse without a
    native runtime. `__tests__/UnifiedBoardScreen.test.tsx` covers the wall
    rendering every tile, a boardId route param (the dev-tools "jump to a
    board" shortcut, now `navigation.navigate('Boards', {levelId, boardId})`
    instead of a separate 'Board' route - `DevToolsScreen.tsx` updated to
    match) dropping straight into play, a locked target board *not* dropping
    into play, and exiting a board zooming back out to the wall rather than
    leaving the level.

    **The scope-down, and why**: the fullest reading of the user's ask (see
    item 8's quote below) is every nearby board's real stones rendered
    live, simultaneously, in one shared canvas, with only a thin line - not
    a mode switch - between the one you're panning across and the one
    you're actively placing stones on. Building that means teaching
    `BoardCanvas`'s placement math (built entirely in one board's own local
    cell coordinates) to place stones in *wall* coordinates across
    potentially several concurrently-mounted boards' sessions, and picking
    a design for what non-active-but-visible boards render at high zoom
    (their own live `BoardCanvas`? A frozen last-known picture?) - real,
    not-yet-designed work on top of everything already built. Given the
    round's scope, this instead **reuses `BoardScreen` wholesale** (its own
    pan/zoom-within-a-board, tray, HUD, onboarding, dev tools, sounds - all
    already tested, `__tests__/BoardScreen.test.tsx` untouched and still
    green) as a full-screen overlay the moment the wall's own zoom crosses
    the playable threshold, instead of rendering that board's stones inside
    the wall canvas itself. So: **not delivered** - a single canvas with
    every visible board's real stones drawn together in one frame; neighbour
    boards actually visible (not just mosaic art) while playing; a *seamless*
    hand-off animation into play (there's a hard cut between the wall's own
    pan position and `BoardScreen`'s own `fitViewport`-driven starting
    zoom/pan, since it's a genuinely separate mounted component with its own
    view state, not a continuation of the wall's transform). **Delivered**:
    one continuous pan/zoom canvas replacing the tap-to-navigate grid+screen
    split (so browsing the whole level is now exactly the same interaction
    model `LevelsScreen` already uses one layer up); the 48x cell-count
    multiplier is a non-issue by construction (never more than one live
    `BoardCanvas`/`BoardSession` mounted at a time, same cost as before this
    round); entering/leaving play is continuous zoom rather than a
    `Stack.Navigator` push (no slide transition, returns to the exact pan/
    zoom the wall was left at). **Not verified on a real device** (see
    "On-device checklist") - the playable-scale threshold in particular is a
    guess (`PLAYABLE_SCALE = 0.5` in `src/ui/unifiedBoard.ts`) and may want
    tuning once someone can actually pinch-zoom on a screen.

    If the fuller, everything-live-at-once version is wanted later: this
    round's `bakeBoundary`/incremental-picture work (item 15 above) and the
    wall-space geometry in `src/ui/unifiedBoard.ts` (`boardTilePosition`,
    `boardAtPoint`, viewport-culling groundwork) are both reusable pieces of
    it either way - the remaining work is specifically the placement-math
    and multi-board-rendering redesign described above, not a rewrite of
    what this round added.

## Next up

**Start with item 8 below** (the board-level half of the unified wall) —
the levels-wall half is now done (see "Done" item 14 above); this is what's
left of what the user asked for. The rest of this list is numbered by
BUILD_PLAN.md order, not priority; items 1-6 are already done (kept here as
pointers into "Done" above) and item 7 depends on the user supplying
images, so it isn't blocking anything.

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
8. **The unified wall, board-level half - an MVP is done, see "Done,
   continued" items 15-16 above; the fuller version is still open.** Its own
   rebuild-cost performance fix (item 15) and a first working version of the
   wall itself (item 16 - one continuous pan/zoom canvas over the whole
   level's mosaic artwork, zooming in on a spot past a threshold drops you
   into playing that exact board) are both done and merged on this branch.
   Item 16's own writeup is explicit about the scope-down from the fullest
   reading of the ask below: what's still open is every nearby board's real
   stones rendered live and simultaneously in one shared canvas (this
   round reuses `BoardScreen` wholesale as a full-screen overlay instead),
   which needs `BoardCanvas`'s placement math taught to work in wall
   coordinates across potentially several boards at once - real,
   not-yet-designed work, described in item 16's "if the fuller version is
   wanted later" note. The levels wall
   (see "Done" item 14 above) is the same idea at the *levels* layer and
   is finished; this item is the harder half: the
   user's board-level ask, verbatim (Hebrew) —

   > "דמיינתי יותר את כל הבורדים מחוברים יחד ורק מופרדים עם קו. אפשר
   > לעשות זום אין ואאוט חופשי על הציור הכולל, כדי לראות את הבורד שלי,
   > ותמיד אפשר לשחק בו. כשאתה במשחק אתה משחק בכל הציור ביחד."
   > — "I imagined all the boards connected together, only separated by
   > a line. You can freely zoom in/out on the whole picture to see your
   > board, and you can always play on it. When you're in the game
   > you're playing on the whole picture together."

   Today `BoardsScreen` (a tappable 8x6 grid of tiles) is a separate
   screen from `BoardRoute`/`BoardScreen` (one 40x40 board at a time,
   entered by tapping a tile). The ask is to collapse these into one
   screen - the whole 320x240-cell level as a single pannable/zoomable
   canvas, thin lines between boards instead of a hard screen transition,
   and gameplay (tray, HUD, placing stones) working against whatever
   board the viewport is currently centred on/over. A board earns its
   "unlocked" status exactly as it does today (finishing a neighbour), it
   just doesn't get its own screen any more - locked boards would need
   some kind of dimmed/greyed treatment *within* the single canvas
   instead of not being reachable. **Do not skip straight to coding** —
   this changes navigation and rendering, and the performance question
   below is the real risk; get the approach confirmed (`AskUserQuestion`
   or similar) before writing code, the way the levels-wall round did
   (the user picked "levels wall first" and "investigate before
   planning" when asked).

   **The user, in the same message, also asked**: "צריך להבין איך משפרים
   ביצועים כי לוח מלא מתחיל להיות כבר קשה להריץ, ואני רוצה להריץ את כל
   התמונה" — "need to figure out how to improve performance, because a
   full board is already getting hard to run, and I want to run the
   whole picture." **This pulls in the opposite direction** from the
   canvas ask above unless handled carefully: this canvas is a
   320x240-cell wall (48x today's single board's cell count) rendered at
   the same full-fidelity stones.

   **Performance investigation done this round** (still code-reading
   only - no real device or profiler has run against this project once,
   see "On-device checklist"; treat this as a hypothesis to confirm on a
   device, not a settled diagnosis): two separate, stackable costs, read
   directly out of `src/components/BoardCanvas.tsx` and
   `src/ui/drawStone.ts`.
   - **Per-stone draw-call count.** `drawStone()` issues roughly 21 Skia
     draw calls for one stone: a shadow oval, 8 facet paths each stroked
     *and* filled (16 calls), a centre "table" circle plus its stroke (2),
     and a highlight arc. A full 40x40 board is 1600 stones, so a fully
     solved board's `stonesPicture` is on the order of 33,000 draw calls
     baked into one `Picture`.
   - **The stones picture is rebuilt from scratch on every single
     placement, not incrementally.** `BoardCanvas`'s `stonesPicture`
     `useMemo` depends on `session.stonesPlaced`
     (`src/components/BoardCanvas.tsx:96-107`) and its body loops over
     *every* placement in `session.placements`, replaying `drawStone` for
     all of them, each time one more stone is placed. Filling a board of
     N cells this way does the *n*-th placement's `drawStone` work n
     times over the course of filling the board (once fresh, then
     replayed on every subsequent placement's rebuild) - roughly
     quadratic total draw-call work across a full board fill, not linear
     in the number of stones placed. This is a very plausible root cause
     for "a full board is already getting hard to run" on its own,
     independent of the wall/canvas question entirely - it's worth
     profiling and very possibly fixing (e.g. bake completed regions into
     a static picture and only redraw what changed since the last
     placement, the way a dirty-rect or layered-canvas approach would)
     *before* assuming the unified wall needs its own separate fix. Doing
     that as a first, small, separately-shippable step would also make
     "is the wall viable at all" a fairer question to answer, since right
     now the single-board baseline it would be compared against already
     has this problem baked in.
   - Combined with the wall's 48x cell-count multiplier, full-fidelity
     stones almost certainly cannot render everywhere at once regardless
     of the above fix - some form of only-draw-what's-visible
     (viewport-culled / tiled rendering, only baking `Picture`s for
     boards within or near the viewport) is very likely required for the
     canvas itself, on top of whatever the rebuild-cost fix above turns
     out to be. `LevelCompleteCanvas` (next bullet) is the existing
     precedent for "flatten instead of full-fidelity at this scale" and
     is worth understanding before assuming full-fidelity stones are
     viable at wall scale at all.

   **Relevant existing code to read before designing anything:**
   - `src/ui/viewport.ts` — the current pan/zoom math, clamped to one
     board's bounds (`fitViewport`, `zoomAround`, `clampViewport`). Will
     need to work over a whole level's (or whole wall's) bounds instead.
   - `src/components/BoardCanvas.tsx` — draws one board as a handful of
     baked Skia `Picture`s (grid, stones, preview), recomposited via a
     `<Group transform={...}>` driven by the viewport's shared values.
     The closest existing precedent for "a lot of cells at once" is:
   - `src/screens/LevelCompleteScreen.tsx` +
     `src/components/LevelCompleteCanvas.tsx` — already renders a whole
     level (320x240 cells) at once, but flattened to solid colour (no
     per-stone faceting) specifically because that's too much to draw
     at full fidelity every frame, and even then throttles its own
     redraw rate (`FRAME_BUDGET_MS`). Worth understanding exactly why
     that tradeoff was made before assuming full-fidelity stones are
     viable at wall scale.
   - `src/game/session.ts`/`src/hooks/useBoardSession.ts` — currently
     one `BoardSession` per board, loaded/persisted independently
     (`src/game/persistence.ts`, keyed by board id string). A unified
     canvas spanning many boards raises the question of whether that
     stays one session per board (probably yes, for minimal disruption
     to the exact-stone-economy logic) or needs to change.
   - `src/screens/BoardsScreen.tsx`, `src/screens/BoardRoute.tsx`,
     `App.tsx`'s `Stack.Navigator` - the navigation structure this item
     would restructure or remove. `src/screens/LevelsScreen.tsx` (now the
     unified levels wall, see "Done" item 14) and `src/ui/levelsWall.ts`
     are the closest existing precedent for this item's own pan/pinch/tap
     plumbing - reuse the same shape, not the same code (that wall has no
     Skia or gameplay to worry about; this one does).
   - `src/storage/progress.ts` - board/level lock state
     (`boardStatus`/`centreBoardId`/`markBoardCompleted`), which the
     within-canvas "locked" treatment would read the same way `BoardsScreen`
     does today, just rendered differently (dimmed on-canvas instead of
     a separate locked tile).

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
