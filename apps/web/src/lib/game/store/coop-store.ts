import { writable, derived, get } from 'svelte/store';

import type { CoopSessionBootstrap, CoopDecisionProposal, CoopRole } from '@the-dmz/shared/schemas';
import {
  getCoopSession,
  createCoopSession,
  assignCoopRoles,
  submitProposal,
  confirmProposal,
  overrideProposal,
  advanceCoopDay,
  endCoopSession,
  abandonCoopSession,
  rotateAuthority,
  type SubmitProposalRequest,
  type OverrideProposalRequest,
} from '$lib/api/coop';
import type { CategorizedApiError } from '$lib/api/types';

export interface CoopPlayerState {
  playerId: string;
  role: CoopRole;
  isAuthority: boolean;
}

export interface CoopStoreState {
  isLoading: boolean;
  isInitialized: boolean;
  error: CategorizedApiError | null;
  session: CoopSessionBootstrap | null;
  currentPlayerId: string | null;
  currentPlayerRole: CoopRole | null;
  isAuthority: boolean;
  proposals: CoopDecisionProposal[];
  lastSyncAt: string | null;
}

const initialState: CoopStoreState = {
  isLoading: false,
  isInitialized: false,
  error: null,
  session: null,
  currentPlayerId: null,
  currentPlayerRole: null,
  isAuthority: false,
  proposals: [],
  lastSyncAt: null,
};

