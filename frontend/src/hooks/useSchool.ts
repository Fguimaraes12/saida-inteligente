import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Aluno, Sala } from "../types";
export function useSchool() {
  const [salas, setSalas] = useState<Sala[]>([]),
    [segmento, setSegmento] = useState(""),
    [salaId, setSalaId] = useState("");
  const [busca, setBusca] = useState(""),
    [alunos, setAlunos] = useState<Aluno[]>([]),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    api<Sala[]>("/salas")
      .then(setSalas)
      .catch((e) => setError(e.message));
  }, [revision]);
  useEffect(() => {
    let active = true;
    setAlunos([]);
    setError("");
    if (!salaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      api<Aluno[]>(`/alunos?${new URLSearchParams({ salaId, busca })}`)
        .then((items) => {
          if (active) setAlunos(items);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [salaId, busca, revision]);
  return {
    salas,
    segmento,
    salaId,
    busca,
    alunos,
    error,
    loading,
    setSegmento,
    setSalaId,
    setBusca,
    refresh: () => setRevision((r) => r + 1),
  };
}
