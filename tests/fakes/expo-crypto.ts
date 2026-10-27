// Node 20+ has Web Crypto on globalThis.
export const randomUUID = (): string => globalThis.crypto.randomUUID();
