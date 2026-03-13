import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';

export const BASE_URL_TEST = BASE_URL;
export const API_VERSION = 'v1';

export function getHeaders(authToken = null) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

export function loginUser(email, password) {
  const payload = JSON.stringify({
    email,
    password,
  });

  const res = http.post(`${BASE_URL}/api/${API_VERSION}/auth/login`, payload, {
    headers: getHeaders(),
  });

  const success = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has access_token': (r) => r.json('data.access_token') !== undefined,
  });

  if (success) {
    return {
      accessToken: res.json('data.access_token'),
      refreshToken: res.json('data.refresh_token'),
    };
  }

  return null;
}

export function registerUser(email, password, username) {
  const payload = JSON.stringify({
    email,
    password,
    username,
  });

  const res = http.post(`${BASE_URL}/api/${API_VERSION}/auth/register`, payload, {
    headers: getHeaders(),
  });

  const success = check(res, {
    'register status 201': (r) => r.status === 201,
    'register has access_token': (r) => r.json('data.access_token') !== undefined,
  });

  if (success) {
    return {
      accessToken: res.json('data.access_token'),
      refreshToken: res.json('data.refresh_token'),
    };
  }

  return null;
}

export function refreshToken(refreshToken) {
  const payload = JSON.stringify({
    refresh_token: refreshToken,
  });

  const res = http.post(`${BASE_URL}/api/${API_VERSION}/auth/refresh`, payload, {
    headers: getHeaders(),
  });

  const success = check(res, {
    'refresh status 200': (r) => r.status === 200,
    'refresh has access_token': (r) => r.json('data.access_token') !== undefined,
  });

  if (success) {
    return {
      accessToken: res.json('data.access_token'),
      refreshToken: res.json('data.refresh_token'),
    };
  }

  return null;
}

export function getProfile(authToken) {
  const res = http.get(`${BASE_URL}/api/${API_VERSION}/auth/me`, {
    headers: getHeaders(authToken),
  });

  const success = check(res, {
    'profile status 200': (r) => r.status === 200,
  });

  if (success) {
    return res.json('data');
  }

  return null;
}

export function createGameSession(authToken) {
  const payload = JSON.stringify({
    difficulty: 'normal',
  });

  const res = http.post(`${BASE_URL}/api/${API_VERSION}/game/sessions`, payload, {
    headers: getHeaders(authToken),
  });

  const success = check(res, {
    'session create status 201': (r) => r.status === 201,
    'session has id': (r) => r.json('data.id') !== undefined,
  });

  if (success) {
    return res.json('data');
  }

  return null;
}

export function getGameSession(authToken, sessionId) {
  const res = http.get(`${BASE_URL}/api/${API_VERSION}/game/sessions/${sessionId}`, {
    headers: getHeaders(authToken),
  });

  const success = check(res, {
    'session get status 200': (r) => r.status === 200,
  });

  if (success) {
    return res.json('data');
  }

  return null;
}

export function performGameAction(authToken, sessionId, actionType, payload = {}) {
  const body = JSON.stringify({
    action_type: actionType,
    payload,
  });

  const res = http.post(`${BASE_URL}/api/${API_VERSION}/game/sessions/${sessionId}/actions`, body, {
    headers: getHeaders(authToken),
  });

  const success = check(res, {
    'action status 200': (r) => r.status === 200,
  });

  if (success) {
    return res.json('data');
  }

  return null;
}

export function getEmailPool(authToken) {
  const res = http.get(`${BASE_URL}/api/${API_VERSION}/email/pool`, {
    headers: getHeaders(authToken),
  });

  const success = check(res, {
    'email pool status 200': (r) => r.status === 200,
  });

  if (success) {
    return res.json('data');
  }

  return null;
}

export function triageEmail(authToken, emailId, action) {
  const payload = JSON.stringify({
    action,
    notes: '',
  });

  const res = http.post(`${BASE_URL}/api/${API_VERSION}/email/${emailId}/triage`, payload, {
    headers: getHeaders(authToken),
  });

  const success = check(res, {
    'triage status 200': (r) => r.status === 200,
  });

  if (success) {
    return res.json('data');
  }

  return null;
}

export function healthCheck() {
  const res = http.get(`${BASE_URL}/api/${API_VERSION}/health`);

  return {
    status: res.status,
    data: res.json(),
  };
}
