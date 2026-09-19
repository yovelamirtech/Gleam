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
   enter the levels wall). See "Next up" below for what's unfinished here.

All of the above is on branch `claude/affectionate-cannon-z4do8h`. PR #8
(items 1-6) and PR #9 (item 7) are both merged into `main`; item 8 is
this session's addition, not yet in its own PR when this note was last
edited. `npm run typecheck` and `npm test` are both clean as of this
file's last edit (170+ tests).

## Next up, in BUILD_PLAN.md order

1. ~~**Opening screens**~~ mostly done, one loose end — the user provided
   the studio logo as `assets/studio_logo/wordmark.svg` (plus two square
   icon variants, `icon-primary.svg`/`icon-appstore.svg`, not used
   in-app — they read as app-store-listing assets, not a splash asset;
   revisit if the user says otherwise). It's rasterized once, at build
   time, to `assets/studio_logo/wordmark.png` (2x the SVG's 720x200
   viewBox, transparent background) the same way `tools/app-icon`
   rasterizes its own SVG — there's no SVG-rendering library in the app
   itself (no `react-native-svg`), so this keeps it that way rather than
   adding one for a single static logo. If the user replaces
   `wordmark.svg` later, re-render it the same way (see the git history
   of this file for the one-off script; it wasn't kept as a
   `tools/`-style reusable script since this asset doesn't change often).
   `SplashScreen` shows it for 1.4s then auto-`replace`s to
   `TapToStartScreen`, which shows the existing `assets/icon.png`
   (already on the same `colors.background` as the app, so no extra
   asset needed) and `replace`s to `Levels` on tap. **Not checked on a
   real device** — is 1.4s the right splash duration, does the wordmark
   size/position read well on an actual phone, etc. Nothing else in
   מסכי פתיחה וניווט is outstanding (Levels/Board/Settings all exist).
2. ~~**Restyle the in-game stones to match the icon**~~ done —
   `src/ui/drawStone.ts` now draws the same shape language as
   `tools/app-icon/make-icons.mjs`'s `rhinestone()`: a ring of trapezoid
   facets around a small flat centre "table", each a flat shade (no
   gradient) picked by its angle against the fixed top-left light source,
   plus a specular arc instead of the old oval highlight. Uses 8 wedges
   instead of the icon's 12 — at `CELL = 24` a 12-wedge stone's facets
   would be a couple of pixels wide, so 8 keeps it reading as faceted
   while cutting draw calls per stone (`Skia.Path` + fill + stroke per
   facet, drawn `WEDGES` times instead of the old one rect + one line +
   one oval). `LevelCompleteCanvas.tsx` is untouched on purpose — it still
   draws flat colour without the stone treatment, since facets don't read
   at that zoom (320x240 cells on one screen). **Not profiled on a real
   device** — `npm test`/`npm run typecheck` are clean, but nobody has
   checked frame rate with ~8x the draw calls per stone during a
   placement animation with up to 1600 stones on screen. If it stutters,
   dropping to 6 wedges is the next lever (see the git history of this
   file's earlier note for the reasoning), before considering baking
   stone shapes into a shared `SkPicture`/image cache.
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
