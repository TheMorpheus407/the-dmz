import { ErrorCodes } from '@the-dmz/shared';

import { AppError } from '../../shared/middleware/error-handler.js';

export class UserNotFoundError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.USER_NOT_FOUND,
      message: 'User not found',
      statusCode: 404,
    });
  }
}

export class LastAdminDeleteError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.USER_LAST_ADMIN_DELETE,
      message: 'Cannot delete the last tenant admin',
      statusCode: 403,
    });
  }
}

export class SelfDeleteError extends AppError {
  constructor() {
    super({
      code: ErrorCodes.USER_SELF_DELETE_FORBIDDEN,
      message: 'Cannot delete your own account',
      statusCode: 403,
    });
  }
}
