import { useEffect, useState } from "react";
import { SchoolFilter } from "../components/SchoolFilter";
import { Feedback } from "../components/Feedback";
import { useSchool } from "../hooks/useSchool";
import { api, jsonBody } from "../services/api";
import type { Release } from "../types";
export function Portaria() {
  const school = useSchool();
  const [busy, setBusy] = useState<number | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [history, setHistory] = useState<Release[]>([]),
    [data, setData] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    api<Release[]>(`/liberacoes${data ? `?data=${data}` : ""}`)
      .then((rows) => {
        if (active) setHistory(rows);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [data, revision]);
  async function call(id: number, nome: string) {
    if (busy !== null) return;
    setBusy(id);
    setError("");
    setMessage("");
    try {
      await api("/liberacoes", {
        method: "POST",
        body: jsonBody({ alunoId: id }),
      });
      setMessage(`Chamada de ${nome} registrada.`);
      setRevision((r) => r + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <main>
      <p className="eyebrow">PORTARIA</p>
      <h1>Chamar um aluno</h1>
      <p>Escolha a sala, encontre o aluno e registre a chamada.</p>
      <section className="card">
        <SchoolFilter
          {...school}
          onSegmento={school.setSegmento}
          onSala={school.setSalaId}
        />
        <label>
          Buscar por nome ou matrícula
          <input
            value={school.busca}
            onChange={(e) => school.setBusca(e.target.value)}
            placeholder="Digite para buscar"
          />
        </label>
      </section>
      <Feedback error={error || school.error} message={message} />
      {school.error && (
        <button onClick={school.refresh}>Tentar novamente</button>
      )}
      <section className="card">
        <h2>Alunos disponíveis</h2>
        {school.loading ? (
          <p role="status">Carregando…</p>
        ) : !school.salaId ? (
          <p>Selecione um segmento e uma sala.</p>
        ) : school.alunos.length === 0 ? (
          <p>Nenhum aluno ativo encontrado.</p>
        ) : (
          <ul className="student-list">
            {school.alunos.map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{a.nome}</strong>
                  <small>Matrícula {a.matricula}</small>
                </div>
                <button
                  disabled={busy !== null}
                  onClick={() => void call(a.id, a.nome)}
                >
                  {busy === a.id ? "Chamando…" : "Chamar aluno"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card">
        <h2>Histórico de chamadas</h2>
        <label>
          Data (vazio para hoje)
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </label>
        <button className="secondary" onClick={() => setRevision((r) => r + 1)}>
          Atualizar histórico
        </button>
        {history.length === 0 ? (
          <p>Nenhuma chamada nesta data.</p>
        ) : (
          <ul className="student-list">
            {history.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.aluno.nome}</strong>
                  <small>{item.aluno.sala?.segmento.nome}</small>
                </div>
                <time>{new Date(item.dataHora).toLocaleString("pt-BR")}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
