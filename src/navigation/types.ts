export type RootStackParamList = {
  Levels: undefined;
  Boards: { levelId: number };
  Board: { levelId: number; boardId: number };
  LevelComplete: { levelId: number };
  Settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
