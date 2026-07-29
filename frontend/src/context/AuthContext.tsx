import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";
import storage from "../utils/storage";
import type { User, LoginPayload } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (loginId: string, password: string, isEmail?: boolean) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function refreshUser(): Promise<User | null> {
    if (!storage.get("ftjj_token")) {
      setUser(null);
      return null;
    }
    const response = await api.get<{ data: { user: User } }>("/auth/me");
    const userData = response.data.data.user;
    setUser(userData);
    return userData;
  }

  async function login(loginId: string, password: string, isEmail?: boolean): Promise<User | null> {
    const response = await api.post<{
      data: { token: string; refreshToken?: string; user: User };
    }>("/auth/login", {
      [isEmail ? "email" : "username"]: loginId,
      password,
    });
    const payload = response.data.data;
    storage.set("ftjj_token", payload.token);
    if (payload.refreshToken) storage.set("ftjj_refresh", payload.refreshToken);
    // Immediately refresh to get the full user object (including club._id)
    // The login response may have a partial user without nested IDs.
    const fullUser = await api.get<{ data: { user: User } }>("/auth/me");
    const userData = fullUser.data.data.user;
    setUser(userData);
    return userData;
  }

  async function logout(): Promise<void> {
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

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
