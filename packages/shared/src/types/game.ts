export type GameId = string;

export type GameEvent = {
  id: string;
  type: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type GameSnapshot = {
  id: string;
  createdAt: string;
  state: Record<string, unknown>;
};
