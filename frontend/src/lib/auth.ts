import type { User } from '../types';

const ACCESS_KEY = 'alytha_access_token';
const REFRESH_KEY = 'alytha_refresh_token';
const USER_KEY = 'alytha_user';

const LEGACY_ACCESS_KEY = 'alytha_token';
const LEGACY_REFRESH_KEY = 'alytha_refresh';

const readStorage = (key: string) => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
};

const writeStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
};

const removeStorage = (key: string) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
};

const parseUser = <T = User>(raw: string | null): T | null => {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    removeStorage(USER_KEY);
    return null;
  }
};

export function saveAuth(access: string, refresh: string | null, user: unknown) {
  writeStorage(ACCESS_KEY, access);

  if (refresh) {
    writeStorage(REFRESH_KEY, refresh);
  } else {
    removeStorage(REFRESH_KEY);
  }

  setCurrentUser(user);

  removeStorage(LEGACY_ACCESS_KEY);
  removeStorage(LEGACY_REFRESH_KEY);
}

export function getAccessToken() {
  return readStorage(ACCESS_KEY) ?? readStorage(LEGACY_ACCESS_KEY);
}

export function updateAccessToken(access: string) {
  writeStorage(ACCESS_KEY, access);
  removeStorage(LEGACY_ACCESS_KEY);
}

export function getRefreshToken() {
  return readStorage(REFRESH_KEY) ?? readStorage(LEGACY_REFRESH_KEY);
}

export function getCurrentUser<T = User>(): T | null {
  return parseUser<T>(readStorage(USER_KEY));
}

export function setCurrentUser(user: unknown) {
  if (user) {
    writeStorage(USER_KEY, JSON.stringify(user));
  } else {
    removeStorage(USER_KEY);
  }
}

export function clearAuth() {
  removeStorage(ACCESS_KEY);
  removeStorage(REFRESH_KEY);
  removeStorage(USER_KEY);
  removeStorage(LEGACY_ACCESS_KEY);
  removeStorage(LEGACY_REFRESH_KEY);
}

export function isAuthenticated() {
  return Boolean(getAccessToken());
}
