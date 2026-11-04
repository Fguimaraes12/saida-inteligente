import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, jsonBody } from "../services/api";
import type { User } from "../types";
type Auth = {
  user: User | null;
  loading: boolean;
  error: string;
  login: (usuario: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
};
const Context = createContext<Auth>(null!);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api<{ usuario: User }>("/auth/me")
      .then((result) => {
        if (active) setUser(result.usuario);
      })
      .catch((e) => {
        if (active && (!(e instanceof ApiError) || e.status !== 401))
          setError(
            "Não foi possível verificar a sessão. Confira a conexão e tente novamente.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  async function login(usuario: string, senha: string) {
    const result = await api<{ usuario: User }>("/auth/login", {
      method: "POST",
      body: jsonBody({ usuario, senha }),
    });
    setUser(result.usuario);
  }
  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }
  return (
    <Context.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        retry: () => setAttempt((a) => a + 1),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
