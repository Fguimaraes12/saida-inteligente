import { useState, type FormEvent } from "react";
import { useSchool } from "../hooks/useSchool";
import { SchoolFilter } from "../components/SchoolFilter";
import { Feedback } from "../components/Feedback";
import { api, jsonBody } from "../services/api";
import { salaLabel, type Aluno } from "../types";
export function Gestao() {
  const school = useSchool();
  const [editing, setEditing] = useState<Aluno | null>(null),
    [nome, setNome] = useState(""),
    [matricula, setMatricula] = useState(""),
    [targetSala, setTargetSala] = useState("");
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [importText, setImportText] = useState("");
  async function action(operation: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      setMessage(success);
      school.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    setEditing(null);
    setNome("");
    setMatricula("");
    setTargetSala("");
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const ok = await action(
      () =>
        api(editing ? `/alunos/${editing.id}` : "/alunos", {
          method: editing ? "PUT" : "POST",
          body: jsonBody({
            nome,
            matricula,
            salaId: Number(targetSala || school.salaId),
          }),
        }),
      editing ? "Aluno atualizado." : "Aluno cadastrado.",
    );
    if (ok) reset();
  }
  async function importFile(e: FormEvent) {
    e.preventDefault();
    await action(async () => {
      const parsed = JSON.parse(importText);
      await api(`/salas/${school.salaId}/alunos/importacao`, {
        method: "POST",
        body: jsonBody(parsed),
      });
      setImportText("");
    }, "Importação concluída. Todos os alunos foram cadastrados.");
  }
  return (
    <main>
      <p className="eyebrow">GESTÃO ESCOLAR</p>
      <h1>Alunos</h1>
      <p>Organize os cadastros por segmento e sala.</p>
      <section className="card">
        <SchoolFilter
          {...school}
          onSegmento={(value) => {
            school.setSegmento(value);
            reset();
          }}
          onSala={(value) => {
            school.setSalaId(value);
            reset();
          }}
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
      {school.salaId ? (
        <>
          <section className="card">
            <h2>Alunos da sala</h2>
            {school.loading ? (
              <p role="status">Carregando…</p>
            ) : school.alunos.length === 0 ? (
              <p>Nenhum aluno encontrado.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Matrícula</th>
                      <th>Situação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {school.alunos.map((a) => (
                      <tr key={a.id}>
                        <td>{a.nome}</td>
                        <td>{a.matricula}</td>
                        <td>
                          <span className={a.ativo ? "badge" : "badge muted"}>
                            {a.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="actions">
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => {
                              setEditing(a);
                              setNome(a.nome);
                              setMatricula(a.matricula);
                              setTargetSala(String(a.salaId));
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `${a.ativo ? "Inativar" : "Reativar"} ${a.nome}?`,
                                )
                              )
                                void action(
                                  () =>
                                    api(`/alunos/${a.id}/status`, {
                                      method: "PATCH",
                                      body: jsonBody({ ativo: !a.ativo }),
                                    }),
                                  "Situação atualizada.",
                                );
                            }}
                          >
                            {a.ativo ? "Inativar" : "Reativar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <div className="columns">
            <form className="card" onSubmit={save}>
              <h2>{editing ? "Editar aluno" : "Adicionar aluno"}</h2>
              <fieldset disabled={busy}>
                <label>
                  Nome do aluno
                  <input
                    required
                    maxLength={200}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </label>
                <label>
                  Matrícula
                  <input
                    required
                    maxLength={200}
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                  />
                </label>
                {editing && (
                  <label>
                    Sala do aluno
                    <select
                      value={targetSala}
                      onChange={(e) => setTargetSala(e.target.value)}
                    >
                      {school.salas.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.segmento.nome} · {salaLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="actions">
                  <button>{busy ? "Salvando…" : "Salvar aluno"}</button>
                  {editing && (
                    <button type="button" className="secondary" onClick={reset}>
                      Cancelar edição
                    </button>
                  )}
                </div>
              </fieldset>
            </form>
            <form className="card" onSubmit={importFile}>
              <h2>Importar alunos</h2>
              <p>
                Envie um JSON com a chave <code>alunos</code> e os campos{" "}
                <code>matricula</code> e <code>nome</code>. A sala selecionada
                será usada para todos.
              </p>
              <label>
                Arquivo JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1_000_000) {
                      setError("Arquivo excede 1 MB.");
                      return;
                    }
                    try {
                      setImportText(await file.text());
                    } catch {
                      setError("Não foi possível ler o arquivo.");
                    }
                  }}
                />
              </label>
              <label>
                Conteúdo JSON
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={
                    '{"alunos":[{"matricula":"20260001","nome":"Ana Silva"}]}'
                  }
                  required
                />
              </label>
              <button disabled={busy || !importText}>
                Importar para esta sala
              </button>
            </form>
          </div>
        </>
      ) : (
        <p className="empty">Selecione um segmento e uma sala para começar.</p>
      )}
    </main>
  );
}
