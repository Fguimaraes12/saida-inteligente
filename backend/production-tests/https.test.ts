import { test } from "node:test";
import assert from "node:assert/strict";
import https from "node:https";
import fs from "node:fs";
import type { IncomingHttpHeaders } from "node:http";
import { io } from "socket.io-client";

test(
  "proxy de produção local: TLS, SPA, cookies, CORS e Socket.io",
  { timeout: 15_000 },
  async () => {
    const origin = process.env.PRODUCTION_TEST_ORIGIN;
    assert.ok(
      origin && new URL(origin).hostname.endsWith(".test"),
      "Use apenas domínio .test com contas sintéticas.",
    );
    assert.ok(
      process.env.PRODUCTION_TEST_CA,
      "Informe o certificado local confiável.",
    );
    const managerPassword = process.env.PRODUCTION_TEST_MANAGER_PASSWORD || process.env.SEED_DEFAULT_PASSWORD;
    const roomPassword = process.env.PRODUCTION_TEST_ROOM_PASSWORD || process.env.SEED_DEFAULT_PASSWORD;
    assert.ok(managerPassword && roomPassword,
      "Informe somente as senhas individuais de Gestão e Sala das contas sintéticas de teste.");
    const ca = fs.readFileSync(process.env.PRODUCTION_TEST_CA);
    // The .test fixture always resolves to loopback; it cannot target a real deployment.
    const agent = new https.Agent({
      ca,
      lookup: (_name, options, callback) => {
        if (options.all) callback(null, [{ address: "127.0.0.1", family: 4 }]);
        else callback(null, "127.0.0.1", 4);
      },
    });
    type Result = {
      status: number;
      headers: IncomingHttpHeaders;
      body: string;
    };
    function request(
      path: string,
      options: {
        method?: string;
        body?: unknown;
        headers?: Record<string, string>;
      } = {},
    ): Promise<Result> {
      return new Promise((resolve, reject) => {
        const body =
          options.body === undefined ? undefined : JSON.stringify(options.body);
        const req = https.request(
          origin + path,
          {
            agent,
            method: options.method || "GET",
            headers: {
              Origin: origin,
              ...(body ? { "Content-Type": "application/json" } : {}),
              ...options.headers,
            },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () =>
              resolve({
                status: res.statusCode!,
                headers: res.headers,
                body: data,
              }),
            );
          },
        );
        req.on("error", reject);
        req.end(body);
      });
    }
    try {
      const page = await request("/gestao");
      assert.equal(page.status, 200);
      assert.match(page.body, /\/assets\//);
      assert.equal(page.headers["x-content-type-options"], "nosniff");
      assert.match(
        String(page.headers["strict-transport-security"]),
        /max-age/,
      );
      assert.equal((await request("/api/health")).status, 200);
      const login = await request("/api/auth/login", {
        method: "POST",
        body: { usuario: "gestao", senha: managerPassword },
      });
      assert.equal(login.status, 200);
      const cookie = login.headers["set-cookie"]![0];
      for (const attribute of ["HttpOnly", "Secure", "SameSite=Lax", "Path=/"])
        assert.ok(cookie.includes(attribute));
      assert.equal(login.headers["access-control-allow-origin"], origin);
      assert.equal(login.headers["access-control-allow-credentials"], "true");
      assert.deepEqual(Object.keys(JSON.parse(login.body)), ["usuario"]);
      assert.ok(!login.body.includes("senhaHash"));
      assert.equal(
        (
          await request("/api/salas", {
            headers: { Cookie: cookie.split(";")[0] },
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await request("/api/auth/logout", {
            method: "POST",
            headers: { Origin: "https://evil.example" },
          })
        ).status,
        403,
      );
      const room = await request("/api/auth/login", {
        method: "POST",
        body: {
          usuario: "fund1_1ano",
          senha: roomPassword,
        },
      });
      assert.equal(room.status, 200);
      const roomCookie = room.headers["set-cookie"]![0].split(";")[0];
      const socket = io(origin, {
        agent,
        ca,
        rejectUnauthorized: true,
        transports: ["websocket"],
        extraHeaders: { Cookie: roomCookie, Origin: origin },
        autoConnect: false,
        reconnection: false,
        timeout: 5000,
      });
      try {
        await new Promise<void>((resolve, reject) => {
          socket.once("connect", resolve);
          socket.once("connect_error", reject);
          socket.connect();
        });
      } finally {
        socket.disconnect();
      }
      assert.equal(
        (await request("/api/alunos", { headers: { Cookie: roomCookie } }))
          .status,
        403,
      );
    } finally {
      agent.destroy();
    }
  },
);
