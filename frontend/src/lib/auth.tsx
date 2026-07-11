import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  TOKEN_KEY,
  USER_KEY,
  Utilisateur,
  clearSession,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  setUnauthorizedHandler,
} from "./api";

type AuthContextValue = {
  user: Utilisateur | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<Utilisateur>;
  register: (username: string, password: string) => Promise<Utilisateur>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredUser(): Utilisateur | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as Utilisateur) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<Utilisateur | null>(() => loadStoredUser());

  const doLogout = useCallback(async (silent = false) => {
    if (!silent) {
      try {
        await apiLogout();
      } catch {
        /* best effort */
      }
    }
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token: t, user: u } = await apiLogin(username, password);
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(
    async (username: string, password: string) => {
      await apiRegister(username, password);
      // Le register ne renvoie pas de token — on enchaîne un login auto.
      return login(username, password);
    },
    [login]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      login,
      register,
      logout: () => doLogout(false),
    }),
    [user, token, login, register, doLogout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}

/** Traduit une ApiError en message utilisateur lisible. */
export function humanizeApiError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.error) {
      case "invalid_credentials":
        return "Identifiants incorrects.";
      case "missing_credentials":
        return "Nom d'utilisateur et mot de passe requis.";
      case "invalid_username":
        return "Nom d'utilisateur invalide.";
      case "weak_password":
        return "Mot de passe trop faible.";
      case "already_exists":
        return "Ce nom d'utilisateur existe déjà.";
      case "useradd_failed":
        return "Impossible de créer l'utilisateur système.";
      case "network_error":
        return "Serveur inaccessible. Vérifiez que le backend Flask tourne.";
      case "not_found":
        return "Ressource introuvable.";
      default:
        return e.detail || e.error || "Erreur inattendue.";
    }
  }
  return (e as Error)?.message || "Erreur inattendue.";
}
