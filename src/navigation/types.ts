export type RootStackParamList = {
  Splash: undefined;
  TapToStart: undefined;
  Levels: undefined;
  Boards: { levelId: number };
  Board: { levelId: number; boardId: number };
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
