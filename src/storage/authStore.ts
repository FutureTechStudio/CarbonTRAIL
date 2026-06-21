const AUTH_STORAGE_KEY = "carbontrail_auth_v1";

export type LocalAuthAccount = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

type AuthStore = {
  version: 1;
  sessionUserId: string | null;
  accounts: LocalAuthAccount[];
};

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; error: string };

function hasLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emptyAuthStore(): AuthStore {
  return { version: 1, sessionUserId: null, accounts: [] };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string): string {
  let hash = 5381;
  for (let index = 0; index < password.length; index += 1) {
    hash = (hash * 33) ^ password.charCodeAt(index);
  }
  return `v1:${(hash >>> 0).toString(16)}:${password.length}`;
}

export function loadAuthStore(): AuthStore {
  if (!hasLocalStorage()) return emptyAuthStore();

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return emptyAuthStore();

  try {
    const parsed = JSON.parse(raw) as Partial<AuthStore>;
    if (parsed.version !== 1 || !Array.isArray(parsed.accounts)) return emptyAuthStore();
    return {
      version: 1,
      sessionUserId: parsed.sessionUserId ?? null,
      accounts: parsed.accounts,
    };
  } catch {
    return emptyAuthStore();
  }
}

function saveAuthStore(store: AuthStore): AuthStore {
  if (hasLocalStorage()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(store));
  }
  return store;
}

export function getSessionUserId(): string | null {
  return loadAuthStore().sessionUserId;
}

export function setSessionUserId(userId: string | null): void {
  const store = loadAuthStore();
  saveAuthStore({ ...store, sessionUserId: userId });
}

export function clearSessionUserId(): void {
  setSessionUserId(null);
}

export function registerAccount(input: {
  username: string;
  email: string;
  password: string;
}): AuthResult {
  const username = input.username.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!username) return { ok: false, error: "Please enter your name." };
  if (!email || !email.includes("@")) return { ok: false, error: "Please enter a valid email." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };

  const store = loadAuthStore();
  if (store.accounts.some((account) => account.email === email)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const account: LocalAuthAccount = {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  saveAuthStore({
    ...store,
    sessionUserId: account.id,
    accounts: [...store.accounts, account],
  });

  return { ok: true, userId: account.id };
}

export function loginAccount(input: { email: string; password: string }): AuthResult {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!email || !password) {
    return { ok: false, error: "Please enter your email and password." };
  }

  const store = loadAuthStore();
  const account = store.accounts.find((item) => item.email === email);
  if (!account) {
    return { ok: false, error: "No account found for this email." };
  }

  if (account.passwordHash !== hashPassword(password)) {
    return { ok: false, error: "Incorrect password." };
  }

  saveAuthStore({ ...store, sessionUserId: account.id });
  return { ok: true, userId: account.id };
}

export function getAccountById(userId: string): LocalAuthAccount | undefined {
  return loadAuthStore().accounts.find((account) => account.id === userId);
}

export function getAccountByEmail(email: string): LocalAuthAccount | undefined {
  return loadAuthStore().accounts.find((account) => account.email === normalizeEmail(email));
}
