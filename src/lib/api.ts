import * as SecureStore from "expo-secure-store";

// Talks to the shop's /api/app/admin. The login token lives in the phone's
// secure storage (Android Keystore), never in plain storage.

const TOKEN_KEY = "snv.admin.token";
const SESSION_KEY = "snv.admin.session";
const TIMEOUT_MS = 20_000;

export type Session = { baseUrl: string; email: string; expiresAt: string; mode: string; shopUrl: string };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
  /** No answer from the server: offline, timed out or DNS. */
  get offline() {
    return this.status === 0;
  }
}

let token: string | null = null;
let session: Session | null = null;
let onSignedOut: (() => void) | null = null;

/** Called when the server says the token is no good any more. */
export function setSignedOutHandler(fn: (() => void) | null) {
  onSignedOut = fn;
}

export async function loadSession(): Promise<Session | null> {
  const [t, s] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(SESSION_KEY)]);
  if (!t || !s) return null;
  try {
    const parsed = JSON.parse(s) as Session;
    if (Date.parse(parsed.expiresAt) < Date.now()) return null;
    token = t;
    session = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSession() {
  token = null;
  session = null;
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(SESSION_KEY)]);
}

export const currentSession = () => session;

async function send(baseUrl: string, method: string, path: string, init: { body?: unknown; form?: FormData; auth?: boolean } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.form ? 90_000 : TIMEOUT_MS);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/app/admin/${path}`, {
      method,
      headers,
      body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("No connection to the shop. Check your signal and try again.", 0);
  } finally {
    clearTimeout(timer);
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Not JSON: a proxy or Netlify error page.
  }
  const error = (data as { error?: string } | null)?.error;
  if (res.status === 401 && init.auth !== false) {
    await clearSession();
    onSignedOut?.();
    throw new ApiError(error ?? "Log in again.", 401);
  }
  if (!res.ok || (data as { ok?: boolean } | null)?.ok === false) {
    throw new ApiError(error ?? `The shop answered ${res.status}. Try again.`, res.status);
  }
  return data;
}

export async function login(baseUrl: string, email: string, password: string): Promise<Session> {
  const data = (await send(baseUrl, "POST", "login", { body: { email, password }, auth: false })) as {
    token: string;
    expiresAt: string;
    email: string;
    mode: string;
    shopUrl: string;
  };
  const s: Session = { baseUrl, email: data.email, expiresAt: data.expiresAt, mode: data.mode, shopUrl: data.shopUrl };
  await Promise.all([SecureStore.setItemAsync(TOKEN_KEY, data.token), SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s))]);
  token = data.token;
  session = s;
  return s;
}

function base() {
  if (!session) throw new ApiError("Log in again.", 401);
  return session.baseUrl;
}

export const api = {
  get: <T>(path: string) => send(base(), "GET", path) as Promise<T>,
  post: <T = Done>(path: string, body: unknown = {}) => send(base(), "POST", path, { body }) as Promise<T>,
  put: <T = Done>(path: string, body: unknown) => send(base(), "PUT", path, { body }) as Promise<T>,
  patch: <T = Done>(path: string, body: unknown) => send(base(), "PATCH", path, { body }) as Promise<T>,
  del: <T = Done>(path: string) => send(base(), "DELETE", path) as Promise<T>,
  /** Uploads a photo from the phone; returns its public URL. */
  async uploadImage(asset: { uri: string; mimeType?: string | null; fileName?: string | null }): Promise<string> {
    const form = new FormData();
    const type = asset.mimeType ?? "image/jpeg";
    const name = asset.fileName ?? `photo.${type.split("/")[1] ?? "jpg"}`;
    // React Native's FormData takes { uri, name, type } for files.
    form.append("file", { uri: asset.uri, name, type } as unknown as Blob);
    const data = (await send(base(), "POST", "images", { form })) as { url: string };
    return data.url;
  },
};

/** What every change returns. */
export type Done = { ok: true; message?: string; id?: string };
