import { createServer } from "node:http";
import { attachSockets } from "./websocket/index.js";
import { jwtSecret } from "./config.js";
import { app } from "./app.js";
import { prisma } from "./database/prisma.js";

const port = Number(process.env.PORT) || 3000;
const server = createServer(app);
const io = attachSockets(server);
let isShuttingDown = false;

async function start(): Promise<void> {
  try {
    jwtSecret();
    await prisma.$connect();

    if (isShuttingDown) {
      return;
    }

    server.listen(port, () => {
      console.log(`API disponível em http://localhost:${port}`);
    });
  } catch (error) {
    console.error(
      "Não foi possível iniciar o backend. Verifique banco e configuração.",
      error instanceof Error ? error.name : "UnknownError",
    );
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Recebido ${signal}. Encerrando o backend...`);

  let exitCode = 0;

  try {
    await new Promise<void>((resolve) => io.close(() => resolve()));
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  } catch (error) {
    exitCode = 1;
    console.error(
      "Não foi possível fechar o servidor HTTP.",
      error instanceof Error ? error.name : "UnknownError",
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (error) {
      exitCode = 1;
      console.error(
        "Não foi possível desconectar do PostgreSQL.",
        error instanceof Error ? error.name : "UnknownError",
      );
    }

    process.exit(exitCode);
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

void start();
