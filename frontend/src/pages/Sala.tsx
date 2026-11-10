import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../services/api";
import { Feedback } from "../components/Feedback";
import { salaLabel, type Release } from "../types";
export function Sala() {
  const [items, setItems] = useState<Release[]>([]),
    [error, setError] = useState(""),
    [connected, setConnected] = useState(false);
  const [revision, setRevision] = useState(0),
    requestId = useRef(0);
  useEffect(() => {
    let active = true;
    async function refresh() {
      const id = ++requestId.current;
      try {
        const data = await api<Release[]>("/salas/minha/liberacoes");
        if (active && id === requestId.current) {
          setItems(data);
          setError("");
        }
      } catch (e) {
        if (active && id === requestId.current) setError((e as Error).message);
      }
    }
    const socket = io({ withCredentials: true, autoConnect: false });
    socket.on("connect", () => {
      setConnected(true);
      void refresh();
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      setConnected(false);
    });
    socket.on("liberacao:criada", () => void refresh());
    const offline = () => { socket.disconnect(); setConnected(false); };
    const online = () => { socket.connect(); void refresh(); };
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    if (navigator.onLine) socket.connect();
    void refresh();
    // Also catches a new school day and provides recovery if a notification is lost.
    const timer = setInterval(() => void refresh(), 60_000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('offline', offline);
      window.removeEventListener('online', online);
      socket.disconnect();
    };
  }, [revision]);
  return (
    <main className="classroom">
      <p className="eyebrow">PAINEL DA SALA</p>
      <h1>Hora de encontrar a família.</h1>
      <p role="status" className={connected ? "connection" : "notice"}>
        {connected
          ? "● Conectado · chamadas em tempo real"
          : "Reconectando · a lista será sincronizada automaticamente"}
      </p>
      <Feedback error={error} />
      {error && (
        <button onClick={() => setRevision((r) => r + 1)}>
          Tentar novamente
        </button>
      )}
      <section className="card">
        <h2>Chamadas de hoje</h2>
        {items.length === 0 ? (
          <p className="empty">Aguardando a primeira chamada.</p>
        ) : (
          <ol className="release-grid">
            {items.map((item) => (
              <li key={item.id}>
                <span className="badge">
                  {item.aluno.sala &&
                    `${item.aluno.sala.segmento.nome} · ${salaLabel(item.aluno.sala)}`}
                </span>
                <h3>{item.aluno.nome}</h3>
                <time dateTime={item.dataHora}>
                  {new Date(item.dataHora).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
