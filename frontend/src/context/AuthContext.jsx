import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";
import storage from "../utils/storage";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  async function refreshUser() {
    if (!storage.get("ftjj_token")) {
      setUser(null);
      return null;
    }
    const { data } = await api.get("/auth/me");
    setUser(data.user);
    return data.user;
  }
  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    storage.set("ftjj_token", data.token);
    if (data.refreshToken) storage.set("ftjj_refresh", data.refreshToken);
    setUser(data.user);
    return data.user;
  }
  async function logout() {
    try {
      await api.post("/auth/logout", {
        refreshToken: storage.get("ftjj_refresh"),
      });
    } catch {}
    storage.remove("ftjj_token");
    storage.remove("ftjj_refresh");
    setUser(null);
  }
  useEffect(() => {
    async function loadUser() {
      try {
        if (storage.get("ftjj_token")) await refreshUser();
      } catch {
        storage.remove("ftjj_token");
        storage.remove("ftjj_refresh");
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);
  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
