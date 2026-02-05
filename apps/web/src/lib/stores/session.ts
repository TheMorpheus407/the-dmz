import { writable } from "svelte/store";

export type SessionStatus = "anonymous" | "authenticated";

export interface SessionState {
  status: SessionStatus;
  userId: string | null;
  tenantId: string | null;
}

export const initialSessionState: SessionState = {
  status: "anonymous",
  userId: null,
  tenantId: null
};

export const sessionStore = writable<SessionState>(initialSessionState);
