export type RootStackParamList = {
  Levels: undefined;
  Boards: { levelId: number };
  Board: { levelId: number; boardId: number };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
