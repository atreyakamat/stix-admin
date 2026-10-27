import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "./api";
import { queryClient } from "./queries";

type Auth = {
  ready: boolean;
  session: api.Session | null;
  signIn: (baseUrl: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<api.Session | null>(null);

  useEffect(() => {
    api.setSignedOutHandler(() => {
      queryClient.clear();
      setSession(null);
    });
    api
      .loadSession()
      .then(setSession)
      .finally(() => setReady(true));
    return () => api.setSignedOutHandler(null);
  }, []);

  const signIn = useCallback(async (baseUrl: string, email: string, password: string) => {
    setSession(await api.login(baseUrl, email, password));
  }, []);

  const signOut = useCallback(async () => {
    await api.clearSession();
    queryClient.clear();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ ready, session, signIn, signOut }), [ready, session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const a = useContext(AuthContext);
  if (!a) throw new Error("useAuth outside AuthProvider");
  return a;
}
