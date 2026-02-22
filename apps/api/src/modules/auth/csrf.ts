import { AppError, ErrorCodes } from '../../shared/middleware/error-handler.js';

import type { FastifyRequest, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

export const csrfCookieName = CSRF_COOKIE_NAME;
export const csrfHeaderName = CSRF_HEADER_NAME;

export const setCsrfCookie = (request: FastifyRequest, reply: FastifyReply): string => {
  const existingToken = (request.cookies as Record<string, string>)[CSRF_COOKIE_NAME];

  if (existingToken) {
    return existingToken;
  }

  const newToken = crypto.randomUUID();

  const isProduction = process.env['NODE_ENV'] === 'production';

  void reply.setCookie(CSRF_COOKIE_NAME, newToken, {
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return newToken;
};

export const validateCsrf: preHandlerAsyncHookHandler = async (
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> => {
  const cookieToken = (request.cookies as Record<string, string>)[CSRF_COOKIE_NAME];
  const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;

  if (!cookieToken || !headerToken) {
    throw new AppError({
      code: ErrorCodes.AUTH_CSRF_INVALID,
      message: 'CSRF token missing',
      statusCode: 403,
    });
  }

  if (cookieToken !== headerToken) {
    throw new AppError({
      code: ErrorCodes.AUTH_CSRF_INVALID,
      message: 'CSRF token invalid',
      statusCode: 403,
    });
  }
};

export const csrfProtection = {
  cookieName: CSRF_COOKIE_NAME,
  headerName: CSRF_HEADER_NAME,
  setCookie: setCsrfCookie,
  validate: validateCsrf,
};
