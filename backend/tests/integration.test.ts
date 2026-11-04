import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import "dotenv/config";
import { Pool } from "pg";
import { SignJWT } from "jose";
import { io as connect, type Socket } from "socket.io-client";

test(
  "MVP integrado com PostgreSQL real, HTTP e Socket.io",
  { timeout: 120_000 },
  async (t) => {
    assert.ok(
      process.env.DATABASE_URL,
      "Configure DATABASE_URL; os testes criam e removem apenas um banco temporário próprio.",
    );
    const originalUrl = process.env.DATABASE_URL!;
    const db = `saida_test_${randomBytes(6).toString("hex")}`;
    const admin = new Pool({ connectionString: originalUrl });
    await admin.query(`CREATE DATABASE "${db}"`);
    const url = new URL(originalUrl);
    url.pathname = `/${db}`;
    process.env.DATABASE_URL = url.toString();
    process.env.JWT_SECRET = randomBytes(48).toString("hex");
    process.env.JWT_EXPIRES_IN = "8h";
    process.env.SEED_DEFAULT_PASSWORD = randomBytes(24).toString("hex");
    process.env.APP_TIMEZONE = "America/Sao_Paulo";
    process.env.NODE_ENV = "test";
    const sockets: Socket[] = [];
    let prisma:
      | Awaited<typeof import("../src/database/prisma.js")>["prisma"]
      | undefined;
    let server: ReturnType<typeof createServer> | undefined;
    let socketServer:
      | ReturnType<
          (typeof import("../src/websocket/index.js"))["attachSockets"]
        >
      | undefined;
    try {
      execFileSync("npm", ["run", "prisma:migrate:deploy"], { stdio: "pipe" });
      execFileSync("npm", ["run", "prisma:seed"], { stdio: "pipe" });
      execFileSync("npm", ["run", "prisma:seed"], { stdio: "pipe" });
      ({ prisma } = await import("../src/database/prisma.js"));
      const client = prisma;
      const { app } = await import("../src/app.js");
      const { attachSockets } = await import("../src/websocket/index.js");
      const { schoolDate } = await import("../src/services/dateService.js");
      server = createServer(app);
      socketServer = attachSockets(server);
      await new Promise<void>((resolve) =>
        server!.listen(0, "127.0.0.1", resolve),
      );
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const base = `http://127.0.0.1:${address.port}`;
      async function request(
        path: string,
        cookie = "",
        method = "GET",
        body?: unknown,
      ) {
        const response = await fetch(base + path, {
          method,
          headers: { Cookie: cookie, "Content-Type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return {
          status: response.status,
          body: response.status === 204 ? null : await response.json(),
          cookie: response.headers.get("set-cookie") || "",
        };
      }
      async function login(usuario: string) {
        const result = await request("/auth/login", "", "POST", {
          usuario,
          senha: process.env.SEED_DEFAULT_PASSWORD,
        });
        assert.equal(result.status, 200);
        assert.match(result.cookie, /HttpOnly/);
        assert.match(result.cookie, /SameSite=Lax/);
        assert.deepEqual(Object.keys(result.body).sort(), ["usuario"]);
        assert.ok(!JSON.stringify(result.body).includes("senhaHash"));
        return result.cookie.split(";")[0];
      }
      const gestao = await login("gestao"),
        portaria = await login("portaria");
      const sala = await login("fund1_1ano"),
        outra = await login("fund1_2ano");
      const geral = await login("fund1_geral"),
        outroSegmento = await login("medio_geral");
      const salas = await request("/salas", gestao);
      const s1 = salas.body.find(
        (s: any) => s.segmento.nome === "Fundamental I" && s.serie === 1,
      );
      const s2 = salas.body.find(
        (s: any) => s.segmento.nome === "Fundamental I" && s.serie === 2,
      );
      let alunoId = 0;
      await t.test("seed idempotente e hashes Argon2id", async () => {
        assert.equal(await client.usuario.count(), 22);
        assert.equal(await client.sala.count(), 16);
        assert.equal(await client.segmento.count(), 4);
        const user = await client.usuario.findUniqueOrThrow({
          where: { usuario: "gestao" },
        });
        assert.match(user.senhaHash, /^\$argon2id\$/);
        const argon2 = await import("argon2");
        assert.ok(
          await argon2.verify(
            user.senhaHash,
            process.env.SEED_DEFAULT_PASSWORD!,
          ),
        );
      });
      await t.test(
        "JWT ausente, adulterado, expirado e credenciais inválidas",
        async () => {
          for (const cookie of ["", "access_token=bad"])
            assert.equal((await request("/salas", cookie)).status, 401);
          const token = await new SignJWT({})
            .setProtectedHeader({ alg: "HS256" })
            .setSubject("1")
            .setIssuedAt()
            .setExpirationTime("0s")
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));
          assert.equal(
            (await request("/salas", `access_token=${token}`)).status,
            401,
          );
          const wrong = await request("/auth/login", "", "POST", {
            usuario: "gestao",
            senha: "wrong",
          });
          const missing = await request("/auth/login", "", "POST", {
            usuario: "inexistente",
            senha: "wrong",
          });
          assert.equal(wrong.status, 401);
          assert.deepEqual(wrong.body, missing.body);
          assert.equal(
            (await request("/auth/me", sala)).body.usuario.role,
            "SALA",
          );
          assert.match(
            (await request("/auth/logout", gestao, "POST")).cookie,
            /Expires=Thu, 01 Jan 1970/,
          );
        },
      );
      await t.test(
        "perfis, JSON inválido, origem, IDs e filtros inválidos",
        async () => {
          assert.equal((await request("/alunos", sala)).status, 403);
          assert.equal((await request("/salas", sala)).status, 403);
          assert.equal(
            (await request("/salas/minha/liberacoes", portaria)).status,
            403,
          );
          assert.equal(
            (await request("/alunos", portaria, "POST", {})).status,
            403,
          );
          assert.equal(
            (await request("/liberacoes", gestao, "POST", { alunoId: 1 }))
              .status,
            403,
          );
          assert.equal(
            (await request("/alunos?serie=abc", gestao)).status,
            400,
          );
          assert.equal(
            (await request("/salas/minha/liberacoes?salaId=1", sala)).status,
            400,
          );
          assert.equal(
            (await request("/alunos/abc", gestao, "PUT", {})).status,
            400,
          );
          assert.equal(
            (
              await request("/alunos", gestao, "POST", {
                nome: "Ana",
                matricula: "1",
                salaId: 999999,
              })
            ).status,
            404,
          );
          const invalid = await fetch(base + "/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
          });
          assert.equal(invalid.status, 400);
          const origin = await fetch(base + "/auth/logout", {
            method: "POST",
            headers: { Origin: "https://evil.example" },
          });
          assert.equal(origin.status, 403);
          assert.equal(
            (
              await request("/liberacoes", portaria, "POST", {
                alunoId: 999999,
              })
            ).status,
            404,
          );
        },
      );
      await t.test(
        "cadastro, busca, matrícula única, edição e auditoria",
        async () => {
          const created = await request("/alunos", gestao, "POST", {
            nome: "Ana Silva",
            matricula: "2026001",
            salaId: s1.id,
          });
          assert.equal(created.status, 201);
          alunoId = created.body.id;
          assert.equal(created.body.ativo, true);
          assert.equal(
            (
              await request("/alunos", gestao, "POST", {
                nome: "Outro",
                matricula: "2026001",
                salaId: s1.id,
              })
            ).status,
            409,
          );
          const result = await request(
            `/alunos?segmento=${encodeURIComponent("Fundamental I")}&serie=1&busca=ana`,
            portaria,
          );
          assert.equal(result.body.length, 1);
          assert.equal(
            (await request("/alunos?busca=2026001", portaria)).body.length,
            1,
          );
          assert.equal(
            (await request(`/alunos?salaId=${s2.id}`, portaria)).body.length,
            0,
          );
          assert.equal(
            (
              await request(`/alunos/${alunoId}`, gestao, "PUT", {
                nome: "Ana Souza",
                matricula: "2026001",
                salaId: s1.id,
              })
            ).status,
            200,
          );
          assert.equal(
            (
              await request("/alunos/999999", gestao, "PUT", {
                nome: "Ana",
                matricula: "404",
                salaId: s1.id,
              })
            ).status,
            404,
          );
          const audits = await client.gerenciamento.findMany({
            where: { alunoId },
            orderBy: { id: "asc" },
          });
          assert.deepEqual(
            audits.map((a) => a.acao),
            ["CADASTRO", "EDICAO"],
          );
          const manager = await client.usuario.findUniqueOrThrow({
            where: { usuario: "gestao" },
          });
          assert.ok(audits.every((a) => a.usuarioId === manager.id));
        },
      );
      await t.test(
        "inativação, isolamento do porteiro e reativação auditada",
        async () => {
          assert.equal(
            (
              await request(`/alunos/${alunoId}/status`, gestao, "PATCH", {
                ativo: false,
              })
            ).status,
            200,
          );
          assert.equal(
            (await request("/alunos?ativo=false", portaria)).body.length,
            0,
          );
          assert.equal(
            (await request("/alunos?ativo=false", gestao)).body.length,
            1,
          );
          const inactive = await request("/liberacoes", portaria, "POST", {
            alunoId,
          });
          assert.equal(inactive.status, 409);
          assert.equal(inactive.body.error.code, "ALUNO_INATIVO");
          assert.equal(
            (
              await request(`/alunos/${alunoId}/status`, gestao, "PATCH", {
                ativo: true,
              })
            ).status,
            200,
          );
          const audits = await client.gerenciamento.findMany({
            where: { alunoId },
            orderBy: { id: "asc" },
          });
          assert.deepEqual(
            audits.map((a) => a.acao),
            ["CADASTRO", "EDICAO", "INATIVACAO", "REATIVACAO"],
          );
        },
      );
      await t.test(
        "importação estrita e atômica, sem cadastro parcial nem auditoria órfã",
        async () => {
          const path = `/salas/${s1.id}/alunos/importacao`;
          for (const body of [
            { alunos: [] },
            { alunos: [{ nome: "Ana", matricula: "X", salaId: s2.id }] },
            { alunos: [{ matricula: "X" }] },
          ])
            assert.equal(
              (await request(path, gestao, "POST", body)).status,
              400,
            );
          assert.equal(
            (
              await request(path, gestao, "POST", {
                alunos: [
                  { nome: "A", matricula: "X" },
                  { nome: "B", matricula: "X" },
                ],
              })
            ).status,
            409,
          );
          const before = await client.gerenciamento.count();
          assert.equal(
            (
              await request(path, gestao, "POST", {
                alunos: [
                  { nome: "Nova", matricula: "NEW" },
                  { nome: "Duplicada", matricula: "2026001" },
                ],
              })
            ).status,
            409,
          );
          assert.equal(
            await client.aluno.count({ where: { matricula: "NEW" } }),
            0,
          );
          assert.equal(await client.gerenciamento.count(), before);
          const imported = await request(path, gestao, "POST", {
            alunos: [
              { nome: "Bia", matricula: "2026002" },
              { nome: "Caio", matricula: "2026003" },
            ],
          });
          assert.equal(imported.status, 201);
          assert.equal(imported.body.length, 2);
          assert.equal(
            await client.gerenciamento.count({ where: { acao: "IMPORTACAO" } }),
            2,
          );
        },
      );
      async function socket(cookie: string) {
        const instance = connect(base, {
          autoConnect: false,
          transports: ["websocket"],
          extraHeaders: { Cookie: cookie },
          reconnection: false,
        });
        sockets.push(instance);
        await new Promise<void>((resolve, reject) => {
          instance.once("connect", resolve);
          instance.once("connect_error", reject);
          instance.connect();
        });
        return instance;
      }
      await t.test(
        "canais autenticados e isolados, evento após persistir e corrida de chamadas",
        async () => {
          for (const cookie of ["", portaria, "access_token=bad"]) {
            const instance = connect(base, {
              autoConnect: false,
              transports: ["websocket"],
              extraHeaders: { Cookie: cookie },
              reconnection: false,
            });
            sockets.push(instance);
            await new Promise<void>((resolve, reject) => {
              instance.once("connect", () =>
                reject(new Error("Socket indevido conectado")),
              );
              instance.once("connect_error", () => resolve());
              instance.connect();
            });
          }
          const own = await socket(sala),
            other = await socket(outra),
            general = await socket(geral),
            outside = await socket(outroSegmento);
          let leaked = 0;
          other.on("liberacao:criada", () => leaked++);
          outside.on("liberacao:criada", () => leaked++);
          other.emit("join", `sala:${s1.id}`); // no handler may grant an arbitrary channel
          const event = new Promise<any>((resolve) =>
            own.once("liberacao:criada", resolve),
          );
          const generalEvent = new Promise<any>((resolve) =>
            general.once("liberacao:criada", resolve),
          );
          const results = await Promise.all(
            Array.from({ length: 5 }, () =>
              request("/liberacoes", portaria, "POST", { alunoId }),
            ),
          );
          assert.equal(results.filter((r) => r.status === 201).length, 1);
          assert.equal(results.filter((r) => r.status === 409).length, 4);
          const payload = await event;
          assert.deepEqual(Object.keys(payload), ["id"]);
          assert.equal((await generalEvent).id, payload.id);
          assert.equal(await client.liberacao.count({ where: { alunoId } }), 1);
          assert.equal(
            (await request("/salas/minha/liberacoes", sala)).body[0].id,
            payload.id,
          );
          assert.equal(
            (await request("/salas/minha/liberacoes", outra)).body.length,
            0,
          );
          assert.equal(
            (await request("/salas/minha/liberacoes", outroSegmento)).body
              .length,
            0,
          );
          assert.equal(
            (await request("/salas/minha/liberacoes", geral)).body.length,
            1,
          );
          assert.equal(leaked, 0);
          const record = await client.liberacao.findUniqueOrThrow({
            where: { id: payload.id },
          });
          const gate = await client.usuario.findUniqueOrThrow({
            where: { usuario: "portaria" },
          });
          assert.equal(record.porteiroId, gate.id);
          assert.equal(
            record.dataLiberacao.toISOString(),
            schoolDate().toISOString(),
          );
          await assert.rejects(
            client.liberacao.create({
              data: {
                alunoId,
                porteiroId: gate.id,
                dataLiberacao: schoolDate(),
              },
            }),
            (e: any) => e.code === "P2002",
          );
          own.disconnect();
          const bia = await client.aluno.findUniqueOrThrow({
            where: { matricula: "2026002" },
          });
          assert.equal(
            (
              await request("/liberacoes", portaria, "POST", {
                alunoId: bia.id,
              })
            ).status,
            201,
          );
          await socket(sala);
          assert.equal(
            (await request("/salas/minha/liberacoes", sala)).body.length,
            2,
          );
          await request(`/alunos/${alunoId}/status`, gestao, "PATCH", {
            ativo: false,
          });
          assert.equal(
            (await request("/salas/minha/liberacoes", sala)).body.length,
            2,
            "inativação preserva histórico",
          );
          const old = new Date(schoolDate().getTime() - 86400000);
          await client.liberacao.create({
            data: {
              alunoId,
              porteiroId: gate.id,
              dataLiberacao: old,
              dataHora: old,
            },
          });
          assert.equal(
            (await request("/salas/minha/liberacoes", sala)).body.length,
            2,
            "somente dia escolar atual",
          );
          assert.equal(
            (
              await request(
                `/liberacoes?data=${old.toISOString().slice(0, 10)}`,
                portaria,
              )
            ).body.length,
            1,
          );
        },
      );
      await t.test(
        "banco impede usuário SALA sem escopo ou com escopos conflitantes",
        async () => {
          await assert.rejects(
            client.usuario.create({
              data: {
                usuario: "invalido",
                senhaHash: "nao-usado",
                role: "SALA",
              },
            }),
          );
          await assert.rejects(
            client.usuario.create({
              data: {
                usuario: "invalido2",
                senhaHash: "nao-usado",
                role: "GESTAO",
                salaId: s2.id,
              },
            }),
          );
        },
      );
    } finally {
      sockets.forEach((s) => s.disconnect());
      if (socketServer)
        await new Promise<void>((resolve) =>
          socketServer!.close(() => resolve()),
        );
      if (server?.listening)
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      await prisma?.$disconnect();
      await admin.query(`DROP DATABASE "${db}" WITH (FORCE)`);
      await admin.end();
      process.env.DATABASE_URL = originalUrl;
    }
  },
);