function createCoopStore() {
  const { subscribe, set, update } = writable<CoopStoreState>(initialState);

  return {
    subscribe,

    get(): CoopStoreState {
      return get({ subscribe });
    },

    setCurrentPlayer(playerId: string, role: CoopRole, isAuthority: boolean): void {
      update((state) => ({
        ...state,
        currentPlayerId: playerId,
        currentPlayerRole: role,
        isAuthority,
      }));
    },

    async createSession(): Promise<{ error?: CategorizedApiError }> {
      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await createCoopSession();

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      if (result.data) {
        this.applySessionState(result.data);
      }

      update((state) => ({
        ...state,
        isLoading: false,
        isInitialized: true,
        lastSyncAt: new Date().toISOString(),
      }));
      return {};
    },

    async joinSession(
      sessionId: string,
      playerId: string,
    ): Promise<{ error?: CategorizedApiError }> {
      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await getCoopSession(sessionId);

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      if (result.data) {
        this.applySessionState(result.data);

        const currentRole = result.data.roles.find((r) => r.playerId === playerId);
        if (currentRole) {
          this.setCurrentPlayer(playerId, currentRole.role, currentRole.isAuthority);
        }
      }

      update((state) => ({
        ...state,
        isLoading: false,
        isInitialized: true,
        lastSyncAt: new Date().toISOString(),
      }));
      return {};
    },

    async assignRoles(
      roles: Array<{ playerId: string; role: CoopRole }>,
    ): Promise<{ error?: CategorizedApiError }> {
      const session = get({ subscribe }).session;
      if (!session) {
        return {
          error: {
            category: 'validation',
            code: 'NO_SESSION',
            message: 'No active co-op session',
            status: 400,
            retryable: false,
          },
        };
      }

      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await assignCoopRoles(session.sessionId, roles);

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      if (result.data) {
        this.applySessionState(result.data);
      }

      update((state) => ({ ...state, isLoading: false }));
      return {};
    },

    async submitDecision(
      emailId: string,
      action: SubmitProposalRequest['action'],
    ): Promise<{ error?: CategorizedApiError }> {
      const state = get({ subscribe });
      if (!state.session) {
        return {
          error: {
            category: 'validation',
            code: 'NO_SESSION',
            message: 'No active co-op session',
            status: 400,
            retryable: false,
          },
        };
      }

      const result = await submitProposal(state.session.sessionId, { emailId, action });

      if (result.error) {
        return { error: result.error };
      }

      if (result.data) {
        this.addOrUpdateProposal(result.data);
      }

      return {};
    },

    async confirmDecision(proposalId: string): Promise<{ error?: CategorizedApiError }> {
      const state = get({ subscribe });
      if (!state.session) {
        return {
          error: {
            category: 'validation',
            code: 'NO_SESSION',
            message: 'No active co-op session',
            status: 400,
            retryable: false,
          },
        };
      }

      if (!state.currentPlayerRole || !state.isAuthority) {
        return {
          error: {
            category: 'validation',
            code: 'NOT_AUTHORITY',
            message: 'Only the authority player can confirm decisions',
            status: 403,
            retryable: false,
          },
        };
      }

      const result = await confirmProposal(state.session.sessionId, { proposalId });

      if (result.error) {
        return { error: result.error };
      }

      if (result.data) {
        this.addOrUpdateProposal(result.data);
      }

      return {};
    },

    async overrideDecision(
      proposalId: string,
      conflictReason: OverrideProposalRequest['conflictReason'],
    ): Promise<{ error?: CategorizedApiError }> {
      const state = get({ subscribe });
      if (!state.session) {
        return {
          error: {
            category: 'validation',
            code: 'NO_SESSION',
            message: 'No active co-op session',
            status: 400,
            retryable: false,
          },
        };
      }

      if (!state.currentPlayerRole || !state.isAuthority) {
        return {
          error: {
            category: 'validation',
            code: 'NOT_AUTHORITY',
            message: 'Only the authority player can override decisions',
            status: 403,
            retryable: false,
          },
        };
      }

      const result = await overrideProposal(state.session.sessionId, {
        proposalId,
        conflictReason,
      });

      if (result.error) {
        return { error: result.error };
      }

      if (result.data) {
        this.addOrUpdateProposal(result.data);
      }

      return {};
    },

    async advanceDay(): Promise<{ error?: CategorizedApiError }> {
      const state = get({ subscribe });
      if (!state.session) {
        return {
          error: {
            category: 'validation',
            code: 'NO_SESSION',
            message: 'No active co-op session',
            status: 400,
            retryable: false,
          },
        };
      }

      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await advanceCoopDay(state.session.sessionId);

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      if (result.data) {
        this.applySessionState(result.data);
      }

      update((state) => ({ ...state, isLoading: false }));
      return {};
    },

    async endSession(): Promise<{ error?: CategorizedApiError }> {
      const state = get({ subscribe });
      if (!state.session) {
        return {
          error: {
            category: 'validation',
            code: 'NO_SESSION',
            message: 'No active co-op session',
            status: 400,
            retryable: false,
          },
        };
      }

      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await endCoopSession(state.session.sessionId);

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      set(initialState);
      return {};
    },

    async abandonSession(): Promise<{ error?: CategorizedApiError }> {
      const state = get({ subscribe });
      if (!state.session) {
        return {
          error: {
            category: 'validation',
            code: 'NO_SESSION',
            message: 'No active co-op session',
            status: 400,
            retryable: false,
          },
        };
      }

      update((state) => ({ ...state, isLoading: true, error: null }));

      const result = await abandonCoopSession(state.session.sessionId);

      if (result.error) {
        update((state) => ({ ...state, isLoading: false, error: result.error ?? null }));
        return { error: result.error };
      }

      set(initialState);
      return {};
    },

    async transferAuthority(
      newAuthorityPlayerId: string,
    ): Promise<{ error?: CategorizedApiError }> {
      const state = get({ subscribe });
      if (!state.session) {
        return {
          error: {
            category: 'validation',
            code: 'NO_SESSION',
            message: 'No active co-op session',
            status: 400,
            retryable: false,
          },
        };
      }

      const result = await rotateAuthority(state.session.sessionId, newAuthorityPlayerId);

      if (result.error) {
        return { error: result.error };
      }

      if (result.data) {
        this.applySessionState(result.data);
      }

      return {};
    },

    applySessionState(sessionState: CoopSessionBootstrap): void {
      update((state) => {
        const currentRole = sessionState.roles.find((r) => r.playerId === state.currentPlayerId);
        return {
          ...state,
          session: sessionState,
          currentPlayerRole: currentRole?.role ?? state.currentPlayerRole,
          isAuthority: currentRole?.isAuthority ?? state.isAuthority,
          lastSyncAt: new Date().toISOString(),
        };
      });
    },

    addOrUpdateProposal(proposal: CoopDecisionProposal): void {
      update((state) => {
        const existingIndex = state.proposals.findIndex(
          (p) => p.proposalId === proposal.proposalId,
        );
        const newProposals = [...state.proposals];
        if (existingIndex >= 0) {
          newProposals[existingIndex] = proposal;
        } else {
          newProposals.push(proposal);
        }
        return { ...state, proposals: newProposals };
      });
    },

    handleSessionEvent(event: { type: string; payload: Record<string, unknown> }): void {
      switch (event.type) {
        case 'coop.session.role_assigned': {
          const payload = event.payload as {
            roles: Array<{ playerId: string; role: CoopRole; isAuthority: boolean }>;
          };
          update((state) => {
            if (!state.session) return state;
            const newSession = { ...state.session, roles: payload.roles };
            const currentRole = payload.roles.find((r) => r.playerId === state.currentPlayerId);
            return {
              ...state,
              session: newSession,
              currentPlayerRole: currentRole?.role ?? state.currentPlayerRole,
              isAuthority: currentRole?.isAuthority ?? state.isAuthority,
            };
          });
          break;
        }
        case 'coop.session.authority_transferred': {
          const payload = event.payload as {
            newAuthorityPlayerId: string;
            previousAuthorityPlayerId: string;
          };
          update((state) => {
            if (!state.session) return state;
            const newRoles = state.session.roles.map((r) => ({
              ...r,
              isAuthority: r.playerId === payload.newAuthorityPlayerId,
            }));
            const newSession = { ...state.session, roles: newRoles };
            return {
              ...state,
              session: newSession,
              isAuthority: state.currentPlayerId === payload.newAuthorityPlayerId,
            };
          });
          break;
        }
        case 'coop.session.proposal_submitted':
        case 'coop.session.proposal_confirmed':
        case 'coop.session.proposal_overridden': {
          const proposal = event.payload as unknown as CoopDecisionProposal;
          this.addOrUpdateProposal(proposal);
          break;
        }
        case 'coop.session.day_advanced': {
          const payload = event.payload as {
            dayNumber: number;
            newAuthorityPlayerId: string;
            previousAuthorityPlayerId: string;
          };
          update((state) => {
            if (!state.session) return state;
            const newRoles = state.session.roles.map((r) => ({
              ...r,
              isAuthority: r.playerId === payload.newAuthorityPlayerId,
            }));
            const newSession = {
              ...state.session,
              dayNumber: payload.dayNumber,
              roles: newRoles,
            };
            return {
              ...state,
              session: newSession,
              isAuthority: state.currentPlayerId === payload.newAuthorityPlayerId,
            };
          });
          break;
        }
        case 'coop.session.ended': {
          set(initialState);
          break;
        }
      }
    },

    reset(): void {
      set(initialState);
    },
  };
}

export const coopStore = createCoopStore();

export const currentCoopSession = derived(coopStore, ($coop) => $coop.session);

export const currentCoopRole = derived(coopStore, ($coop) => $coop.currentPlayerRole);

export const isAuthority = derived(coopStore, ($coop) => $coop.isAuthority);

export const coopProposals = derived(coopStore, ($coop) => $coop.proposals);

export const pendingProposals = derived(coopStore, ($coop) =>
  $coop.proposals.filter((p) => p.status === 'proposed'),
);

export const resolvedProposals = derived(coopStore, ($coop) =>
  $coop.proposals.filter((p) => p.status !== 'proposed'),
);

export const coopSessionLoading = derived(coopStore, ($coop) => $coop.isLoading);

export const coopSessionError = derived(coopStore, ($coop) => $coop.error);

export const isCoopInitialized = derived(coopStore, ($coop) => $coop.isInitialized);

export const otherPlayerRole = derived(coopStore, ($coop) => {
  if (!$coop.currentPlayerRole) return null;
  return $coop.currentPlayerRole === 'triage_lead' ? 'verification_lead' : 'triage_lead';
});
