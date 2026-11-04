import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { frontendOrigin } from "../config.js";
import { authenticateCookie } from "../services/sessionService.js";
import type { Release } from "../repositories/liberacaoRepository.js";
let io: Server | undefined;
export function attachSockets(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: frontendOrigin, credentials: true },
    allowRequest: (req, callback) =>
      callback(
        null,
        !req.headers.origin || req.headers.origin === frontendOrigin,
      ),
  });
  io.use(async (socket, next) => {
    try {
      const session = await authenticateCookie(socket.request.headers.cookie);
      if (session.user.role !== "SALA") return next(new Error("FORBIDDEN"));
      socket.data.session = session;
      next();
    } catch {
      next(new Error("UNAUTHENTICATED"));
    }
  });
  io.on("connection", (socket) => {
    const { user, expiresAt } = socket.data.session;
    // No client-controlled join events. Scope comes exclusively from the current user.
    void socket.join(
      user.salaId ? `sala:${user.salaId}` : `segmento:${user.segmentoId}`,
    );
    const timeout = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, expiresAt - Date.now()),
    );
    socket.on("disconnect", () => clearTimeout(timeout));
  });
  return io;
}
export function publishRelease(release: Release): void {
  try {
    io?.to(`sala:${release.aluno.salaId}`)
      .to(`segmento:${release.aluno.sala.segmentoId}`)
      .emit("liberacao:criada", { id: release.id });
  } catch {
    console.error(
      "Falha ao notificar liberação persistida. A consulta REST preserva o estado.",
    );
  }
}
