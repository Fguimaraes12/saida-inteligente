import { useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { Login, home } from "./pages/Login";
import { Gestao } from "./pages/Gestao";
import { Portaria } from "./pages/Portaria";
import { Sala } from "./pages/Sala";
function Protected({ role }: { role: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={home(user.role)} replace />;
  return <Outlet />;
}
function Shell() {
  const { user, loading, error, logout, retry } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  if (loading) return <main role="status">Verificando sessão…</main>;
  if (error)
    return (
      <main>
        <p role="alert">{error}</p>
        <button onClick={retry}>Tentar novamente</button>
      </main>
    );
  return (
    <>
      <header>
        <a href="/" className="brand">
          ↗ Saída Inteligente
        </a>
        {user && (
          <div className="actions">
            <span>{user.usuario}</span>
            <button
              className="secondary"
              onClick={() => {
                void logout().catch((e) => setLogoutError(e.message));
              }}
            >
              Sair
            </button>
          </div>
        )}
      </header>
      {logoutError && <p role="alert">{logoutError}</p>}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected role="GESTAO" />}>
          <Route path="/gestao" element={<Gestao />} />
        </Route>
        <Route element={<Protected role="PORTEIRO" />}>
          <Route path="/portaria" element={<Portaria />} />
        </Route>
        <Route element={<Protected role="SALA" />}>
          <Route path="/sala" element={<Sala />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={user ? home(user.role) : "/login"} replace />}
        />
      </Routes>
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
