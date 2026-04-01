import { getDatabaseClient } from '../../../shared/database/connection.js';

import {
  findMorpheusMessagesByTrigger,
  findMorpheusMessageByKey,
  type MorpheusMessage,
} from './narrative.repo.js';

import type { AppConfig } from '../../../config.js';

export type { MorpheusMessage };

export const getMorpheusMessagesByTrigger = async (
  config: AppConfig,
  tenantId: string,
  triggerType: string,
  filters?: {
    day?: number;
    factionKey?: string;
  },
): Promise<MorpheusMessage[]> => {
  const db = getDatabaseClient(config);
  return findMorpheusMessagesByTrigger(db, tenantId, triggerType, filters);
};

export const getMorpheusMessageByKey = async (
  config: AppConfig,
  tenantId: string,
  messageKey: string,
): Promise<MorpheusMessage | undefined> => {
  const db = getDatabaseClient(config);
  return findMorpheusMessageByKey(db, tenantId, messageKey);
};
