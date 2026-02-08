export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  timestamp: string;
  correlationId: string;
  tenantId: string;
  userId: string;
  source: string;
  payload: T;
  version: number;
}

export type EventHandler<T = unknown> = (event: DomainEvent<T>) => void | Promise<void>;

export interface IEventBus {
  publish<T>(event: DomainEvent<T>): void;
  subscribe<T>(eventType: string, handler: EventHandler<T>): void;
  unsubscribe<T>(eventType: string, handler: EventHandler<T>): void;
}
