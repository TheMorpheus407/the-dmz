import { writable } from "svelte/store";

export interface ConnectivityState {
  online: boolean;
  lastChange: string | null;
}

export const initialConnectivityState: ConnectivityState = {
  online: true,
  lastChange: null,
};

export const connectivityStore = writable<ConnectivityState>(
  initialConnectivityState,
);
