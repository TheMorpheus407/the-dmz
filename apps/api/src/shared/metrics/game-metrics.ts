export const activeGameSessionsGauge = {
  name: 'game_active_sessions',
  help: 'Number of active game sessions',
  labelNames: ['tenant_id', 'game_phase'] as const,
};

export const gameSessionsTotal = {
  name: 'game_sessions_total',
  help: 'Total number of game sessions started',
  labelNames: ['tenant_id', 'game_mode'] as const,
};

export const gamePhaseTransitionsTotal = {
  name: 'game_phase_transitions_total',
  help: 'Total number of game phase transitions',
  labelNames: ['from_phase', 'to_phase', 'tenant_id'] as const,
};
