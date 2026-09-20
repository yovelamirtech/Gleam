export type RootStackParamList = {
  Splash: undefined;
  TapToStart: undefined;
  Levels: undefined;
  /** `boardId` is a dev-tools shortcut only - the player always reaches a board by pinching in on it. */
  Boards: { levelId: number; boardId?: number };
  LevelComplete: { levelId: number };
  Settings: undefined;
  DevTools: undefined;
  DevStoneGallery: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
