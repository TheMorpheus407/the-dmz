import type { FastifyReply } from 'fastify';

export const REFRESH_COOKIE_NAME = 'refresh-token';

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

interface SetRefreshCookieOptions {
  refreshToken: string;
  reply: FastifyReply;
}

export const setRefreshCookie = ({ refreshToken, reply }: SetRefreshCookieOptions): void => {
  const isProduction = process.env['NODE_ENV'] === 'production';

  const expires = new Date();
  expires.setDate(expires.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  void reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
    expires,
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  });
};

export const clearRefreshCookie = (reply: FastifyReply): void => {
  void reply.clearCookie(REFRESH_COOKIE_NAME, {
    path: '/api/v1/auth',
  });
};

export const getRefreshCookieName = (): string => REFRESH_COOKIE_NAME;
