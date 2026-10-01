import { app } from './app.js';
import { prisma } from './database/prisma.js';

const port = Number(process.env.PORT) || 3000;
let server: ReturnType<typeof app.listen> | undefined;
let isShuttingDown = false;

async function start(): Promise<void> {
  try {
    await prisma.$connect();

    if (isShuttingDown) {
      return;
    }

    server = app.listen(port, () => {
      console.log(`API disponível em http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Não foi possível conectar ao PostgreSQL.', error);
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
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => (error ? reject(error) : resolve()));
      });
    }
  } catch (error) {
    exitCode = 1;
    console.error('Não foi possível fechar o servidor HTTP.', error);
  } finally {
    try {
      await prisma.$disconnect();
    } catch (error) {
      exitCode = 1;
      console.error('Não foi possível desconectar do PostgreSQL.', error);
    }

    process.exit(exitCode);
  }
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

void start();
