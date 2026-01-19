import { browser } from "$app/environment";

const AUTH_KEY = "mat_auth";

export interface AuthUser {
  id: number;
  username: string;
  token: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

let state = $state<AuthState>({
  user: null,
  isLoading: true,
  error: null,
});

// Initialize from localStorage
if (browser) {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    try {
      state.user = JSON.parse(stored);
    } catch {
      localStorage.removeItem(AUTH_KEY);
    }
  }
  state.isLoading = false;
}

function saveToStorage(user: AuthUser | null) {
  if (browser) {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }
}

export function getAuthStore() {
  return {
    get user() {
      return state.user;
    },
    get isAuthenticated() {
      return state.user !== null;
    },
    get isLoading() {
      return state.isLoading;
    },
    get error() {
      return state.error;
    },
    get token() {
      return state.user?.token || null;
    },

    clearError() {
      state.error = null;
    },

    async login(username: string, password: string): Promise<boolean> {
      state.isLoading = true;
      state.error = null;

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          state.error = data.error || "Inloggning misslyckades";
          state.isLoading = false;
          return false;
        }

        state.user = data;
        saveToStorage(data);
        state.isLoading = false;
        return true;
      } catch (e) {
        state.error = "Kunde inte ansluta till servern";
        state.isLoading = false;
        return false;
      }
    },

    async register(username: string, password: string): Promise<boolean> {
      state.isLoading = true;
      state.error = null;

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          state.error = data.error || "Registrering misslyckades";
          state.isLoading = false;
          return false;
        }

        state.user = data;
        saveToStorage(data);
        state.isLoading = false;
        return true;
      } catch (e) {
        state.error = "Kunde inte ansluta till servern";
        state.isLoading = false;
        return false;
      }
    },

    async verify(): Promise<boolean> {
      if (!state.user?.token) {
        state.isLoading = false;
        return false;
      }

      state.isLoading = true;

      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${state.user.token}`,
          },
        });

        if (!response.ok) {
          // Token invalid - clear auth state
          state.user = null;
          saveToStorage(null);
          state.isLoading = false;
          return false;
        }

        const data = await response.json();
        state.user = data;
        saveToStorage(data);
        state.isLoading = false;
        return true;
      } catch (e) {
        state.isLoading = false;
        return false;
      }
    },

    async logout(): Promise<void> {
      if (state.user?.token) {
        try {
          await fetch("/api/auth/logout", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${state.user.token}`,
            },
          });
        } catch {
          // Ignore logout errors
        }
      }

      state.user = null;
      state.error = null;
      saveToStorage(null);
    },

    // Called when API returns 401
    handleUnauthorized() {
      state.user = null;
      saveToStorage(null);
    },

    async changePassword(
      currentPassword: string,
      newPassword: string,
    ): Promise<{ success: boolean; error?: string }> {
      if (!state.user?.token) {
        return { success: false, error: "Inte inloggad" };
      }

      try {
        const response = await fetch("/api/auth/password", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${state.user.token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            success: false,
            error: data.error || "Kunde inte ändra lösenord",
          };
        }

        return { success: true };
      } catch {
        return { success: false, error: "Kunde inte ansluta till servern" };
      }
    },
  };
}

export const authStore = getAuthStore();
