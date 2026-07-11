// Client HTTP centralisé pour le backend Flask "Web-based Linux Namespace
// Isolation Manager". Toutes les fonctions ici sont typées et rejettent
// une ApiError sur non-2xx. Sur 401, on purge la session locale et on
// force un retour à l'écran de login.

export type Utilisateur = {
  id: string;
  nomSysteme: string;
  uidSysteme: number;
  dateDerniereConnexion: string;
};

export type StatutSandbox = "EN_COURS" | "ARRETEE" | "EN_ERREUR";
export type TypeIsolation = "MNT" | "PID" | "NET" | "UTS";

export type Sandbox = {
  id: string;
  nomVirtuel: string;
  pidRacine: number | null;
  dateCreation: string;
  statut: StatutSandbox;
  typeIsolation: TypeIsolation;
  proprietaireId: string;
};

export type Commande = {
  id: number;
  texteInstruction: string;
  dateExecution: string;
  resultatSortie: string;
  estReussie: boolean;
  sandboxId: string;
};

export type AuthResponse = { token: string; user: Utilisateur };

export const TOKEN_KEY = "sandboxmgr.token";
export const USER_KEY = "sandboxmgr.user";

export class ApiError extends Error {
  status: number;
  error: string;
  detail?: string;
  constructor(status: number, error: string, detail?: string) {
    super(detail || error || `HTTP ${status}`);
    this.status = status;
    this.error = error;
    this.detail = detail;
  }
}

const BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_API_URL || "http://127.0.0.1:5000";

export const WS_BASE_URL: string =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_WS_URL || "ws://127.0.0.1:5000";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Callback branché par le AuthProvider pour effectuer un vrai reset de state.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = opts.auth !== false;
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method || "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, "network_error", (e as Error).message);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const body = (data || {}) as { error?: string; detail?: string };
    if (res.status === 401 && auth) {
      clearSession();
      if (onUnauthorized) onUnauthorized();
      else window.location.href = "/login";
    }
    throw new ApiError(res.status, body.error || "http_error", body.detail);
  }

  return data as T;
}

// ---- Auth
export function register(username: string, password: string): Promise<{ user: Utilisateur }> {
  return request("/api/auth/register", { method: "POST", body: { username, password }, auth: false });
}

export function login(username: string, password: string): Promise<AuthResponse> {
  return request("/api/auth/login", { method: "POST", body: { username, password }, auth: false });
}

export function logout(): Promise<{ ok: true }> {
  return request("/api/auth/logout", { method: "POST" });
}

export function me(): Promise<{ user: Utilisateur }> {
  return request("/api/auth/me");
}

// ---- Sandboxes
export function listSandboxes(): Promise<{ sandboxes: Sandbox[] }> {
  return request("/api/sandboxes");
}

export function createSandbox(
  nomVirtuel?: string,
  typeIsolation: TypeIsolation = "MNT",
): Promise<{ sandbox: Sandbox }> {
  return request("/api/sandboxes", {
    method: "POST",
    body: { ...(nomVirtuel ? { nomVirtuel } : {}), typeIsolation },
  });
}

export function deleteSandbox(id: string): Promise<{ ok: true }> {
  return request(`/api/sandboxes/${id}`, { method: "DELETE" });
}

// ---- Commandes
export function listCommands(sandboxId: string): Promise<{ commands: Commande[] }> {
  return request(`/api/sandboxes/${sandboxId}/commands`);
}

export function getLastCommand(sandboxId: string): Promise<{ command: Commande | null }> {
  return request(`/api/sandboxes/${sandboxId}/commands/last`);
}
