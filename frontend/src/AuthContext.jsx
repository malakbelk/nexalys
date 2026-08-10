import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, getCurrentUser } from "./api";

const AuthContext = createContext(null);

const TOKEN_KEY = "nexalys_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoadingUser(false);
      return;
    }
    getCurrentUser(token)
      .then(setUser)
      .catch(() => {
        // token expire ou invalide -- on nettoie
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoadingUser(false));
  }, [token]);

  const signIn = useCallback(async ({ email, password }) => {
    const { access_token } = await apiLogin({ email, password });
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    const me = await getCurrentUser(access_token);
    setUser(me);
    return me;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loadingUser, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit etre utilise a l'interieur de AuthProvider");
  return ctx;
}
