import { AppError } from '../middleware/error-handler.js';

export class CreationError extends AppError {
  public readonly entityName: string;

  constructor(entityName: string) {
    super({
      code: 'CREATION_FAILED',
      message: `Failed to create ${entityName}`,
      statusCode: 500,
      details: { entityName },
    });
    this.entityName = entityName;
  }
}

export function assertCreated<T>(result: T | undefined, entityName: string): T {
  if (!result) {
    throw new CreationError(entityName);
  }
  return result;
}
