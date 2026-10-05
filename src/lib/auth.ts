// Demo-only auth: stores a fake session in browser storage. Replace with real
// POST /api/auth/login (httpOnly cookie) when wiring the backend.
const KEY = "scheduler_session";
const TIMEOUT = 30 * 60_000;

export interface Session { user: string; expires: number }

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
  if (!raw) return null;
  const s = JSON.parse(raw) as Session;
  if (s.expires < Date.now()) {
    logout();
    return null;
  }
  return s;
}

export function login(user: string, password: string, remember: boolean): boolean {
  if (password !== "demo123") return false;
  const s: Session = { user, expires: Date.now() + (remember ? 7 * 24 * 3600_000 : TIMEOUT) };
  (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(s));
  return true;
}

export function logout() {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}
