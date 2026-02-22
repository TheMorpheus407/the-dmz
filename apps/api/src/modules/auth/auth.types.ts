export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  tenantId: string;
  role: string;
  isActive: boolean;
};

export type AuthSession = {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: Date;
  createdAt: Date;
  lastActiveAt: Date;
};

export type JwtPayload = {
  sub: string;
  tenantId: string;
  sessionId: string;
  role: string;
  iat: number;
  exp: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = {
  user: AuthUser;
  sessionId: string;
} & AuthTokens;

export type RefreshResponse = AuthTokens & {
  sessionId: string;
  oldSessionId: string;
  userId: string;
  tenantId: string;
};

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  sessionId: string;
  role: string;
}

export type UserProfile = {
  profileId: string;
  tenantId: string;
  userId: string;
  locale: string;
  timezone: string;
  accessibilitySettings: Record<string, unknown>;
  notificationSettings: Record<string, unknown>;
};
