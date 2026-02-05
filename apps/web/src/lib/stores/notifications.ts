import { writable } from "svelte/store";

export type NotificationLevel = "info" | "warning" | "error";

export interface NotificationItem {
  id: string;
  message: string;
  level: NotificationLevel;
  createdAt: string;
}

export const notificationsStore = writable<NotificationItem[]>([]);
