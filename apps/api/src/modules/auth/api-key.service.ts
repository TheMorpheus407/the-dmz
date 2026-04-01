import * as apiKeyRepo from './api-key-repo.js';
import { validateApiKey } from './api-key-validation.js';
import { rotateApiKey } from './api-key-rotation.js';
import { revokeApiKey } from './api-key-revocation.js';

export const apiKeyService = {
  createApiKey: apiKeyRepo.createApiKey,
  listApiKeys: apiKeyRepo.listApiKeys,
  getApiKeyById: apiKeyRepo.getApiKeyById,
  getApiKeyByIdForAdmin: apiKeyRepo.getApiKeyByIdForAdmin,
  validateApiKey,
  rotateApiKey,
  revokeApiKey,
  deleteApiKey: apiKeyRepo.deleteApiKey,
  updateApiKeyLastUsed: apiKeyRepo.updateApiKeyLastUsed,
};

export { generateSecret, hashSecret, getKeyPrefix } from './api-key-crypto.js';

export { parseJsonField, mapDbToResponse, type DbApiKey } from './api-key-repo.js';
