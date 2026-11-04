import "dotenv/config";
import { Pool } from "pg";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
const original = process.env.DATABASE_URL;
if (!original)
  throw new Error(
    "Configure DATABASE_URL para criar o banco temporário de E2E.",
  );
const admin = new Pool({ connectionString: original });
const database = `saida_e2e_${randomBytes(6).toString("hex")}`;
const url = new URL(original);
url.pathname = `/${database}`;
const testEnv = {
  ...process.env,
  DATABASE_URL: url.toString(),
  SEED_DEFAULT_PASSWORD: randomBytes(24).toString("hex"),
  JWT_SECRET: randomBytes(48).toString("hex"),
  APP_TIMEZONE: "America/Sao_Paulo",
  NODE_ENV: "test",
};
function run(args: string[]) {
  const result = spawnSync("npm", args, { env: testEnv, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`Comando npm ${args.join(" ")} falhou.`);
}
try {
  await admin.query(`CREATE DATABASE "${database}"`);
  run(["run", "prisma:migrate:deploy"]);
  run(["run", "prisma:seed"]);
  run(["run", "build"]);
  run(["--prefix", "../frontend", "run", "test:e2e"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Falha E2E");
  process.exitCode = 1;
} finally {
  await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await admin.end();
}
