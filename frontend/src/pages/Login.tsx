import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Feedback } from "../components/Feedback";
export const home = (role: string) =>
  role === "GESTAO" ? "/gestao" : role === "PORTEIRO" ? "/portaria" : "/sala";
export function Login() {
  const { user, login } = useAuth();
  const [usuario, setUsuario] = useState(""),
    [senha, setSenha] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (user) return <Navigate to={home(user.role)} replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login(usuario, senha);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="brand-mark" aria-hidden="true">
        ↗
      </div>
      <p className="eyebrow">SAÍDA INTELIGENTE</p>
      <h1>Uma saída mais tranquila.</h1>
      <p>Acesso para gestão, portaria e salas de aula.</p>
      <form className="card" onSubmit={submit}>
        <h2>Entre na sua conta</h2>
        <label>
          Usuário
          <input
            autoComplete="username"
            required
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        <Feedback error={error} />
        <button disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
