export interface GameAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface QueuedAction extends GameAction {
  queuedAt: string;
}

export const enqueueAction = (queue: QueuedAction[], action: GameAction): QueuedAction[] => [
  ...queue,
  {
    ...action,
    queuedAt: new Date().toISOString(),
  },
];
