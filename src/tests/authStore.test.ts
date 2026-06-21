import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionUserId,
  getSessionUserId,
  hashPassword,
  loadAuthStore,
  loginAccount,
  registerAccount,
} from "@/storage/authStore";
import { createAuthenticatedProfile, isBaselineComplete, loadState, saveState } from "@/storage/guestStore";

function mockLocalStorage() {
  const store = new Map<string, string>();
  const storage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
}

describe("authStore", () => {
  beforeEach(() => {
    mockLocalStorage();
    clearSessionUserId();
  });

  it("registers and signs in a user", () => {
    const signUp = registerAccount({
      username: "Amit",
      email: "amit@example.com",
      password: "secret1",
    });
    expect(signUp.ok).toBe(true);
    expect(getSessionUserId()).toBe(signUp.ok ? signUp.userId : null);

    clearSessionUserId();
    const signIn = loginAccount({ email: "amit@example.com", password: "secret1" });
    expect(signIn.ok).toBe(true);
    expect(getSessionUserId()).toBe(signIn.ok ? signIn.userId : null);
  });

  it("rejects duplicate email and wrong password", () => {
    registerAccount({ username: "Amit", email: "amit@example.com", password: "secret1" });
    clearSessionUserId();

    const duplicate = registerAccount({ username: "Other", email: "amit@example.com", password: "secret2" });
    expect(duplicate.ok).toBe(false);

    const wrongPassword = loginAccount({ email: "amit@example.com", password: "wrong" });
    expect(wrongPassword.ok).toBe(false);
  });

  it("persists user trail state separately from guest state", () => {
    const signUp = registerAccount({
      username: "Trail User",
      email: "trail@example.com",
      password: "secret1",
    });
    if (!signUp.ok) throw new Error("signup failed");

    const profile = createAuthenticatedProfile({
      userId: signUp.userId,
      username: "Trail User",
      email: "trail@example.com",
    });
    profile.core.homeRegion = "urban_india";

    saveState(
      {
        version: 1,
        profile,
        days: {},
        leafPointEvents: [],
        baselineComplete: false,
        behaviorPatterns: [],
      },
      signUp.userId,
    );

    clearSessionUserId();
    expect(loadState(null).profile).toBeUndefined();

    loginAccount({ email: "trail@example.com", password: "secret1" });
    const restored = loadState(getSessionUserId());
    expect(restored.profile?.username).toBe("Trail User");
    expect(restored.profile?.core.homeRegion).toBe("urban_india");
    expect(isBaselineComplete(restored.profile)).toBe(false);
  });

  it("hashes passwords consistently", () => {
    expect(hashPassword("secret1")).toBe(hashPassword("secret1"));
    expect(hashPassword("secret1")).not.toBe(hashPassword("secret2"));
    expect(loadAuthStore().accounts).toEqual([]);
  });
});
